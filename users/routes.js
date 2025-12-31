import UsersDao from "./dao.js";
import upload from "../middleware/uploadBase64.js";
import multer from "multer";
import bcrypt from "bcryptjs";
import { requireRole } from "../middleware/auth.js";
import { cacheMiddleware, invalidateCache } from "../middleware/cache.js";
import { getCacheKey } from "../utils/cache.js";
import {
  ERROR_MESSAGES,
  ERROR_CODES,
  createErrorResponse,
} from "../constants/errorMessages.js";
import {
  sendSuccessResponse,
  sendErrorResponse,
} from "../utils/responseFormatter.js";
import { processImage, bufferToBase64 } from "../utils/imageOptimizer.js";

export default function UserRoutes(app) {
  const dao = UsersDao();

  const signup = async (req, res) => {
    try {
      const existingUser = await dao.findUserByUsername(req.body.username);
      if (existingUser) {
        return sendErrorResponse(
          res,
          ERROR_MESSAGES.USERNAME_TAKEN,
          400,
          ERROR_CODES.ALREADY_EXISTS
        );
      }
      const existingEmail = await dao.findUserByEmail(req.body.email);
      if (existingEmail) {
        return sendErrorResponse(
          res,
          ERROR_MESSAGES.EMAIL_REGISTERED,
          400,
          ERROR_CODES.ALREADY_EXISTS
        );
      }
      const hashedPassword = await bcrypt.hash(req.body.password, 10);
      const userData = {
        ...req.body,
        password: hashedPassword,
        lastLogin: new Date(),
      };
      const currentUser = await dao.createUser(userData);
      req.session["currentUser"] = currentUser;
      sendSuccessResponse(res, currentUser, 200);
    } catch (error) {
      sendErrorResponse(
        res,
        ERROR_MESSAGES.SIGNUP_FAILED,
        500,
        ERROR_CODES.INTERNAL_ERROR
      );
    }
  };
  app.post("/api/users/signup", signup);

  const signin = async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return sendErrorResponse(
          res,
          ERROR_MESSAGES.REQUIRED_FIELDS_MISSING,
          400,
          ERROR_CODES.MISSING_FIELDS
        );
      }

      let currentUser = null;

      if (email.includes("@")) {
        currentUser = await dao.findUserByEmail(email);
      } else {
        currentUser = await dao.findUserByUsername(email);
      }

      if (!currentUser) {
        return sendErrorResponse(
          res,
          ERROR_MESSAGES.INVALID_CREDENTIALS,
          401,
          ERROR_CODES.INVALID_CREDENTIALS
        );
      }

      const isPasswordValid = await bcrypt.compare(
        password,
        currentUser.password
      );

      if (isPasswordValid) {
        await dao.updateUser(currentUser._id, { lastLogin: new Date() });
        const updatedUser = await dao.findUserById(currentUser._id);

        // Invalidate user cache on login (lastLogin changed)
        invalidateCache("user", currentUser._id);

        req.session["currentUser"] = updatedUser;
        sendSuccessResponse(res, updatedUser, 200);
      } else {
        return sendErrorResponse(
          res,
          ERROR_MESSAGES.INVALID_CREDENTIALS,
          401,
          ERROR_CODES.INVALID_CREDENTIALS
        );
      }
    } catch (error) {
      sendErrorResponse(
        res,
        ERROR_MESSAGES.SIGNIN_FAILED,
        500,
        ERROR_CODES.INTERNAL_ERROR
      );
    }
  };
  app.post("/api/users/signin", signin);

  const signout = (req, res) => {
    try {
      req.session.destroy();
      res.sendStatus(200);
    } catch (error) {
      sendErrorResponse(
        res,
        ERROR_MESSAGES.SIGNOUT_FAILED,
        500,
        ERROR_CODES.INTERNAL_ERROR
      );
    }
  };
  app.post("/api/users/signout", signout);

  const profile = (req, res) => {
    try {
      const currentUser = req.session["currentUser"];
      if (!currentUser) {
        return sendSuccessResponse(res, null, 200);
      }
      sendSuccessResponse(res, currentUser, 200);
    } catch (error) {
      sendErrorResponse(
        res,
        ERROR_MESSAGES.PROFILE_FETCH_FAILED,
        500,
        ERROR_CODES.INTERNAL_ERROR
      );
    }
  };
  app.post("/api/users/profile", profile);

  const findAllUsers = async (req, res) => {
    try {
      const { role, name } = req.query;
      let users;

      if (role) {
        users = await dao.findUsersByRole(role);
      } else if (name) {
        users = await dao.findUsersByPartialName(name);
      } else {
        users = await dao.findAllUsers();
      }
      const sanitizedUsers = users.map((user) => {
        const userObj = user.toObject ? user.toObject() : { ...user };
        if (!userObj.lastLogin && userObj.createdAt) {
          userObj.lastLogin = userObj.createdAt;
        }
        delete userObj.email;
        delete userObj.password;
        return userObj;
      });

      sendSuccessResponse(res, sanitizedUsers, 200, sanitizedUsers.length);
    } catch (error) {
      sendErrorResponse(
        res,
        ERROR_MESSAGES.USERS_FETCH_FAILED,
        500,
        ERROR_CODES.INTERNAL_ERROR
      );
    }
  };
  app.get("/api/users", findAllUsers);

  const findUserById = async (req, res) => {
    try {
      const { userId } = req.params;
      const user = await dao.findUserById(userId);
      if (!user) {
        return sendErrorResponse(
          res,
          ERROR_MESSAGES.USER_NOT_FOUND,
          404,
          ERROR_CODES.USER_NOT_FOUND
        );
      }

      const currentUser = req.session["currentUser"];
      const isOwnProfile = currentUser && currentUser._id === userId;

      // user is already a plain object (from .lean()), no need for toObject()
      const userResponse = { ...user };

      if (!userResponse.lastLogin && userResponse.createdAt) {
        userResponse.lastLogin = userResponse.createdAt;
      }

      if (!isOwnProfile) {
        delete userResponse.email;
        delete userResponse.password;
      } else {
        delete userResponse.password;
      }

      sendSuccessResponse(res, userResponse, 200);
    } catch (error) {
      sendErrorResponse(
        res,
        ERROR_MESSAGES.USER_FETCH_FAILED,
        500,
        ERROR_CODES.INTERNAL_ERROR
      );
    }
  };
  app.get(
    "/api/users/:userId",
    cacheMiddleware({
      prefix: "user",
      keyGenerator: (req) => {
        return getCacheKey("user", req.params.userId);
      },
      ttl: 5 * 60 * 1000, // 5 minutes
    }),
    findUserById
  );

  const uploadProfileImage = async (req, res) => {
    try {
      if (!req.file) {
        return sendErrorResponse(
          res,
          ERROR_MESSAGES.NO_FILE_UPLOADED,
          400,
          ERROR_CODES.MISSING_FIELDS
        );
      }

      // Process and optimize image
      const { optimized, thumbnail } = await processImage(req.file.buffer, {
        convertToWebP: true,
      });

      const imageId = `user-${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const serverUrl =
        process.env.SERVER_URL ||
        `http://localhost:${process.env.PORT || 4000}`;

      const imageData = bufferToBase64(optimized.buffer);
      const imageMimeType = optimized.mimeType;
      const imageUrl = `${serverUrl}/api/images/user/${imageId}`;

      const thumbnailData = bufferToBase64(thumbnail.buffer);
      const thumbnailMimeType = thumbnail.mimeType;
      const thumbnailUrl = `${serverUrl}/api/images/user/${imageId}/thumbnail`;

      sendSuccessResponse(
        res,
        {
          imageUrl,
          imageId,
          imageData,
          imageMimeType,
          thumbnailUrl,
          thumbnailData,
          thumbnailMimeType,
        },
        200
      );
    } catch (error) {
      sendErrorResponse(
        res,
        ERROR_MESSAGES.FILE_UPLOAD_FAILED,
        500,
        ERROR_CODES.INTERNAL_ERROR
      );
    }
  };
  app.post(
    "/api/users/upload",
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
    uploadProfileImage
  );

  const updateUser = async (req, res) => {
    try {
      const { userId } = req.params;
      const userUpdates = { ...req.body };

      if (userUpdates.password) {
        userUpdates.password = await bcrypt.hash(userUpdates.password, 10);
      }

      // Note: Image optimization is handled in the upload endpoint
      // This route receives already-optimized image data from the frontend
      if (
        userUpdates.imageData &&
        userUpdates.imageId &&
        userUpdates.imageMimeType
      ) {
        const serverUrl =
          process.env.SERVER_URL ||
          `http://localhost:${process.env.PORT || 4000}`;
        userUpdates.imageUrl = `${serverUrl}/api/images/user/${userUpdates.imageId}`;
        // Thumbnail URL if provided
        if (userUpdates.thumbnailData && userUpdates.thumbnailMimeType) {
          userUpdates.thumbnailUrl = `${serverUrl}/api/images/user/${userUpdates.imageId}/thumbnail`;
        }
      }

      await dao.updateUser(userId, userUpdates);
      const updatedUser = await dao.findUserById(userId);
      if (!updatedUser) {
        return sendErrorResponse(
          res,
          ERROR_MESSAGES.USER_NOT_FOUND,
          404,
          ERROR_CODES.USER_NOT_FOUND
        );
      }

      // Invalidate user cache
      invalidateCache("user", userId);

      const currentUser = req.session["currentUser"];
      if (currentUser && currentUser._id === userId) {
        req.session["currentUser"] = updatedUser;
      }
      sendSuccessResponse(res, updatedUser, 200);
    } catch (error) {
      sendErrorResponse(
        res,
        ERROR_MESSAGES.USER_UPDATE_FAILED,
        500,
        ERROR_CODES.INTERNAL_ERROR
      );
    }
  };
  app.put("/api/users/:userId", updateUser);

  const createUser = async (req, res) => {
    try {
      const user = await dao.createUser(req.body);
      sendSuccessResponse(res, user, 201);
    } catch (error) {
      sendErrorResponse(
        res,
        ERROR_MESSAGES.USER_CREATE_FAILED,
        500,
        ERROR_CODES.INTERNAL_ERROR
      );
    }
  };
  app.post("/api/users", createUser);

  // DELETE /api/users/:userId - Delete user account
  // Supports both self-deletion and admin deletion
  // Cascading delete is handled in dao.deleteUser() for both cases
  const deleteUser = async (req, res) => {
    try {
      const { userId } = req.params;
      const currentUser = req.session["currentUser"];

      if (!currentUser) {
        return sendErrorResponse(
          res,
          ERROR_MESSAGES.AUTH_REQUIRED,
          401,
          ERROR_CODES.AUTH_REQUIRED
        );
      }

      // Allow deletion if user is deleting their own account OR if current user is ADMIN
      if (currentUser._id !== userId && currentUser.role !== "ADMIN") {
        return sendErrorResponse(
          res,
          ERROR_MESSAGES.FORBIDDEN,
          403,
          ERROR_CODES.FORBIDDEN
        );
      }

      // Destroy session only if user is deleting their own account
      if (currentUser._id === userId) {
        req.session.destroy();
      }

      // Cascading delete: Removes all related data (posts, reviews, saves, follows, notifications)
      // Works for both self-deletion and admin deletion
      const status = await dao.deleteUser(userId);
      sendSuccessResponse(res, status, 200);
    } catch (error) {
      sendErrorResponse(
        res,
        ERROR_MESSAGES.USER_DELETE_FAILED,
        500,
        ERROR_CODES.INTERNAL_ERROR
      );
    }
  };
  app.delete("/api/users/:userId", deleteUser);

  const getAllUsers = async (req, res) => {
    try {
      const users = await dao.findAllUsers();
      sendSuccessResponse(res, users, 200, users.length);
    } catch (error) {
      sendErrorResponse(
        res,
        ERROR_MESSAGES.USERS_FETCH_FAILED,
        500,
        ERROR_CODES.INTERNAL_ERROR
      );
    }
  };
  app.get("/api/admin/users", requireRole(["ADMIN"]), getAllUsers);

  const getUserImage = async (req, res) => {
    try {
      const { imageId } = req.params;
      const user = await dao.findUserByImageId(imageId);
      if (!user || !user.imageData) {
        return sendErrorResponse(
          res,
          "Image not found",
          404,
          ERROR_CODES.RESOURCE_NOT_FOUND
        );
      }
      const imageBuffer = Buffer.from(user.imageData, "base64");
      res.set("Content-Type", user.imageMimeType || "image/webp");
      res.set("Cache-Control", "public, max-age=31536000, immutable");
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
  app.get("/api/images/user/:imageId", getUserImage);

  // GET /api/images/user/:imageId/thumbnail - Serve user thumbnail
  // Auth: Not required
  const getUserThumbnail = async (req, res) => {
    try {
      const { imageId } = req.params;
      const user = await dao.findUserByImageId(imageId);
      if (!user || !user.thumbnailData) {
        // Fallback to full image if thumbnail not available
        if (user && user.imageData) {
          const imageBuffer = Buffer.from(user.imageData, "base64");
          res.set("Content-Type", user.imageMimeType || "image/webp");
          res.set("Cache-Control", "public, max-age=31536000, immutable");
          return res.send(imageBuffer);
        }
        return sendErrorResponse(
          res,
          "Thumbnail not found",
          404,
          ERROR_CODES.RESOURCE_NOT_FOUND
        );
      }
      const thumbnailBuffer = Buffer.from(user.thumbnailData, "base64");
      res.set("Content-Type", user.thumbnailMimeType || "image/webp");
      res.set("Cache-Control", "public, max-age=31536000, immutable");
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
  app.get("/api/images/user/:imageId/thumbnail", getUserThumbnail);

  return app;
}
