// controllers/bookings.controller.js
import Booking from "../models/Booking.js";
import User from "../models/User.js";
import FlightStatus from "../models/FlightStatus.js";
import { generatePNR } from "../utils/generatePNR.js";
import { bad, created, ok } from "../utils/response.js";
import { sendBookingEmail } from "../utils/sendEmail.js";

/**
 * Normalize BOTH AviationStack flight object and Amadeus offer object
 * into your Booking.flight schema (flightSchema).
 */
function normalizeFlightForBooking(flight) {
  // -------------------------
  // Case A: AviationStack style
  // -------------------------
  // AviationStack search results look like:
  // flight.flight.iata, departure.iata, arrival.iata, airline.name, etc.
  if (flight?.flight || flight?.departure || flight?.arrival) {
    return {
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

      depScheduled: flight?.departure?.scheduled,
      arrScheduled: flight?.arrival?.scheduled,

      status: flight?.flight_status || flight?.status,
      raw: flight?.raw || flight
    };
  }

  // -------------------------
  // Case B: Amadeus style
  // -------------------------
  // You might pass:
  // 1) raw Amadeus offer OR
  // 2) your converted object from frontend (offerToFlight) that contains rawOffer
  const rawOffer = flight?.rawOffer || flight;

  const itinerary = rawOffer?.itineraries?.[0];
  const segments = itinerary?.segments || [];
  const first = segments[0];
  const last = segments[segments.length - 1];

  const depIata =
    flight?.departure?.iata ||
    flight?.depIata ||
    first?.departure?.iataCode ||
    first?.departure?.iata;

  const arrIata =
    flight?.arrival?.iata ||
    flight?.arrIata ||
    last?.arrival?.iataCode ||
    last?.arrival?.iata;

  const airlineIata =
    flight?.airline?.iata ||
    rawOffer?.validatingAirlineCodes?.[0] ||
    first?.carrierCode;

  const flightNo =
    flight?.flight?.iata ||
    flight?.flightIata ||
    (first?.carrierCode && first?.number ? `${first.carrierCode}${first.number}` : undefined);

  const flightNumber =
    flight?.flight?.number ||
    (first?.number ? String(first.number) : undefined);

  const depScheduled =
    flight?.departure?.scheduled ||
    flight?.depScheduled ||
    first?.departure?.at;

  const arrScheduled =
    flight?.arrival?.scheduled ||
    flight?.arrScheduled ||
    last?.arrival?.at;

  return {
    provider: "amadeus",
    flightIata: flightNo,
    flightIcao: undefined,
    flightNumber: flightNumber,

    airlineName: airlineIata || "Airline",
    airlineIata: airlineIata,

    depIata: depIata,
    arrIata: arrIata,

    // Amadeus provides only codes in offers unless you map airports
    depAirport: depIata,
    arrAirport: arrIata,

    depScheduled: depScheduled,
    arrScheduled: arrScheduled,

    status: "offer",
    raw: rawOffer
  };
}

/**
 * POST /api/bookings
 * body:
 * {
 *   flight: (AviationStack flight OR Amadeus offer / mapped flight),
 *   passengers: [{fullName, age, gender}],
 *   seats: ["12A","12B"],
 *   cabinClass: "economy",
 *   amount: 4999,
 *   addOns: { extraLegroom: true, extraLuggageKg: 5 }
 * }
 */
export async function createBooking(req, res) {
  try {
    const { flight, passengers, seats, cabinClass, amount, addOns } = req.body;

    if (!flight) return bad(res, "Invalid flight selection");
    if (!Array.isArray(passengers) || passengers.length === 0)
      return bad(res, "Passengers required");
    if (!amount || Number(amount) <= 0) return bad(res, "Valid amount required");

    const userId = req.user.id;
    const pnr = generatePNR();

    // Normalize flight object to match your Booking.flight schema
    const normalizedFlight = normalizeFlightForBooking(flight);

    if (!normalizedFlight?.depIata || !normalizedFlight?.arrIata) {
      return bad(res, "Invalid flight data (missing route).");
    }

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

      // ✅ requires you to add addOns field in Booking model
      addOns: {
        extraLegroom: !!addOns?.extraLegroom,
        extraLuggageKg: Number(addOns?.extraLuggageKg || 0)
      },

      flight: normalizedFlight
    });

    // Create initial FlightStatus row (works best for AviationStack)
    await FlightStatus.create({
      booking: booking._id,
      flightIata: booking.flight.flightIata || booking.flight.flightNumber,
      lastStatus: booking.flight.status || "unknown",
      lastPayload: booking.flight.raw || {},
      lastCheckedAt: new Date()
    });

    // Email (non-blocking)
    const user = await User.findById(userId);
    if (user?.email) {
      const html = `
        <div style="font-family:Arial,sans-serif;line-height:1.5">
          <h2>Booking Created ✅</h2>
          <p><b>PNR:</b> ${booking.pnr}</p>
          <p><b>Route:</b> ${booking.flight.depIata} → ${booking.flight.arrIata}</p>
          <p><b>Seats:</b> ${(booking.seats || []).join(", ") || "Not selected"}</p>
          <p><b>Extra legroom:</b> ${booking.addOns?.extraLegroom ? "Yes" : "No"}</p>
          <p><b>Extra luggage:</b> ${booking.addOns?.extraLuggageKg || 0} kg</p>
          <p><b>Amount:</b> ₹${booking.amount}</p>
          <p>Complete your payment to confirm.</p>
        </div>
      `;

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
    return bad(res, err?.message || "Booking failed");
  }
}

/**
 * GET /api/bookings/me
 */
export async function myBookings(req, res) {
  const bookings = await Booking.find({ user: req.user.id }).sort({ createdAt: -1 });
  return ok(res, { bookings }, "My bookings");
}

/**
 * GET /api/bookings/:id
 */
export async function getBooking(req, res) {
  const booking = await Booking.findOne({ _id: req.params.id, user: req.user.id });
  if (!booking) return bad(res, "Booking not found");
  return ok(res, { booking }, "Booking details");
}

/**
 * PATCH /api/bookings/:id/cancel
 */
export async function cancelBooking(req, res) {
  const booking = await Booking.findOne({ _id: req.params.id, user: req.user.id });
  if (!booking) return bad(res, "Booking not found");

  if (booking.bookingStatus === "cancelled") {
    return ok(res, { booking }, "Booking already cancelled");
  }

  booking.bookingStatus = "cancelled";
  await booking.save();

  return ok(res, { booking }, "Booking cancelled");
}
