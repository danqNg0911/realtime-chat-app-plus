// This file has been removed.
export const createVerifyToken = (jwtLib) => {
  if (!jwtLib) {
    throw new Error("createVerifyToken requires a jwt implementation");
  }

  return (request, response, next) => {
    let token;
    const authHeader =
      request.headers?.authorization || request.headers?.Authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.replace(/Bearer\s+/i, "").trim();
    } else {
      token = request.cookies?.jwt;
    }

    if (!token) {
      return response.status(401).json({ error: "Unauthorized" });
    }

    jwtLib.verify(token, process.env.JWT_KEY, (error, payload) => {
      if (error) {
        return response.status(403).json({ error: "Token is invalid" });
      }

      request.userId = payload.userId;
      return next();
    });
  };
};
