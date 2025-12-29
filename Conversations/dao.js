import model from "./model.js";
import { v4 as uuidv4 } from "uuid";

export default function ConversationsDao() {
  const createMessage = async (messageData) => {
    try {
      const newMessage = { ...messageData, _id: uuidv4() };
      return await model.create(newMessage);
    } catch (error) {
      throw error;
    }
  };

  const findConversation = async (userId1, userId2) => {
    try {
      return await model
        .find({
          $or: [
            { senderId: userId1, receiverId: userId2 },
            { senderId: userId2, receiverId: userId1 },
          ],
        })
        .sort({ createdAt: 1 });
    } catch (error) {
      throw error;
    }
  };

  const getConversationPartners = async (userId) => {
    try {
      const messages = await model
        .find({
          $or: [{ senderId: userId }, { receiverId: userId }],
        })
        .sort({ createdAt: -1 });

      const partnerMap = new Map();
      messages.forEach((message) => {
        const partnerId =
          message.senderId === userId ? message.receiverId : message.senderId;
        if (!partnerMap.has(partnerId)) {
          partnerMap.set(partnerId, {
            partnerId: partnerId,
            lastMessageTime: message.createdAt,
            lastMessageContent: message.content,
            lastMessageSenderId: message.senderId,
          });
        }
      });

      const partners = Array.from(partnerMap.values());
      for (const partner of partners) {
        const unreadCount = await model.countDocuments({
          senderId: partner.partnerId,
          receiverId: userId,
          read: false,
        });
        partner.unreadCount = unreadCount;
      }

      return partners;
    } catch (error) {
      throw error;
    }
  };

  const getUnreadMessageCount = async (userId) => {
    try {
      const messages = await model.find({
        receiverId: userId,
        senderId: { $ne: userId },
        read: false,
      });

      const senderIds = new Set();
      messages.forEach((message) => {
        senderIds.add(message.senderId);
      });

      return senderIds.size;
    } catch (error) {
      throw error;
    }
  };

  const markMessagesAsRead = async (userId1, userId2) => {
    try {
      await model.updateMany(
        {
          senderId: userId2,
          receiverId: userId1,
          read: false,
        },
        {
          $set: { read: true },
        }
      );
      return { success: true };
    } catch (error) {
      throw error;
    }
  };

  return {
    createMessage,
    findConversation,
    getConversationPartners,
    getUnreadMessageCount,
    markMessagesAsRead,
  };
}
