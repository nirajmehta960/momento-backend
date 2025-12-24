// Performance monitoring middleware
// Logs response times and helps identify slow endpoints

export const performanceMonitor = (req, res, next) => {
  const startTime = Date.now();
  const startMemory = process.memoryUsage().heapUsed;

  // Capture the original end function
  const originalEnd = res.end;

  // Override the end function to measure performance
  res.end = function (chunk, encoding) {
    const endTime = Date.now();
    const endMemory = process.memoryUsage().heapUsed;
    const responseTime = endTime - startTime;
    const memoryUsed = (endMemory - startMemory) / 1024 / 1024; // MB

    // Log slow requests (> 500ms) or in development
    if (process.env.NODE_ENV === "development" || responseTime > 500) {
      console.log(
        `[Performance] ${req.method} ${
          req.path
        } - ${responseTime}ms - ${memoryUsed.toFixed(2)}MB - Status: ${
          res.statusCode
        }`
      );
    }

    // Add performance headers in development
    if (process.env.NODE_ENV === "development") {
      res.setHeader("X-Response-Time", `${responseTime}ms`);
      res.setHeader("X-Memory-Used", `${memoryUsed.toFixed(2)}MB`);
    }

    // Call the original end function
    originalEnd.call(this, chunk, encoding);
  };

  next();
};

// Database query performance monitor
export const logSlowQueries = (queryName, startTime, params = {}) => {
  const duration = Date.now() - startTime;
  if (duration > 100 || process.env.NODE_ENV === "development") {
    console.log(
      `[DB Query] ${queryName} - ${duration}ms`,
      Object.keys(params).length > 0
        ? `- Params: ${JSON.stringify(params)}`
        : ""
    );
  }
};
