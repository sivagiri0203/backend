import jwt from "jsonwebtoken";
import { unauthorized } from "../utils/response.js";

export function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return unauthorized(res, "Missing token");

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, role, email }
    next();
  } catch {
    return unauthorized(res, "Invalid/Expired token");
  }
}