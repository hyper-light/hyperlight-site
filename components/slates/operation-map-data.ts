import type { ProofStep } from "../proof-work/proof-figure";
import { runtimePhase } from "./runtime-drawing";

export const operationMapExample = {
  file: "image.conf",
  base: "quality=80\ncache=off\n",
  insertion: "format=webp\n",
  declared: { start: 8, end: 10, bytes: "90" },
  mapped: { start: 20, end: 22, bytes: "90" },
  result: "format=webp\nquality=90\ncache=off\n",
} as const;

export const operationMapSteps: ProofStep[] = [
  {
    label: "Select",
    title: "Agent 2 selects the quality value",
    description:
      "In image.conf, Agent 2 selects 80 and declares a replacement with 90. The saved edit names byte range [8, 10) in this original file. It does not mean “whatever occupies those positions later.”",
  },
  {
    label: "Insert",
    title: "The owner accepts an insertion before Agent 2’s target",
    description:
      "The owner accepts Agent 1’s insertion of format=webp followed by a newline at the start of the file: 12 bytes in total. The quality and cache lines move down. The old range [8, 10) now selects eb in the new line, not 80.",
    transitionDuration: 4,
  },
  {
    label: "Map",
    title: "The owner maps the incoming edit to its current file",
    description:
      "When Agent 2’s edit arrives, the owner maps it against the accepted insertion. Both saved endpoints move forward by 12: [8, 10) becomes [20, 22). The updated selection still covers the original quality value, 80.",
    transitionDuration: 3.6,
  },
  {
    label: "Write",
    title: "Write 90 into the mapped range",
    description:
      "Agent 2’s replacement writes 90 at [20, 22). The file now contains format=webp, quality=90 and cache=off. The new format setting and the unchanged cache setting are preserved.",
    transitionDuration: 3.6,
  },
];

export function operationMapState(selection: number) {
  return {
    opened: runtimePhase(selection, 0.08, 0.34),
    typed: runtimePhase(selection, 0.34, 1),
    mapped: runtimePhase(selection, 1.08, 2),
    written: runtimePhase(selection, 2.14, 2.8),
    oldRangeVisible: runtimePhase(selection, 1.68, 1.92),
  };
}

export function operationMapSnapshot(selection: number) {
  return {
    file: operationMapExample.file,
    base: operationMapExample.base,
    declared: operationMapExample.declared,
    insertion: { at: 0, bytes: operationMapExample.insertion },
    head:
      selection >= 1
        ? operationMapExample.insertion + operationMapExample.base
        : operationMapExample.base,
    mapped: selection >= 2 ? operationMapExample.mapped : null,
    result: selection >= 3 ? operationMapExample.result : null,
  } as const;
}
