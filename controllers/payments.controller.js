import crypto from "crypto";
import Booking from "../models/Booking.js";
import Payment from "../models/Payment.js";
import User from "../models/User.js";
import { getRazorpay } from "../config/razorpay.js";
import { bad, ok } from "../utils/response.js";
import { toPaise } from "../utils/money.js";
import { sendBookingEmail } from "../utils/sendEmail.js";

/**
 * POST /api/payments/create-order
 * body: { bookingId }
 * Creates Razorpay order for booking amount. Razorpay recommends creating an order for each payment. :contentReference[oaicite:6]{index=6}
 */
const razorpay = getRazorpay();
export async function createRazorpayOrder(req, res) {
  try {
    const { bookingId } = req.body;
    if (!bookingId) return bad(res, "bookingId required");

    const booking = await Booking.findOne({ _id: bookingId, user: req.user.id });
    if (!booking) return bad(res, "Booking not found");

    const amountPaise = toPaise(booking.amount);

    const order = await razorpay.orders.create({
      amount: amountPaise,
      currency: booking.currency || "INR",
      receipt: `rcpt_${booking.pnr}`,
      notes: { bookingId: booking._id.toString(), pnr: booking.pnr }
    });

    const payment = await Payment.create({
      user: req.user.id,
      booking: booking._id,
      provider: "razorpay",
      amount: booking.amount,
      currency: booking.currency || "INR",
      razorpayOrderId: order.id,
      status: "created",
      notes: order.notes || {}
    });

    return ok(
      res,
      {
        keyId: process.env.RAZORPAY_KEY_ID,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        bookingId: booking._id,
        paymentId: payment._id
      },
      "Razorpay order created"
    );
  } catch (err) {
    return bad(res, "Order creation failed", { error: err?.error || err.message });
  }
}

/**
 * POST /api/payments/verify
 * body: { bookingId, razorpay_order_id, razorpay_payment_id, razorpay_signature }
 * Signature verification recommended by Razorpay docs. :contentReference[oaicite:7]{index=7}
 */
export async function verifyRazorpayPayment(req, res) {
  try {
    const { bookingId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!bookingId) return bad(res, "bookingId required");
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return bad(res, "Missing razorpay fields");
    }

    const booking = await Booking.findOne({ _id: bookingId, user: req.user.id });
    if (!booking) return bad(res, "Booking not found");

    // create expected signature
    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expected = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expected !== razorpay_signature) {
      // mark payment failed if exists
      await Payment.findOneAndUpdate(
        { booking: booking._id, razorpayOrderId: razorpay_order_id },
        { status: "failed", razorpayPaymentId: razorpay_payment_id, razorpaySignature: razorpay_signature },
        { new: true }
      );
      booking.paymentStatus = "failed";
      await booking.save();

      return bad(res, "Payment verification failed");
    }

    // mark paid
    await Payment.findOneAndUpdate(
      { booking: booking._id, razorpayOrderId: razorpay_order_id },
      {
        status: "paid",
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature
      },
      { new: true, upsert: true }
    );

    booking.paymentStatus = "paid";
    await booking.save();

    // send confirmation email
    const user = await User.findById(req.user.id);
    if (user?.email) {
      const html = `
        <div style="font-family:Arial,sans-serif;line-height:1.5">
          <h2>Booking Confirmed ✅</h2>
          <p><b>PNR:</b> ${booking.pnr}</p>
          <p><b>Flight:</b> ${booking.flight.flightIata || booking.flight.flightNumber}</p>
          <p><b>Route:</b> ${booking.flight.depIata} → ${booking.flight.arrIata}</p>
          <p><b>Status:</b> ${booking.flight.status || "unknown"}</p>
          <p><b>Paid:</b> ₹${booking.amount}</p>
        </div>
      `;
      await sendBookingEmail({
        toEmail: user.email,
        toName: user.name,
        subject: `Booking Confirmed (PNR: ${booking.pnr})`,
        htmlContent: html,
        textContent: `Booking confirmed. PNR: ${booking.pnr}`
      });
    }

    return ok(res, { booking }, "Payment verified & booking confirmed");
  } catch (err) {
    return bad(res, "Verification failed", { error: err.message });
  }
}