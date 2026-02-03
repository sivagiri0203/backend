import "./config/env.js"; // ✅ must be FIRST import

// ...rest same

import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import { connectDB } from "./config/db.js";
import authRoutes from "./routes/auth.routes.js";
import flightsRoutes from "./routes/flights.routes.js";
import bookingsRoutes from "./routes/bookings.routes.js";
import paymentsRoutes from "./routes/payments.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import { notFound, errorHandler } from "./middleware/error.middleware.js";
import { startFlightStatusCron } from "./jobs/flightStatus.cron.js";

const app = express();

app.use(express.json({ limit: "1mb" }));
app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(",") || "*",
    credentials: true
  })
);

app.get("/", (req, res) => {
  res.json({ success: true, message: "Flight Booking Backend running ✅" });
});

app.use("/api/auth", authRoutes);
app.use("/api/flights", flightsRoutes);
app.use("/api/bookings", bookingsRoutes);
app.use("/api/payments", paymentsRoutes);
app.use("/api/admin", adminRoutes);

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

  // start cron after DB is ready
  startFlightStatusCron();

  app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
}

start();

console.log("RAZORPAY_KEY_ID:", process.env.RAZORPAY_KEY_ID ? "✅ Loaded" : "❌ Missing");