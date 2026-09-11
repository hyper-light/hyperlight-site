import type {
  ProofFrame,
  ProofLabel,
  ProofPath,
  ProofTone,
} from "./proof-geometry";
import { blend } from "./process-geometry";
import {
  healthMultiplier,
  livenessExample,
  suspicionDuration,
} from "./liveness-guard-data";

type V = readonly [number, number, number];

/** Optical timing rails: elapsed-time lengths stay linear while the instrument breathes. */
export function livenessGuardFrame(
  time: number,
  selection: number,
  portrait: boolean,
): ProofFrame {
  const paths: ProofPath[] = [],
    labels: ProofLabel[] = [];
  const stage = Math.max(0, Math.min(4, Math.round(selection)));
  const suspect = blend(selection, [0, 1, 0.25, 0.25, 0.7]);
  const refuted = blend(selection, [0, 0, 1, 1, 1]);
  const grant = blend(selection, [0, 0, 1, 1, 1]);
  const recovery = blend(selection, [0, 0, 0, 1, 1]);
  const failed = blend(selection, [0, 0, 0, 0, 1]);
  const cx = portrait ? 210 : 400,
    cy = portrait ? 370 : 260;
  const yaw = 0.12 + Math.sin(time * 0.26) * 0.024;
  const pitch = -0.2 + Math.sin(time * 0.31) * 0.028;
  const scale = portrait ? 0.93 : 0.97;
  function project([x, y, z]: V): [number, number] {
    const dx = x - cx,
      dy = y - cy;
    return [
      cx + (dx * Math.cos(yaw) + z * Math.sin(yaw)) * scale,
      cy +
        (dy * Math.cos(pitch) -
          (z * Math.cos(yaw) - dx * Math.sin(yaw)) * Math.sin(pitch)) *
          scale,
    ];
  }
  function line(
    id: string,
    points: readonly V[],
    kind: ProofPath["kind"] = "fine",
    opacity = 0.5,
    tone: ProofTone = "neutral",
  ) {
    paths.push({
      id,
      d: points
        .map(
          (point, index) =>
            (index ? "L" : "M") +
            project(point)
              .map((value) => value.toFixed(2))
              .join(" "),
        )
        .join(" "),
      kind,
      opacity,
      tone,
    });
  }
  function label(
    id: string,
    text: string,
    x: number,
    y: number,
    kind: ProofLabel["kind"] = "small",
    tone: ProofTone = "neutral",
    anchor: ProofLabel["anchor"] = "start",
  ) {
    const p = project([x, y, 0]);
    labels.push({ id, text, x: p[0], y: p[1], kind, tone, anchor });
  }
  const x = portrait ? 48 : 220,
    width = portrait ? 324 : 516;
  const healthyY = portrait ? 118 : 124,
    slowY = portrait ? 220 : 200;
  const suspicionY = portrait ? 380 : 298,
    graceY = portrait ? 535 : 410;

  function jaw(
    id: string,
    at: number,
    y: number,
    tone: ProofTone,
    opacity: number,
  ) {
    for (let layer = 0; layer < 3; layer++) {
      const z = layer * 4;
      line(
        id + "-laminate-" + layer,
        [
          [at - 5, y - 20, z],
          [at + 5, y - 20, z],
          [at + 8, y - 17, z],
          [at + 8, y + 17, z],
          [at + 5, y + 20, z],
          [at - 5, y + 20, z],
          [at - 8, y + 17, z],
          [at - 8, y - 17, z],
          [at - 5, y - 20, z],
        ],
        layer === 2 ? "glass" : "rear",
        opacity * (layer === 2 ? 0.7 : 0.3),
        tone,
      );
    }
    for (let rib = 0; rib < 5; rib++)
      line(
        id + "-rib-" + rib,
        [
          [at - 5, y - 13 + rib * 6.5, 0],
          [at - 5, y - 13 + rib * 6.5, 8],
          [at + 5, y - 13 + rib * 6.5, 8],
        ],
        "fine",
        opacity * 0.45,
        tone,
      );
    line(
      id + "-edge",
      [
        [at, y - 17, 9],
        [at, y + 17, 9],
      ],
      "light",
      opacity,
      tone,
    );
  }
  function rail(
    id: string,
    y: number,
    fraction: number,
    strength: number,
    tone: ProofTone = "neutral",
  ) {
    const end = x + width * fraction;
    for (let layer = 0; layer < 3; layer++) {
      const z = -4 - layer * 5;
      line(
        id + "-back-" + layer,
        [
          [x - 10, y - 8, z],
          [x + width + 10, y - 8, z],
          [x + width + 13, y - 5, z],
          [x + width + 13, y + 5, z],
          [x + width + 10, y + 8, z],
          [x - 10, y + 8, z],
          [x - 13, y + 5, z],
          [x - 13, y - 5, z],
          [x - 10, y - 8, z],
        ],
        "rear",
        0.19 + layer * 0.04,
      );
    }
    for (let tick = 0; tick <= 40; tick++) {
      const tx = x + (width * tick) / 40;
      line(
        id + "-tick-" + tick,
        [
          [tx, y + 10, -6],
          [tx, y + (tick % 4 ? 13 : 17), -6],
        ],
        "fine",
        tick % 4 ? 0.24 : 0.46,
      );
    }
    const top: V[] = [],
      bottom: V[] = [];
    for (let sample = 0; sample <= 20; sample++) {
      const u = sample / 20,
        px = x + width * fraction * u;
      const bend =
        Math.sin(u * Math.PI) * Math.sin(time * 0.48 + y * 0.01) * 1.6;
      top.push([px, y - 6 + bend, 4]);
      bottom.unshift([px, y + 6 + bend, 4]);
    }
    line(
      id + "-window",
      [...top, ...bottom, top[0]],
      "glass",
      strength * 0.35,
      tone,
    );
    line(id + "-upper-edge", top, "edge", strength * 0.68, tone);
    line(id + "-current", bottom, "light", strength * 0.65, tone);
    line(
      id + "-axis",
      [
        [x, y, 0],
        [end, y, 0],
      ],
      "fine",
      strength * 0.5,
      tone,
    );
    jaw(id + "-deadline", end, y, tone, strength);
  }
  label(
    "health-heading",
    "Observer health",
    portrait ? 48 : 52,
    portrait ? 53 : 57,
    "heading",
  );
  rail("healthy", healthyY, livenessExample.baseProbeMs / 1000, 0.68);
  label(
    "probe-scale",
    "0–1000ms",
    x + width,
    portrait ? 53 : 57,
    "small",
    "neutral",
    "end",
  );
  rail(
    "slow",
    slowY,
    (livenessExample.baseProbeMs * healthMultiplier(8)) / 1000,
    0.94,
    "pending",
  );
  label(
    "healthy-label",
    "Healthy observer",
    portrait ? x : 52,
    portrait ? healthyY - 29 : healthyY + 3,
    "label",
  );
  label(
    "healthy-score",
    "score 0 · 1×",
    portrait ? x : 52,
    portrait ? healthyY + 40 : healthyY + 28,
  );
  label(
    "healthy-value",
    "300ms",
    x + width,
    healthyY + 40,
    "small",
    "neutral",
    "end",
  );
  label(
    "slow-label",
    "Slow observer",
    portrait ? x : 52,
    portrait ? slowY - 29 : slowY + 3,
    "label",
  );
  label(
    "slow-score",
    "score 8 · 3×",
    portrait ? x : 52,
    portrait ? slowY + 40 : slowY + 28,
  );
  label(
    "slow-value",
    "900ms",
    x + width,
    slowY + 40,
    "small",
    "pending",
    "end",
  );
  const replyX = x + (width * livenessExample.replyMs) / 1000;
  line(
    "reply-reference",
    [
      [replyX, healthyY - 12, -2],
      [replyX, slowY + 11, -2],
    ],
    "fine",
    0.28,
  );
  const reflection = replyX - (1 - Math.cos(time * 0.85)) * width * 0.11;
  line(
    "reply-packet",
    [
      [reflection - 6, slowY, 7],
      [reflection, slowY - 5, 7],
      [reflection + 6, slowY, 7],
      [reflection, slowY + 5, 7],
      [reflection - 6, slowY, 7],
    ],
    "light",
    0.7,
  );
  label(
    "probe-result",
    [
      "600ms reply fits the slow observer",
      "Direct + indirect probes silent",
      "Alive(8) + witness 43 to accuser",
      "Acknowledgment within grace",
      "No new progress: extension denied",
    ][stage],
    portrait ? 210 : 478,
    portrait ? 291 : 265,
    "small",
    stage === 4 ? "fail" : "neutral",
    "middle",
  );

  const shortened = suspicionDuration(livenessExample.confirmations);
  const suspicionFraction = blend(selection, [
    1,
    shortened / livenessExample.suspicionMaxMs,
    shortened / livenessExample.suspicionMaxMs,
    shortened / livenessExample.suspicionMaxMs,
    1,
  ]);
  label(
    "suspicion-title",
    stage === 4 ? "New suspicion" : stage < 2 ? "Suspicion" : "Refuted",
    portrait ? x : 52,
    portrait ? 323 : 290,
    "label",
  );
  label(
    "suspicion-incarnation",
    stage === 4 ? "incarnation 8" : "incarnation 7",
    portrait ? x : 52,
    portrait ? 347 : 314,
  );
  rail(
    "suspicion",
    suspicionY,
    suspicionFraction,
    0.25 + suspect * 0.65,
    stage === 4 ? "fail" : stage === 1 ? "pending" : "neutral",
  );
  label(
    "suspicion-detail",
    stage === 4
      ? "After grace: silent probes, then expiry"
      : stage === 0
        ? "10 members · no confirmations"
        : stage === 1
          ? "2 independent confirmations; same start"
          : "Alive(8) clears the old suspicion",
    portrait ? x : 220,
    suspicionY + 43,
    "small",
  );
  label(
    "suspicion-value",
    stage === 4
      ? "Expired · Dead"
      : stage < 2
        ? stage === 0
          ? "18.744s max"
          : "6.365s"
        : "Old timer cleared",
    x + width,
    suspicionY + (portrait ? 80 : 66),
    "small",
    "neutral",
    "end",
  );
  // This is a new-incarnation grace window, not a restarted incarnation-7 suspicion.
  label(
    "suspicion-scale",
    "1× health · 0–18.744s",
    x + width,
    portrait ? 323 : 280,
    "small",
    "neutral",
    "end",
  );
  const graceFraction = (livenessExample.firstGrantMs / 5000) * grant;
  label(
    "grace-title",
    "New-incarnation grace",
    portrait ? x : 52,
    portrait ? 485 : 391,
    "label",
  );
  rail(
    "grace",
    graceY,
    graceFraction,
    0.28 + grant * 0.67,
    failed > 0.5 ? "fail" : "pass",
  );
  label(
    "grace-scale",
    "0–5s",
    x + width,
    portrait ? 485 : 391,
    "small",
    "neutral",
    "end",
  );
  const arrival = x + width * (livenessExample.graceReplyMs / 5000) * recovery;
  line(
    "grace-reply",
    [
      [arrival - 5, graceY, 8],
      [arrival, graceY - 5, 8],
      [arrival + 5, graceY, 8],
      [arrival, graceY + 5, 8],
      [arrival - 5, graceY, 8],
    ],
    "light",
    0.2 + recovery * 0.65,
    failed > 0.5 ? "neutral" : "pass",
  );
  label(
    "grace-value",
    stage < 2 ? "Not granted" : "3.120s · fixed grant",
    x + width,
    graceY + 43,
    "small",
    stage === 4 ? "fail" : "pass",
    "end",
  );
  label(
    "grace-detail",
    [
      "No extension requested",
      "Repeated gossip cannot reset time",
      "Witness 42 → 43 · grant 1 of 5",
      "2s reply inside 3.120s grace",
      "Witness 43 again · no extension",
    ][stage],
    portrait ? x : 220,
    graceY + (portrait ? 67 : 43),
    "small",
    stage === 4 ? "fail" : "neutral",
  );
  const footerY = portrait ? 666 : 489;
  label(
    "outcome",
    stage === 4
      ? "Grace ends → silence → suspicion expires"
      : "Liveness evidence is not Raft authority",
    portrait ? 210 : 400,
    footerY,
    "small",
    stage === 4 ? "fail" : "neutral",
    "middle",
  );
  label(
    "directory-boundary",
    stage === 4
      ? "Settled Dead → partition leader → directory"
      : "Only settled verdicts become directory facts",
    portrait ? 210 : 400,
    footerY + 26,
    "small",
    stage === 4 ? "fail" : "neutral",
    "middle",
  );
  // Refutation moves only this inspection pin; the previous timer's identity stays visible.
  const pinX = x + width * suspicionFraction;
  line(
    "refutation-pin",
    [
      [pinX + 14, suspicionY - 17, 9],
      [pinX + 19 + refuted * 13, suspicionY - 22, 9],
      [pinX + 19 + refuted * 13, suspicionY + 22, 9],
      [pinX + 14, suspicionY + 17, 9],
    ],
    "fine",
    0.2 + refuted * 0.4,
  );
  return { paths, labels };
}
