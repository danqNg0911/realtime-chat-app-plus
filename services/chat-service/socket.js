import "./config/loadEnv.js";
import mongoose from "mongoose";
import { Server as SocketIOServer } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import Message from "./models/MessageModel.js";
import Group from "./models/GroupModel.js";
import User from "./models/UserModel.js";
import {
  ensureAiAssistantUser,
  generateAssistantReply,
} from "./helpers/aiAssistant.js";

let assistantUserPromise;
let io;
// let userSocketMap; 

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

// Hàm tiện ích để tạo key cho Redis (giúp quản lý key gọn gàng)
const getUserKey = (userId) => `user:${userId}`;

const setupSocket = (server, pubClient, subClient) => {
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
    adapter: createAdapter(pubClient, subClient),
  });

  // Xử lý ngắt kết nối
  const disconnect = async (socket) => {
    try {
      // Lấy userId đã lưu vào socket lúc connection
      const userId = socket.userId;
      if (userId) {
        const key = getUserKey(userId);
        // [QUAN TRỌNG] Kiểm tra xem ID trong Redis có khớp với ID của socket đang thoát không
        // Để tránh trường hợp user mở Tab 1 (Socket A), mở Tab 2 (Socket B) -> Redis lưu B.
        // Nếu Tab 1 tắt, ta không được xóa B đi.
        const currentSocketId = await pubClient.get(key);
        if (currentSocketId === socket.id) {
          await pubClient.del(key);
        }
      }
    } catch (err) {
      console.error("Disconnect error:", err);
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

      // Lấy socketID từ Redis thay vì Map
      const targetSocketId = await pubClient.get(getUserKey(message.sender));

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
        // Lấy socketID từ Redis
        const fallbackSocketId = await pubClient.get(getUserKey(message.sender));
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

  /*const sendMessage = async (message) => {
    const assistant = await getAssistantUser().catch(() => null);
    
    // Lấy socketID người gửi từ Redis
    const senderSocketId = await pubClient.get(getUserKey(message.sender));

    if (assistant && message.recipient?.toString() === assistant._id.toString()) {
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

    // Lấy socketID người nhận từ Redis
    const recipientSocketId = await pubClient.get(getUserKey(message.recipient));

    const createdMessage = await Message.create(message);

    const messageData = await Message.findById(createdMessage._id)
      .populate("sender", "id email firstName lastName image color")
      .populate("recipient", "id email firstName lastName image color");

    // Gửi cho người nhận (Dù họ ở server nào, Adapter sẽ lo phần còn lại)
    if (recipientSocketId) {
      io.to(recipientSocketId).emit("receiveMessage", messageData);
    }
    if (senderSocketId) {
      io.to(senderSocketId).emit("receiveMessage", messageData);
    }
  };*/

  const sendMessage = async (message) => {
    try {
        const assistant = await getAssistantUser().catch(() => null);

        if (!message.messageType) return;
        if (message.messageType === "text" && !message.content) return;
        if (message.messageType === "file" && !message.fileUrl) return;

        // Frontend có thể gửi lên cả object, ta chỉ lấy _id hoặc id (2)
        const senderId = message.sender._id || message.sender.id || message.sender;
        const recipientId = message.recipient._id || message.recipient.id || message.recipient;

        // 1. CHUẨN BỊ DỮ LIỆU (Tự tạo ID để không phụ thuộc MongoDB)
        const messageId = new mongoose.Types.ObjectId();
        const timestamp = new Date();

        const [rawSender, rawRecipient] = await Promise.all([
            User.findById(message.sender).select("id email firstName lastName image color").lean(),
            User.findById(message.recipient).select("id email firstName lastName image color").lean()
        ]);

        if (!rawSender || !rawRecipient) {
             console.error("❌ Không tìm thấy user:", message.sender, message.recipient);
             return; 
        }

        // Tạo object chuẩn cho cả hai
        const senderData = {
            ...rawSender,
            _id: rawSender._id.toString(),
            id: rawSender._id.toString()
        };

        const recipientData = {
            ...rawRecipient,
            _id: rawRecipient._id.toString(),
            id: rawRecipient._id.toString()
        };
        
        // Dữ liệu chuẩn để lưu DB và gửi Socket
        const dbPayload = {
            _id: messageId,
            sender: message.sender,       // ID người gửi
            recipient: message.recipient, // ID người nhận
            messageType: message.messageType, // "text" hoặc "file"
            content: message.content || undefined, // Nếu là file thì content = undefined
            fileUrl: message.fileUrl || undefined, // Nếu là text thì fileUrl = undefined
            timestamp: timestamp,
            __v: 0 
        };

        const socketPayload = {
            ...dbPayload,
            _id: messageId.toString(), // [QUAN TRỌNG 1] Ép sang chuỗi
            id: messageId.toString(),  // [QUAN TRỌNG 2] Thêm trường id
            timestamp: timestamp.toISOString(), // [QUAN TRỌNG 3] Ép ngày tháng sang chuỗi chuẩn
            createdAt: timestamp.toISOString(),
            sender: senderData,
            recipient: recipientData
        };

        // 2. XỬ LÝ SOCKET (Gửi ngay lập tức - Zero Latency)
        // Lấy socketID từ Redis
        const senderSocketId = await pubClient.get(getUserKey(message.sender));
        const recipientSocketId = await pubClient.get(getUserKey(message.recipient));

        // Logic AI Assistant (Giữ nguyên logic cũ nhưng xử lý riêng)
        if (assistant && message.recipient?.toString() === assistant._id.toString()) {
            // Với AI, ta vẫn gửi socket cho người gửi để hiện tin nhắn của chính họ
            if (senderSocketId) {
                // Lưu ý: Ở đây ta gửi payload thô, Frontend cần tự hiển thị thông tin user 
                // hoặc bạn phải query cache user profile để ghép vào nếu muốn đẹp ngay.
                io.to(senderSocketId).emit("receiveMessage", socketPayload);
            }
            // Gọi AI trả lời (AI vẫn cần lưu tin nhắn vào DB để có context, 
            // nên ta sẽ lưu tin nhắn người dùng chat với AI thẳng vào DB luôn cho an toàn logic AI)
            await Message.create(dbPayload); 
            await maybeSendAssistantReply(message, senderSocketId);
            return;
        }

        // Logic Chat Người - Người (Dùng Queue)
        // Gửi cho người nhận
        if (recipientSocketId) {
            io.to(recipientSocketId).emit("receiveMessage", socketPayload);
        }
        // Gửi lại cho người gửi (để UI cập nhật status đã gửi)
        if (senderSocketId) {
            io.to(senderSocketId).emit("receiveMessage", socketPayload);
        }

        // 3. ĐẨY VÀO HÀNG ĐỢI REDIS (Lưu sau)
        // Chỉ đẩy tin nhắn người-người vào queue
        // Chat với AI đã lưu trực tiếp ở trên rồi.
        await pubClient.rPush("chat_queue", JSON.stringify(dbPayload));

    } catch (err) {
        console.error("Lỗi gửi tin nhắn:", err);
    }
  };

  const sendFriendRequest = async (friendRequest) => {
    // Lấy socketID từ Redis
    const recipientSocketId = await pubClient.get(getUserKey(friendRequest.target._id));
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
      //  Dùng vòng lặp for...of để await Redis
      for (const member of group.members) {
        const memberSocketId = await pubClient.get(getUserKey(member._id.toString()));
        if (memberSocketId) {
          io.to(memberSocketId).emit("receiveGroupMessage", finalData);
        }
      }
    }
  };

  const createGroupEvent = async (group) => {
    if (group && group.members) {
      // Dùng vòng lặp for...of
      for (const member of group.members) {
        const memberSocketId = await pubClient.get(getUserKey(member));
        if (memberSocketId) {
          io.to(memberSocketId).emit("receiveGroupCreation", group);
        }
      }
    }
  };

  io.on("connection", async (socket) => {
    const userId = socket.handshake.query.userId;

    if (userId) {
      // Lưu userId vào socket object để dùng lúc disconnect
      socket.userId = userId; 
      // Lưu map UserID -> SocketID vào Redis
      await pubClient.set(getUserKey(userId), socket.id);
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

        // Redis get
        const recipientSocketId = await pubClient.get(getUserKey(String(to)));
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
        
        for (const memberId of group.members) {
          const mid = memberId.toString();
          if (mid === String(userId)) continue;
          
          const sid = await pubClient.get(getUserKey(mid));
          if (sid) {
            io.to(sid).emit("group:call:incoming", {
              groupId: String(groupId),
              from: String(userId),
              callType,
            });
          }
        }
      } catch (err) {
        console.error("group:call:offer error", err);
      }
    });

    socket.on("group:call:end", async ({ groupId }) => {
      try {
        if (!groupId) return;
        const group = await Group.findById(groupId).lean();
        if (!group || !group.members) return;
        
        // Vòng lặp for...of
        for (const memberId of group.members) {
          const sid = await pubClient.get(getUserKey(memberId.toString()));
          if (sid) io.to(sid).emit("group:call:ended", { groupId: String(groupId) });
        }
      } catch (err) {
        console.error("group:call:end error", err);
      }
    });

    socket.on("call:accept", async ({ to, callId }) => {
      try {
        if (!to || !callId) return;
        // Redis get
        const callerSocketId = await pubClient.get(getUserKey(String(to)));
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

    socket.on("call:reject", async ({ to, callId }) => {
      try {
        if (!to || !callId) return;
        // Redis get
        const callerSocketId = await pubClient.get(getUserKey(String(to)));
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

    socket.on("call:end", async ({ to, callId }) => {
      try {
        if (!to || !callId) return;
        // Redis get
        const peerSocketId = await pubClient.get(getUserKey(String(to)));
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

export default setupSocket;