import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { save, checkRateLimit } from "@/lib/session-store";
import { cookieName } from "@/lib/cookies";
import { randomUUID } from "crypto";
import { MAX_INPUT_LENGTH } from "@/lib/constants";

// Lazy initialization so this module can be imported during `next build`
// without env vars present in the build environment.
let _stripe: Stripe | null = null;
function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY must be set");
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return _stripe;
}

function getBase(): string {
  const base = process.env.APP_BASE_URL;
  if (!base?.startsWith("https://")) throw new Error("APP_BASE_URL must be set to an https:// URL");
  if (new URL(base).hostname !== "passtheaiscreener.com") throw new Error("APP_BASE_URL hostname must be passtheaiscreener.com");
  return base;
}

export async function POST(req: NextRequest) {
  // Read the rightmost x-forwarded-for value -- Railway appends the real client
  // IP at the end of the chain; reading [0] is attacker-controlled.
  const ip = req.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim() ?? "unknown";
  const allowed = await checkRateLimit(`checkout:${ip}`, 10, 60);
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  let body: { resume?: unknown; jd?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { resume, jd } = body;

  if (typeof resume !== "string" || typeof jd !== "string" || !resume.trim() || !jd.trim()) {
    return NextResponse.json({ error: "Missing resume or job description." }, { status: 400 });
  }

  if (resume.length > MAX_INPUT_LENGTH || jd.length > MAX_INPUT_LENGTH) {
    return NextResponse.json({ error: "Input too long." }, { status: 413 });
  }

  const accessToken = randomUUID();
  const base = getBase();

  const session = await getStripe().checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: 99,
          product_data: {
            name: "Pass the AI Screener: Resume Screen",
            description: "One AI screener pass. See your score, gap map, and rewrites.",
          },
        },
        quantity: 1,
      },
    ],
    success_url: `${base}/?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/?cancelled=1`,
  });

  if (!session.url) {
    console.error("[stripe] checkout session created with null url", { sessionId: session.id });
    return NextResponse.json({ error: "Couldn't start checkout. Please try again." }, { status: 500 });
  }

  await save(session.id, resume, jd, accessToken);

  const res = NextResponse.json({ url: session.url });
  res.cookies.set(cookieName(session.id), accessToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    maxAge: 60 * 60 * 2,
    path: "/",
  });

  return res;
}
