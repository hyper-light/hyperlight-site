import assert from "node:assert/strict";
import { test } from "node:test";
import {
  committedPrefix,
  replicaStates,
} from "../components/proof-work/replica-failover-data";
import { replicaFailoverFrame } from "../components/proof-work/replica-failover-geometry";
import type { ProofFrame } from "../components/proof-work/proof-geometry";

function path(frame: ProofFrame, id: string) {
  const found = frame.paths.find((item) => item.id === id);
  assert.ok(found, `${id} remains mounted`);
  return found;
}
function points(d: string) {
  const values = d.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
  return Array.from({ length: values.length / 2 }, (_, index) => [
    values[index * 2],
    values[index * 2 + 1],
  ]);
}
function label(frame: ProofFrame, id: string) {
  const found = frame.labels.find((item) => item.id === id);
  assert.ok(found, `${id} is available to explain the state`);
  return found;
}

test("replica states distinguish quorum authority from retained data", () => {
  assert.deepEqual(committedPrefix, ["01", "02", "03", "04"]);
  assert.deepEqual(
    replicaStates.map(({ label }) => label),
    ["Replicate", "Leader loss", "Failover", "No quorum"],
  );
  assert.deepEqual(
    replicaStates.map(({ reachable, leader, writes }) => [
      reachable,
      leader,
      writes,
    ]),
    [
      [3, "A", "Admitted"],
      [2, null, "Waiting for election"],
      [2, "B", "Admitted"],
      [1, null, "Refused"],
    ],
  );
  assert.equal(replicaStates[2].roles[0], "Fenced");
  for (const portrait of [false, true])
    for (let selection = 0; selection < replicaStates.length; selection++) {
      const frame = replicaFailoverFrame(2, selection, portrait);
      assert.equal(
        label(frame, "quorum-status").text,
        replicaStates[selection].status,
      );
      for (const [index, id] of ["A", "B", "C"].entries()) {
        assert.equal(
          label(frame, `node-${id}-role`).text,
          replicaStates[selection].roles[index],
        );
        assert.equal(label(frame, `node-${id}-region`).text, `REGION ${id}`);
      }
    }
});

test("every voter retains the same committed prefix through isolation and minority refusal", () => {
  for (const portrait of [false, true])
    for (const time of [0, 5, 12, 27, 48]) {
      const baseline = replicaFailoverFrame(time, 0, portrait);
      for (let selection = 0; selection <= 3; selection += 0.25) {
        const current = replicaFailoverFrame(time, selection, portrait);
        for (const id of ["A", "B", "C"])
          for (const entry of committedPrefix) {
            const record = path(current, `node-${id}-entry-${entry}`);
            assert.equal(
              record.d,
              path(baseline, record.id).d,
              "authority changes never reset stored entries",
            );
            assert.equal(
              record.opacity,
              0.5,
              "even isolated replicas retain their committed data",
            );
            assert.equal(record.tone, "pass");
          }
      }
    }
});

test("replication cables remain attached to physical ports throughout breathing", () => {
  for (const portrait of [false, true])
    for (const time of [0, 2, 7, 19, 33, 60])
      for (const selection of [0, 0.5, 1, 1.5, 2, 3]) {
        const frame = replicaFailoverFrame(time, selection, portrait);
        for (const [connection, source, sideA, target, sideB] of [
          ["A-B", "A", "right", "B", portrait ? "right" : "left"],
          ["A-C", "A", portrait ? "right" : "left", "C", "right"],
          ["B-C", "B", "right", "C", portrait ? "right" : "left"],
        ]) {
          const cable = path(frame, "replicate-" + connection);
          assert.equal(
            cable.d,
            path(frame, "replicate-" + connection + "-flow").d,
          );
          const ends = points(cable.d);
          assert.deepEqual(
            ends[0],
            points(path(frame, `node-${source}-port-${sideA}`).d)[0],
          );
          assert.deepEqual(
            ends.at(-1),
            points(path(frame, `node-${target}-port-${sideB}`).d)[0],
          );
        }
      }
});

test("server geometry and fan motion remain continuous without selection pop-in", () => {
  for (const portrait of [false, true]) {
    const baseline = replicaFailoverFrame(0, 0, portrait);
    const topology = baseline.paths.map(({ id, kind, d }) => [
      id,
      kind,
      d.replace(/[^MLCZ]/g, ""),
    ]);
    assert.equal(
      new Set(baseline.paths.map(({ id }) => id)).size,
      baseline.paths.length,
    );
    assert.ok(baseline.paths.length < 500);
    for (let time = 0; time <= 60; time += 2)
      for (const selection of [0, 0.4, 1, 1.7, 2, 2.9, 3]) {
        const frame = replicaFailoverFrame(time, selection, portrait);
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
          baseline.labels.map(({ id }) => id),
        );
        for (const item of frame.paths) {
          assert.ok(item.opacity >= 0 && item.opacity <= 1);
          for (const [x, y] of points(item.d)) {
            assert.ok(
              x >= 20 && x <= (portrait ? 400 : 780),
              `${item.id} x=${x}`,
            );
            assert.ok(
              y >= 70 && y <= (portrait ? 690 : 450),
              `${item.id} y=${y}`,
            );
          }
        }
        const next = replicaFailoverFrame(time + 1 / 60, selection, portrait);
        for (let index = 0; index < frame.paths.length; index++) {
          const a = points(frame.paths[index].d).flat();
          const b = points(next.paths[index].d).flat();
          assert.equal(a.length, b.length);
          assert.ok(
            Math.max(...a.map((value, point) => Math.abs(value - b[point]))) <
              0.35,
            frame.paths[index].id,
          );
        }
      }
    const poses = [0, 2, 4, 6, 8].map((time) =>
      replicaFailoverFrame(time, 0, portrait),
    );
    for (const id of ["A", "B", "C"])
      for (const part of ["lid", "front-face", "fan-0-blade-0"]) {
        const samples = poses.map((pose) =>
          points(path(pose, `node-${id}-${part}`).d).flat(),
        );
        assert.ok(
          Math.max(
            ...samples[0].map((_, index) => {
              const values = samples.map((sample) => sample[index]);
              return Math.max(...values) - Math.min(...values);
            }),
          ) > 3,
          `${id} ${part} physically moves`,
        );
      }
  }
});

test("responsive labels stay outside each hardware assembly with a separate quorum status", () => {
  for (const portrait of [false, true])
    for (const time of [0, 5, 12, 25, 40, 60]) {
      const frame = replicaFailoverFrame(time, 3, portrait);
      for (const id of ["A", "B", "C"]) {
        const vertices = frame.paths
          .filter((item) => item.id.startsWith(`node-${id}-`))
          .flatMap((item) => points(item.d));
        const minX = Math.min(...vertices.map(([x]) => x));
        const minY = Math.min(...vertices.map(([, y]) => y));
        const maxY = Math.max(...vertices.map(([, y]) => y));
        const region = label(frame, `node-${id}-region`);
        const role = label(frame, `node-${id}-role`);
        const prefix = label(frame, `node-${id}-prefix`);
        if (portrait) {
          assert.ok(
            minX - role.x >= 110,
            "reserve space for camera-facing role labels",
          );
          assert.equal(region.anchor, "start");
          assert.equal(prefix.anchor, "start");
        } else {
          assert.ok(minY - role.y > 12, "titles remain above moving lids");
          assert.ok(
            prefix.y - maxY > 12,
            "prefix labels remain below the chassis",
          );
        }
      }
      assert.ok(label(frame, "quorum-status").y > (portrait ? 690 : 450));
    }
});
