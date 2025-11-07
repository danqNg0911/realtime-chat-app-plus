import { Router } from "express";
import { verifyToken } from "../middlewares/AuthMiddleware.js";
import { getAssistantProfile } from "../controllers/AiController.js";

const aiRoutes = Router();

aiRoutes.get("/assistant-profile", verifyToken, getAssistantProfile);

export default aiRoutes;
