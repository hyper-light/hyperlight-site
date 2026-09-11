"use client";

import { ProofFigure } from "./proof-figure";
import { ledgerPlacementFrame } from "./ledger-placement-geometry";

const steps = [
  {
    label: "Sessions",
    title: "Independent Session Placement",
    description:
      "Unrelated sessions can run in different regions, each with its own ordered history. Requests carry their tenant and session identity so the directory can route them to the right authority.",
    facts: [
      { label: "Ordering", value: "Per session" },
      { label: "Global sequencer", value: "Not required" },
    ],
  },
  {
    label: "Replication",
    title: "Cross-Region Replicas",
    description:
      "Replicas of one session preserve the same committed history. Surviving a region loss requires a voting majority and the required evidence copies outside the failed region; synchronous remote durability adds inter-region latency.",
    facts: [
      { label: "Session identity", value: "Unchanged" },
      { label: "Copies", value: "Selected by failure policy" },
    ],
  },
  {
    label: "Residency",
    title: "Placement Restrictions",
    description:
      "A region outside the residency policy can't receive a durable copy. The restriction covers ledger state, artifacts, checkpoints, and archives. This placement rule doesn't by itself establish a region-loss survival guarantee.",
    facts: [
      { label: "Region C", value: "Placement blocked", tone: "fail" as const },
      { label: "Availability", value: "Constrained by permitted regions" },
    ],
  },
];

export function LedgerPlacement() {
  return (
    <ProofFigure
      id="ledger-placement"
      eyebrow="PROOF OF WORK / DISTRIBUTION"
      title="Global Ledger Placement"
      steps={steps}
      frame={ledgerPlacementFrame}
      caption="Illustrative regions, not measured deployment locations. Home-region policy selects ordinary authority placement; residency bounds every durable copy. A three-region diagram isn't evidence of WAN-scale performance."
    />
  );
}
