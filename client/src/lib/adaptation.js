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

export function levelToDifficulty(level) {
  if (level >= 3) return "hard";
  if (level <= 1) return "easy";
  return "medium";
}

const ARTICLES = [
  {
    id: "reading-deliberate-loop",
    title: "The Deliberate Reading Loop",
    topic: "Reading Strategy",
    wordCount: 756,
    content: `Most students think reading is a one-step task: open a chapter, move your eyes across the page, and hope the information stays. That approach feels productive because time passes and pages turn, but it often produces weak recall. The brain does not store meaning just because words were visible. It stores meaning when attention, organization, and retrieval work together. A better model is to treat reading as a loop rather than a line. You preview, read, retrieve, and refine. Then you loop again with purpose.

Previewing is not skimming for speed. It is a short setup ritual that gives your brain a map before details arrive. Spend two or three minutes with headings, diagrams, bold terms, and summary questions. Ask what the section is trying to prove, compare, or explain. This small step lowers cognitive load because incoming facts have places to attach. Without a map, every sentence feels equally important; with a map, relevance becomes visible.

The first read should be slower than most people expect. Slow reading is not a weakness when the goal is understanding. It allows you to notice structure: definitions, claims, evidence, exceptions, and transitions. Instead of highlighting half the page, mark only decision points. For example, circle a term that changes meaning in context, bracket a causal chain, or note where an argument depends on an assumption. Those marks become retrieval cues later. If your notes do not guide a future memory search, they are decoration.

After one section, close the text and retrieve from memory. This is the most neglected step and the most valuable one. In one minute, write what you remember in plain language. Include one core idea, one supporting detail, and one uncertainty. Retrieval reveals gaps immediately. When students skip retrieval, gaps stay hidden until a quiz exposes them. When students retrieve early, they can repair understanding while the material is still fresh.

Refinement comes next. Reopen the text and compare your recall with what is actually there. Correct errors, fill missing links, and compress the section into a two-sentence summary. Compression forces prioritization. If everything feels equally important, nothing is truly learned. Good summaries keep relationships intact: what causes what, what contrasts with what, and what conditions limit a rule.

Reading quality also depends on session design. Long, unbroken blocks often produce attention drift. A tighter cycle works better: twenty to thirty minutes of focused reading, a short break, then another cycle. During the break, avoid rapid context switching into social feeds or high-stimulation content. Those jumps can make it harder to re-enter dense material. A brief walk, water refill, or quiet reset preserves mental continuity.

Environment matters, but less than many students assume. You do not need perfect silence. You need predictable conditions and low friction. Keep the same study location when possible, reduce notification noise, and prepare all materials before the timer starts. Friction steals attention in tiny pieces. Looking for a pen, opening extra tabs, or checking one message seems harmless, yet each interruption breaks the thread that complex reading requires.

Motivation is often treated as the engine of reading, but process is more reliable than mood. If you wait to feel inspired, consistency collapses. If you begin with a repeatable loop, motivation usually follows progress. The loop creates small wins: clearer notes, faster retrieval, and fewer surprises on practice questions. Those wins reinforce effort.

Assessment should mirror the loop. Instead of asking only, "How long did I read?" ask, "What can I retrieve without looking?" and "Can I explain this concept to someone else?" Time is an input, not an outcome. Retrieval accuracy, explanation clarity, and transfer to new questions are stronger indicators of real learning.

Over weeks, the deliberate reading loop compounds. Early sessions may feel slower than passive reading, but retention rises, review time falls, and confidence becomes evidence-based. Students who use this method are not reading more pages than everyone else; they are extracting more understanding per page. In high-load courses, that difference is often the margin between cramming and mastery.`
  },
  {
    id: "reading-spacing-sleep",
    title: "Spacing, Sleep, and the Memory Curve",
    topic: "Learning Science",
    wordCount: 748,
    content: `Many learners assume forgetting is a failure. In reality, forgetting is normal, and it is exactly why spacing works. Memory traces weaken when unused, but each successful retrieval strengthens and reorganizes them. The key is timing. If review happens too soon, effort is low and gains are shallow. If review happens too late, retrieval fails completely. Effective study lives between those extremes: enough difficulty to challenge recall, not enough to break it.

Spacing means distributing practice across days rather than compressing everything into one session. A common pattern is first exposure, short recall later the same day, then reviews one day, three days, and seven days later. These intervals are not magic numbers; they are starting points. Hard material may need tighter spacing at first, while familiar material can stretch further apart. The principle is stable: revisit just as memory begins to fade.

Retrieval practice is the engine that makes spacing useful. Re-reading notes can feel fluent, but fluency is not mastery. You need moments where the answer is absent and must be reconstructed. Flashcards, short free-recall summaries, and low-stakes quizzes all work when they force generation. Even brief retrieval, done consistently, outperforms long passive review sessions.

Sleep is the partner variable students often ignore. During sleep, the brain consolidates recent learning, stabilizing useful patterns and integrating them with older knowledge. Late-night cramming followed by short sleep can create the illusion of preparation, but recall quality the next day often drops, especially under stress. Seven to nine hours of sleep does not guarantee high performance, yet chronic sleep loss reliably undermines it.

Stress interacts with this system in subtle ways. Mild pressure can increase alertness, but sustained stress narrows attention and reduces flexible thinking. That is why students sometimes remember isolated facts yet struggle with application questions. The solution is not to eliminate challenge; it is to manage recovery. Short breaks, predictable routines, and realistic daily targets keep stress in a workable range.

A useful weekly structure combines these ideas. Start with focused learning blocks for new content. End each block with a short retrieval check. Schedule brief spaced reviews across the week, mixing old and new material. Include one cumulative session that forces topic switching. Interleaving topics feels harder than blocking one chapter at a time, but it improves discrimination, which is critical on exams where question types are mixed.

Tracking should be simple and behavior-based. Record what you reviewed, whether retrieval was successful, and when the next review is due. Avoid overbuilding dashboards that take longer to maintain than the study itself. A small log with dates and confidence ratings is enough to reveal patterns, such as topics repeatedly missed or intervals that are too long.

Technology can support spacing, but it can also distract from it. Apps are helpful when they automate scheduling and surface overdue reviews. They are harmful when students spend energy customizing themes, reorganizing decks, or chasing streaks without reflection. The metric that matters is retrieval success on meaningful questions, not app activity.

When exams approach, spacing does not disappear. Intervals simply compress. You still alternate recall and feedback, but cycles become shorter and more targeted toward weak areas. The final days should prioritize active retrieval, error correction, and sleep protection. Trading sleep for one extra passive read usually reduces net performance.

Long-term, spacing and sleep create a durable advantage because they scale. Cramming depends on urgency and cannot be sustained. A spaced system depends on routine and improves with repetition. Students who adopt it often report lower panic, better recall under pressure, and more time for higher-level practice. The memory curve never vanishes, but with deliberate spacing and recovery, it becomes a tool instead of a threat.`
  }
];

const QUESTION_BANK = {
  "reading-deliberate-loop": {
    easy: [
      { id: "dl-e1", prompt: "What does the article describe as the most neglected but most valuable step?", choices: ["Previewing", "Retrieval", "Highlighting", "Speed reading"], answer: "Retrieval" },
      { id: "dl-e2", prompt: "How long does the article suggest for a focused reading cycle before a break?", choices: ["5-10 minutes", "20-30 minutes", "45-60 minutes", "90 minutes"], answer: "20-30 minutes" },
      { id: "dl-e3", prompt: "According to the article, what should you do immediately after reading one section?", choices: ["Start the next section", "Close the text and recall", "Rewrite every paragraph", "Watch a summary video"], answer: "Close the text and recall" },
      { id: "dl-e4", prompt: "What is the main purpose of previewing headings and diagrams?", choices: ["To finish faster", "To lower cognitive load with a map", "To avoid note-taking", "To memorize exact wording"], answer: "To lower cognitive load with a map" },
      { id: "dl-e5", prompt: "Which note style does the article discourage?", choices: ["Marking decision points", "Bracketing causal chains", "Highlighting half the page", "Writing two-sentence summaries"], answer: "Highlighting half the page" },
      { id: "dl-e6", prompt: "What should a one-minute recall include?", choices: ["Only definitions", "Core idea, support detail, uncertainty", "Every example in order", "A full chapter rewrite"], answer: "Core idea, support detail, uncertainty" },
      { id: "dl-e7", prompt: "Why does the article recommend a predictable study setup?", choices: ["It looks professional", "It reduces attention-friction", "It increases reading speed by default", "It replaces retrieval"], answer: "It reduces attention-friction" },
      { id: "dl-e8", prompt: "Which question is a better learning metric than time spent reading?", choices: ["How many pages were opened", "How long the timer ran", "What can be retrieved without looking", "How many highlights were made"], answer: "What can be retrieved without looking" },
      { id: "dl-e9", prompt: "What does the article say about motivation?", choices: ["Mood is enough", "Process is more reliable than mood", "Motivation is irrelevant", "Only pressure creates motivation"], answer: "Process is more reliable than mood" },
      { id: "dl-e10", prompt: "What is the long-term benefit of the deliberate loop?", choices: ["More pages per day", "Less need for classes", "Higher retention per page", "No need for exams"], answer: "Higher retention per page" }
    ],
    medium: [
      { id: "dl-m1", prompt: "Why does previewing reduce overload during the first read?", choices: ["It pre-memorizes facts", "It gives structure for attaching details", "It shortens the chapter", "It removes difficult terms"], answer: "It gives structure for attaching details" },
      { id: "dl-m2", prompt: "What is the core reason retrieval is inserted between reading and refinement?", choices: ["To increase page count", "To expose understanding gaps early", "To delay note-taking", "To replace summaries"], answer: "To expose understanding gaps early" },
      { id: "dl-m3", prompt: "The article frames highlighting as weak when it becomes excessive because it...", choices: ["Uses too much ink", "Adds visual noise without retrieval cues", "Takes more time than typing", "Confuses chapter order"], answer: "Adds visual noise without retrieval cues" },
      { id: "dl-m4", prompt: "Which sequence best matches the deliberate loop?", choices: ["Read, test, preview, summarize", "Preview, read, retrieve, refine", "Retrieve, preview, speed-read, rest", "Highlight, reread, rest, skip"], answer: "Preview, read, retrieve, refine" },
      { id: "dl-m5", prompt: "Why does the article recommend low-stimulation breaks between cycles?", choices: ["To avoid all phone use forever", "To preserve continuity for re-entry", "To reduce total study time", "To increase stress tolerance"], answer: "To preserve continuity for re-entry" },
      { id: "dl-m6", prompt: "What does 'compression' in refinement force the learner to do?", choices: ["Write longer notes", "Prioritize relationships between ideas", "Ignore exceptions", "Avoid summaries"], answer: "Prioritize relationships between ideas" },
      { id: "dl-m7", prompt: "How does the article distinguish input from outcome?", choices: ["Input is accuracy, outcome is pages", "Input is time, outcome is recall quality", "Input is confidence, outcome is speed", "Input is highlighting, outcome is flow"], answer: "Input is time, outcome is recall quality" },
      { id: "dl-m8", prompt: "Which behavior most directly supports the article's friction-reduction principle?", choices: ["Preparing materials before starting", "Increasing session length daily", "Switching environments often", "Using multiple playlists"], answer: "Preparing materials before starting" },
      { id: "dl-m9", prompt: "A student rereads for an hour but cannot explain concepts. Which missing loop step is most likely?", choices: ["Preview", "Retrieval", "Break timing", "Diagram scanning"], answer: "Retrieval" },
      { id: "dl-m10", prompt: "Why is 'slow reading' defended in the article?", choices: ["It guarantees perfect scores", "It helps detect argument structure and constraints", "It replaces practice questions", "It minimizes note quality"], answer: "It helps detect argument structure and constraints" }
    ],
    hard: [
      { id: "dl-h1", prompt: "Which claim best captures the article's learning model?", choices: ["Memory grows mainly with exposure volume", "Retention rises when retrieval repeatedly tests structure", "Motivation determines note quality", "Speed should be prioritized over precision"], answer: "Retention rises when retrieval repeatedly tests structure" },
      { id: "dl-h2", prompt: "If a student has high confidence but low transfer to new questions, what diagnosis aligns with the article?", choices: ["Too much retrieval", "Input-focused tracking masking weak outcome checks", "Not enough highlighting", "Overuse of summary compression"], answer: "Input-focused tracking masking weak outcome checks" },
      { id: "dl-h3", prompt: "What is the strongest reason the loop is described as compounding over weeks?", choices: ["Sessions become longer automatically", "Early retrieval improves future encoding efficiency", "Mood improves permanently", "Difficulty disappears"], answer: "Early retrieval improves future encoding efficiency" },
      { id: "dl-h4", prompt: "Which scenario violates the article's continuity principle most directly?", choices: ["Two short sessions with one quiet break", "One session with prepared materials", "Frequent app-switching during micro-breaks", "Retrieval after each section"], answer: "Frequent app-switching during micro-breaks" },
      { id: "dl-h5", prompt: "How does the article treat summaries relative to memory?", choices: ["Summaries are optional decoration", "Summaries substitute for retrieval", "Summaries are refinement tools that reveal prioritization", "Summaries should copy wording for precision"], answer: "Summaries are refinement tools that reveal prioritization" },
      { id: "dl-h6", prompt: "What hidden assumption is challenged by the loop framework?", choices: ["Reading time directly equals understanding", "Breaks reduce all performance", "Notes should be digital", "Attention cannot be trained"], answer: "Reading time directly equals understanding" },
      { id: "dl-h7", prompt: "Which intervention would most likely increase transfer according to the article?", choices: ["Longer passive sessions", "More retrieval prompts after each segment", "Fewer breaks", "Faster first pass"], answer: "More retrieval prompts after each segment" },
      { id: "dl-h8", prompt: "The recommendation to mark decision points primarily supports which later step?", choices: ["Environment setup", "Retrieval and refinement", "Session timing", "Motivation tracking"], answer: "Retrieval and refinement" },
      { id: "dl-h9", prompt: "Why does the article treat process as 'more reliable than mood'?", choices: ["Process eliminates fatigue", "Process stabilizes behavior despite motivation variance", "Mood never matters", "Process increases reading speed only"], answer: "Process stabilizes behavior despite motivation variance" },
      { id: "dl-h10", prompt: "Which change best reflects the article's definition of mastery?", choices: ["Finishing chapters earlier", "Explaining concepts accurately without the text", "Highlighting all key terms", "Reading in perfect silence"], answer: "Explaining concepts accurately without the text" }
    ]
  },
  "reading-spacing-sleep": {
    easy: [
      { id: "ss-e1", prompt: "What does the article say forgetting usually is?", choices: ["A personal failure", "A normal process", "A sign to quit", "A grading error"], answer: "A normal process" },
      { id: "ss-e2", prompt: "What is spacing?", choices: ["Reading in one long session", "Distributing practice across days", "Studying only at night", "Skipping review"], answer: "Distributing practice across days" },
      { id: "ss-e3", prompt: "Which activity best represents retrieval practice?", choices: ["Re-reading highlighted lines", "Looking up answers immediately", "Recalling answers without looking", "Copying notes neatly"], answer: "Recalling answers without looking" },
      { id: "ss-e4", prompt: "How much sleep does the article generally recommend for learners?", choices: ["4-5 hours", "5-6 hours", "7-9 hours", "10-12 hours"], answer: "7-9 hours" },
      { id: "ss-e5", prompt: "What happens if review is always too soon?", choices: ["Effort is low and gains are shallow", "Memory collapses immediately", "Stress disappears", "Retrieval always fails"], answer: "Effort is low and gains are shallow" },
      { id: "ss-e6", prompt: "What does the article say about mild stress?", choices: ["It always harms learning", "It can increase alertness", "It replaces sleep", "It eliminates forgetting"], answer: "It can increase alertness" },
      { id: "ss-e7", prompt: "Which weekly tactic does the article support?", choices: ["Only one topic per week", "Interleaving old and new material", "No cumulative review", "Studying only weak topics"], answer: "Interleaving old and new material" },
      { id: "ss-e8", prompt: "What simple thing should tracking include?", choices: ["Deck colors", "Review date and retrieval success", "App streak icons", "Number of folders"], answer: "Review date and retrieval success" },
      { id: "ss-e9", prompt: "Near exams, what should be protected according to the article?", choices: ["Sleep", "Only speed", "New app features", "Extra passive reads"], answer: "Sleep" },
      { id: "ss-e10", prompt: "Why is cramming described as hard to sustain?", choices: ["It needs expensive tools", "It depends on urgency, not routine", "It requires group study", "It prevents note-taking"], answer: "It depends on urgency, not routine" }
    ],
    medium: [
      { id: "ss-m1", prompt: "Why is timing central in spacing?", choices: ["Because all topics share one interval", "Because review should occur as memory starts fading", "Because retrieval should always fail", "Because sleep removes timing effects"], answer: "Because review should occur as memory starts fading" },
      { id: "ss-m2", prompt: "What is the article's critique of re-reading?", choices: ["It is too slow", "It creates fluency without guaranteed mastery", "It prevents consolidation", "It causes forgetting"], answer: "It creates fluency without guaranteed mastery" },
      { id: "ss-m3", prompt: "Why are confidence ratings useful in a lightweight log?", choices: ["They replace testing", "They reveal weak topics and interval issues", "They reduce needed sleep", "They improve app streaks"], answer: "They reveal weak topics and interval issues" },
      { id: "ss-m4", prompt: "How does interleaving improve exam performance according to the text?", choices: ["By reducing total topics", "By improving discrimination across mixed question types", "By removing retrieval difficulty", "By increasing passive exposure"], answer: "By improving discrimination across mixed question types" },
      { id: "ss-m5", prompt: "What is the main risk of late-night cramming with short sleep?", choices: ["Lower next-day recall quality under stress", "Automatic forgetting of all content", "No effect if effort is high", "Better short-term transfer"], answer: "Lower next-day recall quality under stress" },
      { id: "ss-m6", prompt: "Why does the article call some app behavior harmful?", choices: ["Apps cannot schedule reviews", "Customization can replace actual retrieval work", "Digital cards lower memory", "Automation causes stress"], answer: "Customization can replace actual retrieval work" },
      { id: "ss-m7", prompt: "Which study pattern best matches the recommended weekly structure?", choices: ["New content only, no review", "Focused learning + short retrieval checks + spaced reviews", "Random reading without logs", "One long weekend cram"], answer: "Focused learning + short retrieval checks + spaced reviews" },
      { id: "ss-m8", prompt: "How does the article frame challenge in learning?", choices: ["All challenge is harmful", "Challenge should be removed before exams", "Moderate retrieval difficulty is beneficial", "Difficulty only matters for advanced students"], answer: "Moderate retrieval difficulty is beneficial" },
      { id: "ss-m9", prompt: "What does 'interval compression' near exams mean?", choices: ["Stop spacing entirely", "Shorten cycles while keeping retrieval-feedback structure", "Review only easy cards", "Replace recall with reading"], answer: "Shorten cycles while keeping retrieval-feedback structure" },
      { id: "ss-m10", prompt: "Why are dashboards with too many features discouraged?", choices: ["They are inaccurate", "They can consume more time than study", "They reduce card quality", "They prevent interleaving"], answer: "They can consume more time than study" }
    ],
    hard: [
      { id: "ss-h1", prompt: "Which statement best reflects the article's causal model?", choices: ["Spacing works mainly by reducing stress", "Spacing plus retrieval strengthens traces through effortful recall", "Sleep only affects mood", "Forgetting should be prevented completely"], answer: "Spacing plus retrieval strengthens traces through effortful recall" },
      { id: "ss-h2", prompt: "A student reports high study hours but poor transfer. Which diagnosis is most consistent with the article?", choices: ["Intervals are too short and mostly passive", "Stress is always too low", "Interleaving is unnecessary", "Sleep is unrelated"], answer: "Intervals are too short and mostly passive" },
      { id: "ss-h3", prompt: "Why is the 'sweet spot' in spacing described as between easy and impossible recall?", choices: ["Because difficult recall signals weak intelligence", "Because effortful success drives stronger updating than effortless review", "Because failure should be avoided at all costs", "Because timing does not matter"], answer: "Because effortful success drives stronger updating than effortless review" },
      { id: "ss-h4", prompt: "What tradeoff is implied by compressing intervals near exams?", choices: ["Less retrieval, more rereading", "Maintaining active recall while reducing delay lengths", "Eliminating sleep to gain time", "Dropping cumulative review"], answer: "Maintaining active recall while reducing delay lengths" },
      { id: "ss-h5", prompt: "How does chronic stress impair application questions in the article's view?", choices: ["It improves detail memory only", "It narrows attention and reduces flexible thinking", "It boosts discrimination", "It removes forgetting"], answer: "It narrows attention and reduces flexible thinking" },
      { id: "ss-h6", prompt: "Which measurement approach best matches the article's bias toward actionable tracking?", choices: ["Feature-rich dashboards without retrieval data", "Simple logs with success/failure and next due date", "Counting total app opens", "Daily highlight totals"], answer: "Simple logs with success/failure and next due date" },
      { id: "ss-h7", prompt: "Why does the article say cramming cannot scale?", choices: ["It lacks digital support", "It relies on emergency motivation instead of repeatable process", "It requires too much sleep", "It prevents any learning"], answer: "It relies on emergency motivation instead of repeatable process" },
      { id: "ss-h8", prompt: "What does interleaving add beyond simple repetition?", choices: ["More confidence with same discrimination", "Better discrimination between similar problem types", "Guaranteed shorter study time", "Less need for retrieval"], answer: "Better discrimination between similar problem types" },
      { id: "ss-h9", prompt: "Which intervention is most aligned with the article for a tired student before an exam week?", choices: ["Increase passive rereads and cut sleep", "Protect sleep and emphasize targeted retrieval", "Switch to one mega-session", "Eliminate cumulative review"], answer: "Protect sleep and emphasize targeted retrieval" },
      { id: "ss-h10", prompt: "What assumption does the article reject most strongly?", choices: ["Memory improves only through exposure volume", "Spacing needs some forgetting to work", "Sleep affects consolidation", "Effortful retrieval is useful"], answer: "Memory improves only through exposure volume" }
    ]
  }
};

export function getReadingArticles() {
  return ARTICLES;
}

export function getArticleById(articleId) {
  return ARTICLES.find((article) => article.id === articleId) || ARTICLES[0];
}

export function getQuestionPoolForArticle(articleId, difficulty) {
  const bank = QUESTION_BANK[articleId];
  if (!bank) return [];
  return bank[difficulty] || [];
}
