import assert from "node:assert/strict";
import { test } from "node:test";
import { journeyLifecycleFrames } from "../components/proof-work/journey-lifecycle-geometry";
import {
  mobileJourneyGate,
  mobileJourneyPoint,
} from "../components/proof-work/mobile-journey-layout";
import type { ProofPath } from "../components/proof-work/proof-geometry";

function bounds(path: ProofPath) {
  const coordinates = Array.from(path.d.matchAll(/-?\d+(?:\.\d+)?/g), ([n]) =>
    Number(n),
  );
  const xs = coordinates.filter((_, i) => i % 2 === 0);
  const ys = coordinates.filter((_, i) => i % 2 === 1);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
}

type Point = [number, number];

function polygon(path: ProofPath): Point[] {
  const coordinates = Array.from(path.d.matchAll(/-?\d+(?:\.\d+)?/g), ([n]) =>
    Number(n),
  );
  return Array.from({ length: coordinates.length / 2 }, (_, i) => [
    coordinates[i * 2],
    coordinates[i * 2 + 1],
  ]);
}

function intersects(a: Point[], b: Point[]) {
  function contains(points: Point[], point: Point) {
    let inside = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      if (
        points[i][1] > point[1] !== points[j][1] > point[1] &&
        point[0] <
          ((points[j][0] - points[i][0]) * (point[1] - points[i][1])) /
            (points[j][1] - points[i][1]) +
            points[i][0]
      )
        inside = !inside;
    }
    return inside;
  }
  function side(p: Point, q: Point, r: Point) {
    return (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
  }
  if (a.some((p) => contains(b, p)) || b.some((p) => contains(a, p)))
    return true;
  for (let i = 0; i < a.length; i++) {
    for (let j = 0; j < b.length; j++) {
      const p = a[i],
        q = a[(i + 1) % a.length],
        r = b[j],
        s = b[(j + 1) % b.length];
      if (
        side(p, q, r) * side(p, q, s) < 0 &&
        side(r, s, p) * side(r, s, q) < 0
      )
        return true;
    }
  }
  return false;
}

test("mobile claim shutters retract before any part of C17 enters either portal", () => {
  const initial = journeyLifecycleFrames.pass(0, 0, true);
  const fullyOpen = journeyLifecycleFrames.pass(0, 1, true);
  const portals = (
    [
      ["posted", 307],
      ["holder", 520],
    ] as const
  ).map(([id, x]) => {
    const project = mobileJourneyGate(x, -50);
    // The opening between the posts, threshold and crossbar, not the outer
    // hardware that a correctly traversing wireframe can visually cross.
    const aperture = [
      project(x + 4, -80, 6),
      project(x + 4, -20, 6),
      project(x + 4, -20, 54),
      project(x + 4, -80, 54),
    ];
    const shutters = [0, 1, 2].map((tooth) => `${id}-tooth-${tooth}-outline`);
    for (const shutter of shutters)
      assert.notEqual(
        initial.paths.find((p) => p.id === shutter)!.d,
        fullyOpen.paths.find((p) => p.id === shutter)!.d,
        `${shutter} should begin closed, not disappear to mask the crossing`,
      );
    return { id, aperture, shutters };
  });
  const violations = new Set<string>();
  const traversed = new Set<string>();
  for (const outcome of ["pass", "fail", "error", "missing"] as const) {
    for (let sample = 180; sample <= 850; sample++) {
      const frame = journeyLifecycleFrames[outcome](1.7, sample / 1000, true);
      const silhouette = frame.paths
        .filter(({ id }) =>
          /^claim-ship-spacecraft-(hull|wing-[01]|cockpit|engine-[01])$/.test(
            id,
          ),
        )
        .map(polygon);
      for (const { id, aperture, shutters } of portals) {
        if (!silhouette.some((shape) => intersects(shape, aperture))) continue;
        traversed.add(`${outcome}:${id}`);
        if (
          shutters.some(
            (shutter) =>
              frame.paths.find((p) => p.id === shutter)!.d !==
              fullyOpen.paths.find((p) => p.id === shutter)!.d,
          )
        )
          violations.add(
            `${outcome} ${sample / 1000}: C17 enters ${id} before its shutters retract`,
          );
      }
    }
  }
  assert.equal(
    traversed.size,
    8,
    "Every outcome must traverse both claim portals",
  );
  assert.equal(violations.size, 0, [...violations].slice(0, 12).join("\n"));
});

test("mobile outbound craft clears the closed return portals throughout its flight", () => {
  const collisions = new Set<string>();
  for (const outcome of ["pass", "fail", "error", "missing"] as const) {
    for (let sample = 180; sample <= 850; sample++) {
      const frame = journeyLifecycleFrames[outcome](1.7, sample / 1000, true);
      const ships = frame.paths.filter(({ id }) =>
        /^claim-ship-spacecraft-(hull|wing-[01])$/.test(id),
      );
      const gates = frame.paths.filter(({ id }) =>
        /^(response|ledger-return)-(tooth-\d|post--?1|crossbar|threshold)-(side|top|outline)$/.test(
          id,
        ),
      );
      for (const ship of ships) {
        const a = bounds(ship);
        for (const gate of gates) {
          const b = bounds(gate);
          // Include a small visual gutter: two wireframes nearly touching
          // still read as a collision on a narrow screen.
          if (
            a[0] < b[2] + 3 &&
            a[2] > b[0] - 3 &&
            a[1] < b[3] + 3 &&
            a[3] > b[1] - 3
          )
            collisions.add(
              `${outcome} ${sample / 1000}: ${ship.id} crosses ${gate.id}`,
            );
        }
      }
    }
  }
  assert.equal(collisions.size, 0, [...collisions].slice(0, 12).join("\n"));
});

test("mobile journey uses the upper left space while keeping the two berths distinct", () => {
  for (const [input, expected] of [
    [
      [55, 50, 0],
      [234, 142.9],
    ],
    [
      [550, 50, 0],
      [306, 466.7518518518518],
    ],
    [
      [610, -70, 0],
      [187.84, 477.54],
    ],
    [
      [171, -50, 0],
      [111, 203.1],
    ],
    [
      [307, -50, 0],
      [126, 275.1],
    ],
  ]) {
    const result = mobileJourneyPoint(input[0], input[1], input[2]);
    assert.ok(
      Math.hypot(result[0] - expected[0], result[1] - expected[1]) < 0.001,
    );
  }
});

test("closed return shutters keep their timing and shape after the spacing adjustment", () => {
  const initial = journeyLifecycleFrames.pass(0, 0, true);
  const relativeShape = (path: ProofPath) => {
    const coordinates = Array.from(path.d.matchAll(/-?\d+(?:\.\d+)?/g), ([n]) =>
      Number(n),
    );
    return coordinates.map((n, i) =>
      Number((n - coordinates[i % 2]).toFixed(2)),
    );
  };
  for (const selection of [0.35, 0.42, 0.56, 0.7, 1]) {
    const frame = journeyLifecycleFrames.pass(0, selection, true);
    for (const gate of ["response", "ledger-return"]) {
      const id = `${gate}-tooth-1-outline`;
      assert.deepEqual(
        relativeShape(frame.paths.find((p) => p.id === id)!),
        relativeShape(initial.paths.find((p) => p.id === id)!),
      );
    }
  }
  const open = journeyLifecycleFrames.pass(0, 5, true);
  for (const gate of ["response", "ledger-return"]) {
    const id = `${gate}-tooth-1-outline`;
    assert.notDeepEqual(
      relativeShape(open.paths.find((p) => p.id === id)!),
      relativeShape(initial.paths.find((p) => p.id === id)!),
    );
  }
});
