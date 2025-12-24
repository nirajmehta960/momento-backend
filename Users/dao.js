import model from "./model.js";
import { v4 as uuidv4 } from "uuid";

export default function UsersDao() {
  // Create a new user with UUID
  const createUser = async (user) => {
    try {
      const newUser = { ...user, _id: uuidv4() };
      return await model.create(newUser);
    } catch (error) {
      throw error;
    }
  };

  // Get all users with pagination (excludes imageData for performance)
  const findAllUsers = async (limit = null, skip = 0) => {
    try {
      let query = model.find().select("-imageData").sort({ createdAt: -1 });

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

  // Get user by ID (excludes imageData)
  const findUserById = async (id) => {
    try {
      return await model.findById(id).select("-imageData");
    } catch (error) {
      throw error;
    }
  };

  // Search users by name or username with pagination (case-insensitive regex)
  const findUsersByPartialName = async (partialName, limit = null, skip = 0) => {
    try {
      const regex = new RegExp(partialName, "i");
      let query = model
        .find({
          $or: [{ name: { $regex: regex } }, { username: { $regex: regex } }],
        })
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

  // Get users by role with pagination (USER or ADMIN)
  const findUsersByRole = async (role, limit = null, skip = 0) => {
    try {
      let query = model.find({ role }).select("-imageData").sort({ createdAt: -1 });

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

  // Find user by username
  const findUserByUsername = async (username) => {
    try {
      return await model.findOne({ username });
    } catch (error) {
      throw error;
    }
  };

  // Find user by email
  const findUserByEmail = async (email) => {
    try {
      return await model.findOne({ email });
    } catch (error) {
      throw error;
    }
  };

  // Find user by username and password (deprecated - use bcrypt compare instead)
  const findUserByCredentials = async (username, password) => {
    try {
      return await model.findOne({ username, password });
    } catch (error) {
      throw error;
    }
  };

  // Find user by email and password (deprecated - use bcrypt compare instead)
  const findUserByEmailCredentials = async (email, password) => {
    try {
      return await model.findOne({ email, password });
    } catch (error) {
      throw error;
    }
  };

  // Update user by ID
  const updateUser = async (id, user) => {
    try {
      return await model.findByIdAndUpdate(id, user, { new: true });
    } catch (error) {
      throw error;
    }
  };

  // Delete user by ID
  const deleteUser = async (id) => {
    try {
      return await model.findByIdAndDelete(id);
    } catch (error) {
      throw error;
    }
  };

  // Find user by imageId (used for serving profile images)
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
