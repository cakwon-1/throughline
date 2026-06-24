import { createHmac } from "crypto";

export function getCookieSecret(): string {
  if (!process.env.COOKIE_SECRET) throw new Error("COOKIE_SECRET must be set");
  return process.env.COOKIE_SECRET;
}

// Cookie name is an HMAC of the session ID so it cannot be predicted from
// the public session_id URL parameter — prevents a third party who observes
// the session ID from guessing the cookie name and triggering a GET+DEL.
export function cookieName(sessionId: string): string {
  return `st_${createHmac("sha256", getCookieSecret()).update(sessionId).digest("hex").slice(0, 16)}`;
}
