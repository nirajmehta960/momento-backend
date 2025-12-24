import FollowsDao from "./dao.js";
import NotificationsDao from "../Notifications/dao.js";
import {
  validateFollowUser,
  validateFollowingId,
  validateUserId,
} from "../middleware/validation.js";

export default function FollowRoutes(app) {
  const dao = FollowsDao();
  const notificationsDao = NotificationsDao();

  // POST /api/follows - Follow a user
  // Body: { followingId: string }
  // Auth: Required
  const followUser = async (req, res) => {
    try {
      const { followingId } = req.body;
      const currentUser = req.session["currentUser"];

      if (!currentUser) {
        res.status(401).json({ message: "You must be logged in" });
        return;
      }

      if (currentUser._id === followingId) {
        res.status(400).json({ message: "Cannot follow yourself" });
        return;
      }

      const follow = await dao.followUser(currentUser._id, followingId);

      // Create notification (non-blocking)
      try {
        await notificationsDao.createNotification({
          user: followingId,
          actor: currentUser._id,
          type: "FOLLOW",
        });
      } catch (notifError) {}

      res.json(follow);
    } catch (error) {
      if (error.message === "Cannot follow yourself") {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ error: "Failed to follow user" });
      }
    }
  };
  app.post("/api/follows", validateFollowUser, followUser);

  // DELETE /api/follows/:followingId - Unfollow a user
  // Auth: Required
  const unfollowUser = async (req, res) => {
    try {
      const { followingId } = req.params;
      const currentUser = req.session["currentUser"];

      if (!currentUser) {
        res.status(401).json({ message: "You must be logged in" });
        return;
      }

      await dao.unfollowUser(currentUser._id, followingId);
      res.json({ message: "Unfollowed successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to unfollow user" });
    }
  };
  app.delete("/api/follows/:followingId", validateFollowingId, unfollowUser);

  // GET /api/follows/followers/:userId - Get followers of a user
  // Auth: Not required
  const getFollowers = async (req, res) => {
    try {
      const { userId } = req.params;
      const followers = await dao.findFollowers(userId);
      res.json(followers);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch followers" });
    }
  };
  app.get("/api/follows/followers/:userId", validateUserId, getFollowers);

  // GET /api/follows/following/:userId - Get users that a user is following
  // Auth: Not required
  const getFollowing = async (req, res) => {
    try {
      const { userId } = req.params;
      const following = await dao.findFollowing(userId);
      res.json(following);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch following" });
    }
  };
  app.get("/api/follows/following/:userId", validateUserId, getFollowing);

  return app;
}
