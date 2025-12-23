import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import session from "express-session";
import path from "path";
import { fileURLToPath } from "url";
import UserRoutes from "./Users/routes.js";
import PostRoutes from "./Posts/routes.js";
import FollowRoutes from "./Follows/routes.js";
import ReviewRoutes from "./Reviews/routes.js";
import SaveRoutes from "./Saves/routes.js";
import NotificationsRoutes from "./Notifications/routes.js";
import ExternalRoutes from "./External/routes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONNECTION_STRING =
  process.env.DATABASE_CONNECTION_STRING || "mongodb://127.0.0.1:27017/momento";
mongoose.connect(CONNECTION_STRING);

const app = express();

// CORS configuration - support multiple origins (comma-separated) or single origin
const getCorsOrigin = () => {
  const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
  // Support comma-separated origins for multiple frontend deployments
  if (clientUrl.includes(",")) {
    return clientUrl.split(",").map((url) => url.trim());
  }
  return clientUrl;
};

app.use(
  cors({
    credentials: true,
    origin: getCorsOrigin(),
  })
);

const sessionOptions = {
  secret: process.env.SESSION_SECRET || "momento-secret-key",
  resave: false,
  saveUninitialized: false,
};

if (process.env.SERVER_ENV !== "development") {
  sessionOptions.proxy = true;
  sessionOptions.cookie = {
    sameSite: "none",
    secure: true,
  };
}

app.use(session(sessionOptions));
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ limit: "5mb", extended: true }));

// Register routes
UserRoutes(app);
PostRoutes(app);
FollowRoutes(app);
ReviewRoutes(app);
SaveRoutes(app);
NotificationsRoutes(app);
ExternalRoutes(app);

app.get("/", (req, res) => {
  res.send("Welcome to Momento Social Network API!");
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
