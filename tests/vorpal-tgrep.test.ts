import assert from "node:assert/strict";
import { test } from "node:test";
import {
  tgrepMetrics,
  tgrepSamples,
  tgrepWidth,
} from "../components/vorpal-tgrep-data";

test("tgrep comparisons preserve all eighteen published values and their original units", () => {
  assert.deepEqual(
    tgrepSamples.map((sample) => sample.name),
    ["Linux kernel", "CPython", "Vorpal"],
  );
  assert.deepEqual(
    tgrepSamples.flatMap((sample) => [
      sample.vorpal.labels,
      sample.tgrep.labels,
    ]),
    [
      ["8.1 s", "6.1 GB", "4.8 GB"],
      ["8.2 s", "0.31 GB", "1.0 GB"],
      ["0.9 s", "0.7 GB", "160 MB"],
      ["0.54 s", "0.14 GB", "74 MB"],
      ["6.9 s", "11.6 GB", "860 MB"],
      ["0.69 s", "0.26 GB", "28 MB"],
    ],
  );
  assert.deepEqual(
    tgrepSamples.flatMap((sample) => [
      sample.vorpal.values,
      sample.tgrep.values,
    ]),
    [
      [8.1, 6100, 4800],
      [8.2, 310, 1000],
      [0.9, 700, 160],
      [0.54, 140, 74],
      [6.9, 11600, 860],
      [0.69, 260, 28],
    ],
  );
});

test("all repository pairs share fixed zero-based metric scales", () => {
  assert.deepEqual(
    tgrepMetrics.map(({ id, maximum }) => [id, maximum]),
    [
      ["build", 10],
      ["ram", 12000],
      ["disk", 5000],
    ],
  );
  for (const [index, metric] of tgrepMetrics.entries()) {
    assert.equal(tgrepWidth(0, metric.id), 0);
    assert.equal(tgrepWidth(metric.maximum, metric.id), 560);
    assert.equal(tgrepWidth(metric.maximum / 2, metric.id), 280);
    for (const sample of tgrepSamples)
      for (const tool of ["vorpal", "tgrep"] as const)
        assert.ok(sample[tool].values[index] <= metric.maximum);
  }
});

test("small text indexes and decimal build times are not visually exaggerated", () => {
  assert.equal(tgrepWidth(28, "disk"), 3.136);
  assert.equal(tgrepWidth(74, "disk"), 8.288);
  assert.equal(tgrepWidth(310, "ram"), 14.4667);
  assert.equal(tgrepWidth(0.54, "build"), 30.24);
  assert.equal(tgrepWidth(8.1, "build"), 453.6);
});
