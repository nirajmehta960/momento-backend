import MomentoAIDao from "./dao.js";

// ============================================================
// CONSTANTS
// ============================================================

// Note: Environment variables are loaded by dotenv in index.js
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_IMAGE_URL = "https://openrouter.ai/api/v1/chat/completions";
const AI_MODEL = "google/gemini-2.5-flash-lite";
const IMAGE_MODEL = "google/gemini-2.5-flash-image";
const MAX_HISTORY_MESSAGES = 10;
const MAX_TOKENS = 150;
const MAX_DEEP_SEARCH_DEPTH = 10;

// Validate API key on module load
if (!OPENROUTER_API_KEY) {}

const SYSTEM_PROMPT = `You are Momento AI, the intelligent assistant for Momento social network.

YOUR ROLE: Help users grow their social media presence with creative captions, post ideas, and engagement tips.

RULES:
1. Keep responses SHORT (under 50 words) - this is a mobile chat
2. Be casual, friendly, and trendy
3. Use emojis sparingly but effectively
4. Skip formal greetings - dive right in
5. For caption requests, give 2-3 options
6. Be encouraging and positive`;

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

// Set for O(1) lookup performance
const IMAGE_KEYWORDS = new Set([
  "create an image",
  "generate an image",
  "make an image",
  "draw an image",
  "create image",
  "generate image",
  "make image",
  "draw image",
  "create a picture",
  "generate a picture",
  "make a picture",
  "create picture",
  "generate picture",
  "make picture",
  "create the image",
  "generate the image",
  "make the image",
  "draw the image",
]);

const IMAGE_PREFIXES = [
  "create an image of",
  "generate an image of",
  "make an image of",
  "draw an image of",
  "create the image of",
  "generate the image of",
  "make the image of",
  "draw the image of",
  "create image of",
  "generate image of",
  "make image of",
  "draw image of",
  "create a picture of",
  "generate a picture of",
  "make a picture of",
  "create picture of",
  "generate picture of",
  "make picture of",
];

/**
 * Checks if the content is an image generation request
 * @param {string} content - User message content
 * @returns {boolean} - True if content contains image generation keywords
 */
const isImageGenerationRequest = (content) => {
  const lowerContent = content.toLowerCase().trim();
  // Check if any keyword from the Set is present in the content
  for (const keyword of IMAGE_KEYWORDS) {
    if (lowerContent.includes(keyword)) {
      return true;
    }
  }
  return false;
};

/**
 * Extracts the image prompt from user content
 * @param {string} content - User message content
 * @returns {string} - Extracted image prompt
 */
const extractImagePrompt = (content) => {
  const lowerContent = content.toLowerCase();

  // Try to find and extract prompt from known prefixes
  for (const prefix of IMAGE_PREFIXES) {
    if (lowerContent.includes(prefix)) {
      const index = lowerContent.indexOf(prefix);
      return content.substring(index + prefix.length).trim();
    }
  }

  // Fallback: extract text after "of" if "image" and "of" are present
  if (lowerContent.includes("image") && lowerContent.includes("of")) {
    const ofIndex = lowerContent.indexOf("of");
    return content.substring(ofIndex + 2).trim();
  }

  return content.trim();
};

/**
 * Recursively searches for base64 image data in an object
 * @param {any} obj - Object to search
 * @param {number} depth - Current recursion depth
 * @returns {string|null} - Base64 image data URL or null
 */
const findBase64Image = (obj, depth = 0) => {
  if (depth > MAX_DEEP_SEARCH_DEPTH || !obj || typeof obj !== "object") {
    return null;
  }

  // Check for direct data with mime_type
  if (obj.data && obj.mime_type) {
    return `data:${obj.mime_type};base64,${obj.data}`;
  }

  // Check for inline_data structure
  if (obj.inline_data?.data) {
    const mimeType = obj.inline_data.mime_type || "image/png";
    return `data:${mimeType};base64,${obj.inline_data.data}`;
  }

  // Recursively search in arrays and objects
  for (const value of Object.values(obj)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        const result = findBase64Image(item, depth + 1);
        if (result) return result;
      }
    } else if (typeof value === "object" && value !== null) {
      const result = findBase64Image(value, depth + 1);
      if (result) return result;
    } else if (typeof value === "string") {
      // Check for base64 data URL
      if (value.startsWith("data:image/")) {
        return value;
      }
      // Check for potential base64 string
      if (value.length > 100 && /^[A-Za-z0-9+/=]+$/.test(value)) {
        return `data:image/png;base64,${value}`;
      }
    }
  }

  return null;
};

/**
 * Extracts image URL from OpenRouter API response
 * @param {object} imageData - API response data
 * @returns {string|null} - Image URL or null if not found
 */
const extractImageFromResponse = (imageData) => {
  if (!imageData || typeof imageData !== "object") {
    return null;
  }

  // Check choices[0].message.content (array or string)
  if (imageData.choices?.[0]?.message?.content) {
    const content = imageData.choices[0].message.content;

    if (Array.isArray(content)) {
      // Find inline_data part
      const inlineDataPart = content.find(
        (part) => part.inline_data || (part.type && part.inline_data)
      );
      if (inlineDataPart?.inline_data?.data) {
        const mimeType = inlineDataPart.inline_data.mime_type || "image/png";
        return `data:${mimeType};base64,${inlineDataPart.inline_data.data}`;
      }

      // Find image part
      const imagePart = content.find(
        (part) =>
          part.type === "image" ||
          part.type === "image_url" ||
          part.image_url ||
          part.image ||
          part.inline_data
      );

      if (imagePart) {
        if (imagePart.inline_data?.data) {
          const mimeType = imagePart.inline_data.mime_type || "image/png";
          return `data:${mimeType};base64,${imagePart.inline_data.data}`;
        }
        if (imagePart.image_url?.url) return imagePart.image_url.url;
        if (imagePart.image_url) return imagePart.image_url;
        if (imagePart.image) return imagePart.image;
        if (imagePart.url) return imagePart.url;
        if (imagePart.data) {
          const mimeType = imagePart.mime_type || "image/png";
          return `data:${mimeType};base64,${imagePart.data}`;
        }
      }
    } else if (typeof content === "string") {
      // Extract base64 or URL from string
      const base64Match = content.match(/data:image\/[^;]+;base64,[^\s"']+/);
      if (base64Match) return base64Match[0];

      const urlMatch = content.match(/https?:\/\/[^\s"']+/);
      if (urlMatch) return urlMatch[0];
    }
  }

  // Check choices[0].message.image_url
  if (imageData.choices?.[0]?.message?.image_url) {
    const imageUrl = imageData.choices[0].message.image_url;
    return typeof imageUrl === "string" ? imageUrl : imageUrl.url;
  }

  // Check data array
  if (Array.isArray(imageData.data)) {
    const imageItem = imageData.data.find((item) => item.url || item.b64_json);
    if (imageItem?.url) return imageItem.url;
    if (imageItem?.b64_json) {
      return `data:image/png;base64,${imageItem.b64_json}`;
    }
  }

  // Check images array
  if (Array.isArray(imageData.images)) {
    const imageItem = imageData.images[0];
    if (imageItem?.url) return imageItem.url;
    if (imageItem?.b64_json) {
      return `data:image/png;base64,${imageItem.b64_json}`;
    }
    if (imageItem?.data) {
      const mimeType = imageItem.mime_type || "image/png";
      return `data:${mimeType};base64,${imageItem.data}`;
    }
  }

  // Check candidates (Gemini format)
  if (Array.isArray(imageData.candidates)) {
    const candidate = imageData.candidates[0];
    if (candidate?.content?.parts) {
      const imagePart = candidate.content.parts.find(
        (part) => part.inline_data
      );
      if (imagePart?.inline_data?.data) {
        const mimeType = imagePart.inline_data.mime_type || "image/png";
        return `data:${mimeType};base64,${imagePart.inline_data.data}`;
      }
    }
  }

  // Deep search as last resort
  return findBase64Image(imageData);
};

// ============================================================
// ROUTE HANDLERS
// ============================================================

export default function MomentoAIRoutes(app) {
  const dao = MomentoAIDao();

  // POST /api/momento-ai/chat - Send message to Momento AI
  // Body: { content: string }
  // Auth: Required
  // Returns: { userMessage: object, assistantMessage: object }
  const sendMessage = async (req, res) => {
    try {
      const currentUser = req.session["currentUser"];
      if (!currentUser) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { content } = req.body;
      if (!content || !content.trim()) {
        return res.status(400).json({ message: "Message content required" });
      }

      const trimmedContent = content.trim();
      const userMessage = await dao.createMessage({
        userId: currentUser._id,
        role: "user",
        content: trimmedContent,
      });

      // Handle image generation requests
      if (isImageGenerationRequest(trimmedContent)) {
        const imagePrompt = extractImagePrompt(trimmedContent);

        if (!OPENROUTER_API_KEY) {
          const assistantMessage = await dao.createMessage({
            userId: currentUser._id,
            role: "assistant",
            content:
              "Image generation is not configured. Please contact support.",
          });
          return res.json({
            userMessage,
            assistantMessage,
          });
        }

        try {
          const imageResponse = await fetch(OPENROUTER_IMAGE_URL, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${OPENROUTER_API_KEY}`,
              "Content-Type": "application/json",
              "HTTP-Referer": process.env.CLIENT_URL || "http://localhost:3000",
              "X-Title": "Momento AI Image Generation",
            },
            body: JSON.stringify({
              model: IMAGE_MODEL,
              messages: [
                {
                  role: "user",
                  content: `Generate an image of: ${imagePrompt}`,
                },
              ],
              image_config: {
                aspect_ratio: "1:1",
              },
              modalities: ["image"],
            }),
          });

          if (!imageResponse.ok) {
            const errorData = await imageResponse.json().catch(() => ({}));
            throw new Error(
              errorData.error?.message ||
                errorData.message ||
                `Image generation failed: ${imageResponse.status}`
            );
          }

          const imageData = await imageResponse.json();

          if (imageData.error) {
            throw new Error(imageData.error.message || "API returned an error");
          }

          const imageUrl = extractImageFromResponse(imageData);

          if (!imageUrl) {
            const assistantMessage = await dao.createMessage({
              userId: currentUser._id,
              role: "assistant",
              content: "I couldn't generate the image. Please try again.",
            });

            return res.json({
              userMessage,
              assistantMessage,
            });
          }

          const assistantMessage = await dao.createMessage({
            userId: currentUser._id,
            role: "assistant",
            content: `Here's the image: ${imagePrompt}`,
            imageUrl: imageUrl,
          });

          return res.json({
            userMessage,
            assistantMessage,
          });
        } catch (error) {
          const assistantMessage = await dao.createMessage({
            userId: currentUser._id,
            role: "assistant",
            content:
              "I'm having trouble generating the image. Please try again.",
          });

          return res.json({
            userMessage,
            assistantMessage,
          });
        }
      }

      // Handle text generation requests
      const history = await dao.findMessagesByUser(currentUser._id);
      const recentHistory = history.slice(-MAX_HISTORY_MESSAGES);

      const messages = [
        { role: "system", content: SYSTEM_PROMPT },
        ...recentHistory.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
      ];

      if (!OPENROUTER_API_KEY) {
        const assistantMessage = await dao.createMessage({
          userId: currentUser._id,
          role: "assistant",
          content: "AI service is not configured. Please contact support.",
        });
        return res.json({
          userMessage,
          assistantMessage,
        });
      }

      const aiResponse = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": process.env.CLIENT_URL || "http://localhost:3000",
          "X-Title": "Momento AI Chat",
        },
        body: JSON.stringify({
          model: AI_MODEL,
          messages,
          max_tokens: MAX_TOKENS,
        }),
      });

      if (!aiResponse.ok) {
        const errorData = await aiResponse.json().catch(() => ({}));        throw new Error(
          errorData.error?.message ||
            errorData.message ||
            `AI service unavailable: ${aiResponse.status}`
        );
      }

      const aiData = await aiResponse.json();

      if (aiData.error) {        throw new Error(aiData.error.message || "API returned an error");
      }

      // Handle different response formats
      let aiContent = null;

      if (aiData.choices && aiData.choices.length > 0) {
        const choice = aiData.choices[0];
        if (choice.message) {
          aiContent = choice.message.content;
        } else if (choice.text) {
          aiContent = choice.text;
        }
      } else if (aiData.content) {
        aiContent = aiData.content;
      } else if (typeof aiData === "string") {
        aiContent = aiData;
      }

      if (!aiContent) {
        aiContent = "Sorry, I couldn't generate a response. Try again!";
      }

      const assistantMessage = await dao.createMessage({
        userId: currentUser._id,
        role: "assistant",
        content: aiContent,
      });

      res.json({
        userMessage,
        assistantMessage,
      });
    } catch (error) {      res.status(500).json({
        message: "Failed to process message. Please try again.",
      });
    }
  };
  app.post("/api/momento-ai/chat", sendMessage);

  // GET /api/momento-ai - Get AI chat history for current user
  // Auth: Required
  // Returns: { messages: array }
  const getMessages = async (req, res) => {
    try {
      const currentUser = req.session["currentUser"];
      if (!currentUser) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const messages = await dao.findMessagesByUser(currentUser._id);
      res.json({ messages });
    } catch (error) {      res.status(500).json({ message: "Failed to fetch messages" });
    }
  };
  app.get("/api/momento-ai", getMessages);

  // PUT /api/momento-ai/:messageId/feedback - Update message feedback
  // Params: { messageId: string }
  // Body: { feedback: "up" | "down" | null }
  // Auth: Required
  // Returns: Updated message object
  const updateFeedback = async (req, res) => {
    try {
      const currentUser = req.session["currentUser"];
      if (!currentUser) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { messageId } = req.params;
      const { feedback } = req.body;

      if (!["up", "down", null].includes(feedback)) {
        return res.status(400).json({ message: "Invalid feedback value" });
      }

      const updated = await dao.updateMessageFeedback(messageId, feedback);
      if (!updated) {
        return res.status(404).json({ message: "Message not found" });
      }

      res.json(updated);
    } catch (error) {      res.status(500).json({ message: "Failed to update feedback" });
    }
  };
  app.put("/api/momento-ai/:messageId/feedback", updateFeedback);

  // DELETE /api/momento-ai - Clear AI chat history for current user
  // Auth: Required
  // Returns: { message: string }
  const clearMessages = async (req, res) => {
    try {
      const currentUser = req.session["currentUser"];
      if (!currentUser) {
        return res.status(401).json({ message: "Authentication required" });
      }

      await dao.deleteMessagesByUser(currentUser._id);
      res.json({ message: "Conversation cleared" });
    } catch (error) {      res.status(500).json({ message: "Failed to clear conversation" });
    }
  };
  app.delete("/api/momento-ai", clearMessages);

  return app;
}
