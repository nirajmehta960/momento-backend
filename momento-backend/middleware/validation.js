import { body, param, query, validationResult } from "express-validator";

// Middleware to handle validation errors
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: "Validation failed",
      details: errors.array().map((err) => ({
        field: err.path || err.param,
        message: err.msg,
      })),
    });
  }
  next();
};

// User validation rules
export const validateSignup = [
  body("username")
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage("Username must be between 3 and 30 characters")
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage("Username can only contain letters, numbers, and underscores"),
  body("email").trim().isEmail().withMessage("Invalid email address"),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      "Password must contain at least one uppercase letter, one lowercase letter, and one number"
    ),
  body("name")
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("Name must be between 1 and 100 characters"),
  body("bio")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Bio must be less than 500 characters"),
  body("role")
    .optional()
    .isIn(["USER", "ADMIN"])
    .withMessage("Role must be either USER or ADMIN"),
  handleValidationErrors,
];

export const validateSignin = [
  body("email").trim().notEmpty().withMessage("Email/Username is required"),
  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 1 })
    .withMessage("Password cannot be empty"),
  handleValidationErrors,
];

export const validateUpdateUser = [
  param("userId").trim().notEmpty().withMessage("User ID is required"),
  body("name")
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("Name must be between 1 and 100 characters"),
  body("username")
    .optional()
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage("Username must be between 3 and 30 characters")
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage("Username can only contain letters, numbers, and underscores"),
  body("email")
    .optional()
    .trim()
    .isEmail()
    .withMessage("Invalid email address"),
  body("bio")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Bio must be less than 500 characters"),
  body("password")
    .optional()
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      "Password must contain at least one uppercase letter, one lowercase letter, and one number"
    ),
  handleValidationErrors,
];

// Post validation rules
export const validateCreatePost = [
  body("caption")
    .trim()
    .isLength({ min: 1, max: 2000 })
    .withMessage("Caption must be between 1 and 2000 characters"),
  body("location")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Location must be less than 100 characters"),
  body("tags")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Tags must be less than 500 characters"),
  handleValidationErrors,
];

export const validateUpdatePost = [
  param("postId").trim().notEmpty().withMessage("Post ID is required"),
  body("caption")
    .optional()
    .trim()
    .isLength({ min: 1, max: 2000 })
    .withMessage("Caption must be between 1 and 2000 characters"),
  body("location")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Location must be less than 100 characters"),
  body("tags")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Tags must be less than 500 characters"),
  handleValidationErrors,
];

// Review validation rules
export const validateCreateReview = [
  body("postId")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Post ID cannot be empty if provided"),
  body("externalContentId")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("External content ID cannot be empty if provided"),
  body("review")
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage("Review must be less than 2000 characters"),
  body("comment")
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage("Comment must be less than 2000 characters"),
  body("rating")
    .isInt({ min: 1, max: 5 })
    .withMessage("Rating must be between 1 and 5"),
  body().custom((value) => {
    if (!value.postId && !value.externalContentId) {
      throw new Error("Either postId or externalContentId must be provided");
    }
    if (value.postId && value.externalContentId) {
      throw new Error("Cannot provide both postId and externalContentId");
    }
    if (!value.review && !value.comment) {
      throw new Error("Either review or comment must be provided");
    }
    return true;
  }),
  handleValidationErrors,
];

export const validateUpdateReview = [
  param("reviewId").trim().notEmpty().withMessage("Review ID is required"),
  body("review")
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage("Review must be less than 2000 characters"),
  body("comment")
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage("Comment must be less than 2000 characters"),
  body("rating")
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage("Rating must be between 1 and 5"),
  handleValidationErrors,
];

// Query parameter validation
export const validatePagination = [
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),
  query("skip")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Skip must be a non-negative integer"),
  query("sortBy")
    .optional()
    .isIn(["latest", "oldest", "mostLiked", "mostReviewed"])
    .withMessage(
      "sortBy must be one of: latest, oldest, mostLiked, mostReviewed"
    ),
  handleValidationErrors,
];

export const validateSearch = [
  query("searchTerm")
    .trim()
    .notEmpty()
    .withMessage("Search term is required")
    .isLength({ min: 1, max: 100 })
    .withMessage("Search term must be between 1 and 100 characters"),
  handleValidationErrors,
];

// ID parameter validation
export const validateUserId = [
  param("userId").trim().notEmpty().withMessage("User ID is required"),
  handleValidationErrors,
];

export const validatePostId = [
  param("postId").trim().notEmpty().withMessage("Post ID is required"),
  handleValidationErrors,
];

export const validateReviewId = [
  param("reviewId").trim().notEmpty().withMessage("Review ID is required"),
  handleValidationErrors,
];

// Save validation rules
export const validateSavePost = [
  body("postId").trim().notEmpty().withMessage("Post ID is required"),
  handleValidationErrors,
];

export const validateUnsavePost = [
  body("postId").trim().notEmpty().withMessage("Post ID is required"),
  handleValidationErrors,
];

// Follow validation rules
export const validateFollowUser = [
  body("followingId")
    .trim()
    .notEmpty()
    .withMessage("Following user ID is required"),
  handleValidationErrors,
];

export const validateFollowingId = [
  param("followingId")
    .trim()
    .notEmpty()
    .withMessage("Following user ID is required"),
  handleValidationErrors,
];

// Notification validation rules
export const validateNotificationId = [
  param("notificationId")
    .trim()
    .notEmpty()
    .withMessage("Notification ID is required"),
  handleValidationErrors,
];

// External content validation rules
export const validateExternalId = [
  param("id").trim().notEmpty().withMessage("External content ID is required"),
  handleValidationErrors,
];

export const validateExternalSearch = [
  query("q")
    .trim()
    .notEmpty()
    .withMessage("Search query (q) is required")
    .isLength({ min: 1, max: 200 })
    .withMessage("Search query must be between 1 and 200 characters"),
  handleValidationErrors,
];
