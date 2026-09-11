import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ledgerShardsExample,
  ledgerShardsSource,
  ledgerShardsSteps,
} from "../components/proof-work/ledger-shards-data";
import { ledgerShardsFrame } from "../components/proof-work/ledger-shards-geometry";

const coordinates = (d: string) =>
  Array.from(d.matchAll(/-?\d+(?:\.\d+)?/g), ([value]) => Number(value));
const path = (frame: ReturnType<typeof ledgerShardsFrame>, id: string) =>
  frame.paths.find((entry) => entry.id === id)!;
const text = (frame: ReturnType<typeof ledgerShardsFrame>, id: string) =>
  frame.labels.find((entry) => entry.id === id)!.text;
function center(d: string) {
  const values = coordinates(d).slice(0, -2),
    count = values.length / 2;
  return [
    values
      .filter((_, index) => index % 2 === 0)
      .reduce((sum, value) => sum + value, 0) / count,
    values
      .filter((_, index) => index % 2 === 1)
      .reduce((sum, value) => sum + value, 0) / count,
  ];
}
function area(d: string) {
  const values = coordinates(d);
  let sum = 0;
  for (let i = 2; i < values.length; i += 2)
    sum += values[i - 2] * values[i + 1] - values[i] * values[i - 1];
  return Math.abs(sum / 2);
}

test("range movement has five ordered teaching stages and never creates a second session authority", () => {
  assert.deepEqual(
    ledgerShardsSteps.map(({ label }) => label),
    ["Choose", "Copy", "Catch up", "Fence", "Activate"],
  );
  assert.equal(ledgerShardsExample.session, "S1");
  assert.equal(
    ledgerShardsExample.lastGroup - ledgerShardsExample.firstGroup + 1,
    8,
  );
  assert.equal(
    ledgerShardsExample.nextEpoch,
    ledgerShardsExample.originalEpoch + 1,
  );
  assert.match(
    ledgerShardsSteps[0].description,
    /Every row belonging to an object stays together/,
  );
  assert.match(
    ledgerShardsSteps[1].description,
    /existing range placement stays active/,
  );
  assert.match(ledgerShardsSteps[2].description, /prove readiness before/);
  assert.match(ledgerShardsSteps[3].description, /RangeMoving/);
  assert.equal(
    ledgerShardsSteps[3].facts!.find(
      ({ label }) => label === "Abort after barrier",
    )!.value,
    "Refused · Sealed",
  );
  assert.equal(
    ledgerShardsSteps[4].facts!.find(
      ({ label }) => label === "Session route epoch",
    )!.value,
    "Unchanged",
  );
  assert.match(
    ledgerShardsSteps[4].description,
    /Older copies remain until pinned reads release/,
  );
  assert.match(ledgerShardsSource, /626b1b59fa286ba4093e96f481afe38b8b061ede/);
});

test("the copied strip is exactly eight contiguous affinity groups and source rows are retained", () => {
  for (const portrait of [false, true]) {
    const chosen = ledgerShardsFrame(0, 0, portrait),
      copied = ledgerShardsFrame(0, 1, portrait);
    for (let group = 0; group < 8; group++) {
      const before = center(path(chosen, "transfer-group-" + group).d);
      const source = center(path(chosen, "voters-group-" + (8 + group)).d);
      const after = center(path(copied, "transfer-group-" + group).d);
      const destination = center(path(copied, "holder-group-" + (8 + group)).d);
      for (let axis = 0; axis < 2; axis++) {
        assert.ok(Math.abs(before[axis] - source[axis]) < 2);
        assert.ok(Math.abs(after[axis] - destination[axis]) < 2);
      }
      assert.ok(
        portrait ? after[1] - before[1] > 220 : after[0] - before[0] > 300,
      );
      for (const selection of [0, 0.25, 0.5, 0.75, 1, 2, 3, 4]) {
        const frame = ledgerShardsFrame(0, selection, portrait);
        assert.ok(
          Math.abs(
            area(path(frame, "transfer-group-" + group).d) -
              area(path(chosen, "transfer-group-" + group).d),
          ) < 0.5,
        );
        assert.equal(
          text(frame, "session-log-title"),
          "S1 · one ordered session log",
        );
        assert.equal(text(frame, "voters-detail"), "All ranges retained");
        assert.equal(
          frame.paths.filter(({ id }) => /^voters-group-\d+$/.test(id)).length,
          32,
        );
        assert.ok(
          frame.paths
            .filter(({ id }) => /^voters-group-\d+$/.test(id))
            .every(({ opacity }) => opacity >= 0.3),
        );
      }
    }
  }
});

test("the barrier fences both touched-range copies and activation changes only range ownership", () => {
  for (const portrait of [false, true]) {
    const fenced = ledgerShardsFrame(0, 3, portrait),
      active = ledgerShardsFrame(0, 4, portrait);
    assert.ok(path(fenced, "write-fence").opacity > 0.8);
    assert.ok(path(fenced, "source-write-fence").opacity > 0.8);
    assert.equal(path(active, "write-fence").opacity, 0.12);
    assert.match(text(fenced, "range-state"), /RangeMoving/);
    assert.equal(text(active, "range-state"), "Range epoch 8 · Holder B");
    assert.equal(
      text(active, "ownership-state"),
      "Epoch 7 superseded · copies retained",
    );
    assert.equal(text(active, "log-entry-label-2"), "Mutation");
  }
});

test("bank construction has bounded, deterministic, persistent geometry in both viewports", () => {
  for (const portrait of [false, true]) {
    const initial = ledgerShardsFrame(0, 0, portrait),
      ids = initial.paths.map(({ id }) => id);
    assert.ok(ids.length < 450);
    assert.equal(new Set(ids).size, ids.length);
    for (const time of [0, 0.5, 2, 8, 40])
      for (const selection of [0, 0.25, 0.5, 1, 1.5, 2, 3, 4]) {
        const frame = ledgerShardsFrame(time, selection, portrait);
        assert.deepEqual(frame, ledgerShardsFrame(time, selection, portrait));
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

test("copy motion preserves cell size and remains continuous without resetting the assembly", () => {
  for (const portrait of [false, true]) {
    let previous = ledgerShardsFrame(0, 0, portrait);
    for (let sample = 1; sample <= 240; sample++) {
      const next = ledgerShardsFrame(sample / 60, sample / 60, portrait);
      next.paths.forEach((entry, index) => {
        const before = coordinates(previous.paths[index].d);
        coordinates(entry.d).forEach((value, coordinate) =>
          assert.ok(Math.abs(value - before[coordinate]) < 7, entry.id),
        );
      });
      previous = next;
    }
    assert.notEqual(
      path(ledgerShardsFrame(0, 2, portrait), "holder-body").d,
      path(ledgerShardsFrame(2, 2, portrait), "holder-body").d,
    );
  }
});
