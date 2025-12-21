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

export default saveSchema;
