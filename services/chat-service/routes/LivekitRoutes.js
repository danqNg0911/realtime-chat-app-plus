import { Router } from "express";
import { getLivekitToken } from "../controllers/LivekitController.js";
import { verifyToken } from "../middlewares/AuthMiddleware.js";

const livekitRoutes = Router();

livekitRoutes.get("/token", verifyToken, getLivekitToken);

export default livekitRoutes;
