import express from "express";
import dotenv from "dotenv";
import cors from "cors";

import connectDB from "./config/db.js";

// routes
import authRoutes from "./routes/auth.routes.js";
import flightsRoutes from "./routes/flights.routes.js";
import bookingsRoutes from "./routes/bookings.routes.js";
import paymentsRoutes from "./routes/payments.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import amadeusRoutes from "./routes/amadeus.routes.js";

// middleware
import { errorMiddleware } from "./middleware/error.middleware.js";

dotenv.config();

const app = express();

// ---------- CORS ----------
const allowed = [
  process.env.CORS_ORIGIN, // single origin
  "http://localhost:5173",
  "http://localhost:3000",
].filter(Boolean);

// if you want multiple origins in env, use comma separated
const extra = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const allowedOrigins = [...new Set([...allowed, ...extra])];

app.use(
  cors({
    origin: function (origin, cb) {
      // allow requests with no origin (Postman, curl)
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true,
  })
);

// ---------- BODY PARSERS ----------
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

// ---------- HEALTH ----------
app.get("/", (req, res) => {
  res.json({ success: true, message: "FlyBook backend running ✅" });
});

app.get("/api/health", (req, res) => {
  res.json({ success: true, message: "OK", time: new Date().toISOString() });
});

// ---------- ROUTES ----------
app.use("/api/auth", authRoutes);
app.use("/api/flights", flightsRoutes);
app.use("/api/bookings", bookingsRoutes);
app.use("/api/payments", paymentsRoutes);
app.use("/api/admin", adminRoutes);

// ✅ Amadeus offers for pricing
app.use("/api/amadeus", amadeusRoutes);

// ---------- 404 ----------
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// ---------- ERROR ----------
app.use(errorMiddleware);

// ---------- START ----------
const PORT = process.env.PORT || 5000;

async function start() {
  await connectDB();
  app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
}

start();
