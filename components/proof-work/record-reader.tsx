"use client";

import { ProofFigure } from "./proof-figure";
import { recordReaderSteps } from "./record-reader-data";
import { recordReaderFrame } from "./record-reader-geometry";

export function RecordReader() {
  return (
    <ProofFigure
      id="record-reader"
      eyebrow="PROOF OF WORK / HISTORY"
      title="History Replay and Corrections"
      steps={recordReaderSteps}
      frame={recordReaderFrame}
      caption="The stored history stays fixed while the ledger rebuilds the view above it. C17's failed review and terminal failure replay together. The maintainer reads the completed view; patch-b still needs its own checks."
    />
  );
}
