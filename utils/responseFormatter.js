// ============================================================
// API RESPONSE FORMATTER
// ============================================================
// Standardizes API response format across all endpoints

import { mapIdsForFrontend } from "./idMapper.js";

/**
 * Format successful response with documents array
 * @param {array|object} data - Data to format
 * @param {number} total - Total count (optional, for pagination)
 * @returns {object} - Standardized response format
 */
export const formatSuccessResponse = (data, total = null) => {
  // If data is already an array, wrap it
  if (Array.isArray(data)) {
    return {
      documents: mapIdsForFrontend(data),
      ...(total !== null && { total }),
    };
  }
  
  // If data is a single object, wrap it in documents array
  if (data && typeof data === "object") {
    return {
      documents: [mapIdsForFrontend(data)],
      ...(total !== null && { total: 1 }),
    };
  }
  
  // For null or primitive values, return as is
  return data;
};

/**
 * Format error response
 * @param {string} message - Error message
 * @param {string} code - Error code (optional)
 * @param {any} details - Error details (optional)
 * @returns {object} - Standardized error response
 */
export const formatErrorResponse = (message, code = null, details = null) => {
  return {
    error: message,
    ...(code && { code }),
    ...(details && { details }),
  };
};

/**
 * Send standardized success response
 * @param {object} res - Express response object
 * @param {array|object} data - Data to send
 * @param {number} statusCode - HTTP status code (default: 200)
 * @param {number} total - Total count (optional)
 */
export const sendSuccessResponse = (res, data, statusCode = 200, total = null) => {
  res.status(statusCode).json(formatSuccessResponse(data, total));
};

/**
 * Send standardized error response
 * @param {object} res - Express response object
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code (default: 500)
 * @param {string} code - Error code (optional)
 * @param {any} details - Error details (optional)
 */
export const sendErrorResponse = (res, message, statusCode = 500, code = null, details = null) => {
  res.status(statusCode).json(formatErrorResponse(message, code, details));
};

export default {
  formatSuccessResponse,
  formatErrorResponse,
  sendSuccessResponse,
  sendErrorResponse,
};

