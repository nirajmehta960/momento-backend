import model from "./model.js";
import { v4 as uuidv4 } from "uuid";

/**
 * Data Access Object for Momento AI messages
 * Handles all database operations for AI chat messages
 */
export default function MomentoAIDao() {
  /**
   * Create a new AI message
   * @param {object} messageData - Message data (userId, role, content, imageUrl, feedback)
   * @returns {Promise<object>} - Created message
   */
  const createMessage = async (messageData) => {
    try {
      const newMessage = { ...messageData, _id: uuidv4() };
      return await model.create(newMessage);
    } catch (error) {
      throw error;
    }
  };

  /**
   * Find all messages for a user, sorted by creation date (oldest first)
   * @param {string} userId - User ID
   * @returns {Promise<array>} - Array of messages
   */
  const findMessagesByUser = async (userId) => {
    try {
      return await model.find({ userId }).sort({ createdAt: 1 });
    } catch (error) {
      throw error;
    }
  };

  /**
   * Update feedback for a message
   * @param {string} messageId - Message ID
   * @param {string|null} feedback - Feedback value ("up", "down", or null)
   * @returns {Promise<object>} - Updated message
   */
  const updateMessageFeedback = async (messageId, feedback) => {
    try {
      return await model.findByIdAndUpdate(
        messageId,
        { feedback },
        { new: true }
      );
    } catch (error) {
      throw error;
    }
  };

  /**
   * Delete all messages for a user
   * @param {string} userId - User ID
   * @returns {Promise<object>} - Delete result
   */
  const deleteMessagesByUser = async (userId) => {
    try {
      return await model.deleteMany({ userId });
    } catch (error) {
      throw error;
    }
  };

  return {
    createMessage,
    findMessagesByUser,
    updateMessageFeedback,
    deleteMessagesByUser,
  };
}
