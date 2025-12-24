import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import session from "express-session";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";
import UserRoutes from "./Users/routes.js";
import PostRoutes from "./Posts/routes.js";
import SaveRoutes from "./Saves/routes.js";
import FollowRoutes from "./Follows/routes.js";
import ReviewRoutes from "./Reviews/routes.js";
import ExternalRoutes from "./External/routes.js";
import NotificationRoutes from "./Notifications/routes.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { performanceMonitor } from "./middleware/performanceMonitor.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONNECTION_STRING =
  process.env.DATABASE_CONNECTION_STRING || "mongodb://127.0.0.1:27017/momento";

mongoose.connect(CONNECTION_STRING);

const app = express();

// Security headers with Helmet.js
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:", "http:"],
        connectSrc: ["'self'", "https:", "http:"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// Response compression
app.use(compression());

// Performance monitoring (should be early in middleware chain)
if (
  process.env.NODE_ENV === "development" ||
  process.env.ENABLE_PERFORMANCE_MONITORING === "true"
) {
  app.use(performanceMonitor);
}

// Request logging
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev")); // Concise colored output for development
} else if (process.env.LOG_REQUESTS === "true") {
  app.use(morgan("combined")); // Standard Apache combined log format for production
}

// CORS must be applied before rate limiting
// Support multiple origins (development and production)
const allowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(",").map((url) => url.trim())
  : ["http://localhost:3000"];

app.use(
  cors({
    credentials: true,
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      // Check if origin is in allowed list
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        // In development, allow localhost
        if (
          process.env.NODE_ENV === "development" &&
          origin.includes("localhost")
        ) {
          callback(null, true);
        } else {
          callback(new Error("Not allowed by CORS"));
        }
      }
    },
  })
);

// Rate limiting configurations
// Only apply rate limiting in production to avoid issues during development
const isDevelopment =
  process.env.NODE_ENV === "development" ||
  process.env.SERVER_ENV === "development";

if (!isDevelopment) {
  // General API rate limiter - 200 requests per 15 minutes per IP (increased for better UX)
  const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // Limit each IP to 200 requests per windowMs
    message: "Too many requests from this IP, please try again later.",
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  });

  // Strict rate limiter for authentication endpoints - 10 requests per 15 minutes per IP (increased)
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each IP to 10 requests per windowMs
    message: "Too many authentication attempts, please try again later.",
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Don't count successful requests
  });

  // Strict rate limiter for image uploads - 20 requests per hour per IP (increased)
  const uploadLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20, // Limit each IP to 20 uploads per hour
    message: "Too many uploads, please try again later.",
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Apply general rate limiting to all API routes
  app.use("/api", generalLimiter);

  // Apply strict rate limiting to authentication routes
  app.use("/api/users/signin", authLimiter);
  app.use("/api/users/signup", authLimiter);

  // Apply strict rate limiting to upload routes
  app.use("/api/users/upload", uploadLimiter);
  app.use("/api/posts", uploadLimiter);
}

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

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

// 404 handler for undefined routes (must be after all routes)
app.use(notFoundHandler);

// Error handling middleware (must be last)
app.use(errorHandler);

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
