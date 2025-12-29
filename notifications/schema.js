import mongoose from "mongoose";

// Notification Schema - Polymorphic references pattern
// Notifications can reference different types of content (post, review, external content)
// Uses multiple optional references to support different notification types
const notificationSchema = new mongoose.Schema(
  {
    _id: String, // UUID generated in DAO
    user: { type: String, ref: "UserModel", required: true }, // recipient of notification
    actor: { type: String, ref: "UserModel", required: true }, // user who performed the action
    type: {
      type: String,
      enum: ["LIKE", "FOLLOW", "REVIEW", "COMMENT"], // notification type
      required: true,
    },
    post: { type: String, ref: "PostModel" }, // optional - for LIKE/REVIEW notifications
    review: { type: String, ref: "ReviewModel" }, // optional - for REVIEW notifications
    externalContentId: String, // optional - for external content reviews
    read: { type: Boolean, default: false }, // read/unread status
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { collection: "notifications" }
);

// Indexes for performance optimization
notificationSchema.index({ user: 1, read: 1 }); // For finding unread notifications by user
notificationSchema.index({ user: 1, createdAt: -1 }); // For sorting notifications by user and date
notificationSchema.index({ actor: 1 }); // For finding notifications by actor (for cascade deletion)

export default notificationSchema;
