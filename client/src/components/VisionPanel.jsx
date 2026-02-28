import React, { useEffect, useRef, useState } from "react";
import { FaceLandmarker, FilesetResolver, DrawingUtils } from "@mediapipe/tasks-vision";
import { computeEyeOpenness, estimateBlink, estimateGazeDrift, clamp01 } from "../lib/visionMetrics.js";
import { adaptFromMetrics } from "../lib/adaptation.js";

export default function VisionPanel({ onMetrics }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const [ready, setReady] = useState(false);
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState("Click Start → allow webcam");
  const [err, setErr] = useState("");

  const landmarkerRef = useRef(null);
  const rafRef = useRef(null);

  const lastBlinkRef = useRef({ prevClosed: false, blinks: [], lastTs: 0 });
  const gazeRef = useRef({ values: [] });

  const [kpi, setKpi] = useState({
    blinkPerMin: 0,
    gazeDrift: 0,
    eyeOpen: 0,
    score: 75,
    fatigue: 0.25,
    attention: 0.7,
    level: 2,
    suggestedBreak: false,
  });

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        setStatus("Loading vision model...");
        const resolver = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );

        const landmarker = await FaceLandmarker.createFromOptions(resolver, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
          },
          runningMode: "VIDEO",
          numFaces: 1,
        });

        landmarkerRef.current = landmarker;

        if (mounted) {
          setReady(true);
          setStatus("Ready");
        }
      } catch (e) {
        setErr(String(e));
        setStatus("Failed to load vision model");
      }
    }

    init();
    return () => {
      mounted = false;
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function start() {
    setErr("");
    if (!ready) return;

    try {
      setStatus("Starting webcam...");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
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
      setStatus("Running");
      loop();
    } catch (e) {
      setErr("Webcam blocked or unavailable. Allow camera permission.");
      setStatus("Error");
    }
  }

  function stop() {
    setRunning(false);
    setStatus("Stopped");
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    const v = videoRef.current;
    if (v && v.srcObject) {
      const tracks = v.srcObject.getTracks();
      tracks.forEach((t) => t.stop());
      v.srcObject = null;
    }
  }

  function loop() {
  try {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const landmarker = landmarkerRef.current;

    if (!video || !canvas || !landmarker) {
      rafRef.current = requestAnimationFrame(loop);
      return;
    }

    // IMPORTANT: if video dims are 0, skip this frame but keep looping
    if (!video.videoWidth || !video.videoHeight) {
      rafRef.current = requestAnimationFrame(loop);
      return;
    }

    const ctx = canvas.getContext("2d");

    const now = performance.now();
    const res = landmarker.detectForVideo(video, now);

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    let next = { ...kpi };

    if (res.faceLandmarks && res.faceLandmarks.length > 0) {
      const lm = res.faceLandmarks[0];

      const eyeOpen = computeEyeOpenness(lm);
      next.eyeOpen = eyeOpen;

      estimateBlink(eyeOpen, lastBlinkRef.current, now);

      const gazeDrift = estimateGazeDrift(lm, gazeRef.current);
      next.gazeDrift = gazeDrift;

      const cutoff = now - 60_000;
      lastBlinkRef.current.blinks = lastBlinkRef.current.blinks.filter((t) => t >= cutoff);
      next.blinkPerMin = lastBlinkRef.current.blinks.length;

      const fatigue = clamp01(0.45 * (next.blinkPerMin / 25) + 0.55 * (1 - next.eyeOpen));
      const attention = clamp01(1 - next.gazeDrift);
      const score = clamp01(0.65 * attention + 0.35 * (1 - fatigue)) * 100;

      next.fatigue = fatigue;
      next.attention = attention;
      next.score = score;

      const adapted = adaptFromMetrics({
        score,
        fatigue,
        attention,
        blinkPerMin: next.blinkPerMin,
        gazeDrift,
      });

      next.level = adapted.level;
      next.suggestedBreak = adapted.suggestedBreak;

      // status message (don’t spam setStatus constantly)
      // if you want, leave status alone here
    } else {
      // Face not detected – keep running
      // (don’t setStatus every frame; it can cause flicker)
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
    });

    rafRef.current = requestAnimationFrame(loop);
  } catch (e) {
    console.error("Vision loop crashed:", e);
    setErr(`Vision loop crashed: ${e?.message || e}`);
    // Keep trying instead of dying
    rafRef.current = requestAnimationFrame(loop);
  }
}

  return (
    <div>
      <div className="row">
        <button className="btn btnPrimary" onClick={start} disabled={!ready || running}>
          Start
        </button>
        <button className="btn btnDanger" onClick={stop} disabled={!running}>
          Stop
        </button>
        <div className="muted">{status}</div>
      </div>

      {err ? <div className="alert alertBad">{err}</div> : null}

      <div className="kpis">
        <div className="kpi">
          <div className="kpiVal">{Math.round(kpi.eyeOpen * 100)}%</div>
          <div className="kpiLab">Eye Openness</div>
        </div>
        <div className="kpi">
          <div className="kpiVal">{kpi.blinkPerMin}</div>
          <div className="kpiLab">Blinks / min</div>
        </div>
        <div className="kpi">
          <div className="kpiVal">{Math.round(kpi.gazeDrift * 100)}%</div>
          <div className="kpiLab">Gaze Drift</div>
        </div>
      </div>

      <div className="videoWrap">
        <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            style={{
                position: "absolute",
                width: "1px",
                height: "1px",
                opacity: 0.01,
                left: "-9999px",
            }}
            />
        <canvas ref={canvasRef} />
        <div className="overlayText">
          Score {Math.round(kpi.score)} • Fatigue {Math.round(kpi.fatigue * 100)}% • Attention{" "}
          {Math.round(kpi.attention * 100)}%
        </div>
      </div>

      {kpi.suggestedBreak ? (
        <div className="alert">
          <b>Break suggested:</b> you look fatigued. Take 60 seconds—breathe, stretch, water.
        </div>
      ) : (
        <div className="alert alertGood">
          <b>In the zone:</b> keep going.
        </div>
      )}
    </div>
  );
}