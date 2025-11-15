import Message from "../models/MessageModel.js";
import User from "../models/UserModel.js";
import mongoose from "mongoose";

export const searchContacts = async (request, response, next) => {
  try {
    const { searchTerm } = request.body;
    const userId = request.userId;

    const sanitizedSearchTerm = searchTerm.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );

    const regex = new RegExp(sanitizedSearchTerm, "i");

    const currentUser = await User.findById(userId).select("friends");
    if (!currentUser) {
      return response.status(404).json({ error: "User not found" });
    }

    const friendsEmails = currentUser.friends;

    let contacts;

    if (searchTerm === undefined || searchTerm === null) {
      contacts = await User.find({
        _id: { $ne: request.userId },
        email: { $in: friendsEmails },
      });
    } else {
      contacts = await User.find({
        $and: [
          { _id: { $ne: request.userId } },
          { email: { $in: friendsEmails } },
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
    }
    return response.status(200).json({ contacts });
  } catch (error) {
    console.log(error);
    return response.status(500).json({ error: error.message });
  }
};

export const searchDMContacts = async (request, response, next) => {
  try {
    const { searchTerm, directMessagesContacts } = request.body;
    const userId = request.userId;

    if (
      searchTerm === undefined ||
      searchTerm === null ||
      directMessagesContacts === undefined ||
      directMessagesContacts === null
    ) {
      return response
        .status(400)
        .json({ error: "searchTerm and directMessagesContacts are required" });
    }

    const sanitizedSearchTerm = searchTerm.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );

    const regex = new RegExp(sanitizedSearchTerm, "i");

    const directMessagesEmails = directMessagesContacts.map(
      (contact) => contact.email
    );

    const searchedContacts = await User.find({
      $and: [
        { _id: { $ne: userId } },
        { email: { $in: directMessagesEmails } },
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

    const searchedContactIds = new Set(
      searchedContacts.map((contact) => contact._id.toString())
    );
    const contacts = directMessagesContacts.filter((contact) =>
      searchedContactIds.has(contact._id.toString())
    );

    return response.status(200).json({ contacts });
  } catch (error) {
    console.log(error);
    return response.status(500).json({ error: error.message });
  }
};

export const getContactsForDMList = async (request, response, next) => {
  try {
    const { userId } = request;
    const userObjectId = new mongoose.Types.ObjectId(userId);

    const currentUser = await User.findById(userId).select("friends email");

    if (!currentUser) {
      return response.status(404).json({ error: "User not found" });
    }

    const contacts = await Message.aggregate([
      { $match: { $or: [{ sender: userObjectId }, { recipient: userObjectId }] } },
      { $sort: { timestamp: -1 } },
      {
        $group: {
          _id: {
            $cond: {
              if: { $eq: ["$sender", userObjectId] },
              then: "$recipient",
              else: "$sender",
            },
          },
          lastMessageTime: { $first: "$timestamp" },
          lastMessageType: { $first: "$messageType" },
          lastMessageContent: { $first: "$content" },
          lastFileUrl: { $first: "$fileUrl" },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "contactInfo",
        },
      },
      { $unwind: "$contactInfo" },
      {
        $project: {
          _id: 1,
          lastMessageTime: 1,
          lastMessageType: 1,
          lastMessage: {
            $cond: {
              if: { $eq: ["$lastMessageType", "text"] },
              then: "$lastMessageContent",
              else: "$lastFileUrl",
            },
          },
          email: "$contactInfo.email",
          firstName: "$contactInfo.firstName",
          lastName: "$contactInfo.lastName",
          image: "$contactInfo.image",
          color: "$contactInfo.color",
        },
      },
      { $sort: { lastMessageTime: -1 } },
    ]);

    const friendEmails = currentUser.friends || [];
    const filteredContacts = contacts.filter((contact) =>
      friendEmails.includes(contact.email)
    );

    return response.status(200).json({ contacts: filteredContacts });
  } catch (error) {
    console.log(error);
    return response.status(500).json({ error: error.message });
  }
};

export const getAllContacts = async (request, response, next) => {
  try {
    const userId = request.userId;

    const currentUser = await User.findById(userId).select("friends");
    if (!currentUser) {
      return response.status(404).json({ error: "User not found" });
    }

    const friendsEmails = currentUser.friends;

    const contacts = await User.find(
      {
        _id: { $ne: request.userId },
        email: { $in: friendsEmails },
      },
      "firstName lastName _id email"
    );

    return response.status(200).json({ contacts });
  } catch (error) {
    console.log(error);
    return response.status(500).json({ error: error.message });
  }
};

export const getContactFiles = async (request, response, next) => {
  try {
    const currentUser = request.userId;
    const { contactId } = request.params;

    if (!currentUser || !contactId) {
      return response.status(400).json({ error: "Both user IDs are required" });
    }

    const files = await Message.find({
      $or: [
        { sender: currentUser, recipient: contactId },
        { sender: contactId, recipient: currentUser },
      ],
      messageType: "file",
    }).sort({ timestamp: 1 });

    return response.status(200).json({ files: files.reverse() });
  } catch (error) {
    console.log(error);
    return response.status(500).json({ error: error.message });
  }
};

export const unfriendContact = async (request, response) => {
  try {
    const { userId } = request;
    const { friendId } = request.params;

    if (!friendId) {
      return response
        .status(400)
        .json({ error: "Friend ID is required to unfriend" });
    }

    const [currentUser, friendUser] = await Promise.all([
      User.findById(userId),
      User.findById(friendId),
    ]);

    if (!currentUser || !friendUser) {
      return response.status(404).json({ error: "User not found" });
    }

    const friendEmail = friendUser.email;
    const currentEmail = currentUser.email;

    currentUser.friends = (currentUser.friends || []).filter(
      (email) => email !== friendEmail
    );
    friendUser.friends = (friendUser.friends || []).filter(
      (email) => email !== currentEmail
    );

    currentUser.friendRequests = (currentUser.friendRequests || []).filter(
      (email) => email !== friendEmail
    );
    friendUser.friendRequests = (friendUser.friendRequests || []).filter(
      (email) => email !== currentEmail
    );

    await Promise.all([currentUser.save(), friendUser.save()]);

    return response.status(200).json({
      message: "Friend removed successfully",
      friendId,
    });
  } catch (error) {
    console.log(error);
    return response.status(500).json({ error: error.message });
  }
};
