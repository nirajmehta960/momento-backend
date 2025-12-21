import mongoose from "mongoose";

const postSchema = new mongoose.Schema(
  {
    _id: String,
    creator: { type: String, ref: "UserModel", required: true },
    caption: String,
    imageUrl: String, // served via /api/images/post/:imageId
    imageId: String,
    imageData: String, // base64, excluded in queries
    imageMimeType: String,
    location: String,
    tags: [String],
    likes: [{ type: String, ref: "UserModel" }], // embedded array of user IDs
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { collection: "posts" }
);

export default postSchema;
