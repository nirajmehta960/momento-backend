import model from "./model.js";

export default function SavesDao() {
  // Save a post for a user (junction table pattern with composite key)
  // Uses composite _id to prevent duplicate saves
  const savePost = async (userId, postId) => {
    try {
      const existingSave = await model.findOne({ user: userId, post: postId });
      if (existingSave) {
        return existingSave;
      }
      const newSave = {
        _id: `${userId}-${postId}`, // composite key prevents duplicates
        user: userId,
        post: postId,
      };
      return await model.create(newSave);
    } catch (error) {
      throw error;
    }
  };

  // Remove save relationship (unsave a post)
  const unsavePost = async (userId, postId) => {
    try {
      return await model.deleteOne({ user: userId, post: postId });
    } catch (error) {
      throw error;
    }
  };

  // Get all saved posts for a user (populated with post and creator)
  const findSavedPostsByUser = async (userId) => {
    try {
      const saves = await model.find({ user: userId }).populate({
        path: "post",
        populate: { path: "creator" },
      });
      return saves.map((save) => save.post).filter((post) => post !== null);
    } catch (error) {
      throw error;
    }
  };

  // Check if a post is saved by a user
  const checkIfPostSaved = async (userId, postId) => {
    try {
      const save = await model.findOne({ user: userId, post: postId });
      return save !== null;
    } catch (error) {
      throw error;
    }
  };

  return {
    savePost,
    unsavePost,
    findSavedPostsByUser,
    checkIfPostSaved,
  };
}
