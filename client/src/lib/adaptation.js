export function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}

export function adaptFromMetrics({ score, fatigue, attention }) {
  let level = 2;
  if (score >= 85) level = 3;
  else if (score >= 65) level = 2;
  else if (score >= 45) level = 1;
  else level = 0;

  const suggestedBreak = fatigue > 0.65 || (score < 35 && attention < 0.45);
  return { level, suggestedBreak };
}

export function levelToLabel(level) {
  if (level === 3) return "Hard";
  if (level === 2) return "Medium";
  if (level === 1) return "Easy";
  return "Recovery";
}

export function getQuestionSetForLevel(level) {
  const easy = [
    { prompt: "If x = 3, what is 2x?", choices: ["3", "6", "9", "12"], answer: "6" },
    { prompt: "What is the synonym of 'rapid'?", choices: ["slow", "quick", "late", "sad"], answer: "quick" },
    { prompt: "What is 15% of 100?", choices: ["5", "10", "15", "20"], answer: "15" },
  ];

  const med = [
    { prompt: "Solve: 3x + 5 = 20", choices: ["x = 3", "x = 4", "x = 5", "x = 6"], answer: "x = 5" },
    { prompt: "Which fraction is largest?", choices: ["3/8", "2/5", "5/12", "7/20"], answer: "2/5" },
    {
      prompt: "If a book costs $24 after 20% off, what was the original price?",
      choices: ["$26", "$28", "$30", "$32"],
      answer: "$30",
    },
  ];

  const hard = [
    { prompt: "If f(x)=2x^2-3x+1, what is f(3)?", choices: ["10", "12", "14", "16"], answer: "10" },
    {
      prompt: "A train travels 180 miles in 3 hours. At this rate, how far in 5 hours?",
      choices: ["240", "270", "300", "330"],
      answer: "300",
    },
    {
      prompt: "Which statement best explains correlation vs causation?",
      choices: [
        "Correlation proves causation",
        "Causation always implies correlation",
        "Correlation can exist without causation",
        "They are the same concept",
      ],
      answer: "Correlation can exist without causation",
    },
  ];

  if (level === 0) return easy;
  if (level === 1) return [...easy, ...med];
  if (level === 2) return med;
  return hard;
}