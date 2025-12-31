import PostsDao from "./dao.js";
import NotificationsDao from "../notifications/dao.js";
import FollowsDao from "../follows/dao.js";
import PostsModel from "./model.js";
import upload from "../middleware/uploadBase64.js";
import multer from "multer";
import { requireRole } from "../middleware/auth.js";
import {
  validateCreatePost,
  validateUpdatePost,
  validatePagination,
  validateSearch,
  validatePostId,
  validateUserId,
} from "../middleware/validation.js";
import { cacheMiddleware, invalidateCache } from "../middleware/cache.js";
import { getCacheKey } from "../utils/cache.js";
import { ERROR_MESSAGES, ERROR_CODES } from "../constants/errorMessages.js";
import {
  sendSuccessResponse,
  sendErrorResponse,
} from "../utils/responseFormatter.js";
import { processImage, bufferToBase64 } from "../utils/imageOptimizer.js";

export default function PostRoutes(app, io) {
  const dao = PostsDao();
  const notificationsDao = NotificationsDao();

  // POST /api/posts - Create a new post
  // Body: FormData (file, caption, location, tags)
  // Auth: Required
  const createPost = async (req, res) => {
    try {
      if (!req.file) {
        return sendErrorResponse(
          res,
          ERROR_MESSAGES.NO_FILE_UPLOADED,
          400,
          ERROR_CODES.MISSING_FIELDS
        );
      }

      const currentUser = req.session["currentUser"];
      if (!currentUser) {
        return sendErrorResponse(
          res,
          ERROR_MESSAGES.AUTH_REQUIRED,
          401,
          ERROR_CODES.AUTH_REQUIRED
        );
      }

      // Process and optimize image
      const { optimized, thumbnail } = await processImage(req.file.buffer, {
        convertToWebP: true,
      });

      const imageId = `post-${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const serverUrl =
        process.env.SERVER_URL ||
        `http://localhost:${process.env.PORT || 4000}`;

      // Store optimized image as base64 (for backward compatibility)
      const imageData = bufferToBase64(optimized.buffer);
      const imageMimeType = optimized.mimeType;
      const imageUrl = `${serverUrl}/api/images/post/${imageId}`;

      // Store thumbnail as base64
      const thumbnailData = bufferToBase64(thumbnail.buffer);
      const thumbnailMimeType = thumbnail.mimeType;
      const thumbnailUrl = `${serverUrl}/api/images/post/${imageId}/thumbnail`;

      const tags = req.body.tags
        ? req.body.tags
            .replace(/ /g, "")
            .split(",")
            .filter((tag) => tag)
        : [];

      const postData = {
        creator: currentUser._id,
        caption: req.body.caption || "",
        imageUrl,
        imageId,
        imageData,
        imageMimeType,
        thumbnailUrl,
        thumbnailData,
        thumbnailMimeType,
        location: req.body.location || "",
        tags,
        likes: [],
      };

      const newPost = await dao.createPost(postData);
      const populatedPost = await dao.findPostById(newPost._id);

      // Invalidate posts cache (new post added)
      invalidateCache("posts");

      // Emit real-time post creation to all followers
      if (io) {
        try {
          const followsDao = FollowsDao();
          const followers = await followsDao.findFollowers(currentUser._id);
          // Emit to all followers
          followers.forEach((follower) => {
            const followerId = follower._id || follower.id;
            if (followerId) {
              io.to(`user-${followerId}`).emit("new-post", populatedPost);
            }
          });
        } catch (error) {
          // Non-blocking: real-time update failure shouldn't break post creation
        }
      }

      sendSuccessResponse(res, populatedPost, 201);
    } catch (error) {
      sendErrorResponse(
        res,
        ERROR_MESSAGES.POST_CREATE_FAILED,
        500,
        ERROR_CODES.INTERNAL_ERROR
      );
    }
  };
  app.post(
    "/api/posts",
    (req, res, next) => {
      upload.single("file")(req, res, (err) => {
        if (err) {
          if (err instanceof multer.MulterError) {
            if (err.code === "LIMIT_FILE_SIZE") {
              return res
                .status(400)
                .json({ error: "File too large. Maximum size is 5MB." });
            }
            return res.status(400).json({ error: err.message });
          }
          return res
            .status(400)
            .json({ error: err.message || "File upload error" });
        }
        next();
      });
    },
    validateCreatePost,
    createPost
  );

  const getRecentPosts = async (req, res) => {
    try {
      const { limit, skip, sortBy } = req.query;
      const limitNum = limit ? parseInt(limit) : 20; // Default limit of 20
      const skipNum = skip ? parseInt(skip) : 0;
      const sortOption = sortBy || "latest";

      // Use optimized findAllPosts with pagination
      const posts = await dao.findAllPosts(sortOption, limitNum, skipNum);

      sendSuccessResponse(res, posts, 200);
    } catch (error) {
      sendErrorResponse(
        res,
        ERROR_MESSAGES.POSTS_FETCH_FAILED,
        500,
        ERROR_CODES.INTERNAL_ERROR
      );
    }
  };
  app.get(
    "/api/posts",
    validatePagination,
    cacheMiddleware({
      prefix: "posts",
      keyGenerator: (req) => {
        const { limit, skip, sortBy } = req.query;
        return getCacheKey(
          "posts",
          `${sortBy || "latest"}:${limit || 20}:${skip || 0}`
        );
      },
      ttl: 2 * 60 * 1000, // 2 minutes (posts change more frequently)
    }),
    getRecentPosts
  );

  // GET /api/posts/search - Search posts by caption, location, or tags
  // Query params: ?searchTerm=query
  // Auth: Not required
  const searchPosts = async (req, res) => {
    try {
      const { searchTerm, limit, skip } = req.query;
      if (!searchTerm) {
        return sendErrorResponse(
          res,
          ERROR_MESSAGES.REQUIRED_FIELDS_MISSING,
          400,
          ERROR_CODES.MISSING_FIELDS
        );
      }
      const limitNum = limit ? parseInt(limit) : 20; // Default limit of 20
      const skipNum = skip ? parseInt(skip) : 0;

      const posts = await dao.searchPosts(searchTerm, limitNum, skipNum);
      sendSuccessResponse(res, posts, 200);
    } catch (error) {
      sendErrorResponse(
        res,
        ERROR_MESSAGES.POST_SEARCH_FAILED,
        500,
        ERROR_CODES.INTERNAL_ERROR
      );
    }
  };
  app.get("/api/posts/search", validateSearch, searchPosts);

  // GET /api/posts/feed - Get personalized feed (posts from followed users + own posts)
  // Query params: ?limit=10&skip=0&sortBy=latest
  // Auth: Required
  const getFeed = async (req, res) => {
    try {
      const currentUser = req.session["currentUser"];
      if (!currentUser) {
        res.status(401).json({ message: "You must be logged in" });
        return;
      }

      const followsDao = FollowsDao();
      const { limit, skip, sortBy } = req.query;
      const limitNum = limit ? parseInt(limit) : 20; // Default limit of 20
      const skipNum = skip ? parseInt(skip) : 0;
      const sortOption = sortBy || "latest";

      // Get list of users the current user is following
      const following = await followsDao.findFollowing(currentUser._id);
      const followingIds = following.map((user) => user._id || user.id);

      // Include current user's own posts in the feed
      const feedUserIds = [...followingIds, currentUser._id];

      // Optimized: Query database directly for posts by feed users
      // This is much more efficient than loading all posts and filtering
      let query = PostsModel.find({ creator: { $in: feedUserIds } })
        .populate("creator", "-imageData")
        .select("-imageData");

      // Apply sorting
      if (sortOption === "latest") {
        query = query.sort({ createdAt: -1 });
      } else if (sortOption === "oldest") {
        query = query.sort({ createdAt: 1 });
      } else {
        query = query.sort({ createdAt: -1 }); // Default
      }

      // Apply pagination
      if (skipNum > 0) {
        query = query.skip(skipNum);
      }
      if (limitNum > 0) {
        query = query.limit(limitNum);
      }

      // For mostLiked, use aggregation pipeline for database-level sorting
      if (sortOption === "mostLiked") {
        const pipeline = [
          // Match posts from feed users
          {
            $match: { creator: { $in: feedUserIds } },
          },
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
          ...(limitNum > 0 ? [{ $limit: limitNum }] : []),
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

        const posts = await PostsModel.aggregate(pipeline);
        sendSuccessResponse(res, posts, 200, posts.length);
      } else {
        // For other sort options, use regular query
        let posts = await query;
        sendSuccessResponse(res, posts, 200, posts.length);
      }
    } catch (error) {
      sendErrorResponse(
        res,
        ERROR_MESSAGES.POSTS_FETCH_FAILED,
        500,
        ERROR_CODES.INTERNAL_ERROR
      );
    }
  };
  app.get("/api/posts/feed", validatePagination, getFeed);

  // GET /api/posts/:postId - Get post by ID
  // Auth: Not required
  const getPostById = async (req, res) => {
    try {
      const { postId } = req.params;
      const post = await dao.findPostById(postId);
      if (!post) {
        return sendErrorResponse(
          res,
          ERROR_MESSAGES.POST_NOT_FOUND,
          404,
          ERROR_CODES.POST_NOT_FOUND
        );
      }
      sendSuccessResponse(res, post, 200);
    } catch (error) {
      sendErrorResponse(
        res,
        ERROR_MESSAGES.POST_FETCH_FAILED,
        500,
        ERROR_CODES.INTERNAL_ERROR
      );
    }
  };
  app.get(
    "/api/posts/:postId",
    validatePostId,
    cacheMiddleware({
      prefix: "post",
      keyGenerator: (req) => {
        return getCacheKey("post", req.params.postId);
      },
      ttl: 3 * 60 * 1000, // 3 minutes
    }),
    getPostById
  );

  const getUserPosts = async (req, res) => {
    try {
      const { userId } = req.params;
      const { limit, skip } = req.query;
      const limitNum = limit ? parseInt(limit) : 20; // Default limit of 20
      const skipNum = skip ? parseInt(skip) : 0;

      const posts = await dao.findPostsByCreator(userId, limitNum, skipNum);
      sendSuccessResponse(res, posts, 200, posts.length);
    } catch (error) {
      sendErrorResponse(
        res,
        ERROR_MESSAGES.POSTS_FETCH_FAILED,
        500,
        ERROR_CODES.INTERNAL_ERROR
      );
    }
  };
  app.get(
    "/api/posts/user/:userId",
    validateUserId,
    validatePagination,
    getUserPosts
  );

  // PUT /api/posts/:postId - Update post
  // Body: FormData (optional file, caption, location, tags)
  // Auth: Required (must be post creator)
  const updatePost = async (req, res) => {
    try {
      const { postId } = req.params;
      const currentUser = req.session["currentUser"];
      if (!currentUser) {
        res.status(401).json({ message: "You must be logged in" });
        return;
      }

      const existingPost = await dao.findPostById(postId);
      if (!existingPost) {
        res.status(404).json({ message: "Post not found" });
        return;
      }

      if (existingPost.creator._id !== currentUser._id) {
        res.status(403).json({ message: "You can only update your own posts" });
        return;
      }

      const postUpdates = { ...req.body };

      // Images cannot be changed when editing a post
      // Only caption, location, and tags can be updated
      // Ignore any file uploads during update
      if (req.file) {
        // Silently ignore file uploads during post updates
        // Users can only edit caption, location, and tags
      }

      // Remove any image-related fields from updates to prevent accidental changes
      delete postUpdates.imageUrl;
      delete postUpdates.imageId;
      delete postUpdates.imageData;
      delete postUpdates.imageMimeType;
      delete postUpdates.thumbnailUrl;
      delete postUpdates.thumbnailData;
      delete postUpdates.thumbnailMimeType;

      if (postUpdates.tags && typeof postUpdates.tags === "string") {
        postUpdates.tags = postUpdates.tags
          .replace(/ /g, "")
          .split(",")
          .filter((tag) => tag);
      }

      await dao.updatePost(postId, postUpdates);
      const updatedPost = await dao.findPostById(postId);

      // Invalidate post cache
      invalidateCache("post", postId);
      invalidateCache("posts"); // Also invalidate posts list

      sendSuccessResponse(res, updatedPost, 200);
    } catch (error) {
      sendErrorResponse(
        res,
        ERROR_MESSAGES.POST_UPDATE_FAILED,
        500,
        ERROR_CODES.INTERNAL_ERROR
      );
    }
  };
  app.put(
    "/api/posts/:postId",
    (req, res, next) => {
      upload.single("file")(req, res, (err) => {
        if (err) {
          if (err instanceof multer.MulterError) {
            if (err.code === "LIMIT_FILE_SIZE") {
              return res
                .status(400)
                .json({ error: "File too large. Maximum size is 5MB." });
            }
            return res.status(400).json({ error: err.message });
          }
          return res
            .status(400)
            .json({ error: err.message || "File upload error" });
        }
        next();
      });
    },
    updatePost
  );

  const deletePost = async (req, res) => {
    try {
      const { postId } = req.params;
      const currentUser = req.session["currentUser"];
      if (!currentUser) {
        res.status(401).json({ message: "You must be logged in" });
        return;
      }

      const post = await dao.findPostById(postId);
      if (!post) {
        res.status(404).json({ message: "Post not found" });
        return;
      }

      if (
        post.creator._id !== currentUser._id &&
        currentUser.role !== "ADMIN"
      ) {
        res.status(403).json({ message: "You can only delete your own posts" });
        return;
      }

      await dao.deletePost(postId);

      // Invalidate post cache
      invalidateCache("post", postId);
      invalidateCache("posts"); // Also invalidate posts list

      sendSuccessResponse(res, { message: "Post deleted successfully" }, 200);
    } catch (error) {
      sendErrorResponse(
        res,
        ERROR_MESSAGES.POST_DELETE_FAILED,
        500,
        ERROR_CODES.INTERNAL_ERROR
      );
    }
  };
  app.delete("/api/posts/:postId", validatePostId, deletePost);

  // PUT /api/posts/:postId/like - Like/unlike a post
  // Body: { likesArray: string[] }
  // Auth: Required
  const likePost = async (req, res) => {
    try {
      const { postId } = req.params;
      const { likesArray } = req.body;
      const currentUser = req.session["currentUser"];
      if (!currentUser) {
        res.status(401).json({ message: "You must be logged in" });
        return;
      }

      if (!likesArray || !Array.isArray(likesArray)) {
        res.status(400).json({ error: "likesArray must be an array" });
        return;
      }

      const existingPost = await dao.findPostById(postId);
      if (!existingPost) {
        res.status(404).json({ error: "Post not found" });
        return;
      }

      const normalizedLikesArray = likesArray
        .map((like) =>
          typeof like === "object" ? like._id || like.id || like : String(like)
        )
        .filter((id) => id && id !== "");

      const previousLikes = existingPost.likes || [];
      const previousLikesArray = previousLikes
        .map((like) =>
          typeof like === "object" ? like._id || like.id || like : String(like)
        )
        .filter((id) => id && id !== "");
      const isLiking =
        !previousLikesArray.includes(currentUser._id) &&
        normalizedLikesArray.includes(currentUser._id);

      const updatedPost = await dao.likePost(postId, normalizedLikesArray);
      if (!updatedPost) {
        res.status(404).json({ error: "Post not found" });
        return;
      }

      const populatedPost = await dao.findPostById(updatedPost._id);
      if (!populatedPost) {
        res.status(404).json({ error: "Post not found after update" });
        return;
      }

      // Create notification when user likes a post (not their own)
      if (isLiking && populatedPost.creator._id !== currentUser._id) {
        try {
          const notification = await notificationsDao.createNotification({
            user: populatedPost.creator._id,
            actor: currentUser._id,
            type: "LIKE",
            post: postId,
          });

          // Populate notification before emitting
          const populatedNotification =
            await notificationsDao.findNotificationById(notification._id);

          // Emit real-time notification to the post creator
          if (io && populatedNotification) {
            io.to(`user-${populatedPost.creator._id}`).emit(
              "new-notification",
              populatedNotification
            );
            io.to(`user-${populatedPost.creator._id}`).emit(
              "notification-count-updated"
            );
          }
        } catch (notifError) {
          // Non-blocking: notification creation failure shouldn't break the like
        }
      }

      // Invalidate post cache (likes changed)
      invalidateCache("post", postId);
      invalidateCache("posts"); // Also invalidate posts list (for mostLiked sorting)

      // Emit real-time post like update to all users viewing this post
      if (io) {
        io.emit("post-liked", {
          postId,
          likes: normalizedLikesArray,
          post: populatedPost,
        });
      }

      res.json(populatedPost);
    } catch (error) {
      res.status(500).json({ error: error.message || "Failed to like post" });
    }
  };
  app.put("/api/posts/:postId/like", validatePostId, likePost);

  // GET /api/posts/user/:userId/liked - Get posts liked by a user
  // Auth: Required (must be own profile)
  const getLikedPosts = async (req, res) => {
    try {
      const { userId } = req.params;
      const currentUser = req.session["currentUser"];
      if (!currentUser) {
        res.status(401).json({ message: "You must be logged in" });
        return;
      }

      if (currentUser._id !== userId) {
        res.status(403).json({ message: "Unauthorized" });
        return;
      }

      const posts = await dao.findPostsLikedByUser(userId);
      res.json({ documents: posts });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch liked posts" });
    }
  };
  app.get(
    "/api/posts/user/:userId/liked",
    validateUserId,
    validatePagination,
    getLikedPosts
  );

  // DELETE /api/admin/posts/:postId - Delete post (admin only)
  // Auth: Required (ADMIN role)
  const deletePostAdmin = async (req, res) => {
    try {
      const { postId } = req.params;
      const post = await dao.findPostById(postId);
      if (!post) {
        res.status(404).json({ message: "Post not found" });
        return;
      }

      await dao.deletePost(postId);

      // Invalidate post cache
      invalidateCache("post", postId);
      invalidateCache("posts"); // Also invalidate posts list

      sendSuccessResponse(
        res,
        { message: "Post deleted successfully by admin" },
        200
      );
    } catch (error) {
      res.status(500).json({ error: "Failed to delete post" });
    }
  };
  app.delete(
    "/api/admin/posts/:postId",
    requireRole(["ADMIN"]),
    deletePostAdmin
  );

  // GET /api/images/post/:imageId - Serve post image (optimized)
  // Auth: Not required
  const getPostImage = async (req, res) => {
    try {
      const { imageId } = req.params;
      const post = await dao.findPostByImageId(imageId);
      if (!post || !post.imageData) {
        return sendErrorResponse(
          res,
          "Image not found",
          404,
          ERROR_CODES.RESOURCE_NOT_FOUND
        );
      }
      const imageBuffer = Buffer.from(post.imageData, "base64");
      res.set("Content-Type", post.imageMimeType || "image/webp");
      res.set("Cache-Control", "public, max-age=31536000, immutable");
      // Allow cross-origin requests for images from any origin (for production)
      const origin = req.headers.origin;
      if (origin) {
        res.set("Access-Control-Allow-Origin", origin);
      } else {
        const allowedOrigins = process.env.CLIENT_URL?.split(",") || [
          "http://localhost:3000",
        ];
        res.set("Access-Control-Allow-Origin", allowedOrigins[0]);
      }
      res.set("Access-Control-Allow-Credentials", "true");
      res.set("Cross-Origin-Resource-Policy", "cross-origin");
      res.send(imageBuffer);
    } catch (error) {
      sendErrorResponse(
        res,
        "Failed to fetch image",
        500,
        ERROR_CODES.INTERNAL_ERROR
      );
    }
  };
  app.get("/api/images/post/:imageId", getPostImage);

  // GET /api/images/post/:imageId/thumbnail - Serve post thumbnail
  // Auth: Not required
  const getPostThumbnail = async (req, res) => {
    try {
      const { imageId } = req.params;
      const post = await dao.findPostByImageId(imageId);
      if (!post || !post.thumbnailData) {
        // Fallback to full image if thumbnail not available
        if (post && post.imageData) {
          const imageBuffer = Buffer.from(post.imageData, "base64");
          res.set("Content-Type", post.imageMimeType || "image/webp");
          res.set("Cache-Control", "public, max-age=31536000, immutable");
          const origin = req.headers.origin;
          if (origin) {
            res.set("Access-Control-Allow-Origin", origin);
          } else {
            const allowedOrigins = process.env.CLIENT_URL?.split(",") || [
              "http://localhost:3000",
            ];
            res.set("Access-Control-Allow-Origin", allowedOrigins[0]);
          }
          res.set("Access-Control-Allow-Credentials", "true");
          res.set("Cross-Origin-Resource-Policy", "cross-origin");
          return res.send(imageBuffer);
        }
        return sendErrorResponse(
          res,
          "Thumbnail not found",
          404,
          ERROR_CODES.RESOURCE_NOT_FOUND
        );
      }
      const thumbnailBuffer = Buffer.from(post.thumbnailData, "base64");
      res.set("Content-Type", post.thumbnailMimeType || "image/webp");
      res.set("Cache-Control", "public, max-age=31536000, immutable");
      const origin = req.headers.origin;
      if (origin) {
        res.set("Access-Control-Allow-Origin", origin);
      } else {
        const allowedOrigins = process.env.CLIENT_URL?.split(",") || [
          "http://localhost:3000",
        ];
        res.set("Access-Control-Allow-Origin", allowedOrigins[0]);
      }
      res.set("Access-Control-Allow-Credentials", "true");
      res.set("Cross-Origin-Resource-Policy", "cross-origin");
      res.send(thumbnailBuffer);
    } catch (error) {
      sendErrorResponse(
        res,
        "Failed to fetch thumbnail",
        500,
        ERROR_CODES.INTERNAL_ERROR
      );
    }
  };
  app.get("/api/images/post/:imageId/thumbnail", getPostThumbnail);

  return app;
}
