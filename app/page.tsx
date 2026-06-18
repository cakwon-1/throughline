"use client";
import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

const PALETTE = {
  paper: "#F4F6F9",
  surface: "#FFFFFF",
  ink: "#0A0F1E",
  inkSoft: "#5C6478",
  line: "#DDE2ED",
  system: "#0A0F1E",
  reject: "#C0392B",
  review: "#D97706",
  advance: "#0F7A4B",
};

const SAMPLE_RESUME = `JORDAN PARK
Product Manager

EXPERIENCE
Acme SaaS — Product Manager (2021–present)
- Responsible for the product roadmap and worked cross-functionally with engineering and design teams to deliver features.
- Leveraged data-driven insights to optimize user engagement and drive growth across the platform.
- Spearheaded various initiatives that improved the customer experience and aligned with strategic goals.

Brightline Inc — Associate Product Manager (2019–2021)
- Assisted with backlog grooming and supported senior PMs on feature launches.
- Helped coordinate releases and gathered customer feedback.

SKILLS
Roadmapping, Agile, Stakeholder management, SQL, Figma, A/B testing

EDUCATION
B.S. Economics, State University, 2019`;

const SAMPLE_JD = `Senior Product Manager — Growth
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
    body: "Large companies — think Fortune 500, consulting firms, tech companies with thousands of applicants — have added an AI layer on top of traditional ATS systems like Workday and Greenhouse. Before a human recruiter sees your resume, an LLM reads both your resume and the job description and produces a ranked score. You're competing against that score, not a person.",
  },
  {
    heading: "It's semantic, not keyword-based",
    body: "The old advice was to mirror the job description word-for-word. That worked for keyword-scanning ATS. LLM screeners work differently: they embed both documents into vector space and measure conceptual distance. Your resume can use completely different words and still score well — if the underlying meaning aligns. The flip side: stuffing in keywords from the JD without substantive backing actually hurts you, because the model detects the mismatch between the words and the evidence.",
  },
  {
    heading: "What moves the score most",
    body: "Three things drive semantic alignment scores: (1) Scope language — does your resume demonstrate ownership at the right level for this role? Words like 'assisted' and 'supported' signal junior; 'owned', 'defined', and 'accountable for' signal senior. (2) Specificity — vague bullets like 'improved performance' have low information density. Screeners weight specific, quantified outcomes heavily. (3) Domain coverage — each JD has 6-10 conceptual pillars. If your resume doesn't address even one of them, the overall score drops sharply regardless of everything else.",
  },
  {
    heading: "Why AI-written bullets backfire",
    body: "Screeners in 2025-26 are trained to detect and down-rank AI-generated boilerplate. Phrases like 'leveraged data-driven insights', 'spearheaded cross-functional initiatives', and 'results-driven professional' are statistically associated with low-quality, unsubstantiated resumes. They cluster together in embedding space in ways the model has learned to penalize. Ironically, a plainly-written specific bullet — 'cut support ticket volume 40% by rewriting onboarding flow' — scores higher than any AI-polished version of the same claim.",
  },
  {
    heading: "What to do when you're applying to many jobs",
    body: "Tailoring every resume from scratch isn't realistic at volume. The smarter approach: maintain a master resume with every substantive bullet you've ever written, then run each JD through a tool like this to identify the 2-3 highest-impact swaps. You don't need to rewrite the whole document — you need to close the specific semantic gaps the screener will penalize. Each targeted swap takes 10 minutes and can move a reject to a review.",
  },
];

const EXAMPLE_RESULT: ScreenResult = {
  overall: 54,
  verdict: "reject",
  summary: "Jordan's resume reads as a generic PM profile that fails to demonstrate the growth-specific expertise this role demands. Bullet language is vague and passive, with no quantified outcomes and no evidence of end-to-end experiment ownership. The screener would auto-reject before a human ever sees this.",
  gaps: [
    { phrase: "activation and retention funnel", coverage: 15, status: "missing", explanation: "Resume never mentions activation, retention, or funnel ownership in any form." },
    { phrase: "end-to-end experiment ownership", coverage: 10, status: "missing", explanation: "No experiments mentioned — A/B testing listed in skills but never demonstrated in context." },
    { phrase: "measurable revenue or retention impact", coverage: 8, status: "missing", explanation: "Zero metrics across all bullets. No revenue, retention, or any quantified outcome." },
    { phrase: "growth roadmap definition", coverage: 40, status: "partial", explanation: "'Responsible for the product roadmap' is close but doesn't specify growth context or scope." },
    { phrase: "data science partnership", coverage: 20, status: "missing", explanation: "No mention of data science collaboration or analytics partnerships anywhere." },
    { phrase: "SQL and experimentation fluency", coverage: 35, status: "partial", explanation: "SQL listed in skills but no evidence of use; experimentation absent from experience bullets." },
    { phrase: "leading without authority", coverage: 25, status: "missing", explanation: "'Cross-functionally' appears once but no evidence of influence-based leadership." },
    { phrase: "core metric ownership", coverage: 20, status: "missing", explanation: "No metrics mentioned as owned, tracked, or moved — screener has nothing to anchor seniority to." },
  ],
  rewrites: [
    {
      gap: "end-to-end experiment ownership",
      before: "Leveraged data-driven insights to optimize user engagement and drive growth across the platform.",
      after: "Ran 14 A/B experiments on the onboarding funnel end-to-end — from hypothesis through analysis — lifting 7-day activation by 18% and contributing ~$1.1M ARR.",
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
      after: "Coordinated release timelines across engineering, design, and marketing for 6 launches without direct authority — all shipped on schedule.",
      why: "Turns a passive support role into a cross-functional influence signal with a concrete delivery count.",
    },
  ],
};

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
          <span className="tl-eyebrow">JD concept coverage</span>
          <p className="tl-block-sub">The 8 concepts the screener weights most — and how well your resume addresses each.</p>
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
  const [openBrief, setOpenBrief] = useState<number | null>(0);

  useEffect(() => {
    if (!sessionId) return;
    setScreenLoading(true);
    setScreenError("");
    fetch(`/api/run-screen?session_id=${sessionId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setScreenError(data.error);
        else setResult(data);
      })
      .catch(() => setScreenError("Failed to load results. Try again."))
      .finally(() => {
        setScreenLoading(false);
        router.replace("/", { scroll: false });
      });
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
        window.location.href = data.url;
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
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="tl-root">
      <style>{css}</style>

      <header className="tl-header">
        <div className="tl-brand">
          <span className="tl-dot" />
          <span className="tl-wordmark">passtheaiscreener</span>
        </div>
        <p className="tl-tagline">Pass the AI screener. Close the semantic gap before a human ever sees you.</p>
      </header>

      <main className="tl-grid">

        {/* LEFT — inputs or results */}
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
                  {checkoutLoading ? "Redirecting to checkout…" : "Run the screen — $0.99"}
                </button>
                <p className="tl-fineprint">One-time payment · Semantic gap analysis + targeted rewrites</p>
              </div>
            </>
          )}

          {screenLoading && (
            <div className="tl-empty">
              <span className="tl-empty-mark tl-pulse">◷</span>
              <p className="tl-empty-title">Mapping semantic gaps…</p>
              <p className="tl-empty-body">Extracting JD concepts, scoring coverage, writing targeted rewrites.</p>
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

        {/* RIGHT — The Brief (accordion) + example output */}
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
              <span className="tl-brief-subtitle">Jordan Park vs. Senior PM — Growth</span>
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

const css = `
.tl-root{
  --paper:${PALETTE.paper}; --surface:${PALETTE.surface}; --ink:${PALETTE.ink};
  --inkSoft:${PALETTE.inkSoft}; --line:${PALETTE.line}; --system:${PALETTE.system};
  background:var(--paper); color:var(--ink); min-height:100vh;
  font-family:"Inter",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
  padding:32px 24px; box-sizing:border-box;
}
.tl-root *{box-sizing:border-box;}

/* HEADER */
.tl-header{max-width:1120px;margin:0 auto 28px;display:flex;align-items:baseline;
  justify-content:space-between;flex-wrap:wrap;gap:8px;}
.tl-brand{display:flex;align-items:center;gap:10px;}
.tl-dot{width:10px;height:10px;border-radius:50%;background:var(--system);}
.tl-wordmark{font-weight:800;letter-spacing:-0.04em;font-size:20px;color:var(--ink);}
.tl-tagline{font-size:13.5px;color:var(--inkSoft);font-style:italic;}

/* GRID */
.tl-grid{max-width:1120px;margin:0 auto;display:grid;
  grid-template-columns:1fr 1fr;gap:20px;align-items:start;}
@media(max-width:820px){.tl-grid{grid-template-columns:1fr;}}

/* CARDS */
.tl-panel{
  background:var(--surface);
  border:1px solid var(--line);
  border-radius:20px;
  padding:24px;
  box-shadow:0 2px 8px rgba(10,15,30,0.07),0 1px 2px rgba(10,15,30,0.05);
}
.tl-left{display:flex;flex-direction:column;}
.tl-panel-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;}
.tl-eyebrow{font-size:10px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;
  color:var(--inkSoft);}
.tl-link{background:none;border:none;color:var(--system);font-size:12.5px;cursor:pointer;
  font-weight:600;padding:3px 0;text-underline-offset:3px;}
.tl-link:hover{text-decoration:underline;}
.tl-label{display:block;font-size:12px;font-weight:600;margin:14px 0 5px;color:var(--inkSoft);
  letter-spacing:0.02em;text-transform:uppercase;}
.tl-textarea{width:100%;height:200px;resize:vertical;
  border:1.5px solid var(--line);border-radius:12px;padding:12px 14px;
  font-size:13.5px;line-height:1.6;background:var(--paper);color:var(--ink);
  font-family:inherit;transition:border-color .15s;}
.tl-textarea-short{height:110px;}
.tl-textarea:focus{outline:none;border-color:var(--ink);
  box-shadow:0 0 0 3px rgba(10,15,30,0.08);}
.tl-textarea::placeholder{color:#AAB0BF;}
.tl-checkout-area{margin-top:20px;}
.tl-run{
  width:100%;background:var(--ink);color:#fff;border:none;
  border-radius:12px;padding:14px 20px;font-size:14.5px;font-weight:700;
  cursor:pointer;letter-spacing:-0.01em;
  box-shadow:0 2px 0 rgba(0,0,0,0.3),0 4px 12px rgba(10,15,30,0.15);
  transition:transform .1s ease,box-shadow .1s ease,opacity .2s;
}
.tl-run:hover:not(:disabled){transform:translateY(-1px);
  box-shadow:0 4px 2px rgba(0,0,0,0.2),0 8px 20px rgba(10,15,30,0.2);}
.tl-run:active:not(:disabled){transform:translateY(0);box-shadow:0 1px 0 rgba(0,0,0,0.3);}
.tl-run:disabled{opacity:0.4;cursor:default;box-shadow:none;}
.tl-fineprint{margin:10px 0 0;font-size:11.5px;color:var(--inkSoft);line-height:1.55;
  text-align:center;}
.tl-error{color:${PALETTE.reject};font-size:12.5px;margin:0 0 10px;font-weight:500;}

/* LOADING / EMPTY */
.tl-empty{min-height:320px;display:flex;flex-direction:column;
  align-items:center;justify-content:center;text-align:center;padding:32px;}
.tl-empty-mark{font-size:28px;opacity:0.4;}
.tl-empty-title{font-weight:700;margin:12px 0 5px;font-size:15px;}
.tl-empty-body{color:var(--inkSoft);font-size:13px;max-width:280px;line-height:1.6;margin:0 0 16px;}
.tl-pulse{animation:tlpulse 1.2s ease-in-out infinite;}
@keyframes tlpulse{0%,100%{opacity:.25;}50%{opacity:.9;}}

/* RIGHT COLUMN */
.tl-right-col{display:flex;flex-direction:column;gap:20px;position:sticky;top:20px;}

/* ACCORDION */
.tl-brief-subtitle{font-size:12px;color:var(--inkSoft);}
.tl-accordion{margin-top:10px;}
.tl-acc-item{border-bottom:1px solid var(--line);}
.tl-acc-item:last-child{border-bottom:none;}
.tl-acc-trigger{
  width:100%;background:none;border:none;padding:13px 0;
  display:flex;justify-content:space-between;align-items:center;
  cursor:pointer;font-size:13px;font-weight:600;color:var(--ink);
  text-align:left;gap:10px;
}
.tl-acc-trigger:hover{color:var(--system);}
.tl-acc-chevron{font-size:13px;color:var(--inkSoft);flex-shrink:0;
  transition:transform .2s ease;display:inline-block;line-height:1;}
.tl-acc-body{font-size:13px;line-height:1.7;color:var(--inkSoft);
  margin:0 0 14px;padding-right:4px;}

/* RESULTS */
.tl-verdict-top{display:flex;justify-content:space-between;align-items:center;}
.tl-verdict-tag{font-size:11px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;}
.tl-score{font-size:54px;font-weight:800;line-height:1;letter-spacing:-0.04em;margin:6px 0 14px;}
.tl-score-max{font-size:18px;color:var(--inkSoft);font-weight:500;margin-left:3px;}
.tl-meter{position:relative;height:10px;border-radius:5px;overflow:hidden;display:flex;
  border:1px solid var(--line);}
.tl-meter-zone{height:100%;opacity:0.22;}
.tl-meter-tick{position:absolute;top:0;bottom:0;width:1px;background:rgba(28,25,23,0.25);}
.tl-meter-marker{position:absolute;top:-5px;bottom:-5px;width:3px;background:var(--ink);
  border-radius:2px;transform:translateX(-50%);
  box-shadow:0 0 0 3px #fff,0 0 0 4px var(--ink);}
.tl-meter-labels{position:relative;height:16px;margin-top:5px;font-size:10px;color:var(--inkSoft);}
.tl-meter-labels span{position:absolute;transform:translateX(-50%);}
.tl-meter-labels span:first-child{left:0;transform:none;}
.tl-summary{font-size:13px;line-height:1.7;margin:16px 0 0;padding:14px 16px;
  background:var(--paper);border-radius:12px;border:1px solid var(--line);}
.tl-block{margin-top:22px;}
.tl-block>.tl-eyebrow{display:block;margin-bottom:4px;}
.tl-block-sub{font-size:12px;color:var(--inkSoft);margin:0 0 12px;line-height:1.5;}
.tl-gap{margin-bottom:14px;}
.tl-gap-row{display:flex;justify-content:space-between;align-items:baseline;gap:8px;}
.tl-gap-phrase{font-size:12px;font-weight:600;font-style:italic;color:var(--ink);
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:74%;}
.tl-gap-status{font-size:9.5px;font-weight:800;letter-spacing:0.1em;
  text-transform:uppercase;flex-shrink:0;}
.tl-dim-track{height:4px;background:var(--line);border-radius:2px;
  margin:5px 0 4px;overflow:hidden;}
.tl-dim-fill{height:100%;border-radius:2px;transition:width .6s cubic-bezier(.4,0,.2,1);}
.tl-gap-explanation{font-size:11.5px;color:var(--inkSoft);margin:0;line-height:1.5;}
.tl-rw{
  padding:14px 16px;background:var(--paper);
  border-radius:14px;margin-bottom:10px;
  border:1px solid var(--line);
}
.tl-rw-gap{font-size:9.5px;font-weight:700;color:var(--system);letter-spacing:0.1em;
  text-transform:uppercase;margin:0 0 10px;}
.tl-rw-before{font-size:12.5px;color:${PALETTE.reject};margin:0 0 8px;
  text-decoration:line-through;text-decoration-color:rgba(185,28,28,0.3);
  line-height:1.6;}
.tl-rw-after{font-size:13px;color:${PALETTE.advance};font-weight:600;
  margin:0 0 8px;line-height:1.6;}
.tl-rw-why{font-size:11.5px;color:var(--inkSoft);margin:0;line-height:1.5;font-style:italic;}
.tl-another{margin-top:20px;padding-top:16px;border-top:1px solid var(--line);}

@media(prefers-reduced-motion:reduce){
  .tl-pulse{animation:none;}
  .tl-run:hover,.tl-run:active{transform:none;}
  .tl-acc-chevron{transition:none;}
  .tl-dim-fill{transition:none;}
}
`;
