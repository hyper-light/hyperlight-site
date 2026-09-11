import type { ProofFrameFunction, ProofTone } from "./proof-geometry";
import { spacecraftJourneyFrame } from "./claim-lifecycle-geometry";
import { easeLifecycle } from "./lifecycle-drawing";
import {
  journeyLifecyclePosition,
  journeyLifecycleSnapshot,
} from "./journey-lifecycle-data";
import type { ValidatorExample } from "./validator-lifecycle-data";

const ordinaryActions = [
  "Claimant generates C17",
  "Respondent acquires the receipt",
  "Respondent produces A / hA",
  "Respondent closes T1",
  "Respondent posts T1",
  "Claimant receives T1",
  "Maintainer begins both checks",
  "Maintainer records Behavior",
  "Reviewer prepares its verdict",
  "Ledger records the exact results",
];
const missingActions = [
  "Claimant generates C17",
  "Respondent acquires the receipt",
  "Respondent records its diagnostic",
  "Respondent closes failed T1",
  "Respondent posts T1",
  "Claimant receives T1",
  "Entry records the missing change",
];

function interpolate(selection: number, stops: readonly number[]) {
  const s = Math.max(0, Math.min(stops.length - 1, selection));
  const from = Math.min(stops.length - 2, Math.floor(s));
  return stops[from] + (stops[from + 1] - stops[from]) * (s - from);
}

/** All object births, delivery and evaluation are views of one shared exchange. */
export function journeyLifecycleFrame(
  time: number,
  selection: number,
  portrait: boolean,
  example: ValidatorExample = "pass",
) {
  const missing = example === "missing",
    error = example === "error";
  const s = Math.max(
    0,
    Math.min(missing ? 6 : 9, Number.isFinite(selection) ? selection : 0),
  );
  const state = journeyLifecycleSnapshot(s, example);
  const evaluation = Math.max(0, s - 5);
  const behaviorTone: ProofTone = missing
    ? "neutral"
    : error && state.step >= 7
      ? "error"
      : state.behavior === "Validated"
        ? "pass"
        : "pending";
  const reviewTone: ProofTone = missing
    ? "neutral"
    : state.review === "QualityBarValidationFailed"
      ? "fail"
      : state.review === "Validated"
        ? "pass"
        : "pending";
  const behaviorLabel = missing
    ? "No run"
    : error && state.step >= 7
      ? state.step === 8
        ? "Retry"
        : "Error"
      : state.behavior === "Validated"
        ? "Pass"
        : state.step >= 6
          ? "Running"
          : "Ready";
  const reviewLabel = missing
    ? "No run"
    : state.review === "QualityBarValidationFailed"
      ? "Fail"
      : state.review === "Validated"
        ? "Pass"
        : state.step >= 6
          ? "Reviewing"
          : "Ready";
  const actionIndex = Math.min(missing ? 6 : 9, Math.round(s));
  const action =
    error && actionIndex === 7
      ? "Retain the runner's diagnostic"
      : error && actionIndex === 8
        ? "Retry the same A / hA target"
        : (missing ? missingActions : ordinaryActions)[actionIndex];
  return spacecraftJourneyFrame(
    time,
    journeyLifecyclePosition(s, example),
    portrait,
    {
      action,
      // Assemble physical drafts while their author works. The exact durable
      // births still commit at Produce/Close in the independent state readouts.
      artifactVisible: missing ? 0 : easeLifecycle((s - 1.15) / 0.85),
      testamentVisible: easeLifecycle((s - 2.15) / 0.85),
      deliveryReceived: state.delivery === "Pass",
      readouts: [
        {
          id: "claim",
          title: "CLAIM · C17",
          value: state.claim,
          tone: state.tone,
        },
        {
          id: "artifact",
          title: state.artifact ? "ARTIFACT · A / hA" : "ARTIFACT · CHANGE",
          value: state.artifact ?? (missing ? "Absent" : "Not generated"),
          tone: state.tone,
        },
        {
          id: "testament",
          title: state.testament ? "TESTAMENT · T1" : "TESTAMENT",
          value: state.testament ?? "Not generated",
          tone: state.tone,
        },
        {
          id: "checks",
          title: "REQUIRED CHECKS",
          value: state.checks,
          tone: state.tone,
        },
      ],
      probes: [
        {
          title: `Behavior · ${behaviorLabel}`,
          target: missing ? "No target · no run" : "A / hA · v1",
          tone: behaviorTone,
          progress: missing
            ? 0
            : interpolate(
                evaluation,
                error ? [0, 0.3, 0.55, 0.15, 1] : [0, 0.3, 1, 1, 1],
              ),
          active: !missing && state.step >= 6,
        },
        {
          title: `Review · ${reviewLabel}`,
          target: missing ? "No target · no run" : "A / hA · v1",
          tone: reviewTone,
          progress: missing
            ? 0
            : interpolate(evaluation, [0, 0.2, 0.4, 0.7, 1]),
          active: !missing && state.step >= 6,
        },
      ],
    },
  );
}

export const journeyLifecycleFrames: Record<
  ValidatorExample,
  ProofFrameFunction
> = {
  pass: (time, selection, portrait) =>
    journeyLifecycleFrame(time, selection, portrait, "pass"),
  fail: (time, selection, portrait) =>
    journeyLifecycleFrame(time, selection, portrait, "fail"),
  error: (time, selection, portrait) =>
    journeyLifecycleFrame(time, selection, portrait, "error"),
  missing: (time, selection, portrait) =>
    journeyLifecycleFrame(time, selection, portrait, "missing"),
};
