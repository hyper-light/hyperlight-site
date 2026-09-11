/** One fixed illustrative history: tabs inspect it; motion never appends records. */
export const recordReaderEntries = [
  {
    id: "check-a",
    label: "Original check",
    value: "patch-a · Fail",
    tone: "fail" as const,
  },
  {
    id: "C17",
    label: "Original claim",
    value: "C17 · ValidationFailed",
    tone: "fail" as const,
  },
  {
    id: "C18",
    label: "Linked successor",
    value: "C18 · new claim",
    tone: "pending" as const,
  },
  {
    id: "patch-b",
    label: "New evidence",
    value: "patch-b · not evaluated",
    tone: "pending" as const,
  },
];

const facts = recordReaderEntries.map(({ label, value, tone }) => ({
  label,
  value,
  tone,
}));

/** A verdict and its derived terminal claim state commit together. */
export const recordReaderReplayEvents = [
  "01 · C17 failed · review A: Fail",
  "02 · C18 posted · corrects C17",
  "03 · C18 received · parser agent",
  "04 · patch-b recorded · no checks",
] as const;

export const recordReaderSteps = [
  {
    label: "Record",
    title: "Recorded Failure",
    description:
      "The ledger retains the failed check against patch-a and C17's terminal failure, alongside their response and evidence.",
    facts,
  },
  {
    label: "Replay",
    title: "Deterministic Replay",
    description:
      "The ledger reads the retained events into its recovery buffer, rebuilding C17's failure and C18's separate state. The maintainer can read the rebuilt view once the full prefix is ready. Replay doesn't run the validator again or replace its result.",
    facts,
  },
  {
    label: "Correct",
    title: "Successor Claim",
    description:
      "The maintainer records C18 as a successor; the parser agent submits patch-b through the ledger. That new evidence needs its own checks. The correction doesn't turn C17's original failure into a pass.",
    facts,
  },
];
