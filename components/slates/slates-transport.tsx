"use client";

import { ProofFigure } from "../proof-work/proof-figure";
import { transportSteps } from "./transport-data";
import { transportFrame } from "./transport-geometry";

export function SlatesTransport() {
  return (
    <ProofFigure
      id="slates-transport"
      eyebrow="SLATES / TRANSPORT"
      title="Retrying After a Connection Fails"
      steps={transportSteps}
      frame={transportFrame}
      autoAdvance
      stepDuration={4}
      seekDuration={0.9}
      mobileStageRail
      caption={
        <>
          The{" "}
          <a href="https://github.com/hyper-light/slates/blob/3aa6b85c155ba4269614b5e5d3c053e28dd3c787/docs/wip/fleet-transport.md#8-the-session-plane-slice-4--the-owned-quic-dialect-tls-13-not-noise">
            session protocol
          </a>{" "}
          sends requests, replies and content over separate ordered streams. The
          cable cutaway separates those logical streams, not physical wires.
          Receiver credit limits the bytes in flight. The four slots fill as
          content arrives and empty as the receiver consumes it, making room for
          more. A{" "}
          <a href="https://github.com/hyper-light/slates/blob/3aa6b85c155ba4269614b5e5d3c053e28dd3c787/crates/db/src/replay.rs#L245">
            saved request result
          </a>{" "}
          prevents a retry from repeating the operation. The{" "}
          <a href="https://github.com/hyper-light/slates/blob/3aa6b85c155ba4269614b5e5d3c053e28dd3c787/crates/client/tests/client.rs#L223-L255">
            restart retry test
          </a>{" "}
          checks that the same create request returns the original volume ID.
        </>
      }
    />
  );
}
