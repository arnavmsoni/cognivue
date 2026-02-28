import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  getReadingArticles,
  getArticleById,
  getQuestionPoolForArticle,
  levelToDifficulty,
} from "../lib/adaptation.js";

const QUESTIONS_PER_ARTICLE = 10;

const DIFFICULTY_COLOR = {
  easy: "var(--good)",
  medium: "var(--accent)",
  hard: "var(--warn)",
};
const DIFFICULTY_ORDER = ["easy", "medium", "hard"];

const EMOTION_TIPS = {
  Distracted: "Focus drift detected. Re-read the last paragraph before answering.",
  Engaged: "Engagement looks good. Keep this pace.",
  Focused: "Strong focus signal. Keep your retrieval concise.",
  Relaxed: "Calm state detected. Use that for careful reasoning.",
  Neutral: "",
};

function randomFrom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function shuffleList(list) {
  const next = [...list];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function createUsedMap() {
  return {
    easy: new Set(),
    medium: new Set(),
    hard: new Set(),
  };
}

export default function QuestionPanel({ cognitive }) {
  const articles = useMemo(() => getReadingArticles(), []);
  const [hasBegun, setHasBegun] = useState(false);
  const [articleId, setArticleId] = useState(articles[0]?.id || "");

  const [mode, setMode] = useState("setup"); // setup | active | complete
  const [questionIndex, setQuestionIndex] = useState(0);
  const [question, setQuestion] = useState(null);
  const [questionDifficulty, setQuestionDifficulty] = useState("medium");
  const [selectedChoice, setSelectedChoice] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [correctCount, setCorrectCount] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [completedArticles, setCompletedArticles] = useState(0);

  const usedByDifficultyRef = useRef(createUsedMap());
  const focusSamplesRef = useRef([]);
  const liveLevelRef = useRef(cognitive?.level ?? 2);
  const lastAnswerCorrectRef = useRef(null);
  const article = useMemo(() => getArticleById(articleId), [articleId]);

  const accuracy = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0;
  const emotionTip = EMOTION_TIPS[cognitive?.emotion] ?? "";

  useEffect(() => {
    if (!articleId && articles[0]?.id) setArticleId(articles[0].id);
  }, [articleId, articles]);

  useEffect(() => {
    liveLevelRef.current = cognitive?.level ?? 2;
  }, [cognitive?.level]);

  useEffect(() => {
    if (mode !== "active" || !question || feedback) return undefined;

    // Seed with current focus level so very short response times still have a sample.
    focusSamplesRef.current = [liveLevelRef.current];
    const timer = setInterval(() => {
      focusSamplesRef.current.push(liveLevelRef.current);
    }, 1000);

    return () => clearInterval(timer);
  }, [mode, questionIndex, question, feedback]);

  function getUniqueQuestion(targetDifficulty) {
    const fallbackOrder = ["medium", "easy", "hard"];
    const ordered = [targetDifficulty, ...fallbackOrder.filter((d) => d !== targetDifficulty)];

    for (const difficulty of ordered) {
      const pool = getQuestionPoolForArticle(articleId, difficulty);
      const used = usedByDifficultyRef.current[difficulty];
      const remaining = pool.filter((item) => !used.has(item.id));
      if (remaining.length > 0) {
        const chosen = randomFrom(remaining);
        used.add(chosen.id);
        return { ...chosen, difficulty, choices: shuffleList(chosen.choices) };
      }
    }

    return null;
  }

  function setNextQuestion(nextIndex, targetDifficulty) {
    const adaptiveDifficulty = nextIndex === 0
      ? "medium"
      : (targetDifficulty || "medium");
    const nextQuestion = getUniqueQuestion(adaptiveDifficulty);

    setQuestion(nextQuestion);
    setQuestionDifficulty(nextQuestion?.difficulty || adaptiveDifficulty);
    setQuestionIndex(nextIndex);
    setSelectedChoice(null);
    setFeedback("");
  }

  function startArticleSession(nextArticleId) {
    usedByDifficultyRef.current = createUsedMap();
    setCorrectCount(0);
    setAnsweredCount(0);
    setStreak(0);
    setMode("active");
    setArticleId(nextArticleId);

    // Force first question to medium difficulty for every article.
    const mediumPool = getQuestionPoolForArticle(nextArticleId, "medium");
    const first = randomFrom(mediumPool);
    if (first) {
      usedByDifficultyRef.current.medium.add(first.id);
      setQuestion({ ...first, difficulty: "medium", choices: shuffleList(first.choices) });
      setQuestionDifficulty("medium");
      setQuestionIndex(0);
      setSelectedChoice(null);
      setFeedback("");
      focusSamplesRef.current = [];
      lastAnswerCorrectRef.current = null;
    } else {
      setQuestion(null);
      setQuestionDifficulty("medium");
      setQuestionIndex(0);
      setSelectedChoice(null);
      setFeedback("");
      focusSamplesRef.current = [];
      lastAnswerCorrectRef.current = null;
    }
  }

  function answer(choice) {
    if (!question || feedback) return;

    const correct = choice === question.answer;
    lastAnswerCorrectRef.current = correct;
    setSelectedChoice(choice);
    setFeedback(correct ? "correct" : "wrong");
    setAnsweredCount((count) => count + 1);

    if (correct) {
      setCorrectCount((count) => count + 1);
      setStreak((value) => value + 1);
    } else {
      setStreak(0);
    }
  }

  function nextQuestion() {
    if (!feedback) return;

    if (questionIndex >= QUESTIONS_PER_ARTICLE - 1) {
      setMode("complete");
      setCompletedArticles((count) => count + 1);
      return;
    }

    const samples = focusSamplesRef.current;
    const avgFocusLevel = samples.length > 0
      ? samples.reduce((sum, value) => sum + value, 0) / samples.length
      : liveLevelRef.current;
    const roundedFocusLevel = Math.round(avgFocusLevel);
    const baseDifficulty = levelToDifficulty(roundedFocusLevel);
    const baseIdx = DIFFICULTY_ORDER.indexOf(baseDifficulty);
    const shift = lastAnswerCorrectRef.current ? 1 : -1;
    const nextDifficultyIdx = Math.max(0, Math.min(DIFFICULTY_ORDER.length - 1, baseIdx + shift));
    const nextDifficulty = DIFFICULTY_ORDER[nextDifficultyIdx];

    setNextQuestion(questionIndex + 1, nextDifficulty);
  }

  function continueToNextArticle() {
    const currentIdx = articles.findIndex((item) => item.id === articleId);
    const safeCurrent = currentIdx >= 0 ? currentIdx : 0;
    const nextIdx = (safeCurrent + 1) % articles.length;
    const nextArticleId = articles[nextIdx].id;
    startArticleSession(nextArticleId);
  }

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
        <div className="kpi">
          <div className={`kpiVal ${streak >= 3 ? "good" : ""}`} style={{ fontSize: 18 }}>{streak}</div>
          <div className="kpiLab">Streak</div>
        </div>
        <div className="kpi">
          <div className="kpiVal" style={{ fontSize: 18, color: "var(--accent)" }}>{accuracy}%</div>
          <div className="kpiLab">Accuracy</div>
        </div>
        <div className="kpi">
          <div className="kpiVal" style={{ fontSize: 18 }}>{completedArticles}</div>
          <div className="kpiLab">Articles Done</div>
        </div>
      </div>

      {mode === "setup" && (
        <div className="qBox">
          {!hasBegun ? (
            <>
              <div className="qPrompt">Begin a reading session.</div>
              <div className="muted" style={{ marginTop: 8 }}>
                Each article is 700-800 words. You will answer 10 questions per article.
                The first question is medium, then the next 9 adapt to your focus level.
              </div>
              <div className="row" style={{ marginTop: 14 }}>
                <button className="btn btnPrimary" onClick={() => setHasBegun(true)}>Begin Reading</button>
              </div>
            </>
          ) : (
            <>
              <div className="qPrompt">Choose an article.</div>
              <div style={{ marginTop: 10 }}>
                <select
                  value={articleId}
                  onChange={(e) => setArticleId(e.target.value)}
                  className="btn"
                  style={{ width: "100%", textAlign: "left", appearance: "none" }}
                >
                  {articles.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.title} ({item.wordCount} words)
                    </option>
                  ))}
                </select>
              </div>
              <div className="row" style={{ marginTop: 12 }}>
                <button className="btn btnPrimary" onClick={() => startArticleSession(articleId)}>
                  Start Article
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {mode === "active" && article && question && (
        <div className="qBox" style={{ marginTop: 0, maxHeight: "78vh", overflowY: "auto", textAlign: "left", paddingBottom: 220 }}>
          <div>
            <div className="qTop">
              <div className="qTag">{article.topic}</div>
              <div className="qTag">{article.wordCount} words</div>
            </div>
            <div className="qPrompt" style={{ fontSize: 18 }}>{article.title}</div>
            <div style={{ marginTop: 10, lineHeight: 1.62, color: "var(--text)", whiteSpace: "pre-line", fontSize: 14 }}>
              {article.content}
            </div>
          </div>

          <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
            <div className="qTop">
              <div
                className="qTag"
                style={{
                  borderColor: `${DIFFICULTY_COLOR[questionDifficulty]}55`,
                  color: DIFFICULTY_COLOR[questionDifficulty],
                  background: `${DIFFICULTY_COLOR[questionDifficulty]}1A`,
                }}
              >
                {questionDifficulty.toUpperCase()}
              </div>
              <div className="qTag">Q {questionIndex + 1}/{QUESTIONS_PER_ARTICLE}</div>
            </div>

            <div className="qPrompt">{question.prompt}</div>
            <div className="qChoices">
              {question.choices.map((choice) => {
                let extraClass = "";
                if (feedback && choice === selectedChoice) {
                  extraClass = feedback === "correct" ? " correct" : " wrong";
                } else if (feedback && choice === question.answer && selectedChoice !== question.answer) {
                  extraClass = " correct";
                }

                return (
                  <button
                    key={choice}
                    className={`choice${extraClass}`}
                    onClick={() => answer(choice)}
                    disabled={!!feedback}
                    style={{ opacity: feedback && choice !== selectedChoice && choice !== question.answer ? 0.45 : 1 }}
                  >
                    {choice}
                  </button>
                );
              })}
            </div>

            {feedback === "correct" && (
              <div className="alert alertGood" style={{ marginTop: 10 }}>
                Correct. {streak >= 3 ? `${streak} in a row.` : ""}
              </div>
            )}
            {feedback === "wrong" && (
              <div className="alert alertBad" style={{ marginTop: 10 }}>
                Not quite. Correct answer: <b>{question.answer}</b>
              </div>
            )}

            {emotionTip && !feedback && (
              <div className="alert" style={{ marginTop: 8, fontSize: 12 }}>{emotionTip}</div>
            )}

            <div className="row" style={{ marginTop: 12 }}>
              <button className="btn btnPrimary" disabled={!feedback} onClick={nextQuestion}>
                {questionIndex >= QUESTIONS_PER_ARTICLE - 1 ? "Finish Article" : "Next Question"}
              </button>
              <div className="muted">Focus score: {Math.round((cognitive?.attention ?? 0) * 100)}%</div>
            </div>
          </div>
        </div>
      )}

      {mode === "complete" && article && (
        <div className="qBox">
          <div className="qPrompt">Article complete: {article.title}</div>
          <div className="muted" style={{ marginTop: 8 }}>
            You answered {answeredCount} questions with {accuracy}% accuracy.
            The next article is ready with the same 10-question adaptive format.
          </div>
          <div className="row" style={{ marginTop: 12 }}>
            <button className="btn btnPrimary" onClick={continueToNextArticle}>Start Next Article</button>
            <button className="btn" onClick={() => setMode("setup")}>Choose Different Article</button>
          </div>
        </div>
      )}

      {cognitive && (
        <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div className="metricRow">
            <div className="metricLabel">
              <span>Attention</span>
              <span style={{ color: "var(--good)" }}>{Math.round((cognitive.attention ?? 0) * 100)}%</span>
            </div>
            <div className="metricProgress">
              <div className="metricProgressFill" style={{ width: `${Math.round((cognitive.attention ?? 0) * 100)}%`, background: "linear-gradient(90deg, var(--accent2), var(--good))" }} />
            </div>
          </div>

          <div className="metricRow">
            <div className="metricLabel">
              <span>Fatigue</span>
              <span style={{ color: "var(--warn)" }}>{Math.round((cognitive.fatigue ?? 0) * 100)}%</span>
            </div>
            <div className="metricProgress">
              <div className="metricProgressFill" style={{ width: `${Math.round((cognitive.fatigue ?? 0) * 100)}%`, background: "linear-gradient(90deg, var(--accent2), var(--warn))" }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
