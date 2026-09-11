import type { ProofStep } from "./proof-figure";

/** One illustrative successful claim under the target four-family contract. */
export const claimLifecycleSteps: ProofStep[] = [
  {
    label: "Generate",
    title: "Freeze the obligation",
    description:
      "The claimant generates C17 with immutable acceptance requirements. The patch slot requires both Behavior and Review on the same exact artifact, plus delivery of the response. Generated work has no execution receipt yet.",
    facts: [
      { label: "Claim C17", value: "Generated" },
      { label: "Required", value: "Behavior + Review · same artifact" },
      { label: "Authority", value: "Claimant authors the requirements" },
    ],
  },
  {
    label: "Acquire",
    title: "Take responsibility",
    description:
      "The claimant posts C17. After admission and graph start conditions pass, the subject acquires its execution receipt: Posted becomes Received. That receipt records the exact holder and generation; the participant performs the work with its own tools.",
    facts: [
      { label: "Claim C17", value: "Posted → Received" },
      { label: "Execution receipt", value: "Exact holder + generation" },
      { label: "Response", value: "Acquiring creates no testament" },
    ],
  },
  {
    label: "Close",
    title: "Close one work cycle",
    description:
      "The respondent produces immutable patch A/hA, then authors response T1. One commit freezes its report and manifest, generates T1, attaches A/hA, and advances C17 to TestamentGenerated. T1 still needs to be posted.",
    facts: [
      { label: "Claim C17", value: "TestamentGenerated" },
      { label: "Atomic commit", value: "T1 Generated + A/hA Attached" },
      { label: "Authorship", value: "Respondent closes its own account" },
    ],
  },
  {
    label: "Receive",
    title: "Record exact delivery",
    description:
      "The respondent posts the frozen T1. The claimant receives that exact response under its matching receipt fence, moving C17 to TestamentAcknowledged. This timely receipt passes the required delivery check; Behavior and Review remain pending.",
    facts: [
      { label: "Response T1", value: "Posted → Received" },
      { label: "Claim C17", value: "TestamentAcknowledged" },
      {
        label: "Delivery",
        value: "Passed · evidence checks Ready",
        tone: "pass",
      },
    ],
  },
  {
    label: "Check",
    title: "Check the exact work",
    description:
      "Authorized evaluation entry advances C17, T1 and A/hA to Validating. The designated participants run Behavior and Review against the same A/hA from T1. Each check records its own evidence; a Behavior pass alone cannot satisfy the patch slot.",
    facts: [
      { label: "Claim C17", value: "Validating" },
      { label: "Required witnesses", value: "Behavior + Review · T1 / A / hA" },
      { label: "Execution", value: "Each evaluator invokes its own tools" },
    ],
  },
  {
    label: "Satisfy",
    title: "Release only when complete",
    description:
      "Delivery and both required checks now have exact successful witnesses. There are no pending dependencies in this example, so the final result atomically makes A/hA and T1 Validated and C17 Satisfied. A claim with pending dependency conditions would retain local completion until its graph gate also passed.",
    facts: [
      {
        label: "Evidence",
        value: "A/hA Validated · T1 Validated",
        tone: "pass",
      },
      {
        label: "Acceptance",
        value: "Every Required obligation covered",
        tone: "pass",
      },
      {
        label: "Claim C17",
        value: "Satisfied · no pending dependencies",
        tone: "pass",
      },
    ],
  },
];
