import model from "./model.js";
import { v4 as uuidv4 } from "uuid";

export default function ReviewsDao() {
  // Create a new review with UUID (polymorphic: can be for post or external content)
  const createReview = async (review) => {
    try {
      const newReview = { ...review, _id: uuidv4() };
      return await model.create(newReview);
    } catch (error) {
      throw error;
    }
  };

  // Get all reviews for a specific post (populated with user, sorted by newest)
  const findReviewsByPost = async (postId) => {
    try {
      return await model
        .find({ post: postId })
        .populate("user", "-imageData")
        .sort({ createdAt: -1 });
    } catch (error) {
      throw error;
    }
  };

  // Get all reviews for external content (polymorphic relationship)
  const findReviewsByExternalContent = async (externalContentId) => {
    try {
      return await model
        .find({ externalContentId: externalContentId })
        .populate("user", "-imageData")
        .sort({ createdAt: -1 });
    } catch (error) {
      throw error;
    }
  };

  // Get review by ID with populated user
  const findReviewById = async (reviewId) => {
    try {
      return await model.findById(reviewId).populate("user", "-imageData");
    } catch (error) {
      throw error;
    }
  };

  // Update review by ID (auto-updates updatedAt timestamp)
  const updateReview = async (reviewId, reviewUpdates) => {
    try {
      const updatedReview = { ...reviewUpdates, updatedAt: new Date() };
      return await model.updateOne({ _id: reviewId }, { $set: updatedReview });
    } catch (error) {
      throw error;
    }
  };

  // Delete review by ID
  const deleteReview = async (reviewId) => {
    try {
      return await model.findByIdAndDelete(reviewId);
    } catch (error) {
      throw error;
    }
  };

  return {
    createReview,
    findReviewsByPost,
    findReviewsByExternalContent,
    findReviewById,
    updateReview,
    deleteReview,
  };
}
