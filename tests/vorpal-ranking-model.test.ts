import assert from "node:assert/strict";
import { test } from "node:test";
import {
  candidates,
  channels,
  contribution,
  DURATION,
  ordered,
  score,
  STAGES,
  STAGE_STARTS,
  traceAt,
} from "../components/vorpal-ranking-model";

test("the illustrative RRF example preserves zero-based ranks and sums unrounded contributions", () => {
  assert.deepEqual(channels, ["Name", "Vector", "Graph"]);
  assert.deepEqual(candidates, [
    { id: "A", symbol: "parseConfig", ranks: [0, 5, 1] },
    { id: "B", symbol: "readFile", ranks: [null, 0, null] },
    { id: "C", symbol: "loadConfig", ranks: [1, 2, 0] },
  ]);
  assert.equal(contribution(null), 0);
  assert.equal(contribution(0), 0.016666666666666666);
  assert.equal(contribution(5), 0.015384615384615385);
  // Independently combined fractions from the worked example, before display rounding.
  assert.ok(Math.abs(score(candidates[0]) - 11525 / 237900) < 1e-15);
  assert.equal(score(candidates[1]), 1 / 60);
  assert.ok(Math.abs(score(candidates[2]) - 11162 / 226920) < 1e-15);
  assert.deepEqual(
    ordered.map(({ id }) => id),
    ["C", "A", "B"],
  );
  assert.deepEqual(
    ordered.map((candidate) => score(candidate).toFixed(5)),
    ["0.04919", "0.04844", "0.01667"],
  );
  assert.deepEqual(
    candidates.map(({ id }) => id),
    ["A", "B", "C"],
  );
});

test("the finite trace moves through lists, contributions, totals and sorted results at exact boundaries", () => {
  assert.equal(DURATION, 24);
  assert.deepEqual(STAGES, [
    "Ranked lists",
    "Contributions",
    "Totals",
    "Sorted results",
  ]);
  assert.deepEqual(STAGE_STARTS, [0, 4, 16, 20]);
  for (const [seconds, stage] of [
    [0, 0],
    [3.999, 0],
    [4, 1],
    [15.999, 1],
    [16, 2],
    [19.999, 2],
    [20, 3],
    [23.999, 3],
    [24, 3],
  ] as const) {
    const trace = traceAt(seconds);
    assert.equal(trace.stage, stage, `stage at ${seconds}s`);
    assert.equal(trace.finished, seconds === 24);
  }
  assert.deepEqual(traceAt(0), {
    stage: 0,
    activeCell: -1,
    cellPhase: 0,
    completedCells: 0,
    progress: 0,
    finished: false,
  });
  assert.deepEqual(traceAt(24), {
    stage: 3,
    activeCell: -1,
    cellPhase: 0,
    completedCells: 9,
    progress: 1,
    finished: true,
  });
  for (const seconds of [0, 2, 16, 18, 20, 24]) {
    assert.equal(traceAt(seconds).activeCell, -1);
    assert.equal(traceAt(seconds).cellPhase, 0);
    assert.equal(traceAt(seconds).completedCells, seconds < 4 ? 0 : 9);
  }
});

test("all nine contribution cells run in row-major order, including absent nominations", () => {
  const visits = [
    [4, "A", "Name", 0],
    [16 / 3, "A", "Vector", 5],
    [20 / 3, "A", "Graph", 1],
    [8, "B", "Name", null],
    [28 / 3, "B", "Vector", 0],
    [32 / 3, "B", "Graph", null],
    [12, "C", "Name", 1],
    [40 / 3, "C", "Vector", 2],
    [44 / 3, "C", "Graph", 0],
  ] as const;
  visits.forEach(([seconds, id, channel, rank], index) => {
    const start = traceAt(seconds);
    assert.equal(start.stage, 1);
    assert.equal(start.activeCell, index);
    assert.equal(start.completedCells, index);
    assert.equal(start.cellPhase, 0);
    const row = candidates[Math.floor(start.activeCell / 3)];
    const column = start.activeCell % 3;
    assert.equal(row.id, id);
    assert.equal(channels[column], channel);
    assert.equal(row.ranks[column], rank);
    if (rank === null) assert.equal(contribution(row.ranks[column]), 0);

    const middle = traceAt(seconds + 2 / 3);
    assert.equal(middle.activeCell, index);
    assert.equal(middle.completedCells, index);
    assert.ok(Math.abs(middle.cellPhase - 0.5) < 1e-12);
    const ending = traceAt(seconds + 4 / 3 - 1e-7);
    assert.equal(ending.activeCell, index);
    assert.ok(ending.cellPhase > 0.99999 && ending.cellPhase < 1);
  });
  assert.equal(traceAt(16).completedCells, 9);
});

test("the trace clamps invalid or out-of-range time and holds its finished state without looping", () => {
  for (const seconds of [-Infinity, -1, NaN])
    assert.deepEqual(traceAt(seconds), traceAt(0));
  for (const seconds of [24, 25, 48, Infinity])
    assert.deepEqual(traceAt(seconds), traceAt(24));
  let previousProgress = -1;
  let previousCompleted = -1;
  for (let seconds = 0; seconds <= 24; seconds += 0.125) {
    const trace = traceAt(seconds);
    assert.deepEqual(traceAt(seconds), trace);
    assert.ok(trace.progress >= previousProgress && trace.progress <= 1);
    assert.ok(
      trace.completedCells >= previousCompleted && trace.completedCells <= 9,
    );
    assert.ok(
      Number.isFinite(trace.cellPhase) &&
        trace.cellPhase >= 0 &&
        trace.cellPhase <= 1,
    );
    assert.ok(trace.activeCell >= -1 && trace.activeCell <= 8);
    previousProgress = trace.progress;
    previousCompleted = trace.completedCells;
  }
});
