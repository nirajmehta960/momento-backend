import ReviewsDao from "./dao.js";
import NotificationsDao from "../notifications/dao.js";
import PostsDao from "../posts/dao.js";
import {
  validateCreateReview,
  validateUpdateReview,
  validateReviewId,
  validatePostId,
  validatePagination,
} from "../middleware/validation.js";

export default function ReviewRoutes(app, io) {
  const dao = ReviewsDao();
  const notificationsDao = NotificationsDao();
  const postsDao = PostsDao();

  // POST /api/reviews - Create a review (for post or external content)
  // Body: { postId?, externalContentId?, review, rating? }
  // Auth: Required
  const createReview = async (req, res) => {
    try {
      const currentUser = req.session["currentUser"];
      if (!currentUser) {
        res.status(401).json({ message: "You must be logged in" });
        return;
      }

      const { postId, externalContentId, review, comment, rating } = req.body;

      // Accept both 'review' and 'comment' for compatibility
      const reviewText = review || comment;

      if (!reviewText || reviewText.trim() === "") {
        res.status(400).json({ error: "Review text is required" });
        return;
      }

      if (!postId && !externalContentId) {
        res
          .status(400)
          .json({ error: "Either postId or externalContentId is required" });
        return;
      }

      const reviewData = {
        user: currentUser._id,
        post: postId || null,
        externalContentId: externalContentId || null,
        review: reviewText.trim(),
        rating: rating || null,
      };

      const newReview = await dao.createReview(reviewData);
      const populatedReview = await dao.findReviewById(newReview._id);

      if (postId) {
        try {
          const post = await postsDao.findPostById(postId);
          if (post && post.creator && post.creator._id !== currentUser._id) {
            const notification = await notificationsDao.createNotification({
              user: post.creator._id,
              actor: currentUser._id,
              type: "REVIEW",
              post: postId,
              review: newReview._id,
            });

            // Populate notification before emitting
            const populatedNotification =
              await notificationsDao.findNotificationById(notification._id);

            // Emit real-time notification to the post creator
            if (io && populatedNotification) {
              io.to(`user-${post.creator._id}`).emit(
                "new-notification",
                populatedNotification
              );
              io.to(`user-${post.creator._id}`).emit(
                "notification-count-updated"
              );
            }
          }

          // Emit real-time review update to all users viewing this post
          if (io) {
            io.emit("new-review", {
              postId,
              review: populatedReview,
            });
          }
        } catch (notifError) {
          // Non-blocking: notification/real-time update failure shouldn't break review creation
        }
      }

      res.json(populatedReview);
    } catch (error) {
      res.status(500).json({ error: "Failed to create review" });
    }
  };
  app.post("/api/reviews", validateCreateReview, createReview);

  // GET /api/reviews/post/:postId - Get all reviews for a post
  // Query params: ?limit=10&skip=0
  // Auth: Not required
  const getReviewsByPost = async (req, res) => {
    try {
      const { postId } = req.params;
      if (!postId) {
        res.status(400).json({ error: "Post ID is required" });
        return;
      }

      const { limit, skip } = req.query;
      const limitNum = limit ? parseInt(limit) : 20; // Default limit of 20
      const skipNum = skip ? parseInt(skip) : 0;

      const reviews = await dao.findReviewsByPost(postId, limitNum, skipNum);
      res.json({ documents: reviews });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch reviews" });
    }
  };
  app.get(
    "/api/reviews/post/:postId",
    validatePostId,
    validatePagination,
    getReviewsByPost
  );

  // GET /api/reviews/external/:externalContentId - Get reviews for external content
  // Query params: ?limit=10&skip=0
  // Auth: Not required
  const getReviewsByExternalContent = async (req, res) => {
    try {
      const { externalContentId } = req.params;
      if (!externalContentId) {
        res.status(400).json({ error: "External content ID is required" });
        return;
      }

      const { limit, skip } = req.query;
      const limitNum = limit ? parseInt(limit) : 20; // Default limit of 20
      const skipNum = skip ? parseInt(skip) : 0;

      const reviews = await dao.findReviewsByExternalContent(
        externalContentId,
        limitNum,
        skipNum
      );
      res.json({ documents: reviews });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch reviews" });
    }
  };
  app.get(
    "/api/reviews/external/:externalContentId",
    validatePagination,
    getReviewsByExternalContent
  );

  // PUT /api/reviews/:reviewId - Update review (only own reviews)
  // Body: { review?, rating? }
  // Auth: Required (must be review owner)
  const updateReview = async (req, res) => {
    try {
      const { reviewId } = req.params;
      const currentUser = req.session["currentUser"];
      if (!currentUser) {
        res.status(401).json({ message: "You must be logged in" });
        return;
      }

      const existingReview = await dao.findReviewById(reviewId);
      if (!existingReview) {
        res.status(404).json({ message: "Review not found" });
        return;
      }

      const reviewUserId = existingReview.user._id || existingReview.user;
      if (reviewUserId !== currentUser._id) {
        res
          .status(403)
          .json({ message: "You can only update your own reviews" });
        return;
      }

      const { review, comment, rating } = req.body;
      const updateData = {};
      // Accept both 'review' and 'comment' for compatibility
      const reviewText = review || comment;
      if (reviewText !== undefined) {
        if (reviewText.trim() === "") {
          res.status(400).json({ error: "Review text cannot be empty" });
          return;
        }
        updateData.review = reviewText.trim();
      }
      if (rating !== undefined) {
        updateData.rating = rating;
      }

      await dao.updateReview(reviewId, updateData);
      const updatedReview = await dao.findReviewById(reviewId);
      res.json(updatedReview);
    } catch (error) {
      res.status(500).json({ error: "Failed to update review" });
    }
  };
  app.put("/api/reviews/:reviewId", validateUpdateReview, updateReview);

  // DELETE /api/reviews/:reviewId - Delete review (only own reviews)
  // Auth: Required (must be review owner)
  const deleteReview = async (req, res) => {
    try {
      const { reviewId } = req.params;
      const currentUser = req.session["currentUser"];
      if (!currentUser) {
        res.status(401).json({ message: "You must be logged in" });
        return;
      }

      const existingReview = await dao.findReviewById(reviewId);
      if (!existingReview) {
        res.status(404).json({ message: "Review not found" });
        return;
      }

      const reviewUserId = existingReview.user._id || existingReview.user;
      if (reviewUserId !== currentUser._id) {
        res
          .status(403)
          .json({ message: "You can only delete your own reviews" });
        return;
      }

      await dao.deleteReview(reviewId);
      res.json({ message: "Review deleted successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete review" });
    }
  };
  app.delete("/api/reviews/:reviewId", validateReviewId, deleteReview);

  return app;
}
