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
      // Use aggregation pipeline for mostLiked sorting (database-level optimization)
      if (sortBy === "mostLiked") {
        const limitNum = limit && limit > 0 ? parseInt(limit) : null;
        const skipNum = skip > 0 ? parseInt(skip) : 0;

        const pipeline = [
          // Add field for likes count
          {
            $addFields: {
              likesCount: { $size: { $ifNull: ["$likes", []] } },
            },
          },
          // Sort by likes count (descending), then by createdAt (descending)
          {
            $sort: { likesCount: -1, createdAt: -1 },
          },
          // Apply pagination
          ...(skipNum > 0 ? [{ $skip: skipNum }] : []),
          ...(limitNum && limitNum > 0 ? [{ $limit: limitNum }] : []),
          // Populate creator field
          {
            $lookup: {
              from: "users",
              localField: "creator",
              foreignField: "_id",
              as: "creator",
            },
          },
          {
            $unwind: {
              path: "$creator",
              preserveNullAndEmptyArrays: true,
            },
          },
          // Project only needed fields (exclude imageData)
          {
            $project: {
              _id: 1,
              creator: {
                _id: "$creator._id",
                name: "$creator.name",
                username: "$creator.username",
                email: "$creator.email",
                imageUrl: "$creator.imageUrl",
                imageId: "$creator.imageId",
                bio: "$creator.bio",
                role: "$creator.role",
                createdAt: "$creator.createdAt",
                updatedAt: "$creator.updatedAt",
                lastLogin: "$creator.lastLogin",
              },
              caption: 1,
              imageUrl: 1,
              imageId: 1,
              location: 1,
              tags: 1,
              likes: 1,
              createdAt: 1,
              updatedAt: 1,
            },
          },
        ];

        const posts = await model.aggregate(pipeline);
        return posts;
      }

      // For other sort options, use regular query (more efficient for simple sorts)
      let sortQuery = { createdAt: -1 };

      if (sortBy === "latest") {
        sortQuery = { createdAt: -1 };
      } else if (sortBy === "oldest") {
        sortQuery = { createdAt: 1 };
      }

      let query = model
        .find()
        .populate("creator", "-imageData")
        .select("-imageData")
        .sort(sortQuery)
        .lean(); // Return plain JavaScript objects instead of Mongoose documents

      // Apply pagination
      if (skip > 0) {
        query = query.skip(skip);
      }
      if (limit && limit > 0) {
        query = query.limit(limit);
      }

      const posts = await query;
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
        .select("-imageData")
        .lean(); // Return plain JavaScript object instead of Mongoose document
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
        .sort({ createdAt: -1 })
        .lean(); // Return plain JavaScript objects instead of Mongoose documents

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

      const updatedPost = await model.findOne({ _id: postId }).lean(); // Return plain JavaScript object
      return updatedPost;
    } catch (error) {
      throw error;
    }
  };

  // Find post by imageId (used for serving images)
  const findPostByImageId = async (imageId) => {
    try {
      return await model.findOne({ imageId }).lean(); // Return plain JavaScript object
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
        .sort({ createdAt: -1 })
        .lean(); // Return plain JavaScript objects instead of Mongoose documents

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
        .sort({ createdAt: -1 })
        .lean(); // Return plain JavaScript objects instead of Mongoose documents

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
