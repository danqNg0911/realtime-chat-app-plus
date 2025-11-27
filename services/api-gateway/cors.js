const DEFAULT_ORIGINS = [
  "http://localhost:5173", // Vite dev
  "http://localhost:3000", // React default
  "http://localhost:30080", // k8s NodePort for client
];

const toArray = (input) => {
  if (!input) {
    return [];
  }

  if (Array.isArray(input)) {
    return input.flatMap((value) => toArray(value));
  }

  return String(input)
    .split(/[,\s]+/)
    .map((value) => value.trim())
    .filter(Boolean);
};

const isLocalhostOrigin = (origin = "") =>
  /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);

export const getAllowedOrigins = (
  rawOrigins = process.env.ALLOWED_ORIGINS || process.env.ORIGIN
) => {
  const parsedOrigins = toArray(rawOrigins);
  return parsedOrigins.length ? parsedOrigins : DEFAULT_ORIGINS;
};

export const getPrimaryOrigin = () => getAllowedOrigins()[0];

export const buildCorsOptions = (overrides = {}) => {
  const allowedOrigins = getAllowedOrigins();

  return {
    origin(origin, callback) {
      if (!origin) {
        return callback(null, true);
      }

      if (isLocalhostOrigin(origin) || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
    credentials: true,
    optionsSuccessStatus: 204,
    ...overrides,
  };
};

export const socketOrigins = (...extraOrigins) => {
  const allowedOrigins = getAllowedOrigins();
  const extras = toArray(extraOrigins);
  const combined = [...allowedOrigins, ...extras].filter(Boolean);
  return Array.from(new Set(combined));
};

export default getAllowedOrigins;
