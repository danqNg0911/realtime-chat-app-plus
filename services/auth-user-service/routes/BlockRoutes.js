import { Router } from "express";
import {
  blockUser,
  unblockUser,
  getBlockedUsers,
  checkBlockStatus,
} from "../controllers/BlockController.js";
import { verifyToken } from "../middlewares/AuthMiddleware.js";

const blockRoutes = Router();

blockRoutes.post("/block-user", verifyToken, blockUser);
blockRoutes.post("/unblock-user", verifyToken, unblockUser);
blockRoutes.get("/blocked-users", verifyToken, getBlockedUsers);
blockRoutes.get("/check-block-status/:targetUserId", verifyToken, checkBlockStatus);

export default blockRoutes;
