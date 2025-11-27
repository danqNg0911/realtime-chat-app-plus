import "./loadEnv.js";

const DEFAULT_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost:30080",
];

const sanitize = (value = "") => value.replace(/"|'/g, "").trim();

const splitOrigins = (value) =>
  sanitize(value)
    .split(/[,\s]+/)
    .map((origin) => origin.trim())
    .filter(Boolean);

const isLocalhostOrigin = (origin = "") =>
  /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);

export const resolveAllowedOrigins = (
  rawOrigins = process.env.ORIGIN || process.env.ALLOWED_ORIGINS,
  fallback = DEFAULT_ORIGINS
) => {
  if (!rawOrigins) {
    return fallback;
  }

  if (Array.isArray(rawOrigins)) {
    return rawOrigins.length > 0 ? rawOrigins : fallback;
  }

  const parsed = splitOrigins(rawOrigins);
  return parsed.length > 0 ? parsed : fallback;
};

const allowedOrigins = resolveAllowedOrigins();

export const isOriginAllowed = (origin = "") =>
  !origin || isLocalhostOrigin(origin) || allowedOrigins.includes(origin);

export default allowedOrigins;
