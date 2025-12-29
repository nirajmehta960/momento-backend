import mongoose from "mongoose";
import schema from "./schema.js";

const model = mongoose.model("ConversationModel", schema);
export default model;
