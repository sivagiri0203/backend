import crypto from "crypto";
import { bad, ok } from "../utils/response.js";
import { getAmadeusClient } from "../config/amadeus.js";

// cache in memory (simple) — optional
const memCache = new Map();
const TTL = 5 * 60 * 1000;

function makeKey(obj) {
  const json = JSON.stringify(obj, Object.keys(obj).sort());
  return crypto.createHash("sha256").update(json).digest("hex");
}

function setCache(key, value) {
  memCache.set(key, { value, exp: Date.now() + TTL });
}

function getCache(key) {
  const hit = memCache.get(key);
  if (!hit) return null;
  if (Date.now() > hit.exp) {
    memCache.delete(key);
    return null;
  }
  return hit.value;
}

/**
 * GET /api/flights/search?depIata=MAA&arrIata=DEL&date=2026-02-11&adults=1&travelClass=ECONOMY&limit=20
 */
export async function searchFlights(req, res) {
  try {
    const { depIata, arrIata, date, adults, travelClass, limit } = req.query;

    if (!depIata || !arrIata) {
      return bad(res, "depIata and arrIata are required");
    }
    if (!date) {
      return bad(res, "date is required (YYYY-MM-DD) for Amadeus offers");
    }

    const query = {
      originLocationCode: String(depIata).toUpperCase(),
      destinationLocationCode: String(arrIata).toUpperCase(),
      departureDate: String(date).slice(0, 10),
      adults: Number(adults || 1),
      travelClass: travelClass || "ECONOMY",
      max: Math.min(Number(limit || 20), 50),
      currencyCode: "INR",
    };

    const key = makeKey(query);
    const cached = getCache(key);
    if (cached) return ok(res, { fromCache: true, results: cached }, "Flights fetched (cache)");

    const amadeus = await getAmadeusClient();
    const resp = await amadeus.get("/v2/shopping/flight-offers", query);

    const offers = resp?.data?.data || [];

    // normalize minimal fields for your frontend
    const results = offers.map((o) => {
      const firstIt = o?.itineraries?.[0];
      const seg = firstIt?.segments?.[0];

      return {
        provider: "amadeus",
        id: o.id,
        price: {
          total: o?.price?.total,
          currency: o?.price?.currency,
        },
        airline: {
          iata: seg?.carrierCode,
          name: seg?.carrierCode, // you can map carrier to name later
        },
        flight: {
          number: seg?.number,
          iata: `${seg?.carrierCode}${seg?.number}`,
        },
        departure: {
          iata: seg?.departure?.iataCode,
          at: seg?.departure?.at,
        },
        arrival: {
          iata: seg?.arrival?.iataCode,
          at: seg?.arrival?.at,
        },
        cabin: travelClass || "ECONOMY",
        raw: o,
      };
    });

    setCache(key, results);
    return ok(res, { fromCache: false, results }, "Flights fetched");
  } catch (err) {
    return bad(res, "Flight search failed", {
      error: err?.response?.data || err.message,
    });
  }
}

/**
 * GET /api/flights/status?carrierCode=AI&flightNumber=202&date=2026-02-11
 */
export async function getFlightStatus(req, res) {
  try {
    const { carrierCode, flightNumber, date } = req.query;

    if (!carrierCode || !flightNumber || !date) {
      return bad(res, "carrierCode, flightNumber, date are required");
    }

    const amadeus = await getAmadeusClient();
    const resp = await amadeus.get("/v2/schedule/flights", {
      carrierCode,
      flightNumber,
      scheduledDepartureDate: String(date).slice(0, 10),
    });

    return ok(res, { results: resp?.data?.data || [] }, "Flight status fetched");
  } catch (err) {
    return bad(res, "Flight status fetch failed", {
      error: err?.response?.data || err.message,
    });
  }
}