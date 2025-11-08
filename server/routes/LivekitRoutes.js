import { Router } from "express";
import { getLivekitToken } from "../controllers/LivekitController.js";
import { verifyToken } from "../middlewares/AuthMiddleware.js";

const router = Router();

// Mint a LiveKit access token for the authenticated user
// GET /api/livekit/token?room=ROOM_NAME
router.get("/token", verifyToken, getLivekitToken);

export default router;

