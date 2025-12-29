import mongoose from "mongoose";

/**
 * Schema for AI messages in Momento AI chat
 * Stores conversation history between users and the AI assistant
 */
const aiMessageSchema = new mongoose.Schema(
  {
    _id: String,
    userId: { type: String, ref: "UserModel", required: true },
    role: {
      type: String,
      enum: ["user", "assistant"],
      required: true,
    },
    content: { type: String, required: true },
    imageUrl: { type: String, default: null },
    feedback: {
      type: String,
      enum: ["up", "down", null],
      default: null,
    },
    createdAt: { type: Date, default: Date.now },
  },
  { collection: "ai_messages" }
);

// Indexes for performance optimization
// Compound index for efficient querying by user and time
aiMessageSchema.index({ userId: 1, createdAt: 1 });

export default aiMessageSchema;
