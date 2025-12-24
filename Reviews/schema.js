import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    _id: String,
    user: { type: String, ref: "UserModel", required: true },
    post: { type: String, ref: "PostModel" }, // optional - polymorphic: post OR externalContentId
    externalContentId: String, // optional - for external content reviews
    review: String,
    rating: { type: Number, min: 1, max: 5 },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { collection: "reviews" }
);

// Indexes for performance optimization
reviewSchema.index({ user: 1 }); // For finding reviews by user
reviewSchema.index({ post: 1 }); // For finding reviews by post
reviewSchema.index({ externalContentId: 1 }); // For finding reviews by external content
reviewSchema.index({ createdAt: -1 }); // For sorting by date

export default reviewSchema;
