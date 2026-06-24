"use client";
import React, { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

const PALETTE = {
  paper: "#F4F6F9",
  surface: "#FFFFFF",
  ink: "#0A0F1E",
  inkSoft: "#5C6478",
  line: "#DDE2ED",
  system: "#0A0F1E",
  reject: "#E8000D",
  review: "#F5A500",
  advance: "#00A550",
};

const SAMPLE_RESUME = `JORDAN PARK
Product Manager

EXPERIENCE
Acme SaaS, Product Manager (2021-present)
- Responsible for the product roadmap and worked cross-functionally with engineering and design teams to deliver features.
- Leveraged data-driven insights to optimize user engagement and drive growth across the platform.
- Spearheaded various initiatives that improved the customer experience and aligned with strategic goals.

Brightline Inc, Associate Product Manager (2019-2021)
- Assisted with backlog grooming and supported senior PMs on feature launches.
- Helped coordinate releases and gathered customer feedback.

SKILLS
Roadmapping, Agile, Stakeholder management, SQL, Figma, A/B testing

EDUCATION
B.S. Economics, State University, 2019`;

const SAMPLE_JD = `Senior Product Manager, Growth
We're hiring a Senior PM to own our activation and retention funnel. You'll define the
growth roadmap, run experiments end to end, and partner with data science and engineering
to move core metrics. Requirements: 5+ years in product, proven record shipping growth
experiments with measurable revenue/retention impact, strong SQL and experimentation
fluency, and experience leading without authority across teams.`;

interface Gap {
  phrase: string;
  coverage: number;
  status: "strong" | "partial" | "missing";
  explanation: string;
}
interface Rewrite {
  gap: string;
  before: string;
  after: string;
  why: string;
}
interface ScreenResult {
  overall: number;
  verdict: "advance" | "review" | "reject";
  summary: string;
  gaps: Gap[];
  rewrites: Rewrite[];
}

function verdictMeta(v: string) {
  if (v === "advance") return { label: "Auto-advance", color: PALETTE.advance };
  if (v === "review") return { label: "Human review", color: PALETTE.review };
  return { label: "Auto-reject", color: PALETTE.reject };
}

function statusColor(s: string) {
  if (s === "strong") return PALETTE.advance;
  if (s === "partial") return PALETTE.review;
  return PALETTE.reject;
}

function statusLabel(s: string) {
  if (s === "strong") return "covered";
  if (s === "partial") return "partial";
  return "missing";
}

const BRIEF_SECTIONS = [
  {
    heading: "What's actually happening when you apply",
    body: "Large companies (Fortune 500, consulting firms, tech companies with thousands of applicants) have added an AI layer on top of traditional ATS systems like Workday and Greenhouse. Before a human recruiter sees your resume, an LLM reads both your resume and the job description and produces a ranked score. You're competing against that score, not a person.",
  },
  {
    heading: "It's semantic, not keyword-based",
    body: "The old advice was to mirror the job description word-for-word. That worked for keyword-scanning ATS. LLM screeners work differently: they embed both documents into vector space and measure conceptual distance. Your resume can use completely different words and still score well, as long as the underlying meaning aligns. Stuffing in keywords from the JD without substantive backing actually hurts you, because the model detects the mismatch between the words and the evidence.",
  },
  {
    heading: "What moves the score most",
    body: "Three things drive semantic alignment scores: (1) Scope language. Does your resume show ownership at the right level? Words like 'assisted' and 'supported' read junior. 'Owned', 'defined', and 'accountable for' read senior. (2) Specificity. Vague bullets like 'improved performance' have low information density. Screeners weight quantified outcomes heavily. (3) Domain coverage. Each JD has 6-10 conceptual pillars. Miss even one of them and the overall score drops sharply.",
  },
  {
    heading: "Why AI-written bullets backfire",
    body: "Screeners in 2025-26 are trained to detect and down-rank AI-generated boilerplate. Phrases like 'leveraged data-driven insights', 'spearheaded cross-functional initiatives', and 'results-driven professional' are statistically associated with low-quality, unsubstantiated resumes. They cluster in embedding space in ways the model has learned to penalize. A plainly-written specific bullet like 'cut support ticket volume 40% by rewriting onboarding flow' scores higher than any AI-polished version of the same claim.",
  },
  {
    heading: "What to do when you're applying to many jobs",
    body: "Tailoring every resume from scratch isn't realistic at volume. A better approach: keep a master resume with every substantive bullet you've ever written, then run each JD through a tool like this to find the 2-3 highest-impact swaps. You don't need to rewrite the whole document. You need to close the specific semantic gaps the screener will penalize. Each targeted swap takes 10 minutes and can move a reject to a review.",
  },
];

const EXAMPLE_RESULT: ScreenResult = {
  overall: 54,
  verdict: "reject",
  summary: "Jordan's resume reads as a generic PM profile that fails to demonstrate the growth-specific expertise this role demands. Bullet language is vague and passive, with no quantified outcomes and no evidence of end-to-end experiment ownership. The screener would auto-reject before a human ever sees this.",
  gaps: [
    { phrase: "activation and retention funnel", coverage: 15, status: "missing", explanation: "Resume never mentions activation, retention, or funnel ownership in any form." },
    { phrase: "end-to-end experiment ownership", coverage: 10, status: "missing", explanation: "No experiments mentioned. A/B testing is listed in skills but never demonstrated in context." },
    { phrase: "measurable revenue or retention impact", coverage: 8, status: "missing", explanation: "Zero metrics across all bullets. No revenue, retention, or any quantified outcome." },
    { phrase: "growth roadmap definition", coverage: 40, status: "partial", explanation: "'Responsible for the product roadmap' is close but doesn't specify growth context or scope." },
    { phrase: "data science partnership", coverage: 20, status: "missing", explanation: "No mention of data science collaboration or analytics partnerships anywhere." },
    { phrase: "SQL and experimentation fluency", coverage: 35, status: "partial", explanation: "SQL listed in skills but no evidence of use; experimentation absent from experience bullets." },
    { phrase: "leading without authority", coverage: 25, status: "missing", explanation: "'Cross-functionally' appears once but no evidence of influence-based leadership." },
    { phrase: "core metric ownership", coverage: 20, status: "missing", explanation: "No metrics mentioned as owned, tracked, or moved. The screener has nothing to anchor seniority to." },
  ],
  rewrites: [
    {
      gap: "end-to-end experiment ownership",
      before: "Leveraged data-driven insights to optimize user engagement and drive growth across the platform.",
      after: "Ran 14 A/B experiments on the onboarding funnel end-to-end (from hypothesis through analysis), lifting 7-day activation by 18% and contributing ~$1.1M ARR.",
      why: "Adds experiment count, end-to-end ownership signal, and a quantified outcome the screener can anchor to.",
    },
    {
      gap: "measurable revenue or retention impact",
      before: "Spearheaded various initiatives that improved the customer experience and aligned with strategic goals.",
      after: "Owned the SMB retention roadmap; reduced 90-day churn from 14% to 9% over two quarters by shipping 3 targeted re-engagement flows.",
      why: "Replaces vague ownership with a before/after retention metric and specific delivery evidence.",
    },
    {
      gap: "leading without authority",
      before: "Assisted with backlog grooming and supported senior PMs on feature launches.",
      after: "Coordinated release timelines across engineering, design, and marketing for 6 launches without direct authority. All shipped on schedule.",
      why: "Turns a passive support role into a cross-functional influence signal with a concrete delivery count.",
    },
  ],
};

function buildDiyPrompt(resume: string, jd: string) {
  const resumeText = resume.trim() || "[paste your resume here]";
  const jdText = jd.trim() || "[paste job description here]";
  return `You are a semantic resume screener. Analyze how well my resume aligns with this job description, not by keyword matching, but by semantic meaning, the way an LLM-based HR screener would.

Do the following:

1. Extract the 8 most semantically important concepts from the job description. Specific outcomes, competencies, scope signals, methodologies. Not generic words like "collaborate."

2. For each concept, tell me whether my resume covers it (strong / partial / missing) and in one sentence explain what the resume does or doesn't say about it.

3. For the 3 lowest-coverage gaps, rewrite a specific bullet from my resume to close the gap. Each rewrite must:
   - Mirror the semantic field of the JD concept
   - Include at least one quantified outcome (use ~ if estimated)
   - Sound like a real human wrote it. No "spearheaded", "leveraged", "utilized", or "results-driven."

4. Give me an overall semantic alignment score from 0-100 and tell me whether this resume would likely auto-advance (80+), go to human review (60-79), or auto-reject (below 60).

Be honest. Do not flatter.

---
JOB DESCRIPTION:
${jdText}

---
RESUME:
${resumeText}`;
}

function AskClaude({ resume, jd }: { resume: string; jd: string }) {
  const [copied, setCopied] = useState(false);
  const prompt = buildDiyPrompt(resume, jd);
  const hasContent = resume.trim() || jd.trim();

  function handleOpenClaude() {
    const url = `https://claude.ai/new?q=${encodeURIComponent(prompt)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function handleCopy() {
    navigator.clipboard.writeText(prompt).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="tl-ask-claude">
      <button className="tl-ask-claude-btn" onClick={handleOpenClaude} type="button">
        <span className="tl-ask-claude-icon">✦</span>
        {hasContent ? "Ask Claude with your resume + JD" : "Ask Claude yourself"}
        <span className="tl-ask-claude-arrow">↗</span>
      </button>
      {hasContent && (
        <p className="tl-ask-claude-hint">Opens Claude with your resume and job description already filled in.</p>
      )}
      <button className="tl-ask-claude-copy" onClick={handleCopy} type="button">
        {copied ? "Copied!" : "or copy the prompt"}
      </button>
    </div>
  );
}

// All string fields in `result` may contain user-supplied text (resume bullets echoed by the model).
// Render as plain React children only. Never use dangerouslySetInnerHTML on these values.
function ResultPanel({ result, onReset }: { result: ScreenResult; onReset: () => void }) {
  const vm = verdictMeta(result.verdict);
  return (
    <div className="tl-readout">
      <div className="tl-verdict">
        <div className="tl-verdict-top">
          <span className="tl-eyebrow">Semantic alignment</span>
          <span className="tl-verdict-tag" style={{ color: vm.color }}>{vm.label}</span>
        </div>
        <div className="tl-score" style={{ color: vm.color }}>
          {result.overall}<span className="tl-score-max">/100</span>
        </div>
        <div className="tl-meter">
          <div className="tl-meter-zone" style={{ width: "60%", background: PALETTE.reject }} />
          <div className="tl-meter-zone" style={{ width: "20%", background: PALETTE.review }} />
          <div className="tl-meter-zone" style={{ width: "20%", background: PALETTE.advance }} />
          <div className="tl-meter-tick" style={{ left: "60%" }} />
          <div className="tl-meter-tick" style={{ left: "80%" }} />
          <div className="tl-meter-marker" style={{ left: `${Math.min(100, Math.max(0, result.overall))}%` }} />
        </div>
        <div className="tl-meter-labels">
          <span>0</span>
          <span style={{ left: "60%" }}>60</span>
          <span style={{ left: "80%" }}>80</span>
          <span style={{ right: 0 }}>100</span>
        </div>
      </div>

      <p className="tl-summary">{result.summary}</p>

      {result.gaps?.length > 0 && (
        <div className="tl-block">
          <span className="tl-eyebrow">Your gap map</span>
          <p className="tl-block-sub">The 8 concepts the screener weights most, and how well your resume addresses each.</p>
          {result.gaps.map((g, i) => (
            <div className="tl-gap" key={i}>
              <div className="tl-gap-row">
                <span className="tl-gap-phrase">"{g.phrase}"</span>
                <span className="tl-gap-status" style={{ color: statusColor(g.status) }}>{statusLabel(g.status)}</span>
              </div>
              <div className="tl-dim-track">
                <div className="tl-dim-fill" style={{ width: `${g.coverage}%`, background: statusColor(g.status) }} />
              </div>
              <p className="tl-gap-explanation">{g.explanation}</p>
            </div>
          ))}
        </div>
      )}

      {result.rewrites?.length > 0 && (
        <div className="tl-block">
          <span className="tl-eyebrow">Targeted rewrites</span>
          <p className="tl-block-sub">3 bullets rewritten to close your lowest-coverage gaps.</p>
          {result.rewrites.map((r, i) => (
            <div className="tl-rw" key={i}>
              <p className="tl-rw-gap">closes gap: {r.gap}</p>
              <p className="tl-rw-before">{r.before}</p>
              <p className="tl-rw-after">{r.after}</p>
              <p className="tl-rw-why">{r.why}</p>
            </div>
          ))}
        </div>
      )}

      {onReset && (
        <div className="tl-another">
          <button className="tl-link" onClick={onReset} type="button">← Screen another resume</button>
        </div>
      )}
    </div>
  );
}

function App() {
  const params = useSearchParams();
  const router = useRouter();
  const sessionId = params.get("session_id");

  const [resume, setResume] = useState("");
  const [jd, setJd] = useState("");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [result, setResult] = useState<ScreenResult | null>(null);
  const [screenLoading, setScreenLoading] = useState(false);
  const [screenError, setScreenError] = useState("");
  const [paymentPending, setPaymentPending] = useState(false);
  const [openBrief, setOpenBrief] = useState<number | null>(0);
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sessionId) return;
    if (!/^cs_(test|live)_[A-Za-z0-9]{40,}$/.test(sessionId)) return;
    const id = sessionId;
    router.replace("/", { scroll: false }); // clear URL before fetch so session_id never sits in history
    setScreenLoading(true);
    setScreenError("");
    setPaymentPending(false);

    let attempts = 0;
    const MAX_ATTEMPTS = 6; // up to ~12s of retries

    async function poll() {
      try {
        const r = await fetch("/api/run-screen", {
          headers: { "x-session-id": id },
        });
        if (r.status === 202 && attempts < MAX_ATTEMPTS) {
          // Webhook hasn't confirmed payment yet. Wait 2s and retry.
          attempts++;
          setPaymentPending(true);
          setTimeout(poll, 2000);
          return;
        }
        setPaymentPending(false);
        setScreenLoading(false);
        if (r.status === 202) {
          // Exhausted retries. Webhook never arrived.
          setScreenError("Payment confirmation timed out. Your payment was recorded. Contact support if this persists.");
          return;
        }
        const data = await r.json();
        if (data.error) setScreenError(data.error);
        else setResult(data);
      } catch {
        setPaymentPending(false);
        setScreenError("Failed to load results. Try again.");
        setScreenLoading(false);
      }
    }

    poll();
  }, [sessionId]);

  async function handleCheckout() {
    if (!resume.trim() || !jd.trim()) {
      setCheckoutError("Paste both a resume and a job description first.");
      return;
    }
    setCheckoutError("");
    setCheckoutLoading(true);
    try {
      const res = await fetch("/api/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume, jd }),
      });
      const data = await res.json();
      if (data.url) {
        try {
          const parsed = new URL(data.url);
          if (parsed.origin !== "https://checkout.stripe.com") throw new Error();
          window.location.href = data.url;
        } catch {
          setCheckoutError("Unexpected redirect. Please contact support.");
          setCheckoutLoading(false);
        }
      } else {
        setCheckoutError(data.error || "Couldn't start checkout. Try again.");
        setCheckoutLoading(false);
      }
    } catch {
      setCheckoutError("Network error. Try again.");
      setCheckoutLoading(false);
    }
  }

  function loadExample() {
    setResume(SAMPLE_RESUME);
    setJd(SAMPLE_JD);
    setCheckoutError("");
  }

  function runAnother() {
    setResult(null);
    setScreenError("");
    setResume("");
    setJd("");
    topRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <div className="tl-root">
      <header className="tl-header" ref={topRef}>
        <div className="tl-brand">
          <span className="tl-dot" />
          <span className="tl-wordmark">passtheaiscreener</span>
        </div>
        <p className="tl-tagline">Pass the AI screener. Close the semantic gap before a human ever sees you.</p>
      </header>

      <main className="tl-grid">

        {/* LEFT: inputs or results */}
        <section className="tl-panel tl-left">
          {!result && !screenLoading && !screenError && (
            <>
              <div className="tl-panel-head">
                <span className="tl-eyebrow">Your resume + role</span>
                <button className="tl-link" onClick={loadExample} type="button">Load example</button>
              </div>
              <label className="tl-label" htmlFor="resume">Resume</label>
              <textarea
                id="resume"
                className="tl-textarea"
                placeholder="Paste the full resume text…"
                value={resume}
                onChange={(e) => setResume(e.target.value)}
              />
              <label className="tl-label" htmlFor="jd">Job description</label>
              <textarea
                id="jd"
                className="tl-textarea tl-textarea-short"
                placeholder="Paste the target job description…"
                value={jd}
                onChange={(e) => setJd(e.target.value)}
              />
              <div className="tl-checkout-area">
                {checkoutError && <p className="tl-error">{checkoutError}</p>}
                <button className="tl-run" onClick={handleCheckout} disabled={checkoutLoading} type="button">
                  {checkoutLoading ? "Redirecting to checkout..." : "Run the screen - $0.99"}
                </button>
                <p className="tl-fineprint">One-time payment · Semantic gap analysis + targeted rewrites</p>
              </div>
              <div className="tl-diy-inline">
                <p className="tl-diy-inline-label">Don&apos;t want to pay? Ask yourself in Claude for free.</p>
                <AskClaude resume={resume} jd={jd} />
              </div>
            </>
          )}

          {screenLoading && (
            <div className="tl-empty">
              <span className="tl-empty-mark tl-pulse">◷</span>
              <p className="tl-empty-title">{paymentPending ? "Confirming payment…" : "Mapping semantic gaps…"}</p>
              <p className="tl-empty-body">{paymentPending ? "Waiting for payment confirmation. This takes a few seconds." : "Extracting JD concepts, scoring coverage, writing targeted rewrites."}</p>
            </div>
          )}

          {screenError && (
            <div className="tl-empty">
              <p className="tl-empty-title" style={{ color: PALETTE.reject }}>Something went wrong</p>
              <p className="tl-empty-body">{screenError}</p>
              <button className="tl-link" onClick={runAnother} type="button">← Try again</button>
            </div>
          )}

          {result && <ResultPanel result={result} onReset={runAnother} />}
        </section>

        {/* RIGHT: The Brief (accordion) + example output */}
        <aside className="tl-right-col">

          <div className="tl-panel tl-brief-panel">
            <div className="tl-panel-head" style={{ marginBottom: 4 }}>
              <span className="tl-eyebrow">What You&apos;re Up Against</span>
              <span className="tl-brief-subtitle">How AI screening works in 2026</span>
            </div>
            <div className="tl-accordion">
              {BRIEF_SECTIONS.map((s, i) => (
                <div className="tl-acc-item" key={i}>
                  <button
                    className="tl-acc-trigger"
                    onClick={() => setOpenBrief(openBrief === i ? null : i)}
                    type="button"
                    aria-expanded={openBrief === i}
                  >
                    <span>{s.heading}</span>
                    <span className="tl-acc-chevron" style={{ transform: openBrief === i ? "rotate(180deg)" : "none" }}>
                      ▾
                    </span>
                  </button>
                  {openBrief === i && (
                    <p className="tl-acc-body">{s.body}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="tl-panel tl-example-panel">
            <div className="tl-panel-head" style={{ marginBottom: 16 }}>
              <span className="tl-eyebrow">Example output</span>
              <span className="tl-brief-subtitle">Jordan Park vs. Senior PM, Growth</span>
            </div>
            <ResultPanel result={EXAMPLE_RESULT} onReset={() => {}} />
          </div>

        </aside>

      </main>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={null}>
      <App />
    </Suspense>
  );
}
