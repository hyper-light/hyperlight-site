import type { ProofStep } from "../proof-work/proof-figure";

export type MergeScenario = "disjoint" | "identical" | "conflict";
export const mergeScenarios: { id: MergeScenario; label: string }[] = [
  { id: "disjoint", label: "Different settings" },
  { id: "identical", label: "Same change" },
  { id: "conflict", label: "Conflicting values" },
];
export const mergeBase = "quality=80\ncache=off\n";
export const aliceEdit = { start: 8, end: 10, bytes: "90" } as const;
export const bobEdits = {
  disjoint: { start: 17, end: 20, bytes: "on" },
  identical: { start: 8, end: 10, bytes: "90" },
  conflict: { start: 8, end: 10, bytes: "60" },
} as const;

export function applyIllustrativeOverwrite(
  base: string,
  edit: { start: number; end: number; bytes: string },
) {
  return base.slice(0, edit.start) + edit.bytes + base.slice(edit.end);
}

/** A small ASCII settings example, not a general merge engine. Agent 1's
 * equal-length replacement leaves Agent 2's later base coordinates unchanged. */
export function mergeSnapshot(scenario: MergeScenario, selection: number) {
  const position = Number.isFinite(selection)
    ? Math.min(5, Math.max(0, selection))
    : 0;
  const alice = applyIllustrativeOverwrite(mergeBase, aliceEdit);
  const bobEdit = bobEdits[scenario];
  const bob = applyIllustrativeOverwrite(mergeBase, bobEdit);
  const decided = position >= 4.6;
  return {
    position,
    forked: position >= 1,
    aliceReady: position >= 2,
    bobReady: position >= 3,
    aliceAccepted: position >= 3.45,
    bobReceived: position >= 4,
    replyReceived: position >= 5,
    base: mergeBase,
    alice,
    bob,
    head:
      position < 3.45
        ? mergeBase
        : decided && scenario === "disjoint"
          ? applyIllustrativeOverwrite(alice, bobEdit)
          : alice,
    verdict: !decided
      ? "pending"
      : scenario === "conflict"
        ? "refused"
        : scenario === "identical"
          ? "accepted-no-op"
          : "accepted",
    conflict:
      decided && scenario === "conflict"
        ? { start: 8, end: 10, current: "90", proposed: "60" }
        : null,
  } as const;
}

export function mergeSteps(scenario: MergeScenario): ProofStep[] {
  const edit = bobEdits[scenario];
  return [
    {
      label: "Base",
      title: "The volume owner holds the accepted file and its immutable base",
      description:
        "The base snapshot of image.conf contains quality=80 and cache=off, each followed by a newline. The volume owner is the only node that advances the canonical head.",
    },
    {
      label: "Fork",
      title: "Two worker nodes start from the same snapshot",
      description:
        "Agent 1 and Agent 2 receive independent working copies rooted at the same immutable base. Neither worker can replace the volume owner’s accepted head by changing its local copy.",
    },
    {
      label: "Agent 1",
      title: "Agent 1 edits the quality setting on worker A",
      description:
        "Worker A selects 80 at bytes [8, 10), deletes it, and writes 90. Its file now contains quality=90; its operation journal records the replacement. The owner’s head has not changed.",
      transitionDuration: 3.4,
    },
    {
      label: "Agent 2",
      title: "Agent 2 edits its own copy on worker B",
      description:
        scenario === "disjoint"
          ? "Agent 2 selects off at bytes [17, 20), deletes it, and types on. Its copy becomes quality=80 and cache=on; it does not contain Agent 1’s change."
          : `Agent 2 selects 80 at bytes [${edit.start}, ${edit.end}), deletes it, and types ${edit.bytes}. Its snapshot carries those bytes; the recorded operation identifies their original range.`,
      transitionDuration: 3.4,
    },
    {
      label: "Submit",
      title: "The owner receives snapshots and their recorded operations",
      description:
        "The workers submit changed snapshot bytes and operation journals. The owner accepts Agent 1’s replacement first, advancing quality from 80 to 90. Agent 2’s submission still names the original base and waits for its own comparison.",
      transitionDuration: 4.2,
    },
    {
      label: "Verdict",
      title:
        scenario === "disjoint"
          ? "The owner combines the edits and replies to worker B"
          : scenario === "identical"
            ? "The owner accepts the same replacement without applying it twice"
            : "The owner refuses Agent 2’s conflicting replacement and replies",
      description:
        scenario === "disjoint"
          ? "The ranges do not overlap. The owner writes quality=90 and cache=on to the accepted head, then returns acceptance. Agent 1’s equal-length edit leaves Agent 2’s later offset unchanged. Compatible bytes do not establish that the settings are correct."
          : scenario === "identical"
            ? "Both workers replace [8, 10) with 90. The owner accepts Agent 2’s operation without a second effect, then replies. The head remains quality=90 and cache=off."
            : "At [8, 10), the head contains 90 and Agent 2 proposes 60. The owner keeps Agent 1’s accepted value and returns the conflict. Agent 2’s local copy may still contain 60; it never becomes the canonical head.",
      transitionDuration: 4.2,
    },
  ];
}
