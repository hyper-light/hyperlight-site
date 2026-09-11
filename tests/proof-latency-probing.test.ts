import assert from "node:assert/strict";
import { test } from "node:test";
import {
  coordinateDistance,
  latencyExamples,
  latencyMeasurements,
  probeEstimate,
  updateLatencyCoordinate,
} from "../components/proof-work/latency-probing-data";
import { latencyProbingFrame } from "../components/proof-work/latency-probing-geometry";
import type { ProofFrame } from "../components/proof-work/proof-geometry";

function near(actual: number, expected: number, tolerance = 1e-9) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${actual} differs from ${expected}`,
  );
}
function path(frame: ProofFrame, id: string) {
  const found = frame.paths.find((item) => item.id === id);
  assert.ok(found, `${id} stays mounted`);
  return found;
}
function points(d: string) {
  const values = d.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
  return Array.from({ length: values.length / 2 }, (_, index) => [
    values[index * 2],
    values[index * 2 + 1],
  ]);
}

test("the estimate uses all eight axes plus height and adjustment", () => {
  const { local, peer } = latencyExamples[0];
  assert.equal(local.vector.length, 8);
  assert.equal(peer.vector.length, 8);
  near(coordinateDistance(local, peer), 20);
  const changedAxis = { ...peer, vector: [...peer.vector.slice(0, 7), 9] };
  near(coordinateDistance(local, changedAxis), Math.sqrt(336) + 4);
  assert.notEqual(
    coordinateDistance(local, changedAxis),
    coordinateDistance(local, peer),
  );
  near(
    coordinateDistance(
      { ...local, adjustment: -0.2 },
      { ...peer, adjustment: 0.5 },
    ),
    20.3,
  );
});

test("an RTT observation performs the actual confidence-weighted coordinate update", () => {
  const { local, peer, observed } = latencyExamples[0];
  const updated = updateLatencyCoordinate(local, peer, observed);
  assert.equal(observed, 24);
  near(updated.vector[0], -0.297);
  near(updated.vector[1], -0.22275);
  near(updated.vector[7], -0.02475);
  near(updated.height, 2.1);
  near(updated.adjustment, 0.2);
  near(updated.error, 0.11);
  assert.equal(updated.samples, 13);
  near(coordinateDistance(updated, peer), 20.696);
  assert.deepEqual(
    local.vector,
    [0, 0, 0, 0, 0, 0, 0, 0],
    "learning does not mutate the source example",
  );
});

test("peer deadlines retain the uncertainty, floor, cap and observer-health order", () => {
  assert.deepEqual(
    latencyMeasurements.map(({ deadline }) => deadline),
    [300, 965, 1200],
  );
  const nearPeer = latencyMeasurements[0];
  near(nearPeer.estimate, 20.696);
  near(nearPeer.margin, 9.52016);
  near(nearPeer.bound, 30.21616);
  assert.equal(nearPeer.health, 1);
  const uncertain = latencyMeasurements[2];
  assert.equal(uncertain.updated.samples, 1);
  assert.equal(uncertain.fallback, true);
  assert.equal(uncertain.estimate, 100);
  assert.equal(uncertain.margin, 100);
  assert.equal(uncertain.bound, 200);
  assert.equal(uncertain.health, 2);
  const local = { ...latencyExamples[0].local, samples: 3 };
  const peer = { ...latencyExamples[0].peer, samples: 3 };
  assert.equal(probeEstimate({ ...local, samples: 2 }, peer, 0).deadline, 600);
  assert.equal(probeEstimate(local, peer, 0).fallback, false);
  const distant = { ...peer, vector: [10_000, 0, 0, 0, 0, 0, 0, 0] };
  assert.equal(
    probeEstimate(local, distant, 8).deadline,
    6_000,
    "the 2s cap is applied before the 3x health multiplier",
  );
});

test("probe, acknowledgement and callout paths remain joined to their moving coordinate markers", () => {
  for (const portrait of [false, true])
    for (const time of [0, 1, 5, 13, 28, 51])
      for (const selection of [0, 0.4, 1, 1.5, 2]) {
        const frame = latencyProbingFrame(time, selection, portrait);
        const observer = points(path(frame, "observer-height").d).at(-1)!;
        for (let index = 0; index < 3; index++) {
          const peer = points(path(frame, `peer-${index}-height`).d).at(-1)!;
          const probe = path(frame, `peer-${index}-probe`);
          const ack = path(frame, `peer-${index}-ack`);
          assert.equal(probe.d, path(frame, `peer-${index}-probe-flow`).d);
          assert.equal(ack.d, path(frame, `peer-${index}-ack-flow`).d);
          assert.deepEqual(points(probe.d)[0], observer);
          assert.deepEqual(points(probe.d).at(-1), peer);
          assert.deepEqual(points(ack.d)[0], peer);
          assert.deepEqual(points(ack.d).at(-1), observer);
          assert.deepEqual(
            points(path(frame, `peer-${index}-callout`).d)[0],
            peer,
          );
        }
      }
});

test("the deadline gate uses a true linear time scale and every shown RTT returns within it", () => {
  for (const portrait of [false, true])
    for (let selection = 0; selection < latencyExamples.length; selection++) {
      const frame = latencyProbingFrame(2, selection, portrait);
      const rail = points(path(frame, "deadline-rail-0").d);
      const window = points(path(frame, "deadline-window").d);
      const gate = points(path(frame, "deadline-gate").d);
      const returned = points(path(frame, "returned-rtt").d)[0];
      const width = rail[1][0] - rail[0][0];
      near(
        (window[1][0] - rail[0][0]) / width,
        latencyMeasurements[selection].deadline / 1500,
        0.00002,
      );
      near(
        (returned[0] - rail[0][0]) / width,
        latencyExamples[selection].observed / 1500,
        0.00002,
      );
      assert.equal(gate[1][0], window[1][0]);
      assert.ok(returned[0] < gate[1][0]);
    }
});

test("the projected coordinate surface breathes with fixed topology and no transition jumps", () => {
  for (const portrait of [false, true]) {
    const initial = latencyProbingFrame(0, 0, portrait);
    const topology = initial.paths.map(({ id, kind, d }) => [
      id,
      kind,
      d.replace(/[^MLCZ]/g, ""),
    ]);
    assert.ok(initial.paths.length < 220);
    assert.equal(
      new Set(initial.paths.map(({ id }) => id)).size,
      initial.paths.length,
    );
    for (const time of [0, 2, 6, 13, 24, 45, 60])
      for (const selection of [0, 0.4999, 0.5, 1, 1.4999, 1.5, 2]) {
        const frame = latencyProbingFrame(time, selection, portrait);
        assert.deepEqual(
          frame.paths.map(({ id, kind, d }) => [
            id,
            kind,
            d.replace(/[^MLCZ]/g, ""),
          ]),
          topology,
        );
        assert.deepEqual(
          frame.labels.map(({ id }) => id),
          initial.labels.map(({ id }) => id),
        );
        const next = latencyProbingFrame(
          time + 1 / 60,
          Math.min(2, selection + 0.0001),
          portrait,
        );
        for (let index = 0; index < frame.paths.length; index++) {
          const shape = frame.paths[index];
          assert.ok(shape.opacity >= 0 && shape.opacity <= 1);
          const vertices = points(shape.d);
          for (const [x, y] of vertices) {
            assert.ok(
              x >= 20 && x <= (portrait ? 400 : 780),
              `${shape.id} x=${x}`,
            );
            assert.ok(
              y >= 85 && y <= (portrait ? 690 : 495),
              `${shape.id} y=${y}`,
            );
          }
          const a = vertices.flat(),
            b = points(next.paths[index].d).flat();
          assert.equal(a.length, b.length);
          assert.ok(
            Math.max(...a.map((value, vertex) => Math.abs(value - b[vertex]))) <
              0.35,
            `${shape.id} jumps at ${time}/${selection}`,
          );
        }
      }
    const poses = [0, 2, 4, 6, 8].map((time) =>
      latencyProbingFrame(time, 0, portrait),
    );
    for (const id of [
      "field-0-row-4",
      "field-0-column-7",
      "peer-1-meridian-2",
    ]) {
      const values = poses.map((frame) => points(path(frame, id).d).flat());
      const excursion = Math.max(
        ...values[0].map(
          (_, point) =>
            Math.max(...values.map((frame) => frame[point])) -
            Math.min(...values.map((frame) => frame[point])),
        ),
      );
      assert.ok(excursion > 3, `${id} has actual geometric motion`);
    }
  }
});
