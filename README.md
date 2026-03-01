# Cognivue

Biometric-adaptive reading practice that personalizes question difficulty in real time using on-device computer vision.
Youtube link: https://youtu.be/PBqwbirfb5Y

## Team Collaboration Note

This project was developed collaboratively in live coding sessions using Live Share, with both teammates actively pairing on architecture, implementation, and testing decisions.

## What This Project Is

Cognivue is a browser app for reading comprehension practice where difficulty adapts continuously to learner state.

- The webcam feed is processed locally with MediaPipe Face Landmarker.
- Live vision signals (gaze drift, blink behavior, eye openness, head pose) are converted into a focus/cognitive level.
- For each reading article, the app runs a 10-question adaptive sequence:
  - Q1 starts at medium.
  - During each question, focus level is sampled every second.
  - On answer, next difficulty is chosen from:
    - `rounded_average_focus_level`
    - then shifted by correctness:
      - correct -> `+1` difficulty tier
      - wrong -> `-1` difficulty tier
  - Difficulty is clamped to `easy | medium | hard`.

This creates a closed-loop system: biometric attention -> adaptive difficulty -> user performance -> next adaptive step.

## Why It Is Different

Most study tools adapt only on historical correctness. Cognivue adapts on both:

- performance signal (right/wrong), and
- live biometric engagement while the learner is answering.

The result is a more responsive and context-aware learning experience.

## Core Tech Stack

- Frontend: React 19 + Vite
- Vision: `@mediapipe/tasks-vision` Face Landmarker (in-browser)
- Runtime: 100% client-side (no backend required for demo)

## Privacy Model

- Webcam frames are processed in-browser.
- Video is not uploaded or persisted by this app.
- Model assets are loaded from MediaPipe/CDN endpoints at runtime.

## Quick Start (Judges)

### Prerequisites

- Node.js 18+ (recommended: Node 20+)
- A laptop/desktop browser with webcam support (Chrome recommended)

### Run

```bash
cd client
npm install
npm run dev
```

Open the local URL shown by Vite (usually `http://localhost:5173`).

### Production Build Check

```bash
cd client
npm run build
npm run preview
```

## 3-Minute Judge Demo Walkthrough

1. Start Vision
- Click `Start Vision` in the Vision Engine panel.
- Grant webcam permission.
- Show that metrics and score start updating live.

2. Start Reading Flow
- In Adaptive Practice, click `Begin Reading`.
- Choose an article (each is ~700-800 words).
- Click `Start Article`.

3. Show Combined Scroll Experience
- In the right reading panel, scroll through the article.
- Continue scrolling down in the same panel to reach the question section (no page scroll needed).

4. Show Adaptive Logic
- Answer one question correctly: note next question trends harder (relative to average focus).
- Answer one question incorrectly: note next question trends easier.
- Mention that focus is sampled every second and averaged per question before the difficulty shift.

5. Show Session Progression
- Highlight `Q x/10`.
- Finish article and show `Start Next Article`.

## What Judges Should Verify

Use this checklist during evaluation:

- Vision pipeline runs live after webcam permission.
- Reading flow starts with explicit `Begin Reading` and article selection.
- Article and question are in one internally scrollable panel.
- Answer choices are randomized per question.
- No question repetition within an article instance.
- First question is medium.
- Q2-Q10 adapt based on:
  - average per-second focus level while answering,
  - shifted by correctness (`+1`/`-1` tier).
- After 10 questions, the app offers the next article in the same format.

## Project Structure (Key Files)

- `src/components/VisionPanel.jsx`
  - MediaPipe integration and cognitive metric computation.
- `src/lib/visionMetrics.js`
  - Low-level vision feature extraction helpers.
- `src/lib/adaptation.js`
  - Reading corpus and difficulty-based question banks.
- `src/components/QuestionPanel.jsx`
  - Reading UX, per-question focus sampling, adaptive question selection.
- `src/App.jsx`
  - Main layout and panel wiring.

## Notes and Limitations

- This is an MVP calibration: focus and score tuning constants are heuristic and can be improved with user-study data.
- Lighting, camera angle, and face visibility affect tracking quality.
- Current reading corpus is intentionally small for demo clarity; architecture supports expansion.

## Troubleshooting

- Camera does not start:
  - Check browser camera permission.
  - Ensure no other app is exclusively using the webcam.
  - Reload page after granting permission.
- Model load issues:
  - Confirm internet access (MediaPipe model/CDN fetch required).
- Metrics feel noisy:
  - Improve lighting and center face in frame.

## Evaluation Summary

Cognivue demonstrates a high-signal technical concept: real-time, privacy-preserving biometric adaptation for reading comprehension. It combines computer vision, adaptive pedagogy, and interactive UX into a reproducible browser demo that judges can run in minutes.
