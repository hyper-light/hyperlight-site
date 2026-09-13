import { easeLifecycle } from "../proof-work/lifecycle-drawing";
import type { OrbitalScenario } from "./orbital-fleet-scenarios";

/** Local compute activity explains editing and inspecting without advancing
 * the protocol clock or pretending that a private edit has been accepted. */
export function orbitalWorkerActivity(
  scenario: OrbitalScenario,
  position: number,
  worker: number,
): number | undefined {
  if (scenario !== "conflict") return undefined;
  if (worker === 2) return 0.12;
  const phase = (start: number, end: number) =>
    easeLifecycle((position - start) / (end - start));
  const edit = phase(0.05, 0.8) - phase(1.05, 1.8);
  const inspect = worker === 1 ? phase(3.05, 3.9) - phase(4.1, 4.9) : 0;
  const revise = worker === 1 ? phase(4.05, 4.9) - phase(5.1, 5.9) : 0;
  return Math.min(1, 0.15 + edit * 0.8 + inspect * 0.35 + revise * 0.8);
}

export function orbitalHomeActivity(
  scenario: OrbitalScenario,
  position: number,
): number | undefined {
  if (scenario !== "owner-loss") return undefined;
  // The council grant powers the replacement's recovery machinery. This is
  // deliberately not the permission-to-serve flag, which is checked later.
  return 0.18 + 0.55 * easeLifecycle((position - 1.08) / 0.88);
}
