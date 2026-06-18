"use client";
import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

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

interface Dimension {
  name: string;
  score: number;
  note: string;
}
interface Flag {
  severity: "high" | "med";
  issue: string;
  evidence?: string;
}
interface Rewrite {
  before: string;
  after: string;
  why: string;
}
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

function ResultPage() {
  const params = useSearchParams();
  const sessionId = params.get("session_id");
  const [result, setResult] = useState<ScreenResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) {
      setError("No session ID found.");
      setLoading(false);
      return;
    }

    fetch(`/api/run-screen?session_id=${sessionId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setResult(data);
        }
      })
      .catch(() => setError("Failed to load results. Contact support."))
      .finally(() => setLoading(false));
  }, [sessionId]);

  const vm = result ? verdictMeta(result.verdict) : null;

  return (
    <div className="tl-root">
      <style>{css}</style>

      <header className="tl-header">
        <div className="tl-brand">
          <span className="tl-dot" />
          <Link href="/" className="tl-wordmark-link">
            <span className="tl-wordmark">throughline</span>
          </Link>
        </div>
        <p className="tl-tagline">Your screener report</p>
      </header>

      <main className="tl-center">
        {loading && (
          <div className="tl-panel tl-empty">
            <span className="tl-empty-mark tl-pulse">◷</span>
            <p className="tl-empty-title">Reading like a screener…</p>
            <p className="tl-empty-body">Assessing fit, seniority, impact, and authenticity.</p>
          </div>
        )}

        {error && (
          <div className="tl-panel tl-empty">
            <p className="tl-empty-title" style={{ color: PALETTE.reject }}>Something went wrong</p>
            <p className="tl-empty-body">{error}</p>
            <Link href="/" className="tl-back">← Try another screen</Link>
          </div>
        )}

        {result && vm && (
          <div className="tl-panel tl-readout">
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
              <Link href="/" className="tl-back">← Screen another resume</Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function ResultPageWrapper() {
  return (
    <Suspense fallback={<div style={{ padding: 28, fontFamily: "system-ui" }}>Loading…</div>}>
      <ResultPage />
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
.tl-header{max-width:640px;margin:0 auto 28px;}
.tl-brand{display:flex;align-items:center;gap:9px;}
.tl-dot{width:11px;height:11px;border-radius:50%;background:var(--system);
  box-shadow:0 0 0 4px rgba(58,61,224,0.14);}
.tl-wordmark-link{text-decoration:none;color:inherit;}
.tl-wordmark{font-weight:700;letter-spacing:-0.03em;font-size:21px;}
.tl-tagline{margin:7px 0 0;color:var(--inkSoft);font-size:14.5px;}
.tl-center{max-width:640px;margin:0 auto;}
.tl-panel{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:24px;}
.tl-eyebrow{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:10.5px;
  letter-spacing:0.18em;text-transform:uppercase;color:var(--inkSoft);}
.tl-empty{min-height:320px;display:flex;flex-direction:column;
  align-items:center;justify-content:center;text-align:center;padding:40px;}
.tl-empty-mark{font-size:30px;color:var(--system);opacity:0.55;}
.tl-empty-title{font-weight:650;margin:14px 0 6px;font-size:15px;}
.tl-empty-body{color:var(--inkSoft);font-size:13px;max-width:320px;line-height:1.55;margin:0 0 16px;}
.tl-pulse{animation:tlpulse 1.1s ease-in-out infinite;}
@keyframes tlpulse{0%,100%{opacity:.4;}50%{opacity:1;}}
.tl-back{color:var(--system);font-size:13px;font-weight:600;text-decoration:none;}
.tl-back:hover{text-decoration:underline;}

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

.tl-another{margin-top:28px;padding-top:20px;border-top:1px solid var(--line);}
@media (prefers-reduced-motion:reduce){.tl-pulse{animation:none;}}
`;
