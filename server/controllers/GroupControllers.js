import mongoose from "mongoose";
import Group from "../models/GroupModel.js";
import User from "../models/UserModel.js";
import { getSocketIO, getUserSocketMap } from "../socket.js";
import {
  detectBlockingConflictBetweenSets,
  detectBlockingConflictForMembers,
} from "../helpers/groupPermissions.js";

export const createGroup = async (request, response, next) => {
  try {
    const { name, members } = request.body;

    console.log("members before:");
    console.log(members);

    const userId = request.userId;

    const admin = await User.findById(userId);

    if (!admin) {
      return response.status(400).json({ error: "Admin user not found" });
    }

    // // add userId to members
    // if (!members || members.length === 0) {
    //   // members = [userId];
    //   members.unshift(userId);
    // } else {
    members.unshift(userId);

    const uniqueMemberIds = [...new Set(members.map((memberId) => memberId.toString()))];

    console.log("members after:");
    console.log(uniqueMemberIds);

    const validMembers = await User.find({ _id: { $in: uniqueMemberIds } }).select(
      "_id"
    );

    if (validMembers.length !== uniqueMemberIds.length) {
      return response
        .status(400)
        .json({ error: "One or more members are not valid users" });
    }

    const blockingConflict = await detectBlockingConflictForMembers(
      uniqueMemberIds,
      userId
    );

    if (blockingConflict.conflict) {
      return response.status(403).json({
        error: blockingConflict.message
      });
    }

    console.log("valid members:");
    console.log(validMembers);

    const newGroup = new Group({
      name,
      // members,
      members: validMembers.map((member) => member._id), // Ensure members have valid user IDs
    });

    await newGroup.save();

    return response.status(201).json({ group: newGroup });
  } catch (error) {
    console.log(error);
    return response.status(500).json({ error: error.message });
  }
};

export const getUserGroups = async (request, response, next) => {
  try {
    const userId = request.userId;

    const groups = await Group.find({
      members: userId,
    }).sort({ updatedAt: -1 });

    return response.status(201).json({ groups });
  } catch (error) {
    console.log(error);
    return response.status(500).json({ error: error.message });
  }
};

export const getGroupsInCommon = async (request, response, next) => {
  try {
    // console.log("in");
    const userId = request.userId;
    // const { contactId } = request.body;
    const { contactId } = request.params;

    const groups = await Group.find({
      members: { $all: [userId, contactId] },
    }).sort({ updatedAt: -1 });

    return response.status(201).json({ groups });
  } catch (error) {
    // console.log(error);
    // return response.status(500).json({ error: error.message });
    console.log("ey");
    return response.status(500).json({ error: "ey" });
  }
};

export const getGroupMembers = async (request, response, next) => {
  try {
    const { groupId } = request.params; // Get the group ID from request parameters
    const userId = request.userId; // Get the current user's ID

    // Find the group and populate the members' data
    const group = await Group.findById(groupId).populate(
      "members",
      "firstName lastName _id email"
    );

    if (!group) {
      return response.status(404).json({ error: "Group not found" });
    }

    // Get the members and convert to an array
    let members = group.members;

    // Rearrange the members to put the current user at the start
    const currentUser = members.find(
      (member) => member._id.toString() === userId
    );
    if (currentUser) {
      members = [
        currentUser,
        ...members.filter((member) => member._id.toString() !== userId),
      ];
    }

    // Map to get the required fields (firstName and lastName)
    const formattedMembers = members.map((member) => ({
      firstName: member.firstName,
      lastName: member.lastName,
      email: member.email,
      id: member._id,
    }));

    return response.status(200).json({
      members: formattedMembers,
    });
  } catch (error) {
    console.log(error);
    return response.status(500).json({ error: error.message });
  }
};

export const getGroupMessages = async (request, response, next) => {
  // console.log("in get chan msg");

  try {
    // console.log("in get chan msg");
    const { groupId } = request.params;
    // console.log("cha id: " + groupId);
    const group = await Group.findById(groupId).populate({
      path: "messages",
      populate: {
        path: "sender",
        select: "firstName lastName email _id image color",
      },
    });

    if (!group) {
      return response.status(404).json({ error: "Group not found" });
    }

    const messages = group.messages;

    return response.status(201).json({ messages });
  } catch (error) {
    console.log(error);
    return response.status(500).json({ error: error.message });
  }
};

export const searchGroups = async (request, response, next) => {
  try {
    const { searchTerm, groups } = request.body;

    if (
      searchTerm === undefined ||
      searchTerm === null ||
      groups === undefined ||
      groups === null
    ) {
      return response
        .status(400)
        .json({ error: "searchTerm and groups are required" });
    }

    const sanitizedSearchTerm = searchTerm.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );

    const regex = new RegExp(sanitizedSearchTerm, "i");

    const userGroups = groups.map((group) => group._id);

    // Perform a search only among the groups whose ids are in the userGroups array
    const searchedGroups = await Group.find({
      $and: [
        { _id: { $in: userGroups } }, // Only return groups whose ids is in the userGroups list
        { name: regex }, // Match group name
      ],
    });

    return response.status(200).json({ searchedGroups });
  } catch (error) {
    console.log(error);
    return response.status(500).json({ error: error.message });
  }
};

export const addMemberToGroup = async (request, response, next) => {
  try {
    const { groupId } = request.params;
    const { memberIds } = request.body; // Array of user IDs to add
    const userId = request.userId;

    if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
      return response.status(400).json({ error: "Member IDs are required" });
    }

    const group = await Group.findById(groupId);

    if (!group) {
      return response.status(404).json({ error: "Group not found" });
    }

    // Check if user is a member
    if (!group.members.includes(userId)) {
      return response.status(403).json({ error: "You are not a member of this group" });
    }

    // Validate all member IDs exist
    const validMembers = await User.find({ _id: { $in: memberIds } }).select(
      "_id firstName lastName"
    );

    if (validMembers.length !== memberIds.length) {
      return response.status(400).json({ error: "One or more users not found" });
    }

    const blockingConflict = await detectBlockingConflictBetweenSets(
      group.members,
      memberIds,
      userId
    );

    if (blockingConflict.conflict) {
      return response.status(403).json({
        error: blockingConflict.message
      });
    }

    // Add members (skip if already in group)
    const addedMembers = [];
    for (const member of validMembers) {
      const alreadyMember = group.members.some(
        (existing) => existing.toString() === member._id.toString()
      );
      if (!alreadyMember) {
        group.members.push(member._id);
        addedMembers.push(member);
      }
    }

    if (addedMembers.length === 0) {
      return response.status(400).json({ error: "All users are already members" });
    }

    await group.save();

    return response.status(200).json({
      message: "Members added successfully",
      addedMembers: addedMembers.map(m => ({
        _id: m._id,
        firstName: m.firstName,
        lastName: m.lastName,
      })),
      groupId,
    });
  } catch (error) {
    console.log(error);
    return response.status(500).json({ error: error.message });
  }
};

export const updateGroupInfo = async (request, response, next) => {
  try {
    const { groupId } = request.params;
    const { name, image } = request.body;
    const userId = request.userId;

    console.log(`📝 updateGroupInfo called:`);
    console.log(`   - groupId: ${groupId}`);
    console.log(`   - name: ${name}`);
    console.log(`   - image: ${image}`);
    console.log(`   - userId: ${userId}`);

    const group = await Group.findById(groupId).populate("members");

    if (!group) {
      return response.status(404).json({ error: "Group not found" });
    }

    console.log(`📊 Current group state:`);
    console.log(`   - name: ${group.name}`);
    console.log(`   - image: ${group.image}`);

    // Check if user is a member
    if (!group.members.some((member) => member._id.toString() === userId)) {
      return response.status(403).json({ error: "You are not a member of this group" });
    }

    // Update name if provided
    if (name !== undefined) {
      group.name = name;
    }

    // Update image if provided
    if (image !== undefined) {
      group.image = image;
    }

    await group.save();

    console.log(`✅ Group saved to database:`);
    console.log(`   - name: ${group.name}`);
    console.log(`   - image: ${group.image}`);

    // Emit real-time update to all group members (including the user who made the update)
    const io = getSocketIO();
    const userSocketMap = getUserSocketMap();

    if (io && userSocketMap && group.members) {
      const updateData = {
        groupId: group._id,
        name: group.name,
        image: group.image,
      };

      console.log(`📢 Emitting groupInfoUpdated to ${group.members.length} members`);
      console.log(`   - updateData:`, updateData);

      group.members.forEach((member) => {
        const memberSocketId = userSocketMap.get(member._id.toString());
        if (memberSocketId) {
          console.log(`  → Emitting to user ${member._id} (socket: ${memberSocketId})`);
          io.to(memberSocketId).emit("groupInfoUpdated", updateData);
        }
      });
    }

    return response.status(200).json({
      message: "Group updated successfully",
      group: {
        _id: group._id,
        name: group.name,
        image: group.image,
      },
    });
  } catch (error) {
    console.log(error);
    return response.status(500).json({ error: error.message });
  }
};

export const leaveGroup = async (request, response, next) => {
  try {
    const { groupId } = request.params;
    const userId = request.userId;

    const group = await Group.findById(groupId);

    if (!group) {
      return response.status(404).json({ error: "Group not found" });
    }

    // Check if user is a member
    if (!group.members.includes(userId)) {
      return response.status(400).json({ error: "You are not a member of this group" });
    }

    // Remove user from members
    group.members = group.members.filter(
      (memberId) => memberId.toString() !== userId.toString()
    );

    // If user was admin, remove from admin list
    if (group.admin && group.admin.includes(userId)) {
      group.admin = group.admin.filter(
        (adminId) => adminId.toString() !== userId.toString()
      );

      // If no admins left and group still has members, make first member admin
      if (group.admin.length === 0 && group.members.length > 0) {
        group.admin = [group.members[0]];
      }
    }

    // If no members left, delete the group
    if (group.members.length === 0) {
      await Group.findByIdAndDelete(groupId);
      return response.status(200).json({
        message: "Group deleted as last member left",
        deleted: true
      });
    }

    await group.save();

    return response.status(200).json({
      message: "Left group successfully",
      groupId,
      deleted: false
    });
  } catch (error) {
    console.log(error);
    return response.status(500).json({ error: error.message });
  }
};

export const getGroupFiles = async (request, response, next) => {
  try {
    const { groupId } = request.params;

    // Fetch the group and populate messages with a filter on messageType
    const group = await Group.findById(groupId).populate({
      path: "messages",
      match: { messageType: "file" }, // Only include messages with messageType "file"
      populate: {
        path: "sender",
        select: "firstName lastName email _id image color",
      },
    });

    if (!group) {
      return response.status(404).json({ error: "Group not found" });
    }

    const files = group.messages; // This will contain only messages with messageType "file"

    return response.status(201).json({ files: files.reverse() });
  } catch (error) {
    console.log(error);
    return response.status(500).json({ error: error.message });
  }
};
