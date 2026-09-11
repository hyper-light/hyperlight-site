import assert from "node:assert/strict";
import { test } from "node:test";
import {
  activityFrame,
  sphericalRoutePoint,
} from "../components/proof-work/ledger-placement-activity";
import type { ProofPath } from "../components/proof-work/proof-geometry";

const project = ([x, y]: [number, number, number]): [number, number] => [
  400 + x * 170,
  250 + y * 170,
];
const frame = (time: number, mode = 0) => activityFrame(time, mode, project);
function item(paths: ProofPath[], id: string) {
  const result = paths.find((path) => path.id === id);
  assert.ok(result, id);
  return result;
}
function coordinates(path: ProofPath): [number, number][] {
  const values = [...path.d.matchAll(/-?\d+(?:\.\d+)?/g)].map((match) =>
    Number(match[0]),
  );
  return Array.from({ length: values.length / 2 }, (_, index) => [
    values[index * 2],
    values[index * 2 + 1],
  ]);
}
function center(path: ProofPath): [number, number] {
  const points = coordinates(path);
  const opposite = points[(points.length - 1) / 2];
  return [(points[0][0] + opposite[0]) / 2, (points[0][1] + opposite[1]) / 2];
}
const distance = (a: [number, number], b: [number, number]) =>
  Math.hypot(a[0] - b[0], a[1] - b[1]);

test("spherical routes preserve their endpoints and stay outside the globe across long spans", () => {
  const start: [number, number, number] = [1.04, 0, 0];
  const end: [number, number, number] = [0, 0, 1.04];
  assert.deepEqual(sphericalRoutePoint(start, end, 0, 0.05), start);
  assert.deepEqual(sphericalRoutePoint(start, end, 1, 0.05), end);
  const middle = sphericalRoutePoint(start, end, 0.5, 0.05);
  assert.ok(Math.abs(Math.hypot(...middle) - 1.09) < 1e-10);
  assert.ok(Math.abs(middle[0] - 0.7707463914933368) < 1e-10);
  assert.ok(Math.abs(middle[2] - 0.7707463914933368) < 1e-10);
  for (const destination of [
    end,
    start,
    [1.04, 0.000000001, 0],
    [-1.04, 0, 0],
  ] as [number, number, number][])
    for (let step = 0; step <= 100; step++) {
      const point = sphericalRoutePoint(start, destination, step / 100, 0.05);
      assert.ok(point.every(Number.isFinite));
      assert.ok(Math.hypot(...point) >= 1.04 - 1e-10);
    }
  const nearlyOpposite: [number, number, number] = [-1.04, 0.01, 0];
  const approachingEnd = sphericalRoutePoint(
    start,
    nearlyOpposite,
    0.999999,
    0.05,
  );
  assert.ok(
    Math.hypot(
      ...approachingEnd.map((value, index) => value - nearlyOpposite[index]),
    ) < 0.00001,
    "Near-antipodal routes approach their actual endpoint without a final jump",
  );
});

test("a local request reaches its regional hub before a response returns to the workload site", () => {
  const request = frame(1);
  assert.ok(item(request, "local-0-0-request").opacity > 0.3);
  assert.equal(item(request, "local-0-0-response").opacity, 0);
  assert.equal(item(request, "local-0-0-hub-arrival").opacity, 0);
  const route = coordinates(item(request, "local-0-0-route"));
  assert.ok(
    distance(center(item(frame(1.5), "local-0-0-request")), route.at(-1)!) <
      distance(center(item(request, "local-0-0-request")), route.at(-1)!),
  );

  const arrival = frame(2.45);
  assert.equal(item(arrival, "local-0-0-request").opacity, 0);
  assert.ok(item(arrival, "local-0-0-hub-arrival").opacity > 0.2);
  assert.equal(item(arrival, "local-0-0-response").opacity, 0);

  const response = frame(3.5);
  assert.ok(item(response, "local-0-0-response").opacity > 0.3);
  assert.equal(item(response, "local-0-0-hub-arrival").opacity, 0);
  assert.ok(
    distance(center(item(frame(4), "local-0-0-response")), route[0]) <
      distance(center(item(response, "local-0-0-response")), route[0]),
  );
  assert.ok(item(frame(4.9), "local-0-0-site-arrival").opacity > 0.2);
  for (const suffix of [
    "request",
    "request-trail",
    "response",
    "response-trail",
    "hub-arrival",
    "site-arrival",
  ])
    assert.equal(item(frame(6), `local-0-0-${suffix}`).opacity, 0);
});

test("local traffic has fixed deterministic topology, a small path budget, and finite geographic bounds", () => {
  const first = frame(0);
  assert.equal(first.length, 117);
  assert.equal(new Set(first.map(({ id }) => id)).size, first.length);
  for (const angle of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
    const rotated = ([x, y, z]: [number, number, number]): [number, number] => [
      210 + (x * Math.cos(angle) + z * Math.sin(angle)) * 153,
      305 + y * 153,
    ];
    for (const time of [
      0, 0.25, 1, 2.45, 3.5, 4.9, 6, 9.99, 10, 10.01, 19.99, 30,
    ])
      for (const mode of [0, 1, 2]) {
        const paths = activityFrame(time, mode, rotated, () => 0.5);
        assert.deepEqual(
          paths.map(({ id }) => id),
          first.map(({ id }) => id),
        );
        assert.deepEqual(
          paths.map(({ kind }) => kind),
          first.map(({ kind }) => kind),
        );
        for (const path of paths) {
          assert.doesNotMatch(path.d, /NaN|Infinity/);
          assert.ok(path.opacity >= 0 && path.opacity <= 1, path.id);
          for (const [x, y] of coordinates(path)) {
            assert.ok(x > 0 && x < 420, `${path.id}: x=${x}`);
            assert.ok(y > 0 && y < 740, `${path.id}: y=${y}`);
          }
        }
      }
  }
  for (const invalid of [-1, NaN, Infinity, -Infinity])
    assert.deepEqual(frame(invalid), first);
  assert.deepEqual(frame(3.5), frame(3.5));
  for (let region = 0; region < 3; region++) {
    assert.ok(
      center(item(first, `local-${region}-3-core`))[1] > 300,
      "Southern clients remain part of the illustration",
    );
  }
});

test("residency blocks every Region C transaction but not other regions' independent local work", () => {
  const dynamic =
    /-(request|request-trail|response|response-trail|hub-arrival|site-arrival)$/;
  const activeRegions = new Set<number>();
  for (let step = 0; step <= 80; step++) {
    const time = step / 8;
    const independent = frame(time, 0);
    const replicated = frame(time, 1);
    const restricted = frame(time, 2);
    for (const path of restricted) {
      if (path.id.startsWith("local-2-") && dynamic.test(path.id))
        assert.equal(path.opacity, 0, path.id);
      if (/^local-[01]-/.test(path.id))
        assert.deepEqual(
          path,
          item(replicated, path.id),
          "Allowed local clients do not lose traffic when C is blocked",
        );
    }
    for (const path of independent.filter(
      ({ id, opacity }) => dynamic.test(id) && opacity > 0.3,
    ))
      activeRegions.add(Number(path.id.split("-")[1]));
    for (let site = 0; site < 4; site++)
      assert.ok(
        item(restricted, `local-2-${site}-core`).opacity < 0.1,
        "Blocked clients remain only quiet static markers",
      );
  }
  assert.deepEqual([...activeRegions].sort(), [0, 1, 2]);
  assert.ok(item(frame(3, 2), "local-region-2-gate-1").opacity > 0);
  assert.equal(item(frame(3, 1), "local-region-2-gate-1").opacity, 0);
});

test("packets and their short trails follow outward local routes into existing hubs", () => {
  const segmentDistance = (
    p: [number, number],
    a: [number, number],
    b: [number, number],
  ) => {
    const dx = b[0] - a[0],
      dy = b[1] - a[1];
    const denominator = dx * dx + dy * dy;
    const amount = denominator
      ? Math.max(
          0,
          Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / denominator),
        )
      : 0;
    return distance(p, [a[0] + amount * dx, a[1] + amount * dy]);
  };
  for (let step = 0; step <= 40; step++) {
    const paths = activityFrame(step / 4, 0, (point) => {
      assert.ok(
        Math.hypot(...point) >= 1.007,
        "No track or signal cuts through the sphere",
      );
      assert.ok(
        Math.hypot(...point) < 1.12,
        "Local work remains close to the geographic surface",
      );
      return project(point);
    });
    for (let region = 0; region < 3; region++) {
      const hub = coordinates(item(paths, `local-${region}-0-route`)).at(-1)!;
      for (let site = 0; site < 4; site++) {
        const prefix = `local-${region}-${site}`;
        const route = coordinates(item(paths, `${prefix}-route`));
        assert.deepEqual(
          route.at(-1),
          hub,
          "All clients end at their one existing regional hub",
        );
        assert.ok(
          distance(route[0], center(item(paths, `${prefix}-core`))) < 0.015,
        );
        for (const kind of ["request", "response"]) {
          const packet = item(paths, `${prefix}-${kind}`);
          const trail = item(paths, `${prefix}-${kind}-trail`);
          const position = center(packet);
          assert.ok(
            distance(position, coordinates(trail).at(-1)!) < 0.015,
            `${packet.id}: trail must meet its packet`,
          );
          if (packet.opacity > 0.01) {
            const nearest = Math.min(
              ...route
                .slice(1)
                .map((point, index) =>
                  segmentDistance(position, route[index], point),
                ),
            );
            assert.ok(
              nearest < 0.3,
              `${packet.id}: packet is off the drawn route`,
            );
            assert.ok(
              trail.opacity > 0,
              `${trail.id}: a visible packet has a visible trail`,
            );
          }
        }
      }
    }
  }
});

test("carriers fade before their local cycles repeat and front/back visibility does not change ownership", () => {
  for (let region = 0; region < 3; region++)
    for (let site = 0; site < 4; site++) {
      const offset = region * 2.8 + site * 0.7;
      const before = frame(offset + 9.99),
        after = frame(offset + 10.01);
      for (const suffix of [
        "request",
        "request-trail",
        "response",
        "response-trail",
        "hub-arrival",
        "site-arrival",
      ]) {
        const id = `local-${region}-${site}-${suffix}`;
        const a = item(before, id),
          b = item(after, id);
        assert.equal(a.opacity, 0, id);
        assert.equal(b.opacity, 0, id);
        coordinates(a).forEach((point, index) =>
          assert.ok(
            distance(point, coordinates(b)[index]) < 0.05,
            `${id}: invisible carrier resets continuously`,
          ),
        );
      }
    }
  const front = activityFrame(1, 0, project, () => 1);
  const rear = activityFrame(1, 0, project, () => 0);
  assert.deepEqual(
    front.map(({ id, d, tone }) => ({ id, d, tone })),
    rear.map(({ id, d, tone }) => ({ id, d, tone })),
  );
  const signal = "local-0-0-request";
  assert.ok(item(front, signal).opacity > item(rear, signal).opacity * 3);
  assert.ok(
    item(rear, signal).opacity > 0,
    "Translucent rear traffic remains faintly readable",
  );
});
