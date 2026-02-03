import "./config/env.js"; // ✅ keep FIRST

import express from "express";
import cors from "cors";

import { connectDB } from "./config/db.js";

import authRoutes from "./routes/auth.routes.js";
import flightsRoutes from "./routes/flights.routes.js";
import bookingsRoutes from "./routes/bookings.routes.js";
import paymentsRoutes from "./routes/payments.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import amadeusRoutes from "./routes/amadeus.routes.js";

import { notFound, errorHandler } from "./middleware/error.middleware.js";
import { startFlightStatusCron } from "./jobs/flightStatus.cron.js";

const app = express();

// ✅ Body parsers
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

// ✅ CORS (SAFE with credentials)
const allowedOrigins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      // allow Postman/curl (no origin)
      if (!origin) return cb(null, true);

      // allow all if env not set (local dev)
      if (allowedOrigins.length === 0) return cb(null, true);

      if (allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true,
  })
);

// ✅ Health
app.get("/", (req, res) => {
  res.json({ success: true, message: "Flight Booking Backend running ✅" });
});

// ✅ Routes
app.use("/api/auth", authRoutes);
app.use("/api/flights", flightsRoutes);
app.use("/api/bookings", bookingsRoutes);
app.use("/api/payments", paymentsRoutes);
app.use("/api/admin", adminRoutes);

// ✅ Amadeus
app.use("/api/amadeus", amadeusRoutes);

// ✅ 404 + error
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

async function start() {
  const required = ["MONGO_URI", "JWT_SECRET"];
  const missing = required.filter((k) => !process.env[k]);

  if (missing.length) {
    console.error("❌ Missing ENV vars:", missing.join(", "));
    process.exit(1);
  }

  await connectDB(process.env.MONGO_URI);

  // ✅ Start cron after DB is ready
  startFlightStatusCron();

  app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log("RAZORPAY_KEY_ID:", process.env.RAZORPAY_KEY_ID ? "✅ Loaded" : "❌ Missing");
    console.log("AMADEUS_CLIENT_ID:", process.env.AMADEUS_CLIENT_ID ? "✅ Loaded" : "❌ Missing");
  });
}

start();
