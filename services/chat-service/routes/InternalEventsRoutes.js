import { Router } from "express";
import { getSocketIO } from "../socket.js";

const internalEventsRoutes = Router();
const INTERNAL_TOKEN = process.env.INTERNAL_API_TOKEN || "dev-internal-token";

const verifyInternalToken = (request, response, next) => {
  const token = request.headers["x-internal-token"];
  if (!token || token !== INTERNAL_TOKEN) {
    return response.status(401).json({ error: "Unauthorized internal request" });
  }
  return next();
};

const emitEvent = (eventName, payload) => {
  const io = getSocketIO();
  if (!io) {
    throw new Error("Socket server not initialised");
  }
  io.emit(eventName, payload);
};

internalEventsRoutes.post(
  "/photo-uploaded",
  verifyInternalToken,
  (request, response) => {
    emitEvent("newPhotoUploaded", request.body);
    return response.status(202).json({ status: "queued" });
  }
);

internalEventsRoutes.post(
  "/photo-liked",
  verifyInternalToken,
  (request, response) => {
    emitEvent("photoLiked", request.body);
    return response.status(202).json({ status: "queued" });
  }
);

internalEventsRoutes.post(
  "/photo-unliked",
  verifyInternalToken,
  (request, response) => {
    emitEvent("photoUnliked", request.body);
    return response.status(202).json({ status: "queued" });
  }
);

internalEventsRoutes.post(
  "/photo-deleted",
  verifyInternalToken,
  (request, response) => {
    emitEvent("photoDeleted", request.body);
    return response.status(202).json({ status: "queued" });
  }
);

export default internalEventsRoutes;
