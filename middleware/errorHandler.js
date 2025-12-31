// Centralized error handling middleware

export const errorHandler = (err, req, res, next) => {
  // Log error details only in development
  if (process.env.NODE_ENV === "development") {
    // In production, use proper logging service instead
    const errorDetails = {
      message: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
      timestamp: new Date().toISOString(),
    };
    // Error details available for debugging in development
    // In production, integrate with logging service (Winston, Morgan, etc.)
  }

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
