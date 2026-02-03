import { TransactionalEmailsApi } from "@getbrevo/brevo";

export function getBrevoEmailApi() {
  const api = new TransactionalEmailsApi();
  // v3+ SDK uses this shape
  api.authentications.apiKey.apiKey = process.env.BREVO_API_KEY;
  return api;
}