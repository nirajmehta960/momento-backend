import mongoose from "mongoose";
import schema from "./schema.js";

const followModel = mongoose.model("FollowModel", schema);
export default followModel;
