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

  // Get all notifications for a user (read and unread)
  // Populates actor, post, and review references for complete notification data
  // Sorted by newest first (createdAt: -1)
  const findNotificationsByUser = async (userId) => {
    try {
      return await model
        .find({ user: userId })
        .populate("actor")
        .populate("post")
        .populate("review")
        .sort({ createdAt: -1 });
    } catch (error) {
      throw error;
    }
  };

  // Get only unread notifications for a user
  // Useful for showing notification badges/counts
  const findUnreadNotificationsByUser = async (userId) => {
    try {
      return await model
        .find({ user: userId, read: false })
        .populate("actor")
        .populate("post")
        .populate("review")
        .sort({ createdAt: -1 });
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
