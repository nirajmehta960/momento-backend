import model from "./model.js";
import { v4 as uuidv4 } from "uuid";
import postModel from "../Posts/model.js";
import reviewModel from "../Reviews/model.js";
import saveModel from "../Saves/model.js";
import followModel from "../Follows/model.js";
import notificationModel from "../Notifications/model.js";

export default function UsersDao() {
  const createUser = async (user) => {
    try {
      const newUser = { ...user, _id: uuidv4() };
      return await model.create(newUser);
    } catch (error) {
      throw error;
    }
  };

  const findAllUsers = async () => {
    try {
      return await model.find().select("-imageData");
    } catch (error) {
      throw error;
    }
  };

  const findUserById = async (id) => {
    try {
      return await model.findById(id).select("-imageData");
    } catch (error) {
      throw error;
    }
  };

  const findUsersByPartialName = async (partialName) => {
    try {
      const regex = new RegExp(partialName, "i");
      return await model
        .find({
          $or: [{ name: { $regex: regex } }, { username: { $regex: regex } }],
        })
        .select("-imageData");
    } catch (error) {
      throw error;
    }
  };

  const findUsersByRole = async (role) => {
    try {
      return await model.find({ role }).select("-imageData");
    } catch (error) {
      throw error;
    }
  };

  const findUserByUsername = async (username) => {
    try {
      return await model.findOne({ username });
    } catch (error) {
      throw error;
    }
  };

  const findUserByEmail = async (email) => {
    try {
      return await model.findOne({ email });
    } catch (error) {
      throw error;
    }
  };

  const findUserByCredentials = async (username, password) => {
    try {
      return await model.findOne({ username, password });
    } catch (error) {
      throw error;
    }
  };

  const findUserByEmailCredentials = async (email, password) => {
    try {
      return await model.findOne({ email, password });
    } catch (error) {
      throw error;
    }
  };

  const updateUser = async (id, user) => {
    try {
      return await model.findByIdAndUpdate(id, user, { new: true });
    } catch (error) {
      throw error;
    }
  };

  // Cascading delete: Remove all data related to this user
  // Works for both self-deletion and admin deletion
  const deleteUser = async (id) => {
    try {
      // Cascading delete: Remove all data related to this user
      
      // 1. Get all posts created by the user (before deletion)
      const userPosts = await postModel.find({ creator: id }).select("_id");
      const postIds = userPosts.map((post) => post._id);
      
      // 2. Delete all posts created by the user
      await postModel.deleteMany({ creator: id });
      
      // 3. Delete all saves for posts created by the user
      if (postIds.length > 0) {
        await saveModel.deleteMany({ post: { $in: postIds } });
      }
      
      // 4. Delete all reviews for posts created by the user
      if (postIds.length > 0) {
        await reviewModel.deleteMany({ post: { $in: postIds } });
      }
      
      // 5. Delete all notifications for posts created by the user
      if (postIds.length > 0) {
        await notificationModel.deleteMany({ post: { $in: postIds } });
      }
      
      // 6. Remove user from all posts' likes arrays
      await postModel.updateMany(
        { likes: id },
        { $pull: { likes: id } }
      );
      
      // 7. Delete all reviews created by the user
      await reviewModel.deleteMany({ user: id });
      
      // 8. Delete all saves by the user
      await saveModel.deleteMany({ user: id });
      
      // 9. Delete all follows where user is follower or following
      await followModel.deleteMany({
        $or: [{ follower: id }, { following: id }],
      });
      
      // 10. Delete all notifications where user is recipient or actor
      await notificationModel.deleteMany({
        $or: [{ user: id }, { actor: id }],
      });
      
      // 11. Finally, delete the user
      return await model.findByIdAndDelete(id);
    } catch (error) {
      throw error;
    }
  };

  const findUserByImageId = async (imageId) => {
    try {
      return await model.findOne({ imageId });
    } catch (error) {
      throw error;
    }
  };

  return {
    createUser,
    findAllUsers,
    findUserById,
    findUsersByPartialName,
    findUsersByRole,
    findUserByUsername,
    findUserByEmail,
    findUserByCredentials,
    findUserByEmailCredentials,
    findUserByImageId,
    updateUser,
    deleteUser,
  };
}
