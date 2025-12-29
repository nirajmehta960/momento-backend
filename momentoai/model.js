import mongoose from "mongoose";
import schema from "./schema.js";

/**
 * Mongoose model for AI messages
 * Collection: ai_messages
 */
const model = mongoose.model("AIMessageModel", schema);
export default model;
