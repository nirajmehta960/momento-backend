import mongoose from "mongoose";
import schema from "./schema.js";

const model = mongoose.model("SaveModel", schema);
export default model;
