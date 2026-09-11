"use client";

import { ProofFigure, type ProofStep } from "./proof-figure";
import { fixtureExamples, fixtureOutcome } from "./validation-fixture-data";
import { validationFixtureFrame } from "./validation-fixture-geometry";

const steps: ProofStep[] = fixtureExamples.map((example) => {
  const outcome = fixtureOutcome(example);
  return {
    label: example.label,
    shortLabel: example.shortLabel,
    title: example.title,
    description: example.description,
    facts: [
      ...example.checks.map((check) => ({
        label: check.check,
        value: check.artifact
          ? `${check.verdict} · patch ${check.artifact}`
          : "No artifact to check",
        tone:
          check.verdict === "Pass"
            ? ("pass" as const)
            : check.verdict === "Fail"
              ? ("fail" as const)
              : check.verdict === "Error"
                ? ("error" as const)
                : ("pending" as const),
      })),
      {
        label: "Acceptance",
        value: outcome,
        tone:
          outcome === "Satisfied"
            ? "pass"
            : outcome === "Failed"
              ? "fail"
              : outcome === "Errored"
                ? "error"
                : "pending",
      },
    ],
  };
});

export function ValidationFixture() {
  return (
    <ProofFigure
      id="validation-fixture"
      eyebrow="PROOF OF WORK / VALIDATION"
      title="Artifact-Bound Validation"
      frame={validationFixtureFrame}
      steps={steps}
      caption={
        <>
          The Maintainer reads exact context from the ledger, runs checks
          locally, and posts the results back. A and B have different IDs and
          digests. The closing testament is already posted and received. These
          examples have no outstanding dependencies or already-passing
          alternatives.
        </>
      }
    />
  );
}
