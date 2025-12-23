import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import session from "express-session";
import path from "path";
import { fileURLToPath } from "url";
import UserRoutes from "./Users/routes.js";
import PostRoutes from "./Posts/routes.js";
import SaveRoutes from "./Saves/routes.js";
import FollowRoutes from "./Follows/routes.js";
import ReviewRoutes from "./Reviews/routes.js";
import ExternalRoutes from "./External/routes.js";
import NotificationRoutes from "./Notifications/routes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONNECTION_STRING =
  process.env.DATABASE_CONNECTION_STRING || "mongodb://127.0.0.1:27017/momento";
mongoose.connect(CONNECTION_STRING);

const app = express();

app.use(
  cors({
    credentials: true,
    origin: process.env.CLIENT_URL || "http://localhost:3000",
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

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

UserRoutes(app);
PostRoutes(app);
SaveRoutes(app);
FollowRoutes(app);
ReviewRoutes(app);
ExternalRoutes(app);
NotificationRoutes(app);

app.get("/", (req, res) => {
  res.send("Welcome to Momento Social Network API!");
});

const port = process.env.PORT || 4000;
app.listen(port);
