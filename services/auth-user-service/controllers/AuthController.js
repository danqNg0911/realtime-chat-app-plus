import "../config/loadEnv.js";
import mongoose from "mongoose";
import bcrypt, { genSalt, compare } from "bcryptjs";
import User from "../models/UserModel.js";
import Group from "../models/GroupModel.js";
import Message from "../models/MessageModel.js";
import jwt from "jsonwebtoken";
import { renameSync, unlinkSync } from "fs";
import {
  authCookieMaxAge as maxAge,
  authCookieOptions,
  clearAuthCookieOptions,
} from "../utils/cookies.js";

const adminEmail = process.env.ADMIN_EMAIL;
const resetLowerLimit = process.env.RESET_LOWER_LIMIT;

const createToken = (email, userId) => {
  return jwt.sign({ email, userId }, process.env.JWT_KEY, {
    expiresIn: maxAge,
  });
};

export const signup = async (request, response, next) => {
  try {
    const { email, password } = request.body;
    if (!email || !password) {
      return response
        .status(400)
        .json({ error: "Email and password are required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      if (existingUser.authProvider !== "local") {
        return response.status(400).json({
          error: "This account already exists. Please use the same login method.",
        });
      }
      return response.status(400).json({
        error: "This email is already registered. Please login instead.",
      });
    }

    const salt = await genSalt(10);
    const pepper = process.env.PEPPER_STRING;
    const hashedPassword = await bcrypt.hash(salt + password + pepper, 10);

    const user = await User.create({
      email,
      password: hashedPassword,
      salt: salt,
      authProvider: "local",
    });
    const token = createToken(email, user.id);
    response.cookie("jwt", token, authCookieOptions);
    return response.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        profileSetup: user.profileSetup,
        authProvider: user.authProvider,
        isAdmin: user.email === adminEmail,
      },
    });
  } catch (error) {
    console.log(error);
    return response.status(500).json({ error: error.message });
  }
};

export const login = async (request, response, next) => {
  try {
    const { email, password } = request.body;
    if (!email || !password) {
      return response
        .status(400)
        .json({ error: "Email and password are required" });
    }
    const user = await User.findOne({ email });
    if (!user) {
      return response
        .status(400)
        .json({ error: "User with the given email does not exist" });
    }

    if (user.authProvider !== "local") {
      return response.status(400).json({
        error: "This account already exists. Please use the same login method.",
      });
    }

    if (!user.password) {
      return response.status(400).json({
        error: "Invalid login method. Please use the correct sign-in method.",
      });
    }

    const pepper = process.env.PEPPER_STRING;
    const auth = await compare(user.salt + password + pepper, user.password);
    if (!auth) {
      return response.status(400).json({ error: "Incorrect password" });
    }

    const token = createToken(email, user.id);
    response.cookie("jwt", token, authCookieOptions);
    return response.status(200).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        profileSetup: user.profileSetup,
        firstName: user.firstName,
        lastName: user.lastName,
        image: user.image,
        color: user.color,
        authProvider: user.authProvider,
        isAdmin: user.email === adminEmail,
      },
    });
  } catch (error) {
    console.log(error);
    return response.status(500).json({ error: error.message });
  }
};

export const getUserInfo = async (request, response, next) => {
  try {
    const userData = await User.findById(request.userId);
    if (!userData) {
      // Treat missing user as unauthorized to avoid confusing 404s on client
      response.cookie("jwt", "", clearAuthCookieOptions);
      return response.status(401).json({ error: "Unauthorized" });
    }
    return response.status(200).json({
      id: userData.id,
      email: userData.email,
      profileSetup: userData.profileSetup,
      firstName: userData.firstName,
      lastName: userData.lastName,
      image: userData.image,
      color: userData.color,
      authProvider: userData.authProvider,
      isAdmin: userData.email === adminEmail,
    });
  } catch (error) {
    console.log(error);
    return response.status(500).json({ error: error.message });
  }
};

export const updateProfile = async (request, response, next) => {
  try {
    const { userId } = request;
    const { firstName, lastName, color, image } = request.body;
    if (!firstName || !lastName) {
      return response
        .status(400)
        .json({ error: "First name and last name are required" });
    }

    const userData = await User.findByIdAndUpdate(
      userId,
      { firstName, lastName, color, image, profileSetup: true },
      { new: true, runValidators: true }
    );
    return response.status(200).json({
      id: userData.id,
      email: userData.email,
      profileSetup: userData.profileSetup,
      firstName: userData.firstName,
      lastName: userData.lastName,
      image: userData.image,
      color: userData.color,
      authProvider: userData.authProvider,
      isAdmin: userData.email === adminEmail,
    });
  } catch (error) {
    console.log(error);
    return response.status(500).json({ error: error.message });
  }
};

export const logout = async (request, response, next) => {
  try {
    response.cookie("jwt", "", clearAuthCookieOptions);

    return response.status(200).json({
      message: "Logged out successfully",
    });
  } catch (error) {
    console.log(error);
    return response.status(500).json({ error: error.message });
  }
};
export const resetApp = async (request, response, next) => {
  try {
    const { resetDate } = request.body;

    if (resetDate <= resetLowerLimit) {
      return response.status(400).json({
        message: `Reset date (${resetDate.substring(
          0,
          10
        )}) must be after ${resetLowerLimit.substring(0, 10)}.`,
      });
    }

    const messagesToDelete = await Message.find({
      timestamp: { $gt: resetDate },
    }).select("_id");

    const messageIdsToDelete = messagesToDelete.map((msg) => msg._id);

    await Message.deleteMany({
      _id: { $in: messageIdsToDelete },
    });

    await Group.deleteMany({
      createdAt: { $gt: resetDate },
    });

    const groups = await Group.find({
      createdAt: { $lt: resetDate },
    });

    for (const group of groups) {
      await Group.updateOne(
        { _id: group._id },
        { $pull: { messages: { $in: messageIdsToDelete } } }
      );

      const lastMessageBeforeResetDate = await Message.findOne({
        _id: { $in: group.messages },
        timestamp: { $lt: resetDate },
      })
        .sort({ timestamp: -1 })
        .select("content messageType timestamp fileUrl");

      if (lastMessageBeforeResetDate) {
        group.lastMessage = lastMessageBeforeResetDate;
      } else {
        group.lastMessage = null;
      }

      await group.save();
    }

    return response
      .status(200)
      .json({ message: "Reset completed successfully" });
  } catch (error) {
    console.log(error);
    return response.status(500).json({ error: error.message });
  }
};

export const changePassword = async (request, response, next) => {
  try {
    const { currentPassword, newPassword } = request.body;

    if (!currentPassword || !newPassword) {
      return response.status(400).json({
        error: "Current password and new password are required",
      });
    }

    const user = await User.findById(request.userId);

    if (!user) {
      return response.status(404).json({ error: "User not found" });
    }

    const pepper = process.env.PEPPER_STRING;
    const isCurrentPasswordValid = await compare(
      user.salt + currentPassword + pepper,
      user.password
    );

    if (!isCurrentPasswordValid) {
      return response
        .status(400)
        .json({ error: "Current password is incorrect" });
    }

    const newSalt = await genSalt(10);
    const hashedPassword = await bcrypt.hash(
      `${newSalt}${newPassword}${pepper}`,
      10
    );

    user.password = hashedPassword;
    user.salt = newSalt;
    await user.save();

    return response
      .status(200)
      .json({ message: "Password updated successfully" });
  } catch (error) {
    console.log(error);
    return response.status(500).json({ error: error.message });
  }
};

export const deleteAccount = async (request, response, next) => {
  try {
    const userId = request.userId;

    if (!userId) {
      return response.status(400).json({ error: "User ID is required" });
    }

    await Message.deleteMany({
      $or: [{ sender: userId }, { recipient: userId }],
    });

    await Group.updateMany(
      { members: userId },
      { $pull: { members: userId, admin: userId } }
    );

    await Group.deleteMany({
      members: { $size: 0 },
    });

    await User.findByIdAndDelete(userId);

    response.cookie("jwt", "", clearAuthCookieOptions);

    return response.status(200).json({
      message: "Account deleted successfully",
    });
  } catch (error) {
    console.log(error);
    return response.status(500).json({ error: error.message });
  }
};
