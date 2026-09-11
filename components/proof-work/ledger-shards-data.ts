import type { ProofStep } from "./proof-figure";

export const ledgerShardsSource =
  "https://github.com/hyper-light/focal/blob/626b1b59fa286ba4093e96f481afe38b8b061ede/docs/archictecutre/25-parallel-materialization-and-ranges.md#6-movement-r73-third-step-2026-09-09-the-state-machine-in-the-log";

/** Illustrative range identities and epochs, not a live cluster or capacity reading. */
export const ledgerShardsExample = {
  session: "S1",
  range: "B",
  originalEpoch: 7,
  nextEpoch: 8,
  source: "Session voters",
  destination: "Holder B",
  groups: 32,
  firstGroup: 8,
  lastGroup: 15,
} as const;

export const ledgerShardsSteps: ProofStep[] = [
  {
    label: "Choose",
    title: "Affinity Boundaries",
    description:
      "Choose a contiguous range between object affinities. Every row belonging to an object stays together; the range layout still has one session prefix.",
    facts: [
      { label: "Selected range", value: "B · 8 affinity groups" },
      { label: "Session log", value: "S1 · one ordered log" },
      { label: "Range epoch", value: "7" },
    ],
  },
  {
    label: "Copy",
    title: "Committed Snapshot",
    description:
      "Record the move and seed the destination from a committed snapshot. The existing range placement stays active while the copy is prepared.",
    facts: [
      { label: "Move records", value: "Begin · Snapshot" },
      { label: "Destination", value: "Holder B · preparing" },
      { label: "Range epoch", value: "7" },
    ],
  },
  {
    label: "Catch up",
    title: "Committed-Log Catch-up",
    description:
      "Apply the changes committed after the snapshot. The destination must catch up to the barrier and prove readiness before the new placement can activate.",
    facts: [
      { label: "Updates", value: "Same S1 session log" },
      { label: "Readiness", value: "Required before activation" },
      { label: "Range epoch", value: "7" },
    ],
  },
  {
    label: "Fence",
    title: "Range Write Barrier",
    description:
      "Commit the barrier and refuse writes touching the moving range with RangeMoving. Eligible writes to other ranges can continue. Activation waits for the required readiness and source-seal proofs.",
    facts: [
      {
        label: "Touched-range writes",
        value: "RangeMoving · retryable",
        tone: "pending",
      },
      { label: "Other ranges", value: "Eligible writes continue" },
      { label: "Abort after barrier", value: "Refused · Sealed" },
    ],
  },
  {
    label: "Activate",
    title: "Range Epoch Activation",
    description:
      "Commit the new placement at range epoch 8. The old map is no longer current, but S1 keeps the same authority and ordered log. Older copies remain until pinned reads release.",
    facts: [
      { label: "Range holder", value: "Holder B · active", tone: "pass" },
      { label: "Range epoch", value: "8 · epoch 7 superseded" },
      { label: "Session route epoch", value: "Unchanged" },
    ],
  },
];
