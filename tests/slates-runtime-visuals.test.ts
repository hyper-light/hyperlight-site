import assert from "node:assert/strict";
import { test } from "node:test";
import type {
  ProofFrame,
  ProofFrameFunction,
  ProofLabel,
} from "../components/proof-work/proof-geometry";
import { ownershipFrame } from "../components/slates/ownership-geometry";
import {
  ownershipLanes,
  ownershipState,
  ownershipSteps,
} from "../components/slates/ownership-data";
import { recoveryFrame } from "../components/slates/recovery-geometry";
import { transportFrame } from "../components/slates/transport-geometry";
import {
  transportOperation,
  transportSteps,
  transportState,
  illustratedCreditCells,
} from "../components/slates/transport-data";
import {
  recoveryRecord,
  recoveryState,
  recoverySteps,
} from "../components/slates/recovery-data";

const values = (path: string) =>
  Array.from(path.matchAll(/-?\d+(?:\.\d+)?/g), ([number]) => Number(number));
const points = (path: string) => {
  const coordinates = values(path);
  const result = Array.from({ length: coordinates.length / 2 }, (_, index) => [
    coordinates[index * 2],
    coordinates[index * 2 + 1],
  ]);
  if (path.endsWith("Z")) result.push(result[0]);
  return result;
};
const path = (frame: ProofFrame, id: string) => {
  const found = frame.paths.find((item) => item.id === id);
  assert.ok(found, id);
  return found;
};
const label = (frame: ProofFrame, id: string) => {
  const found = frame.labels.find((item) => item.id === id);
  assert.ok(found, id);
  return found;
};

type Rect = { left: number; right: number; top: number; bottom: number };
function glyphCorners(
  item: ProofLabel,
  portrait: boolean,
  padding = 0,
): number[][] {
  const fontSize =
    item.kind === "heading"
      ? portrait
        ? 11
        : 9
      : item.kind === "small"
        ? portrait
          ? 12
          : 10
        : portrait
          ? 13
          : 11;
  const width =
    item.text.length *
    fontSize *
    (item.kind === "heading" ? 0.74 : item.kind === "name" ? 0.7 : 0.62);
  const left =
    item.x -
    (item.anchor === "start" ? 0 : item.anchor === "end" ? width : width / 2);
  const local = [
    [left - padding, item.y - fontSize * 0.9 - padding],
    [left + width + padding, item.y - fontSize * 0.9 - padding],
    [left + width + padding, item.y + fontSize * 0.2 + padding],
    [left - padding, item.y + fontSize * 0.2 + padding],
  ];
  const matrix = item.transform
    ?.match(/^matrix\(([^)]+)\)$/)?.[1]
    .split(/\s+/)
    .map(Number);
  if (!matrix) return local;
  const [a, b, c, d, e, f] = matrix;
  return local.map(([x, y]) => [a * x + c * y + e, b * x + d * y + f]);
}
function labelRect(item: ProofLabel, portrait: boolean): Rect {
  const corners = glyphCorners(item, portrait, 1);
  return {
    left: Math.min(...corners.map(([x]) => x)),
    right: Math.max(...corners.map(([x]) => x)),
    top: Math.min(...corners.map(([, y]) => y)),
    bottom: Math.max(...corners.map(([, y]) => y)),
  };
}
function inside(point: number[], polygon: number[][]) {
  const crosses = polygon.map(([x, y], i) => {
    const [nx, ny] = polygon[(i + 1) % polygon.length];
    return (nx - x) * (point[1] - y) - (ny - y) * (point[0] - x);
  });
  return (
    crosses.every((value) => value >= -0.01) ||
    crosses.every((value) => value <= 0.01)
  );
}
function surfaceHost(id: string): string {
  if (/owner-\d-identity|owner-\d-cache-label/.test(id))
    return id.slice(0, 7) + "-core-far";
  if (/owner-\d-queue-label/.test(id)) return id.slice(0, 7) + "-queue-far";
  const volume = id.match(/^(owner-\d)-volume-name-(\d)$/);
  if (volume) return volume[1] + "-volume-" + volume[2] + "-far";
  if (id === "workspace-volume" || id === "workspace-root")
    return "workspace-package-far";
  if (id === "completion-id" || id === "completion-result")
    return "completion-package-far";
  if (id.endsWith("-inscription"))
    return id.replace("-inscription", "-carrier-far");
  if (id === "client-result") return "client-display";
  throw new Error("No reserved surface band for " + id);
}
/** Clip against the actual projected glyph quad, not its oversized screen AABB. */
function segmentInterval(
  start: number[],
  end: number[],
  polygon: number[][],
): [number, number] | undefined {
  let lower = 0;
  let upper = 1;
  const area = polygon.reduce((sum, [x, y], index) => {
    const [nx, ny] = polygon[(index + 1) % polygon.length];
    return sum + x * ny - y * nx;
  }, 0);
  const orientation = Math.sign(area);
  assert.notEqual(orientation, 0, "a clipping face must have projected area");
  for (let index = 0; index < polygon.length; index++) {
    const [x, y] = polygon[index];
    const [nx, ny] = polygon[(index + 1) % polygon.length];
    const atStart =
      orientation * ((nx - x) * (start[1] - y) - (ny - y) * (start[0] - x));
    const rate =
      orientation *
      ((nx - x) * (end[1] - start[1]) - (ny - y) * (end[0] - start[0]));
    if (Math.abs(rate) < 1e-9) {
      if (atStart < -1e-7) return undefined;
    } else if (rate > 0) lower = Math.max(lower, -atStart / rate);
    else upper = Math.min(upper, -atStart / rate);
    if (lower > upper + 1e-7) return undefined;
  }
  return [lower, upper];
}
function quadsOverlap(first: number[][], second: number[][]) {
  return (
    first.some((point) => inside(point, second)) ||
    second.some((point) => inside(point, first)) ||
    first.some((point, index) =>
      segmentInterval(point, first[(index + 1) % first.length], second),
    )
  );
}

/** Only later filled faces belonging to this inscription's own solid occlude it. */
function visibleDetailCrossesGlyph(
  current: ProofFrame,
  detailIndex: number,
  start: number[],
  end: number[],
  glyph: number[][],
  hostId: string,
) {
  const intersection = segmentInterval(start, end, glyph);
  if (!intersection) return false;
  const solidPrefix = hostId.replace(/-(far|left|side|front|top)$/, "");
  const covers = current.paths
    .flatMap((candidate, index) => {
      if (
        index <= detailIndex ||
        candidate.opacity * (candidate.fillOpacity ?? 1) <= 0.08 ||
        !candidate.material ||
        candidate.material === "shadow" ||
        candidate.material === "emissive" ||
        !new RegExp("^" + solidPrefix + "-(far|left|side|front|top)$").test(
          candidate.id,
        )
      )
        return [];
      const interval = segmentInterval(
        start,
        end,
        points(candidate.d).slice(0, 4),
      );
      return interval ? [interval] : [];
    })
    .sort(([a], [b]) => a - b);
  let coveredUntil = intersection[0];
  for (const [lower, upper] of covers) {
    if (lower > coveredUntil + 1e-7) break;
    if (upper >= coveredUntil) coveredUntil = upper;
    if (coveredUntil >= intersection[1] - 1e-7) return false;
  }
  return true;
}

test("projected clearance distinguishes a slanted glyph from its screen bounds and only hides occluded detail", () => {
  const diamond = [
    [0, 1],
    [1, 0],
    [2, 1],
    [1, 2],
  ];
  assert.equal(segmentInterval([1.8, 1.8], [2, 2], diamond), undefined);
  assert.deepEqual(segmentInterval([-1, 1], [3, 1], diamond), [0.25, 0.75]);
  assert.equal(
    quadsOverlap(
      diamond,
      diamond.map(([x, y]) => [x + 1.8, y + 1.8]),
    ),
    false,
  );
  assert.equal(
    quadsOverlap(
      diamond,
      diamond.map(([x, y]) => [x + 0.8, y + 0.8]),
    ),
    true,
  );

  const detail: ProofFrame["paths"][number] = {
    id: "package-contact",
    d: "M12 20 L28 20",
    opacity: 1,
    kind: "fine",
  };
  const face: ProofFrame["paths"][number] = {
    id: "reserved-package-far",
    d: "M10 10 L30 10 L30 30 L10 30 Z",
    opacity: 1,
    kind: "glass",
    material: "metal",
  };
  const glyph = [
    [15, 15],
    [25, 15],
    [25, 25],
    [15, 25],
  ];
  const covered = { paths: [detail, face], labels: [] };
  assert.equal(
    visibleDetailCrossesGlyph(covered, 0, [12, 20], [28, 20], glyph, face.id),
    false,
  );
  assert.equal(
    visibleDetailCrossesGlyph(
      { paths: [face, detail], labels: [] },
      1,
      [12, 20],
      [28, 20],
      glyph,
      face.id,
    ),
    true,
    "raised detail drawn after the inscription face must still fail",
  );
  assert.equal(
    visibleDetailCrossesGlyph(
      covered,
      0,
      [12, 20],
      [28, 20],
      glyph,
      "unrelated-package-far",
    ),
    true,
    "an unrelated face cannot exempt an inscription collision",
  );
  assert.equal(
    visibleDetailCrossesGlyph(
      {
        paths: [detail, { ...face, d: "M10 10 L20 10 L20 30 L10 30 Z" }],
        labels: [],
      },
      0,
      [12, 20],
      [28, 20],
      glyph,
      face.id,
    ),
    true,
    "partial coverage leaves the exposed segment subject to clearance",
  );
});

for (const [name, frame] of [
  ["ownership", ownershipFrame],
  ["recovery", recoveryFrame],
  ["transport", transportFrame],
] satisfies [string, ProofFrameFunction][]) {
  test(`${name}: ambient motion changes only explicit status-light opacity`, () => {
    for (const portrait of [false, true]) {
      const initial = frame(0, 1.9, portrait);
      const changed = new Set<string>();
      for (const time of [0.03, 0.9, 2.7, 42]) {
        const later = frame(time, 1.9, portrait);
        assert.deepEqual(later.labels, initial.labels);
        later.paths.forEach((item, index) => {
          const { opacity, ...constant } = item;
          const { opacity: before, ...original } = initial.paths[index];
          assert.deepEqual(
            constant,
            original,
            item.id + " has fixed geometry, material and styling",
          );
          if (opacity !== before) {
            assert.match(
              item.id,
              /-activity-|-session-light$|^anchor-alive-light$/,
            );
            changed.add(item.id);
          }
        });
      }
      assert.ok(
        changed.size > 0,
        "running hardware has visible status activity",
      );
    }
  });
  test(`${name}: every fractional stage is bounded, deterministic and has fixed SVG topology`, () => {
    for (const portrait of [false, true]) {
      const first = frame(0, 0, portrait);
      const pathIds = first.paths.map(({ id }) => id);
      const labelIds = first.labels.map(({ id }) => id);
      assert.equal(new Set(pathIds).size, pathIds.length);
      assert.equal(new Set(labelIds).size, labelIds.length);
      for (let sample = 0; sample <= 150; sample++) {
        const selection = sample / 50;
        const current = frame(0, selection, portrait);
        const later = frame(42, selection, portrait);
        assert.deepEqual(
          current.labels,
          later.labels,
          "ambient activity never moves or changes labels",
        );
        current.paths.forEach((item, index) => {
          assert.equal(
            item.d,
            later.paths[index].d,
            "ambient time never moves a camera or hardware",
          );
          assert.equal(
            item.material,
            later.paths[index].material,
            "mounted material stays fixed",
          );
          if (!/-activity-|-session-light$|^anchor-alive-light$/.test(item.id))
            assert.deepEqual(
              item,
              later.paths[index],
              "only explicit processor/session status lights pulse",
            );
        });
        assert.deepEqual(
          current.paths.map(({ id }) => id),
          pathIds,
        );
        assert.deepEqual(
          current.labels.map(({ id }) => id),
          labelIds,
        );
        current.paths.forEach((item, index) => {
          const coordinates = values(item.d);
          assert.equal(
            item.material,
            first.paths[index].material,
            item.id + " material must remain mounted",
          );
          assert.equal(
            coordinates.length,
            values(first.paths[index].d).length,
            item.id,
          );
          assert.ok(item.opacity >= 0 && item.opacity <= 1, item.id);
          coordinates.forEach((coordinate, axis) =>
            assert.ok(
              Number.isFinite(coordinate) &&
                coordinate >= 8 &&
                coordinate <=
                  (axis % 2 ? (portrait ? 736 : 512) : portrait ? 412 : 792),
              `${name}/${portrait}/${selection}/${item.id}: ${coordinate}`,
            ),
          );
        });
        for (const item of current.labels) {
          const rect = labelRect(item, portrait);
          assert.ok(
            rect.left >= 8 &&
              rect.right <= (portrait ? 412 : 792) &&
              rect.top >= 8 &&
              rect.bottom <= (portrait ? 736 : 512),
            `${name}/${portrait}/${selection}/${item.id} lettering bounds`,
          );
        }
      }
    }
  });

  test(`${name}: continuous packet travel and replacement hardware never snap`, () => {
    for (const portrait of [false, true])
      for (const boundary of [
        0, 0.1, 0.9, 1, 1.08, 1.65, 1.7, 2, 2.05, 2.5, 2.58, 3,
      ]) {
        const before = frame(0, boundary - 0.000001, portrait);
        const after = frame(0, boundary + 0.000001, portrait);
        before.paths.forEach((item, index) => {
          const prior = values(item.d);
          values(after.paths[index].d).forEach((coordinate, axis) =>
            assert.ok(
              Math.abs(coordinate - prior[axis]) < 0.01,
              `${name}/${portrait}/${boundary}/${item.id}`,
            ),
          );
          assert.ok(
            Math.abs(item.opacity - after.paths[index].opacity) < 0.0001,
            item.id,
          );
        });
      }
  });

  test(`${name}: lettering has a fixed clear gutter throughout every transition`, () => {
    const collisions = new Set<string>();
    const check = (clear: unknown, detail: string) => {
      if (!clear) collisions.add(detail);
    };
    for (const portrait of [false, true])
      for (let sample = 0; sample <= 120; sample++) {
        const selection = sample / 40;
        const current = frame(0, selection, portrait);
        const visible = current.labels.filter(
          (item) => (item.opacity ?? 1) > 0.08,
        );
        for (const item of visible) {
          const glyph = glyphCorners(item, portrait, 1);
          // Projected inscriptions are tested against their actual face below;
          // external callouts still require a clear gutter from every edge.
          for (const hardware of current.paths.filter(
            ({ opacity }) => opacity > 0.08 && !item.surface,
          )) {
            const vertices = points(hardware.d);
            for (let segment = 1; segment < vertices.length; segment++)
              check(
                !segmentInterval(
                  vertices[segment - 1],
                  vertices[segment],
                  glyph,
                ),
                `${name}/${portrait}/${selection}: ${item.id} intersects ${hardware.id}`,
              );
          }
          if (item.surface) {
            const host = path(current, surfaceHost(item.id));
            const polygon = points(host.d).slice(0, 4);
            for (const corner of glyphCorners(item, portrait))
              check(
                inside(corner, polygon),
                name +
                  "/" +
                  portrait +
                  "/" +
                  selection +
                  ": " +
                  item.id +
                  " leaves reserved face " +
                  host.id,
              );
            // Raised slots, pin rows and etched data are never part of an
            // inscription band. Back-plane traces are intentionally occluded.
            const detail = current.paths.filter(
              (candidate) =>
                candidate.opacity > 0.08 &&
                /contact-|package-pin-|socket-contact-|activity-|slot-\d|volume-\d-cell|^owner-\d-(request|write|completion)-|^(rebuild-packet|retry-packet|original-result-packet)-|^(original-request|lost-result|retried-request|recorded-result|consumed-content-\d)-/.test(
                  candidate.id,
                ),
            );
            for (const candidate of detail) {
              const vertices = points(candidate.d);
              for (let i = 1; i < vertices.length; i++)
                check(
                  !visibleDetailCrossesGlyph(
                    current,
                    current.paths.indexOf(candidate),
                    vertices[i - 1],
                    vertices[i],
                    glyph,
                    host.id,
                  ),
                  `${name}/${portrait}/${selection}: ${item.id} intersects raised detail ${candidate.id}`,
                );
            }
          }
          for (const other of visible.filter(
            (candidate) => candidate.id > item.id,
          )) {
            check(
              !quadsOverlap(glyph, glyphCorners(other, portrait, 1)),
              `${name}/${portrait}/${selection}: ${item.id} overlaps ${other.id}`,
            );
          }
        }
      }
    const summaries = new Map<string, { first: string; last: string }>();
    for (const collision of collisions) {
      const key = collision.replace(
        /\/(false|true)\/[\d.]+:/,
        "/$1/transition:",
      );
      const existing = summaries.get(key);
      summaries.set(key, {
        first: existing?.first ?? collision,
        last: collision,
      });
    }
    assert.equal(
      collisions.size,
      0,
      [...summaries.values()]
        .slice(0, 40)
        .map(({ first, last }) =>
          first === last ? first : first + "\nthrough " + last,
        )
        .join("\n"),
    );
  });
}

test("ownership routes distinct volumes to separate cores and applies only after queue delivery", () => {
  assert.deepEqual(
    ownershipSteps.map(({ label }) => label),
    ["Route", "Queue", "Apply", "Reply"],
  );
  assert.match(
    ownershipSteps[2].description,
    /Immutable shared content can still be read/,
  );
  for (const portrait of [false, true]) {
    const initial = ownershipFrame(0, 0, portrait);
    const cores: Rect[] = [];
    ownershipLanes.forEach((lane, index) => {
      const prefix = "owner-" + index;
      const queued = ownershipFrame(0, 1, portrait),
        delivered = ownershipFrame(0, 1.65, portrait),
        applied = ownershipFrame(0, 2, portrait),
        completed = ownershipFrame(0, 3, portrait);
      assert.equal(label(initial, prefix + "-id").text, lane.volume);
      assert.equal(label(initial, prefix + "-identity").text, lane.shard);
      const changed = prefix + "-volume-0-cell-1-write";
      assert.equal(path(initial, changed).opacity, 0);
      assert.equal(path(delivered, changed).opacity, 0);
      assert.equal(path(applied, changed).opacity, 0.92);
      for (let cell = 0; cell < 4; cell++)
        assert.equal(
          path(applied, prefix + "-volume-1-cell-" + cell + "-write").opacity,
          0,
        );
      assert.equal(path(queued, prefix + "-completion-top").opacity, 0);
      assert.equal(path(completed, prefix + "-completion-top").opacity, 1);
      assert.notEqual(
        path(initial, prefix + "-request-top").d,
        path(queued, prefix + "-request-top").d,
      );
      assert.notEqual(
        path(queued, prefix + "-request-top").d,
        path(delivered, prefix + "-request-top").d,
      );
      const queuedSlot = portrait ? 2 : 1;
      assert.equal(
        path(queued, prefix + "-slot-filled-" + queuedSlot).opacity,
        0.85,
      );
      assert.equal(
        path(delivered, prefix + "-slot-filled-" + queuedSlot).opacity,
        0,
      );
      assert.equal(
        initial.paths.filter(
          ({ id }) => id.startsWith(prefix) && /-slot-\d-top$/.test(id),
        ).length,
        3,
      );
      const vertices = points(path(initial, prefix + "-core-top").d);
      cores.push({
        left: Math.min(...vertices.map(([x]) => x)),
        right: Math.max(...vertices.map(([x]) => x)),
        top: Math.min(...vertices.map(([, y]) => y)),
        bottom: Math.max(...vertices.map(([, y]) => y)),
      });
      assert.ok(
        points(path(initial, prefix + "-queue-top").d).every(
          ([, y]) => y < cores[index].top - 20,
        ),
        "the admission queue is exploded above its own execution plane",
      );
    });
    assert.equal(
      initial.paths.filter(({ id }) => id === "processor-substrate-top").length,
      1,
      "all three owner lanes share one processor package",
    );
    for (let index = 1; index < 3; index++)
      assert.ok(
        cores[index].left > cores[index - 1].left + 60,
        "each owner retains a separate lane",
      );
  }
  assert.equal(ownershipState(1.4).applying, 0);
});

test("transport content occupies only the granted window and releases it when consumed", () => {
  const full = transportState(0.25);
  const consumed = transportState(0.7);
  assert.equal(full.contentCells.length, illustratedCreditCells);
  assert.ok(full.contentCells.every(({ occupied }) => occupied === 1));
  assert.ok(
    consumed.contentCells.every(
      ({ consumed, occupied }) => consumed === 1 && occupied === 0,
    ),
  );
  for (let sample = 0; sample <= 150; sample++) {
    const state = transportState(sample / 50);
    const occupied = state.contentCells.reduce(
      (sum, cell) => sum + cell.occupied,
      0,
    );
    assert.ok(occupied >= 0 && occupied <= illustratedCreditCells);
    assert.ok(
      state.contentCells.every((cell) => cell.consumed <= cell.admitted),
    );
  }
  for (const portrait of [false, true]) {
    const fullFrame = transportFrame(0, 0.25, portrait);
    const consumedFrame = transportFrame(0, 0.7, portrait);
    for (let cell = 0; cell < illustratedCreditCells; cell++) {
      assert.equal(path(fullFrame, `credited-bytes-${cell}`).opacity, 0.85);
      assert.equal(path(consumedFrame, `credited-bytes-${cell}`).opacity, 0);
    }
    assert.equal(label(consumedFrame, "content-consumed").opacity, 1);
  }
});

test("transport keeps the cable interior transparent in both layouts throughout every stage", () => {
  for (const portrait of [false, true])
    for (let sample = 0; sample <= 120; sample++)
      for (const time of [0, 42]) {
        const selection = sample / 40;
        const interior = path(
          transportFrame(time, selection, portrait),
          "jacket-interior",
        );
        assert.equal(
          interior.opacity,
          0,
          `cable interior must reveal the scene background: portrait=${portrait}, selection=${selection}, time=${time}`,
        );
      }
});

test("transport opens three logical streams from one physical socket at each endpoint", () => {
  for (const portrait of [false, true]) {
    const frame = transportFrame(0, 0, portrait);
    assert.equal(
      frame.paths.filter(({ id }) => id.endsWith("-network-board-top")).length,
      2,
    );
    assert.equal(
      frame.paths.filter(({ id }) => id.endsWith("-socket-housing-top")).length,
      2,
    );
    for (const endpoint of ["origin", "owner"])
      assert.equal(
        frame.paths.filter(
          ({ id }) =>
            id.startsWith(`${endpoint}-socket-contact-`) && id.endsWith("-top"),
        ).length,
        8,
      );
    const outbound = points(path(frame, "request-stream").d);
    const inbound = points(path(frame, "reply-stream").d);
    assert.deepEqual(outbound[0], inbound.at(-1));
    assert.deepEqual(outbound.at(-1), inbound[0]);
    for (const selection of [0.74, 0.78, 0.82, 0.86, 0.9]) {
      const current = transportFrame(0, selection, portrait);
      const vertices = points(path(current, "lost-result-top").d).slice(0, 4);
      const x = vertices.reduce((sum, point) => sum + point[0], 0) / 4 - 1.8;
      const y = vertices.reduce((sum, point) => sum + point[1], 0) / 4 + 3;
      const distances = inbound.slice(1).map(([endX, endY], index) => {
        const [startX, startY] = inbound[index];
        const dx = endX - startX;
        const dy = endY - startY;
        const progress = Math.max(
          0,
          Math.min(
            1,
            ((x - startX) * dx + (y - startY) * dy) / (dx * dx + dy * dy),
          ),
        );
        return Math.hypot(
          x - startX - progress * dx,
          y - startY - progress * dy,
        );
      });
      assert.ok(
        Math.min(...distances) < 0.002,
        "the lost reply follows the cable, not a straight shortcut across the cutaway",
      );
    }
  }
});

test("transport replaces the session without replacing the request or repeating its effect", () => {
  assert.deepEqual(
    transportSteps.map(({ label }) => label),
    ["Send", "Loss", "Retry", "Complete"],
  );
  assert.match(
    transportSteps[3].description,
    /Packet acknowledgements recover transport delivery/,
  );
  for (const portrait of [false, true]) {
    const initial = transportFrame(0, 0, portrait);
    const hardware = initial.paths.filter(({ id }) =>
      /^(origin|owner)-(network-board|mounting-hole|board-trace|controller(?:-|$)|socket-|release-latch|latch-grip|boot-)|^jacket-|^credit-(block|cell)-/.test(
        id,
      ),
    );
    assert.ok(
      hardware.length > 200,
      "both adapters, plug contacts, sleeves and the cutaway jacket are physical hardware",
    );
    const lost = transportFrame(0, 1, portrait);
    const retried = transportFrame(0, 2, portrait);
    const complete = transportFrame(0, 3, portrait);
    assert.equal(label(initial, "effect-count").text, "SNAPSHOTS · 0");
    assert.equal(label(lost, "effect-count").text, "SNAPSHOTS · 1");
    assert.equal(label(lost, "session-id").text, "SESSION A · LOST");
    assert.equal(path(lost, "lost-result-top").opacity, 0);
    assert.equal(path(lost, "lost-reply-mark-a").opacity, 1);
    assert.equal(label(retried, "session-id").text, "SESSION B · SAME R17");
    assert.equal(label(complete, "completion-record").text, "R17 → S7");
    assert.equal(path(complete, "recorded-result-top").opacity, 1);
    assert.equal(
      initial.paths.filter(({ id }) => /^credit-cell-/.test(id)).length,
      illustratedCreditCells,
    );
    for (let sample = 0; sample <= 120; sample++) {
      const selection = sample / 40;
      const current = transportFrame(0, selection, portrait);
      for (const original of hardware)
        assert.deepEqual(
          path(current, original.id),
          original,
          original.id +
            " stays fixed and visible while the logical session is replaced",
        );
      assert.equal(
        label(current, "request-id").text,
        transportOperation.request,
      );
      assert.equal(label(current, "result-id").text, transportOperation.result);
      assert.ok(transportState(selection).effects <= 1);
      for (let cell = 0; cell < illustratedCreditCells; cell++) {
        const bounds = points(path(current, `credit-cell-${cell}`).d);
        const left = Math.min(...bounds.map(([x]) => x));
        const right = Math.max(...bounds.map(([x]) => x));
        const top = Math.min(...bounds.map(([, y]) => y));
        const bottom = Math.max(...bounds.map(([, y]) => y));
        for (const [x, y] of points(path(current, `credited-bytes-${cell}`).d))
          assert.ok(
            x > left && x < right && y > top && y < bottom,
            "sent bytes stay within granted credit",
          );
      }
    }
  }
});

test("saved results use an unstretched circular receipt mark", () => {
  for (const portrait of [false, true]) {
    const frame = recoveryFrame(0, 0, portrait);
    const ring = points(path(frame, "completion-seal-ring").d);
    const width = Math.max(...ring.map(([x]) => x)) - Math.min(...ring.map(([x]) => x));
    const height = Math.max(...ring.map(([,y]) => y)) - Math.min(...ring.map(([,y]) => y));
    assert.ok(Math.abs(width - height) < 0.001);
    assert.equal(width, 26);
    const tick = points(path(frame, "completion-seal").d);
    assert.equal(tick.length, 3);
    assert.ok(Math.abs(tick[2][0] - tick[0][0] - 11) < 0.001);
    assert.ok(Math.abs(tick[1][1] - tick[2][1] - 9) < 0.001);
  }
});

test("recovery retains actual workspace bytes, roots and completion while the daemon is absent", () => {
  assert.deepEqual(
    recoverySteps.map(({ label }) => label),
    ["Running", "Restart", "Recover", "Retry"],
  );
  assert.match(recoverySteps[3].description, /not a loss of host power/);
  for (const portrait of [false, true]) {
    const initial = recoveryFrame(0, 0, portrait);
    const retainedIds = initial.paths
      .filter(({ id }) =>
        /^(retained-ram|workspace-|completion-|effect-result-brace|anchor-)/.test(
          id,
        ),
      )
      .map(({ id }) => id);
    assert.ok(
      retainedIds.some((id) => id.startsWith("workspace-bytes-")),
      "recovery includes bytes, not only a catalog identity",
    );
    assert.equal(
      retainedIds.filter((id) => /^retained-ram-contact-\d+-top$/.test(id))
        .length,
      26,
      "the retained image lives on the fixed keyed memory board",
    );
    assert.ok(retainedIds.includes("workspace-package-top"));
    assert.ok(retainedIds.includes("completion-package-top"));
    for (let sample = 0; sample <= 120; sample++) {
      const selection = sample / 40;
      const current = recoveryFrame(0, selection, portrait);
      for (const id of retainedIds)
        assert.deepEqual(path(current, id), path(initial, id), id);
      assert.equal(
        label(current, "workspace-volume").text,
        recoveryRecord.volume,
      );
      assert.equal(
        label(current, "workspace-root").text,
        `root ${recoveryRecord.root}`,
      );
      assert.equal(
        label(current, "completion-id").text,
        recoveryRecord.request,
      );
      assert.equal(
        label(current, "completion-result").text,
        `→ ${recoveryRecord.result}`,
      );
      assert.equal(label(current, "effect-count").text, "EFFECTS · 1");
      assert.equal(recoveryState(selection).anchorAlive, true);
    }
    for (const time of [0.03, 0.9, 2.7, 42]) {
      const stoppedWhileTimePasses = recoveryFrame(time, 1, portrait);
      for (const id of retainedIds.filter((id) => id !== "anchor-alive-light"))
        assert.deepEqual(
          path(stoppedWhileTimePasses, id),
          path(initial, id),
          id +
            " retains bytes and hardware even while the replacement daemon is absent",
        );
    }
    const stopped = recoveryFrame(0, 1, portrait);
    assert.equal(path(stopped, "original-daemon-carrier-top").opacity, 0);
    assert.equal(path(stopped, "replacement-daemon-carrier-top").opacity, 0);
    assert.equal(label(stopped, "daemon-state").text, "stopped");
    const recovered = recoveryFrame(0, 2, portrait);
    assert.ok(path(recovered, "replacement-daemon-carrier-top").opacity > 0.8);
    assert.equal(label(recovered, "restored-state").opacity, 1);
    const retried = recoveryFrame(0, 3, portrait);
    assert.equal(label(retried, "client-result").text, recoveryRecord.result);
    assert.equal(path(retried, "retry-packet-top").opacity, 0);
    assert.equal(path(retried, "original-result-packet-top").opacity, 1);
  }
});
