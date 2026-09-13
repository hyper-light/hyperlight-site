"use client";

import { ProofFigure, type ProofStep } from "./proof-figure";
import { latencyExamples, latencyMeasurements } from "./latency-probing-data";
import { loadLatencyProbingFrame } from "./proof-frame-loaders";

const steps: ProofStep[] = latencyExamples.map((example, index) => {
  const measurement = latencyMeasurements[index];
  return {
    label: example.label,
    title: example.title,
    description: example.description,
    facts: [
      { label: "Observed RTT", value: `${example.observed} ms` },
      {
        label: "Estimate + error margin",
        value: `${measurement.estimate.toFixed(1)} + ${measurement.margin.toFixed(1)} ms`,
      },
      {
        label: "Probe deadline",
        value: `${measurement.deadline.toLocaleString("en-US")} ms · ${measurement.health}× health`,
      },
    ],
  };
});

export function LatencyProbing() {
  return (
    <ProofFigure
      id="latency-probing"
      eyebrow="PROOF OF WORK / LIVENESS"
      title="Latency-Aware Probing"
      loadFrame={loadLatencyProbingFrame}
      steps={steps}
      caption={
        <>
          An illustrative projection of eight-dimensional coordinates, not a
          geographic map. The values use all eight axes and one coordinate
          update from the observed round trip. The probe deadline is three times
          the upper estimate, clamped to 300–2,000 ms, then multiplied by
          observer health. Coordinates set probe timing; they don&apos;t select
          request routes or grant leadership.
        </>
      }
    />
  );
}
