import bcrypt from "bcrypt";
import crypto from "node:crypto";
import { GoogleGenerativeAI } from "@google/generative-ai";
import Message from "../models/MessageModel.js";
import User from "../models/UserModel.js";

const DEFAULT_ASSISTANT_EMAIL = "assistant@system.local";
const DEFAULT_ASSISTANT_FIRST_NAME = "Meta";
const DEFAULT_ASSISTANT_LAST_NAME = "AI";
const DEFAULT_ASSISTANT_PROMPT =
  "You are an upbeat Vietnamese-speaking AI copilot built into a realtime chat app. Provide concise, helpful replies, avoid mentioning system internals, and keep a friendly tone.";

let cachedAssistant;
let generativeAIClient;

const getAssistantConfig = () => ({
  email: process.env.AI_ASSISTANT_EMAIL || DEFAULT_ASSISTANT_EMAIL,
  firstName:
    process.env.AI_ASSISTANT_FIRST_NAME || DEFAULT_ASSISTANT_FIRST_NAME,
  lastName: process.env.AI_ASSISTANT_LAST_NAME || DEFAULT_ASSISTANT_LAST_NAME,
  image: process.env.AI_ASSISTANT_IMAGE,
  color: Number(process.env.AI_ASSISTANT_COLOR) || 0,
  prompt: process.env.AI_ASSISTANT_SYSTEM_PROMPT || DEFAULT_ASSISTANT_PROMPT,
  password: process.env.AI_ASSISTANT_PASSWORD,
  model: process.env.GEMINI_MODEL || "gemini-1.5-flash-latest",
  temperature:
    process.env.AI_ASSISTANT_TEMPERATURE !== undefined
      ? Number(process.env.AI_ASSISTANT_TEMPERATURE)
      : 0.7,
  maxTokens:
    process.env.AI_ASSISTANT_MAX_TOKENS !== undefined
      ? Number(process.env.AI_ASSISTANT_MAX_TOKENS)
      : 400,
  historyLimit:
    process.env.AI_ASSISTANT_HISTORY_LIMIT !== undefined
      ? Number(process.env.AI_ASSISTANT_HISTORY_LIMIT)
      : 12,
});

const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY environment variable");
  }

  if (!generativeAIClient) {
    generativeAIClient = new GoogleGenerativeAI(apiKey, {
      apiVersion: "v1",
    });
  }

  return generativeAIClient;
};

const resolveModelName = (modelName) => {
  if (!modelName) {
    return modelName;
  }

  return modelName.startsWith("models/") ? modelName : `models/${modelName}`;
};

const getGeminiModel = (modelName, prompt) => {
  const client = getGeminiClient();

  return client.getGenerativeModel({
    model: resolveModelName(modelName),
    systemInstruction: prompt,
  });
};

export const ensureAiAssistantUser = async () => {
  if (cachedAssistant) {
    return cachedAssistant;
  }

  const {
    email,
    firstName,
    lastName,
    image,
    color,
    password,
  } = getAssistantConfig();

  let assistant = await User.findOne({ email });
  if (!assistant) {
    const salt = await bcrypt.genSalt(10);
    const pepper = process.env.PEPPER_STRING || "";
    const fallbackPassword = password || crypto.randomBytes(24).toString("hex");
    const hashedPassword = await bcrypt.hash(
      `${salt}${fallbackPassword}${pepper}`,
      10
    );

    assistant = await User.create({
      email,
      password: hashedPassword,
      salt,
      firstName,
      lastName,
      image,
      color,
      profileSetup: true,
    });
  }

  cachedAssistant = assistant;
  return assistant;
};

const mapConversationToGemini = (conversation, assistantId) => {
  return conversation
    .filter((message) => message.messageType === "text" && message.content)
    .map((message) => ({
      role:
        message.sender.toString() === assistantId.toString()
          ? "model"
          : "user",
      parts: [{ text: message.content }],
    }));
};

export const generateAssistantReply = async (userId, assistantId) => {
  const {
    prompt,
    model,
    temperature,
    maxTokens,
    historyLimit,
  } = getAssistantConfig();

  const conversationDocs = await Message.find({
    $or: [
      { sender: userId, recipient: assistantId },
      { sender: assistantId, recipient: userId },
    ],
  })
    .sort({ timestamp: -1 })
    .limit(historyLimit)
    .lean();

  const conversation = conversationDocs.reverse();

  let contents = mapConversationToGemini(conversation, assistantId);

  const hasUserMessage = contents.some((message) => message.role === "user");
  if (!hasUserMessage) {
    const latestUserMessage = await Message.findOne({
      sender: userId,
      recipient: assistantId,
      messageType: "text",
    })
      .sort({ timestamp: -1 })
      .lean();

    if (latestUserMessage?.content) {
      contents = [
        ...contents,
        {
          role: "user",
          parts: [{ text: latestUserMessage.content }],
        },
      ];
    }
  }

  if (contents.length === 0) {
    throw new Error("No user messages available for the assistant to reply to");
  }

  const modelClient = getGeminiModel(model, prompt);
  const generationOptions = {
    temperature,
  };

  if (Number.isFinite(maxTokens) && maxTokens > 0) {
    generationOptions.maxOutputTokens = maxTokens;
  }

  const result = await modelClient.generateContent({
    contents,
    generationConfig: generationOptions,
  });

  const assistantReply = result.response?.text()?.trim();
  if (!assistantReply) {
    throw new Error("Assistant returned an empty response");
  }

  return assistantReply;
};

export const getAssistantPublicProfile = async () => {
  const assistant = await ensureAiAssistantUser();
  return {
    _id: assistant._id,
    email: assistant.email,
    firstName: assistant.firstName,
    lastName: assistant.lastName,
    image: assistant.image,
    color: assistant.color,
  };
};
