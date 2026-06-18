"use client";
import React, { useState } from "react";

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

export default function Home() {
  const [resume, setResume] = useState("");
  const [jd, setJd] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleRun() {
    if (!resume.trim() || !jd.trim()) {
      setError("Paste both a resume and a job description to run the screen.");
      return;
    }
    setError("");
    setLoading(true);

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
        setError(data.error || "Couldn't start checkout. Try again.");
        setLoading(false);
      }
    } catch {
      setError("Network error. Try again.");
      setLoading(false);
    }
  }

  function loadExample() {
    setResume(SAMPLE_RESUME);
    setJd(SAMPLE_JD);
    setError("");
  }

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

      <main className="tl-center">
        <section className="tl-panel">
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

          {error && <p className="tl-error">{error}</p>}

          <button
            className="tl-run"
            onClick={handleRun}
            disabled={loading}
            type="button"
          >
            {loading ? "Redirecting to checkout…" : "Run the screen — $0.99"}
          </button>
          <p className="tl-fineprint">
            One-time payment. Score, flags, and rewrite suggestions returned instantly after checkout.
          </p>
        </section>
      </main>
    </div>
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
.tl-header{max-width:580px;margin:0 auto 28px;}
.tl-brand{display:flex;align-items:center;gap:9px;}
.tl-dot{width:11px;height:11px;border-radius:50%;background:var(--system);
  box-shadow:0 0 0 4px rgba(58,61,224,0.14);}
.tl-wordmark{font-weight:700;letter-spacing:-0.03em;font-size:21px;}
.tl-tagline{margin:7px 0 0;color:var(--inkSoft);font-size:14.5px;}
.tl-center{max-width:580px;margin:0 auto;}
.tl-panel{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:24px;}
.tl-panel-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;}
.tl-eyebrow{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:10.5px;
  letter-spacing:0.18em;text-transform:uppercase;color:var(--inkSoft);}
.tl-link{background:none;border:none;color:var(--system);font-size:12.5px;cursor:pointer;
  font-weight:600;padding:4px 2px;}
.tl-link:hover{text-decoration:underline;}
.tl-label{display:block;font-size:12.5px;font-weight:600;margin:12px 0 6px;color:var(--ink);}
.tl-textarea{width:100%;height:220px;resize:vertical;border:1px solid var(--line);
  border-radius:10px;padding:12px;font-size:13px;line-height:1.5;background:#fff;
  color:var(--ink);font-family:ui-sans-serif,system-ui,sans-serif;}
.tl-textarea-short{height:130px;}
.tl-textarea:focus{outline:2px solid var(--system);outline-offset:1px;border-color:var(--system);}
.tl-run{width:100%;margin-top:18px;background:var(--ink);color:#fff;border:none;
  border-radius:10px;padding:14px;font-size:14px;font-weight:650;cursor:pointer;
  letter-spacing:-0.01em;transition:transform .08s ease,opacity .2s;}
.tl-run:hover:not(:disabled){transform:translateY(-1px);}
.tl-run:disabled{opacity:0.55;cursor:default;}
.tl-run:focus-visible{outline:2px solid var(--system);outline-offset:2px;}
.tl-fineprint{margin:11px 0 0;font-size:11.5px;color:var(--inkSoft);line-height:1.5;}
.tl-error{color:${PALETTE.reject};font-size:12.5px;margin:12px 0 0;}
@media (prefers-reduced-motion:reduce){.tl-run:hover{transform:none;}}
`;
