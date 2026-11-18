import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

// Sends the shop's emails through the mailbox set in SMTP_* (for example a Hostinger email account).
// Without those settings, emails are skipped and logged; orders and sign-in are never blocked by email.

export type Email = { to: string; subject: string; text: string; html: string };

let transport: Transporter | null = null;

function settings() {
  const host = process.env.SMTP_HOST, user = process.env.SMTP_USER, pass = process.env.SMTP_PASSWORD;
  if (!host || !user || !pass) return null;
  const port = Number(process.env.SMTP_PORT || 465);
  return { host, port, user, pass, from: process.env.MAIL_FROM || `Kalacar <${user}>` };
}

export const emailEnabled = () => Boolean(settings());

/** True if the email was handed to the mail server. Never throws. */
export async function sendEmail(email: Email) {
  const config = settings();
  if (!config) { console.warn(`Email not sent (SMTP is not set up): ${email.subject}`); return false; }
  try {
    transport ??= nodemailer.createTransport({ host: config.host, port: config.port, secure: config.port === 465, auth: { user: config.user, pass: config.pass }, connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 20000 });
    await transport.sendMail({ from: config.from, replyTo: process.env.MAIL_REPLY_TO || undefined, ...email });
    return true;
  } catch (error) {
    console.error("Email failed:", error instanceof Error ? error.message : "unknown error");
    return false;
  }
}
