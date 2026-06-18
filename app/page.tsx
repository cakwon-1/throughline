"use client";
import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

const PALETTE = {
  paper: "#EEF1F6",
  surface: "#FBFCFE",
  ink: "#14171F",
  inkSoft: "#5A6172",
  line: "#D7DCE6",
  system: "#3A3DE0",
  reject: "#C0473B",
  review: "#D69A2D",
  advance: "#1F9E6E",
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

interface Dimension { name: string; score: number; note: string; }
interface Flag { severity: "high" | "med"; issue: string; evidence?: string; }
interface Rewrite { before: string; after: string; why: string; }
interface ScreenResult {
  overall: number;
  verdict: "advance" | "review" | "reject";
  dimensions: Dimension[];
  flags: Flag[];
  rewrites: Rewrite[];
  summary: string;
}

function verdictMeta(v: string) {
  if (v === "advance") return { label: "Auto-advance", color: PALETTE.advance };
  if (v === "review") return { label: "Human review", color: PALETTE.review };
  return { label: "Auto-reject", color: PALETTE.reject };
}

function scoreColor(s: number) {
  if (s >= 80) return PALETTE.advance;
  if (s >= 60) return PALETTE.review;
  return PALETTE.reject;
}

const EXAMPLE_RESULT: ScreenResult = {
  overall: 54,
  verdict: "reject",
  summary: "Jordan's resume reads as a generic PM profile that fails to demonstrate the growth-specific expertise this role demands. Bullet language is vague and passive, with no quantified outcomes and no evidence of end-to-end experiment ownership. The screener would auto-reject before a human ever sees this.",
  dimensions: [
    { name: "Requirements match", score: 48, note: "No growth experimentation or retention work cited" },
    { name: "Seniority signal", score: 55, note: "Language reads associate-level despite PM title" },
    { name: "Quantified impact", score: 20, note: "Zero metrics across all bullets" },
    { name: "Narrative fit", score: 60, note: "PM background fits broadly, not for growth specifically" },
    { name: "Authenticity", score: 38, note: "Heavy boilerplate — 'leveraged', 'spearheaded', 'various initiatives'" },
  ],
  flags: [
    { severity: "high", issue: "No quantified outcomes anywhere on the resume", evidence: "improved the customer experience and aligned with strategic goals" },
    { severity: "high", issue: "Boilerplate language signals AI-generated or template copy", evidence: "Leveraged data-driven insights to optimize user engagement" },
    { severity: "med", issue: "Missing required skills: experimentation fluency, retention metrics", evidence: "SKILLS: Roadmapping, Agile, Stakeholder management…" },
  ],
  rewrites: [
    {
      before: "Leveraged data-driven insights to optimize user engagement and drive growth across the platform.",
      after: "Ran 12 A/B experiments on the onboarding funnel, lifting 7-day activation by 18% and contributing $1.2M ARR.",
      why: "Specific experiment count + metric + revenue makes it scannable and credible",
    },
    {
      before: "Spearheaded various initiatives that improved the customer experience and aligned with strategic goals.",
      after: "Owned the retention roadmap for SMB segment; reduced 90-day churn from 14% to 9% over two quarters.",
      why: "Segment + before/after metric replaces vague ownership claim",
    },
  ],
};

function App() {
  const params = useSearchParams();
  const router = useRouter();
  const sessionId = params.get("session_id");

  const [resume, setResume] = useState("");
  const [jd, setJd] = useState("");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [result, setResult] = useState<ScreenResult | null>(EXAMPLE_RESULT);
  const [isExample, setIsExample] = useState(true);
  const [screenLoading, setScreenLoading] = useState(false);
  const [screenError, setScreenError] = useState("");

  // On return from Stripe, auto-fetch results
  useEffect(() => {
    if (!sessionId) return;
    setScreenLoading(true);
    setScreenError("");
    fetch(`/api/run-screen?session_id=${sessionId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setScreenError(data.error);
        else { setResult(data); setIsExample(false); }
      })
      .catch(() => setScreenError("Failed to load results. Try again."))
      .finally(() => {
        setScreenLoading(false);
        setIsExample(false);
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
    setResult(EXAMPLE_RESULT);
    setIsExample(true);
    setScreenError("");
    setResume("");
    setJd("");
  }

  const vm = result ? verdictMeta(result.verdict) : null;

  return (
    <div className="tl-root">
      <style>{css}</style>

      <header className="tl-header">
        <div className="tl-brand">
          <span className="tl-dot" />
          <span className="tl-wordmark">throughline</span>
        </div>
        <p className="tl-tagline">See your resume the way the AI screener does.</p>
      </header>

      <main className="tl-grid">

        {/* LEFT — inputs */}
        <section className="tl-panel tl-left">
          <div className="tl-panel-head">
            <span className="tl-eyebrow">Inputs</span>
            <button className="tl-link" onClick={loadExample} type="button">
              Load example
            </button>
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
            <button
              className="tl-run"
              onClick={handleCheckout}
              disabled={checkoutLoading || screenLoading}
              type="button"
            >
              {checkoutLoading ? "Redirecting to checkout…" : "Run the screen — $0.99"}
            </button>
            <p className="tl-fineprint">
              One-time payment · Results appear on the right after checkout
            </p>
          </div>
        </section>

        {/* RIGHT — results */}
        <section className="tl-panel tl-right">
          {!result && !screenLoading && !screenError && (
            <div className="tl-empty">
              <span className="tl-empty-mark">⟶</span>
              <p className="tl-empty-title">No screen yet</p>
              <p className="tl-empty-body">
                Paste a resume and job description, pay $0.99, and your score
                will appear here — no page reload needed.
              </p>
            </div>
          )}

          {screenLoading && (
            <div className="tl-empty">
              <span className="tl-empty-mark tl-pulse">◷</span>
              <p className="tl-empty-title">Reading like a screener…</p>
              <p className="tl-empty-body">Assessing fit, seniority, impact, and authenticity.</p>
            </div>
          )}

          {screenError && (
            <div className="tl-empty">
              <p className="tl-empty-title" style={{ color: PALETTE.reject }}>Something went wrong</p>
              <p className="tl-empty-body">{screenError}</p>
            </div>
          )}

          {result && vm && (
            <div className="tl-readout">
              {isExample && (
                <div className="tl-example-banner">
                  <span>Example output — run your own screen to replace this</span>
                </div>
              )}
              {/* VERDICT METER */}
              <div className="tl-verdict">
                <div className="tl-verdict-top">
                  <span className="tl-eyebrow">Screener verdict</span>
                  <span className="tl-verdict-tag" style={{ color: vm.color }}>{vm.label}</span>
                </div>
                <div className="tl-score" style={{ color: vm.color }}>
                  {result.overall}
                  <span className="tl-score-max">/100</span>
                </div>
                <div className="tl-meter">
                  <div className="tl-meter-zone" style={{ width: "60%", background: PALETTE.reject }} />
                  <div className="tl-meter-zone" style={{ width: "20%", background: PALETTE.review }} />
                  <div className="tl-meter-zone" style={{ width: "20%", background: PALETTE.advance }} />
                  <div className="tl-meter-tick" style={{ left: "60%" }} />
                  <div className="tl-meter-tick" style={{ left: "80%" }} />
                  <div
                    className="tl-meter-marker"
                    style={{ left: `${Math.min(100, Math.max(0, result.overall))}%` }}
                  />
                </div>
                <div className="tl-meter-labels">
                  <span>0</span>
                  <span style={{ left: "60%" }}>60</span>
                  <span style={{ left: "80%" }}>80</span>
                  <span style={{ right: 0 }}>100</span>
                </div>
              </div>

              <p className="tl-summary">{result.summary}</p>

              {/* DIMENSIONS */}
              <div className="tl-block">
                <span className="tl-eyebrow">Dimensions</span>
                {result.dimensions?.map((d, i) => (
                  <div className="tl-dim" key={i}>
                    <div className="tl-dim-row">
                      <span className="tl-dim-name">{d.name}</span>
                      <span className="tl-dim-score" style={{ color: scoreColor(d.score) }}>{d.score}</span>
                    </div>
                    <div className="tl-dim-track">
                      <div className="tl-dim-fill" style={{ width: `${d.score}%`, background: scoreColor(d.score) }} />
                    </div>
                    <p className="tl-dim-note">{d.note}</p>
                  </div>
                ))}
              </div>

              {/* FLAGS */}
              {result.flags?.length > 0 && (
                <div className="tl-block">
                  <span className="tl-eyebrow">What&apos;s dragging it down</span>
                  {result.flags.map((f, i) => (
                    <div className="tl-flag" key={i}>
                      <span
                        className="tl-flag-dot"
                        style={{ background: f.severity === "high" ? PALETTE.reject : PALETTE.review }}
                      />
                      <div>
                        <p className="tl-flag-issue">{f.issue}</p>
                        {f.evidence && <p className="tl-flag-evidence">&ldquo;{f.evidence}&rdquo;</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* REWRITES */}
              {result.rewrites?.length > 0 && (
                <div className="tl-block">
                  <span className="tl-eyebrow">Rewrites that move the score</span>
                  {result.rewrites.map((r, i) => (
                    <div className="tl-rw" key={i}>
                      <p className="tl-rw-before">{r.before}</p>
                      <p className="tl-rw-after">{r.after}</p>
                      <p className="tl-rw-why">{r.why}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="tl-another">
                <button className="tl-link" onClick={runAnother} type="button">
                  ← Screen another resume
                </button>
              </div>
            </div>
          )}
        </section>

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
  font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;
  padding:28px; box-sizing:border-box;
}
.tl-root *{box-sizing:border-box;}
.tl-header{max-width:1080px;margin:0 auto 22px;}
.tl-brand{display:flex;align-items:center;gap:9px;}
.tl-dot{width:11px;height:11px;border-radius:50%;background:var(--system);
  box-shadow:0 0 0 4px rgba(58,61,224,0.14);}
.tl-wordmark{font-weight:700;letter-spacing:-0.03em;font-size:21px;}
.tl-tagline{margin:7px 0 0;color:var(--inkSoft);font-size:14.5px;}

.tl-grid{max-width:1080px;margin:0 auto;display:grid;
  grid-template-columns:1fr 1fr;gap:18px;align-items:start;}
@media(max-width:760px){.tl-grid{grid-template-columns:1fr;}}

.tl-panel{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:20px;}
.tl-left{display:flex;flex-direction:column;}
.tl-panel-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;}
.tl-eyebrow{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:10.5px;
  letter-spacing:0.18em;text-transform:uppercase;color:var(--inkSoft);}
.tl-link{background:none;border:none;color:var(--system);font-size:12.5px;cursor:pointer;
  font-weight:600;padding:4px 2px;}
.tl-link:hover{text-decoration:underline;}
.tl-label{display:block;font-size:12.5px;font-weight:600;margin:12px 0 6px;color:var(--ink);}
.tl-textarea{width:100%;height:210px;resize:vertical;border:1px solid var(--line);
  border-radius:10px;padding:12px;font-size:13px;line-height:1.5;background:#fff;
  color:var(--ink);font-family:ui-sans-serif,system-ui,sans-serif;}
.tl-textarea-short{height:120px;}
.tl-textarea:focus{outline:2px solid var(--system);outline-offset:1px;border-color:var(--system);}

.tl-checkout-area{margin-top:auto;padding-top:16px;}
.tl-run{width:100%;margin-top:4px;background:var(--ink);color:#fff;border:none;
  border-radius:10px;padding:13px;font-size:14px;font-weight:650;cursor:pointer;
  letter-spacing:-0.01em;transition:transform .08s ease,opacity .2s;}
.tl-run:hover:not(:disabled){transform:translateY(-1px);}
.tl-run:disabled{opacity:0.55;cursor:default;}
.tl-run:focus-visible{outline:2px solid var(--system);outline-offset:2px;}
.tl-fineprint{margin:10px 0 0;font-size:11.5px;color:var(--inkSoft);line-height:1.5;}
.tl-error{color:${PALETTE.reject};font-size:12.5px;margin:0 0 8px;}

.tl-right{min-height:480px;}
.tl-example-banner{background:rgba(58,61,224,0.07);border:1px solid rgba(58,61,224,0.18);
  border-radius:8px;padding:8px 12px;margin-bottom:18px;font-size:12px;
  color:var(--system);font-weight:500;text-align:center;}
.tl-empty{height:100%;min-height:400px;display:flex;flex-direction:column;
  align-items:center;justify-content:center;text-align:center;padding:30px;}
.tl-empty-mark{font-size:30px;color:var(--system);opacity:0.55;}
.tl-empty-title{font-weight:650;margin:14px 0 6px;font-size:15px;}
.tl-empty-body{color:var(--inkSoft);font-size:13px;max-width:300px;line-height:1.55;margin:0;}
.tl-pulse{animation:tlpulse 1.1s ease-in-out infinite;}
@keyframes tlpulse{0%,100%{opacity:.4;}50%{opacity:1;}}

.tl-verdict-top{display:flex;justify-content:space-between;align-items:center;}
.tl-verdict-tag{font-family:ui-monospace,monospace;font-size:12px;font-weight:700;letter-spacing:0.04em;}
.tl-score{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:60px;
  font-weight:700;line-height:1;letter-spacing:-0.04em;margin:8px 0 14px;}
.tl-score-max{font-size:19px;color:var(--inkSoft);font-weight:500;margin-left:4px;}
.tl-meter{position:relative;height:14px;border-radius:7px;overflow:hidden;display:flex;
  border:1px solid var(--line);}
.tl-meter-zone{height:100%;opacity:0.28;}
.tl-meter-tick{position:absolute;top:0;bottom:0;width:1.5px;background:rgba(20,23,31,0.35);}
.tl-meter-marker{position:absolute;top:-4px;bottom:-4px;width:3px;background:var(--ink);
  border-radius:2px;transform:translateX(-50%);box-shadow:0 0 0 3px var(--surface);}
.tl-meter-labels{position:relative;height:16px;margin-top:5px;font-family:ui-monospace,monospace;
  font-size:10px;color:var(--inkSoft);}
.tl-meter-labels span{position:absolute;transform:translateX(-50%);}
.tl-meter-labels span:first-child{left:0;transform:none;}

.tl-summary{font-size:13.5px;line-height:1.6;margin:20px 0 4px;padding:14px;
  background:var(--paper);border-radius:10px;}
.tl-block{margin-top:24px;}
.tl-block .tl-eyebrow{display:block;margin-bottom:13px;}

.tl-dim{margin-bottom:14px;}
.tl-dim-row{display:flex;justify-content:space-between;align-items:baseline;}
.tl-dim-name{font-size:13px;font-weight:600;}
.tl-dim-score{font-family:ui-monospace,monospace;font-size:14px;font-weight:700;}
.tl-dim-track{height:6px;background:var(--line);border-radius:3px;margin:6px 0 5px;overflow:hidden;}
.tl-dim-fill{height:100%;border-radius:3px;transition:width .5s ease;}
.tl-dim-note{font-size:11.5px;color:var(--inkSoft);margin:0;line-height:1.45;}

.tl-flag{display:flex;gap:10px;padding:11px 0;border-bottom:1px solid var(--line);}
.tl-flag:last-child{border-bottom:none;}
.tl-flag-dot{width:8px;height:8px;border-radius:50%;margin-top:5px;flex-shrink:0;}
.tl-flag-issue{font-size:13px;font-weight:600;margin:0 0 3px;}
.tl-flag-evidence{font-size:12px;color:var(--inkSoft);margin:0;font-style:italic;}

.tl-rw{padding:12px;background:var(--paper);border-radius:10px;margin-bottom:10px;}
.tl-rw-before{font-size:12.5px;color:${PALETTE.reject};margin:0 0 6px;
  text-decoration:line-through;text-decoration-color:rgba(192,71,59,0.4);line-height:1.5;}
.tl-rw-after{font-size:12.5px;color:${PALETTE.advance};font-weight:600;margin:0 0 6px;line-height:1.5;}
.tl-rw-why{font-family:ui-monospace,monospace;font-size:10.5px;color:var(--inkSoft);margin:0;
  letter-spacing:0.02em;}

.tl-another{margin-top:24px;padding-top:18px;border-top:1px solid var(--line);}
@media(prefers-reduced-motion:reduce){.tl-pulse{animation:none;}.tl-run:hover{transform:none;}}
`;
