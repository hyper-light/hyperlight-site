import type { ProofStep } from "./proof-figure";
import {
  validatorLifecycleSnapshot,
  type ValidatorExample,
} from "./validator-lifecycle-data";

const ordinaryPositions = [0, 1, 1.4, 2, 2.2, 3, 4, 4.3, 4.6, 5];
const missingPositions = [0, 1, 1.4, 2, 2.2, 3, 3.45];

export function journeyLifecyclePosition(
  selection: number,
  example: ValidatorExample,
) {
  const positions =
    example === "missing" ? missingPositions : ordinaryPositions;
  const s = Math.max(
    0,
    Math.min(positions.length - 1, Number.isFinite(selection) ? selection : 0),
  );
  const from = Math.min(positions.length - 2, Math.floor(s));
  return positions[from] + (positions[from + 1] - positions[from]) * (s - from);
}

/** One committed prefix of the same claim, work, response and evaluations. */
export function journeyLifecycleSnapshot(
  selection: number,
  example: ValidatorExample,
) {
  const missing = example === "missing";
  const s = Math.max(
    0,
    Math.min(missing ? 6 : 9, Number.isFinite(selection) ? selection : 0),
  );
  const step = Math.floor(s + 0.00001);
  const position = journeyLifecyclePosition(s, example);
  const evaluation =
    step >= 5
      ? validatorLifecycleSnapshot(
          missing ? Math.min(1, step - 5) : step - 5,
          example,
        )
      : null;
  const terminal = evaluation?.terminal ?? false;
  const tone: "pending" | "pass" | "fail" | "error" = !terminal
    ? "pending"
    : example === "pass"
      ? "pass"
      : example === "error"
        ? "error"
        : "fail";
  const claim =
    evaluation?.claim ??
    (step >= 3
      ? "TestamentGenerated"
      : step >= 1
        ? "Received"
        : position >= 0.15
          ? "Posted"
          : "Generated");
  const artifact =
    missing || step < 2
      ? null
      : (evaluation?.artifact ?? (step >= 3 ? "Attached" : "Generated"));
  const testament =
    step < 3
      ? null
      : (evaluation?.testament ?? (step >= 4 ? "Posted" : "Generated"));
  const behavior = evaluation?.behavior ?? "Declared";
  const review = evaluation?.review ?? "Declared";
  const checks =
    step < 3
      ? "Declared"
      : step < 5
        ? "Await delivery"
        : missing
          ? step >= 6
            ? "Incomplete · no run"
            : "Missing change slot"
          : step >= 9
            ? example === "pass"
              ? "Pass + Pass"
              : example === "fail"
                ? "Pass + Fail"
                : "Error + Pass"
            : example === "error" && step >= 7
              ? "Retry pending"
              : step >= 8
                ? "Review pending"
                : step >= 7
                  ? "Behavior Pass"
                  : step >= 6
                    ? "Both running"
                    : "Ready · delivery Pass";
  return {
    step,
    position,
    claim,
    artifact,
    testament,
    behavior,
    review,
    checks,
    terminal,
    tone,
    delivery: step >= 5 ? ("Pass" as const) : ("Pending" as const),
    attempts: evaluation?.attempts ?? 0,
    target: evaluation?.target ?? null,
    definition: "behavior@1 / review@1",
    evaluator: "Maintainer",
    reportedOutcome:
      step >= 3
        ? missing
          ? ("Failed" as const)
          : ("Complete" as const)
        : null,
  };
}

export function journeyLifecycleSteps(example: ValidatorExample): ProofStep[] {
  const missing = example === "missing";
  const labels = missing
    ? [
        "Claim",
        "Acquire",
        "Account",
        "Close",
        "Post",
        "Receive",
        "Record missing",
      ]
    : [
        "Claim",
        "Acquire",
        "Produce",
        "Close",
        "Post",
        "Receive",
        "Evaluate",
        "Behavior",
        example === "error" ? "Retry" : "Review",
        "Record",
      ];
  const opening = [
    {
      title: "The claimant fixes the obligation",
      description:
        "The claimant generates C17 with immutable requirements: deliver the response, and pass Behavior and Review on the same change artifact. There is no execution receipt, work artifact or testament yet. Posting makes the claim actionable before its outward journey begins.",
    },
    {
      title: "The respondent takes responsibility",
      description:
        "After C17 is posted and its admission and start conditions pass, the subject acquires the execution receipt. C17 becomes Received with an exact holder and generation. The respondent performs the work with its own tools; acquiring this receipt creates no testament.",
    },
    missing
      ? {
          title: "A real account of missing work",
          description:
            "The respondent cannot produce the requested change and retains a real diagnostic D/hD. There is no A/hA output or substitute hash. The diagnostic can explain the failed work cycle, but it cannot satisfy the change slot.",
        }
      : {
          title: "The work artifact exists independently",
          description:
            "The respondent generates the immutable change A/hA with durable bytes. A is visible while C17 remains Received and no testament exists. A claimant could optionally observe this unattached artifact; that observation would not evaluate or accept it.",
        },
    missing
      ? {
          title: "The respondent closes its failure account",
          description:
            "The respondent authors T1 with a reported Failed outcome and its real diagnostic D/hD, leaving the required change slot absent. One commit generates T1 and advances C17 to TestamentGenerated. This ordinary response is still unposted; no missing artifact or successful binding is invented.",
        }
      : {
          title: "Closing freezes the exact evidence set",
          description:
            "The respondent closes T1 with its summary, confidence, reported Complete outcome and exact bindings change → A/hA and optional log → L/hL. One commit makes A Attached, T1 Generated and C17 TestamentGenerated. Complete is the respondent's report, not acceptance; T1 is still unposted.",
        },
    {
      title: "Posting activates the return message",
      description:
        "The respondent posts the exact frozen T1 under its valid receipt entitlement. T1 becomes Posted before it travels back. C17 retains TestamentGenerated. Posting does not record claimant receipt, run a check, or accept the reported outcome.",
    },
    {
      title: "The claimant records exact delivery",
      description: missing
        ? "The claimant receives the posted T1 under the matching receipt fence. This timely receipt passes delivery and advances C17 to TestamentAcknowledged. The frozen manifest still lacks the required change slot; absence is assessed at authorized evaluation entry, not by inventing a tool run."
        : "The claimant receives the exact posted T1 under the matching receipt fence. This timely receipt passes delivery and advances C17 to TestamentAcknowledged. Behavior and Review are now Ready against T1's exact A/hA binding. Delivery alone does not accept the work.",
    },
  ];
  const ending = missing
    ? [
        {
          title: "Entry records the missing requirement",
          description:
            "Authorized evaluation entry finds no artifact in the required change slot. It immediately records ValidationIncomplete without creating A/hA, invoking a handler or inventing a review verdict. With no eligible alternative witness, T1 and C17 become ValidationIncomplete in the same commit; the unbegun review remains Ready with a suppression reason.",
        },
      ]
    : [
        {
          title: "The participant begins independent checks",
          description:
            "The designated Maintainer records entry and runs its own checks. Behavior enters Validating, while the independent agentic Review enters ValidatingQualityBar directly. A, T1 and C17 enter Validating together. The optional log has zero Required artifact checks and validates at entry without a quality claim. The ledger records these facts; it does not execute the tools.",
        },
        {
          title:
            example === "error"
              ? "Retain the execution diagnostic"
              : "A behavioral pass is only one witness",
          description:
            example === "error"
              ? "The runner cannot establish a result. Its diagnostic records an execution Error, not evidence that A failed its standard. The declared retry policy keeps the same evaluation Validating with the same definition and A/hA target; no terminal parent outcome is chosen yet."
              : "The Maintainer commits Behavior's Pass with its result artifact. Behavior is Validated, but required Review is still pending on the same A/hA. A, T1 and C17 remain Validating; a pass on another artifact could not fill this witness.",
        },
        {
          title:
            example === "error"
              ? "Retry within the fixed policy"
              : "Prepare the independent review verdict",
          description:
            example === "error"
              ? "The policy permits one retry. Attempt 2 uses the same target and validator definition and retains attempt 1's diagnostic. It does not reset the evaluation. Review can proceed independently; acceptance and the final infrastructure outcome still await their committed results."
              : "The reviewer examines the same A/hA and prepares its evidence. Review remains in ValidatingQualityBar until its authorized verdict commits. A local report does not advance the artifact, response or claim.",
        },
        {
          title:
            example === "pass"
              ? "Commit the complete witness set"
              : "Commit the exact failure cause",
          description:
            example === "pass"
              ? "The final required Pass commits with its result artifact. Behavior and Review both passed on A/hA, and delivery already passed. A and T1 become Validated and C17 becomes Satisfied in the same publication. This example has no pending graph conditions; the original Complete report remains a separate fact."
              : example === "fail"
                ? "Review commits a conclusive quality Fail. Behavior's Pass remains valid but cannot cover the failed review requirement. A and T1 become ValidationFailed and C17 becomes ValidationFailed atomically. Later evidence cannot rewrite that terminal result; new work needs an eligible successor."
                : "Attempt 2 also cannot establish a result, exhausting this policy. Behavior becomes Errored with both diagnostics retained, while Review's independent Pass remains evidence. A becomes ValidationFailed with an Error cause; T1 and C17 become ValidationErrored. This is not a conclusive rejection of the patch.",
        },
      ];
  return [...opening, ...ending].map((entry, index) => {
    const state = journeyLifecycleSnapshot(index, example);
    return {
      label: labels[index],
      // Give the two flights time for departure, transit, docking and receipt.
      // Cargo seating happens on the berth before the return message is posted.
      transitionDuration:
        index === 1 || index === 5 ? 6.5 : index === 4 ? 3.8 : 2.4,
      shortLabel: labels[index] === "Record missing" ? "Missing" : undefined,
      title: entry.title,
      description: entry.description,
      facts: [
        { label: "Claim", value: `C17 · ${state.claim}`, tone: state.tone },
        {
          label: "Artifact",
          value: state.artifact
            ? `A / hA · ${state.artifact}`
            : missing
              ? "No change artifact"
              : "Not generated",
          tone: state.tone,
        },
        {
          label: "Testament",
          value: state.testament ? `T1 · ${state.testament}` : "Not generated",
          tone: state.tone,
        },
        {
          label: "Checks",
          value:
            state.step >= 5
              ? `Behavior: ${state.behavior}; Review: ${state.review}; delivery: Pass`
              : state.checks,
          tone: state.tone,
        },
      ],
    };
  });
}
