import User from "../models/UserModel.js";

export const blockUser = async (request, response) => {
  try {
    const { userId } = request;
    const { blockedUserId } = request.body;

    if (!blockedUserId) {
      return response
        .status(400)
        .json({ error: "Blocked user ID is required" });
    }

    if (userId === blockedUserId) {
      return response.status(400).json({ error: "Cannot block yourself" });
    }

    const user = await User.findById(userId);
    const blockedUser = await User.findById(blockedUserId);

    if (!user || !blockedUser) {
      return response.status(404).json({ error: "User not found" });
    }

    if (!user.blockedUsers.includes(blockedUserId)) {
      user.blockedUsers.push(blockedUserId);
    }

    const blockedUserEmail = blockedUser.email;
    const userEmail = user.email;

    user.friendRequests = (user.friendRequests || []).filter(
      (email) => email !== blockedUserEmail
    );
    blockedUser.friendRequests = (blockedUser.friendRequests || []).filter(
      (email) => email !== userEmail
    );

    await Promise.all([user.save(), blockedUser.save()]);

    return response.status(200).json({
      message: "User blocked successfully",
      blockedUserId,
    });
  } catch (error) {
    console.error("Block user error:", error);
    return response.status(500).json({ error: error.message });
  }
};

export const unblockUser = async (request, response) => {
  try {
    const { userId } = request;
    const { blockedUserId } = request.body;

    if (!blockedUserId) {
      return response
        .status(400)
        .json({ error: "Blocked user ID is required" });
    }

    const user = await User.findById(userId);

    if (!user) {
      return response.status(404).json({ error: "User not found" });
    }

    user.blockedUsers = user.blockedUsers.filter(
      (id) => id.toString() !== blockedUserId.toString()
    );
    await user.save();

    return response.status(200).json({
      message: "User unblocked successfully",
      blockedUserId,
    });
  } catch (error) {
    console.error("Unblock user error:", error);
    return response.status(500).json({ error: error.message });
  }
};

export const getBlockedUsers = async (request, response) => {
  try {
    const { userId } = request;

    const user = await User.findById(userId).populate(
      "blockedUsers",
      "firstName lastName email image color"
    );

    if (!user) {
      return response.status(404).json({ error: "User not found" });
    }

    return response.status(200).json({
      blockedUsers: user.blockedUsers || [],
    });
  } catch (error) {
    console.error("Get blocked users error:", error);
    return response.status(500).json({ error: error.message });
  }
};

export const checkBlockStatus = async (request, response) => {
  try {
    const { userId } = request;
    const { targetUserId } = request.params;

    const user = await User.findById(userId);
    const targetUser = await User.findById(targetUserId);

    if (!user || !targetUser) {
      return response.status(404).json({ error: "User not found" });
    }

    const iBlockedThem = user.blockedUsers.includes(targetUserId);
    const theyBlockedMe = targetUser.blockedUsers.includes(userId);

    return response.status(200).json({
      iBlockedThem,
      theyBlockedMe,
      targetUserId,
    });
  } catch (error) {
    console.error("Check block status error:", error);
    return response.status(500).json({ error: error.message });
  }
};
