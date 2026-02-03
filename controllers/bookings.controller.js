import Booking from "../models/Booking.js";
import User from "../models/User.js";
import FlightStatus from "../models/FlightStatus.js";
import { generatePNR } from "../utils/generatePNR.js";
import { bad, created, ok } from "../utils/response.js";
import { sendBookingEmail } from "../utils/sendEmail.js";

/**
 * POST /api/bookings
 * body: {
 *   flight: { ...normalized flight object you picked from /flights/search },
 *   passengers: [...],
 *   seats: ["12A","12B"],
 *   cabinClass: "economy",
 *   amount: 4999
 * }
 */
export async function createBooking(req, res) {
  try {
    const { flight, passengers, seats, cabinClass, amount } = req.body;

    if (!flight?.flight?.iata && !flight?.flight?.number) return bad(res, "Invalid flight selection");
    if (!Array.isArray(passengers) || passengers.length === 0) return bad(res, "Passengers required");
    if (!amount || Number(amount) <= 0) return bad(res, "Valid amount required");

    const userId = req.user.id;
    const pnr = generatePNR();

    const booking = await Booking.create({
      user: userId,
      pnr,
      passengers,
      seats: Array.isArray(seats) ? seats : [],
      cabinClass: cabinClass || "economy",
      amount: Number(amount),
      currency: "INR",
      paymentStatus: "pending",
      bookingStatus: "confirmed",
      flight: {
        provider: "aviationstack",
        flightIata: flight?.flight?.iata,
        flightIcao: flight?.flight?.icao,
        flightNumber: flight?.flight?.number,
        airlineName: flight?.airline?.name,
        airlineIata: flight?.airline?.iata,
        depIata: flight?.departure?.iata,
        arrIata: flight?.arrival?.iata,
        depAirport: flight?.departure?.airport,
        arrAirport: flight?.arrival?.airport,
        depScheduled: flight?.departure?.scheduled || flight?.selectedDate,
        arrScheduled: flight?.arrival?.scheduled,
        status: flight?.flight_status,
        raw: flight?.raw || flight
      }
    });

    // create initial FlightStatus tracker row
    await FlightStatus.create({
      booking: booking._id,
      flightIata: booking.flight.flightIata,
      lastStatus: booking.flight.status || "unknown",
      lastPayload: booking.flight.raw || {},
      lastCheckedAt: new Date()
    });

    // optional email now (or after payment in your flow)
    const user = await User.findById(userId);
    if (user?.email) {
      const html = `
        <div style="font-family:Arial,sans-serif;line-height:1.5">
          <h2>Booking Created ✅</h2>
          <p><b>PNR:</b> ${booking.pnr}</p>
          <p><b>Flight:</b> ${booking.flight.flightIata || booking.flight.flightNumber}</p>
          <p><b>Route:</b> ${booking.flight.depIata} → ${booking.flight.arrIata}</p>
          <p><b>Amount:</b> ₹${booking.amount}</p>
          <p>Complete your payment to confirm.</p>
        </div>
      `;
      // Don’t fail booking if email fails
      sendBookingEmail({
        toEmail: user.email,
        toName: user.name,
        subject: `Booking Created (PNR: ${booking.pnr})`,
        htmlContent: html,
        textContent: `Booking created. PNR: ${booking.pnr}`
      }).catch(() => {});
    }

    return created(res, { booking }, "Booking created");
  } catch (err) {
    return bad(res, err.message || "Booking failed");
  }
}

export async function myBookings(req, res) {
  const bookings = await Booking.find({ user: req.user.id }).sort({ createdAt: -1 });
  return ok(res, { bookings }, "My bookings");
}

export async function getBooking(req, res) {
  const booking = await Booking.findOne({ _id: req.params.id, user: req.user.id });
  if (!booking) return bad(res, "Booking not found");
  return ok(res, { booking }, "Booking details");
}

export async function cancelBooking(req, res) {
  const booking = await Booking.findOne({ _id: req.params.id, user: req.user.id });
  if (!booking) return bad(res, "Booking not found");

  booking.bookingStatus = "cancelled";
  await booking.save();

  return ok(res, { booking }, "Booking cancelled");
}