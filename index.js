import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import session from "express-session";
import compression from "compression";
import path from "path";
import { fileURLToPath } from "url";
import { createServer } from "http";
import { Server } from "socket.io";
import UserRoutes from "./users/routes.js";
import PostRoutes from "./posts/routes.js";
import SaveRoutes from "./saves/routes.js";
import FollowRoutes from "./follows/routes.js";
import ReviewRoutes from "./reviews/routes.js";
import ExternalRoutes from "./external/routes.js";
import NotificationRoutes from "./notifications/routes.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import ConversationRoutes from "./conversations/routes.js";
import ConversationsDao from "./conversations/dao.js";
import MomentoAIRoutes from "./momentoai/routes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONNECTION_STRING =
  process.env.DATABASE_CONNECTION_STRING || "mongodb://127.0.0.1:27017/momento";

mongoose.connect(CONNECTION_STRING);

const app = express();

// Response compression (performance improvement)
app.use(compression());

// CORS configuration
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

UserRoutes(app);
PostRoutes(app);
SaveRoutes(app);
FollowRoutes(app);
ReviewRoutes(app);
ExternalRoutes(app);
NotificationRoutes(app);
MomentoAIRoutes(app);

// Initialize Socket.io before setting up conversation routes that need it
const httpServer = createServer(app);

// Initialize Socket.io
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
    methods: ["GET", "POST"],
  },
});

// Now pass io to ConversationRoutes
ConversationRoutes(app, io);

app.get("/", (req, res) => {
  res.send("Welcome to Momento Social Network API!");
});

// 404 handler for undefined routes (must be after all routes)
app.use(notFoundHandler);

// Error handling middleware (must be last)
app.use(errorHandler);

// Socket.io middleware for session authentication
io.use((socket, next) => {
  next();
});

// Store user socket connections
const userSockets = new Map();

// Socket.io connection handling
io.on("connection", (socket) => {
  // Join user room when authenticated
  socket.on("authenticate", async (userId) => {
    if (userId) {
      socket.join(`user-${userId}`);
      userSockets.set(userId, socket.id);
    }
  });

  // Handle sending messages
  socket.on("send-message", async (data) => {
    try {
      const { senderId, receiverId, content } = data;

      if (!senderId || !receiverId || !content) {
        socket.emit("error", { message: "Missing required fields" });
        return;
      }

      const dao = ConversationsDao();
      const message = await dao.createMessage({
        senderId,
        receiverId,
        content: content.trim(),
      });

      // Emit to receiver if they're online
      io.to(`user-${receiverId}`).emit("new-message", message);

      // Also emit back to sender for confirmation
      socket.emit("message-sent", message);

      // Notify conversation partners list update
      io.to(`user-${senderId}`).emit("conversation-updated");
      io.to(`user-${receiverId}`).emit("conversation-updated");
    } catch (error) {
      console.error("Error sending message:", error);
      socket.emit("error", { message: "Failed to send message" });
    }
  });

  // Handle typing indicators
  socket.on("typing", (data) => {
    const { receiverId, senderId, isTyping } = data;
    if (receiverId && senderId) {
      socket.to(`user-${receiverId}`).emit("user-typing", {
        userId: senderId,
        isTyping,
      });
    }
  });

  // Handle marking messages as read
  socket.on("mark-read", async (data) => {
    try {
      const { userId, partnerId } = data;
      if (!userId || !partnerId) return;

      const dao = ConversationsDao();
      await dao.markMessagesAsRead(userId, partnerId);

      // Notify the partner that messages were read
      io.to(`user-${partnerId}`).emit("messages-read", {
        readBy: userId,
      });
    } catch (error) {
      console.error("Error marking messages as read:", error);
    }
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    // Remove from userSockets map
    for (const [userId, socketId] of userSockets.entries()) {
      if (socketId === socket.id) {
        userSockets.delete(userId);
        break;
      }
    }
  });
});

// Export io for use in routes if needed
export { io };

const port = process.env.PORT || 4000;
httpServer.listen(port);
