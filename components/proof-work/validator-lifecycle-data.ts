import type { ProofStep } from "./proof-figure";

export type ValidatorExample = "pass" | "fail" | "error" | "missing";
export const validatorExamples = [
  { value: "pass", label: "Both checks pass" },
  { value: "fail", label: "Review rejects the work" },
  { value: "error", label: "Test runner unavailable" },
  { value: "missing", label: "Required artifact missing" },
] as const;

/** The validator definition never changes. These are states of its exact
 * target evaluations, plus their atomically derived parent states. */
export function validatorLifecycleSnapshot(
  selection: number,
  example: ValidatorExample,
) {
  const step = Math.max(
    0,
    Math.min(4, Number.isFinite(selection) ? selection : 0),
  );
  const missing = example === "missing";
  const entered = step >= 1;
  const done = missing ? entered : step >= 4;
  const failed = done && example !== "pass";
  const cause =
    example === "missing"
      ? "ValidationIncomplete"
      : example === "error"
        ? "ValidationErrored"
        : "ValidationFailed";
  return {
    target: missing
      ? null
      : { artifact: "A", digest: "hA", response: "T1", slot: "change" },
    definition: "behavior@1 / review@1",
    evaluator: "Maintainer",
    claim: done
      ? failed
        ? cause
        : "Satisfied"
      : entered
        ? "Validating"
        : "TestamentAcknowledged",
    testament: done
      ? failed
        ? cause
        : "Validated"
      : entered
        ? "Validating"
        : "Received",
    artifact: missing
      ? null
      : done
        ? failed
          ? "ValidationFailed"
          : "Validated"
        : entered
          ? "Validating"
          : "Attached",
    behavior: missing
      ? entered
        ? "ValidationIncomplete"
        : "Ready"
      : example === "error"
        ? done
          ? "Errored"
          : entered
            ? "Validating"
            : "Ready"
        : step >= 2
          ? "Validated"
          : entered
            ? "Validating"
            : "Ready",
    review: missing
      ? "Ready"
      : done
        ? example === "fail"
          ? "QualityBarValidationFailed"
          : "Validated"
        : entered
          ? "ValidatingQualityBar"
          : "Ready",
    delivery: "Pass",
    attempts:
      !entered || missing ? 0 : example === "error" && step >= 3 ? 2 : 1,
    terminal: done,
    cause: failed ? cause : null,
  } as const;
}

export function validatorLifecycleSteps(
  example: ValidatorExample,
): ProofStep[] {
  const actions =
    example === "missing"
      ? ["Bind", "Enter"]
      : ["Bind", "Begin", "Tests", "Review", "Commit"];
  return actions.map((label, step) => {
    const state = validatorLifecycleSnapshot(step, example);
    const descriptions =
      example === "missing"
        ? [
            "The received testament has no artifact in the required change slot. The requirement still exists, but there is no A/hA target to run a tool against.",
            "Authorized evaluation entry records the missing required slot as Incomplete. No artifact, test run, or review verdict is invented. With no eligible alternative witness, the testament and claim become ValidationIncomplete.",
          ]
        : [
            "The maintainer receives T1. Its change slot resolves to A/hA. The behavior and review definitions, versions, and designated evaluator are fixed; their separate evaluation records are Ready. Delivery has passed, not the checks.",
            "The maintainer records the start of both checks, then runs them in its own environment. Behavior enters Validating; the independent agentic review enters ValidatingQualityBar directly. The ledger does not execute either tool.",
            example === "error"
              ? "The test runner cannot start. Its diagnostic records an execution Error, not evidence that the patch failed. An allowed retry stays in the same Validating state and keeps the same A/hA target."
              : "The behavioral result and its evidence commit together. Behavior is Validated, but the required review is still pending. A, T1, and C17 all remain Validating.",
            example === "error"
              ? "The declared policy permits one retry. Attempt 2 uses the same definition and target; it does not reset the evaluation or discard attempt 1. The reviewer can finish independently."
              : "The reviewer examines the same A/hA and prepares its evidence. The check remains in its quality phase until the authorized verdict commits; a local result alone cannot advance acceptance.",
            example === "pass"
              ? "The final required verdict commits with its result artifact. Both checks passed on A/hA, and T1 delivery passed. A and T1 become Validated; C17 becomes Satisfied in the same publication. This example has no pending graph dependencies."
              : example === "fail"
                ? "The review commits a conclusive quality Fail. Behavior's Pass remains, but cannot cover the failed review requirement. A, T1, and C17 retain their failure. Corrected work requires a new eligible response before terminality or an explicit successor afterward."
                : "Attempt 2 also cannot establish a result, exhausting this example's retry policy. Behavior becomes Errored with both diagnostics retained. A becomes ValidationFailed with an Error cause; T1 and C17 become ValidationErrored. This is not a conclusive rejection of the patch.",
          ];
    return {
      label: example === "error" && step === 3 ? "Retry" : label,
      title:
        example === "missing"
          ? step
            ? "Missing target, no invented execution"
            : "Resolve the declared target"
          : [
              "Pin the definition and evidence",
              "Begin two independent checks",
              example === "error"
                ? "Record a tool error"
                : "One pass is not enough",
              example === "error"
                ? "Retry within the pinned policy"
                : "Prepare the quality verdict",
              example === "pass"
                ? "Commit the acceptance witnesses"
                : "Commit the exact failure cause",
            ][step],
      description: descriptions[step],
      facts: [
        { label: "Behavior evaluation", value: state.behavior },
        {
          label: "Review evaluation",
          value: missingReview(state.review, example, step),
        },
        {
          label: "Work artifact",
          value: state.artifact
            ? `A/hA · ${state.artifact}`
            : "No change artifact",
        },
        { label: "Claim C17", value: state.claim },
      ],
    };
  });
}

function missingReview(state: string, example: ValidatorExample, step: number) {
  return example === "missing" && step >= 1
    ? "Ready · suppressed, no verdict"
    : state;
}
