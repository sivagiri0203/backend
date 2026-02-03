import crypto from "crypto";
import FlightCache from "../models/FlightCache.js";
import { aviationstackFlights } from "../config/aviationstack.js";
import { bad, ok } from "../utils/response.js";

// create a stable cache key from query
function makeKey(obj) {
  const json = JSON.stringify(obj, Object.keys(obj).sort());
  return crypto.createHash("sha256").update(json).digest("hex");
}

// Normalize AviationStack response into your app-friendly shape
function normalizeFlights(apiData) {
  const rows = Array.isArray(apiData?.data) ? apiData.data : [];

  return rows.map((f) => ({
    provider: "aviationstack",
    flight_date: f?.flight_date,
    flight_status: f?.flight_status,

    airline: {
      name: f?.airline?.name,
      iata: f?.airline?.iata,
      icao: f?.airline?.icao
    },

    flight: {
      number: f?.flight?.number,
      iata: f?.flight?.iata,
      icao: f?.flight?.icao
    },

    departure: {
      airport: f?.departure?.airport,
      iata: f?.departure?.iata,
      icao: f?.departure?.icao,
      scheduled: f?.departure?.scheduled,
      estimated: f?.departure?.estimated,
      terminal: f?.departure?.terminal,
      gate: f?.departure?.gate
    },

    arrival: {
      airport: f?.arrival?.airport,
      iata: f?.arrival?.iata,
      icao: f?.arrival?.icao,
      scheduled: f?.arrival?.scheduled,
      estimated: f?.arrival?.estimated,
      terminal: f?.arrival?.terminal,
      gate: f?.arrival?.gate
    },

    live: f?.live || null,
    raw: f
  }));
}

/**
 * GET /api/flights/search?depIata=MAA&arrIata=DEL&date=2026-02-10&limit=50
 * AviationStack expects access_key + optional filters. flight_date format YYYY-MM-DD. :contentReference[oaicite:3]{index=3}
 */
export async function searchFlights(req, res) {
  try {
    // ✅ accept both correct keys + old typo keys (from your frontend/netlify build)
    const depIataRaw = req.query.depIata || req.query.deplata;
    const arrIataRaw = req.query.arrIata || req.query.arrlata;

    const {
      date,
      airlineIata,
      flightNumber,
      flightIata,
      limit
    } = req.query;

    const depIata = (depIataRaw || "").trim().toUpperCase();
    const arrIata = (arrIataRaw || "").trim().toUpperCase();

    if (!depIata || !arrIata) {
      return bad(res, "depIata and arrIata are required (IATA codes)");
    }

    // ✅ normalize date to YYYY-MM-DD
    let safeDate = undefined;
    if (date) {
      const d = String(date).trim();

      // already YYYY-MM-DD
      if (/^\d{4}-\d{2}-\d{2}$/.test(d)) safeDate = d;

      // convert DD-MM-YYYY -> YYYY-MM-DD
      else if (/^\d{2}-\d{2}-\d{4}$/.test(d)) {
        const [dd, mm, yyyy] = d.split("-");
        safeDate = `${yyyy}-${mm}-${dd}`;
      }
    }

    const query = {
      dep_iata: depIata,
      arr_iata: arrIata,
      ...(safeDate ? { flight_date: safeDate } : {}),
      ...(airlineIata ? { airline_iata: airlineIata } : {}),
      ...(flightNumber ? { flight_number: flightNumber } : {}),
      ...(flightIata ? { flight_iata: flightIata } : {}),
      limit: Math.min(Number(limit || 50), 100),
    };

    const key = makeKey(query);

    // ✅ cache 5 min
    const cached = await FlightCache.findOne({ key });
    if (cached && cached.expiresAt > new Date()) {
      return ok(res, { fromCache: true, results: cached.data.results }, "Flights fetched (cache)");
    }

    const apiData = await aviationstackFlights(query);
    const results = normalizeFlights(apiData);

    await FlightCache.findOneAndUpdate(
      { key },
      {
        key,
        query,
        data: { results },
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      },
      { upsert: true, new: true }
    );

    return ok(res, { fromCache: false, results }, "Flights fetched");
  } catch (err) {
    // ✅ show actual AviationStack message to frontend
    const apiError = err?.response?.data;
    const msg =
      apiError?.error?.message ||
      apiError?.message ||
      err.message ||
      "Flight search failed";

    return bad(res, msg, { error: apiError || err.message });
  }
}


/**
 * GET /api/flights/status?flightIata=AI202
 * Uses /v1/flights filters (flight_iata / flight_number etc.) :contentReference[oaicite:5]{index=5}
 */
export async function getFlightStatus(req, res) {
  try {
    const { flightIata, flightNumber, date } = req.query;
    if (!flightIata && !flightNumber) return bad(res, "flightIata or flightNumber required");

    const query = {
      ...(date ? { flight_date: date } : {}),
      ...(flightIata ? { flight_iata: flightIata } : {}),
      ...(flightNumber ? { flight_number: flightNumber } : {}),
      limit: 10
    };

    const apiData = await aviationstackFlights(query);
    const results = normalizeFlights(apiData);

    return ok(res, { results }, "Flight status fetched");
  } catch (err) {
    return bad(res, "Flight status fetch failed", { error: err?.response?.data || err.message });
  }
}
