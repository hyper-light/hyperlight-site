import assert from "node:assert/strict";
import { test } from "node:test";
import {
  workOrder,
  workOrderSteps,
} from "../components/proof-work/work-order-data";
import { workOrderFrame } from "../components/proof-work/work-order-geometry";

const coordinates = (d: string) =>
  Array.from(d.matchAll(/-?\d+(?:\.\d+)?/g), ([value]) => Number(value));
const text = (frame: ReturnType<typeof workOrderFrame>, id: string) =>
  frame.labels.find((label) => label.id === id)!.text;
const pathPoints = (frame: ReturnType<typeof workOrderFrame>, id: string) => {
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

test("work-order tabs preserve content and distinguish responsibility from acceptance", () => {
  assert.deepEqual(
    workOrderSteps.map(({ label }) => label),
    ["Draft", "Post", "Accept"],
  );
  assert.equal(workOrder.claim, "C17");
  assert.equal(workOrder.requirements.length, 3);
  assert.deepEqual(
    workOrderSteps.map(
      (step) => step.facts.find(({ label }) => label === "State")?.value,
    ),
    ["Generated", "Posted", "Received"],
  );
  assert.deepEqual(
    workOrderSteps.map(
      (step) => step.facts.find(({ label }) => label === "Work receipt")?.value,
    ),
    ["Not acquired", "Not acquired", "Parser agent · generation 1"],
  );
  for (const step of workOrderSteps) {
    assert.equal(
      step.facts.find(({ label }) => label === "Claim")?.value,
      "C17 · parser-fix-a",
    );
    assert.equal(
      step.facts.find(({ label }) => label === "Acceptance")?.value,
      "Not evaluated",
    );
  }
});

test("C17 stays in the authoritative ledger and a receipt is recorded only on Accept", () => {
  for (const portrait of [false, true]) {
    const frames = [0, 1, 2].map((selection) =>
      workOrderFrame(0, selection, portrait),
    );
    for (const frame of frames) {
      assert.equal(text(frame, "maintainer-name"), "Maintainer");
      assert.equal(text(frame, "parser-agent-name"), "Parser agent");
      assert.equal(text(frame, "ledger-name"), "Ledger");
      assert.equal(text(frame, "ledger-role"), "Authoritative record");
      assert.equal(text(frame, "claim-c17-title"), "C17");
      assert.equal(
        text(frame, "claim-requirements"),
        "Reject malformed escapes",
      );
      assert.equal(
        text(frame, "requirement-valid-input"),
        "Preserve valid input",
      );
      assert.equal(text(frame, "requirement-review"), "Review the exact patch");
      assert.equal(text(frame, "acceptance"), "Acceptance: not evaluated");
    }
    assert.deepEqual(
      frames.map((frame) => text(frame, "claim-state")),
      ["Generated", "Posted", "Received"],
    );
    assert.deepEqual(
      frames.map((frame) => text(frame, "receipt-value")),
      ["Not acquired", "Not acquired", "Generation 1 · Parser agent"],
    );
    const positions = frames.map((frame) =>
      frame.labels.find((label) => label.id === "claim-c17-title")!,
    );
    assert.deepEqual(positions[0], positions[1]);
    assert.deepEqual(positions[1], positions[2]);
    assert.equal(positions[0].surface, "claim-c17-skin");
    const direction = coordinates(
      frames[0].paths.find(({ id }) => id === "post-direction-path")!.d,
    );
    assert.ok(
      portrait
        ? direction.at(-1)! > direction[1]
        : direction.at(-2)! > direction[0],
    );
  }
});

test("posting moves a visible request into the ledger before writing the stationary claim", () => {
  for (const portrait of [false, true]) {
    const early = workOrderFrame(0, 0.08, portrait);
    const arriving = workOrderFrame(0, 0.45, portrait);
    const a = pathPoints(early, "post-direction-probe")[0];
    const b = pathPoints(arriving, "post-direction-probe")[0];
    assert.ok(Math.hypot(b[0] - a[0], b[1] - a[1]) > 25);
    const envelope = pathPoints(arriving, "post-direction-probe");
    assert.ok(
      Math.max(...envelope.map(([x]) => x)) - Math.min(...envelope.map(([x]) => x)) > 8,
      "the request is a visible packet, not a tiny probe",
    );
    const writing = workOrderFrame(0, 0.58, portrait);
    const written = workOrderFrame(0, 0.95, portrait);
    const front = pathPoints(writing, "claim-post-write")[1];
    const complete = pathPoints(written, "claim-post-write")[1];
    assert.ok(Math.hypot(complete[0] - front[0], complete[1] - front[1]) > 150);
    assert.deepEqual(pathPoints(early, "claim-c17-skin"), pathPoints(written, "claim-c17-skin"));
  }
});

test("acquiring writes the receipt inside the ledger before returning an acknowledgement", () => {
  for (const portrait of [false, true]) {
    const earlyRequest = workOrderFrame(0, 1.04, portrait);
    const deliveredRequest = workOrderFrame(0, 1.30, portrait);
    const a = pathPoints(earlyRequest, "acquire-direction-probe")[0];
    const b = pathPoints(deliveredRequest, "acquire-direction-probe")[0];
    assert.ok(Math.hypot(b[0] - a[0], b[1] - a[1]) > 25);

    const starting = workOrderFrame(0, 1.38, portrait);
    const finishing = workOrderFrame(0, 1.70, portrait);
    const span = (frame: ReturnType<typeof workOrderFrame>, id: string) => {
      const xs = pathPoints(frame, id).map(([x]) => x);
      return Math.max(...xs) - Math.min(...xs);
    };
    assert.ok(span(finishing, "work-receipt-skin") - span(starting, "work-receipt-skin") > 140);
    assert.ok(span(finishing, "receipt-write-progress") - span(starting, "receipt-write-progress") > 140);
    assert.deepEqual(pathPoints(starting, "receipt-direction-probe"), pathPoints(finishing, "receipt-direction-probe"));
    for (const frame of [starting, finishing]) {
      const ledger = pathPoints(frame, "ledger-skin");
      for (const point of pathPoints(frame, "work-receipt-skin"))
        assert.ok(clearance(ledger, point) > 10, "the ledger materializes its own receipt");
    }
    const ack = workOrderFrame(0, 1.98, portrait);
    const start = pathPoints(finishing, "receipt-direction-probe")[0];
    const end = pathPoints(ack, "receipt-direction-probe")[0];
    assert.ok(Math.hypot(end[0] - start[0], end[1] - start[1]) > 25);
    assert.deepEqual(pathPoints(earlyRequest, "claim-c17-skin"), pathPoints(ack, "claim-c17-skin"));
  }
});

test("only the current exchange flows and ledger state changes follow completed writes", () => {
  for (const portrait of [false, true]) {
    const opacity = (selection: number, route: string) =>
      workOrderFrame(0, selection, portrait).paths.find(({ id }) => id === route + "-flow")!.opacity;
    for (const selection of [0, 1, 2])
      for (const route of ["post-direction", "acquire-direction", "receipt-direction"])
        assert.equal(opacity(selection, route), 0, "settled actions do not keep exchanging traffic");
    assert.ok(opacity(0.25, "post-direction") > 0.7);
    assert.equal(opacity(0.25, "acquire-direction"), 0);
    assert.equal(opacity(1.55, "receipt-direction"), 0);
    assert.ok(opacity(1.87, "receipt-direction") > 0.7);
    assert.equal(text(workOrderFrame(0, 0.8, portrait), "claim-state"), "Generated");
    assert.equal(text(workOrderFrame(0, 0.98, portrait), "claim-state"), "Posted");
    assert.equal(text(workOrderFrame(0, 1.7, portrait), "claim-state"), "Posted");
    assert.equal(text(workOrderFrame(0, 1.75, portrait), "claim-state"), "Received");
    assert.equal(text(workOrderFrame(0, 1.7, portrait), "receipt-value"), "Not acquired");
    assert.equal(text(workOrderFrame(0, 1.75, portrait), "receipt-value"), "Generation 1 · Parser agent");
  }
});

test("work-order paths and label identities stay stable and fit both process layouts", () => {
  for (const portrait of [false, true]) {
    const initial = workOrderFrame(0, 0, portrait);
    const ids = initial.paths.map(({ id }) => id);
    assert.equal(new Set(ids).size, ids.length);
    assert.ok(ids.length < 750);
    for (const time of [0, 0.5, 2, 8, 40])
      for (const selection of [0, 0.125, 0.5, 1, 1.5, 1.875, 2]) {
        const frame = workOrderFrame(time, selection, portrait);
        assert.deepEqual(frame, workOrderFrame(time, selection, portrait));
        assert.deepEqual(
          frame.paths.map(({ id }) => id),
          ids,
        );
        assert.deepEqual(
          frame.labels.map(({ id }) => id),
          initial.labels.map(({ id }) => id),
        );
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

test("request probes and ambient geometry stay continuous without moving the stored claim", () => {
  for (const portrait of [false, true]) {
    let previous = workOrderFrame(0, 0, portrait);
    for (let sample = 1; sample <= 180; sample++) {
      const next = workOrderFrame(sample / 60, sample / 90, portrait);
      assert.equal(
        text(next, "claim-requirements"),
        text(previous, "claim-requirements"),
      );
      next.paths.forEach((path, index) => {
        const before = coordinates(previous.paths[index].d);
        coordinates(path.d).forEach((value, axis) =>
          assert.ok(Math.abs(value - before[axis]) < 1.7, path.id),
        );
      });
      previous = next;
    }
  }
});

test("claim and receipt stay inside the ledger and every exchange meets its authority boundary", () => {
  for (const portrait of [false, true])
    for (const time of [0, 2, 8, 40])
      for (const selection of [0, 1, 2]) {
        const frame = workOrderFrame(time, selection, portrait);
        const ledger = pathPoints(frame, "ledger-skin");
        for (const id of ["claim-c17-skin", "work-receipt-skin"]) {
          for (const point of pathPoints(frame, id))
            assert.ok(clearance(ledger, point) > 10, id);
        }
        for (const [route, from, to] of [
          ["post-direction", "maintainer-skin", "ledger-skin"],
          ["acquire-direction", "parser-agent-skin", "ledger-skin"],
          ["receipt-direction", "ledger-skin", "parser-agent-skin"],
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
          assert.ok(
            frame.paths.find(({ id }) => id === route + "-probe")!.opacity > 0,
          );
        }
      }
});
