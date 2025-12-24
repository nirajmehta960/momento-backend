import mongoose from "mongoose";

const saveSchema = new mongoose.Schema(
  {
    _id: String, // Composite key: `${userId}-${postId}` (junction table pattern)
    user: { type: String, ref: "UserModel", required: true },
    post: { type: String, ref: "PostModel", required: true },
    savedAt: { type: Date, default: Date.now },
  },
  { collection: "saves" }
);

// Indexes for performance optimization
saveSchema.index({ user: 1 }); // For finding saved posts by user
saveSchema.index({ post: 1 }); // For finding users who saved a post
saveSchema.index({ user: 1, post: 1 }); // Compound index for checking save relationship

export default saveSchema;
