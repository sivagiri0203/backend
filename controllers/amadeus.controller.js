import { amadeusGet } from "../config/amadeus.js";
import { bad, ok } from "../utils/response.js";

/**
 * GET /api/amadeus/offers?origin=MAA&destination=DEL&date=2026-02-11&adults=1&travelClass=ECONOMY
 */
export async function searchOffers(req, res) {
  try {
    const origin = (req.query.origin || "").toUpperCase();
    const destination = (req.query.destination || "").toUpperCase();
    const date = req.query.date; // YYYY-MM-DD
    const adults = Number(req.query.adults || 1);
    const travelClass = (req.query.travelClass || "ECONOMY").toUpperCase();
    const max = Math.min(Number(req.query.max || 20), 50);

    if (!origin || !destination) return bad(res, "origin and destination are required");
    if (!date) return bad(res, "date is required (YYYY-MM-DD)");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return bad(res, "date must be YYYY-MM-DD");
    if (!adults || adults < 1) return bad(res, "adults must be >= 1");

    // Amadeus Flight Offers Search
    const data = await amadeusGet("/v2/shopping/flight-offers", {
      originLocationCode: origin,
      destinationLocationCode: destination,
      departureDate: date,
      adults,
      travelClass,
      currencyCode: "INR",
      max,
    });

    const offers = (data?.data || []).map((o) => ({
      id: o.id,
      source: o.source,
      oneWay: o.oneWay,
      lastTicketingDate: o.lastTicketingDate,
      price: {
        currency: o?.price?.currency,
        total: o?.price?.total,
        base: o?.price?.base,
      },
      validatingAirlineCodes: o.validatingAirlineCodes,
      itineraries: o.itineraries,
      travelerPricings: o.travelerPricings,
      raw: o,
    }));

    return ok(res, { offers }, "Amadeus flight offers fetched");
  } catch (err) {
    const msg =
      err?.response?.data?.errors?.[0]?.detail ||
      err?.response?.data?.error_description ||
      err?.message ||
      "Amadeus search failed";

    return bad(res, msg, { error: err?.response?.data || err.message });
  }
}
