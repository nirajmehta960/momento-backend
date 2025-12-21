import PostsDao from "./dao.js";
import upload from "../middleware/uploadBase64.js";
import multer from "multer";

export default function PostRoutes(app) {
  const dao = PostsDao();

  // POST /api/posts - Create a new post
  // Body: FormData (file, caption, location, tags)
  // Auth: Required
  const createPost = async (req, res) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: "No file uploaded" });
        return;
      }

      const currentUser = req.session["currentUser"];
      if (!currentUser) {
        res
          .status(401)
          .json({ message: "You must be logged in to create a post" });
        return;
      }

      const imageData = req.file.buffer.toString("base64");
      const imageMimeType = req.file.mimetype;
      const imageId = `post-${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const serverUrl =
        process.env.SERVER_URL ||
        `http://localhost:${process.env.PORT || 4000}`;
      const imageUrl = `${serverUrl}/api/images/post/${imageId}`;

      const tags = req.body.tags
        ? req.body.tags
            .replace(/ /g, "")
            .split(",")
            .filter((tag) => tag)
        : [];

      const postData = {
        creator: currentUser._id,
        caption: req.body.caption || "",
        imageUrl,
        imageId,
        imageData,
        imageMimeType,
        location: req.body.location || "",
        tags,
        likes: [],
      };

      const newPost = await dao.createPost(postData);
      const populatedPost = await dao.findPostById(newPost._id);
      res.json(populatedPost);
    } catch (error) {
      res.status(500).json({ error: "Failed to create post" });
    }
  };
  app.post(
    "/api/posts",
    (req, res, next) => {
      upload.single("file")(req, res, (err) => {
        if (err) {
          if (err instanceof multer.MulterError) {
            if (err.code === "LIMIT_FILE_SIZE") {
              return res
                .status(400)
                .json({ error: "File too large. Maximum size is 5MB." });
            }
            return res.status(400).json({ error: err.message });
          }
          return res
            .status(400)
            .json({ error: err.message || "File upload error" });
        }
        next();
      });
    },
    createPost
  );

  const getRecentPosts = async (req, res) => {
    try {
      const { limit, skip, sortBy } = req.query;
      const limitNum = limit ? parseInt(limit) : undefined;
      const skipNum = skip ? parseInt(skip) : 0;
      const sortOption = sortBy || "latest";
      let posts = await dao.findAllPosts(sortOption);
      if (skipNum > 0) {
        posts = posts.slice(skipNum);
      }
      if (limitNum) {
        posts = posts.slice(0, limitNum);
      }
      res.json({ documents: posts });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch posts" });
    }
  };
  app.get("/api/posts", getRecentPosts);

  // GET /api/posts/:postId - Get post by ID
  // Auth: Not required
  const getPostById = async (req, res) => {
    try {
      const { postId } = req.params;
      const post = await dao.findPostById(postId);
      if (!post) {
        res.status(404).json({ message: "Post not found" });
        return;
      }
      res.json(post);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch post" });
    }
  };
  app.get("/api/posts/:postId", getPostById);

  const getUserPosts = async (req, res) => {
    try {
      const { userId } = req.params;
      const posts = await dao.findPostsByCreator(userId);
      res.json({ documents: posts });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user posts" });
    }
  };
  app.get("/api/posts/user/:userId", getUserPosts);

  // PUT /api/posts/:postId - Update post
  // Body: FormData (optional file, caption, location, tags)
  // Auth: Required (must be post creator)
  const updatePost = async (req, res) => {
    try {
      const { postId } = req.params;
      const currentUser = req.session["currentUser"];
      if (!currentUser) {
        res.status(401).json({ message: "You must be logged in" });
        return;
      }

      const existingPost = await dao.findPostById(postId);
      if (!existingPost) {
        res.status(404).json({ message: "Post not found" });
        return;
      }

      if (existingPost.creator._id !== currentUser._id) {
        res.status(403).json({ message: "You can only update your own posts" });
        return;
      }

      const postUpdates = { ...req.body };
      if (req.file) {
        const imageData = req.file.buffer.toString("base64");
        const imageMimeType = req.file.mimetype;
        const imageId = `post-${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        const serverUrl =
          process.env.SERVER_URL ||
          `http://localhost:${process.env.PORT || 4000}`;
        postUpdates.imageUrl = `${serverUrl}/api/images/post/${imageId}`;
        postUpdates.imageId = imageId;
        postUpdates.imageData = imageData;
        postUpdates.imageMimeType = imageMimeType;
      }

      if (postUpdates.tags && typeof postUpdates.tags === "string") {
        postUpdates.tags = postUpdates.tags
          .replace(/ /g, "")
          .split(",")
          .filter((tag) => tag);
      }

      await dao.updatePost(postId, postUpdates);
      const updatedPost = await dao.findPostById(postId);
      res.json(updatedPost);
    } catch (error) {
      res.status(500).json({ error: "Failed to update post" });
    }
  };
  app.put(
    "/api/posts/:postId",
    (req, res, next) => {
      upload.single("file")(req, res, (err) => {
        if (err) {
          if (err instanceof multer.MulterError) {
            if (err.code === "LIMIT_FILE_SIZE") {
              return res
                .status(400)
                .json({ error: "File too large. Maximum size is 5MB." });
            }
            return res.status(400).json({ error: err.message });
          }
          return res
            .status(400)
            .json({ error: err.message || "File upload error" });
        }
        next();
      });
    },
    updatePost
  );

  const deletePost = async (req, res) => {
    try {
      const { postId } = req.params;
      const currentUser = req.session["currentUser"];
      if (!currentUser) {
        res.status(401).json({ message: "You must be logged in" });
        return;
      }

      const post = await dao.findPostById(postId);
      if (!post) {
        res.status(404).json({ message: "Post not found" });
        return;
      }

      if (
        post.creator._id !== currentUser._id &&
        currentUser.role !== "ADMIN"
      ) {
        res.status(403).json({ message: "You can only delete your own posts" });
        return;
      }

      await dao.deletePost(postId);
      res.json({ message: "Post deleted successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete post" });
    }
  };
  app.delete("/api/posts/:postId", deletePost);

  // PUT /api/posts/:postId/like - Like/unlike a post
  // Body: { likesArray: string[] }
  // Auth: Required
  const likePost = async (req, res) => {
    try {
      const { postId } = req.params;
      const { likesArray } = req.body;
      const currentUser = req.session["currentUser"];
      if (!currentUser) {
        res.status(401).json({ message: "You must be logged in" });
        return;
      }

      if (!likesArray || !Array.isArray(likesArray)) {
        res.status(400).json({ error: "likesArray must be an array" });
        return;
      }

      const existingPost = await dao.findPostById(postId);
      if (!existingPost) {
        res.status(404).json({ error: "Post not found" });
        return;
      }

      const normalizedLikesArray = likesArray
        .map((like) =>
          typeof like === "object" ? like._id || like.id || like : String(like)
        )
        .filter((id) => id && id !== "");

      const previousLikes = existingPost.likes || [];
      const previousLikesArray = previousLikes
        .map((like) =>
          typeof like === "object" ? like._id || like.id || like : String(like)
        )
        .filter((id) => id && id !== "");
      const isLiking =
        !previousLikesArray.includes(currentUser._id) &&
        normalizedLikesArray.includes(currentUser._id);

      const updatedPost = await dao.likePost(postId, normalizedLikesArray);
      if (!updatedPost) {
        res.status(404).json({ error: "Post not found" });
        return;
      }

      const populatedPost = await dao.findPostById(updatedPost._id);
      if (!populatedPost) {
        res.status(404).json({ error: "Post not found after update" });
        return;
      }

      res.json(populatedPost);
    } catch (error) {
      res.status(500).json({ error: error.message || "Failed to like post" });
    }
  };
  app.put("/api/posts/:postId/like", likePost);

  // GET /api/images/post/:imageId - Serve post image
  // Auth: Not required
  const getPostImage = async (req, res) => {
    try {
      const { imageId } = req.params;
      const post = await dao.findPostByImageId(imageId);
      if (!post || !post.imageData) {
        res.status(404).json({ message: "Image not found" });
        return;
      }
      const imageBuffer = Buffer.from(post.imageData, "base64");
      res.set("Content-Type", post.imageMimeType || "image/jpeg");
      res.set("Cache-Control", "public, max-age=31536000, immutable");
      res.send(imageBuffer);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch image" });
    }
  };
  app.get("/api/images/post/:imageId", getPostImage);

  return app;
}
