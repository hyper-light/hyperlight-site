import assert from "node:assert/strict";
import { test } from "node:test";
import {
  recordReaderEntries,
  recordReaderReplayEvents,
  recordReaderSteps,
} from "../components/proof-work/record-reader-data";
import { recordReaderFrame } from "../components/proof-work/record-reader-geometry";

const coordinates = (d: string) =>
  Array.from(d.matchAll(/-?\d+(?:\.\d+)?/g), ([value]) => Number(value));
const text = (frame: ReturnType<typeof recordReaderFrame>, id: string) =>
  frame.labels.find((label) => label.id === id)!.text;
const immutableLabels = (frame: ReturnType<typeof recordReaderFrame>) =>
  frame.labels
    .filter(
      ({ id }) => id.startsWith("ledger-entry-") || id.startsWith("failed-"),
    )
    .map(({ id, text }) => ({ id, text }));
const pathPoints = (
  frame: ReturnType<typeof recordReaderFrame>,
  id: string,
) => {
  const values = coordinates(frame.paths.find((path) => path.id === id)!.d);
  return Array.from({ length: values.length / 2 }, (_, index) => [
    values[index * 2],
    values[index * 2 + 1],
  ]);
};
function clearance(polygon: number[][], point: number[]) {
  return Math.min(
    ...polygon.slice(1).map((end, index) => {
      const start = polygon[index],
        dx = end[0] - start[0],
        dy = end[1] - start[1];
      return (
        (dx * (point[1] - start[1]) - dy * (point[0] - start[0])) /
        Math.hypot(dx, dy)
      );
    }),
  );
}

test("every history view keeps the original failure and unevaluated successor evidence", () => {
  assert.deepEqual(
    recordReaderSteps.map(({ label }) => label),
    ["Record", "Replay", "Correct"],
  );
  assert.deepEqual(
    recordReaderEntries.map(({ id }) => id),
    ["check-a", "C17", "C18", "patch-b"],
  );
  for (const step of recordReaderSteps) {
    assert.equal(step.facts.length, 4);
    assert.equal(step.facts[0].value, "patch-a · Fail");
    assert.equal(step.facts[1].value, "C17 · ValidationFailed");
    assert.equal(step.facts[3].value, "patch-b · not evaluated");
  }
  assert.match(
    recordReaderSteps[1].description,
    /doesn't run the validator again/,
  );
  assert.match(
    recordReaderSteps[2].description,
    /doesn't turn C17's original failure into a pass/,
  );
});

test("the complete rebuilt view shows separate identities and a new-to-old correction", () => {
  for (const portrait of [false, true])
    for (const selection of [0, 1, 2]) {
      const frame = recordReaderFrame(6, selection, portrait);
      assert.equal(text(frame, "ledger-name"), "Ledger");
      assert.equal(text(frame, "ledger-role"), "Authoritative record");
      assert.equal(text(frame, "failed-c17-title"), "C17");
      assert.equal(text(frame, "failed-c17-subtitle"), "patch-a / hA");
      assert.equal(text(frame, "failed-review"), "Review: Fail");
      assert.equal(text(frame, "failed-state-prefix"), "Validation");
      assert.equal(text(frame, "failed-state"), "Failed");
      assert.equal(text(frame, "successor-c18-title"), "C18");
      assert.equal(text(frame, "successor-c18-subtitle"), "patch-b / hB");
      assert.equal(text(frame, "new-state"), "Not evaluated");
      assert.equal(text(frame, "maintainer-name"), "Maintainer");
      assert.equal(text(frame, "correction-label"), "C18 corrects C17");
      assert.equal(
        frame.labels.filter(({ id }) => id.startsWith("ledger-entry-")).length,
        4,
      );
      const arrow = coordinates(
        frame.paths.find(({ id }) => id === "corrects-path")!.d,
      );
      assert.ok(arrow.at(-2)! < arrow[0]);
    }
});

test("history remains bounded with fixed path and label topology in both layouts", () => {
  for (const portrait of [false, true]) {
    const initial = recordReaderFrame(0, 0, portrait);
    const ids = initial.paths.map(({ id }) => id);
    assert.equal(new Set(ids).size, ids.length);
    assert.ok(ids.length < 750);
    for (const time of [0, 0.7, 3, 12, 40])
      for (const selection of [0, 0.25, 0.75, 1, 1.25, 1.75, 2]) {
        const frame = recordReaderFrame(time, selection, portrait);
        assert.deepEqual(frame, recordReaderFrame(time, selection, portrait));
        assert.deepEqual(
          frame.paths.map(({ id }) => id),
          ids,
        );
        assert.deepEqual(
          frame.labels.map(({ id }) => id),
          initial.labels.map(({ id }) => id),
        );
        assert.deepEqual(immutableLabels(frame), immutableLabels(initial));
        frame.paths.forEach((path, index) => {
          const values = coordinates(path.d);
          assert.equal(
            values.length,
            coordinates(initial.paths[index].d).length,
          );
          assert.ok(path.opacity >= 0 && path.opacity <= 1);
          values.forEach((value, axis) =>
            assert.ok(
              Number.isFinite(value) &&
                value >= 2 &&
                value <=
                  (axis % 2 ? (portrait ? 738 : 512) : portrait ? 418 : 792),
              path.id,
            ),
          );
        });
      }
  }
});

test("replay moves its reading cursor without rewriting records or rerunning a check", () => {
  for (const portrait of [false, true]) {
    const first = recordReaderFrame(0, 1, portrait);
    const later = recordReaderFrame(2, 1, portrait);
    assert.notEqual(
      first.paths.find(({ id }) => id === "read-cursor")!.d,
      later.paths.find(({ id }) => id === "read-cursor")!.d,
    );
    assert.deepEqual(immutableLabels(first), immutableLabels(later));
    let previous = first;
    for (let sample = 1; sample <= 120; sample++) {
      const next = recordReaderFrame(sample / 60, 1, portrait);
      next.paths.forEach((path, index) => {
        const values = coordinates(path.d),
          before = coordinates(previous.paths[index].d);
        values.forEach((value, coordinate) =>
          assert.ok(Math.abs(value - before[coordinate]) < 1.7, path.id),
        );
      });
      previous = next;
    }
  }
});

test("both claims, their correction and every retained event belong to the central ledger", () => {
  for (const portrait of [false, true])
    for (const time of [0, 2, 8, 40]) {
      const frame = recordReaderFrame(time, 1, portrait),
        ledger = pathPoints(frame, "ledger-skin");
      for (const id of [
        "failed-c17-skin",
        "successor-c18-skin",
        "history-skin",
        "corrects-path",
      ]) {
        for (const point of pathPoints(frame, id))
          assert.ok(clearance(ledger, point) > 10, id);
      }
      for (const [route, from, to] of [
        ["issue-direction", "maintainer-skin", "ledger-skin"],
        ["read-direction", "ledger-skin", "maintainer-skin"],
        ["evidence-direction", "parser-agent-skin", "ledger-skin"],
      ]) {
        const points = pathPoints(frame, route + "-path");
        assert.ok(
          Math.abs(clearance(pathPoints(frame, from), points[0])) < 0.03,
          route + " origin",
        );
        assert.ok(
          Math.abs(clearance(pathPoints(frame, to), points.at(-1)!)) < 0.03,
          route + " destination",
        );
      }
      assert.ok(
        frame.labels
          .filter(({ id }) => id.startsWith("ledger-entry-"))
          .every(({ surface }) => surface === "history-skin"),
      );
    }
});

test("held Replay rebuilds the ledger's internal view in committed event order", () => {
  for (const portrait of [false, true]) {
    const seen = new Set<string>(),
      offsets: number[] = [];
    for (let time = 0; time <= 4.8; time += 0.1) {
      const frame = recordReaderFrame(time, 1, portrait);
      const prefix = text(frame, "replay-prefix");
      seen.add(prefix);
      assert.equal(
        text(frame, "failed-state-prefix") + text(frame, "failed-state"),
        "ValidationFailed",
      );
      assert.equal(
        text(frame, "ledger-entry-0"),
        "01 · C17 failed · review A: Fail",
      );
      assert.deepEqual(
        frame.labels
          .filter(({ id }) => id.startsWith("ledger-entry-"))
          .map(({ text }) => text),
        [...recordReaderReplayEvents],
      );
      assert.ok(
        frame.labels
          .filter(({ id }) => id.startsWith("replay-"))
          .every(({ surface }) => surface === "ledger-skin"),
      );
      if (prefix === "01 / 04") {
        assert.equal(text(frame, "new-requirements"), "Record pending");
        assert.equal(text(frame, "new-review"), "");
      } else if (prefix === "02 / 04") {
        assert.equal(text(frame, "new-requirements"), "Corrects C17");
        assert.equal(text(frame, "new-review"), "Work posted");
      } else {
        assert.equal(text(frame, "new-review"), "Work received");
      }
      if (prefix === "04 / 04") {
        assert.equal(text(frame, "replay-state"), "Rebuilt view");
        assert.equal(text(frame, "new-state"), "Not evaluated");
        assert.equal(text(frame, "successor-c18-subtitle"), "patch-b / hB");
        assert.equal(text(frame, "maintainer-action-0"), "Reads ready view");
        assert.equal(
          frame.paths.find(({ id }) => id === "read-direction-flow")!.opacity,
          0.8,
        );
      } else {
        assert.equal(text(frame, "replay-state"), "Recovery buffer");
        assert.equal(text(frame, "successor-c18-subtitle"), "Patch pending");
        assert.equal(text(frame, "maintainer-action-0"), "Await recovery");
        assert.equal(
          frame.paths.find(({ id }) => id === "read-direction-flow")!.opacity,
          0.1,
        );
      }
      const ledger = pathPoints(frame, "ledger-skin");
      for (const id of [
        "replay-to-buffer",
        "replay-to-buffer-arrow",
        "read-cursor",
      ])
        for (const point of pathPoints(frame, id))
          assert.ok(clearance(ledger, point) > 7, id);
      offsets.push(
        pathPoints(frame, "read-cursor")[0][1] -
          pathPoints(frame, "history-skin")[0][1],
      );
    }
    assert.deepEqual([...seen], ["01 / 04", "02 / 04", "03 / 04", "04 / 04"]);
    assert.ok(Math.max(...offsets) - Math.min(...offsets) > 45);
    const returning = recordReaderFrame(6, 1, portrait);
    assert.equal(text(returning, "replay-state"), "Rebuilt view");
    assert.equal(text(returning, "replay-prefix"), "04 / 04");
    assert.equal(text(returning, "maintainer-action-0"), "Reads ready view");
    assert.equal(text(returning, "maintainer-action-1"), "C17 stays failed");
  }
});
