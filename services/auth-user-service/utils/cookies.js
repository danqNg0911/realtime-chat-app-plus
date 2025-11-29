const maxAge = 3 * 24 * 60 * 60 * 1000;

const inferCookieSecurity = () => {
  if (process.env.COOKIE_SECURE?.length) {
    return process.env.COOKIE_SECURE === "true";
  }
  const serverUrl = process.env.SERVER_URL || process.env.SERVER_PUBLIC_URL || "";
  return /^https:\/\//i.test(serverUrl);
};

const cookieSecure = inferCookieSecurity();
const cookieSameSite = cookieSecure ? "None" : "Lax";

const baseCookieOptions = {
  maxAge,
  sameSite: cookieSameSite,
  secure: cookieSecure,
  httpOnly: true,
};

export const authCookieOptions = baseCookieOptions;
export const authCookieMaxAge = maxAge;
export const clearAuthCookieOptions = {
  ...baseCookieOptions,
  maxAge: 1,
};
