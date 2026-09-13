import type { ProofStep } from "../proof-work/proof-figure";

export const landingSource =
  "https://github.com/hyper-light/slates/blob/3aa6b85c155ba4269614b5e5d3c053e28dd3c787/docs/wip/SLATES_DESIGN.md#L2349-L2448";
export type LandingExample = "clean" | "drift";
/** Two illustrative ASCII bytes from the entry, not a whole-file fingerprint. */
export const landingByteExample = {
  base: "80",
  proposed: "90",
  drift: "60",
} as const;
export function landingState(selection: number, example: LandingExample) {
  const position = Math.max(
    0,
    Math.min(3, Number.isFinite(selection) ? selection : 0),
  );
  const stage = Math.floor(position);
  const conflict = example === "drift" && stage >= 2;
  const checkedDisk =
    example === "drift" ? landingByteExample.drift : landingByteExample.base;
  return {
    position,
    stage,
    granted: stage >= 1,
    conflict,
    checked: stage >= 2,
    checkedDisk,
    baseBytes: landingByteExample.base,
    proposedBytes: landingByteExample.proposed,
    canWrite: stage >= 2 && !conflict,
    written: stage >= 3 && !conflict,
    disk: stage >= 3 && !conflict ? landingByteExample.proposed : checkedDisk,
    verdict: stage < 2 ? "Not checked" : conflict ? "Conflict" : "Apply",
  };
}
export const landingSteps = (example: LandingExample): ProofStep[] => [
  {
    label: "Plan",
    title: "Identify the exact proposed changes",
    description:
      "The proposed file change becomes manifest M7, tied to snapshot S7 and this target directory. The illustrated range replaces ASCII 80 with 90. The agent has not received permission to apply it. Changing the plan changes its identity.",
    facts: [
      { label: "Manifest / snapshot", value: "M7 / S7" },
      { label: "Grant", value: "Required", tone: "pending" },
      { label: "Disk writes", value: "0" },
    ],
  },
  {
    label: "Grant",
    title: "Approve the listed changes",
    description:
      "A human approves M7 through a separate confirmation interface. The agent can prepare this list, but cannot approve its own disk writes. Approval does not skip the file check.",
    facts: [
      { label: "Approved plan", value: "M7", tone: "pass" },
      { label: "Target check", value: "Pending" },
      { label: "Disk writes", value: "0" },
    ],
  },
  {
    label: "Check",
    title: "Check whether the file changed on disk",
    description:
      example === "drift"
        ? "The comparison reads the witnessed base, 80, and the disk's current bytes, 60. The first byte differs: hexadecimal 38 versus 36. The proposal is 90, not 60, so the outside edit is a conflict even though M7 was approved. The write gate stays closed."
        : "The comparison reads the witnessed base and the disk's current bytes: both contain 80, hexadecimal 38 30. Each byte matches. The distinct proposal, 90, may now be applied under M7. No NAND is written during this check; the entry is checked again when replaced.",
    facts: [
      { label: "Base", value: "80 · 38 30 hex" },
      {
        label: "Disk now",
        value: example === "drift" ? "60 · 36 30 hex" : "80 · 38 30 hex",
      },
      {
        label: "Verdict",
        value: example === "drift" ? "Conflict" : "Apply",
        tone: example === "drift" ? "fail" : "pass",
      },
    ],
  },
  {
    label: "Land",
    title:
      example === "drift"
        ? "Preserve the outside edit"
        : "Write the approved change to disk",
    description:
      example === "drift"
        ? "The conflicting landing is refused. The agent or human must resolve the difference and present a new manifest for approval; the previous grant is not permission to overwrite an unrelated change."
        : "The approved bytes pass through the storage controller into NAND, then the single illustrated file is synchronized. The audit records the outcome against M7. A multi-file landing can report partial success if an outside writer prevents a later file from being replaced.",
    facts: [
      {
        label: "Result",
        value: example === "drift" ? "Refused" : "Written and synced",
        tone: example === "drift" ? "fail" : "pass",
      },
      { label: "Disk now", value: example === "drift" ? "60" : "90" },
      { label: "Entry writes", value: example === "drift" ? "0" : "1" },
    ],
  },
];
