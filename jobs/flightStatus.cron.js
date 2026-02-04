import cron from "node-cron";
import FlightStatus from "../models/FlightStatus.js";

const CRON_EXPR = process.env.FLIGHT_STATUS_CRON || "*/10 * * * *";

/**
 * Uses Amadeus Flight Status endpoint:
 * GET /v2/schedule/flights?carrierCode=AI&flightNumber=202&scheduledDepartureDate=2026-02-11
 */
async function amadeusGetFlightStatus({ carrierCode, flightNumber, date }) {
  const { getAmadeusClient } = await import("../config/amadeus.js");
  const amadeus = await getAmadeusClient();

  const res = await amadeus.get("/v2/schedule/flights", {
    carrierCode,
    flightNumber,
    scheduledDepartureDate: date, // YYYY-MM-DD
  });

  return res?.data || null;
}

function splitCarrierAndNumber(flightIataOrNumber = "") {
  // AI202 -> carrierCode=AI, flightNumber=202
  const clean = String(flightIataOrNumber).trim().toUpperCase();
  const match = clean.match(/^([A-Z0-9]{2,3})(\d{1,4})$/);
  if (!match) return null;
  return { carrierCode: match[1], flightNumber: match[2] };
}

export function startFlightStatusCron() {
  cron.schedule(CRON_EXPR, async () => {
    try {
      console.log("⏱️ Flight status cron (Amadeus): running...");

      const trackers = await FlightStatus.find({}).limit(50);

      for (const t of trackers) {
        // we stored flightIata or flightNumber in DB earlier
        const parsed =
          splitCarrierAndNumber(t.flightIata) ||
          splitCarrierAndNumber(t.flightNumber);

        if (!parsed) continue;

        // if you stored booking date inside tracker, use that.
        // else fallback to today
        const date =
          (t.scheduledDepartureDate &&
            String(t.scheduledDepartureDate).slice(0, 10)) ||
          new Date().toISOString().slice(0, 10);

        const data = await amadeusGetFlightStatus({
          carrierCode: parsed.carrierCode,
          flightNumber: parsed.flightNumber,
          date,
        });

        // store full response
        t.lastPayload = data;
        t.lastCheckedAt = new Date();

        // you can store a simple status summary
        // depending on response shape
        t.lastStatus =
          data?.data?.[0]?.flightPoints?.[0]?.departure?.timings?.[0]?.qualifier ||
          "updated";

        await t.save();
      }

      console.log("✅ Flight status cron (Amadeus): updated", trackers.length);
    } catch (err) {
      console.error(
        "❌ Flight status cron (Amadeus) error:",
        err?.response?.data || err.message
      );
    }
  });

  console.log("✅ Flight status cron scheduled:", CRON_EXPR);
}