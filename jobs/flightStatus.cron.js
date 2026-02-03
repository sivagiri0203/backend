import cron from "node-cron";
import Booking from "../models/Booking.js";
import FlightStatus from "../models/FlightStatus.js";
import { aviationstackFlights } from "../config/aviationstack.js";

/**
 * Updates flight status for PAID + CONFIRMED bookings.
 * Uses /v1/flights with flight_iata filter (and optional date). :contentReference[oaicite:8]{index=8}
 */
export function startFlightStatusCron() {
  const schedule = process.env.FLIGHT_STATUS_CRON || "*/10 * * * *";

  cron.schedule(schedule, async () => {
    try {
      const bookings = await Booking.find({
        bookingStatus: "confirmed",
        paymentStatus: "paid"
      }).limit(50);

      for (const b of bookings) {
        const flightIata = b.flight.flightIata;
        if (!flightIata) continue;

        const params = { flight_iata: flightIata, limit: 5 };
        // optional: use flight_date if you store it (b.flight.raw?.flight_date)
        if (b.flight.raw?.flight_date) params.flight_date = b.flight.raw.flight_date;

        const apiData = await aviationstackFlights(params);
        const first = Array.isArray(apiData?.data) ? apiData.data[0] : null;

        if (!first) continue;

        const status = first?.flight_status || "unknown";

        await FlightStatus.findOneAndUpdate(
          { booking: b._id },
          {
            booking: b._id,
            flightIata,
            lastStatus: status,
            lastPayload: first,
            lastCheckedAt: new Date()
          },
          { upsert: true, new: true }
        );

        // keep booking.flight.status updated too
        b.flight.status = status;
        await b.save();
      }

      console.log("⏱️ Flight status cron: updated");
    } catch (err) {
      console.error("❌ Flight status cron error:", err?.message || err);
    }
  });

  console.log(`✅ Flight status cron scheduled: ${schedule}`);
}