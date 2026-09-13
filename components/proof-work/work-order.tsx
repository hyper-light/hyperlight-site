"use client";

import { ProofFigure } from "./proof-figure";
import { workOrderSteps } from "./work-order-data";
import { loadWorkOrderFrame } from "./proof-frame-loaders";

export function WorkOrder() {
  return (
    <ProofFigure
      id="work-order"
      eyebrow="PROOF OF WORK / CLAIM"
      title="Claim Lifecycle"
      steps={workOrderSteps}
      loadFrame={loadWorkOrderFrame}
      autoAdvance
      stepDuration={2.4}
      caption="C17 and its execution receipt stay in the authoritative ledger. Posting makes the claim available; acquiring the receipt establishes responsibility, not satisfaction."
    />
  );
}
