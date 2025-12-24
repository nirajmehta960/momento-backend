import mongoose from "mongoose";

const followSchema = new mongoose.Schema(
  {
    _id: String, // Composite key: `${followerId}-${followingId}`
    follower: { type: String, ref: "UserModel", required: true },
    following: { type: String, ref: "UserModel", required: true },
    followedAt: { type: Date, default: Date.now },
  },
  { collection: "follows" }
);

// Indexes for performance optimization
followSchema.index({ follower: 1 }); // For finding who a user is following
followSchema.index({ following: 1 }); // For finding who follows a user
followSchema.index({ follower: 1, following: 1 }); // Compound index for checking follow relationship

export default followSchema;
