import type { ProofTone } from "../proof-work/proof-geometry";
import { type Point2, spatialDrawing } from "./spatial-drawing";
import { drawOrbitalOwner } from "./orbital-owner-drawing";
import { drawOrbitalWorker } from "./orbital-worker-drawing";
import { drawOrbitalReplica } from "./orbital-replica-drawing";
import type { OrbitalChunkState } from "./orbital-volume-drawing";

export type OrbitalStationRole = "owner" | "worker" | "mirror";

/** Separate physical hull families share only their lighting, camera and
 * docking contract—not a resized ring or a repeated center module. */
export function drawOrbitalStation(
  d: ReturnType<typeof spatialDrawing>,
  id: string,
  center: Point2,
  scale: number,
  options: {
    role: OrbitalStationRole;
    time: number;
    activity: number;
    tone?: ProofTone;
    bayOpen?: number;
    checks?: readonly number[];
    disabled?: number;
    chunkState?: OrbitalChunkState;
    variant?: 0 | 1 | 2 | "home" | "mirror";
  },
): void {
  const disabled = Number.isFinite(options.disabled)
    ? Math.max(0, Math.min(1, options.disabled ?? 0))
    : 0;
  const powered = 1 - disabled;
  const safe = {
    ...options,
    disabled,
    // A fixed terminal pose is deterministic across seeks and fully stops
    // direct rotations as well as wave-driven carriages, cranes and rotors.
    time: Number.isFinite(options.time)
      ? Math.max(0, options.time) * powered
      : 0,
    activity: Number.isFinite(options.activity)
      ? Math.max(0, Math.min(1, options.activity)) * powered
      : 0,
    bayOpen: Number.isFinite(options.bayOpen)
      ? Math.max(0, Math.min(1, options.bayOpen ?? 0))
      : 0,
  };
  const size = Number.isFinite(scale) ? Math.max(0, scale) : 1;
  if (options.role === "owner") drawOrbitalOwner(d, id, center, size, safe);
  else if (options.role === "worker")
    drawOrbitalWorker(d, id, center, size, {
      ...safe,
      variant: typeof options.variant === "number" ? options.variant : 0,
    });
  else
    drawOrbitalReplica(d, id, center, size, {
      ...safe,
      variant: options.variant === "home" ? "home" : "mirror",
    });
}
