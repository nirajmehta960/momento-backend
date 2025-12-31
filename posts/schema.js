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
    thumbnailUrl: String, // served via /api/images/post/:imageId/thumbnail
    thumbnailData: String, // base64 thumbnail, excluded in queries
    thumbnailMimeType: String,
    location: String,
    tags: [String],
    likes: [{ type: String, ref: "UserModel" }], // embedded array of user IDs
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { collection: "posts" }
);

// Indexes for performance optimization
postSchema.index({ creator: 1 }); // For finding posts by creator
postSchema.index({ createdAt: -1 }); // For sorting by date (most recent first)
postSchema.index({ imageId: 1 }); // For finding posts by imageId
postSchema.index({ likes: 1 }); // For finding posts liked by a user
postSchema.index({ tags: 1 }); // For tag-based searches
postSchema.index({ location: 1 }); // For location-based searches

export default postSchema;
