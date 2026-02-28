import React, { useEffect, useMemo, useState } from "react";
import { getQuestionSetForLevel, levelToLabel } from "../lib/adaptation.js";

export default function QuestionPanel({ cognitive }) {
  const [idx, setIdx] = useState(0);
  const [feedback, setFeedback] = useState("");

  const level = cognitive?.level ?? 2;
  const questions = useMemo(() => getQuestionSetForLevel(level), [level]);
  const q = questions[idx % questions.length];

  useEffect(() => setFeedback(""), [level]);

  function answer(choice) {
    if (feedback) return;
    const correct = choice === q.answer;
    setFeedback(correct ? "Correct ✅" : `Not quite ❌ (Answer: ${q.answer})`);
  }

  function next() {
    setIdx((v) => v + 1);
    setFeedback("");
  }

  return (
    <div>
      {cognitive?.suggestedBreak ? (
        <div className="alert">
          <b>Break mode:</b> score dipped. Questions are softened until you recover.
        </div>
      ) : null}

      <div className="qBox">
        <div className="qTop">
          <div className="qTag">Difficulty: {levelToLabel(level)}</div>
          <div className="qTag">Live Score: {Math.round(cognitive?.score ?? 0)}</div>
        </div>

        <div className="qPrompt">{q.prompt}</div>

        <div className="qChoices">
          {q.choices.map((c) => (
            <button key={c} className="choice" onClick={() => answer(c)}>
              {c}
            </button>
          ))}
        </div>

        {feedback ? <div className="alert" style={{ marginTop: 10 }}>{feedback}</div> : null}

        <div className="row" style={{ marginTop: 10 }}>
          <button className="btn btnPrimary" onClick={next}>
            Next
          </button>
          <div className="muted">Tip: look away + blink slowly to recover.</div>
        </div>
      </div>
    </div>
  );
}