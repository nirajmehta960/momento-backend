import model from "./model.js";
import { v4 as uuidv4 } from "uuid";

export default function PostsDao() {
  // Create a new post with UUID
  const createPost = async (post) => {
    try {
      const newPost = { ...post, _id: uuidv4() };
      return await model.create(newPost);
    } catch (error) {
      throw error;
    }
  };

  // Get all posts with optional sorting and pagination (optimized with database sorting)
  const findAllPosts = async (sortBy = "latest", limit = null, skip = 0) => {
    try {
      let sortQuery = { createdAt: -1 };

      if (sortBy === "latest") {
        sortQuery = { createdAt: -1 };
      } else if (sortBy === "oldest") {
        sortQuery = { createdAt: 1 };
      } else if (sortBy === "mostLiked") {
        // For mostLiked, we need to sort by likes array length
        // MongoDB doesn't support sorting by array length directly, so we'll use aggregation
        // For now, we'll fetch all and sort in memory, but with limit/skip applied first
        sortQuery = { createdAt: -1 }; // Fallback, will sort by likes after
      }

      let query = model
        .find()
        .populate("creator", "-imageData")
        .select("-imageData")
        .sort(sortQuery);

      // Apply pagination
      if (skip > 0) {
        query = query.skip(skip);
      }
      if (limit && limit > 0) {
        query = query.limit(limit);
      }

      const posts = await query;

      // For mostLiked, sort by likes count (in-memory for now)
      // TODO: Consider using aggregation pipeline for better performance at scale
      if (sortBy === "mostLiked") {
        return posts.sort((a, b) => {
          const aLikes = (a.likes || []).length;
          const bLikes = (b.likes || []).length;
          if (aLikes !== bLikes) {
            return bLikes - aLikes;
          }
          return new Date(b.createdAt) - new Date(a.createdAt);
        });
      }

      return posts;
    } catch (error) {
      throw error;
    }
  };

  // Get post by ID with populated creator
  const findPostById = async (postId) => {
    try {
      return await model
        .findById(postId)
        .populate("creator", "-imageData")
        .select("-imageData");
    } catch (error) {
      throw error;
    }
  };

  // Get all posts by a specific user with pagination
  const findPostsByCreator = async (userId, limit = null, skip = 0) => {
    try {
      let query = model
        .find({ creator: userId })
        .populate("creator", "-imageData")
        .select("-imageData")
        .sort({ createdAt: -1 });

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

  // Update post by ID
  const updatePost = async (postId, postUpdates) => {
    try {
      const updatedPost = { ...postUpdates, updatedAt: new Date() };
      return await model.updateOne({ _id: postId }, { $set: updatedPost });
    } catch (error) {
      throw error;
    }
  };

  // Delete post by ID
  const deletePost = async (postId) => {
    try {
      return await model.findByIdAndDelete(postId);
    } catch (error) {
      throw error;
    }
  };

  // Update likes array for a post (embedded array pattern)
  const likePost = async (postId, likesArray) => {
    try {
      if (!Array.isArray(likesArray)) {
        throw new Error("likesArray must be an array");
      }

      const result = await model.updateOne(
        { _id: postId },
        {
          $set: {
            likes: likesArray,
            updatedAt: new Date(),
          },
        }
      );

      if (result.matchedCount === 0) {
        throw new Error("Post not found");
      }

      const updatedPost = await model.findOne({ _id: postId });
      return updatedPost;
    } catch (error) {
      throw error;
    }
  };

  // Find post by imageId (used for serving images)
  const findPostByImageId = async (imageId) => {
    try {
      return await model.findOne({ imageId });
    } catch (error) {
      throw error;
    }
  };

  // Search posts by caption, location, or tags with pagination
  const searchPosts = async (searchTerm, limit = null, skip = 0) => {
    try {
      if (!searchTerm || searchTerm.trim() === "") {
        return [];
      }
      const regex = new RegExp(searchTerm.trim(), "i");
      let query = model
        .find({
          $or: [
            { caption: { $regex: regex } },
            { location: { $regex: regex } },
            { tags: regex },
          ],
        })
        .populate("creator", "-imageData")
        .select("-imageData")
        .sort({ createdAt: -1 });

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

  // Find posts liked by a specific user with pagination
  const findPostsLikedByUser = async (userId, limit = null, skip = 0) => {
    try {
      let query = model
        .find({ likes: userId })
        .populate("creator", "-imageData")
        .select("-imageData")
        .sort({ createdAt: -1 });

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

  return {
    createPost,
    findAllPosts,
    findPostById,
    findPostsByCreator,
    updatePost,
    deletePost,
    likePost,
    findPostByImageId,
    searchPosts,
    findPostsLikedByUser,
  };
}
