import React, { useMemo, useState } from "react";
import VisionPanel from "./components/VisionPanel.jsx";
import QuestionPanel from "./components/QuestionPanel.jsx";
import { levelToLabel } from "./lib/adaptation.js";
import "./index.css";

export default function App() {
  const [cognitive, setCognitive] = useState({
    score: 75,
    fatigue: 0.25,
    attention: 0.7,
    blinkPerMin: 12,
    gazeDrift: 0.2,
    status: "Ready",
    level: 2,
    suggestedBreak: false,
  });

  const lvlLabel = useMemo(() => levelToLabel(cognitive.level), [cognitive.level]);

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <div className="logo">CV</div>
          <div>
            <div className="title">Cognivue</div>
            <div className="subtitle">Biometric Adaptive Test Prep (MVP)</div>
          </div>
        </div>

        <div className="scorebox">
          <div className="score">
            <div className="scoreNum">{Math.round(cognitive.score)}</div>
            <div className="scoreLabel">Cognitive Score</div>
          </div>
          <div className="pill">{lvlLabel}</div>
        </div>
      </header>

      <main className="grid">
        <section className="card">
          <h2>Vision Engine</h2>
          <p className="muted">
            Runs fully in-browser. No video saved. Computes blink rate + gaze drift → cognitive score.
          </p>
          <VisionPanel onMetrics={setCognitive} />
        </section>

        <section className="card">
          <h2>Adaptive Practice</h2>
          <p className="muted">
            Difficulty adapts live. If you look fatigued, it gives easier questions + break nudges.
          </p>
          <QuestionPanel cognitive={cognitive} />
        </section>
      </main>

      <footer className="footer muted">
        Privacy-first: webcam frames processed locally. Nothing stored or uploaded.
      </footer>
    </div>
  );
}