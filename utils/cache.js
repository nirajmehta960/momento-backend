// ============================================================
// CACHE UTILITY
// ============================================================
// In-memory cache implementation with TTL (Time To Live)
// Can be easily upgraded to Redis by replacing this implementation

// Cache configuration
const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds
const MAX_CACHE_SIZE = 1000; // Maximum number of cached items

// In-memory cache store
const cache = new Map();

// Cache entry structure: { data, expiresAt, createdAt }

/**
 * Generate a cache key from a prefix and identifier
 * @param {string} prefix - Cache key prefix (e.g., 'user', 'post')
 * @param {string} id - Identifier (e.g., userId, postId)
 * @returns {string} - Cache key
 */
export const getCacheKey = (prefix, id) => {
  return `${prefix}:${id}`;
};

/**
 * Get cached data by key
 * @param {string} key - Cache key
 * @returns {any|null} - Cached data or null if not found/expired
 */
export const get = (key) => {
  const entry = cache.get(key);
  
  if (!entry) {
    return null;
  }

  // Check if entry has expired
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }

  return entry.data;
};

/**
 * Set data in cache with optional TTL
 * @param {string} key - Cache key
 * @param {any} data - Data to cache
 * @param {number} ttl - Time to live in milliseconds (default: 5 minutes)
 * @returns {boolean} - True if set successfully
 */
export const set = (key, data, ttl = DEFAULT_TTL) => {
  // Prevent cache from growing too large
  if (cache.size >= MAX_CACHE_SIZE) {
    // Remove oldest entries (simple LRU-like eviction)
    const entries = Array.from(cache.entries());
    entries.sort((a, b) => a[1].createdAt - b[1].createdAt);
    
    // Remove 10% of oldest entries
    const toRemove = Math.floor(MAX_CACHE_SIZE * 0.1);
    for (let i = 0; i < toRemove; i++) {
      cache.delete(entries[i][0]);
    }
  }

  const expiresAt = Date.now() + ttl;
  cache.set(key, {
    data,
    expiresAt,
    createdAt: Date.now(),
  });

  return true;
};

/**
 * Delete a specific cache entry
 * @param {string} key - Cache key
 * @returns {boolean} - True if deleted, false if not found
 */
export const del = (key) => {
  return cache.delete(key);
};

/**
 * Delete all cache entries matching a pattern
 * @param {string} pattern - Pattern to match (e.g., 'user:*')
 * @returns {number} - Number of entries deleted
 */
export const delPattern = (pattern) => {
  let deleted = 0;
  const prefix = pattern.replace('*', '');
  
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
      deleted++;
    }
  }
  
  return deleted;
};

/**
 * Clear all cache entries
 * @returns {number} - Number of entries cleared
 */
export const clear = () => {
  const size = cache.size;
  cache.clear();
  return size;
};

/**
 * Get cache statistics
 * @returns {object} - Cache statistics
 */
export const getStats = () => {
  const now = Date.now();
  let expired = 0;
  let active = 0;

  for (const entry of cache.values()) {
    if (now > entry.expiresAt) {
      expired++;
    } else {
      active++;
    }
  }

  return {
    total: cache.size,
    active,
    expired,
    maxSize: MAX_CACHE_SIZE,
  };
};

/**
 * Clean up expired cache entries
 * @returns {number} - Number of expired entries removed
 */
export const cleanup = () => {
  const now = Date.now();
  let removed = 0;

  for (const [key, entry] of cache.entries()) {
    if (now > entry.expiresAt) {
      cache.delete(key);
      removed++;
    }
  }

  return removed;
};

// Clean up expired entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanup, 5 * 60 * 1000);
}

export default {
  get,
  set,
  del,
  delPattern,
  clear,
  getStats,
  cleanup,
  getCacheKey,
};

