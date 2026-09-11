import assert from "node:assert/strict";
import { test } from "node:test";
import {
  extensionGrant,
  healthMultiplier,
  livenessExample,
  livenessGuardSteps,
  suspicionDuration,
} from "../components/proof-work/liveness-guard-data";
import { livenessGuardFrame } from "../components/proof-work/liveness-guard-geometry";

const coordinates = (d: string) =>
  Array.from(d.matchAll(/-?\d+(?:\.\d+)?/g), ([value]) => Number(value));
const path = (frame: ReturnType<typeof livenessGuardFrame>, id: string) =>
  frame.paths.find((entry) => entry.id === id)!;
const text = (frame: ReturnType<typeof livenessGuardFrame>, id: string) =>
  frame.labels.find((entry) => entry.id === id)!.text;
function length(frame: ReturnType<typeof livenessGuardFrame>, id: string) {
  const p = coordinates(path(frame, id).d);
  return Math.hypot(p[2] - p[0], p[3] - p[1]);
}

test("observer health and the ten-member suspicion example match their implemented formulas", () => {
  assert.deepEqual([0, 2, 4, 8].map(healthMultiplier), [1, 1.5, 2, 3]);
  assert.equal(healthMultiplier(-1), 1);
  assert.equal(healthMultiplier(100), 3);
  assert.equal(
    livenessExample.suspicionMinMs,
    Math.round(3000 * Math.log10(11)),
  );
  assert.equal(
    livenessExample.suspicionMaxMs,
    livenessExample.suspicionMinMs * 6,
  );
  assert.deepEqual(
    [0, 2, 3, 20].map(suspicionDuration),
    [18744, 6365, 3124, 3124],
  );
  assert.ok(livenessExample.replyMs > livenessExample.baseProbeMs);
  assert.ok(
    livenessExample.replyMs < livenessExample.baseProbeMs * healthMultiplier(8),
  );
});

test("default grants decay to the floor and stop after five per incarnation", () => {
  assert.deepEqual(
    [0, 1, 2, 3, 4, 5, 6].map(extensionGrant),
    [3120, 1560, 1000, 1000, 1000, 0, 0],
  );
  assert.equal(
    [0, 1, 2, 3, 4].map(extensionGrant).reduce((sum, ms) => sum + ms, 0),
    7680,
  );
  assert.equal(livenessExample.minGrantIntervalMs, 1000);
  assert.ok(livenessExample.graceReplyMs < extensionGrant(0));
});

test("the narrative distinguishes grace from old suspicion and failure detection from authority", () => {
  assert.deepEqual(
    livenessGuardSteps.map(({ label }) => label),
    ["Probe", "Suspect", "Extend", "Recover", "No progress"],
  );
  assert.match(
    livenessGuardSteps[1].description,
    /repeated gossip doesn't restart/,
  );
  assert.match(
    livenessGuardSteps[2].description,
    /Alive\(8\), clearing the old suspicion/,
  );
  assert.match(livenessGuardSteps[2].description, /asks its accuser/);
  assert.match(
    livenessGuardSteps[2].description,
    /completed placement-loop tick witness 43/,
  );
  assert.match(
    livenessGuardSteps[4].description,
    /Capacity overload, rate limits and exhausted grants/,
  );
  assert.match(
    livenessGuardSteps[4].description,
    /only its expiry yields a settled Dead verdict/,
  );
  assert.match(
    livenessGuardSteps[4].facts!.find(({ label }) => label === "Authority")!
      .value,
    /Raft quorum unchanged/,
  );
});

test("linear timing rails preserve the threefold timeout and explicit per-section time scales", () => {
  for (const portrait of [false, true])
    for (const time of [0, 2, 8, 40]) {
      const frame = livenessGuardFrame(time, 0, portrait);
      assert.ok(
        Math.abs(
          length(frame, "slow-axis") / length(frame, "healthy-axis") - 3,
        ) < 0.0003,
      );
      assert.equal(text(frame, "healthy-value"), "300ms");
      assert.equal(text(frame, "slow-value"), "900ms");
      assert.equal(text(frame, "probe-scale"), "0–1000ms");
      assert.equal(text(frame, "suspicion-scale"), "1× health · 0–18.744s");
      assert.equal(text(frame, "grace-scale"), "0–5s");
      const suspect = livenessGuardFrame(time, 1, portrait);
      assert.ok(
        Math.abs(
          length(suspect, "suspicion-axis") / length(frame, "suspicion-axis") -
            6365 / 18744,
        ) < 0.0001,
      );
      assert.equal(text(suspect, "suspicion-value"), "6.365s");
    }
});

test("grace opens once, admits the worked reply, and never grows during a denied request", () => {
  for (const portrait of [false, true])
    for (const time of [0, 2, 8, 40]) {
      const idle = livenessGuardFrame(time, 0, portrait);
      assert.equal(length(idle, "grace-axis"), 0);
      for (const selection of [2, 3, 4]) {
        const frame = livenessGuardFrame(time, selection, portrait);
        const full = length(frame, "healthy-axis") / 0.3;
        assert.ok(
          Math.abs(length(frame, "grace-axis") / full - 3120 / 5000) < 0.0001,
        );
        assert.equal(text(frame, "grace-value"), "3.120s · fixed grant");
      }
      const grant = livenessGuardFrame(time, 2, portrait),
        recovered = livenessGuardFrame(time, 3, portrait);
      assert.equal(text(grant, "suspicion-title"), "Refuted");
      assert.equal(text(grant, "suspicion-incarnation"), "incarnation 7");
      const reply = coordinates(path(recovered, "grace-reply").d);
      const rail = coordinates(path(recovered, "grace-axis").d);
      const replyCenter = (reply[0] + reply[4]) / 2;
      assert.ok(replyCenter > rail[0] && replyCenter < rail[2]);
      const denied = livenessGuardFrame(time, 4, portrait);
      assert.equal(text(denied, "suspicion-incarnation"), "incarnation 8");
      assert.equal(text(denied, "suspicion-value"), "Expired · Dead");
      assert.equal(
        text(denied, "outcome"),
        "Grace ends → silence → suspicion expires",
      );
      assert.equal(
        text(denied, "directory-boundary"),
        "Settled Dead → partition leader → directory",
      );
    }
});

test("all instrument states are deterministic, bounded, and keep the same geometry identities", () => {
  for (const portrait of [false, true]) {
    const initial = livenessGuardFrame(0, 0, portrait),
      ids = initial.paths.map(({ id }) => id);
    assert.ok(ids.length < 300);
    assert.equal(new Set(ids).size, ids.length);
    for (const time of [0, 0.5, 2, 8, 40])
      for (const selection of [0, 0.25, 0.5, 1, 1.5, 2, 3, 4]) {
        const frame = livenessGuardFrame(time, selection, portrait);
        assert.deepEqual(frame, livenessGuardFrame(time, selection, portrait));
        assert.deepEqual(
          frame.paths.map(({ id }) => id),
          ids,
        );
        assert.deepEqual(
          frame.labels.map(({ id }) => id),
          initial.labels.map(({ id }) => id),
        );
        frame.paths.forEach((entry, index) => {
          const values = coordinates(entry.d);
          assert.equal(
            values.length,
            coordinates(initial.paths[index].d).length,
          );
          assert.ok(entry.opacity >= 0 && entry.opacity <= 1);
          values.forEach((value, axis) =>
            assert.ok(
              Number.isFinite(value) &&
                value > 8 &&
                value <
                  (axis % 2 ? (portrait ? 732 : 512) : portrait ? 412 : 792),
              entry.id,
            ),
          );
        });
      }
  }
});

test("deadline transitions are continuous and held states breathe without resetting their lengths", () => {
  for (const portrait of [false, true]) {
    let previous = livenessGuardFrame(0, 0, portrait);
    for (let sample = 1; sample <= 480; sample++) {
      const next = livenessGuardFrame(sample / 60, sample / 120, portrait);
      next.paths.forEach((entry, index) => {
        const before = coordinates(previous.paths[index].d);
        coordinates(entry.d).forEach((value, coordinate) =>
          assert.ok(Math.abs(value - before[coordinate]) < 3.5, entry.id),
        );
      });
      previous = next;
    }
    const first = livenessGuardFrame(0, 2, portrait),
      later = livenessGuardFrame(2, 2, portrait);
    assert.notEqual(
      path(first, "grace-window").d,
      path(later, "grace-window").d,
    );
    assert.equal(text(first, "grace-value"), text(later, "grace-value"));
  }
});
