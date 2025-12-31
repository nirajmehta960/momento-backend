// ============================================================
// ERROR MESSAGE CONSTANTS
// ============================================================
// Centralized error messages for consistent error handling

export const ERROR_MESSAGES = {
  // Authentication Errors
  AUTH_REQUIRED: "Authentication required",
  INVALID_CREDENTIALS: "Invalid credentials. Please try again.",
  UNAUTHORIZED: "Unauthorized",
  FORBIDDEN: "Forbidden",
  SESSION_EXPIRED: "Session expired. Please sign in again.",
  
  // User Errors
  USER_NOT_FOUND: "User not found",
  USER_ALREADY_EXISTS: "User already exists",
  USERNAME_TAKEN: "Username already taken",
  EMAIL_REGISTERED: "Email already registered",
  USER_UPDATE_FAILED: "Failed to update user",
  USER_DELETE_FAILED: "Failed to delete user",
  USER_CREATE_FAILED: "Failed to create user",
  USER_FETCH_FAILED: "Failed to fetch user",
  USERS_FETCH_FAILED: "Failed to fetch users",
  PROFILE_FETCH_FAILED: "Failed to fetch profile",
  SIGNUP_FAILED: "Failed to sign up user",
  SIGNIN_FAILED: "Failed to sign in user",
  SIGNOUT_FAILED: "Failed to sign out",
  
  // Post Errors
  POST_NOT_FOUND: "Post not found",
  POST_CREATE_FAILED: "Failed to create post",
  POST_UPDATE_FAILED: "Failed to update post",
  POST_DELETE_FAILED: "Failed to delete post",
  POST_FETCH_FAILED: "Failed to fetch post",
  POSTS_FETCH_FAILED: "Failed to fetch posts",
  POST_SEARCH_FAILED: "Failed to search posts",
  POST_LIKE_FAILED: "Failed to like post",
  
  // Validation Errors
  VALIDATION_ERROR: "Validation Error",
  INVALID_ID_FORMAT: "Invalid ID format",
  REQUIRED_FIELDS_MISSING: "Required fields are missing",
  INVALID_INPUT: "Invalid input",
  FILE_TOO_LARGE: "File too large. Maximum size is 5MB.",
  NO_FILE_UPLOADED: "No file uploaded",
  FILE_UPLOAD_FAILED: "File upload error",
  
  // Follow Errors
  FOLLOW_FAILED: "Failed to follow user",
  UNFOLLOW_FAILED: "Failed to unfollow user",
  FOLLOWERS_FETCH_FAILED: "Failed to fetch followers",
  FOLLOWING_FETCH_FAILED: "Failed to fetch following",
  CANNOT_FOLLOW_SELF: "You cannot follow yourself",
  ALREADY_FOLLOWING: "You are already following this user",
  NOT_FOLLOWING: "You are not following this user",
  
  // Message Errors
  MESSAGE_SEND_FAILED: "Failed to send message",
  MESSAGES_FETCH_FAILED: "Failed to fetch messages",
  CONVERSATION_PARTNERS_FETCH_FAILED: "Failed to fetch conversation partners",
  CANNOT_MESSAGE_USER: "You can only message users you follow or who follow you.",
  RECEIVER_REQUIRED: "Receiver and content required",
  
  // Review Errors
  REVIEW_NOT_FOUND: "Review not found",
  REVIEW_CREATE_FAILED: "Failed to create review",
  REVIEW_UPDATE_FAILED: "Failed to update review",
  REVIEW_DELETE_FAILED: "Failed to delete review",
  REVIEWS_FETCH_FAILED: "Failed to fetch reviews",
  
  // Notification Errors
  NOTIFICATION_NOT_FOUND: "Notification not found",
  NOTIFICATIONS_FETCH_FAILED: "Failed to fetch notifications",
  NOTIFICATION_UPDATE_FAILED: "Failed to update notification",
  NOTIFICATION_DELETE_FAILED: "Failed to delete notification",
  
  // Save Errors
  SAVE_FAILED: "Failed to save post",
  UNSAVE_FAILED: "Failed to unsave post",
  SAVED_POSTS_FETCH_FAILED: "Failed to fetch saved posts",
  
  // General Errors
  INTERNAL_SERVER_ERROR: "Internal Server Error",
  ROUTE_NOT_FOUND: "Route not found",
  OPERATION_FAILED: "Operation failed",
  RESOURCE_NOT_FOUND: "Resource not found",
  DUPLICATE_ENTRY: "Duplicate Entry",
  
  // AI Errors
  AI_SERVICE_UNAVAILABLE: "AI service unavailable",
  AI_MESSAGE_FAILED: "Failed to send AI message",
  AI_MESSAGES_FETCH_FAILED: "Failed to fetch AI messages",
  AI_FEEDBACK_UPDATE_FAILED: "Failed to update AI feedback",
  AI_MESSAGES_CLEAR_FAILED: "Failed to clear AI messages",
};

export const ERROR_CODES = {
  // Authentication
  AUTH_REQUIRED: "AUTH_REQUIRED",
  INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  
  // Validation
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INVALID_ID: "INVALID_ID",
  MISSING_FIELDS: "MISSING_FIELDS",
  
  // Not Found
  USER_NOT_FOUND: "USER_NOT_FOUND",
  POST_NOT_FOUND: "POST_NOT_FOUND",
  RESOURCE_NOT_FOUND: "RESOURCE_NOT_FOUND",
  
  // Conflict
  DUPLICATE_ENTRY: "DUPLICATE_ENTRY",
  ALREADY_EXISTS: "ALREADY_EXISTS",
  
  // Server
  INTERNAL_ERROR: "INTERNAL_ERROR",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
};

/**
 * Create standardized error response
 * @param {string} message - Error message
 * @param {string} code - Error code
 * @param {any} details - Additional error details
 * @returns {object} - Standardized error object
 */
export const createErrorResponse = (message, code = null, details = null) => {
  return {
    error: message,
    ...(code && { code }),
    ...(details && { details }),
  };
};

export default {
  ERROR_MESSAGES,
  ERROR_CODES,
  createErrorResponse,
};

