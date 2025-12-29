import model from "./model.js";

export default function FollowsDao() {
  // Create follow relationship. Uses composite key to prevent duplicates.
  const followUser = async (followerId, followingId) => {
    try {
      if (followerId === followingId) {
        throw new Error("Cannot follow yourself");
      }

      const existingFollow = await model.findOne({
        follower: followerId,
        following: followingId,
      });

      if (existingFollow) {
        return existingFollow;
      }

      const newFollow = {
        _id: `${followerId}-${followingId}`, // composite key
        follower: followerId,
        following: followingId,
      };
      return await model.create(newFollow);
    } catch (error) {
      throw error;
    }
  };

  // Remove follow relationship
  const unfollowUser = async (followerId, followingId) => {
    try {
      return await model.deleteOne({
        follower: followerId,
        following: followingId,
      });
    } catch (error) {
      throw error;
    }
  };

  // Get all users who follow the given user
  const findFollowers = async (userId) => {
    try {
      const follows = await model
        .find({ following: userId })
        .populate("follower");

      return follows
        .map((follow) => follow.follower)
        .filter((user) => user !== null);
    } catch (error) {
      throw error;
    }
  };

  // Get all users that the given user is following
  const findFollowing = async (userId) => {
    try {
      const follows = await model
        .find({ follower: userId })
        .populate("following");

      return follows
        .map((follow) => follow.following)
        .filter((user) => user !== null);
    } catch (error) {
      throw error;
    }
  };

  // Check if followerId is following followingId
  const checkIfFollowing = async (followerId, followingId) => {
    try {
      const follow = await model.findOne({
        follower: followerId,
        following: followingId,
      });
      return follow !== null;
    } catch (error) {
      throw error;
    }
  };

  return {
    followUser,
    unfollowUser,
    findFollowers,
    findFollowing,
    checkIfFollowing,
  };
}
