import "./loadEnv.js";

const sanitize = (value = "") => value.replace(/"|'/g, "").trim();

const splitOrigins = (value) =>
  sanitize(value)
    .split(/[,\s]+/)
    .map((origin) => origin.trim())
    .filter(Boolean);

const DEFAULT_ORIGINS = ["http://localhost:3000"];

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

export default allowedOrigins;
