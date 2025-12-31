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
        .populate("follower")
        .lean(); // Return plain JavaScript objects

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
        .populate("following")
        .lean(); // Return plain JavaScript objects

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

  // Get users who can be messaged (mutual follow relationship)
  // Returns users who either follow the current user OR are followed by the current user
  const findMessagableUsers = async (userId) => {
    try {
      // Get users that the current user is following
      const following = await model
        .find({ follower: userId })
        .populate("following")
        .select("following")
        .lean(); // Return plain JavaScript objects

      // Get users who follow the current user
      const followers = await model
        .find({ following: userId })
        .populate("follower")
        .select("follower")
        .lean(); // Return plain JavaScript objects

      // Combine both sets and remove duplicates
      const messagableUserIds = new Set();
      const messagableUsers = [];

      // Add users that current user is following
      following.forEach((follow) => {
        if (follow.following && !messagableUserIds.has(follow.following._id)) {
          messagableUserIds.add(follow.following._id);
          messagableUsers.push(follow.following);
        }
      });

      // Add users who follow the current user
      followers.forEach((follow) => {
        if (follow.follower && !messagableUserIds.has(follow.follower._id)) {
          messagableUserIds.add(follow.follower._id);
          messagableUsers.push(follow.follower);
        }
      });

      return messagableUsers;
    } catch (error) {
      throw error;
    }
  };

  // Check if two users can message each other (mutual follow relationship)
  const canMessage = async (userId1, userId2) => {
    try {
      // Check if userId1 follows userId2 OR userId2 follows userId1
      const follow1 = await model.findOne({
        follower: userId1,
        following: userId2,
      });
      const follow2 = await model.findOne({
        follower: userId2,
        following: userId1,
      });
      return follow1 !== null || follow2 !== null;
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
    findMessagableUsers,
    canMessage,
  };
}
