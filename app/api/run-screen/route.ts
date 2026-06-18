import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import Anthropic from "@anthropic-ai/sdk";
import { get, del } from "@/lib/session-store";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("session_id");
  if (!sessionId) {
    return NextResponse.json({ error: "Missing session_id." }, { status: 400 });
  }

  const checkout = await stripe.checkout.sessions.retrieve(sessionId);
  if (checkout.payment_status !== "paid") {
    return NextResponse.json({ error: "Payment not confirmed." }, { status: 402 });
  }

  const payload = await get(sessionId);
  if (!payload) {
    return NextResponse.json({ error: "Session expired or not found." }, { status: 404 });
  }

  const { resume, jd } = payload;

  const prompt = `You are a semantic resume analyst. Your job is to find the exact gap between what a job description demands and what a resume actually communicates — and close it with targeted rewrites.

Modern LLM screeners used by enterprise HR (Workday AI, HireVue, Eightfold, Greenhouse AI layers) do NOT do keyword matching. They embed both documents and measure semantic similarity. A resume that says "drove user growth" when the JD says "owned activation funnel" will score low even though a human would see the connection — because the semantic vectors don't align. Your job is to surface and fix those gaps.

STEP 1 — Extract the 8 most semantically loaded phrases from the JD. These are the concepts that carry the most weight: specific outcomes, required competencies, scope signals, methodologies. Not generic words like "collaborate" — specific ones like "activation funnel" or "cross-functional without authority."

STEP 2 — For each phrase, determine whether the resume addresses it semantically (not just lexically). Score the coverage 0-100.

STEP 3 — For the 3 lowest-coverage gaps, write a specific rewrite of an existing resume bullet that closes the gap. The rewrite must: use language that mirrors the JD's semantic field, add a quantified outcome, and sound like a real human wrote it (not AI boilerplate).

STEP 4 — Give an overall semantic alignment score and a screener verdict.

Return ONLY valid JSON, no markdown, no preamble:
{
  "overall": <integer 0-100>,
  "verdict": "advance" | "review" | "reject",
  "summary": "<2-3 sentences, direct and specific, written as a talent advisor — not a screener robot. Tell them the truth about why this lands where it does.>",
  "gaps": [
    {
      "phrase": "<exact phrase from JD>",
      "coverage": <0-100>,
      "status": "strong" | "partial" | "missing",
      "explanation": "<1 sentence: what the resume does or doesn't say about this>"
    }
  ],
  "rewrites": [
    {
      "gap": "<which JD phrase this closes>",
      "before": "<the weak or missing resume bullet — quote it exactly if it exists, or write '[No bullet addresses this]'>",
      "after": "<the rewrite — specific, quantified, semantically aligned to the JD phrase>",
      "why": "<one sentence: the specific semantic shift this makes>"
    }
  ]
}

Rules:
- verdict = advance if overall>=80, review if 60-79, reject if <60
- gaps array must have exactly 8 items
- rewrites array must have exactly 3 items, targeting the 3 lowest-coverage gaps
- Be brutally honest. Do not soften scores to be encouraging.
- Rewrites must sound human. No "spearheaded", "leveraged", "utilized", "results-driven".
- Each rewrite "after" must include at least one specific number or metric, even if estimated (use "~" prefix if estimated).

JOB DESCRIPTION:
${jd}

RESUME:
${resume}`;

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("")
    .trim()
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();

  const result = JSON.parse(text);

  await del(sessionId);

  return NextResponse.json(result);
}
