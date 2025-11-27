import "./config/loadEnv.js";
import { Server as SocketIOServer } from "socket.io";
import Message from "./models/MessageModel.js";
import Group from "./models/GroupModel.js";
import User from "./models/UserModel.js";
import {
  ensureAiAssistantUser,
  generateAssistantReply,
} from "./helpers/aiAssistant.js";

let assistantUserPromise;
let io;
let userSocketMap;

const getAssistantUser = async () => {
  if (!assistantUserPromise) {
    assistantUserPromise = ensureAiAssistantUser().catch((error) => {
      console.error("Failed to initialise AI assistant user", error);
      assistantUserPromise = null;
      throw error;
    });
  }

  return assistantUserPromise;
};

const setupSocket = (server) => {
  if (io) {
    return io;
  }

  const allowedOrigins = process.env.ORIGIN
    ? process.env.ORIGIN.split(",")
    : ["http://client:80"];

  io = new SocketIOServer(server, {
    path: "/socket.io",
    cors: {
      origin: allowedOrigins,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
      credentials: true,
    },
  });

  userSocketMap = new Map();

  const disconnect = (socket) => {
    for (const [userId, socketId] of userSocketMap.entries()) {
      if (socketId === socket.id) {
        userSocketMap.delete(userId);
        break;
      }
    }
  };

  const createAssistantMessage = async (
    assistant,
    recipientId,
    content,
    recipientSocketId,
    ioInstance
  ) => {
    if (!assistant || !recipientId || !content) {
      return;
    }

    const assistantMessage = await Message.create({
      sender: assistant._id,
      recipient: recipientId,
      messageType: "text",
      content,
    });

    const assistantMessageData = await Message.findById(assistantMessage._id)
      .populate("sender", "id email firstName lastName image color")
      .populate("recipient", "id email firstName lastName image color");

    if (recipientSocketId) {
      ioInstance.to(recipientSocketId).emit("receiveMessage", assistantMessageData);
    }
  };

  const maybeSendAssistantReply = async (message, senderSocketId) => {
    try {
      const assistant = await getAssistantUser();
      if (!assistant || !message?.recipient) {
        return;
      }

      if (message.recipient.toString() !== assistant._id.toString()) {
        return;
      }

      const targetSocketId = userSocketMap.get(message.sender);

      if (message.messageType !== "text") {
        await createAssistantMessage(
          assistant,
          message.sender,
          "Hiện tại tôi chỉ đọc được tin nhắn dạng văn bản. Bạn thử mô tả nội dung bằng chữ nhé!",
          targetSocketId,
          io
        );
        return;
      }

      const reply = await generateAssistantReply(
        message.sender,
        assistant._id
      );

      await createAssistantMessage(
        assistant,
        message.sender,
        reply,
        targetSocketId,
        io
      );
    } catch (error) {
      console.error("🔥 GEMINI ERROR:", error?.message);
      console.error("Full stack trace:", error);

      try {
        const assistant = await getAssistantUser();
        const fallbackSocketId = userSocketMap.get(message.sender);
        await createAssistantMessage(
          assistant,
          message.sender,
          "Xin lỗi, trợ lý AI đang gặp sự cố và chưa thể trả lời ngay lúc này.",
          fallbackSocketId,
          io
        );
      } catch (innerError) {
        console.error("Failed to send assistant fallback message", innerError);
        if (senderSocketId) {
          io.to(senderSocketId).emit("assistantError", {
            error: "Assistant is unavailable",
          });
        }
      }
    }
  };

  const sendMessage = async (message) => {
    const assistant = await getAssistantUser().catch(() => null);
    if (assistant && message.recipient?.toString() === assistant._id.toString()) {
      const senderSocketId = userSocketMap.get(message.sender);

      const createdMessage = await Message.create(message);
      const messageData = await Message.findById(createdMessage._id)
        .populate("sender", "id email firstName lastName image color")
        .populate("recipient", "id email firstName lastName image color");

      if (senderSocketId) {
        io.to(senderSocketId).emit("receiveMessage", messageData);
      }

      await maybeSendAssistantReply(message, senderSocketId);
      return;
    }

    const senderSocketId = userSocketMap.get(message.sender);
    const recipientSocketId = userSocketMap.get(message.recipient);

    const createdMessage = await Message.create(message);

    const messageData = await Message.findById(createdMessage._id)
      .populate("sender", "id email firstName lastName image color")
      .populate("recipient", "id email firstName lastName image color");

    if (recipientSocketId) {
      io.to(recipientSocketId).emit("receiveMessage", messageData);
    }
    if (senderSocketId) {
      io.to(senderSocketId).emit("receiveMessage", messageData);
    }
  };

  const sendFriendRequest = async (friendRequest) => {
    const recipientSocketId = userSocketMap.get(friendRequest.target._id);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit(
        "receiveFriendRequest",
        friendRequest.friendRequest
      );
    }
  };

  const sendGroupMessage = async (message) => {
    const { groupId, sender, content, messageType, fileUrl } = message;

    const createdMessage = await Message.create({
      sender,
      recipient: null,
      content,
      messageType,
      timestamp: new Date(),
      fileUrl,
    });
    const messageData = await Message.findById(createdMessage._id)
      .populate("sender", "id email firstName lastName image color")
      .exec();
    const lastMessageData = {
      content: messageData.content,
      messageType: messageData.messageType,
      timestamp: messageData.timestamp,
      fileUrl: messageData.fileUrl,
    };
    await Group.findByIdAndUpdate(groupId, {
      $push: { messages: createdMessage._id },
      $set: { lastMessage: lastMessageData },
    });
    const group = await Group.findById(groupId).populate("members");
    const finalData = { ...messageData._doc, groupId: group._id, group };
    if (group && group.members) {
      group.members.forEach((member) => {
        const memberSocketId = userSocketMap.get(member._id.toString());
        if (memberSocketId) {
          io.to(memberSocketId).emit("receiveGroupMessage", finalData);
        }
      });
    }
  };

  const createGroupEvent = async (group) => {
    if (group && group.members) {
      group.members.forEach((member) => {
        const memberSocketId = userSocketMap.get(member);
        if (memberSocketId) {
          io.to(memberSocketId).emit("receiveGroupCreation", group);
        }
      });
    }
  };

  io.on("connection", (socket) => {
    const userId = socket.handshake.query.userId;

    if (userId) {
      userSocketMap.set(userId, socket.id);
    }

    socket.on("sendMessage", sendMessage);
    socket.on("sendFriendRequest", sendFriendRequest);
    socket.on("sendGroupMessage", sendGroupMessage);
    socket.on("createGroup", createGroupEvent);

    socket.on("call:offer", async ({ to, callId, callType }) => {
      try {
        if (!to || !callId || !callType) return;

        const [caller, recipient] = await Promise.all([
          User.findById(userId).select("blockedUsers").lean(),
          User.findById(to).select("blockedUsers").lean(),
        ]);

        if (!caller || !recipient) return;

        const callerBlockedRecipient = caller.blockedUsers?.some(
          (id) => id.toString() === to.toString()
        );
        const recipientBlockedCaller = recipient.blockedUsers?.some(
          (id) => id.toString() === userId.toString()
        );

        if (callerBlockedRecipient || recipientBlockedCaller) {
          socket.emit("call:blocked", { message: "Cannot call this user" });
          return;
        }

        const recipientSocketId = userSocketMap.get(String(to));
        if (recipientSocketId) {
          io.to(recipientSocketId).emit("call:incoming", {
            from: String(userId),
            callId,
            callType,
          });
        }
      } catch (err) {
        console.error("Call offer error:", err);
      }
    });

    socket.on("group:call:offer", async ({ groupId, callType }) => {
      try {
        if (!groupId) return;
        const group = await Group.findById(groupId).lean();
        if (!group || !group.members) return;
        group.members.forEach((memberId) => {
          const mid = memberId.toString();
          if (mid === String(userId)) return;
          const sid = userSocketMap.get(mid);
          if (sid) {
            io.to(sid).emit("group:call:incoming", {
              groupId: String(groupId),
              from: String(userId),
              callType,
            });
          }
        });
      } catch (err) {
        console.error("group:call:offer error", err);
      }
    });

    socket.on("group:call:end", async ({ groupId }) => {
      try {
        if (!groupId) return;
        const group = await Group.findById(groupId).lean();
        if (!group || !group.members) return;
        group.members.forEach((memberId) => {
          const sid = userSocketMap.get(memberId.toString());
          if (sid) io.to(sid).emit("group:call:ended", { groupId: String(groupId) });
        });
      } catch (err) {
        console.error("group:call:end error", err);
      }
    });

    socket.on("call:accept", ({ to, callId }) => {
      try {
        if (!to || !callId) return;
        const callerSocketId = userSocketMap.get(String(to));
        if (callerSocketId) {
          io.to(callerSocketId).emit("call:accepted", {
            from: String(userId),
            callId,
          });
        }
      } catch (err) {
        console.error("Call accept error:", err);
      }
    });

    socket.on("call:reject", ({ to, callId }) => {
      try {
        if (!to || !callId) return;
        const callerSocketId = userSocketMap.get(String(to));
        if (callerSocketId) {
          io.to(callerSocketId).emit("call:rejected", {
            from: String(userId),
            callId,
          });
        }
      } catch (err) {
        console.error("Call reject error:", err);
      }
    });

    socket.on("call:end", ({ to, callId }) => {
      try {
        if (!to || !callId) return;
        const peerSocketId = userSocketMap.get(String(to));
        if (peerSocketId) {
          io.to(peerSocketId).emit("call:ended", {
            from: String(userId),
            callId,
          });
        }
      } catch (err) {
        console.error("Call end error:", err);
      }
    });

    socket.on("photoUploaded", (photo) => {
      io.emit("newPhotoUploaded", photo);
    });

    socket.on("photoLiked", (data) => {
      io.emit("photoLiked", data);
    });

    socket.on("photoUnliked", (data) => {
      io.emit("photoUnliked", data);
    });

    socket.on("photoDeleted", (data) => {
      io.emit("photoDeleted", data);
    });

    socket.on("disconnect", () => disconnect(socket));
  });
};

export const getSocketIO = () => io;
export const getUserSocketMap = () => userSocketMap;

export default setupSocket;
