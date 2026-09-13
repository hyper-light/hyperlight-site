import {
  slatesReferenceNotes,
  slatesReferenceVariants,
} from "./slates-reference-notes";
import {
  proofReferenceNotes,
  proofReferenceVariants,
} from "./proof-reference-notes";
import {
  vorpalReferenceNotes,
  vorpalReferenceVariants,
} from "./vorpal-reference-notes";

export type ReferenceNote = {
  title: string;
  explanation: string;
  example?: string;
  animation?: "rename" | "mapping" | "quorum";
};

const notes: Record<string, ReferenceNote> = {
  ...slatesReferenceNotes,
  ...proofReferenceNotes,
  ...vorpalReferenceNotes,
};
const variants: Record<string, ReferenceNote> = {
  ...slatesReferenceVariants,
  ...proofReferenceVariants,
  ...vorpalReferenceVariants,
};

export function referenceNote(id?: string, context?: string) {
  if (!id) return undefined;
  return (context && variants[`${id}:${context}`]) || notes[id];
}

export const referenceNoteIds = Object.keys(notes);
export const referenceVariantIds = Object.keys(variants);
