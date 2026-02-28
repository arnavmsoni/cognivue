export function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}

function dist(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function computeEyeOpenness(lm) {
  const L_outer = lm[33], L_inner = lm[133];
  const L_upper = lm[159], L_lower = lm[145];

  const R_outer = lm[362], R_inner = lm[263];
  const R_upper = lm[386], R_lower = lm[374];

  const leftH = dist(L_outer, L_inner);
  const leftV = dist(L_upper, L_lower);
  const rightH = dist(R_outer, R_inner);
  const rightV = dist(R_upper, R_lower);

  const leftEAR = leftV / (leftH + 1e-6);
  const rightEAR = rightV / (rightH + 1e-6);
  const ear = (leftEAR + rightEAR) / 2;

  return clamp01((ear - 0.12) / 0.18);
}

export function estimateBlink(eyeOpen, state, now) {
  const closed = eyeOpen < 0.25;

  if (!state.prevClosed && closed) state.lastTs = now;

  if (state.prevClosed && !closed) {
    const dur = now - (state.lastTs || now);
    if (dur > 40 && dur < 600) state.blinks.push(now);
  }

  state.prevClosed = closed;
}

export function estimateGazeDrift(lm, gazeState) {
  let drift = 0;

  // Primary: iris displacement within each eye, normalized by eye size.
  // This is far less sensitive to camera distance than face-level geometry.
  if (lm.length >= 474 && lm[468] && lm[473]) {
    const leftOuter = lm[33], leftInner = lm[133], leftTop = lm[159], leftBot = lm[145], leftIris = lm[468];
    const rightOuter = lm[362], rightInner = lm[263], rightTop = lm[386], rightBot = lm[374], rightIris = lm[473];

    const leftW = dist(leftOuter, leftInner);
    const leftH = dist(leftTop, leftBot);
    const rightW = dist(rightOuter, rightInner);
    const rightH = dist(rightTop, rightBot);

    const leftCx = (leftOuter.x + leftInner.x) / 2;
    const leftCy = (leftTop.y + leftBot.y) / 2;
    const rightCx = (rightOuter.x + rightInner.x) / 2;
    const rightCy = (rightTop.y + rightBot.y) / 2;

    const leftHx = Math.abs(leftIris.x - leftCx) / (leftW / 2 + 1e-6);
    const rightHx = Math.abs(rightIris.x - rightCx) / (rightW / 2 + 1e-6);
    const leftVy = Math.abs(leftIris.y - leftCy) / (leftH / 2 + 1e-6);
    const rightVy = Math.abs(rightIris.y - rightCy) / (rightH / 2 + 1e-6);

    const horizontal = (leftHx + rightHx) / 2;
    const vertical = (leftVy + rightVy) / 2;
    const centerednessOffset = 0.18; // around-centered eyes should read near zero drift
    drift = clamp01(((0.7 * horizontal + 0.3 * vertical) - centerednessOffset) / 0.62);
  } else {
    // Fallback: coarse nose-vs-eye-center geometry.
    const noseTip = lm[1];
    const leftEye = lm[33];
    const rightEye = lm[263];
    const midEye = { x: (leftEye.x + rightEye.x) / 2, y: (leftEye.y + rightEye.y) / 2 };
    const dx = Math.abs(noseTip.x - midEye.x);
    const dy = Math.abs(noseTip.y - midEye.y);
    drift = clamp01((dx + dy) / 0.12);
  }

  gazeState.values.push(drift);
  if (gazeState.values.length > 30) gazeState.values.shift();

  const avg = gazeState.values.reduce((a, b) => a + b, 0) / gazeState.values.length;
  return clamp01(avg);
}
