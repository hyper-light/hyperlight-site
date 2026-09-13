import assert from "node:assert/strict";
import { test } from "node:test";
import type {
  ProofFrame,
  ProofLabel,
} from "../components/proof-work/proof-geometry";
import {
  aliceEdit,
  bobEdits,
  mergeBase,
  mergeScenarios,
  mergeSnapshot,
  mergeSteps,
} from "../components/slates/merge-data";
import { mergeFrames } from "../components/slates/merge-geometry";

const label = (frame: ProofFrame, id: string) => {
  const found = frame.labels.find((item) => item.id === id);
  assert.ok(found, id);
  return found;
};
const path = (frame: ProofFrame, id: string) => {
  const found = frame.paths.find((item) => item.id === id);
  assert.ok(found, id);
  return found;
};
const numbers = (value: string) =>
  Array.from(value.matchAll(/-?\d+(?:\.\d+)?/g), ([entry]) => Number(entry));

test("the six stages separate shared base, local edits, submission and the owner's verdict", () => {
  assert.equal(mergeBase, "quality=80\ncache=off\n");
  assert.equal(mergeBase.slice(aliceEdit.start, aliceEdit.end), "80");
  assert.equal(
    mergeBase.slice(bobEdits.disjoint.start, bobEdits.disjoint.end),
    "off",
  );
  for (const { id } of mergeScenarios) {
    assert.deepEqual(
      mergeSteps(id).map((step) => step.label),
      ["Base", "Fork", "Agent 1", "Agent 2", "Submit", "Verdict"],
    );
    assert.equal(mergeSnapshot(id, 0).forked, false);
    assert.equal(mergeSnapshot(id, 1).forked, true);
    assert.equal(mergeSnapshot(id, 2).aliceReady, true);
    assert.equal(mergeSnapshot(id, 3).bobReady, true);
    assert.equal(mergeSnapshot(id, 4).bobReceived, true);
    assert.equal(mergeSnapshot(id, 5).replyReceived, true);
    for (let sample = 0; sample < 345; sample++) {
      const state = mergeSnapshot(id, sample / 100);
      assert.equal(state.base, mergeBase);
      assert.equal(
        state.head,
        mergeBase,
        "local edits never advance the canonical head",
      );
    }
    assert.equal(mergeSnapshot(id, 3.45).head, "quality=90\ncache=off\n");
    assert.equal(mergeSnapshot(id, 4.59).head, "quality=90\ncache=off\n");
    assert.equal(mergeSnapshot(id, 4.59).verdict, "pending");
  }
  assert.equal(mergeSnapshot("disjoint", 4.6).head, "quality=90\ncache=on\n");
  assert.equal(mergeSnapshot("identical", 4.6).head, "quality=90\ncache=off\n");
  assert.equal(mergeSnapshot("identical", 4.6).verdict, "accepted-no-op");
  assert.deepEqual(mergeSnapshot("conflict", 4.6).conflict, {
    start: 8,
    end: 10,
    current: "90",
    proposed: "60",
  });
  assert.equal(mergeSnapshot("conflict", 5).head, "quality=90\ncache=off\n");
  assert.equal(mergeSnapshot("conflict", 5).bob, "quality=60\ncache=off\n");
  assert.deepEqual(
    mergeSnapshot("disjoint", Number.NaN),
    mergeSnapshot("disjoint", 0),
  );
});

test("each worker visibly selects, deletes, types, and retains the removed and inserted lines", () => {
  for (const portrait of [false, true]) {
    const frame = (at: number) => mergeFrames.disjoint(0, at, portrait);
    assert.equal(label(frame(0), "alice-value-0").opacity, 0);
    assert.equal(label(frame(1), "alice-value-0").text, "quality=80");
    assert.ok(path(frame(1.15), "alice-selection").opacity > 0.2);
    assert.equal(label(frame(1.35), "alice-value-0").text, "quality=");
    assert.equal(label(frame(1.7), "alice-value-0").text, "quality=9");
    assert.equal(label(frame(2), "alice-value-0").text, "quality=90");
    assert.equal(label(frame(2), "alice-journal-line-0").text, "− quality=80");
    assert.equal(label(frame(2), "alice-journal-line-1").text, "+ quality=90");
    assert.ok(path(frame(2.15), "bob-selection").opacity > 0.2);
    assert.equal(label(frame(2.35), "bob-value-1").text, "cache=");
    assert.equal(label(frame(2.7), "bob-value-1").text, "cache=o");
    assert.equal(label(frame(3), "bob-value-1").text, "cache=on");
    assert.equal(
      label(frame(3), "bob-value-0").text,
      "quality=80",
      "Agent 2's copy never silently acquires Agent 1's local edit",
    );
    assert.equal(label(frame(3), "bob-journal-line-0").text, "− cache=off");
    assert.equal(label(frame(3), "bob-journal-line-1").text, "+ cache=on");
    assert.equal(label(frame(3), "head-value-0").text, "quality=80");
    assert.equal(label(frame(5), "head-value-0").text, "quality=90");
    assert.equal(label(frame(5), "head-value-1").text, "cache=on");
    assert.match(label(frame(5), "head-file-name").text, /HEAD/);
  }
});

test("snapshot and journal arrival precede head changes; owner decision precedes the reply", () => {
  for (const portrait of [false, true])
    for (const { id } of mergeScenarios) {
      const frame = (at: number) => mergeFrames[id](0, at, portrait);
      for (const [prefix, selection] of [
        ["alice-submit", 3.2],
        ["bob-submit", 3.75],
      ] as const) {
        assert.ok(
          path(frame(selection), prefix + "-snapshot-top").opacity > 0.1,
        );
        assert.ok(path(frame(selection), prefix + "-journal").opacity > 0.1);
      }
      assert.equal(path(frame(3.45), "alice-submit-journal").opacity, 0);
      assert.equal(path(frame(4), "bob-submit-journal").opacity, 0);
      assert.ok(path(frame(4.3), "head-comparison-bracket").opacity > 0.9);
      for (let sample = 400; sample <= 465; sample++)
        assert.equal(path(frame(sample / 100), "bob-verdict").opacity, 0);
      assert.ok(path(frame(4.8), "bob-verdict").opacity > 0.1);
      assert.equal(mergeSnapshot(id, 4.8).replyReceived, false);
      assert.notEqual(mergeSnapshot(id, 4.8).verdict, "pending");
      assert.ok((label(frame(5), "bob-owner-reply").opacity ?? 0) > 0.99);
      if (id === "conflict") {
        assert.equal(label(frame(5), "head-value-0").text, "quality=90");
        assert.equal(label(frame(5), "bob-value-0").text, "quality=60");
        assert.match(label(frame(5), "bob-owner-reply").text, /refused/);
      }
    }
});

function box(label: ProofLabel, portrait: boolean) {
  const size =
    (label.kind === "small" ? 10 : label.kind === "heading" ? 9 : 11) +
    (portrait ? 2 : 0);
  const width =
    label.text.length *
    size *
    (label.kind === "heading" ? 0.73 : label.kind === "name" ? 0.7 : 0.64);
  const left =
    label.x -
    (label.anchor === "end"
      ? width
      : label.anchor === "middle"
        ? width / 2
        : 0);
  const [a, b, c, d, e, f] = label.transform
    ? numbers(label.transform)
    : [1, 0, 0, 1, 0, 0];
  const corners = [
    [left, label.y - size],
    [left + width, label.y - size],
    [left + width, label.y + 2],
    [left, label.y + 2],
  ].map(([x, y]) => [a * x + c * y + e, b * x + d * y + f]);
  return {
    id: label.id,
    corners,
    left: Math.min(...corners.map((p) => p[0])),
    right: Math.max(...corners.map((p) => p[0])),
    top: Math.min(...corners.map((p) => p[1])),
    bottom: Math.max(...corners.map((p) => p[1])),
  };
}
function overlap(a: ReturnType<typeof box>, b: ReturnType<typeof box>) {
  return ![a.corners, b.corners].some((corners) =>
    corners.some((p, i) => {
      const q = corners[(i + 1) % 4],
        axis = [p[1] - q[1], q[0] - p[0]];
      const aa = a.corners.map(([x, y]) => x * axis[0] + y * axis[1]),
        bb = b.corners.map(([x, y]) => x * axis[0] + y * axis[1]);
      return (
        Math.max(...aa) <= Math.min(...bb) || Math.max(...bb) <= Math.min(...aa)
      );
    }),
  );
}

test("physical worker and owner assemblies retain readable labels and a fixed camera in both layouts", () => {
  for (const portrait of [false, true])
    for (const { id } of mergeScenarios) {
      const initial = mergeFrames[id](0, 0, portrait);
      for (const node of ["alice", "bob", "head"]) {
        assert.equal(path(initial, node + "-pcb-top").material, "circuit");
        assert.equal(path(initial, node + "-cpu-top").material, "silicon");
        assert.equal(path(initial, node + "-nic-top").material, "metal");
        assert.equal(
          initial.paths.filter(
            (p) =>
              p.id.startsWith(node + "-heatsink-fin-") && p.id.endsWith("-top"),
          ).length,
          9,
        );
      }
      assert.equal(
        new Set(initial.paths.map((p) => p.id)).size,
        initial.paths.length,
      );
      assert.equal(
        new Set(initial.labels.map((p) => p.id)).size,
        initial.labels.length,
      );
      for (let sample = 0; sample <= 100; sample++) {
        const at = sample / 20,
          frame = mergeFrames[id](0, at, portrait),
          later = mergeFrames[id](1.6, at, portrait);
        assert.deepEqual(
          frame.paths.map((p) => p.id),
          initial.paths.map((p) => p.id),
        );
        assert.deepEqual(
          frame.labels.map((p) => p.id),
          initial.labels.map((p) => p.id),
        );
        assert.deepEqual(
          frame.labels,
          later.labels,
          "ambient activity cannot move or rewrite any file",
        );
        for (const fixed of initial.paths.filter((p) =>
          /(?:carrier|pcb|cpu|heatsink|nic|ram|edge-contact)|^(?:fork-to|alice-to-owner|bob-to-owner|owner-to)/.test(
            p.id,
          ),
        ))
          assert.equal(
            path(frame, fixed.id).d,
            fixed.d,
            "reference geometry never moves",
          );
        for (const p of frame.paths) {
          const values = numbers(p.d);
          assert.equal(values.length, numbers(path(initial, p.id).d).length);
          assert.ok(p.opacity >= 0 && p.opacity <= 1, p.id);
          values.forEach((v, index) =>
            assert.ok(
              Number.isFinite(v) &&
                v >= 4 &&
                v <=
                  (index % 2 ? (portrait ? 736 : 516) : portrait ? 416 : 796),
              p.id + ": " + v,
            ),
          );
        }
        const boxes = frame.labels
          .filter((l) => l.text && (l.opacity ?? 1) > 0.1)
          .map((l) => box(l, portrait));
        for (let i = 0; i < boxes.length; i++) {
          const a = boxes[i];
          assert.ok(
            a.left >= 4 &&
              a.right <= (portrait ? 416 : 796) &&
              a.top >= 4 &&
              a.bottom <= (portrait ? 736 : 516),
            a.id,
          );
          for (let j = i + 1; j < boxes.length; j++)
            assert.ok(
              !overlap(a, boxes[j]),
              id +
                "/" +
                portrait +
                "/" +
                at +
                ": " +
                a.id +
                " overlaps " +
                boxes[j].id,
            );
        }
      }
    }
});

test("transport and caret motion are continuous, and payloads leave all text clear", () => {
  for (const portrait of [false, true])
    for (const { id } of mergeScenarios) {
      for (let sample = 0; sample <= 200; sample++) {
        const at = sample / 40,
          frame = mergeFrames[id](0, at, portrait),
          next = mergeFrames[id](0, at + 0.00001, portrait);
        for (let index = 0; index < frame.paths.length; index++) {
          const p = frame.paths[index],
            before = numbers(p.d),
            after = numbers(next.paths[index].d);
          before.forEach((value, i) =>
            assert.ok(
              Math.abs(value - after[i]) < 0.04,
              id + "/" + p.id + ": motion jump",
            ),
          );
        }
        const captions = frame.labels
          .filter((l) => l.text && (l.opacity ?? 1) > 0.1)
          .map((l) => box(l, portrait));
        for (const p of frame.paths.filter(
          (p) =>
            p.opacity > 0.1 &&
            /^(?:fork-(?:alice|bob)-snapshot|(?:alice|bob)-submit-|alice-acceptance|bob-verdict)/.test(
              p.id,
            ),
        )) {
          const values = numbers(p.d),
            x = values.filter((_, i) => i % 2 === 0),
            y = values.filter((_, i) => i % 2 === 1);
          const bounds = {
            id: p.id,
            left: Math.min(...x),
            right: Math.max(...x),
            top: Math.min(...y),
            bottom: Math.max(...y),
            corners: [] as number[][],
          };
          bounds.corners = [
            [bounds.left, bounds.top],
            [bounds.right, bounds.top],
            [bounds.right, bounds.bottom],
            [bounds.left, bounds.bottom],
          ];
          for (const caption of captions)
            assert.ok(
              !overlap(bounds, caption),
              id +
                "/" +
                portrait +
                "/" +
                at +
                ": " +
                p.id +
                " covers " +
                caption.id,
            );
        }
      }
    }
});
