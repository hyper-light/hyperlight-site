import assert from "node:assert/strict";
import { test } from "node:test";
import { journeyLifecycleFrames } from "../components/proof-work/journey-lifecycle-geometry";
import type {
  ProofFrame,
  ProofLabel,
  ProofPath,
} from "../components/proof-work/proof-geometry";

type Point = [number, number];
type Box = [number, number, number, number];
const pointCache = new WeakMap<ProofPath, Point[]>();
const boundsCache = new WeakMap<ProofPath, Box>();

function points(path: ProofPath): Point[] {
  const cached = pointCache.get(path);
  if (cached) return cached;
  const values = Array.from(path.d.matchAll(/-?\d+(?:\.\d+)?/g), ([value]) =>
    Number(value),
  );
  const vertices: Point[] = Array.from(
    { length: values.length / 2 },
    (_, index) => [values[index * 2], values[index * 2 + 1]],
  );
  pointCache.set(path, vertices);
  return vertices;
}

function captionBounds(label: ProofLabel, gutter = 4): Box {
  // Mobile sceneSmall is 12px monospace. Include ascent, descent, and a four
  // user-unit safety gutter; a halo is not a substitute for reserved space.
  const width = label.text.length * 7.2;
  const left =
    label.x -
    (label.anchor === "middle"
      ? width / 2
      : label.anchor === "end"
        ? width
        : 0);
  return [
    left - gutter,
    label.y - 12 - gutter,
    left + width + gutter,
    label.y + 2 + gutter,
  ];
}

function boxesOverlap(a: Box, b: Box) {
  return a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
}

function segmentHitsBox(a: Point, b: Point, box: Box) {
  let low = 0,
    high = 1;
  for (let axis = 0; axis < 2; axis++) {
    const delta = b[axis] - a[axis];
    if (Math.abs(delta) < 0.0001) {
      if (a[axis] < box[axis] || a[axis] > box[axis + 2]) return false;
    } else {
      const enter = (box[axis] - a[axis]) / delta;
      const leave = (box[axis + 2] - a[axis]) / delta;
      low = Math.max(low, Math.min(enter, leave));
      high = Math.min(high, Math.max(enter, leave));
      if (low > high) return false;
    }
  }
  return true;
}

function pointInPolygon(point: Point, polygon: Point[]) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i],
      b = polygon[j];
    if (
      a[1] > point[1] !== b[1] > point[1] &&
      point[0] < ((b[0] - a[0]) * (point[1] - a[1])) / (b[1] - a[1]) + a[0]
    )
      inside = !inside;
  }
  return inside;
}

function crossing(path: ProofPath, box: Box) {
  const vertices = points(path);
  let bounds = boundsCache.get(path);
  if (!bounds) {
    bounds = [
      Math.min(...vertices.map(([x]) => x)),
      Math.min(...vertices.map(([, y]) => y)),
      Math.max(...vertices.map(([x]) => x)),
      Math.max(...vertices.map(([, y]) => y)),
    ];
    boundsCache.set(path, bounds);
  }
  if (
    bounds[2] < box[0] ||
    bounds[0] > box[2] ||
    bounds[3] < box[1] ||
    bounds[1] > box[3]
  )
    return null;
  for (let i = 1; i < vertices.length; i++)
    if (segmentHitsBox(vertices[i - 1], vertices[i], box))
      return `${JSON.stringify(vertices[i - 1])} → ${JSON.stringify(vertices[i])}`;
  if (path.d.endsWith(" Z")) {
    if (segmentHitsBox(vertices.at(-1)!, vertices[0], box))
      return `${JSON.stringify(vertices.at(-1))} → ${JSON.stringify(vertices[0])}`;
    if (
      (path.kind === "glass" || path.kind === "shade") &&
      pointInPolygon([box[0], box[1]], vertices)
    )
      return "caption is inside the filled surface";
  }
  return null;
}

test("mobile validation captions clear the full swept hardware envelope", () => {
  const failures: string[] = [];
  const reported = new Set<string>();
  const selections = [
    ...new Set([7, 8, ...Array.from({ length: 91 }, (_, i) => i / 10)]),
  ];
  const clocks = [1.7, 0, 0.7, 2.9, 4.1, 5.5];
  for (const example of ["pass", "fail", "error", "missing"] as const)
    for (const selection of selections) {
      if (example === "missing" && selection > 6) continue;
      for (const time of clocks) {
        const frame = journeyLifecycleFrames[example](time, selection, true);
        const captions = frame.labels.filter(
          ({ id, opacity }) =>
            /^witness-title-[01]$/.test(id) && (opacity ?? 1) > 0.1,
        );
        if (example !== "missing" && selection >= 6)
          assert.equal(
            captions.length,
            2,
            "both check captions remain visible throughout validation",
          );
        // Moving the bay must not trade a cargo collision for a route, gate,
        // receipt token or ledger collision elsewhere in the same scene.
        const hardware = frame.paths.filter(({ opacity }) => opacity > 0.1);
        for (const caption of captions) {
          const box = captionBounds(caption);
          for (const item of hardware) {
            const hit = crossing(item, box);
            const key = caption.id + ":" + item.id;
            if (hit && !reported.has(key) && failures.length < 12) {
              reported.add(key);
              failures.push(
                `${example} journey=${selection} time=${time}: ${caption.id} “${caption.text}” box=${JSON.stringify(box)} intersects ${item.id}: ${hit}`,
              );
            }
          }
        }
      }
    }
  assert.equal(failures.length, 0, failures.join("\n"));
});

test("all mobile captions clear other text and the full animated physical scene", () => {
  const failures: string[] = [];
  const reported = new Set<string>();
  const selections = [
    ...new Set([
      3.35,
      4.93,
      6,
      7,
      8,
      0.93,
      1.25,
      3.95,
      5.15,
      ...Array.from({ length: 91 }, (_, i) => i / 10),
    ]),
  ];
  const record = (key: string, message: string) => {
    if (!reported.has(key) && failures.length < 16) {
      reported.add(key);
      failures.push(message);
    }
  };
  for (const example of ["pass", "fail", "error", "missing"] as const)
    for (const selection of selections) {
      if (example === "missing" && selection > 6) continue;
      for (const time of [1.7, 0, 0.7, 2.9, 4.1, 5.5]) {
        const frame = journeyLifecycleFrames[example](time, selection, true);
        const captions = frame.labels.filter(
          ({ text, opacity }) => text && (opacity ?? 1) > 0.1,
        );
        const hardware = frame.paths.filter(({ opacity }) => opacity > 0.1);
        for (let index = 0; index < captions.length; index++) {
          const caption = captions[index];
          // Two pixels on each text envelope reserve a four-pixel inter-label
          // gutter without rejecting the deliberately compact footer leading.
          const textBox = captionBounds(caption, 2);
          for (const other of captions.slice(index + 1)) {
            if (boxesOverlap(textBox, captionBounds(other, 2)))
              record(
                `${caption.id}:${other.id}`,
                `${example} journey=${selection} time=${time}: ${caption.id} “${caption.text}” overlaps ${other.id} “${other.text}”`,
              );
          }
          const box = captionBounds(caption);
          for (const item of hardware) {
            // The tiny vertical record ticks intentionally introduce their own
            // unboxed readout, not a physical object crossing the caption.
            if (
              /^(claim|artifact|testament|checks)-(title|state)$/.test(
                caption.id,
              ) &&
              item.id === caption.id.replace(/-(title|state)$/, "-record-link")
            )
              continue;
            const hit = crossing(item, box);
            if (hit)
              record(
                `${caption.id}:${item.id}`,
                `${example} journey=${selection} time=${time}: ${caption.id} “${caption.text}” box=${JSON.stringify(box)} intersects ${item.id}: ${hit}`,
              );
          }
        }
      }
    }
  assert.equal(failures.length, 0, failures.join("\n"));
});

function geometry(frame: ProofFrame, id: string) {
  const item = frame.paths.find((path) => path.id === id);
  assert.ok(item, `${id} remains part of the shared physical journey`);
  return points(item);
}

function distance(a: Point, b: Point) {
  return Math.hypot(b[0] - a[0], b[1] - a[1]);
}

test("mobile gates retain upright posts and a substantial open port", () => {
  const desktop = journeyLifecycleFrames.pass(0, 4, false),
    mobile = journeyLifecycleFrames.pass(0, 4, true);
  for (const id of ["posted", "holder", "response"]) {
    const left = geometry(mobile, `${id}-post--1-outline`),
      right = geometry(mobile, `${id}-post-1-outline`),
      desktopLeft = geometry(desktop, `${id}-post--1-outline`),
      desktopRight = geometry(desktop, `${id}-post-1-outline`);
    const rise = distance(left[0], left[3]),
      opening = distance(left[0], right[0]),
      desktopRatio =
        distance(desktopLeft[0], desktopLeft[3]) /
        distance(desktopLeft[0], desktopRight[0]),
      proportion = rise / opening / desktopRatio;
    assert.ok(
      rise >= 24,
      `${id}: ${rise.toFixed(2)}px posts must not flatten into ladder rungs`,
    );
    assert.ok(
      opening >= 35,
      `${id}: ${opening.toFixed(2)}px port remains visibly traversable`,
    );
    assert.ok(
      Math.abs(left[3][0] - left[0][0]) / rise <= 0.4,
      `${id}: vertical posts must read as upright`,
    );
    assert.ok(
      proportion >= 0.65 && proportion <= 1.5,
      `${id}: mobile rise/opening proportion is ${proportion.toFixed(3)}× desktop`,
    );
  }
});

test("parked mobile C17 preserves recognizable wing-to-body proportions", () => {
  const desktop = journeyLifecycleFrames.pass(0, 4, false),
    mobile = journeyLifecycleFrames.pass(0, 4, true);
  const ratio = (frame: ProofFrame, ship: string) => {
    const hull = geometry(frame, `${ship}-ship-spacecraft-hull`),
      leftWing = geometry(frame, `${ship}-ship-spacecraft-wing-0`),
      rightWing = geometry(frame, `${ship}-ship-spacecraft-wing-1`);
    // Physical landmarks, not a screen-axis bounding box: rotating or moving
    // the complete ship leaves this ratio unchanged. Step4 is fully assembled.
    return distance(leftWing[1], rightWing[1]) / distance(hull[0], hull[3]);
  };
  const proportion = ratio(mobile, "claim") / ratio(desktop, "claim");
  assert.ok(
    proportion >= 0.65 && proportion <= 1.5,
    `claim: mobile wing/body proportion is ${proportion.toFixed(3)}× desktop`,
  );
});

test("rear-facing mobile T1 retains a rigid three-quarter camera at the requested yaw", () => {
  // Independent worked landmarks for the unchanged T1 model at yaw1.7 and
  // scale0.85. World deltas are nose−aft=(-83,0,5), right−left wing=(0,-68,0),
  // and canopy−aft=(-35,8,21). Rotate in the ground plane, then project through
  // the established three-quarter camera. Translation along the route cancels;
  // unlike the old silhouette ratio, this permits the requested rear view.
  const expected: Point[] = [
    [-24.491758, -51.824128],
    [60.892888, 5.064104],
    [-17.491719, -38.507156],
  ];
  for (const example of ["pass", "fail", "error", "missing"] as const)
    for (const selection of [3, 4, 4.5, 5, 6, 9]) {
      if (example === "missing" && selection > 6) continue;
      const frame = journeyLifecycleFrames[example](1.7, selection, true);
      const hull = geometry(frame, "testament-ship-spacecraft-hull"),
        leftWing = geometry(frame, "testament-ship-spacecraft-wing-0"),
        rightWing = geometry(frame, "testament-ship-spacecraft-wing-1"),
        canopy = geometry(frame, "testament-ship-spacecraft-cockpit");
      const delta = (a: Point, b: Point): Point => [a[0] - b[0], a[1] - b[1]];
      const actual = [
        delta(hull[0], hull[3]),
        delta(rightWing[1], leftWing[1]),
        delta(canopy[2], hull[3]),
      ];
      actual.forEach((landmark, index) =>
        assert.ok(
          distance(landmark, expected[index]) < 0.05,
          `${example} journey${selection}: rear-facing T1 landmark${index} is ${JSON.stringify(landmark)}, expected ${JSON.stringify(expected[index])}`,
        ),
      );
    }
});
