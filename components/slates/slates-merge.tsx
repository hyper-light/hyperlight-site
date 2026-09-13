"use client";

import { useId, useState } from "react";
import { ProofFigure } from "../proof-work/proof-figure";
import { mergeScenarios, mergeSteps, type MergeScenario } from "./merge-data";
import { loadMergeFrames } from "./slates-frame-loaders";
import styles from "./merge-controls.module.css";

export function SlatesMerge() {
  const [scenario, setScenario] = useState<MergeScenario>("disjoint");
  const selectId = useId();
  return (
    <ProofFigure
      id="slates-merge"
      eyebrow="SLATES / RANGE VERDICT"
      title="Merging Two Sets of File Changes"
      loadFrame={loadMergeFrames[scenario]}
      steps={mergeSteps(scenario)}
      reserveSteps={mergeScenarios.flatMap(({ id }) => mergeSteps(id))}
      resetKey={scenario}
      autoAdvance
      mobileStageRail
      stepDuration={2.8}
      seekDuration={0.85}
      controls={
        <div className={styles.controls}>
          <label htmlFor={selectId}>Agent 2’s edit</label>
          <select
            id={selectId}
            value={scenario}
            onChange={(event) => {
              const selected = mergeScenarios.find(
                ({ id }) => id === event.target.value,
              );
              if (selected) setScenario(selected.id);
            }}
          >
            {mergeScenarios.map(({ id, label }) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </div>
      }
      caption={
        <>
          An illustrative edit to an ASCII settings file. Half-open ranges
          include the first byte and exclude the last. Agent 1 changes two
          bytes, leaving Agent 2’s later range in place; Agent 2’s separate
          change shortens the second line. Accepting these edits establishes
          byte compatibility, not that the settings are correct.{" "}
          <a href="https://github.com/hyper-light/slates/blob/3aa6b85c155ba4269614b5e5d3c053e28dd3c787/crates/vfs/src/algebra.rs">
            Declared-operation algebra
          </a>
          ;{" "}
          <a href="https://github.com/hyper-light/slates/blob/3aa6b85c155ba4269614b5e5d3c053e28dd3c787/crates/merge/src/engine.rs">
            merge verdict
          </a>
          .
        </>
      }
    />
  );
}
