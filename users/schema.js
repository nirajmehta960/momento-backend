import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    _id: String,
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    name: String,
    email: { type: String, required: true, unique: true },
    bio: String,
    imageUrl: String,
    imageId: String,
    imageData: String,
    imageMimeType: String,
    thumbnailUrl: String, // served via /api/images/user/:imageId/thumbnail
    thumbnailData: String, // base64 thumbnail, excluded in queries
    thumbnailMimeType: String,
    role: { type: String, enum: ["USER", "ADMIN"], default: "USER" },
    createdAt: { type: Date, default: () => new Date() },
    updatedAt: { type: Date, default: () => new Date() },
    lastLogin: { type: Date },
  },
  { collection: "users" }
);

export default userSchema;
