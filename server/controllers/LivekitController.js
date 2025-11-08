import dotenv from "dotenv";
import { AccessToken } from "livekit-server-sdk";

dotenv.config();

export const getLivekitToken = async (req, res) => {
  try {
    const { room } = req.query;
    const identity = req.userId || req.query.identity;

    if (!process.env.LIVEKIT_API_KEY || !process.env.LIVEKIT_API_SECRET) {
      return res.status(500).json({ error: "LiveKit credentials not configured" });
    }
    if (!process.env.LIVEKIT_URL) {
      return res.status(500).json({ error: "LIVEKIT_URL not configured" });
    }
    if (!room) {
      return res.status(400).json({ error: "Missing room parameter" });
    }
    if (!identity) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const at = new AccessToken(process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_API_SECRET, {
      identity: String(identity),
    });
    at.addGrant({
      room: String(room),
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
    });

    const token = await at.toJwt();
    return res.json({ token, url: process.env.LIVEKIT_URL });
  } catch (err) {
    console.error("Failed to mint LiveKit token", err);
    return res.status(500).json({ error: "Failed to mint token" });
  }
};

