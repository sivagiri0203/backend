import User from "../models/User.js";
import Booking from "../models/Booking.js";
import Payment from "../models/Payment.js";
import { ok } from "../utils/response.js";

export async function analytics(req, res) {
  const [users, bookings, paymentsPaid] = await Promise.all([
    User.countDocuments(),
    Booking.countDocuments(),
    Payment.countDocuments({ status: "paid" })
  ]);

  const revenueAgg = await Payment.aggregate([
    { $match: { status: "paid" } },
    { $group: { _id: null, total: { $sum: "$amount" } } }
  ]);
  const revenue = revenueAgg?.[0]?.total || 0;

  const recentBookings = await Booking.find().sort({ createdAt: -1 }).limit(10);

  return ok(res, { users, bookings, paymentsPaid, revenue, recentBookings }, "Admin analytics");
}