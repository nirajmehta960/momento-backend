// ============================================================
// ID FIELD MAPPING UTILITY
// ============================================================
// Standardizes ID field usage across the application
// Backend uses _id (MongoDB), frontend expects $id and id for compatibility

/**
 * Extract ID from an object (handles _id, id, $id)
 * @param {object} obj - Object with potential ID fields
 * @returns {string|null} - Extracted ID or null
 */
export const extractId = (obj) => {
  if (!obj) return null;
  return obj._id || obj.id || obj.$id || null;
};

/**
 * Normalize ID field in an object (ensures _id is present)
 * @param {object} obj - Object to normalize
 * @returns {object} - Object with normalized _id
 */
export const normalizeId = (obj) => {
  if (!obj) return obj;
  const id = extractId(obj);
  if (id && !obj._id) {
    obj._id = id;
  }
  return obj;
};

/**
 * Map object to include all ID variants for frontend compatibility
 * @param {object} obj - Object with _id
 * @returns {object} - Object with _id, id, and $id
 */
export const mapIdForFrontend = (obj) => {
  if (!obj) return obj;
  
  // Handle nested objects (like creator)
  const mappedObj = { ...obj };
  
  // Map main object ID
  const id = extractId(obj);
  if (id) {
    mappedObj._id = id;
    mappedObj.id = id;
    mappedObj.$id = id;
  }
  
  // Recursively map nested objects with IDs (like creator)
  if (obj.creator && typeof obj.creator === 'object') {
    const creatorId = extractId(obj.creator);
    if (creatorId) {
      mappedObj.creator = {
        ...obj.creator,
        _id: creatorId,
        id: creatorId,
        $id: creatorId,
      };
    }
  }
  
  return mappedObj;
};

/**
 * Map array of objects to include all ID variants
 * @param {array} arr - Array of objects with _id
 * @returns {array} - Array of objects with _id, id, and $id
 */
export const mapIdsForFrontend = (arr) => {
  if (!Array.isArray(arr)) return arr;
  return arr.map(mapIdForFrontend);
};

/**
 * Extract ID from request params (handles userId, postId, etc.)
 * @param {object} params - Request params object
 * @returns {string|null} - Extracted ID or null
 */
export const extractIdFromParams = (params) => {
  if (!params) return null;
  return (
    params.userId ||
    params.postId ||
    params.id ||
    params.reviewId ||
    params.notificationId ||
    null
  );
};

export default {
  extractId,
  normalizeId,
  mapIdForFrontend,
  mapIdsForFrontend,
  extractIdFromParams,
};
