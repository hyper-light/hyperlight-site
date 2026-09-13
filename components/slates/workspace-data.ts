import type { ProofStep } from "../proof-work/proof-figure";

export const workspaceSteps: ProofStep[] = [
  {
    label: "Snapshot",
    title: "Save a snapshot of the source files",
    description:
      "A snapshot names a stable tree and its sealed content. A read-only host base remains beneath the overlay; work does not write through to it.",
  },
  {
    label: "Clone",
    title: "Create two work volumes from the snapshot",
    description:
      "Agent 1 and Agent 2 receive independent work volumes. Their extent mappings refer to the same five memory allocations. Cloning changes references, not the amount of file content stored in memory.",
  },
  {
    label: "Edit",
    title: "Copy the content Agent 1 changes",
    description:
      "Agent 1 writes into C. Copy-on-write allocates a5 for its changed content, C′, and updates only its extent mapping. The source snapshot and Agent 2 still refer to C in a2. Occupied allocations increase from five to six.",
    transitionDuration: 3.8,
  },
  {
    label: "Seal",
    title: "Seal Agent 1’s changed content",
    description:
      "Sealing turns the changed content into immutable, content-addressed chunks. Agent 1’s new snapshot still shares the untouched extents with the source.",
  },
];

/** Illustrative extent identities, not file bytes or promises about chunk size. */
export function workspaceSnapshot(selection: number) {
  const stage = Math.max(0, Math.min(3, Math.floor(selection)));
  const source = ["A", "B", "C", "D", "E"];
  return {
    source,
    alice:
      stage >= 1
        ? source.map((id) => (id === "C" && stage >= 2 ? "C′" : id))
        : null,
    bob: stage >= 1 ? [...source] : null,
    privateExtents: stage >= 2 ? 1 : 0,
    changedContent: stage < 2 ? "absent" : stage < 3 ? "mutable" : "sealed",
    hostWritable: false,
  } as const;
}
