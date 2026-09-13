"use client";

import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import { ProofFigure } from "../proof-work/proof-figure";
import { orbitalFleetSources } from "./orbital-fleet-data";
import { resolutionSources } from "./conflict-resolution-data";
import { loadOrbitalFleetFrames } from "./slates-frame-loaders";
import { orbitalSceneHeights } from "./orbital-scene-dimensions";
import {
  orbitalScenarios,
  orbitalScenarioSteps,
  type OrbitalScenario,
} from "./orbital-fleet-scenarios";
import styles from "./slates-controls.module.css";
import orbitalStyles from "./slates-orbital-fleet.module.css";

const reservedSteps = orbitalScenarios.flatMap(({ value }) =>
  orbitalScenarioSteps(value),
);

export function SlatesOrbitalFleet() {
  const [scenario, setScenario] = useState<OrbitalScenario>("success");
  const scenarioId = useId();
  return (
    <ProofFigure
      id="slates-orbital-fleet"
      eyebrow="SLATES / A DISTRIBUTED WORKSPACE"
      title="Private Work. Shared Progress."
      description="Follow a successful run—or see what happens when edits conflict, content is missing, or a node stops responding."
      loadFrame={loadOrbitalFleetFrames[scenario]}
      steps={orbitalScenarioSteps(scenario)}
      reserveSteps={reservedSteps}
      resetKey={scenario}
      autoAdvance
      mobileStageRail
      sceneHeights={orbitalSceneHeights}
      stepDuration={3.2}
      seekDuration={1.2}
      controls={
        <div className={`${styles.controls} ${orbitalStyles.controls}`}>
          <label htmlFor={scenarioId}>Scenario</label>
          <div className={orbitalStyles.choice}>
            <select
              id={scenarioId}
              value={scenario}
              onChange={(event) => {
                const choice = orbitalScenarios.find(
                  ({ value }) => value === event.target.value,
                );
                if (choice) setScenario(choice.value);
              }}
            >
              {orbitalScenarios.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <ChevronDown className={orbitalStyles.chevron} aria-hidden="true" />
          </div>
        </div>
      }
      caption={
        <>
          A starfighter represents a private VFS workspace, not a full copy of
          the repository. The large station starts as the{" "}
          <a href={orbitalFleetSources.architecture}>
            owner of this shared volume
          </a>
          , not a master for every machine. Commits depend on{" "}
          <a href={orbitalFleetSources.durability}>
            complete, verified content at the required holders
          </a>
          . A requested mirror can delay the final reply after the home commit.
          Failure runs begin with deployed workspaces.{" "}
          {scenario === "conflict" && (
            <>
              The author uses the{" "}
              <a href={resolutionSources.verdict}>returned conflict windows</a>{" "}
              to revise the edit; Slates does not choose the resolution.
            </>
          )}
          {scenario === "reply-loss" && (
            <>
              Retrying the same request returns its{" "}
              <a href="https://github.com/hyper-light/slates/blob/3aa6b85c155ba4269614b5e5d3c053e28dd3c787/crates/db/src/replay.rs#L245">
                saved result
              </a>
              , within the retry and retention rules.
            </>
          )}
          {scenario === "owner-loss" && (
            <>
              B and C are surviving home-region holders, not regional mirrors.{" "}
              The{" "}
              <a href="https://github.com/hyper-light/slates/blob/3aa6b85c155ba4269614b5e5d3c053e28dd3c787/docs/wip/SLATES_DESIGN.md#L1635-L1710">
                takeover protocol
              </a>{" "}
              requires new authority and recovered state before B serves.
            </>
          )}{" "}
          Every run leaves the source disk unchanged; writing it still needs
          separate human approval.
        </>
      }
    />
  );
}
