"use client";

import { ProofFigure } from "../proof-work/proof-figure";
import { authoritySteps } from "./authority-data";
import { loadAuthorityFrame } from "./slates-frame-loaders";

export function SlatesAuthority() {
  return (
    <ProofFigure
      id="slates-authority"
      eyebrow="SLATES / FAILOVER"
      title="Replacing a Failed Owner"
      steps={authoritySteps}
      loadFrame={loadAuthorityFrame}
      autoAdvance
      mobileStageRail
      stepDuration={3.1}
      seekDuration={0.9}
      caption={
        <>
          Two of three candidates must promise to reject the previous owner
          before its replacement can recover the accepted version. The new
          ownership epoch fences every affected object at the holders that
          install it; recovery does not require contacting the failed machine. B
          recovers version 7 before accepting writes. See the{" "}
          <a href="https://github.com/hyper-light/slates/blob/3aa6b85c155ba4269614b5e5d3c053e28dd3c787/docs/wip/SLATES_DESIGN.md#L1635-L1710">
            register and takeover protocol
          </a>{" "}
          and the{" "}
          <a href="https://github.com/hyper-light/slates/blob/3aa6b85c155ba4269614b5e5d3c053e28dd3c787/crates/server/src/fleet.rs#L2345-L2357">
            holder fence installation
          </a>
          . Answering a probe does not restore the previous owner’s permission
          to write.
        </>
      }
    />
  );
}
