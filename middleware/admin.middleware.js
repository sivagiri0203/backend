import { forbidden, unauthorized } from "../utils/response.js";

export function requireAdmin(req, res, next) {
  if (!req.user) return unauthorized(res, "Not authenticated");
  if (req.user.role !== "admin") return forbidden(res, "Admin only");
  next();
}