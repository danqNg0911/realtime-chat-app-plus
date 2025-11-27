import jwt from "jsonwebtoken";
import { createVerifyToken } from "../auth.js";

export const verifyToken = createVerifyToken(jwt);
