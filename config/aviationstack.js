import axios from "axios";

export const aviationstack = axios.create({
  baseURL: process.env.AVIATIONSTACK_BASE_URL || "https://api.aviationstack.com/v1",
  timeout: 15000
});

export async function aviationstackFlights(params) {
  const access_key = process.env.AVIATIONSTACK_ACCESS_KEY;
  if (!access_key) throw new Error("Missing AVIATIONSTACK_ACCESS_KEY");

  const res = await aviationstack.get("/flights", {
    params: { access_key, ...params }
  });

  return res.data;
}
