import SavesDao from "./dao.js";

export default function SaveRoutes(app) {
  const dao = SavesDao();

  // POST /api/saves - Save a post
  // Body: { postId: string }
  // Auth: Required
  const savePost = async (req, res) => {
    try {
      const { postId } = req.body;
      const currentUser = req.session["currentUser"];
      if (!currentUser) {
        res.status(401).json({ message: "You must be logged in" });
        return;
      }

      const save = await dao.savePost(currentUser._id, postId);
      res.json(save);
    } catch (error) {
      res.status(500).json({ error: "Failed to save post" });
    }
  };
  app.post("/api/saves", savePost);

  // DELETE /api/saves - Unsave a post
  // Body: { postId: string }
  // Auth: Required
  const unsavePost = async (req, res) => {
    try {
      const { postId } = req.body;
      const currentUser = req.session["currentUser"];
      if (!currentUser) {
        res.status(401).json({ message: "You must be logged in" });
        return;
      }

      if (!postId) {
        res.status(400).json({ error: "postId is required" });
        return;
      }

      const result = await dao.unsavePost(currentUser._id, postId);
      if (result.deletedCount === 0) {
        res.status(404).json({ error: "Save record not found" });
        return;
      }

      res.json({ message: "Post unsaved successfully" });
    } catch (error) {
      res.status(500).json({ error: error.message || "Failed to unsave post" });
    }
  };
  app.delete("/api/saves", unsavePost);

  // GET /api/saves/user/:userId - Get all saved posts for a user
  // Auth: Required (must be own profile)
  const getSavedPosts = async (req, res) => {
    try {
      const { userId } = req.params;
      const currentUser = req.session["currentUser"];
      if (!currentUser) {
        res.status(401).json({ message: "You must be logged in" });
        return;
      }

      if (currentUser._id !== userId) {
        res.status(403).json({ message: "Unauthorized" });
        return;
      }

      const savedPosts = await dao.findSavedPostsByUser(userId);
      const saves = savedPosts.map((post) => ({
        _id: `${userId}-${post._id}`,
        $id: `${userId}-${post._id}`,
        id: `${userId}-${post._id}`,
        post: {
          _id: post._id,
          $id: post._id,
          id: post._id,
          creator: post.creator
            ? {
                _id: post.creator._id,
                $id: post.creator._id,
                id: post.creator._id,
                name: post.creator.name,
                username: post.creator.username,
                imageUrl: post.creator.imageUrl || "",
              }
            : null,
          caption: post.caption,
          imageUrl: post.imageUrl,
          imageId: post.imageId,
          location: post.location,
          tags: post.tags || [],
          likes: post.likes || [],
          $createdAt: post.createdAt,
          createdAt: post.createdAt,
        },
      }));
      res.json({ save: saves });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch saved posts" });
    }
  };
  app.get("/api/saves/user/:userId", getSavedPosts);

  return app;
}
