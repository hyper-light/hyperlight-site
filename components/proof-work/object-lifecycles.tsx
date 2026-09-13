"use client";

import { useState } from "react";
import { ProofFigure } from "./proof-figure";
import { journeyLifecycleSteps } from "./journey-lifecycle-data";
import { loadJourneyFrames } from "./proof-frame-loaders";
import {
  validatorExamples,
  type ValidatorExample,
} from "./validator-lifecycle-data";
import styles from "./object-lifecycles.module.css";

const reserveSteps = validatorExamples.flatMap(({ value }) =>
  journeyLifecycleSteps(value),
);

export function ObjectLifecycles() {
  const [example, setExample] = useState<ValidatorExample>("pass");
  return (
    <section
      className={styles.explorer}
      data-lifecycle-explorer=""
      aria-label="Claim and response journey"
    >
      <ProofFigure
        id="lifecycle-journey"
        resetKey={example}
        eyebrow="PROOF OF WORK / LIFECYCLES"
        title="Claim and Response Lifecycles"
        controls={
          <div className={styles.controls}>
            <p>
              The claimant posts C17. The respondent returns T1 with its
              evidence. The ledger records the exchange and the evaluations.
            </p>
            <label className={styles.outcome}>
              <span>Outcome</span>
              <select
                aria-label="Evaluation outcome"
                value={example}
                onChange={(event) =>
                  setExample(event.target.value as ValidatorExample)
                }
              >
                {validatorExamples.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        }
        steps={journeyLifecycleSteps(example)}
        reserveSteps={reserveSteps}
        loadFrame={loadJourneyFrames[example]}
        caption="C17 and T1 are distinct authored records. A/hA is the returned change artifact. Participants execute the work and checks; the ledger records their evidence and derives claim satisfaction. Optional progress and artifact-observation transitions are omitted, and this example has no pending graph dependencies."
        autoAdvance
        stepDuration={2.4}
        seekDuration={0.85}
        mobileStageRail
      />
    </section>
  );
}
