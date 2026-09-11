import assert from "node:assert/strict";
import { test } from "node:test";
import {
  agentSamples,
  retrievalSamples,
  comparisonMaximum,
  comparisonValue,
  comparisonWidth,
} from "../components/vorpal-comparison-data";

test("agent comparisons retain all twelve published rows in Time/Tokens/Cost/Turns order", () => {
  assert.equal(agentSamples.length, 4);
  assert.deepEqual(
    agentSamples.flatMap((sample) => sample.rows.map((row) => row.values)),
    [
      [9.4, 73000, 0.081, 5],
      [5.9, 63000, 0.054, 3],
      [5.3, 43000, 0.028, 2],
      [11.8, 77000, 0.136, 4],
      [7.0, 64000, 0.045, 3],
      [7.9, 44000, 0.04, 2],
      [16.6, 104000, 0.2, 5],
      [6.9, 51000, 0.042, 3],
      [6.1, 36000, 0.029, 2],
      [8.2, 59000, 0.053, 3],
      [5.7, 51000, 0.046, 3],
      [5.8, 36000, 0.026, 2],
    ],
  );
  for (const sample of agentSamples)
    assert.deepEqual(
      sample.rows.map((row) => row.name),
      ["Grep + Read", "Vorpal MCP", "Vorpal CLI"],
    );
  assert.deepEqual(
    [0, 1, 2, 3].map((metric) => comparisonMaximum("agents", metric)),
    [16.6, 104000, 0.2, 5],
  );
});

test("retrieval comparisons retain all nine published rows and always use a zero-to-one scale", () => {
  assert.deepEqual(
    retrievalSamples.map((sample) => sample.name),
    ["Linux kernel", "CPython", "Vorpal"],
  );
  assert.deepEqual(
    retrievalSamples.flatMap((sample) => sample.rows.map((row) => row.values)),
    [
      [0.329, 0.327, 0.358],
      [0.315, 0.304, 0.361],
      [0.295, 0.29, 0.302],
      [0.306, 0.291, 0.333],
      [0.341, 0.322, 0.389],
      [0.351, 0.331, 0.426],
      [0.402, 0.395, 0.445],
      [0.43, 0.427, 0.455],
      [0.455, 0.448, 0.5],
    ],
  );
  assert.deepEqual(
    [0, 1, 2].map((metric) => comparisonMaximum("retrieval", metric)),
    [1, 1, 1],
  );
});

test("bar lengths are linear and displayed values preserve published precision", () => {
  assert.equal(comparisonWidth(0, 1), 0);
  assert.equal(comparisonWidth(0.5, 1), 300);
  assert.equal(comparisonWidth(0.329, 1), 197.4);
  assert.equal(comparisonWidth(0.2, 0.2), 600);
  assert.equal(comparisonWidth(2, 5), 240);
  assert.equal(comparisonValue("agents", 0, 7), "7.0 s");
  assert.equal(comparisonValue("agents", 1, 104000), "104 K");
  assert.equal(comparisonValue("agents", 2, 0.04), "$0.040");
  assert.equal(comparisonValue("agents", 3, 2), "2");
  assert.equal(comparisonValue("retrieval", 0, 0.29), "0.290");
});
