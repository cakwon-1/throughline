import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { save } from "@/lib/session-store";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  const { resume, jd } = await req.json();

  if (!resume?.trim() || !jd?.trim()) {
    return NextResponse.json({ error: "Missing resume or job description." }, { status: 400 });
  }

  const base = process.env.NEXT_PUBLIC_BASE_URL!;

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: 99, // $0.99
          product_data: {
            name: "Throughline Resume Screen",
            description: "One AI screener pass — see your score, flags, and rewrites.",
          },
        },
        quantity: 1,
      },
    ],
    success_url: `${base}/?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/?cancelled=1`,
  });

  await save(session.id, resume, jd);

  return NextResponse.json({ url: session.url });
}
