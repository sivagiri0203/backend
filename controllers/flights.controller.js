import crypto from "crypto";
import { bad, ok } from "../utils/response.js";
import { amadeusGet } from "../config/amadeus.js";

// simple memory cache (optional)
const memCache = new Map();
const TTL = 5 * 60 * 1000;

function makeKey(obj) {
  const json = JSON.stringify(obj, Object.keys(obj).sort());
  return crypto.createHash("sha256").update(json).digest("hex");
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
function setCache(key, value) {
  memCache.set(key, { value, exp: Date.now() + TTL });
}

/**
 * GET /api/flights/search?depIata=MAA&arrIata=DEL&date=2026-02-11&adults=1&travelClass=ECONOMY&limit=20
 */
export async function searchFlights(req, res) {
  try {
    const { depIata, arrIata, date, adults, travelClass, limit } = req.query;

    if (!depIata || !arrIata) return bad(res, "depIata and arrIata are required");
    if (!date) return bad(res, "date is required (YYYY-MM-DD) for Amadeus offers");

    const query = {
      originLocationCode: String(depIata).toUpperCase(),
      destinationLocationCode: String(arrIata).toUpperCase(),
      departureDate: String(date).slice(0, 10), // YYYY-MM-DD
      adults: Number(adults || 1),
      travelClass: travelClass || "ECONOMY",
      currencyCode: "INR",
      max: Math.min(Number(limit || 20), 50),
    };

    const key = makeKey(query);
    const cached = getCache(key);
    if (cached) return ok(res, { fromCache: true, results: cached }, "Flights fetched (cache)");

    // Amadeus Flight Offers Search
    const data = await amadeusGet("/v2/shopping/flight-offers", query);

    const offers = Array.isArray(data?.data) ? data.data : [];

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
          name: seg?.carrierCode, // you can map later if you want
        },

        flight: {
          number: seg?.number,
          iata: `${seg?.carrierCode || ""}${seg?.number || ""}`,
        },

        departure: {
          iata: seg?.departure?.iataCode,
          scheduled: seg?.departure?.at,
        },

        arrival: {
          iata: seg?.arrival?.iataCode,
          scheduled: seg?.arrival?.at,
        },

        cabin: query.travelClass,
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

    const params = {
      carrierCode: String(carrierCode).toUpperCase(),
      flightNumber: String(flightNumber),
      scheduledDepartureDate: String(date).slice(0, 10),
    };

    const data = await amadeusGet("/v2/schedule/flights", params);

    return ok(res, { results: data?.data || [] }, "Flight status fetched");
  } catch (err) {
    return bad(res, "Flight status fetch failed", {
      error: err?.response?.data || err.message,
    });
  }
}