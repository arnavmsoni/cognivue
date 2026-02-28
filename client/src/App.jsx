import React, { useMemo, useState, useEffect, useRef } from "react";
import VisionPanel from "./components/VisionPanel.jsx";
import QuestionPanel from "./components/QuestionPanel.jsx";
import { levelToLabel } from "./lib/adaptation.js";
import "./index.css";

// Animated score ring component — score is 1.0–10.0
function ScoreRing({ score }) {
  const R = 36;
  const C = 2 * Math.PI * R;
  const offset = C - ((score - 1) / 9) * C;

  return (
    <div className="scoreRing">
      <svg className="scoreRingSvg" width="88" height="88" viewBox="0 0 88 88">
        <defs>
          <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--accent2)" />
            <stop offset="100%" stopColor="var(--accent)" />
          </linearGradient>
        </defs>
        <circle className="scoreRingBg" cx="44" cy="44" r={R} />
        <circle
          className="scoreRingFg"
          cx="44" cy="44" r={R}
          strokeDasharray={C}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="scoreRingText">
        <span className="scoreRingNum">{Math.round(score)}</span>
        <span className="scoreRingLabel">/ 10</span>
      </div>
    </div>
  );
}

export default function App() {
  const [cognitive, setCognitive] = useState({
    score: 5,
    fatigue: 0.25,
    attention: 0.7,
    blinkPerMin: 12,
    gazeDrift: 0.2,
    status: "Ready",
    level: 2,
    suggestedBreak: false,
    emotion: "Neutral",
    headPose: { yaw: 0, pitch: 0, roll: 0 },
    stress: 0.2,
  });

  const prevScore = useRef(5);
  const [scoreTrend, setScoreTrend] = useState(0);

  useEffect(() => {
    const diff = cognitive.score - prevScore.current;
    if (Math.abs(diff) > 0.3) setScoreTrend(diff > 0 ? 1 : -1);
    else setScoreTrend(0);
    prevScore.current = cognitive.score;
  }, [cognitive.score]);

  const lvlLabel = useMemo(() => levelToLabel(cognitive.level), [cognitive.level]);

  const trendIcon = scoreTrend > 0 ? "↑" : scoreTrend < 0 ? "↓" : "→";
  const trendColor = scoreTrend > 0 ? "var(--good)" : scoreTrend < 0 ? "var(--bad)" : "var(--muted)";

  return (
    <div className="app">
      {/* ── HEADER ── */}
      <header className="topbar">
        <div className="brand">
          <div className="logo">CV</div>
          <div>
            <div className="title">COGNIVUE</div>
            <div className="subtitle">Biometric Adaptive Test Prep — MVP</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {/* Compact stats row */}
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 11, fontFamily: "Orbitron, monospace", color: cognitive.suggestedBreak ? "var(--bad)" : "var(--good)", letterSpacing: 1 }}>
                {cognitive.suggestedBreak ? "BREAK" : "ACTIVE"}
              </div>
              <div style={{ fontSize: 10, color: "var(--muted)" }}>Status</div>
            </div>
            <div style={{ width: 1, height: 28, background: "var(--border)" }} />
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 14, fontFamily: "Orbitron, monospace", color: "var(--accent)", fontWeight: 900 }}>
                {cognitive.emotion}
              </div>
              <div style={{ fontSize: 10, color: "var(--muted)" }}>Emotion</div>
            </div>
            <div style={{ width: 1, height: 28, background: "var(--border)" }} />
          </div>

          <div className="scorebox">
            <ScoreRing score={cognitive.score} />
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <div className="pill">{lvlLabel}</div>
                <div style={{ fontSize: 16, fontFamily: "Orbitron, monospace", color: trendColor, fontWeight: 900 }}>
                  {trendIcon}
                </div>
              </div>
              <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 4, letterSpacing: 0.5 }}>
                Fatigue {Math.round(cognitive.fatigue * 100)}% · Attn {Math.round(cognitive.attention * 100)}%
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ── MAIN GRID ── */}
      <main className="grid">
        <section className="card">
          <h2>Vision Engine</h2>
          <p className="muted">
            In-browser only — no video stored. Tracks blinks, gaze, head pose, iris, and emotion → computes cognitive score.
          </p>
          <VisionPanel onMetrics={setCognitive} />
        </section>

        <section className="card">
          <h2>Adaptive Practice</h2>
          <p className="muted">
            Begin a reading article (700-800 words) and answer 10 adaptive comprehension questions per article.
          </p>
          <QuestionPanel cognitive={cognitive} />
        </section>
      </main>

      <footer className="footer muted">
        🔒 Privacy-first: all webcam frames are processed locally. Nothing is stored or uploaded. · Cognivue MVP
      </footer>
    </div>
  );
}
