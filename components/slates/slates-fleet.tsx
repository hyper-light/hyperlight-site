"use client";

import { ProofFigure } from "../proof-work/proof-figure";
import { fleetSteps, fleetSource } from "./fleet-data";
import { fleetPlacementFrame } from "./fleet-geometry";

export function SlatesFleet() {
  return (
    <ProofFigure
      id="slates-fleet"
      eyebrow="SLATES / CROSS-REGION PLACEMENT"
      title="Replicating Content Across Regions"
      steps={fleetSteps}
      frame={fleetPlacementFrame}
      autoAdvance
      mobileStageRail
      stepDuration={2.5}
      caption={
        <>
          Virginia and Frankfurt each need two verified copies among three
          eligible machines to tolerate one failure within that region.
          Singapore sends the request; it does not store a replica.{" "}
          <a href={fleetSource}>Placement and durability contract</a>.
        </>
      }
    />
  );
}
