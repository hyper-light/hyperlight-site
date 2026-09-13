export type ProofTone = "neutral" | "pass" | "fail" | "pending" | "error";

export type ProofPath = {
  id: string;
  d: string;
  kind: "glass" | "edge" | "fine" | "light" | "shade" | "rear";
  opacity: number;
  tone?: ProofTone;
  /** Fixed stroke pattern, such as a disputed geographic boundary. */
  dashArray?: string;
  /** Opt-in solid surfaces; existing wireframe figures retain their materials. */
  material?: "paper" | "circuit" | "metal" | "silicon" | "shadow" | "emissive";
  fillOpacity?: number;
  /** Optional directional surface lighting for opaque dimensional hulls. */
  fillColor?: string;
  strokeOpacity?: number;
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
