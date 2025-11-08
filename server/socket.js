import { Server as SocketIOServer } from "socket.io";
import Message from "./models/MessageModel.js";
import Group from "./models/GroupModel.js";
import {
  ensureAiAssistantUser,
  generateAssistantReply,
} from "./services/aiAssistant.js";

let assistantUserPromise;
let io; // Export io instance
let userSocketMap; // Export userSocketMap

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
  console.log("Socket.io server started");

  io = new SocketIOServer(server, {
    cors: {
      origin: [process.env.ORIGIN],
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
      credentials: true,
    },
  });

  userSocketMap = new Map();

  const disconnect = (socket) => {
    console.log(`Client disconnected: ${socket.id}`);
    for (const [userId, socketId] of userSocketMap.entries()) {
      if (socketId === socket.id) {
        userSocketMap.delete(userId);
        break;
      }
    }
  };

  const sendMessage = async (message) => {
    console.log(userSocketMap);

    // Check if message is for AI assistant
    const assistant = await getAssistantUser().catch(() => null);
    if (assistant && message.recipient.toString() === assistant._id.toString()) {
      // AI bot doesn't have a socket, so we skip normal DM routing
      const senderSocketId = userSocketMap.get(message.sender);

      console.log(`Message for AI assistant from ${senderSocketId}`);

      const createdMessage = await Message.create(message);
      const messageData = await Message.findById(createdMessage._id)
        .populate("sender", "id email firstName lastName image color")
        .populate("recipient", "id email firstName lastName image color");

      // Send to sender only
      if (senderSocketId) {
        io.to(senderSocketId).emit("receiveMessage", messageData);
      }

      // Trigger AI reply
      await maybeSendAssistantReply(message, senderSocketId);
      return;
    }

    const senderSocketId = userSocketMap.get(message.sender);
    const recipientSocketId = userSocketMap.get(message.recipient);

    console.log(
      `Sending message to ${recipientSocketId} from ${senderSocketId}`
    );

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

  const sendFriendRequest = async (friendRequest) => {
    // console.log(friendRequest);
    const recipientSocketId = userSocketMap.get(friendRequest.target._id);
    const senderSocketId = userSocketMap.get(friendRequest.friendRequest.id);

    console.log(
      `Sending friend request to ${recipientSocketId} from ${senderSocketId}`
    );
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
    // console.log("messageData: " + messageData);
    // Select only the fields you want to store in the lastMessage
    const lastMessageData = {
      content: messageData.content,
      messageType: messageData.messageType,
      timestamp: messageData.timestamp,
      fileUrl: messageData.fileUrl,
    };
    // Update the group with the new message and store only selected fields in lastMessage
    await Group.findByIdAndUpdate(groupId, {
      $push: { messages: createdMessage._id }, // Push the message ID to the messages array
      $set: { lastMessage: lastMessageData }, // Store only selected fields in lastMessage
    });
    const group = await Group.findById(groupId).populate("members");
    const finalData = { ...messageData._doc, groupId: group._id, group: group };
    // console.log("finalData: " + finalData);
    if (group && group.members) {
      group.members.forEach((member) => {
        // console.log("member: " + member);
        const memberSocketId = userSocketMap.get(member._id.toString());
        if (memberSocketId) {
          io.to(memberSocketId).emit("receiveGroupMessage", finalData);
        }
      });
    }
  };
  // (moved group call signaling into connection handler below)
  const createGroup = async (group) => {
    console.log(group);
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
    console.log(`Socket ${socket.id} connected.`);
    const userId = socket.handshake.query.userId;

    if (userId) {
      userSocketMap.set(userId, socket.id);
      console.log(`User connected: ${userId} with socket id: ${socket.id}`);
    } else {
      console.log("User ID not provided during connection.");
    }

    socket.on("sendMessage", sendMessage);
    socket.on("sendFriendRequest", sendFriendRequest);
    socket.on("sendGroupMessage", sendGroupMessage);
    socket.on("createGroup", createGroup);

    // === Direct call signaling (DM) ===
    // Caller -> callee: incoming call offer
    socket.on("call:offer", ({ to, callId, callType }) => {
      try {
        if (!to || !callId || !callType) return;
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

    // === Group call signaling ===
    socket.on("group:call:offer", async ({ groupId, callType }) => {
      try {
        if (!groupId) return;
        const group = await Group.findById(groupId).lean();
        if (!group || !group.members) return;
        group.members.forEach((memberId) => {
          const mid = memberId.toString();
          if (mid === String(userId)) return; // skip caller
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

    // Callee accepted -> notify caller
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

    // Callee rejected -> notify caller
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

    // Either side ended -> notify peer
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

    // Photo events
    socket.on("photoUploaded", (photo) => {
      console.log("📸 Photo uploaded event received:", photo._id);
      // Broadcast to all friends
      if (photo.owner?.friends) {
        photo.owner.friends.forEach((friendId) => {
          const friendSocketId = userSocketMap.get(friendId.toString());
          if (friendSocketId) {
            io.to(friendSocketId).emit("newPhotoUploaded", photo);
          }
        });
      }
    });

    socket.on("photoLiked", (data) => {
      console.log("❤️ Photo liked event received:", data.photoId);
      // Notify photo owner
      const ownerSocketId = userSocketMap.get(data.ownerId);
      if (ownerSocketId) {
        io.to(ownerSocketId).emit("photoLiked", data);
      }
    });

    socket.on("photoUnliked", (data) => {
      console.log("💔 Photo unliked event received:", data.photoId);
      // Notify photo owner
      const ownerSocketId = userSocketMap.get(data.ownerId);
      if (ownerSocketId) {
        io.to(ownerSocketId).emit("photoUnliked", data);
      }
    });

    socket.on("photoDeleted", (data) => {
      console.log("🗑️ Photo deleted event received:", data.photoId);
      // Broadcast to all friends
      const userContacts = data.friends || [];
      userContacts.forEach((friendId) => {
        const friendSocketId = userSocketMap.get(friendId.toString());
        if (friendSocketId) {
          io.to(friendSocketId).emit("photoDeleted", { photoId: data.photoId });
        }
      });
    });

    socket.on("disconnect", () => disconnect(socket));
  });
};

// Export function to get io instance and userSocketMap
export const getSocketIO = () => io;
export const getUserSocketMap = () => userSocketMap;

export default setupSocket;
