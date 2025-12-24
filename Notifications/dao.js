import model from "./model.js";
import { v4 as uuidv4 } from "uuid";

export default function NotificationsDao() {
  // Create a new notification with UUID
  // Used when users like posts, follow users, or create reviews
  const createNotification = async (notificationData) => {
    try {
      const newNotification = { ...notificationData, _id: uuidv4() };
      return await model.create(newNotification);
    } catch (error) {
      throw error;
    }
  };

  // Get all notifications for a user with pagination (read and unread)
  // Populates actor, post, and review references for complete notification data
  // Sorted by newest first (createdAt: -1)
  // Optimized with .lean() and selective field population for better performance
  const findNotificationsByUser = async (userId, limit = null, skip = 0) => {
    try {
      let query = model
        .find({ user: userId })
        .populate("actor", "name username imageUrl imageId") // Only get needed actor fields
        .populate("post", "_id caption imageUrl imageId createdAt") // Only get needed post fields (no creator to avoid extra query)
        .populate({
          path: "review",
          select: "_id review rating createdAt", // Only get needed review fields
        })
        .sort({ createdAt: -1 })
        .lean(); // Use lean() for faster read-only queries (returns plain objects)

      if (skip > 0) {
        query = query.skip(skip);
      }
      if (limit && limit > 0) {
        query = query.limit(limit);
      }

      return await query;
    } catch (error) {
      throw error;
    }
  };

  // Get only unread notifications for a user
  // Useful for showing notification badges/counts
  // Optimized with .lean() and selective field population
  const findUnreadNotificationsByUser = async (userId) => {
    try {
      return await model
        .find({ user: userId, read: false })
        .populate("actor", "name username imageUrl imageId")
        .populate("post", "_id caption imageUrl imageId createdAt")
        .populate({
          path: "review",
          select: "_id review rating createdAt",
        })
        .sort({ createdAt: -1 })
        .lean();
    } catch (error) {
      throw error;
    }
  };

  // Mark a single notification as read
  // Updates read status and updatedAt timestamp
  const markAsRead = async (notificationId) => {
    try {
      return await model.updateOne(
        { _id: notificationId },
        { $set: { read: true, updatedAt: new Date() } }
      );
    } catch (error) {
      throw error;
    }
  };

  // Mark all notifications as read for a user
  // Used for "mark all as read" functionality
  const markAllAsRead = async (userId) => {
    try {
      return await model.updateMany(
        { user: userId, read: false },
        { $set: { read: true, updatedAt: new Date() } }
      );
    } catch (error) {
      throw error;
    }
  };

  // Delete a notification by ID
  // Allows users to remove notifications they no longer want to see
  const deleteNotification = async (notificationId) => {
    try {
      return await model.findByIdAndDelete(notificationId);
    } catch (error) {
      throw error;
    }
  };

  // Count unread notifications for a user
  // Used for notification badge counts in UI
  const countUnreadNotifications = async (userId) => {
    try {
      return await model.countDocuments({ user: userId, read: false });
    } catch (error) {
      throw error;
    }
  };

  return {
    createNotification,
    findNotificationsByUser,
    findUnreadNotificationsByUser,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    countUnreadNotifications,
  };
}
