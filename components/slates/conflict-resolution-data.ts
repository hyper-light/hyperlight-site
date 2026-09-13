import type { ProofStep } from "../proof-work/proof-figure";

export type ResolutionAuthor = "agent" | "human";
export type ResolutionRecheck = "unchanged" | "changed";
export const resolutionSources = {
  workflow:
    "https://github.com/hyper-light/slates/blob/3aa6b85c155ba4269614b5e5d3c053e28dd3c787/crates/merge/src/engine.rs",
  verdict:
    "https://github.com/hyper-light/slates/blob/3aa6b85c155ba4269614b5e5d3c053e28dd3c787/crates/merge/src/verdict.rs",
  tests:
    "https://github.com/hyper-light/slates/blob/3aa6b85c155ba4269614b5e5d3c053e28dd3c787/crates/merge/tests/engine.rs",
} as const;

/** Two private edits against r0, followed by a deliberate revision on fresh r1
 * work. This is an illustrative sequence, not an automatic conflict resolver. */
export function conflictResolutionState(
  selection: number,
  author: ResolutionAuthor,
  recheck: ResolutionRecheck,
) {
  const position = Number.isFinite(selection)
    ? Math.max(0, Math.min(7, selection))
    : 0;
  const stage = Math.floor(position);
  const firstAccepted = position >= 1.6;
  const firstNotified = position >= 1.98;
  const conflictReturned = position >= 2.98;
  const freshWork = position >= 4;
  const revised = position >= 5;
  const resubmitted = position >= 5.96;
  const headChanged = recheck === "changed" && position >= 6.3;
  const resolved = position >= 6.7 && !headChanged;
  const refusedAgain = position >= 6.7 && headChanged;
  const finalNotified = position >= 6.98;
  return {
    position,
    stage,
    author,
    firstAccepted,
    firstNotified,
    conflictReturned,
    freshWork,
    revised,
    resubmitted,
    headChanged,
    resolved,
    refusedAgain,
    finalNotified,
    agent1:
      recheck === "changed" && position >= 5.64
        ? "70"
        : stage >= 1
          ? "90"
          : "80",
    agent2: revised ? "85" : freshWork ? "90" : stage >= 1 ? "60" : "80",
    agent2Base: freshWork ? "90" : "80",
    agent2BaseVersion: freshWork ? "r1" : "r0",
    head: headChanged ? "70" : resolved ? "85" : firstAccepted ? "90" : "80",
    headVersion: headChanged || resolved ? "r2" : firstAccepted ? "r1" : "r0",
    conflictBase: "80",
    conflictHead: "90",
    conflictProposal: "60",
  } as const;
}

export function conflictResolutionSteps(
  author: ResolutionAuthor,
  recheck: ResolutionRecheck,
): ProofStep[] {
  return [
    {
      label: "Base",
      title: "Two agents start from the same version",
      description:
        "Agent 1 and Agent 2 run on separate worker nodes. Each has a private volume from r0, where image.conf contains quality=80. Only the volume owner can advance the shared version.",
    },
    {
      label: "Edit",
      title: "Both agents change the same text",
      description:
        "Agent 1 selects 80 and replaces it with 90. Agent 2 independently replaces those same bytes with 60. Both recorded edits still refer to r0; neither private edit changes the shared file.",
      transitionDuration: 3.6,
    },
    {
      label: "Accept 1",
      title: "The owner accepts Agent 1’s submission first",
      description:
        "Agent 1 submits its snapshot and operation record. The owner checks the edit and advances the shared file to r1: quality=90. Agent 2 still has quality=60 based on r0.",
      transitionDuration: 3.2,
    },
    {
      label: "Conflict",
      title: "Agent 2 receives the conflicting text",
      description:
        "Agent 2 submits its stale edit. The owner compares the original 80, accepted 90 and proposed 60 at the same range. It returns those conflicting windows to Agent 2 and leaves r1 unchanged.",
      transitionDuration: 3.8,
    },
    {
      label: "Read head",
      title: "Agent 2 starts fresh work from the accepted version",
      description:
        "Agent 2 inspects the conflict and reads r1. In this example it discards the stale working copy and creates fresh work from that accepted version. The new copy contains 90 and its base is r1. Rebasing an unresolved overlapping edit would still conflict.",
      transitionDuration: 3.4,
    },
    {
      label: "Revise",
      title:
        author === "agent"
          ? "Agent 2 revises the edit and runs checks"
          : "A human reviews Agent 2’s revised edit",
      description:
        author === "agent"
          ? "After reviewing both changes, Agent 2 deliberately chooses 85, edits the fresh working copy and runs the relevant checks. The value is an example decision—not an average calculated by Slates. The new operation replaces 90 with 85 against r1."
          : "A human reviews the competing changes and chooses 85 for Agent 2’s fresh working copy. The edit and its checks use r1 as the base. This review does not bypass the owner’s conflict check or approve a write to disk.",
      transitionDuration: 3.6,
    },
    {
      label: "Resubmit",
      title: "Agent 2 submits the revised operation against r1",
      description:
        "Agent 2 sends its revised snapshot and operation record to the same owner. The submission now replaces r1’s 90 with 85. Sending it does not itself advance the shared version.",
      transitionDuration: 3.2,
    },
    {
      label: recheck === "changed" ? "Conflict again" : "Accept 2",
      title:
        recheck === "changed"
          ? "Agent 1’s next edit causes another conflict"
          : "The owner accepts the revised edit into r2",
      description:
        recheck === "changed"
          ? "Agent 1 starts fresh work from r1, changes 90 to 70 and submits it while Agent 2’s revised submission is pending. The owner accepts 70 into r2. Agent 2’s r1-based 85 conflicts again. The owner keeps 70 and returns the new difference; retries cannot force an overwrite."
          : "The owner checks the revised operation against the current r1, accepts 85 into r2 and replies to Agent 2. This changes the shared Slates version, not the source directory. Human approval for writing a snapshot to disk is a separate, later operation.",
      transitionDuration: 3.8,
    },
  ];
}
