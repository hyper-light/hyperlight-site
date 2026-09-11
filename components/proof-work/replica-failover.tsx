"use client";

import { ProofFigure, type ProofStep } from "./proof-figure";
import { replicaStates } from "./replica-failover-data";
import { replicaFailoverFrame } from "./replica-failover-geometry";

const steps: ProofStep[] = replicaStates.map((state) => ({
  label: state.label,
  shortLabel: "shortLabel" in state ? state.shortLabel : state.label,
  title: state.title,
  description: state.description,
  facts: [
    { label: "Reachable voters", value: `${state.reachable} / 3` },
    {
      label: "Writes",
      value: state.writes,
      tone:
        state.writes === "Admitted"
          ? "pass"
          : state.writes === "Refused"
            ? "fail"
            : "pending",
    },
    { label: "Committed prefix", value: "01–04 retained" },
  ],
}));

export function ReplicaFailover() {
  return (
    <ProofFigure
      id="replica-failover"
      eyebrow="PROOF OF WORK / DURABILITY"
      title="Replica Failover"
      frame={replicaFailoverFrame}
      steps={steps}
      caption={
        <>
          Three voting replicas; illustrative placement. Cross-region writes
          wait for the required remote durability. Local-process tests do not
          establish WAN failover performance. This shows log replication, not
          artifact-byte placement. Validators still run in participant
          workspaces.
        </>
      }
    />
  );
}
