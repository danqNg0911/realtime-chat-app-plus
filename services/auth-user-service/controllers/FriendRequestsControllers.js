import User from "../models/UserModel.js";

export const createFriendRequest = async (request, response) => {
  try {
    const { friendRequest } = request.body;
    const userId = request.userId;

    if (!friendRequest) {
      return response
        .status(400)
        .json({ error: "Friend request ID is required" });
    }

    const currentUser = await User.findById(userId);
    if (!currentUser) {
      return response.status(404).json({ error: "Current user not found" });
    }

    const friendRequestUser = await User.findOne({ email: friendRequest });

    const updatedUser = await User.findOneAndUpdate(
      { email: friendRequest },
      { $addToSet: { friendRequests: currentUser.email } },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return response.status(404).json({ error: "User not found" });
    }

    return response.status(201).json({
      message: "Friend request added successfully",
      target: friendRequestUser,
      requester: currentUser,
    });
  } catch (error) {
    console.log(error);
    return response.status(500).json({ error: error.message });
  }
};

export const rejectFriendRequest = async (request, response) => {
  try {
    const { friendRequest } = request.body;
    const userId = request.userId;

    if (!friendRequest) {
      return response
        .status(400)
        .json({ error: "Friend request email is required" });
    }

    const currentUser = await User.findById(userId);
    if (!currentUser) {
      return response.status(404).json({ error: "User not found" });
    }

    const deletedUser = await User.findOne({ email: friendRequest });

    currentUser.friendRequests = currentUser.friendRequests.filter(
      (email) => email !== friendRequest
    );

    await currentUser.save();

    return response.status(200).json({
      message: "Friend request deleted successfully",
      deletedRequest: deletedUser,
    });
  } catch (error) {
    console.log(error);
    return response.status(500).json({ error: error.message });
  }
};

export const acceptFriendRequest = async (request, response) => {
  try {
    const { friendEmail } = request.body;
    const userId = request.userId;

    if (!friendEmail) {
      return response.status(400).json({ error: "Friend's email is required" });
    }

    const currentUser = await User.findById(userId);
    if (!currentUser) {
      return response.status(404).json({ error: "User not found" });
    }

    const friendRequestUser = await User.findOne({ email: friendEmail });

    const friendRequestExists = currentUser.friendRequests.includes(friendEmail);
    if (!friendRequestExists) {
      return response.status(400).json({ error: "Friend request not found" });
    }

    currentUser.friendRequests = currentUser.friendRequests.filter(
      (email) => email !== friendEmail
    );

    if (!currentUser.friends.includes(friendEmail)) {
      currentUser.friends.push(friendEmail);
    }
    if (!friendRequestUser.friends.includes(currentUser.email)) {
      friendRequestUser.friends.push(currentUser.email);
    }

    await currentUser.save();
    await friendRequestUser.save();

    return response.status(200).json({
      message: "Friend request accepted successfully",
      newFriend: friendRequestUser,
    });
  } catch (error) {
    console.log(error);
    return response.status(500).json({ error: error.message });
  }
};

export const getFriendRequests = async (request, response) => {
  try {
    const userId = request.userId;

    const user = await User.findById(userId).select("friendRequests");

    if (!user) {
      return response.status(404).json({ error: "User not found" });
    }

    const friendRequestEmails = user.friendRequests;

    if (!friendRequestEmails || friendRequestEmails.length === 0) {
      return response.status(200).json({ message: "No friend requests found" });
    }

    const friendRequestUsers = await User.find({
      email: { $in: friendRequestEmails },
    }).select("email firstName lastName image");

    const sortedFriendRequestUsers = friendRequestEmails
      .slice()
      .reverse()
      .map((email) => friendRequestUsers.find((user) => user.email === email));

    return response
      .status(200)
      .json({ friendRequests: sortedFriendRequestUsers });
  } catch (error) {
    console.log(error);
    return response.status(500).json({ error: error.message });
  }
};

export const searchFriendRequests = async (request, response) => {
  try {
    const { searchTerm, friendRequests } = request.body;
    const userId = request.userId;

    if (
      searchTerm === undefined ||
      searchTerm === null ||
      friendRequests === undefined ||
      friendRequests === null
    ) {
      return response
        .status(400)
        .json({ error: "searchTerm and friendRequests are required" });
    }

    const sanitizedSearchTerm = searchTerm.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );

    const regex = new RegExp(sanitizedSearchTerm, "i");

    const friendRequestEmails = friendRequests.map((request) => request.email);

    const searchedFriendRequests = await User.find({
      $and: [
        { email: { $in: friendRequestEmails } },
        {
          $or: [
            { firstName: regex },
            { lastName: regex },
            { email: regex },
            {
              $expr: {
                $regexMatch: {
                  input: { $concat: ["$firstName", " ", "$lastName"] },
                  regex: sanitizedSearchTerm,
                  options: "i",
                },
              },
            },
          ],
        },
      ],
    });

    return response.status(200).json({ searchedFriendRequests });
  } catch (error) {
    console.log(error);
    return response.status(500).json({ error: error.message });
  }
};
