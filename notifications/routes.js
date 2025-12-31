import NotificationsDao from "./dao.js";
import {
  validateNotificationId,
  validatePagination,
} from "../middleware/validation.js";

export default function NotificationRoutes(app, io) {
  const dao = NotificationsDao();

  // GET /api/notifications - Get all notifications for current user
  // Query params: ?limit=10&skip=0
  // Returns: { documents: Notification[] } (populated with actor, post, review)
  // Auth: Required
  const getNotifications = async (req, res) => {
    try {
      const currentUser = req.session["currentUser"];
      if (!currentUser) {
        res.status(401).json({ message: "You must be logged in" });
        return;
      }

      const { limit, skip } = req.query;
      const limitNum = limit ? parseInt(limit) : 20; // Default limit of 20
      const skipNum = skip ? parseInt(skip) : 0;

      const notifications = await dao.findNotificationsByUser(
        currentUser._id,
        limitNum,
        skipNum
      );
      res.json({ documents: notifications });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  };
  app.get("/api/notifications", validatePagination, getNotifications);

  // GET /api/notifications/unread-count - Get count of unread notifications
  // Returns: { count: number }
  // Auth: Required
  // Used for notification badge counts in UI
  const getUnreadCount = async (req, res) => {
    try {
      const currentUser = req.session["currentUser"];
      if (!currentUser) {
        res.status(401).json({ message: "You must be logged in" });
        return;
      }

      const count = await dao.countUnreadNotifications(currentUser._id);
      res.json({ count });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch unread count" });
    }
  };
  app.get("/api/notifications/unread-count", getUnreadCount);

  // PUT /api/notifications/:notificationId/read - Mark a notification as read
  // Params: notificationId
  // Auth: Required
  const markNotificationAsRead = async (req, res) => {
    try {
      const { notificationId } = req.params;
      const currentUser = req.session["currentUser"];
      if (!currentUser) {
        res.status(401).json({ message: "You must be logged in" });
        return;
      }

      await dao.markAsRead(notificationId);
      res.json({ message: "Notification marked as read" });
    } catch (error) {
      res.status(500).json({ error: "Failed to mark notification as read" });
    }
  };
  app.put(
    "/api/notifications/:notificationId/read",
    validateNotificationId,
    markNotificationAsRead
  );

  // PUT /api/notifications/read-all - Mark all notifications as read
  // Auth: Required
  // Marks all unread notifications for the current user as read
  const markAllAsRead = async (req, res) => {
    try {
      const currentUser = req.session["currentUser"];
      if (!currentUser) {
        res.status(401).json({ message: "You must be logged in" });
        return;
      }

      await dao.markAllAsRead(currentUser._id);
      res.json({ message: "All notifications marked as read" });
    } catch (error) {
      res
        .status(500)
        .json({ error: "Failed to mark all notifications as read" });
    }
  };
  app.put("/api/notifications/read-all", markAllAsRead);

  // DELETE /api/notifications/:notificationId - Delete a notification
  // Params: notificationId
  // Auth: Required
  // Allows users to remove notifications they no longer want to see
  const deleteNotification = async (req, res) => {
    try {
      const { notificationId } = req.params;
      const currentUser = req.session["currentUser"];
      if (!currentUser) {
        res.status(401).json({ message: "You must be logged in" });
        return;
      }

      await dao.deleteNotification(notificationId);
      res.json({ message: "Notification deleted successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete notification" });
    }
  };
  app.delete(
    "/api/notifications/:notificationId",
    validateNotificationId,
    deleteNotification
  );

  return app;
}
