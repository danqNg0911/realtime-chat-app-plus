import Message from "../models/MessageModel.js";
import {
  ensureAiAssistantUser,
  generateAssistantReply,
  getAssistantPublicProfile,
} from "../helpers/aiAssistant.js";

const buildPreviewFromLastMessage = (lastMessageDoc) => {
  if (!lastMessageDoc) {
    return null;
  }

  return {
    lastMessageType: lastMessageDoc.messageType,
    lastMessage:
      lastMessageDoc.messageType === "text"
        ? lastMessageDoc.content
        : lastMessageDoc.fileUrl,
    lastMessageTime: lastMessageDoc.timestamp,
  };
};

export const getAssistantProfile = async (request, response) => {
  try {
    const profile = await getAssistantPublicProfile();

    const lastMessage = await Message.findOne({
      $or: [
        { sender: request.userId, recipient: profile._id },
        { sender: profile._id, recipient: request.userId },
      ],
    })
      .sort({ timestamp: -1 })
      .lean();

    return response.status(200).json({
      assistant: {
        ...profile,
        ...buildPreviewFromLastMessage(lastMessage),
      },
    });
  } catch (error) {
    console.error("Failed to load AI assistant profile", error);
    return response.status(500).json({ error: "Unable to load assistant" });
  }
};

export const triggerAssistantReply = async (request, response) => {
  try {
    const assistant = await ensureAiAssistantUser();

    if (!request.body.messageId) {
      return response
        .status(400)
        .json({ error: "messageId is required to trigger the assistant" });
    }

    const message = await Message.findById(request.body.messageId);
    if (!message) {
      return response.status(404).json({ error: "Message not found" });
    }

    const reply = await generateAssistantReply(request.userId, assistant._id);

    const assistantMessage = await Message.create({
      sender: assistant._id,
      recipient: request.userId,
      messageType: "text",
      content: reply,
    });

    return response.status(201).json({
      message: assistantMessage,
    });
  } catch (error) {
    console.error("Failed to trigger assistant reply", error);
    return response
      .status(500)
      .json({ error: "Unable to trigger assistant reply" });
  }
};
