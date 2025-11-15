const DEFAULT_ORIGINS = ["http://localhost:3000"];

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

export const getAllowedOrigins = () => {
  const rawOrigins = process.env.ALLOWED_ORIGINS || process.env.ORIGIN;
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

      if (allowedOrigins.includes(origin)) {
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
