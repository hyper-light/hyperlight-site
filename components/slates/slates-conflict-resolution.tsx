"use client";

import { useId, useState } from "react";
import { ProofFigure } from "../proof-work/proof-figure";
import {
  conflictResolutionSteps,
  resolutionSources,
  type ResolutionAuthor,
  type ResolutionRecheck,
} from "./conflict-resolution-data";
import { conflictResolutionFrames } from "./conflict-resolution-geometry";
import styles from "./slates-controls.module.css";

export function SlatesConflictResolution() {
  // Human assistance changes who revises the edit, not who owns the volume.
  const [author, setAuthor] = useState<ResolutionAuthor>("agent");
  const [recheck, setRecheck] = useState<ResolutionRecheck>("unchanged");
  const id = useId();
  return (
    <ProofFigure
      id="slates-conflict-resolution"
      eyebrow="SLATES / RESOLVING A CONFLICT"
      title="Resolving Conflicting Agent Edits"
      frame={conflictResolutionFrames[author][recheck]}
      steps={conflictResolutionSteps(author, recheck)}
      reserveSteps={(["agent", "human"] as const).flatMap((a) =>
        (["unchanged", "changed"] as const).flatMap((r) =>
          conflictResolutionSteps(a, r),
        ),
      )}
      resetKey={`${author}-${recheck}`}
      autoAdvance
      mobileStageRail
      sceneHeights={{ landscape: 580, portrait: 800 }}
      stepDuration={2.8}
      seekDuration={0.85}
      controls={
        <div
          className={styles.controls}
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
          }}
        >
          <label htmlFor={id + "-author"}>Who revises Agent 2’s edit?</label>
          <select
            id={id + "-author"}
            value={author}
            style={{ maxWidth: "100%", width: "100%" }}
            onChange={(event) =>
              setAuthor(event.target.value === "human" ? "human" : "agent")
            }
          >
            <option value="agent">Agent 2</option>
            <option value="human">Agent 2 with human review</option>
          </select>
          <label htmlFor={id + "-disk"}>Shared head before acceptance</label>
          <select
            id={id + "-disk"}
            value={recheck}
            style={{ maxWidth: "100%", width: "100%" }}
            onChange={(event) =>
              setRecheck(
                event.target.value === "changed" ? "changed" : "unchanged",
              )
            }
          >
            <option value="unchanged">Still r1 · quality=90</option>
            <option value="changed">Agent 1 submits another edit: 70</option>
          </select>
        </div>
      }
      caption={
        <>
          Agent 1 and Agent 2 change the same two bytes on separate worker
          nodes. The owner returns the{" "}
          <a href={resolutionSources.verdict}>conflicting ranges and content</a>
          . Agent 2 starts fresh work from the accepted head, deliberately
          chooses 85 and{" "}
          <a href={resolutionSources.workflow}>
            submits a new operation against that version
          </a>
          . Slates does not calculate the chosen value or force a conflicting
          rebase. The{" "}
          <a href={resolutionSources.tests}>merge and rebase tests</a> cover the
          admission rules. Accepting r2 changes the shared volume, not disk.
        </>
      }
    />
  );
}
