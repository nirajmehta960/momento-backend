// ============================================================
// CACHE MIDDLEWARE
// ============================================================
// Middleware to cache frequently accessed data

import cache, { getCacheKey } from "../utils/cache.js";

/**
 * Cache middleware factory
 * @param {object} options - Cache options
 * @param {string} options.prefix - Cache key prefix (e.g., 'user', 'post')
 * @param {number} options.ttl - Time to live in milliseconds (default: 5 minutes)
 * @param {function} options.keyGenerator - Function to generate cache key from request
 * @param {boolean} options.skipCache - Function to determine if cache should be skipped
 * @returns {function} - Express middleware function
 */
export const cacheMiddleware = (options = {}) => {
  const {
    prefix = "default",
    ttl = 5 * 60 * 1000, // 5 minutes
    keyGenerator = (req) => {
      // Default: use route + query params as key
      const params = req.params || {};
      const query = req.query || {};
      const id = params.id || params.userId || params.postId || "list";
      return getCacheKey(prefix, `${id}:${JSON.stringify(query)}`);
    },
    skipCache = (req) => {
      // Skip cache for POST, PUT, DELETE requests
      return ["POST", "PUT", "DELETE", "PATCH"].includes(req.method);
    },
  } = options;

  return async (req, res, next) => {
    // Skip caching for non-GET requests or if skipCache returns true
    if (req.method !== "GET" || skipCache(req)) {
      return next();
    }

    try {
      const cacheKey = keyGenerator(req);
      const cachedData = cache.get(cacheKey);

      if (cachedData !== null) {
        // Cache hit - return cached data
        return res.json(cachedData);
      }

      // Cache miss - store original json method and call next
      const originalJson = res.json.bind(res);
      res.json = function (data) {
        // Cache the response data
        cache.set(cacheKey, data, ttl);
        // Call original json method
        return originalJson(data);
      };

      next();
    } catch (error) {
      // If caching fails, continue without cache
      next();
    }
  };
};

/**
 * Invalidate cache for a specific key pattern
 * @param {string} prefix - Cache key prefix
 * @param {string} id - Identifier (optional, if not provided, invalidates all with prefix)
 */
export const invalidateCache = (prefix, id = null) => {
  if (id) {
    const key = getCacheKey(prefix, id);
    cache.del(key);
  } else {
    cache.delPattern(`${prefix}:*`);
  }
};

export default {
  cacheMiddleware,
  invalidateCache,
};

