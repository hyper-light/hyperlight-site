"use client";

import { ProofFigure } from "../proof-work/proof-figure";
import { workspaceSteps } from "./workspace-data";
import { loadWorkspaceFrame } from "./slates-frame-loaders";

export function SlatesWorkspace() {
  return (
    <ProofFigure
      id="slates-workspace"
      eyebrow="SLATES / WORK VOLUMES"
      title="Sharing Unchanged File Content"
      loadFrame={loadWorkspaceFrame}
      steps={workspaceSteps}
      autoAdvance
      mobileStageRail
      stepDuration={2.8}
      seekDuration={0.85}
      caption={
        <>
          A–E denote illustrative content extents; a0–a7 denote memory
          allocations, not physical DRAM addresses. Only Agent 1’s changed
          content needs another allocation. The host base remains read-only.{" "}
          <a href="https://github.com/hyper-light/slates/blob/3aa6b85c155ba4269614b5e5d3c053e28dd3c787/crates/vfs/src/base.rs">
            Overlay and copy-up
          </a>
          ;{" "}
          <a href="https://github.com/hyper-light/slates/blob/3aa6b85c155ba4269614b5e5d3c053e28dd3c787/docs/wip/SLATES_DESIGN.md">
            snapshot and sealing design
          </a>
          .
        </>
      }
    />
  );
}
