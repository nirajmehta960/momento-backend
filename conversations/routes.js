import ConversationsDao from "./dao.js";

export default function ConversationRoutes(app, io) {
  const dao = ConversationsDao();

  const sendMessage = async (req, res) => {
    try {
      const currentUser = req.session["currentUser"];
      if (!currentUser) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { receiverId, content } = req.body;
      if (!receiverId || !content || !content.trim()) {
        return res
          .status(400)
          .json({ message: "Receiver and content required" });
      }

      const message = await dao.createMessage({
        senderId: currentUser._id,
        receiverId,
        content: content.trim(),
      });

      // Emit socket event to receiver if they're online
      if (io) {
        io.to(`user-${receiverId}`).emit("new-message", message);

        // Also emit back to sender for real-time update
        io.to(`user-${currentUser._id}`).emit("new-message", message);

        // Notify conversation partners list update for both users
        io.to(`user-${currentUser._id}`).emit("conversation-updated");
        io.to(`user-${receiverId}`).emit("conversation-updated");
      }

      res.json(message);
    } catch (error) {
      res.status(500).json({ message: "Failed to send message" });
    }
  };
  app.post("/api/conversations/send", sendMessage);

  const getUnreadMessageCount = async (req, res) => {
    try {
      const currentUser = req.session["currentUser"];
      if (!currentUser) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const count = await dao.getUnreadMessageCount(currentUser._id);
      res.json({ count });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch unread message count" });
    }
  };
  app.get("/api/conversations/unread-count", getUnreadMessageCount);

  const getConversationPartners = async (req, res) => {
    try {
      const currentUser = req.session["currentUser"];
      if (!currentUser) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const partners = await dao.getConversationPartners(currentUser._id);
      res.json({ partners });
    } catch (error) {
      res
        .status(500)
        .json({ message: "Failed to fetch conversation partners" });
    }
  };
  app.get("/api/conversations", getConversationPartners);

  const getConversation = async (req, res) => {
    try {
      const currentUser = req.session["currentUser"];
      if (!currentUser) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { userId } = req.params;
      if (!userId) {
        return res.status(400).json({ message: "User ID required" });
      }

      const messages = await dao.findConversation(currentUser._id, userId);
      res.json({ messages });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch conversation" });
    }
  };
  app.get("/api/conversations/:userId", getConversation);

  const markConversationAsRead = async (req, res) => {
    try {
      const currentUser = req.session["currentUser"];
      if (!currentUser) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { userId } = req.params;
      if (!userId) {
        return res.status(400).json({ message: "User ID required" });
      }

      await dao.markMessagesAsRead(currentUser._id, userId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to mark messages as read" });
    }
  };
  app.put("/api/conversations/:userId/read", markConversationAsRead);

  return app;
}
