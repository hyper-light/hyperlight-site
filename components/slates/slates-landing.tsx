"use client";

import { useId, useState } from "react";
import { ProofFigure } from "../proof-work/proof-figure";
import {
  landingSource,
  landingSteps,
  type LandingExample,
} from "./landing-data";
import { loadLandingFrames } from "./slates-frame-loaders";
import styles from "./slates-controls.module.css";

export function SlatesLanding() {
  const [example, setExample] = useState<LandingExample>("clean");
  const id = useId();
  return (
    <ProofFigure
      id="slates-landing"
      eyebrow="SLATES / DISK WRITES"
      title="Approving Disk Changes"
      steps={landingSteps(example)}
      loadFrame={loadLandingFrames[example]}
      resetKey={example}
      autoAdvance
      mobileStageRail
      stepDuration={2.5}
      controls={
        <div className={styles.controls}>
          <label htmlFor={id}>Disk target</label>
          <select
            id={id}
            value={example}
            onChange={(event) =>
              setExample(event.target.value === "drift" ? "drift" : "clean")
            }
          >
            <option value="clean">Unchanged</option>
            <option value="drift">Outside edit</option>
          </select>
        </div>
      }
      caption={
        <>
          The NVMe cutaway shows one approved file reaching storage through its
          controller. The highlighted NAND cells are illustrative, not a
          physical allocation map. An outside edit prevents this write; with
          multiple files, earlier changes may succeed before another is refused.{" "}
          <a href={landingSource}>Landing and validation rules</a>.
        </>
      }
    />
  );
}
