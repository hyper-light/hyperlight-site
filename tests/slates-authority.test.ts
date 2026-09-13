import assert from "node:assert/strict";
import { test } from "node:test";
import type { ProofLabel } from "../components/proof-work/proof-geometry";
import {
  authorityHistory,
  authorityActivity,
  authorityState,
  authoritySteps,
} from "../components/slates/authority-data";
import { authorityFrame } from "../components/slates/authority-geometry";

const coordinates = (path: string) =>
  Array.from(path.matchAll(/-?\d+(?:\.\d+)?/g), ([number]) => Number(number));
function matrix(item: ProofLabel) {
  if (!item.transform) return [1, 0, 0, 1, 0, 0];
  assert.match(item.transform, /^matrix\(/);
  const values = item.transform.slice(7, -1).trim().split(/[ ,]+/).map(Number);
  assert.equal(values.length, 6);
  assert.ok(values.every(Number.isFinite));
  assert.ok(
    item.surface,
    "Transformed lettering belongs to a named physical surface",
  );
  return values;
}
function localLettering(item: ProofLabel, portrait: boolean) {
  const size =
    item.kind === "heading"
      ? portrait
        ? 11
        : 9
      : item.kind === "name"
        ? portrait
          ? 13
          : 11
        : portrait
          ? 12
          : 10;
  const width =
    item.text.length *
    size *
    (item.kind === "heading" ? 0.74 : item.kind === "name" ? 0.7 : 0.62);
  const left =
    item.x -
    (item.anchor === "start" ? 0 : item.anchor === "end" ? width : width / 2);
  return {
    left: left - 2,
    right: left + width + 2,
    top: item.y - size * 0.9 - 2,
    bottom: item.y + size * 0.2 + 2,
  };
}
function corners(item: ProofLabel, portrait: boolean) {
  const rect = localLettering(item, portrait),
    [a, b, c, d, e, f] = matrix(item);
  return [
    [rect.left, rect.top],
    [rect.right, rect.top],
    [rect.right, rect.bottom],
    [rect.left, rect.bottom],
  ].map(([x, y]) => [a * x + c * y + e, b * x + d * y + f]);
}
function lettering(item: ProofLabel, portrait: boolean) {
  const points = corners(item, portrait);
  return {
    left: Math.min(...points.map(([x]) => x)),
    right: Math.max(...points.map(([x]) => x)),
    top: Math.min(...points.map(([, y]) => y)),
    bottom: Math.max(...points.map(([, y]) => y)),
  };
}
function inscriptionsOverlap(
  item: ProofLabel,
  other: ProofLabel,
  portrait: boolean,
) {
  const left = corners(item, portrait),
    right = corners(other, portrait);
  return ![left, right].some((points) =>
    points.some((p, i) => {
      const q = points[(i + 1) % points.length],
        axis = [q[1] - p[1], p[0] - q[0]];
      const a = left.map(([x, y]) => x * axis[0] + y * axis[1]),
        b = right.map(([x, y]) => x * axis[0] + y * axis[1]);
      return Math.max(...a) < Math.min(...b) || Math.max(...b) < Math.min(...a);
    }),
  );
}
function localPoint(point: number[], item: ProofLabel) {
  const [a, b, c, d, e, f] = matrix(item),
    determinant = a * d - b * c,
    x = point[0] - e,
    y = point[1] - f;
  assert.ok(Math.abs(determinant) > 0.0001);
  return [(d * x - c * y) / determinant, (-b * x + a * y) / determinant];
}
function touches(
  start: number[],
  end: number[],
  rect: ReturnType<typeof lettering>,
) {
  let lower = 0;
  let upper = 1;
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  for (const [denominator, numerator] of [
    [-dx, start[0] - rect.left],
    [dx, rect.right - start[0]],
    [-dy, start[1] - rect.top],
    [dy, rect.bottom - start[1]],
  ]) {
    if (denominator === 0) {
      if (numerator < 0) return false;
    } else if (denominator < 0)
      lower = Math.max(lower, numerator / denominator);
    else upper = Math.min(upper, numerator / denominator);
    if (lower > upper) return false;
  }
  return true;
}

test("authority: suspicion cannot promote; adoption precedes service; old epoch stays refused", () => {
  assert.equal(authoritySteps.length, 6);
  const suspected = authorityState(1);
  assert.equal(suspected.epoch, 4);
  assert.equal(suspected.owner, "A");
  assert.equal(suspected.service, 0);
  const authorized = authorityState(2);
  assert.equal(authorized.owner, null);
  assert.deepEqual(authorized.holderFences, { B: 5, C: 5 });
  assert.equal(authorized.adoptedVersion, null);
  const adopted = authorityState(3);
  assert.equal(adopted.adoptedVersion, "v7");
  assert.equal(adopted.servedVersion, null);
  assert.equal(adopted.owner, null);
  assert.equal(authorityState(4).owner, "B");
  assert.equal(authorityState(4).servedVersion, "v7");
  assert.equal(authorityState(5).rejected, true);
  assert.deepEqual(
    authorityHistory.commitHolders.filter((holder) =>
      authorityHistory.promiseHolders.some((promise) => promise === holder),
    ),
    ["B"],
  );
  for (const portrait of [false, true]) {
    const authorizedFrame = authorityFrame(0, 2, portrait);
    for (const candidate of authorityHistory.candidates)
      assert.equal(
        authorizedFrame.paths.find(
          ({ id }) => id === `installed-fence-${candidate}`,
        )?.opacity,
        candidate === "A" ? 0 : 0.8,
        `surviving holder ${candidate} installs the fence without contacting failed A`,
      );
    assert.equal(
      authorizedFrame.paths.find(({ id }) => id === "new-write-route")?.opacity,
      0,
      "the council decision alone must not display B serving",
    );
    const served = authorityFrame(0, 4, portrait);
    assert.equal(
      served.labels.find(({ id }) => id === "role-B")?.text,
      "OWNER",
    );
    assert.equal(
      served.labels.find(({ id }) => id === "initial-C")?.text,
      "v7",
      "recommit updates the second holder before service",
    );
    assert.equal(
      served.labels.find(({ id }) => id === "machine-epoch-A")?.text,
      "E4",
      "the failed machine retains its old ownership epoch",
    );
    assert.equal(
      served.labels.find(({ id }) => id === "machine-epoch-B")?.text,
      "E5",
    );
    for (const candidate of authorityHistory.candidates) {
      assert.ok(
        served.paths.some(({ id }) => id === `machine-${candidate}-ram`),
      );
      assert.ok(
        served.paths.some(({ id }) => id === `machine-${candidate}-front`),
      );
    }
  }
});

test("authority: fixed topology and lettering remain inside both independently composed canvases", () => {
  for (const portrait of [false, true]) {
    const initial = authorityFrame(0, 0, portrait);
    const ids = initial.paths.map(({ id }) => id);
    assert.equal(new Set(ids).size, ids.length);
    assert.equal(
      new Set(initial.labels.map(({ id }) => id)).size,
      initial.labels.length,
    );
    for (let sample = 0; sample <= 200; sample++) {
      const selection = sample / 40;
      const frame = authorityFrame(0, selection, portrait);
      const later = authorityFrame(91, selection, portrait);
      assert.deepEqual(
        frame.labels.filter(({ id }) => id !== "activity-caption"),
        later.labels.filter(({ id }) => id !== "activity-caption"),
        "Camera and inscriptions stay fixed while fans and requests move",
      );
      frame.paths.forEach((path, index) => {
        if (
          !/^machine-[ABC]-blade-|^rack-health-sweep-|^activity-(?:own-|suspect-|authorize-|adopt-|serve-|refused-|probe-timer|probe-timeout|installed-|refusal-impact)/.test(
            path.id,
          )
        )
          assert.deepEqual(
            path,
            later.paths[index],
            `${path.id}: ambient time moved a structural part or a protocol state`,
          );
      });
      assert.deepEqual(
        frame.paths.map(({ id }) => id),
        ids,
      );
      assert.deepEqual(
        frame.labels.map(({ id }) => id),
        initial.labels.map(({ id }) => id),
      );
      frame.paths.forEach((path, index) => {
        const points = coordinates(path.d);
        assert.equal(
          points.length,
          coordinates(initial.paths[index].d).length,
          path.id,
        );
        assert.ok(path.opacity >= 0 && path.opacity <= 1, path.id);
        points.forEach((value, axis) =>
          assert.ok(
            Number.isFinite(value) &&
              value >= 8 &&
              value <=
                (axis % 2 ? (portrait ? 736 : 512) : portrait ? 412 : 792),
            `${portrait}/${selection}/${path.id}: ${value}`,
          ),
        );
      });
      for (const item of frame.labels) {
        const rect = lettering(item, portrait);
        assert.ok(
          rect.left >= 8 &&
            rect.right <= (portrait ? 412 : 792) &&
            rect.top >= 8 &&
            rect.bottom <= (portrait ? 736 : 512),
          `${portrait}/${selection}/${item.id}`,
        );
      }
    }
  }
});

test("authority: every label keeps a clear gutter throughout the full handoff", () => {
  for (const portrait of [false, true])
    for (let sample = 0; sample <= 200; sample++) {
      const selection = sample / 40;
      const frame = authorityFrame(0, selection, portrait);
      for (const item of frame.labels.filter(
        ({ opacity }) => (opacity ?? 1) > 0.08,
      )) {
        for (const other of frame.labels.filter(
          (candidate) =>
            candidate.id > item.id && (candidate.opacity ?? 1) > 0.08,
        )) {
          assert.ok(
            !inscriptionsOverlap(item, other, portrait),
            `${portrait}/${selection}: ${item.id} vs ${other.id}`,
          );
        }
        for (const path of frame.paths.filter(
          ({ opacity }) => opacity > 0.08,
        )) {
          // These rear surfaces are masked by the opaque front carrying the
          // inscription. Do not mistake hidden rear edges for text collisions.
          const machine = /^machine-([ABC])$/.exec(item.surface ?? "")?.[1];
          if (
            machine &&
            (new RegExp(
              `^rack-(?:shadow|side|top)(?:-vent)?-${machine}(?:-|$)`,
            ).test(path.id) ||
              new RegExp(`^rack-foot-${machine}-.*-rear-`).test(path.id))
          )
            continue;
          const nums = coordinates(path.d);
          const points = Array.from({ length: nums.length / 2 }, (_, index) => [
            nums[index * 2],
            nums[index * 2 + 1],
          ]);
          if (path.d.endsWith("Z")) points.push(points[0]);
          for (let segment = 1; segment < points.length; segment++)
            assert.ok(
              !touches(
                localPoint(points[segment - 1], item),
                localPoint(points[segment], item),
                localLettering(item, portrait),
              ),
              `${portrait}/${selection}: ${item.id} vs ${path.id}`,
            );
        }
      }
    }
});

test("authority: motions are continuous and the stale request never crosses the installed fence", () => {
  for (const portrait of [false, true]) {
    for (const boundary of [
      0, 0.15, 1, 1.15, 2, 2.15, 3, 3.15, 4, 4.1, 4.85, 5,
    ]) {
      const before = authorityFrame(0, boundary - 0.000001, portrait);
      const after = authorityFrame(0, boundary + 0.000001, portrait);
      before.paths.forEach((path, index) => {
        const prior = coordinates(path.d);
        coordinates(after.paths[index].d).forEach((value, axis) =>
          assert.ok(Math.abs(value - prior[axis]) < 0.01, path.id),
        );
        assert.ok(
          Math.abs(path.opacity - after.paths[index].opacity) < 0.0001,
          path.id,
        );
      });
    }
    for (let step = 160; step <= 200; step++) {
      const frame = authorityFrame(0, step / 40, portrait);
      for (const path of frame.paths.filter(({ id }) =>
        id.startsWith("stale-request"),
      )) {
        const values = coordinates(path.d).filter(
          (_, index) => index % 2 === 0,
        );
        assert.ok(
          Math.max(...values) < (portrait ? 153 : 301),
          `${portrait}/${step}: stale request stays on the old side of the barrier`,
        );
      }
    }
  }
});

test("authority: front-mounted activity stays visible and a failed machine stops its fans", () => {
  for (const portrait of [false, true]) {
    for (const selection of [0, 1, 2, 3, 4, 5]) {
      const early = authorityFrame(0.1, selection, portrait),
        late = authorityFrame(0.7, selection, portrait);
      for (const candidate of authorityHistory.candidates) {
        const front = early.paths.findIndex(
          ({ id }) => id === `machine-${candidate}-front`,
        );
        const sweep = early.paths.findIndex(
          ({ id }) => id === `rack-health-sweep-${candidate}`,
        );
        assert.ok(
          front >= 0 && sweep > front,
          `${candidate}: opaque front hides its health sweep`,
        );
        const a = early.paths.find(
          ({ id }) => id === `machine-${candidate}-blade-0-0`,
        )!.d;
        const b = late.paths.find(
          ({ id }) => id === `machine-${candidate}-blade-0-0`,
        )!.d;
        if (candidate === "A" && selection >= 1 && selection <= 4)
          assert.equal(a, b, "Failed A must stop its fan, not disappear");
        else
          assert.notEqual(
            a,
            b,
            `${candidate}: powered machine has no fan activity`,
          );
      }
    }
  }
});

test("authority: cabinets have level fronts, vertical uprights, substantial depth and seated rack trays", () => {
  for (const portrait of [false, true]) {
    const frame = authorityFrame(0.6, 4, portrait);
    for (const candidate of authorityHistory.candidates) {
      const data = (id: string) =>
        coordinates(frame.paths.find((path) => path.id === id)!.d);
      const front = data(`machine-${candidate}-front`),
        side = data(`rack-side-${candidate}`);
      assert.equal(front[1], front[3], "Cabinet header remains level");
      assert.equal(front[5], front[7], "Cabinet base remains level");
      assert.equal(front[0], front[6], "Left upright remains vertical");
      assert.equal(front[2], front[4], "Right upright remains vertical");
      assert.ok(
        side[4] - side[2] >= (portrait ? 23 : 34),
        "Cabinet depth must not collapse to a thin board",
      );
      for (const id of [
        `machine-${candidate}-recess`,
        `machine-${candidate}-bay-0`,
        `machine-${candidate}-bay-1`,
        `machine-${candidate}-tray-handle-0--1`,
        `machine-${candidate}-tray-handle-1-1`,
        `rack-foot-${candidate}-1-front-face`,
      ])
        assert.ok(
          frame.paths.some((path) => path.id === id),
          id,
        );
      for (const id of [
        `candidate-${candidate}`,
        `initial-${candidate}`,
        `machine-epoch-${candidate}`,
      ]) {
        const inscription = frame.labels.find((label) => label.id === id)!;
        const transform = matrix(inscription);
        assert.equal(transform[1], 0, "Front lettering must not be tilted");
        assert.equal(transform[2], 0, "Front lettering must not be sheared");
        const bounds = lettering(inscription, portrait);
        assert.ok(
          bounds.left > front[0] &&
            bounds.right < front[2] &&
            bounds.top > front[1] &&
            bounds.bottom < front[5],
          id,
        );
      }
    }
    const oldRoute = coordinates(
      frame.paths.find(({ id }) => id === "old-write-route")!.d,
    );
    const oldPort = coordinates(
      frame.paths.find(({ id }) => id === "machine-A-port--1")!.d,
    );
    assert.deepEqual(
      oldRoute.slice(-2),
      oldPort.slice(0, 2),
      "Old route attaches to A’s actual front port",
    );
    const newRoute = coordinates(
      frame.paths.find(({ id }) => id === "new-write-route")!.d,
    );
    const newPort = coordinates(
      frame.paths.find(
        ({ id }) => id === `machine-B-port-${portrait ? 1 : -1}`,
      )!.d,
    );
    assert.deepEqual(
      newRoute.slice(-2),
      newPort.slice(0, 2),
      "New route attaches to B’s actual front port",
    );
  }
});

test("authority: held-stage traffic explains cause and effect without advancing authority", () => {
  const permitted = [
    ["ownWrite", "ownCopy", "ownAck", "ownReply"],
    ["suspectProbe"],
    ["authorizeB", "authorizeC"],
    ["adoptB", "adoptC", "adoptContent"],
    ["serveCopy", "serveAck", "serveWrite", "serveReply"],
    ["refusedWrite", "refusedReply"],
  ];
  for (let stage = 0; stage <= 5; stage++) {
    const seen = new Set<string>();
    const first = new Map<string, number>();
    for (let tick = 0; tick <= 400; tick++) {
      const time = tick / 100,
        value = authorityActivity(time, stage);
      for (const [name, packet] of Object.entries(value.packets)) {
        assert.ok(
          packet.progress >= 0 &&
            packet.progress <= 1 &&
            packet.opacity >= 0 &&
            packet.opacity <= 1,
        );
        if (packet.opacity > 0.08) {
          assert.ok(
            permitted[stage].includes(name),
            `stage ${stage} incorrectly transmits ${name}`,
          );
          seen.add(name);
          if (!first.has(name)) first.set(name, time);
        }
      }
    }
    assert.deepEqual(
      [...seen].sort(),
      [...permitted[stage]].sort(),
      `stage ${stage} misses a causal transfer`,
    );
    for (let i = 1; i < permitted[stage].length; i++)
      assert.ok(
        first.get(permitted[stage][i - 1])! < first.get(permitted[stage][i])!,
        `stage ${stage}: replies must follow their requests`,
      );
    for (const portrait of [false, true]) {
      const initial = authorityFrame(0, stage, portrait);
      for (const time of [0.6, 1.3, 2.4, 3.5]) {
        const frame = authorityFrame(time, stage, portrait);
        assert.deepEqual(
          frame.labels.filter(({ id }) =>
            /^(?:initial-|machine-epoch-|role-|status$|council-epoch$)/.test(
              id,
            ),
          ),
          initial.labels.filter(({ id }) =>
            /^(?:initial-|machine-epoch-|role-|status$|council-epoch$)/.test(
              id,
            ),
          ),
          "Repeating traffic must not promote an owner or change the accepted version",
        );
      }
    }
  }
  const waiting = authorityActivity(3, 1);
  assert.equal(waiting.probeExpired, 1);
  assert.match(waiting.caption, /timed out/);
  assert.match(authorityActivity(2.6, 5).caption, /StaleEpoch/);
});

test("authority: traveling messages avoid lettering, and old-epoch traffic cannot cross the fence", () => {
  for (const portrait of [false, true])
    for (let stage = 0; stage <= 5; stage++)
      for (let tick = 0; tick <= 32; tick++) {
        const frame = authorityFrame(tick / 8, stage, portrait);
        const labels = frame.labels.filter(
          ({ opacity }) => (opacity ?? 1) > 0.08,
        );
        for (const path of frame.paths.filter(
          ({ id, opacity }) => id.startsWith("activity-") && opacity > 0.08,
        )) {
          const nums = coordinates(path.d),
            points = Array.from({ length: nums.length / 2 }, (_, i) =>
              nums.slice(i * 2, i * 2 + 2),
            );
          for (const [x, y] of points)
            assert.ok(
              x >= 8 &&
                x <= (portrait ? 412 : 792) &&
                y >= 8 &&
                y <= (portrait ? 736 : 512),
              `${path.id} leaves the viewport`,
            );
          if (path.id.startsWith("activity-refused-"))
            assert.ok(
              Math.max(...points.map(([x]) => x)) < (portrait ? 153 : 301),
              "A’s stale request and refusal reply stay on its side of the fence",
            );
          if (path.d.endsWith("Z")) points.push(points[0]);
          for (const label of labels)
            for (let i = 1; i < points.length; i++)
              assert.ok(
                !touches(
                  localPoint(points[i - 1], label),
                  localPoint(points[i], label),
                  localLettering(label, portrait),
                ),
                `${portrait}/${stage}/${tick / 8}: ${path.id} crosses ${label.id}`,
              );
        }
      }
});
