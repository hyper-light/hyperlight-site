"use client";

import { ProofFigure } from "../proof-work/proof-figure";
import { operationMapSteps } from "./operation-map-data";
import { operationMapFrame } from "./operation-map-geometry";

export function SlatesOperationMap() {
  return (
    <ProofFigure
      id="slates-operation-map"
      eyebrow="SLATES / COORDINATE MAP"
      title="Updating Edit Positions After an Insertion"
      frame={operationMapFrame}
      steps={operationMapSteps}
      autoAdvance
      mobileStageRail
      stepDuration={3.2}
      seekDuration={0.85}
      caption={
        <>
          Agent 2’s edit changes <code>quality=80</code> to{" "}
          <code>quality=90</code> in <code>image.conf</code>. Inserting{" "}
          <code>format=webp</code> and a newline before it adds 12 bytes. The
          saved range moves from [8, 10) to [20, 22), still selecting{" "}
          <code>80</code>. The owner maps the incoming edit against its changed
          file before applying the replacement. The original operation record
          stays fixed while the current rows and range move. All characters here
          are ASCII, so each character and each newline occupies one byte.{" "}
          <a href="https://github.com/hyper-light/slates/blob/3aa6b85c155ba4269614b5e5d3c053e28dd3c787/crates/merge/src/map.rs">
            Position mapping
          </a>
          ;{" "}
          <a href="https://github.com/hyper-light/slates/blob/3aa6b85c155ba4269614b5e5d3c053e28dd3c787/crates/vfs/src/algebra.rs">
            operation composition
          </a>
          .
        </>
      }
    />
  );
}
