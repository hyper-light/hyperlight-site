"use client";

import { ProofFigure } from "../proof-work/proof-figure";
import { recoverySteps } from "./recovery-data";
import { loadRecoveryFrame } from "./slates-frame-loaders";

export function SlatesRecovery() {
  return (
    <ProofFigure
      id="slates-recovery"
      eyebrow="SLATES / RECOVERY"
      title="Recovering After a Daemon Restart"
      steps={recoverySteps}
      loadFrame={loadRecoveryFrame}
      autoAdvance
      stepDuration={3.5}
      seekDuration={0.9}
      mobileStageRail
      caption={
        <>
          A separate anchor process retains the shared memory when the daemon
          stops. The{" "}
          <a href="https://github.com/hyper-light/slates/blob/3aa6b85c155ba4269614b5e5d3c053e28dd3c787/docs/wip/recovery.md#2-the-mechanism-and-why">
            recovery image
          </a>{" "}
          restores workspace contents and roots; the{" "}
          <a href="https://github.com/hyper-light/slates/blob/3aa6b85c155ba4269614b5e5d3c053e28dd3c787/docs/wip/SLATES_DESIGN.md#47-ipc-and-the-provisioning-fast-path-d-10">
            completion protocol
          </a>{" "}
          lets a retried request return its original result. This is
          daemon-restart survival while the anchor remains alive, not power-loss
          durability.
        </>
      }
    />
  );
}
