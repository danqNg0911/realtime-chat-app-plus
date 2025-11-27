import cors from "cors";

const DEFAULT_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost:30080",
];

const toArray = (input) =>
  String(input || "")
    .split(/[,\s]+/)
    .map((value) => value.trim())
    .filter(Boolean);

const isLocalhostOrigin = (origin = "") =>
  /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);

const getAllowedOrigins = () => {
  const raw = process.env.ALLOWED_ORIGINS || process.env.ORIGIN;
  const parsed = Array.isArray(raw) ? raw.flatMap(toArray) : toArray(raw);
  return parsed.length ? parsed : DEFAULT_ORIGINS;
};

export default cors({
  credentials: true,
  origin(origin, callback) {
    const allowedOrigins = getAllowedOrigins();

    if (!origin || isLocalhostOrigin(origin) || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
});
