// Centralized error handling middleware

export const errorHandler = (err, req, res, next) => {
  // Log error for debugging
  console.error("Error:", {
    message: err.message,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
  });

  // Default error
  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || "Internal Server Error";
  let details = null;

  // Mongoose validation error
  if (err.name === "ValidationError") {
    statusCode = 400;
    message = "Validation Error";
    details = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    statusCode = 409;
    message = "Duplicate Entry";
    const field = Object.keys(err.keyPattern)[0];
    details = {
      field,
      message: `${field} already exists`,
    };
  }

  // Mongoose cast error (invalid ID format)
  if (err.name === "CastError") {
    statusCode = 400;
    message = "Invalid ID format";
    details = {
      field: err.path,
      message: "The provided ID is not valid",
    };
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid token";
  }

  if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Token expired";
  }

  // Rate limit error
  if (err.status === 429) {
    statusCode = 429;
    message = err.message || "Too many requests, please try again later";
  }

  // Don't leak error details in production
  if (process.env.NODE_ENV === "production" && statusCode === 500) {
    message = "Internal Server Error";
    details = null;
  }

  // Send error response
  res.status(statusCode).json({
    error: message,
    ...(details && { details }),
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

// 404 handler for undefined routes
export const notFoundHandler = (req, res, next) => {
  res.status(404).json({
    error: "Route not found",
    path: req.path,
    method: req.method,
  });
};

// Async error wrapper to catch errors in async route handlers
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

