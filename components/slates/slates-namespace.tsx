"use client";

import { ProofFigure } from "../proof-work/proof-figure";
import { namespaceSteps } from "./namespace-data";
import { loadNamespaceFrame } from "./slates-frame-loaders";

export function SlatesNamespace() {
  return (
    <ProofFigure
      id="slates-namespace"
      eyebrow="SLATES / NAMESPACE"
      title="Renaming a File While It’s Open"
      loadFrame={loadNamespaceFrame}
      steps={namespaceSteps}
      autoAdvance
      mobileStageRail
      stepDuration={2.8}
      seekDuration={0.85}
      caption={
        <>
          All operations stay inside one volume. The link count is the number of
          names that refer to the file. The open reader holds a separate
          reference, so renaming or removing a name does not make it read a
          different file.{" "}
          <a href="https://github.com/hyper-light/slates/blob/3aa6b85c155ba4269614b5e5d3c053e28dd3c787/crates/vfs/src/volume.rs">
            Link, rename, unlink and open-inode references
          </a>
          ;{" "}
          <a href="https://github.com/hyper-light/slates/blob/3aa6b85c155ba4269614b5e5d3c053e28dd3c787/docs/wip/SLATES_DESIGN.md">
            namespace design
          </a>
          .
        </>
      }
    />
  );
}
