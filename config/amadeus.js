import axios from "axios";

let tokenCache = {
  access_token: null,
  expires_at: 0,
};

export async function getAmadeusToken() {
  const now = Date.now();
  if (tokenCache.access_token && tokenCache.expires_at > now + 10_000) {
    return tokenCache.access_token;
  }

  const baseURL = process.env.AMADEUS_BASE_URL || "https://test.api.amadeus.com";
  const url = `${baseURL}/v1/security/oauth2/token`;

  const params = new URLSearchParams();
  params.append("grant_type", "client_credentials");
  params.append("client_id", process.env.AMADEUS_CLIENT_ID);
  params.append("client_secret", process.env.AMADEUS_CLIENT_SECRET);

  const res = await axios.post(url, params, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    timeout: 20000,
  });

  const { access_token, expires_in } = res.data;

  tokenCache.access_token = access_token;
  tokenCache.expires_at = Date.now() + expires_in * 1000;

  return access_token;
}

export async function amadeusGet(path, params = {}) {
  const baseURL = process.env.AMADEUS_BASE_URL || "https://test.api.amadeus.com";
  const token = await getAmadeusToken();

  const res = await axios.get(`${baseURL}${path}`, {
    params,
    headers: { Authorization: `Bearer ${token}` },
    timeout: 20000,
  });

  return res.data;
}
