import assert from "node:assert/strict";
import { test } from "node:test";
import type { ProofTone } from "../components/proof-work/proof-geometry";
import { createOrbitalFleetFrames } from "../components/slates/orbital-fleet-geometry";
import {
  createSpatialPathCache,
  spatialDrawing,
  type Point2,
  type Point3,
} from "../components/slates/spatial-drawing";
import {
  orbitalSurfaceLighting,
  type OrbitalSurface,
} from "../components/slates/orbital-volume-drawing";

test("adjacent real orbital frames serialize only changed path coordinates", (t) => {
  const orbitalFleetFrame = createOrbitalFleetFrames().success;
  const formatting = t.mock.method(Number.prototype, "toFixed");
  orbitalFleetFrame(1, 1, true);
  const initial = formatting.mock.callCount();
  orbitalFleetFrame(1 + 1 / 60, 1, true);
  const adjacent = formatting.mock.callCount() - initial;
  t.diagnostic(
    `Coordinate serialization calls: cold ${initial}, adjacent ${adjacent}`,
  );
  assert.ok(
    adjacent < initial / 4,
    `Unchanged path coordinates must not be reformatted: ${adjacent} of ${initial} calls remain`,
  );
});

test("cached and uncached orbital frames are byte-for-byte identical through motion, story changes and seeks", () => {
  const cached = createOrbitalFleetFrames(),
    uncached = createOrbitalFleetFrames({ cachePaths: false });
  for (const name of Object.keys(cached) as (keyof typeof cached)[]) {
    for (const portrait of [false, true]) {
      for (const selection of [
        0, 0.17, 0.93, 1, 1.4, 1.83, 2.27, 3.3, 4.45, 5.61, 6.79, 7, 7.43, 8,
        2.4, 0,
      ]) {
        for (const time of [0, 1.37, 8.9]) {
          assert.equal(
            JSON.stringify(cached[name](time, selection, portrait)),
            JSON.stringify(uncached[name](time, selection, portrait)),
            `${name} portrait=${portrait} selection=${selection} time=${time}`,
          );
        }
      }
    }
  }
});

test("the point cache detects in-place changes, closed paths and styles without changing precision", () => {
  const cache = createSpatialPathCache();
  const points: [number, number][] = [
    [1.234567, 2.345678],
    [9.876543, 8.765432],
  ];
  const draw = (closed: boolean, opacity: number) => {
    const cached = spatialDrawing(cache),
      plain = spatialDrawing();
    cached.line("test", points, { opacity }, closed);
    plain.line("test", points, { opacity }, closed);
    assert.equal(JSON.stringify(cached.paths), JSON.stringify(plain.paths));
  };
  draw(false, 1);
  draw(false, 0.01);
  points[0][0] += 0.0006;
  draw(false, 0.8);
  draw(true, 0.8);
  points.push([-0.0006, 0.0006]);
  draw(true, 0);
  points.pop();
  draw(false, 1);
});

test("path caching stays bounded instead of accumulating distinct animation inputs", (t) => {
  const cache = createSpatialPathCache(2),
    points: Point2[] = [
      [0, 0],
      [1, 1],
    ];
  const draw = (id: string) => spatialDrawing(cache).line(id, points);
  draw("one");
  draw("two");
  draw("over-capacity");
  const formatting = t.mock.method(Number.prototype, "toFixed");
  draw("one");
  draw("two");
  assert.equal(formatting.mock.callCount(), 0);
  draw("over-capacity");
  assert.equal(formatting.mock.callCount(), 4);
});

test("per-face lighting avoids temporary array mapping", () => {
  const original = Object.getOwnPropertyDescriptor(Array.prototype, "map")!;
  let calls = 0;
  Object.defineProperty(Array.prototype, "map", {
    ...original,
    value: function (this: unknown, ...args: unknown[]) {
      calls++;
      return Reflect.apply(original.value, this, args);
    },
  });
  try {
    orbitalSurfaceLighting(
      [
        [0, 0, 0],
        [1, 0, 0],
        [0, 1, 0],
      ],
      "hull",
    );
  } finally {
    Object.defineProperty(Array.prototype, "map", original);
  }
  assert.equal(calls, 0);
});

test("lighting without temporary mapped arrays exactly matches the original normal and RGB calculation", () => {
  const tint: Record<ProofTone, readonly number[]> = {
    neutral: [178, 201, 221],
    pass: [163, 222, 202],
    pending: [166, 194, 234],
    error: [229, 199, 149],
    fail: [224, 158, 174],
  };
  const reference = (
    points: readonly Point3[],
    surface: OrbitalSurface,
    accent: ProofTone,
  ) => {
    const a = points[0],
      b = points[1],
      c = points[2];
    const u = b.map((value, i) => value - a[i]);
    const v = c.map((value, i) => value - a[i]);
    const n = [
      u[1] * v[2] - u[2] * v[1],
      u[2] * v[0] - u[0] * v[2],
      u[0] * v[1] - u[1] * v[0],
    ];
    const length = Math.hypot(...n) || 1;
    const light = Math.max(
      0,
      (-0.45 * n[0] - 0.55 * n[1] + n[2]) / (length * 1.227),
    );
    const base =
      surface === "armor"
        ? [79, 95, 110]
        : surface === "dark"
          ? [29, 37, 51]
          : surface === "glass"
            ? [48, 82, 105]
            : surface === "light"
              ? tint[accent]
              : [61, 78, 98];
    const power = surface === "light" ? 1 : 0.2 + light * 0.55;
    return {
      fillColor: `rgb(${base.map((value) => Math.round(value * power)).join(" ")})`,
      strokeOpacity:
        surface === "light"
          ? 0.55
          : surface === "dark"
            ? 0.24
            : 0.48 + light * 0.45,
    };
  };
  const surfaces: OrbitalSurface[] = [
    "hull",
    "armor",
    "dark",
    "glass",
    "light",
  ];
  const accents: ProofTone[] = ["neutral", "pass", "pending", "error", "fail"];
  for (let i = 0; i < 128; i++) {
    const points: Point3[] = [
      [Math.sin(i) * 100, i / 7, Math.cos(i) * 33],
      [Math.sin(i * 0.7) * 17, i / 11, Math.cos(i * 1.3) * 81],
      [Math.sin(i * 1.9) * 63, i / 13, Math.cos(i * 0.3) * 37],
    ];
    if (i === 0) points.fill([0, 0, 0]);
    for (const surface of surfaces)
      for (const accent of accents)
        assert.deepEqual(
          orbitalSurfaceLighting(points, surface, accent),
          reference(points, surface, accent),
        );
  }
});
