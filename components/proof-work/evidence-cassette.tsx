"use client";

import { ProofFigure } from "./proof-figure";
import { cassetteArtifacts, cassetteStates } from "./evidence-cassette-data";
import { evidenceCassetteFrame } from "./evidence-cassette-geometry";

export function EvidenceCassette() {
  return (
    <ProofFigure
      id="evidence-cassette"
      eyebrow="PROOF OF WORK / EVIDENCE"
      title="Testament Lifecycle"
      frame={evidenceCassetteFrame}
      autoAdvance
      steps={cassetteStates.map((state) => ({
        ...state,
        facts: [
          {
            label: "Bindings",
            value: cassetteArtifacts
              .map(({ slot, label }) => `${slot} ${label}`)
              .join(" · "),
          },
          { label: "State", value: state.detail },
        ],
      }))}
      caption={
        <>
          A, L and R are illustrative artifact IDs; hA, hL and hR are their
          digests. Every submission, read and receipt goes through the ledger.
          The Parser agent’s test log is its evidence, not the Maintainer’s
          verdict.
        </>
      }
    />
  );
}
