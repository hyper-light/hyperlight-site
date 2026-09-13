"use client";

import { ProofFigure } from "../proof-work/proof-figure";
import { ownershipSteps } from "./ownership-data";
import { loadOwnershipFrame } from "./slates-frame-loaders";

export function SlatesOwnership() {
  return (
    <ProofFigure
      id="slates-ownership"
      eyebrow="SLATES / OWNERSHIP"
      title="Processing Writes on Separate Cores"
      steps={ownershipSteps}
      loadFrame={loadOwnershipFrame}
      autoAdvance
      stepDuration={3}
      seekDuration={0.9}
      mobileStageRail
      caption={
        <>
          A request changes a cell in its target volume; the second volume on
          the same core stays unchanged. Other cores process their own volumes
          independently while sharing immutable content. The{" "}
          <a href="https://github.com/hyper-light/slates/blob/3aa6b85c155ba4269614b5e5d3c053e28dd3c787/docs/wip/SLATES_DESIGN.md#43-runtime-thread-per-core-executor-drivers-rings-cancellation-d-7-d-9">
            runtime design
          </a>{" "}
          defines the per-core executor and bounded cross-shard rings; the three
          slots here illustrate a finite queue, not its configured depth.
        </>
      }
    />
  );
}
