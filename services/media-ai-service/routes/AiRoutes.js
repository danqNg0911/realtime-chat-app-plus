import { Router } from "express";
import { verifyToken } from "../middlewares/AuthMiddleware.js";
import {
  getAssistantProfile,
  triggerAssistantReply,
} from "../controllers/AiController.js";

const aiRoutes = Router();

aiRoutes.get("/assistant-profile", verifyToken, getAssistantProfile);
aiRoutes.post("/trigger-reply", verifyToken, triggerAssistantReply);

export default aiRoutes;
