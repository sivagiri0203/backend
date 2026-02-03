import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { bad, created, ok } from "../utils/response.js";

function signToken(user) {
  return jwt.sign(
    { id: user._id.toString(), role: user.role, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
}

export async function register(req, res) {
  try {
    const { name, email, password } = req.body;

    if (!email || !password) return bad(res, "Email and password are required");
    if (password.length < 6) return bad(res, "Password must be at least 6 characters");

    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) return bad(res, "Email already registered");

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      name: name?.trim() || "",
      email: email.toLowerCase(),
      passwordHash,
      role: "user"
    });

    const token = signToken(user);

    return created(
      res,
      { token, user: { id: user._id, name: user.name, email: user.email, role: user.role } },
      "Registered successfully"
    );
  } catch (err) {
    return bad(res, err.message || "Registration failed");
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) return bad(res, "Email and password are required");

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return bad(res, "Invalid email or password");

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) return bad(res, "Invalid email or password");

    const token = signToken(user);

    return ok(
      res,
      { token, user: { id: user._id, name: user.name, email: user.email, role: user.role } },
      "Login successful"
    );
  } catch (err) {
    return bad(res, err.message || "Login failed");
  }
}

export async function me(req, res) {
  const user = await User.findById(req.user.id).select("-passwordHash");
  if (!user) return bad(res, "User not found");
  return ok(res, { user }, "Profile fetched");
}