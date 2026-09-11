export type ProofTone = "neutral" | "pass" | "fail" | "pending" | "error";

export type ProofPath = {
  id: string;
  d: string;
  kind: "glass" | "edge" | "fine" | "light" | "shade" | "rear";
  opacity: number;
  tone?: ProofTone;
};

export type ProofLabel = {
  id: string;
  text: string;
  x: number;
  y: number;
  anchor?: "start" | "middle" | "end";
  kind?: "heading" | "name" | "label" | "small" | "status";
  tone?: ProofTone;
  opacity?: number;
  surface?: string;
  /** Surface lettering follows the same projected plane as the record beneath it. */
  transform?: string;
};

export type ProofFrame = { paths: ProofPath[]; labels: ProofLabel[] };

/** Selection eases between tab indices; geometry retains the same IDs and topology. */
export type ProofFrameFunction = (
  time: number,
  selection: number,
  portrait: boolean,
) => ProofFrame;
