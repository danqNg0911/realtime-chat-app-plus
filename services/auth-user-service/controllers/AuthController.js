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

//email verification imports
import crypto from "crypto";
import { sendVerificationEmail } from "../emailVerification/emailService.js";
import PendingUser from "../models/PendingUserModel.js";
// email verification ends

const adminEmail = process.env.ADMIN_EMAIL;
const resetLowerLimit = process.env.RESET_LOWER_LIMIT;

const createToken = (email, userId) => {
  return jwt.sign({ email, userId }, process.env.JWT_KEY, {
    expiresIn: maxAge,
  });
};

/*export const signup = async (request, response, next) => {
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
};*/

export const signup = async (request, response, next) => {
  try {
    const { email, password } = request.body;
    if (!email || !password) {
      return response
        .status(400)
        .json({ error: "Email and password are required" });
    }

    // Kiểm tra email đã được dùng ở User (đã xác thực)
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return response.status(400).json({
        error: "This email is already registered. Please login instead.",
      });
    }

    // Kiểm tra email đã ở bảng PendingUsers (chưa xác thực)
    const existingPending = await PendingUser.findOne({ email });
    if (existingPending) {
      if (existingPending.lastResendAt && Date.now() - existingPending.lastResendAt < 30 * 1000) {
        return response.status(429).json({
            error: "This email is already pending verification. Please wait before trying again.",
            retryAfter: existingPending.lastResendAt + 60*1000
        });
      } else if (Date.now() - existingPending.firstSignupAt >= 60 * 60 * 1000) {
        existingPending.resendAttempts = 0;
        existingPending.firstSignupAt = Date.now();
      } else if (existingPending.resendAttempts > 5) {
        return response.status(429).json({
          error: "You have reached the resend limit. Please try signing up again later.",
        });
      }

      const token = crypto.randomBytes(32).toString("hex");
      const tokenExpiry = Date.now() + 24 * 60 * 60 * 1000; // 24 giờ
      existingPending.verificationToken = token;
      existingPending.verificationTokenExpires = tokenExpiry;

      try {
        await sendVerificationEmail({ to: email, token, userId: existingPending._id });
      } catch (error) {
        console.error("Failed to send verification email:", err);
        return response.status(500).json({ error: "Failed to send verification email. Please try again later." });
      }
      
      existingPending.resendAttempts++;
      existingPending.lastResendAt = Date.now();
      await existingPending.save();

      return response.status(200).json({
        message: "Verification email resent. Please check your inbox.",
        isPending: true,
        pendingUserId: existingPending._id,
        canResendAfter: existingPending.lastResendAt + 60 * 1000,
        resendAttempts: existingPending.resendAttempts,
      });
    }

    const salt = await genSalt(10);
    const pepper = process.env.PEPPER_STRING;
    const hashedPassword = await bcrypt.hash(salt + password + pepper, 10);

    // Tạo token xác thực
    const token = crypto.randomBytes(32).toString("hex");
    const tokenExpiry = Date.now() + 24 * 60 * 60 * 1000; // 24 giờ

    // **Lưu vào PendingUsers thay vì User**
    const pendingUser = await PendingUser.create({
      email,
      password: hashedPassword,
      salt,
      verificationToken: token,
      verificationTokenExpires: tokenExpiry,
      resendAttempts: 0,
    });

    // Gửi email xác thực
    await sendVerificationEmail({ to: email, token, userId: pendingUser._id });
    
    return response.status(201).json({
      message: "Please check your email to verify your account before logging in.",
      isPending: true,
      pendingUserId: pendingUser._id,
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

//Email verification controllers
export const verifyEmail = async (req, res) => {
  try {
    const { token, id } = req.query;
    const frontendUrl = process.env.FRONTEND_URL || (process.env.ORIGIN && process.env.ORIGIN.split(",")[0]) || "http://localhost:5173";

    if (!token || !id) {
      return res.redirect(`${frontendUrl}/email-verify-failed`);
    }

    // Tìm user ở bảng PendingUsers
    const pendingUser = await PendingUser.findOne({
      _id: id,
      verificationToken: token,
    });

    if (!pendingUser) {
      return res.redirect(`${frontendUrl}/email-verify-failed`);
    }

    if (pendingUser.verificationTokenExpires < Date.now()) {
      // Token hết hạn - xóa pending user and redirect to fail page
      await PendingUser.deleteOne({ _id: id });
      return res.redirect(`${frontendUrl}/email-verify-failed`);
    }

    // **Tạo User mới từ PendingUser**
    const newUser = await User.create({
      email: pendingUser.email,
      password: pendingUser.password,
      salt: pendingUser.salt,
      authProvider: "local",
      isVerified: true,
      // không cần verificationToken/Expires vì đã xác thực
    });

    // Xóa PendingUser
    await PendingUser.deleteOne({ _id: id });

    res.clearCookie("jwt", {
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
      httpOnly: true,
    });

    // Redirect tới trang success
    return res.redirect(`${frontendUrl}/email-verify-success`);
  } catch (error) {
    console.error(error);
    const frontendUrl = process.env.FRONTEND_URL || (process.env.ORIGIN && process.env.ORIGIN.split(",")[0]) || "http://localhost:5173";
    console.error(error);
    return res.redirect(`${frontendUrl}/email-verify-failed`);
  }
};


// Resend từ trang /verify-failed (có rate limit middleware)
export const resendVerification = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email required" });

    // Tìm ở PendingUsers (chưa xác thực)
    const pendingUser = await PendingUser.findOne({ email });
    if (!pendingUser) {
      return res.status(404).json({
        error: "Email not found or already verified.",
      });
    }

    const COOLDOWN_MS = (Number(process.env.RESEND_COOLDOWN_SECONDS) || 60) * 1000;
    const WINDOW_MS = (Number(process.env.RESEND_WINDOW_HOURS) || 1) * 60 * 60 * 1000; // 1 hour default
    const MAX_PER_WINDOW = Number(process.env.RESEND_MAX_PER_WINDOW) || 5;

    const now = Date.now();

    // cooldown check
    if (pendingUser.lastResendAt && now - new Date(pendingUser.lastResendAt).getTime() < COOLDOWN_MS) {
      const retryAfterMs = COOLDOWN_MS - (now - new Date(pendingUser.lastResendAt).getTime());
      return res.status(429).json({ message: "Please wait before resending verification email", retryAfterMs });
    }

    // reset window if old or not set
    if (!pendingUser.resendWindowStart || now - new Date(pendingUser.resendWindowStart).getTime() > WINDOW_MS) {
      pendingUser.resendWindowStart = new Date(now);
      pendingUser.resendAttempts = 0;
    }

    if ((pendingUser.resendAttempts || 0) >= MAX_PER_WINDOW) {
      return res.status(429).json({ message: "Too many resend attempts. Try again later." });
    }

    // Generate new token and update counters
    const newToken = crypto.randomBytes(32).toString("hex");
    pendingUser.verificationToken = newToken;
    pendingUser.verificationTokenExpires = new Date(now + 24 * 60 * 60 * 1000);
    pendingUser.resendAttempts = (pendingUser.resendAttempts || 0) + 1;
    pendingUser.lastResendAt = new Date(now);
    await pendingUser.save();

    await sendVerificationEmail({
      to: email,
      token: newToken,
      userId: pendingUser._id,
    });

    return res.status(200).json({
      message: "Verification email resent",
      attemptsRemaining: Math.max(0, MAX_PER_WINDOW - pendingUser.resendAttempts),
      retryAfterMs: COOLDOWN_MS,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
};