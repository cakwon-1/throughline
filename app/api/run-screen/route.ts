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

  // Verify payment with Stripe
  const checkout = await stripe.checkout.sessions.retrieve(sessionId);
  if (checkout.payment_status !== "paid") {
    return NextResponse.json({ error: "Payment not confirmed." }, { status: 402 });
  }

  const payload = get(sessionId);
  if (!payload) {
    return NextResponse.json({ error: "Session expired or not found." }, { status: 404 });
  }

  const { resume, jd } = payload;

  const prompt = `You are an LLM-based resume screener of the kind used in 2026 hiring pipelines (semantic "Layer 2" screening, not keyword ATS). Evaluate the RESUME against the JOB DESCRIPTION the way such a screener would: judge demonstrated seniority/scope from language, requirements fit by meaning (not literal keywords), specificity and quantification of impact, coherence of the career narrative for THIS role, and authenticity (whether bullets read as generic AI-generated boilerplate that a modern screener would down-rank).

Return ONLY valid JSON, no markdown, no preamble, matching exactly:
{
 "overall": <integer 0-100>,
 "verdict": "advance" | "review" | "reject",
 "dimensions": [
   {"name":"Requirements match","score":<0-100>,"note":"<=14 words"},
   {"name":"Seniority signal","score":<0-100>,"note":"<=14 words"},
   {"name":"Quantified impact","score":<0-100>,"note":"<=14 words"},
   {"name":"Narrative fit","score":<0-100>,"note":"<=14 words"},
   {"name":"Authenticity","score":<0-100>,"note":"<=14 words"}
 ],
 "flags": [{"severity":"high"|"med","issue":"<short>","evidence":"<short line from resume>"}],
 "rewrites": [{"before":"<weak resume line>","after":"<stronger rewrite>","why":"<=12 words"}],
 "summary":"<2-3 sentence screener-voice verdict>"
}
Rules: verdict = advance if overall>=80, review if 60-79, reject if <60. Give 2-4 flags and 2-3 rewrites. Authenticity score is LOWER when text is generic/AI-sounding. Be specific and honest; do not flatter.

RESUME:
${resume}

JOB DESCRIPTION:
${jd}`;

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
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

  // Consume the session so it can't be replayed
  del(sessionId);

  return NextResponse.json(result);
}
