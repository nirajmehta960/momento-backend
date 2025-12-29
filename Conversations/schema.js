import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema(
  {
    _id: String,
    senderId: { type: String, ref: "UserModel", required: true },
    receiverId: { type: String, ref: "UserModel", required: true },
    content: { type: String, required: true },
    read: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
  },
  { collection: "conversations" }
);

export default conversationSchema;
