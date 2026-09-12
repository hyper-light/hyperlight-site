import assert from "node:assert/strict";
import { test } from "node:test";
import { journeyLifecycleFrames } from "../components/proof-work/journey-lifecycle-geometry";
import { mobileJourneyGate } from "../components/proof-work/mobile-journey-layout";
import type {
  ProofFrame,
  ProofLabel,
  ProofPath,
} from "../components/proof-work/proof-geometry";

type Point = [number, number];
const outcomes = ["pass", "fail", "error", "missing"] as const;

test("mobile C17 folds its wings continuously into the landed pose", () => {
  const before = journeyLifecycleFrames.pass(0, 1 - 0.000001, true);
  const landed = journeyLifecycleFrames.pass(0, 1, true);
  for (const id of [
    "claim-ship-spacecraft-wing-0",
    "claim-ship-spacecraft-wing-1",
  ]) {
    const a = polygon(before.paths.find((p) => p.id === id)!);
    const b = polygon(landed.paths.find((p) => p.id === id)!);
    assert.ok(
      a.every((p, i) => Math.hypot(p[0] - b[i][0], p[1] - b[i][1]) < 0.05),
      `${id} snaps at landing`,
    );
  }
});

test("mobile T1 pivots into a horizontal berth with its receipt on the hull", () => {
  for (const outcome of outcomes) {
    const frame = journeyLifecycleFrames[outcome](1.7, 6, true);
    const hull = polygon(
      frame.paths.find((p) => p.id === "testament-ship-spacecraft-hull")!,
    );
    // The existing berth stays fixed. A left-facing, yaw-zero ship has an
    // 83-unit longitudinal span, projected at the mobile scale of .85.
    assert.ok(Math.hypot(hull[0][0] - 178.75, hull[0][1] - 119.95) < 0.05);
    assert.ok(Math.abs(hull[0][0] - hull[3][0] + 70.55) < 0.05);
    const receipt = polygon(
      frame.paths.find((p) => p.id === "testament-delivery-confirmation")!,
    );
    assert.ok(
      Math.hypot(receipt[0][0] + 7 - 247.294, receipt[0][1] + 7 - 139.704) <
        0.05,
    );
  }
});

test("mobile T1's landing turn stays smooth and clears the receipt gate", () => {
  for (let sample = 0; sample <= 200; sample++) {
    const selection = 4.825 + (sample * 0.175) / 200;
    const frame = journeyLifecycleFrames.pass(1.7, selection, true);
    const caption = captionPolygon(
      frame.labels.find((l) => l.id === "testament-ship-message-id")!,
    );
    for (const cargo of frame.paths.filter(
      (p) => p.opacity > 0.05 && /^(cargo-|work-artifact-)/.test(p.id),
    ))
      assert.ok(
        !captionTouchesPath(caption, cargo, polygon(cargo)),
        `${selection}: ${cargo.id} crowds T1's label`,
      );
    const gate = frame.paths.filter((p) =>
      /^response-(tooth-\d|post--?1|crossbar|threshold)-(side|top)$/.test(p.id),
    );
    for (const craft of spacecraft(frame, "testament"))
      for (const part of gate)
        assert.ok(
          !touches(craft.points, polygon(part), 6),
          `${selection}: ${craft.id} crowds ${part.id}`,
        );
  }
  for (const boundary of [4.825, 5]) {
    const before = journeyLifecycleFrames.pass(1.7, boundary - 0.000001, true);
    const after = journeyLifecycleFrames.pass(1.7, boundary + 0.000001, true);
    for (const a of before.paths.filter((p) =>
      /^(testament-ship-spacecraft-|cargo-|work-artifact-)/.test(p.id),
    )) {
      const b = after.paths.find((p) => p.id === a.id)!;
      const next = polygon(b);
      assert.ok(
        polygon(a).every(
          (p, i) => Math.hypot(p[0] - next[i][0], p[1] - next[i][1]) < 0.05,
        ),
        `${a.id} snaps at ${boundary}`,
      );
    }
  }
});

test("T1's arriving and held receipt clears its identity label", () => {
  for (const outcome of outcomes)
    for (let sample = 480; sample <= 600; sample++) {
      const frame = journeyLifecycleFrames[outcome](1.7, sample / 100, true);
      const caption = captionPolygon(
        frame.labels.find((l) => l.id === "testament-ship-message-id")!,
      );
      for (const path of frame.paths.filter(
        (p) =>
          p.opacity > 0.1 &&
          /^(testament-delivery-(ack|confirmation)(-seal)?|testament-confirmation-socket)$/.test(
            p.id,
          ),
      ))
        assert.ok(
          !captionTouchesPath(caption, path, polygon(path)),
          `${outcome} ${sample / 100}: ${path.id} covers T1`,
        );
    }
});

function polygon(path: ProofPath): Point[] {
  const values = [...path.d.matchAll(/-?\d+(?:\.\d+)?/g)].map(([n]) =>
    Number(n),
  );
  return Array.from({ length: values.length / 2 }, (_, i) => [
    values[i * 2],
    values[i * 2 + 1],
  ]);
}

function side(a: Point, b: Point, c: Point) {
  return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
}

function contains(shape: Point[], point: Point) {
  let inside = false;
  for (let i = 0, j = shape.length - 1; i < shape.length; j = i++) {
    const a = shape[i],
      b = shape[j];
    if (
      a[1] > point[1] !== b[1] > point[1] &&
      point[0] < ((b[0] - a[0]) * (point[1] - a[1])) / (b[1] - a[1]) + a[0]
    )
      inside = !inside;
  }
  return inside;
}

function distanceSquared(point: Point, a: Point, b: Point) {
  const dx = b[0] - a[0],
    dy = b[1] - a[1];
  const t = Math.max(
    0,
    Math.min(
      1,
      ((point[0] - a[0]) * dx + (point[1] - a[1]) * dy) /
        (dx * dx + dy * dy || 1),
    ),
  );
  return (point[0] - a[0] - t * dx) ** 2 + (point[1] - a[1] - t * dy) ** 2;
}

function touches(a: Point[], b: Point[], gutter = 0) {
  const bounds = (shape: Point[]) => [
    Math.min(...shape.map((p) => p[0])),
    Math.min(...shape.map((p) => p[1])),
    Math.max(...shape.map((p) => p[0])),
    Math.max(...shape.map((p) => p[1])),
  ];
  const x = bounds(a),
    y = bounds(b);
  if (
    x[2] + gutter < y[0] ||
    y[2] + gutter < x[0] ||
    x[3] + gutter < y[1] ||
    y[3] + gutter < x[1]
  )
    return false;
  if (a.some((p) => contains(b, p)) || b.some((p) => contains(a, p)))
    return true;
  for (let i = 0; i < a.length; i++)
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
      if (
        gutter > 0 &&
        Math.min(
          distanceSquared(p, r, s),
          distanceSquared(q, r, s),
          distanceSquared(r, p, q),
          distanceSquared(s, p, q),
        ) <
          gutter ** 2
      )
        return true;
    }
  return false;
}

function spacecraft(frame: ProofFrame, name: "claim" | "testament") {
  const pattern = new RegExp(
    `^${name}-ship-spacecraft-(hull|wing-[01]|cockpit|engine-[01])$`,
  );
  return frame.paths
    .filter((p) => pattern.test(p.id) && p.opacity > 0.05)
    .map((p) => ({ id: p.id, points: polygon(p) }));
}

test("mobile T1 has its own clear lane through assembly, loading and the return flight", () => {
  const violations = new Map<string, string>();
  let visibleAssembly = false,
    visibleReturn = false;
  for (const outcome of outcomes)
    for (
      let sample = 0;
      sample <= (outcome === "missing" ? 600 : 900);
      sample++
    ) {
      const selection = sample / 100;
      const frame = journeyLifecycleFrames[outcome](1.7, selection, true);
      const reply = spacecraft(frame, "testament");
      if (reply.length && selection > 2.15 && selection < 3)
        visibleAssembly = true;
      if (reply.length && selection > 4 && selection < 5) visibleReturn = true;
      const obstacles = [
        ...spacecraft(frame, "claim"),
        ...frame.paths
          .filter((p) =>
            /^(posted|holder)-(tooth-\d|post--?1|crossbar|threshold)-(side|top|outline)$/.test(
              p.id,
            ),
          )
          .map((p) => ({
            id: p.id,
            points: p.id.endsWith("outline")
              ? polygon(p).slice(0, 4)
              : polygon(p),
          })),
      ];
      for (const craft of reply)
        for (const obstacle of obstacles) {
          if (touches(craft.points, obstacle.points, 4)) {
            const key = craft.id + ":" + obstacle.id;
            if (!violations.has(key))
              violations.set(
                key,
                `${outcome} ${selection}: ${craft.id} crowds ${obstacle.id}`,
              );
          }
        }
    }
  assert.ok(
    visibleAssembly && visibleReturn,
    "The checks must include the visible birth and return, not hide T1 to avoid collisions",
  );
  assert.equal(
    violations.size,
    0,
    [...violations.values()].slice(0, 16).join("\n"),
  );
});

test("every mobile flight portal retracts its shutters before its spacecraft enters", () => {
  const fullyOpen = journeyLifecycleFrames.pass(0, 5, true);
  const initial = journeyLifecycleFrames.pass(0, 0, true);
  const portals = (
    [
      ["posted", 307, -50, "claim"],
      ["holder", 520, -50, "claim"],
      ["ledger-return", 307, 50, "testament"],
      ["response", 171, 50, "testament"],
    ] as const
  ).map(([id, x, y, craft]) => {
    const project = mobileJourneyGate(x, y);
    const aperture = [
      project(x + 4, y - 30, 6),
      project(x + 4, y + 30, 6),
      project(x + 4, y + 30, 54),
      project(x + 4, y - 30, 54),
    ];
    const shutters = [0, 1, 2].map((tooth) => `${id}-tooth-${tooth}-outline`);
    for (const shutter of shutters)
      assert.notEqual(
        initial.paths.find((p) => p.id === shutter)!.d,
        fullyOpen.paths.find((p) => p.id === shutter)!.d,
        `${shutter} should start closed`,
      );
    return { id, craft, aperture, shutters };
  });
  const violations = new Map<string, { first: number; last: number }>();
  const traversed = new Set<string>();
  for (const outcome of outcomes)
    for (let sample = 0; sample <= 1000; sample++) {
      const selection = sample / 200;
      const frame = journeyLifecycleFrames[outcome](1.7, selection, true);
      for (const portal of portals) {
        if (
          !spacecraft(frame, portal.craft).some((p) =>
            touches(p.points, portal.aperture),
          )
        )
          continue;
        traversed.add(outcome + ":" + portal.id);
        if (
          portal.shutters.some(
            (id) =>
              frame.paths.find((p) => p.id === id)!.d !==
              fullyOpen.paths.find((p) => p.id === id)!.d,
          )
        ) {
          const key = outcome + ":" + portal.id;
          const span = violations.get(key) ?? {
            first: selection,
            last: selection,
          };
          span.last = selection;
          violations.set(key, span);
        }
      }
    }
  assert.equal(
    traversed.size,
    16,
    "Every outcome must traverse both outward and both return portals",
  );
  assert.equal(
    violations.size,
    0,
    [...violations]
      .map(
        ([id, span]) =>
          `${id}: shutters still close across the craft at ${span.first}–${span.last}`,
      )
      .join("\n"),
  );
});

function captionPolygon(label: ProofLabel): Point[] {
  const size = label.kind === "name" ? 13 : 12;
  const width = label.text.length * size * 0.6;
  const left =
    label.x -
    (label.anchor === "end"
      ? width
      : label.anchor === "middle"
        ? width / 2
        : 0);
  return [
    [left - 4, label.y - size - 4],
    [left + width + 4, label.y - size - 4],
    [left + width + 4, label.y + 6],
    [left - 4, label.y + 6],
  ];
}

function captionTouchesPath(box: Point[], path: ProofPath, points: Point[]) {
  // Open wireframe paths must not acquire a fictitious closing edge in the
  // audit. Closed filled faces also need containment checks, not just strokes.
  for (let i = 1; i < points.length; i++)
    if (touches([points[i - 1], points[i]], box)) return true;
  if (!path.d.endsWith(" Z")) return false;
  if (touches([points.at(-1)!, points[0]], box)) return true;
  return (
    (path.kind === "glass" || path.kind === "shade") &&
    box.some((point) => contains(points, point))
  );
}

test("mobile receipt captions and respondent cargo label clear the full animated scene", () => {
  const violations = new Map<string, string>();
  const seen = new Set<string>();
  for (const outcome of outcomes)
    for (
      let sample = 0;
      sample <= (outcome === "missing" ? 240 : 360);
      sample++
    ) {
      const selection = sample / 40;
      for (const time of [0, 0.7, 1.7, 2.9]) {
        const frame = journeyLifecycleFrames[outcome](time, selection, true);
        const hardware = frame.paths
          .filter((path) => path.opacity > 0.1)
          .map((path) => {
            const points = polygon(path);
            return {
              path,
              points,
              bounds: [
                Math.min(...points.map(([x]) => x)),
                Math.min(...points.map(([, y]) => y)),
                Math.max(...points.map(([x]) => x)),
                Math.max(...points.map(([, y]) => y)),
              ],
            };
          });
        for (const caption of frame.labels.filter((label) =>
          /^(holder-title(?:-detail)?|response-title|respondent-party)$/.test(
            label.id,
          ),
        )) {
          seen.add(caption.id);
          const box = captionPolygon(caption);
          assert.ok(
            box[0][0] >= 20 && box[1][0] <= 400,
            `${caption.id} should retain the mobile scene's side gutters`,
          );
          for (const { path, points, bounds } of hardware) {
            if (
              caption.id === "respondent-party" &&
              !/^(work-artifact|artifact-byte|cargo-)/.test(path.id)
            )
              continue;
            if (
              bounds[2] < box[0][0] ||
              bounds[0] > box[1][0] ||
              bounds[3] < box[0][1] ||
              bounds[1] > box[2][1]
            )
              continue;
            if (captionTouchesPath(box, path, points)) {
              const key = caption.id + ":" + path.id;
              if (!violations.has(key))
                violations.set(
                  key,
                  `${outcome} ${selection} time=${time}: ${caption.id} touches ${path.id}`,
                );
            }
          }
        }
      }
    }
  assert.equal(
    seen.size,
    4,
    "Keep both receipt captions and the respondent label visible",
  );
  assert.equal(
    violations.size,
    0,
    [...violations.values()].slice(0, 16).join("\n"),
  );
});
