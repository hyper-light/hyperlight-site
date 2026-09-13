import type { ProofStep } from "../proof-work/proof-figure";
import { runtimePhase } from "./runtime-drawing";

/** One committed control request is retried after its reply is lost. */
export const recoveryRecord = {
  request: "7:18",
  volume: "V7",
  root: "r42",
  content: "bytes a9",
  result: "V7",
} as const;

export const recoverySteps: ProofStep[] = [
  {
    label: "Running",
    title: "Save the volume and the request's result",
    description:
      "Request 7:18 has created V7. The workspace’s bytes and roots, and the request’s completion, are recoverable from anchor-owned RAM. The reply has not reached the client.",
  },
  {
    label: "Restart",
    title: "The daemon stops; the anchor stays alive",
    description:
      "The daemon’s private execution state disappears. The separate anchor process keeps the shared RAM objects alive, including the workspace image and the completed request.",
  },
  {
    label: "Recover",
    title: "Restore the daemon from shared memory",
    description:
      "The replacement daemon attaches to the anchor’s RAM and rebuilds the workspace and completion records. It restores the existing volume rather than creating an empty one with the same name.",
  },
  {
    label: "Retry",
    title: "The same request returns the same result",
    description:
      "The client reconnects and resends request 7:18. Its completion record returns V7. No second creation runs. This boundary survives a daemon restart while the anchor is alive, not a loss of host power.",
  },
];

export function recoveryState(selection: number) {
  const stopped = runtimePhase(selection, 0.1, 0.9);
  const attached = runtimePhase(selection, 1.08, 1.7);
  const rebuilt = runtimePhase(selection, 1.7, 2);
  const retried = runtimePhase(selection, 2.05, 2.5);
  const returned = runtimePhase(selection, 2.58, 3);
  return {
    stopped,
    attached,
    rebuilt,
    retried,
    returned,
    originalDaemon: 1 - stopped,
    replacementDaemon: attached,
    anchorAlive: true,
    effectCount: 1,
    retained: recoveryRecord,
  };
}
