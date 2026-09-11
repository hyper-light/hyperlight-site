export const channels = ["Name", "Vector", "Graph"] as const;

export type CandidateId = "A" | "B" | "C";
export type Candidate = {
  readonly id: CandidateId;
  readonly symbol: string;
  readonly ranks: readonly [number | null, number | null, number | null];
};

/** Illustrative symbols and ranks, not results measured from a real repository. */
export const candidates = [
  { id: "A", symbol: "parseConfig", ranks: [0, 5, 1] },
  { id: "B", symbol: "readFile", ranks: [null, 0, null] },
  { id: "C", symbol: "loadConfig", ranks: [1, 2, 0] },
] as const satisfies readonly Candidate[];

/** Ranks start at zero; a missing nomination contributes exactly zero. */
export function contribution(rank: number | null) {
  return rank === null ? 0 : 1 / (60 + rank);
}

export function score(candidate: Candidate) {
  return candidate.ranks.reduce<number>(
    (sum, rank) => sum + contribution(rank),
    0,
  );
}

export const ordered: readonly Candidate[] = [...candidates].sort(
  (a, b) => score(b) - score(a),
);

export const STAGES = [
  "Ranked lists",
  "Contributions",
  "Totals",
  "Sorted results",
] as const;
export const DURATION = 24;
export const STAGE_STARTS = [0, 4, 16, 20] as const;

export type RankingTrace = {
  stage: 0 | 1 | 2 | 3;
  activeCell: number;
  cellPhase: number;
  completedCells: number;
  progress: number;
  finished: boolean;
};

/** One finite explanation. Cells run candidate-major: A, B, C × Name, Vector, Graph.
 * Each cell's phase lets the view reveal rank → formula → value, including missing ranks.
 */
export function traceAt(seconds: number): RankingTrace {
  const time = Math.max(
    0,
    Math.min(DURATION, Number.isNaN(seconds) ? 0 : seconds),
  );
  const stage =
    time < STAGE_STARTS[1]
      ? 0
      : time < STAGE_STARTS[2]
        ? 1
        : time < STAGE_STARTS[3]
          ? 2
          : 3;
  let activeCell = -1;
  let cellPhase = 0;
  if (stage === 1) {
    const position =
      ((time - STAGE_STARTS[1]) * 9) / (STAGE_STARTS[2] - STAGE_STARTS[1]);
    // Four-thirds-second cell boundaries must not slip into the preceding cell
    // solely because their floating-point representation is a few ulps short.
    const nearest = Math.round(position);
    const cell =
      Math.abs(position - nearest) < Number.EPSILON * 16 ? nearest : position;
    activeCell = Math.min(8, Math.floor(cell));
    cellPhase = Math.max(0, Math.min(1, cell - activeCell));
  }
  return {
    stage,
    activeCell,
    cellPhase,
    completedCells: stage === 0 ? 0 : stage === 1 ? activeCell : 9,
    progress: time / DURATION,
    finished: time === DURATION,
  };
}
