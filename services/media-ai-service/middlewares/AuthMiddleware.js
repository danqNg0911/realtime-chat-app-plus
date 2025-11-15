import jwt from "jsonwebtoken";
import { createVerifyToken } from "../../shared/auth.js";

export const verifyToken = createVerifyToken(jwt);
