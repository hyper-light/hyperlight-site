import assert from "node:assert/strict";
import { test } from "node:test";
import { ledgerPlacementFrame } from "../components/proof-work/ledger-placement-geometry";

test("geographic placement retains its topology and stays within both viewports", () => {
  for (const portrait of [false, true]) {
    const first = ledgerPlacementFrame(0, 0, portrait);
    assert.ok(first.paths.length > 200);
    for (const time of [0, 3, 12, 40])
      for (const selection of [0, 0.5, 1, 1.5, 2]) {
        const frame = ledgerPlacementFrame(time, selection, portrait);
        assert.deepEqual(
          frame.paths.map((p) => p.id),
          first.paths.map((p) => p.id),
        );
        assert.deepEqual(
          frame.labels.map((p) => p.id),
          first.labels.map((p) => p.id),
        );
        for (const path of frame.paths) {
          assert.doesNotMatch(path.d, /NaN|Infinity/);
          const points = [...path.d.matchAll(/-?\d+(?:\.\d+)?/g)].map((m) =>
            Number(m[0]),
          );
          points.forEach((value, i) => {
            assert.ok(value >= 0, `${path.id}: negative coordinate`);
            assert.ok(
              value <= (i % 2 ? (portrait ? 740 : 520) : portrait ? 420 : 800),
              `${path.id}: out of viewport`,
            );
          });
        }
      }
  }
});

test("session placement, replication and residency convey different guarantees", () => {
  const frames = [0, 1, 2].map((selection) =>
    ledgerPlacementFrame(0, selection, false),
  );
  const text = (index: number, id: string) =>
    frames[index].labels.find((label) => label.id === id)?.text;
  assert.equal(text(0, "assignment-0"), "Session α");
  assert.equal(text(0, "assignment-1"), "Session β");
  assert.equal(text(0, "assignment-2"), "Session γ");
  for (let i = 0; i < 3; i++)
    assert.equal(text(1, `assignment-${i}`), "Session α replica");
  assert.equal(text(2, "assignment-2"), "Outside policy");
  assert.equal(text(2, "authority-2"), "Placement blocked");
  assert.equal(
    frames[2].paths.find((path) => path.id === "route-fence-2")?.opacity,
    0.9,
  );
  assert.ok(frames[1].labels.some((label) => label.text.includes("latency")));
});
