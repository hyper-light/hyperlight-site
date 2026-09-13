import assert from "node:assert/strict";
import { test } from "node:test";
import type {
  ProofLabel,
  ProofPath,
} from "../components/proof-work/proof-geometry";
import {
  orbitalFleetFrames,
  orbitalFleetLayout,
} from "../components/slates/orbital-fleet-geometry";
import {
  orbitalScenarios,
  orbitalScenarioSteps,
} from "../components/slates/orbital-fleet-scenarios";

type Point = readonly [number, number];
type Bounds = readonly [number, number, number, number];
type Shape = { id: string; polygon: Point[]; bounds: Bounds };
const failures = orbitalScenarios.filter(({ value }) => value !== "success");
const numbers = (text: string) =>
  Array.from(text.matchAll(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi), ([n]) =>
    Number(n),
  );
const bounds = (p: Point[]): Bounds => [
  Math.min(...p.map(([x]) => x)),
  Math.min(...p.map(([, y]) => y)),
  Math.max(...p.map(([x]) => x)),
  Math.max(...p.map(([, y]) => y)),
];
const cross = (a: Point, b: Point, c: Point) =>
  (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
function contains(polygon: Point[], point: Point) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [x, y] = polygon[i],
      [px, py] = polygon[j];
    if (
      y > point[1] !== py > point[1] &&
      point[0] < ((px - x) * (point[1] - y)) / (py - y) + x
    )
      inside = !inside;
  }
  return inside;
}
function overlaps(a: Shape, b: Shape) {
  if (!(
    a.bounds[0] < b.bounds[2] &&
    b.bounds[0] < a.bounds[2] &&
    a.bounds[1] < b.bounds[3] &&
    b.bounds[1] < a.bounds[3]
  ))
    return false;
  if (
    a.polygon.some((p) => contains(b.polygon, p)) ||
    b.polygon.some((p) => contains(a.polygon, p))
  )
    return true;
  return a.polygon.some((p, i) =>
    b.polygon.some((q, j) => {
      const n = a.polygon[(i + 1) % a.polygon.length],
        r = b.polygon[(j + 1) % b.polygon.length];
      return (
        cross(p, n, q) * cross(p, n, r) < 0 &&
        cross(q, r, p) * cross(q, r, n) < 0
      );
    }),
  );
}
function shape(path: ProofPath): Shape {
  assert.doesNotMatch(
    path.d,
    /[ACHQSTV]/i,
    "scenario packets retain polygonal faces",
  );
  const values = numbers(path.d);
  const polygon = Array.from({ length: values.length / 2 }, (_, i): Point => [
    values[i * 2],
    values[i * 2 + 1],
  ]);
  return { id: path.id, polygon, bounds: bounds(polygon) };
}
function caption(label: ProofLabel, portrait: boolean): Shape {
  // Exactly the same estimate and 1px safety margin as the success-flight gate.
  const font =
      (label.kind === "heading" ? 9 : label.kind === "small" ? 10 : 11) +
      (portrait ? 2 : 0),
    width = label.text.length * font * 0.62;
  const x =
    label.x -
    (label.anchor === "middle"
      ? width / 2
      : label.anchor === "end"
        ? width
        : 0);
  const [a, b, c, d, e, f] = label.transform
    ? numbers(label.transform)
    : [1, 0, 0, 1, 0, 0];
  const polygon = [
    [x - 1, label.y - font - 1],
    [x + width + 1, label.y - font - 1],
    [x + width + 1, label.y + 4],
    [x - 1, label.y + 4],
  ].map(([u, v]): Point => [a * u + c * v + e, b * u + d * v + f]);
  return { id: label.id, polygon, bounds: bounds(polygon) };
}
type Hit = { first: number; last: number; detail: string };
function remember(
  hits: Map<string, Hit>,
  key: string,
  at: number,
  detail: string,
) {
  const hit = hits.get(key);
  if (hit) hit.last = at;
  else hits.set(key, { first: at, last: at, detail });
}
const report = (hits: Map<string, Hit>) =>
  [...hits]
    .map(
      ([key, h]) =>
        `${key} ${h.first.toFixed(2)}–${h.last.toFixed(2)}: ${h.detail}`,
    )
    .join("\n");

test("all failure chapters keep finite, bounded stable geometry across fractional lifecycle positions", () => {
  const hits = new Map<string, Hit>();
  for (const { value } of failures)
    for (const portrait of [false, true]) {
      const frame = orbitalFleetFrames[value],
        initial = frame(0, 0, portrait),
        { width, height } = orbitalFleetLayout(portrait);
      const ids = initial.paths.map((p) => p.id),
        commands = initial.paths.map((p) => p.d.replace(/[^MLZ]/g, "")),
        labels = initial.labels.map((l) => l.id);
      assert.equal(new Set(ids).size, ids.length, value);
      assert.ok(
        ids.length > 1500 && ids.length < 2700,
        `${value}: ${ids.length} paths`,
      );
      const last = orbitalScenarioSteps(value).length - 1;
      for (let sample = 0; sample <= last * 25; sample++) {
        const at = sample / 25,
          d = frame(1.37, at, portrait);
        assert.deepEqual(
          d.paths.map((p) => p.id),
          ids,
          `${value}/${portrait}/${at}`,
        );
        assert.deepEqual(
          d.paths.map((p) => p.d.replace(/[^MLZ]/g, "")),
          commands,
          `${value}/${portrait}/${at}`,
        );
        assert.deepEqual(
          d.labels.map((l) => l.id),
          labels,
          `${value}/${portrait}/${at}`,
        );
        for (const p of d.paths) {
          assert.doesNotMatch(p.d, /NaN|Infinity/, p.id);
          assert.ok(
            Number.isFinite(p.opacity) && p.opacity >= 0 && p.opacity <= 1,
            p.id,
          );
          if (p.opacity <= 0.1) continue;
          const coordinates = numbers(p.d);
          for (let i = 0; i < coordinates.length; i += 2) {
            const x = coordinates[i],
              y = coordinates[i + 1];
            if (x < 4 || x > width - 4 || y < 4 || y > height - 4)
              remember(
                hits,
                `${value}/${portrait}/${p.id.replace(/-\d+/g, "")}`,
                at,
                `out of canvas at ${x},${y}`,
              );
          }
        }
        for (const l of d.labels) {
          assert.ok(Number.isFinite(l.x) && Number.isFinite(l.y));
          assert.doesNotMatch(l.transform ?? "", /NaN|Infinity/);
        }
      }
    }
  assert.equal(hits.size, 0, report(hits));
});

test("all failure packets and parked craft clear readable captions, including changing failure statuses", () => {
  const hits = new Map<string, Hit>();
  for (const { value } of failures)
    for (const portrait of [false, true]) {
      const last = orbitalScenarioSteps(value).length - 1;
      for (let sample = 0; sample <= last * 100; sample++) {
        const at = sample / 100,
          d = orbitalFleetFrames[value](0, at, portrait);
        const labels = d.labels
          .filter((l) => l.text && (l.opacity ?? 1) > 0.05)
          .map((l) => caption(l, portrait));
        const moving = d.paths
          .filter(
            (p) =>
              p.opacity > 0.05 &&
              p.d.trimEnd().endsWith("Z") &&
              ((/^(scenario-|agent-\d+-|home-content-|mirror-content-)/.test(
                p.id,
              ) &&
                /-(body|side)$/.test(p.id)) ||
                (p.id.startsWith("vfs-craft-") && !p.id.includes("-exhaust-"))),
          )
          .map(shape);
        for (const p of moving)
          for (const l of labels)
            if (overlaps(p, l))
              remember(
                hits,
                `${value}/${portrait}/${p.id.replace(/-(body|side)$/, " ").replace(/-\d+/g, "")}/${l.id}`,
                at,
                p.id,
              );
      }
    }
  assert.equal(hits.size, 0, report(hits));
});

test("failure captions retain separate gutters and their text fits the viewport", () => {
  const hits = new Map<string, Hit>();
  for (const { value } of failures)
    for (const portrait of [false, true]) {
      const { width, height } = orbitalFleetLayout(portrait),
        last = orbitalScenarioSteps(value).length - 1;
      for (let sample = 0; sample <= last * 10; sample++) {
        const at = sample / 10,
          d = orbitalFleetFrames[value](0, at, portrait),
          labels = d.labels
            .filter((l) => l.text && (l.opacity ?? 1) > 0.05)
            .map((l) => caption(l, portrait));
        labels.forEach((l, i) => {
          if (
            l.bounds[0] < 4 ||
            l.bounds[2] > width - 4 ||
            l.bounds[1] < 4 ||
            l.bounds[3] > height - 4
          )
            remember(
              hits,
              `${value}/${portrait}/${l.id}`,
              at,
              `caption bounds ${l.bounds.join(",")}`,
            );
          for (const other of labels.slice(i + 1))
            if (overlaps(l, other))
              remember(
                hits,
                `${value}/${portrait}/${l.id}/${other.id}`,
                at,
                "caption collision",
              );
        });
      }
    }
  assert.equal(hits.size, 0, report(hits));
});
