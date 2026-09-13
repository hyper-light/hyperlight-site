import assert from "node:assert/strict";
import { test } from "node:test";
import type {
  ProofFrame,
  ProofLabel,
  ProofPath,
} from "../components/proof-work/proof-geometry";
import { orbitalFleetState } from "../components/slates/orbital-fleet-data";
import { orbitalFleetFrame } from "../components/slates/orbital-fleet-geometry";

type Point = readonly [number, number];
type Bounds = readonly [number, number, number, number];
type Shape = { id: string; polygon: Point[]; bounds: Bounds };

const coordinates = (text: string) =>
  Array.from(text.matchAll(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi), ([n]) =>
    Number(n),
  );
const bounds = (points: Point[]): Bounds => [
  Math.min(...points.map(([x]) => x)),
  Math.min(...points.map(([, y]) => y)),
  Math.max(...points.map(([x]) => x)),
  Math.max(...points.map(([, y]) => y)),
];
const boxesOverlap = (a: Bounds, b: Bounds) =>
  a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
const cross = (a: Point, b: Point, c: Point) =>
  (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
const edgesCross = (a: Point, b: Point, c: Point, d: Point) =>
  cross(a, b, c) * cross(a, b, d) < 0 && cross(c, d, a) * cross(c, d, b) < 0;

function contains(polygon: Point[], point: Point) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [x, y] = polygon[i],
      [previousX, previousY] = polygon[j];
    if (
      y > point[1] !== previousY > point[1] &&
      point[0] < ((previousX - x) * (point[1] - y)) / (previousY - y) + x
    )
      inside = !inside;
  }
  return inside;
}

function shapesOverlap(a: Shape, b: Shape) {
  if (!boxesOverlap(a.bounds, b.bounds)) return false;
  if (a.polygon.some((point) => contains(b.polygon, point))) return true;
  if (b.polygon.some((point) => contains(a.polygon, point))) return true;
  return a.polygon.some((point, i) =>
    b.polygon.some((other, j) =>
      edgesCross(
        point,
        a.polygon[(i + 1) % a.polygon.length],
        other,
        b.polygon[(j + 1) % b.polygon.length],
      ),
    ),
  );
}

function pathShape(path: ProofPath): Shape {
  assert.match(path.d, /^M/);
  assert.doesNotMatch(path.d, /[ACHQSTV]/i, "craft faces stay polygonal");
  const values = coordinates(path.d);
  assert.equal(values.length % 2, 0);
  const polygon = Array.from({ length: values.length / 2 }, (_, i): Point => [
    values[i * 2],
    values[i * 2 + 1],
  ]);
  return { id: path.id, polygon, bounds: bounds(polygon) };
}

function labelShape(label: ProofLabel, portrait: boolean): Shape {
  const font =
    (label.kind === "heading" ? 9 : label.kind === "small" ? 10 : 11) +
    (portrait ? 2 : 0);
  const width = label.text.length * font * 0.62;
  const x =
    label.x -
    (label.anchor === "middle"
      ? width / 2
      : label.anchor === "end"
        ? width
        : 0);
  const [a, b, c, d, e, f] = label.transform
    ? coordinates(label.transform)
    : [1, 0, 0, 1, 0, 0];
  // One pixel of clearance also covers the craft's subpixel idle bob.
  const polygon = [
    [x - 1, label.y - font - 1],
    [x + width + 1, label.y - font - 1],
    [x + width + 1, label.y + 4],
    [x - 1, label.y + 4],
  ].map(([u, v]): Point => [a * u + c * v + e, b * u + d * v + f]);
  return { id: label.id, polygon, bounds: bounds(polygon) };
}

function craftShapes(frame: ProofFrame, index: number) {
  return frame.paths
    .filter(
      (path) =>
        path.id.startsWith(`vfs-craft-${index + 1}-`) &&
        path.opacity > 0.05 &&
        path.d.trimEnd().endsWith("Z") &&
        // Exhaust is light, not solid hardware; every opaque craft face counts.
        !path.id.includes("-exhaust-"),
    )
    .map(pathShape);
}

type Collision = {
  layout: string;
  first: number;
  last: number;
  a: string;
  b: string;
  part: string;
};
function remember(
  collisions: Map<string, Collision>,
  portrait: boolean,
  selection: number,
  a: string,
  b: string,
  part: string,
) {
  const layout = portrait ? "portrait" : "landscape";
  const key = `${layout}: ${a} / ${b}`;
  const previous = collisions.get(key);
  if (previous) previous.last = selection;
  else
    collisions.set(key, {
      layout,
      first: selection,
      last: selection,
      a,
      b,
      part,
    });
}
const report = (collisions: Map<string, Collision>) =>
  Array.from(
    collisions.values(),
    (hit) =>
      `${hit.layout} ${hit.first.toFixed(2)}–${hit.last.toFixed(2)}: ${hit.a} / ${hit.b} (${hit.part})`,
  ).join("\n");

test("empty launch bays and provisioning feeds clear captions before and during assembly", () => {
  const collisions = new Map<string, Collision>();
  for (const portrait of [false, true]) {
    for (let sample = 0; sample <= 100; sample++) {
      const selection = sample / 50;
      const frame = orbitalFleetFrame(0, selection, portrait);
      const hardware = frame.paths
        .filter(
          (path) =>
            /^(assembly-cradle-|provisioning-feed-)/.test(path.id) &&
            path.opacity > 0.05,
        )
        .map(pathShape);
      const labels = frame.labels
        .filter((label) => label.text && (label.opacity ?? 1) > 0.05)
        .map((label) => labelShape(label, portrait));
      for (const label of labels) {
        const hit = hardware.find((shape) => shapesOverlap(shape, label));
        if (hit)
          remember(
            collisions,
            portrait,
            selection,
            "launch hardware",
            label.id,
            hit.id,
          );
      }
    }
  }
  assert.equal(collisions.size, 0, report(collisions));
});

test("VFS craft clear every caption and each other throughout the eight-stage flight", () => {
  const textCollisions = new Map<string, Collision>();
  const craftCollisions = new Map<string, Collision>();
  for (const portrait of [false, true]) {
    for (let sample = 0; sample <= 350; sample++) {
      const selection = sample / 50;
      const frame = orbitalFleetFrame(0, selection, portrait);
      const crafts = [0, 1, 2].map((index) => craftShapes(frame, index));
      const labels = frame.labels
        .filter((label) => label.text && (label.opacity ?? 1) > 0.05)
        .map((label) => labelShape(label, portrait));
      crafts.forEach((craft, index) => {
        for (const label of labels) {
          const hit = craft.find((shape) => shapesOverlap(shape, label));
          if (hit)
            remember(
              textCollisions,
              portrait,
              selection,
              `craft ${index + 1}`,
              label.id,
              hit.id,
            );
        }
        for (let other = index + 1; other < crafts.length; other++) {
          const hit = craft.find((shape) =>
            crafts[other].some((otherShape) =>
              shapesOverlap(shape, otherShape),
            ),
          );
          if (hit)
            remember(
              craftCollisions,
              portrait,
              selection,
              `craft ${index + 1}`,
              `craft ${other + 1}`,
              hit.id,
            );
        }
      });
    }
  }
  assert.equal(
    textCollisions.size + craftCollisions.size,
    0,
    `Flight intersects visible content:\n${report(textCollisions)}\n${report(craftCollisions)}`,
  );
});

test("deploying workspaces do not fly through a different worker or replica station", () => {
  const collisions = new Map<string, Collision>();
  const stationIds = [
    "owner-station",
    "worker-station-1",
    "worker-station-2",
    "worker-station-3",
    "home-station",
    "mirror-station",
  ];
  for (const portrait of [false, true]) {
    for (let sample = 50; sample <= 100; sample++) {
      const selection = sample / 50;
      const frame = orbitalFleetFrame(0, selection, portrait);
      const stations = stationIds.map((id) => ({
        id,
        shapes: frame.paths
          .filter(
            (path) =>
              path.id.startsWith(id + "-") &&
              path.opacity > 0.05 &&
              path.d.trimEnd().endsWith("Z"),
          )
          .map(pathShape),
      }));
      for (let index = 0; index < 3; index++) {
        const craft = craftShapes(frame, index);
        for (const station of stations) {
          // A carrier docks with its own station; other hulls are obstacles.
          if (station.id === `worker-station-${index + 1}`) continue;
          const hit = craft.find((shape) =>
            station.shapes.some((other) => shapesOverlap(shape, other)),
          );
          if (hit)
            remember(
              collisions,
              portrait,
              selection,
              `craft ${index + 1}`,
              station.id,
              hit.id,
            );
        }
      }
    }
  }
  assert.equal(collisions.size, 0, report(collisions));
});

test("edit, replica and acknowledgement packets clear every caption while in flight", () => {
  const collisions = new Map<string, Collision>();
  for (const portrait of [false, true]) {
    for (let sample = 0; sample <= 700; sample++) {
      const selection = sample / 100;
      const frame = orbitalFleetFrame(0, selection, portrait);
      const labels = frame.labels
        .filter((label) => label.text && (label.opacity ?? 1) > 0.05)
        .map((label) => labelShape(label, portrait));
      const packets = frame.paths
        .filter(
          (path) =>
            (path.id.includes("-edit-packet-") ||
              path.id.startsWith("home-content-") ||
              path.id.startsWith("mirror-content-") ||
              path.id.includes("-accepted-ack")) &&
            /-(?:body|side)$/.test(path.id) &&
            path.opacity > 0.05 &&
            path.d.trimEnd().endsWith("Z"),
        )
        .map(pathShape);
      for (const packet of packets)
        for (const label of labels)
          if (shapesOverlap(packet, label)) {
            const stream = packet.id
              .replace(/-(?:body|side)$/, "")
              .replace(/-\d+$/, "");
            remember(
              collisions,
              portrait,
              selection,
              stream,
              label.id,
              packet.id,
            );
          }
    }
  }
  assert.equal(collisions.size, 0, report(collisions));
});

test("flight retains finite coordinates and stable path and label topology through fractional seeks", () => {
  for (const portrait of [false, true]) {
    const reference = orbitalFleetFrame(0, 0, portrait);
    const referenceIds = reference.paths.map((path) => path.id);
    const referenceCommands = reference.paths.map((path) =>
      path.d.replace(/[^MLZ]/g, ""),
    );
    const referenceLabels = reference.labels.map((label) => label.id);
    assert.equal(
      new Set(referenceIds).size,
      referenceIds.length,
      "unique path IDs",
    );
    for (let sample = 0; sample <= 350; sample++) {
      const frame = orbitalFleetFrame(1.37, sample / 50, portrait);
      assert.deepEqual(
        frame.paths.map((path) => path.id),
        referenceIds,
      );
      assert.deepEqual(
        frame.paths.map((path) => path.d.replace(/[^MLZ]/g, "")),
        referenceCommands,
      );
      assert.deepEqual(
        frame.labels.map((label) => label.id),
        referenceLabels,
      );
      for (const path of frame.paths) {
        assert.doesNotMatch(path.d, /NaN|Infinity/);
        assert.ok(Number.isFinite(path.opacity));
      }
      for (const label of frame.labels) {
        assert.ok(Number.isFinite(label.x) && Number.isFinite(label.y));
        assert.doesNotMatch(label.transform ?? "", /NaN|Infinity/);
      }
    }
  }
});

test("a fully provisioned craft does not snap its heading when deployment starts or ends", () => {
  const jumps: string[] = [];
  for (const portrait of [false, true]) {
    for (let index = 0; index < 3; index++) {
      for (const endpoint of ["start", "end"] as const) {
        let low = 0,
          high = 7;
        for (let iteration = 0; iteration < 50; iteration++) {
          const at = (low + high) / 2;
          const progress = orbitalFleetState(at).agents[index].deployProgress;
          if (endpoint === "start" ? progress > 0 : progress === 1) high = at;
          else low = at;
        }
        const before = orbitalFleetFrame(0, low - 0.00001, portrait);
        const after = orbitalFleetFrame(0, high + 0.00001, portrait);
        const id = `vfs-craft-${index + 1}-hull-keel`;
        const from = before.paths.find((path) => path.id === id);
        const to = after.paths.find((path) => path.id === id);
        assert.ok(from && to);
        const a = pathShape(from),
          b = pathShape(to);
        const jump = Math.max(
          ...a.polygon.map((point, i) =>
            Math.hypot(point[0] - b.polygon[i][0], point[1] - b.polygon[i][1]),
          ),
        );
        if (jump >= 0.15)
          jumps.push(
            `${portrait ? "portrait" : "landscape"} craft ${index + 1} ${endpoint}: ${jump.toFixed(3)}px jump near ${high.toFixed(5)}`,
          );
      }
    }
  }
  assert.equal(jumps.length, 0, jumps.join("\n"));
});
