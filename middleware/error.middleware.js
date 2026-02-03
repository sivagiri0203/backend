import { serverError } from "../utils/response.js";

export function notFound(req, res) {
  res.status(404).json({ success: false, message: "Route not found" });
}

export function errorHandler(err, req, res, next) {
  console.error("❌ Server error:", err);
  return serverError(res, "Something went wrong");
}