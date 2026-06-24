import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { markPaid } from "@/lib/session-store";

// Clients are initialized lazily so this module can be imported during
// `next build` without env vars present in the build environment.
let _stripe: Stripe | null = null;
function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY must be set");
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return _stripe;
}

function getWebhookSecret(): string {
  if (!process.env.STRIPE_WEBHOOK_SECRET) throw new Error("STRIPE_WEBHOOK_SECRET must be set");
  return process.env.STRIPE_WEBHOOK_SECRET;
}

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing signature." }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    // req.text() returns the raw body in Next.js App Router (NextRequest wraps
    // the Web Fetch Request and never auto-parses). Do NOT switch to req.json()
    // here, parsed body breaks Stripe's HMAC signature verification.
    const rawBody = await req.text();
    event = getStripe().webhooks.constructEvent(rawBody, sig, getWebhookSecret());
  } catch {
    return NextResponse.json({ error: "Webhook signature verification failed." }, { status: 400 });
  }

  // checkout.session.completed fires immediately for synchronous payment methods (cards).
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.payment_status === "paid") {
      await markPaid(session.id);
    } else {
      // Completed but not paid: BNPL, expired session, or async flow.
      // Log for visibility; the async_payment_succeeded event will follow if payment clears.
      console.warn("[stripe] checkout.session.completed with payment_status:", session.payment_status, "session:", session.id.slice(-8));
    }
  // checkout.session.async_payment_succeeded fires for ACH, SEPA, and other
  // async payment methods where payment_status is not "paid" at completion time.
  } else if (event.type === "checkout.session.async_payment_succeeded") {
    const session = event.data.object as Stripe.Checkout.Session;
    await markPaid(session.id);
  }

  return NextResponse.json({ received: true });
}
