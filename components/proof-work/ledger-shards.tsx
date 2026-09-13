"use client";

import { ProofFigure } from "./proof-figure";
import { ledgerShardsSource, ledgerShardsSteps } from "./ledger-shards-data";
import { loadLedgerShardsFrame } from "./proof-frame-loaders";

export function LedgerShards() {
  return (
    <ProofFigure
      id="ledger-shards"
      eyebrow="PROOF OF WORK / RANGE MOVEMENT"
      title="Range Sharding and Movement"
      steps={ledgerShardsSteps}
      loadFrame={loadLedgerShardsFrame}
      autoAdvance
      caption={
        <>
          Voters retain every range. Current extra holders still materialize the
          full session: they distribute serving, not per-session memory. This
          illustrates range placement, not RAM usage.{" "}
          <a href={ledgerShardsSource}>Range movement specification</a>.
        </>
      }
    />
  );
}
