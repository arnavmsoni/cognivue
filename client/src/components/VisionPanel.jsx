import React, { useEffect, useRef, useState, useCallback } from "react";
import { FaceLandmarker, FilesetResolver, DrawingUtils } from "@mediapipe/tasks-vision";
import { computeEyeOpenness, estimateBlink, estimateGazeDrift, clamp01 } from "../lib/visionMetrics.js";
import { adaptFromMetrics } from "../lib/adaptation.js";

// ─── Constants ──────────────────────────────────────────────────────────────
const FACE_OVAL = [10,338,297,332,284,251,389,356,454,323,361,288,397,365,379,378,400,377,152,148,176,149,150,136,172,58,132,93,234,127,162,21,54,103,67,109];

// MediaPipe landmark indices for rich analysis
const LM = {
  LEFT_EYE_OUTER: 33, LEFT_EYE_INNER: 133,
  RIGHT_EYE_OUTER: 362, RIGHT_EYE_INNER: 263,
  LEFT_EYE_TOP: 159, LEFT_EYE_BOT: 145,
  RIGHT_EYE_TOP: 386, RIGHT_EYE_BOT: 374,
  NOSE_TIP: 4, NOSE_BRIDGE: 6,
  LEFT_MOUTH: 61, RIGHT_MOUTH: 291,
  MOUTH_TOP: 13, MOUTH_BOT: 14,
  LEFT_BROW_INNER: 107, RIGHT_BROW_INNER: 336,
  LEFT_BROW_OUTER: 70, RIGHT_BROW_OUTER: 300,
  CHIN: 152, FOREHEAD: 10,
  LEFT_CHEEK: 234, RIGHT_CHEEK: 454,
  LEFT_EYE_LEFT: 33, LEFT_EYE_RIGHT: 133,
  RIGHT_EYE_LEFT: 362, RIGHT_EYE_RIGHT: 263,
  LEFT_PUPIL_APPROX: 468, RIGHT_PUPIL_APPROX: 473,
  // Eye iris landmarks (when available)
  LEFT_IRIS_CENTER: 468,
  RIGHT_IRIS_CENTER: 473,
};

// Emotion heuristic from blend shapes / landmark geometry
function estimateEmotion(lm, blinkState, gazeState) {
  if (!lm || lm.length < 478) return "Neutral";
  try {
    const mouthTop = lm[LM.MOUTH_TOP];
    const mouthBot = lm[LM.MOUTH_BOT];
    const leftMouth = lm[LM.LEFT_MOUTH];
    const rightMouth = lm[LM.RIGHT_MOUTH];
    const leftBrow = lm[LM.LEFT_BROW_INNER];
    const rightBrow = lm[LM.RIGHT_BROW_INNER];
    const noseY = lm[LM.NOSE_BRIDGE]?.y ?? 0.5;

    const mouthOpen = Math.abs(mouthTop.y - mouthBot.y);
    const mouthWidth = Math.abs(leftMouth.x - rightMouth.x);
    const browLift = ((noseY - (leftBrow?.y ?? noseY)) + (noseY - (rightBrow?.y ?? noseY))) / 2;

    if (mouthOpen > 0.04) return "Engaged";
    if (browLift > 0.06) return "Focused";
    if (gazeState > 0.6) return "Distracted";
    if (mouthWidth > 0.26) return "Relaxed";
    return "Neutral";
  } catch { return "Neutral"; }
}

// Head pose estimation from face landmarks
function estimateHeadPose(lm) {
  if (!lm || lm.length < 10) return { yaw: 0, pitch: 0, roll: 0 };
  try {
    const nose = lm[LM.NOSE_TIP];
    const forehead = lm[LM.FOREHEAD];
    const chin = lm[LM.CHIN];
    const leftCheek = lm[LM.LEFT_CHEEK];
    const rightCheek = lm[LM.RIGHT_CHEEK];

    const yaw = (rightCheek.x - leftCheek.x - 0.3) * 100; // rough
    const pitch = (nose.y - 0.5) * 60;
    const roll = Math.atan2(rightCheek.y - leftCheek.y, rightCheek.x - leftCheek.x) * (180 / Math.PI);
    return { yaw: Math.round(yaw), pitch: Math.round(pitch), roll: Math.round(roll) };
  } catch { return { yaw: 0, pitch: 0, roll: 0 }; }
}

// Estimate pupil dilation proxy from iris/sclera ratio
function estimatePupilSize(lm) {
  if (!lm || lm.length < 478) return 50;
  try {
    const leftEyeW = Math.abs(lm[33].x - lm[133].x);
    const leftEyeH = Math.abs(lm[159].y - lm[145].y);
    const ratio = leftEyeH / Math.max(leftEyeW, 0.001);
    return clamp01(ratio * 5) * 100;
  } catch { return 50; }
}

// Stress proxy: high blink variance + sustained gaze + low eye openness
function estimateStress(blinkPerMin, gazeDrift, eyeOpen, history) {
  const blinkStress = blinkPerMin < 10 ? 0.7 : blinkPerMin > 30 ? 0.5 : 0.1;
  const gazeStress = gazeDrift * 0.6;
  const eyeStress = (1 - eyeOpen) * 0.4;
  const combined = clamp01(blinkStress * 0.4 + gazeStress * 0.35 + eyeStress * 0.25);
  return combined;
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function VisionPanel({ onMetrics }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const [ready, setReady] = useState(false);
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState("Click Start → allow webcam");
  const [err, setErr] = useState("");
  const [loadProgress, setLoadProgress] = useState(0);

  // Config state — also mirrored into a ref so the rAF loop always reads the latest values
  const [config, setConfig] = useState({
    showMesh: false,
    showIris: true,
    showBoundingBox: true,
    showAxes: true,
    drawConnectors: true,
    mirrorMode: false,      // off by default
    sensitivity: 0.5,
    blinkThreshold: 0.22,
    gazeSmoothing: 0.7,
    showHistory: true,
  });
  const configRef = useRef(config);

  const landmarkerRef = useRef(null);
  const rafRef = useRef(null);
  const lastBlinkRef = useRef({ prevClosed: false, blinks: [], lastTs: 0 });
  const gazeRef = useRef({ values: [] });
  const scoreHistoryRef = useRef([]);

  const [kpi, setKpi] = useState({
    blinkPerMin: 0,
    gazeDrift: 0,
    eyeOpen: 0,
    score: 5,
    fatigue: 0.25,
    attention: 0.7,
    level: 2,
    suggestedBreak: false,
    emotion: "Neutral",
    headPose: { yaw: 0, pitch: 0, roll: 0 },
    pupilSize: 50,
    stress: 0.2,
    faceDetected: false,
    blinkIntervalMs: 0,
    perclosScore: 0,
    leftEyeOpen: 0,
    rightEyeOpen: 0,
    asymmetry: 0,
    microExpression: "",
    fps: 0,
  });

  const fpsRef = useRef({ frames: [], lastCalc: 0 });
  // Keep configRef in sync with state so the rAF loop can read it without stale closure
  useEffect(() => { configRef.current = config; }, [config]);

  // Smoothed score to avoid jitter from blinks
  const smoothedScoreRef = useRef(0.5); // internal 0-1; maps to 1-10 whole number
  // Debounced level: only update after 2s of stability to prevent question churn
  const levelDebounceRef = useRef({ pendingLevel: 2, lastChange: 0, stableLevel: 2 });

  useEffect(() => {
    let mounted = true;
    async function init() {
      try {
        setStatus("Loading MediaPipe vision model...");
        setLoadProgress(10);

        const resolver = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );
        setLoadProgress(40);

        const landmarker = await FaceLandmarker.createFromOptions(resolver, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numFaces: 1,
          minFaceDetectionConfidence: 0.5,
          minFacePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
          outputFaceBlendshapes: true,
          outputFacialTransformationMatrixes: true,
        });

        setLoadProgress(100);
        landmarkerRef.current = landmarker;

        if (mounted) {
          setReady(true);
          setStatus("Ready — webcam idle");
        }
      } catch (e) {
        setErr(`Model load failed: ${e?.message || e}`);
        setStatus("Failed");
      }
    }

    init();
    return () => { mounted = false; stop(); };
  }, []);

  async function start() {
    setErr("");
    if (!ready) return;
    try {
      setStatus("Requesting webcam access...");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
        audio: false,
      });

      videoRef.current.srcObject = stream;
      await videoRef.current.play();

      await new Promise((resolve) => {
        const v = videoRef.current;
        if (v.videoWidth && v.videoHeight) return resolve();
        const handler = () => {
          if (v.videoWidth && v.videoHeight) {
            v.removeEventListener("loadeddata", handler);
            v.removeEventListener("loadedmetadata", handler);
            resolve();
          }
        };
        v.addEventListener("loadeddata", handler);
        v.addEventListener("loadedmetadata", handler);
      });

      setRunning(true);
      setStatus("Live — analyzing");
      loop();
    } catch (e) {
      setErr("Webcam blocked. Grant camera permission and try again.");
      setStatus("Permission denied");
    }
  }

  function stop() {
    setRunning(false);
    setStatus("Stopped");
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const v = videoRef.current;
    if (v?.srcObject) {
      v.srcObject.getTracks().forEach((t) => t.stop());
      v.srcObject = null;
    }
  }

  function loop() {
    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const landmarker = landmarkerRef.current;

      if (!video || !canvas || !landmarker || !video.videoWidth || !video.videoHeight) {
        rafRef.current = requestAnimationFrame(loop);
        return;
      }

      const now = performance.now();

      // FPS tracking
      fpsRef.current.frames.push(now);
      fpsRef.current.frames = fpsRef.current.frames.filter(t => t > now - 1000);
      const currentFps = fpsRef.current.frames.length;

      const cfg = configRef.current;  // always fresh config, no stale closure
      const ctx = canvas.getContext("2d");
      const res = landmarker.detectForVideo(video, now);

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Mirror mode
      if (cfg.mirrorMode) {
        ctx.save();
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      if (cfg.mirrorMode) ctx.restore();

      let next = { ...kpi, fps: currentFps };

      if (res.faceLandmarks?.length > 0) {
        const lm = res.faceLandmarks[0];
        const drawUtils = new DrawingUtils(ctx);
        const W = canvas.width, H = canvas.height;
        next.faceDetected = true;

        // ── Eye openness (separate left/right) ──
        const leftEyeOpen = clamp01(Math.abs(lm[159].y - lm[145].y) / Math.max(Math.abs(lm[33].x - lm[133].x), 0.001) * 3.5);
        const rightEyeOpen = clamp01(Math.abs(lm[386].y - lm[374].y) / Math.max(Math.abs(lm[362].x - lm[263].x), 0.001) * 3.5);
        const eyeOpen = (leftEyeOpen + rightEyeOpen) / 2;
        const asymmetry = Math.abs(leftEyeOpen - rightEyeOpen);

        next.eyeOpen = eyeOpen;
        next.leftEyeOpen = leftEyeOpen;
        next.rightEyeOpen = rightEyeOpen;
        next.asymmetry = asymmetry;

        // ── PERCLOS ──
        estimateBlink(eyeOpen, lastBlinkRef.current, now);
        const cutoff = now - 60_000;
        lastBlinkRef.current.blinks = lastBlinkRef.current.blinks.filter(t => t >= cutoff);
        next.blinkPerMin = lastBlinkRef.current.blinks.length;

        // Perclos: sustained closure proxy (NOT affected by a single blink frame)
        // Use a rolling 3s eye-open average so a 150ms blink doesn't tank the score
        if (!gazeRef.current.eyeOpenHistory) gazeRef.current.eyeOpenHistory = [];
        gazeRef.current.eyeOpenHistory.push({ t: now, v: eyeOpen });
        gazeRef.current.eyeOpenHistory = gazeRef.current.eyeOpenHistory.filter(x => x.t > now - 3000);
        const avgEyeOpen = gazeRef.current.eyeOpenHistory.reduce((s, x) => s + x.v, 0) / gazeRef.current.eyeOpenHistory.length;
        const perclos = clamp01(1 - avgEyeOpen);
        next.perclosScore = perclos;

        // ── Blink interval ──
        const blinks = lastBlinkRef.current.blinks;
        if (blinks.length >= 2) {
          const intervals = [];
          for (let i = 1; i < blinks.length; i++) intervals.push(blinks[i] - blinks[i-1]);
          next.blinkIntervalMs = Math.round(intervals.reduce((a,b)=>a+b,0)/intervals.length);
        }

        // ── Gaze drift ──
        const gazeDrift = estimateGazeDrift(lm, gazeRef.current);
        next.gazeDrift = gazeDrift;

        // ── Head pose ──
        next.headPose = estimateHeadPose(lm);

        // ── Pupil size proxy ──
        next.pupilSize = estimatePupilSize(lm);

        // ── Emotion ──
        next.emotion = estimateEmotion(lm, lastBlinkRef.current, gazeDrift);

        // ── Fatigue: uses 3s-averaged eye openness so a blink doesn't spike fatigue ──
        // Healthy blink rate (12-20/min) does NOT penalise score — only extremes do
        const blinkFatigueSignal = next.blinkPerMin < 6
          ? 0.7   // staring without blinking = very fatigued
          : next.blinkPerMin > 35
          ? 0.5   // rapid blinking = fatigue/stress
          : 0.05; // normal range = nearly zero fatigue contribution
        const fatigue = clamp01(
          0.45 * blinkFatigueSignal +
          0.30 * perclos +                                    // sustained closure (3s avg)
          0.15 * (Math.abs(next.headPose.pitch) / 40) +     // nodding off
          0.10 * (Math.abs(next.headPose.roll)  / 30)       // head tilt
        );

        // ── Attention: looking straight + low gaze drift = near 1.0 ──
        const yawPenalty  = clamp01(Math.abs(next.headPose.yaw)  / 35) * 0.4;
        const gazePenalty = gazeDrift * 0.6;
        const attention   = clamp01(1 - yawPenalty - gazePenalty);

        // ── SCORE: behavior is primary, distance is secondary ──
        // Face width remains a small distance proxy nudge only.
        // Face width (cheek-to-cheek) in normalized 0-1 coords:
        //   ~0.35+ = close/normal sitting distance → 10
        //   ~0.12  = ~10 inches further back       → 1
        const faceWidth = Math.abs(lm[LM.LEFT_CHEEK].x - lm[LM.RIGHT_CHEEK].x);

        // Map faceWidth → 0-1 score
        // Tune: 0.35 = close (score 10), 0.12 = far (score 1)
        const CLOSE = 0.12;  // lower threshold so max distance score is reachable farther away
        const FAR   = 0.04;  // faceWidth at "~10 inches back"         → score 1
        const distScore = clamp01((faceWidth - FAR) / (CLOSE - FAR));

        // Primary signals
        const lookAwaySignal = 1 - clamp01(gazeDrift * 2.0);
        const headTurnSignal = 1 - clamp01(Math.abs(next.headPose.yaw) / 16);
        const eyeOpenSignal  = clamp01((eyeOpen - 0.28) / 0.42);

        // Behavior drives score, distance only fine-tunes it.
        const behaviorScore = clamp01(
          0.35 * lookAwaySignal +
          0.45 * headTurnSignal +
          0.20 * eyeOpenSignal
        );
        const rawScore01 = clamp01(1 * behaviorScore + 0.00 * distScore);
        // Expand mid-range differences so score doesn't stay stuck near the center.
        const contrastedScore01 = clamp01((rawScore01 - 0.5) * 1.25 + 0.5);

        // Faster smoothing for more visible variability
        const α = 0.50;
        smoothedScoreRef.current = smoothedScoreRef.current * (1 - α) + contrastedScore01 * α;

        // Map 0-1 → 1-10, whole number
        const score = Math.min(10, Math.max(1, Math.round(1 + smoothedScoreRef.current * 9)));

        // Debug log every 2s — remove once calibrated
        if (Math.floor(now / 2000) !== Math.floor((now - 16) / 2000)) {
          console.log('[SCORE]', {
            faceWidth: faceWidth.toFixed(3),
            distScore: distScore.toFixed(2),
            lookAwaySignal: lookAwaySignal.toFixed(2),
            headTurnSignal: headTurnSignal.toFixed(2),
            eyeOpenSignal: eyeOpenSignal.toFixed(2),
            behaviorScore: behaviorScore.toFixed(2),
            rawScore01: rawScore01.toFixed(2),
            contrastedScore01: contrastedScore01.toFixed(2),
            score,
          });
        }

        next.fatigue = fatigue;
        next.attention = attention;
        next.score = score;
        next.stress = estimateStress(next.blinkPerMin, gazeDrift, avgEyeOpen);

        const adapted = adaptFromMetrics({ score: score * 10, fatigue, attention, blinkPerMin: next.blinkPerMin, gazeDrift });

        // ── Level debounce: don't flip level until new level holds for 2000ms ──
        const ld = levelDebounceRef.current;
        if (adapted.level !== ld.pendingLevel) {
          ld.pendingLevel = adapted.level;
          ld.lastChange = now;
        }
        if (now - ld.lastChange > 2000) {
          ld.stableLevel = ld.pendingLevel;
        }
        next.level = ld.stableLevel;
        next.suggestedBreak = adapted.suggestedBreak;

        // Score history for sparkline
        scoreHistoryRef.current.push(Math.round(score));
        if (scoreHistoryRef.current.length > 30) scoreHistoryRef.current.shift();

        // ── DRAWING ──
        const drawLandmarkAt = (idx, r, color) => {
          if (!lm[idx]) return;
          const x = lm[idx].x * W, y = lm[idx].y * H;
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fillStyle = color;
          ctx.fill();
        };

        // Face connectors / mesh
        if (cfg.drawConnectors) {
          try {
            drawUtils.drawConnectors(
              lm,
              FaceLandmarker.FACE_LANDMARKS_TESSELATION,
              { color: cfg.showMesh ? "rgba(0,212,255,0.12)" : "transparent", lineWidth: 0.5 }
            );
            drawUtils.drawConnectors(lm, FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE, { color: "rgba(0,212,255,0.6)", lineWidth: 1 });
            drawUtils.drawConnectors(lm, FaceLandmarker.FACE_LANDMARKS_LEFT_EYE, { color: "rgba(0,212,255,0.6)", lineWidth: 1 });
            drawUtils.drawConnectors(lm, FaceLandmarker.FACE_LANDMARKS_FACE_OVAL, { color: "rgba(0,102,255,0.3)", lineWidth: 1 });
            if (cfg.showIris) {
              drawUtils.drawConnectors(lm, FaceLandmarker.FACE_LANDMARKS_RIGHT_IRIS, { color: "rgba(0,255,200,0.8)", lineWidth: 1.5 });
              drawUtils.drawConnectors(lm, FaceLandmarker.FACE_LANDMARKS_LEFT_IRIS, { color: "rgba(0,255,200,0.8)", lineWidth: 1.5 });
            }
            drawUtils.drawConnectors(lm, FaceLandmarker.FACE_LANDMARKS_LIPS, { color: "rgba(167,139,250,0.5)", lineWidth: 1 });
            drawUtils.drawConnectors(lm, FaceLandmarker.FACE_LANDMARKS_RIGHT_EYEBROW, { color: "rgba(255,184,0,0.5)", lineWidth: 1 });
            drawUtils.drawConnectors(lm, FaceLandmarker.FACE_LANDMARKS_LEFT_EYEBROW, { color: "rgba(255,184,0,0.5)", lineWidth: 1 });
          } catch (_) {}
        }

        // Iris centers
        if (cfg.showIris && lm.length >= 478) {
          drawLandmarkAt(468, 4, "rgba(0,255,200,0.9)");
          drawLandmarkAt(473, 4, "rgba(0,255,200,0.9)");
        }

        // Head pose axes
        if (cfg.showAxes) {
          const noseTip = lm[LM.NOSE_TIP];
          const cx = noseTip.x * W, cy = noseTip.y * H;
          const len = 40;
          const yawRad = (next.headPose.yaw * Math.PI) / 180;
          const pitchRad = (next.headPose.pitch * Math.PI) / 180;

          ctx.lineWidth = 2;
          // X axis (yaw) - red
          ctx.strokeStyle = "rgba(255,60,80,0.8)";
          ctx.beginPath(); ctx.moveTo(cx, cy);
          ctx.lineTo(cx + Math.cos(yawRad) * len, cy + Math.sin(yawRad) * len * 0.3);
          ctx.stroke();
          // Y axis (pitch) - green
          ctx.strokeStyle = "rgba(0,255,136,0.8)";
          ctx.beginPath(); ctx.moveTo(cx, cy);
          ctx.lineTo(cx + Math.sin(pitchRad) * len * 0.3, cy - Math.cos(pitchRad) * len);
          ctx.stroke();
          // Z axis (depth) - blue
          ctx.strokeStyle = "rgba(0,180,255,0.8)";
          ctx.beginPath(); ctx.moveTo(cx, cy);
          ctx.lineTo(cx + 10, cy + 10);
          ctx.stroke();
        }

        // Bounding box
        if (cfg.showBoundingBox) {
          const xs = lm.map(p => p.x * W), ys = lm.map(p => p.y * H);
          const minX = Math.min(...xs), maxX = Math.max(...xs);
          const minY = Math.min(...ys), maxY = Math.max(...ys);
          const pad = 10;
          ctx.strokeStyle = "rgba(0,212,255,0.4)";
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 4]);
          ctx.strokeRect(minX - pad, minY - pad, maxX - minX + pad*2, maxY - minY + pad*2);
          ctx.setLineDash([]);

          // Corner brackets
          const drawBracket = (x, y, dx, dy) => {
            ctx.strokeStyle = "rgba(0,212,255,0.9)";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x + dx*12, y); ctx.lineTo(x, y); ctx.lineTo(x, y + dy*12);
            ctx.stroke();
          };
          drawBracket(minX-pad, minY-pad, 1, 1);
          drawBracket(maxX+pad, minY-pad, -1, 1);
          drawBracket(minX-pad, maxY+pad, 1, -1);
          drawBracket(maxX+pad, maxY+pad, -1, -1);
        }

        // Gaze direction indicator
        if (lm.length >= 478) {
          const nosePt = lm[4];
          const gx = nosePt.x * W, gy = nosePt.y * H;
          const gazeX = (lm[473].x - lm[468].x) * W * 8;
          const gazeY = (lm[473].y - lm[468].y) * H * 8;
          ctx.strokeStyle = "rgba(255,184,0,0.7)";
          ctx.lineWidth = 1.5;
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          ctx.moveTo(gx, gy);
          ctx.lineTo(gx + gazeX * 20, gy + gazeY * 20);
          ctx.stroke();
          ctx.setLineDash([]);
        }

      } else {
        next.faceDetected = false;
      }

      setKpi(next);
      onMetrics?.({
        score: next.score,
        fatigue: next.fatigue,
        attention: next.attention,
        blinkPerMin: next.blinkPerMin,
        gazeDrift: next.gazeDrift,
        status,
        level: next.level,
        suggestedBreak: next.suggestedBreak,
        emotion: next.emotion,
        headPose: next.headPose,
        stress: next.stress,
      });

      rafRef.current = requestAnimationFrame(loop);
    } catch (e) {
      console.error("Vision loop:", e);
      rafRef.current = requestAnimationFrame(loop);
    }
  }

  const toggle = (key) => setConfig(c => {
    const next = { ...c, [key]: !c[key] };
    configRef.current = next;
    return next;
  });

  const scoreHistory = scoreHistoryRef.current;
  const maxScore = Math.max(...scoreHistory, 1);

  // Color helpers
  const scoreColor = kpi.score >= 7 ? "good" : kpi.score >= 4 ? "warn" : "bad";
  const fatigueColor = kpi.fatigue < 0.35 ? "good" : kpi.fatigue < 0.65 ? "warn" : "bad";
  const stressColor = kpi.stress < 0.35 ? "good" : kpi.stress < 0.65 ? "warn" : "bad";
  const attentionColor = kpi.attention >= 0.7 ? "good" : kpi.attention >= 0.4 ? "warn" : "bad";

  return (
    <div>
      {/* Status + Controls */}
      <div className="statusRow">
        <div className={`statusDot ${running ? (kpi.faceDetected ? "active" : "warn") : ""}`} />
        <span style={{ flex: 1, fontSize: 11 }}>{status}</span>
        {running && <span style={{ fontSize: 10, color: "var(--muted)" }}>{kpi.fps} FPS</span>}
      </div>

      <div className="row" style={{ marginTop: 12 }}>
        <button className="btn btnPrimary" onClick={start} disabled={!ready || running}>
          {!ready ? (
            <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <span>Loading</span>
              <div className="loadingDots">
                <div className="loadingDot" /><div className="loadingDot" /><div className="loadingDot" />
              </div>
            </span>
          ) : "▶ Start Vision"}
        </button>
        <button className="btn btnDanger" onClick={stop} disabled={!running}>■ Stop</button>
        {!ready && loadProgress > 0 && loadProgress < 100 && (
          <div style={{ flex: 1 }}>
            <div style={{ height: 3, background: "var(--border)", borderRadius: 999, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${loadProgress}%`, background: "linear-gradient(90deg, var(--accent2), var(--accent))", borderRadius: 999, transition: "width 0.5s" }} />
            </div>
            <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 3, fontFamily: "Orbitron, monospace" }}>{loadProgress}%</div>
          </div>
        )}
      </div>

      {err ? <div className="alert alertBad" style={{ marginTop: 10 }}>{err}</div> : null}

      {/* Live Video */}
      <div className="videoWrap scanlines" style={{ marginTop: 14, minHeight: running ? undefined : 180, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <video
          ref={videoRef} playsInline muted autoPlay
          style={{ position: "absolute", width: "1px", height: "1px", opacity: 0.01, left: "-9999px" }}
        />
        <canvas ref={canvasRef} style={{ width: "100%", height: "auto", display: "block" }} />

        {!running && (
          <div style={{ position: "absolute", textAlign: "center", color: "var(--muted)", fontFamily: "Orbitron, monospace", fontSize: 12, letterSpacing: 2 }}>
            <div style={{ fontSize: 32, marginBottom: 8, opacity: 0.3 }}>◉</div>
            CAMERA OFFLINE
          </div>
        )}

        {running && (
          <>
            <div className="cornerDecor tl" /><div className="cornerDecor tr" />
            <div className="cornerDecor bl" /><div className="cornerDecor br" />

            <div className="overlayTopLeft">
              <div className={`overlayTag ${kpi.faceDetected ? "live" : ""}`}>
                {kpi.faceDetected ? "● FACE DETECTED" : "◌ NO FACE"}
              </div>
              {kpi.faceDetected && (
                <>
                  <div className="overlayTag">{kpi.emotion}</div>
                  <div className="overlayTag">
                    YAW {kpi.headPose.yaw > 0 ? "+" : ""}{kpi.headPose.yaw}°
                  </div>
                </>
              )}
            </div>

            <div className="overlayCorner">{kpi.fps} FPS</div>

            <div className="overlayText">
              Score {kpi.score}/10 • Fatigue {Math.round(kpi.fatigue * 100)}% • Attn {Math.round(kpi.attention * 100)}%
            </div>
          </>
        )}
      </div>

      {/* Main KPIs */}
      <div className="sectionDiv">Core Metrics</div>
      <div className="kpis">
        {[
          { label: "Eye Open", val: Math.round(kpi.eyeOpen * 100) + "%", raw: kpi.eyeOpen, cls: kpi.eyeOpen > 0.6 ? "good" : kpi.eyeOpen > 0.35 ? "warn" : "bad" },
          { label: "Blinks/min", val: kpi.blinkPerMin, raw: kpi.blinkPerMin / 30, cls: kpi.blinkPerMin >= 12 && kpi.blinkPerMin <= 20 ? "good" : "warn" },
          { label: "Gaze Drift", val: Math.round(kpi.gazeDrift * 100) + "%", raw: kpi.gazeDrift, cls: kpi.gazeDrift < 0.3 ? "good" : kpi.gazeDrift < 0.6 ? "warn" : "bad" },
        ].map(({ label, val, raw, cls }) => (
          <div className="kpi" key={label}>
            <div className={`kpiVal ${cls}`}>{val}</div>
            <div className="kpiLab">{label}</div>
            <div className="kpiBar"><div className="kpiBarFill" style={{ width: `${Math.round(raw * 100)}%` }} /></div>
          </div>
        ))}
      </div>

      {/* Extended KPIs */}
      <div className="sectionDiv">Deep Analysis</div>
      <div className="metricsPanel">
        {[
          { label: "Cognitive Score", val: kpi.score, unit: "/10", pct: kpi.score * 10, color: "var(--accent)" },
          { label: "Fatigue Level", val: Math.round(kpi.fatigue * 100), unit: "%", pct: kpi.fatigue * 100, color: kpi.fatigue > 0.6 ? "var(--bad)" : "var(--warn)" },
          { label: "Attention", val: Math.round(kpi.attention * 100), unit: "%", pct: kpi.attention * 100, color: "var(--good)" },
          { label: "Stress Index", val: Math.round(kpi.stress * 100), unit: "%", pct: kpi.stress * 100, color: kpi.stress > 0.5 ? "var(--bad)" : "var(--warn)" },
          { label: "PERCLOS", val: Math.round(kpi.perclosScore * 100), unit: "%", pct: kpi.perclosScore * 100, color: "var(--accent2)" },
          { label: "Pupil Size", val: Math.round(kpi.pupilSize), unit: "%", pct: kpi.pupilSize, color: "var(--accent)" },
        ].map(({ label, val, unit, pct, color }) => (
          <div className="metricRow" key={label}>
            <div className="metricLabel">
              <span>{label}</span>
              <span style={{ color }}>{val}{unit}</span>
            </div>
            <div className="metricProgress">
              <div className="metricProgressFill" style={{ width: `${Math.min(pct, 100)}%`, background: `linear-gradient(90deg, ${color}88, ${color})` }} />
            </div>
          </div>
        ))}
      </div>

      {/* Head Pose */}
      <div className="sectionDiv">Head Pose</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        {[
          { label: "YAW", val: `${kpi.headPose.yaw > 0 ? "+" : ""}${kpi.headPose.yaw}°` },
          { label: "PITCH", val: `${kpi.headPose.pitch > 0 ? "+" : ""}${kpi.headPose.pitch}°` },
          { label: "ROLL", val: `${kpi.headPose.roll > 0 ? "+" : ""}${kpi.headPose.roll.toFixed(1)}°` },
        ].map(({ label, val }) => (
          <div className="kpi" key={label}>
            <div className="kpiVal" style={{ fontSize: 16 }}>{val}</div>
            <div className="kpiLab">{label}</div>
          </div>
        ))}
      </div>

      {/* Eye Asymmetry */}
      <div className="sectionDiv">Eye Analysis</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        <div className="kpi">
          <div className="kpiVal" style={{ fontSize: 16 }}>{Math.round(kpi.leftEyeOpen * 100)}%</div>
          <div className="kpiLab">Left Eye</div>
        </div>
        <div className="kpi">
          <div className="kpiVal" style={{ fontSize: 16 }}>{Math.round(kpi.rightEyeOpen * 100)}%</div>
          <div className="kpiLab">Right Eye</div>
        </div>
        <div className="kpi">
          <div className={`kpiVal ${kpi.asymmetry > 0.2 ? "warn" : "good"}`} style={{ fontSize: 16 }}>
            {Math.round(kpi.asymmetry * 100)}%
          </div>
          <div className="kpiLab">Asymmetry</div>
        </div>
      </div>

      {/* Emotion + Score History */}
      {running && (
        <>
          <div className="sectionDiv">Emotion + History</div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <div className="emotionBadge">
              <div className="emotionDot" />
              {kpi.emotion}
            </div>
            {kpi.blinkIntervalMs > 0 && (
              <div className="emotionBadge" style={{ borderColor: "rgba(255,184,0,0.3)", background: "rgba(255,184,0,0.08)" }}>
                <div className="emotionDot" style={{ background: "var(--warn)" }} />
                Blink Interval: {(kpi.blinkIntervalMs / 1000).toFixed(1)}s
              </div>
            )}
          </div>

          {config.showHistory && scoreHistory.length > 2 && (
            <div style={{ marginTop: 10, padding: 10, border: "1px solid var(--border)", borderRadius: 12, background: "rgba(0,0,0,0.2)" }}>
              <div style={{ fontSize: 10, fontFamily: "Orbitron, monospace", color: "var(--muted)", letterSpacing: 1, marginBottom: 6 }}>SCORE HISTORY</div>
              <div className="sparkline">
                {scoreHistory.map((s, i) => (
                  <div key={i} className="sparkBar" style={{ height: `${Math.round((s / maxScore) * 100)}%` }} />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Config Panel */}
      <div className="sectionDiv">Tracking Config</div>
      <div className="configPanel">
        {[
          { key: "showMesh", label: "Face Mesh" },
          { key: "showIris", label: "Iris Tracking" },
          { key: "showBoundingBox", label: "Bounding Box" },
          { key: "showAxes", label: "Head Pose Axes" },
          { key: "mirrorMode", label: "Mirror Mode" },
          { key: "showHistory", label: "Score History" },
        ].map(({ key, label }) => (
          <div className="configRow" key={key}>
            <span className="configLabel">{label}</span>
            <div className={`toggle ${config[key] ? "on" : ""}`} onClick={() => toggle(key)} />
          </div>
        ))}

        <div className="configRow" style={{ flexDirection: "column", alignItems: "stretch", gap: 6 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span className="configLabel">Blink Threshold</span>
            <span style={{ fontSize: 11, fontFamily: "Orbitron, monospace", color: "var(--accent)" }}>{config.blinkThreshold.toFixed(2)}</span>
          </div>
          <input type="range" min="0.1" max="0.4" step="0.01"
            value={config.blinkThreshold}
            onChange={e => setConfig(c => {
              const next = { ...c, blinkThreshold: parseFloat(e.target.value) };
              configRef.current = next;
              return next;
            })}
          />
        </div>
      </div>

      {/* Break / Zone indicator */}
      {kpi.suggestedBreak ? (
        <div className="alert" style={{ marginTop: 14 }}>
          <b>⚠ Break Recommended</b> — Fatigue detected. Step away, breathe, hydrate.
          <div className="breatheRing" style={{ marginTop: 10 }}>
            <div className="breatheInner" />
          </div>
          <div style={{ textAlign: "center", fontSize: 11, color: "var(--muted)", fontFamily: "Orbitron, monospace", letterSpacing: 1 }}>BREATHE</div>
        </div>
      ) : running ? (
        <div className="alert alertGood" style={{ marginTop: 14 }}>
          <b>● In The Zone</b> — Biometrics nominal. Keep going.
        </div>
      ) : null}
    </div>
  );
}
