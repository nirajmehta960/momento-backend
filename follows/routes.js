import FollowsDao from "./dao.js";
import NotificationsDao from "../notifications/dao.js";
import {
  validateFollowUser,
  validateFollowingId,
  validateUserId,
} from "../middleware/validation.js";

export default function FollowRoutes(app, io) {
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
        const notification = await notificationsDao.createNotification({
          user: followingId,
          actor: currentUser._id,
          type: "FOLLOW",
        });

        // Populate notification before emitting
        const populatedNotification =
          await notificationsDao.findNotificationById(notification._id);

        // Emit real-time notification to the followed user
        if (io && populatedNotification) {
          io.to(`user-${followingId}`).emit(
            "new-notification",
            populatedNotification
          );
          io.to(`user-${followingId}`).emit("notification-count-updated");
        }

        // Emit follow update to both users for real-time profile updates
        if (io) {
          io.to(`user-${followingId}`).emit("follow-updated", {
            userId: followingId,
            followerId: currentUser._id,
            action: "follow",
          });
          io.to(`user-${currentUser._id}`).emit("follow-updated", {
            userId: currentUser._id,
            followingId: followingId,
            action: "follow",
          });
        }
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

      // Emit real-time unfollow update to both users
      if (io) {
        io.to(`user-${followingId}`).emit("follow-updated", {
          userId: followingId,
          followerId: currentUser._id,
          action: "unfollow",
        });
        io.to(`user-${currentUser._id}`).emit("follow-updated", {
          userId: currentUser._id,
          followingId: followingId,
          action: "unfollow",
        });
      }

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

  // GET /api/follows/messagable/:userId - Get users who can be messaged (mutual follow)
  // Auth: Not required
  const getMessagableUsers = async (req, res) => {
    try {
      const { userId } = req.params;
      const messagableUsers = await dao.findMessagableUsers(userId);
      res.json(messagableUsers);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch messagable users" });
    }
  };
  app.get(
    "/api/follows/messagable/:userId",
    validateUserId,
    getMessagableUsers
  );

  return app;
}
