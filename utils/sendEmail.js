import { SendSmtpEmail } from "@getbrevo/brevo";
import { getBrevoEmailApi } from "../config/brevo.js";

export async function sendBookingEmail({ toEmail, toName, subject, htmlContent, textContent }) {
  const senderName = process.env.BREVO_SENDER_NAME;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;

  if (!process.env.BREVO_API_KEY) throw new Error("Missing BREVO_API_KEY");
  if (!senderName || !senderEmail) throw new Error("Missing BREVO sender (name/email)");

  const emailAPI = getBrevoEmailApi();

  const msg = new SendSmtpEmail();
  msg.subject = subject;
  if (htmlContent) msg.htmlContent = htmlContent;
  if (textContent) msg.textContent = textContent;

  msg.sender = { name: senderName, email: senderEmail };
  msg.to = [{ email: toEmail, name: toName || toEmail }];

  // returns Brevo response
  return emailAPI.sendTransacEmail(msg);
}