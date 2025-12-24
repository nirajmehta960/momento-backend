import mongoose from "mongoose";
import schema from "./schema.js";

const postModel = mongoose.model("PostModel", schema);
export default postModel;
