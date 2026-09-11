import assert from "node:assert/strict";
import { test } from "node:test";
import { spacecraftJourneyFrame } from "../components/proof-work/claim-lifecycle-geometry";
import {
  journeyLifecyclePosition,
  journeyLifecycleSnapshot,
  journeyLifecycleSteps,
} from "../components/proof-work/journey-lifecycle-data";
import { journeyLifecycleFrames } from "../components/proof-work/journey-lifecycle-geometry";
import {
  validatorLifecycleSnapshot,
  type ValidatorExample,
} from "../components/proof-work/validator-lifecycle-data";
import type {
  ProofFrame,
  ProofPath,
} from "../components/proof-work/proof-geometry";

const examples: ValidatorExample[] = ["pass", "fail", "error", "missing"];
const familyIds = ["claim", "artifact", "testament", "checks"];

test("artifact and testament formation reaches the committed pose without an opacity pop", () => {
  for (const portrait of [false, true]) {
    for (const [birth, id] of [
      [2, "work-artifact-top"],
      [3, "testament-ship-spacecraft-hull"],
    ] as const) {
      const before = path(
        journeyLifecycleFrames.pass(0, birth - 0.001, portrait),
        id,
      );
      const complete = path(
        journeyLifecycleFrames.pass(0, birth, portrait),
        id,
      );
      assert.ok(
        Math.abs(complete.opacity - before.opacity) < 0.01,
        `${id} must not pop at its commit`,
      );
      const halfway = path(
        journeyLifecycleFrames.pass(0, birth - 0.5, portrait),
        id,
      );
      assert.ok(halfway.opacity > 0.1 && halfway.opacity < complete.opacity);
      assert.ok(
        displacement(halfway, complete) > 1,
        `${id} assembles physically, not only by fading`,
      );
    }
    assert.equal(journeyLifecycleSnapshot(1.999, "pass").artifact, null);
    assert.equal(journeyLifecycleSnapshot(2.999, "pass").testament, null);
  }
});

test("both flights and cargo loading retain deliberate autoplay timing in every outcome", () => {
  for (const example of examples) {
    const steps = journeyLifecycleSteps(example);
    assert.equal(steps[1].transitionDuration, 6.5);
    assert.equal(steps[5].transitionDuration, 6.5);
    assert.equal(steps[4].transitionDuration, 3.8);
    assert.equal(steps[2].transitionDuration, 2.4);
  }
});
function label(frame: ProofFrame, id: string) {
  const entry = frame.labels.find((candidate) => candidate.id === id);
  assert.ok(entry, `${id} is part of the shared journey`);
  return entry;
}
function path(frame: ProofFrame, id: string) {
  const entry = frame.paths.find((candidate) => candidate.id === id);
  assert.ok(entry, `${id} is part of the shared journey`);
  return entry;
}
function coordinates(entry: ProofPath) {
  return Array.from(entry.d.matchAll(/-?\d+(?:\.\d+)?/g), ([value]) =>
    Number(value),
  );
}
function displacement(before: ProofPath, after: ProofPath) {
  const a = coordinates(before),
    b = coordinates(after);
  assert.equal(a.length, b.length);
  return Math.max(...a.map((value, index) => Math.abs(value - b[index])));
}

test("one ten-stage exchange includes object births, delivery and the independent evaluations", () => {
  assert.deepEqual(
    journeyLifecycleSteps("pass").map(({ label }) => label),
    [
      "Claim",
      "Acquire",
      "Produce",
      "Close",
      "Post",
      "Receive",
      "Evaluate",
      "Behavior",
      "Review",
      "Record",
    ],
  );
  assert.deepEqual(
    journeyLifecycleSteps("error").map(({ label }) => label),
    [
      "Claim",
      "Acquire",
      "Produce",
      "Close",
      "Post",
      "Receive",
      "Evaluate",
      "Behavior",
      "Retry",
      "Record",
    ],
  );
  assert.deepEqual(
    journeyLifecycleSteps("missing").map(({ label }) => label),
    [
      "Claim",
      "Acquire",
      "Account",
      "Close",
      "Post",
      "Receive",
      "Record missing",
    ],
  );
  assert.deepEqual(
    Array.from({ length: 10 }, (_, stage) =>
      journeyLifecyclePosition(stage, "pass"),
    ),
    [0, 1, 1.4, 2, 2.2, 3, 4, 4.3, 4.6, 5],
  );
  assert.deepEqual(
    Array.from({ length: 7 }, (_, stage) =>
      journeyLifecyclePosition(stage, "missing"),
    ),
    [0, 1, 1.4, 2, 2.2, 3, 3.45],
  );
});

test("claim posting precedes outward flight, and acquiring a receipt creates no response", () => {
  const generated = journeyLifecycleSnapshot(0, "pass");
  assert.equal(generated.claim, "Generated");
  assert.equal(generated.artifact, null);
  assert.equal(generated.testament, null);
  assert.equal(generated.behavior, "Declared");
  assert.equal(generated.review, "Declared");
  assert.equal(journeyLifecycleSnapshot(0.15, "pass").claim, "Posted");
  const acquired = journeyLifecycleSnapshot(1, "pass");
  assert.equal(acquired.claim, "Received");
  assert.equal(acquired.artifact, null);
  assert.equal(acquired.testament, null);
  assert.equal(acquired.target, null);
});

test("A is generated independently, then closing publishes the three atomic state changes", () => {
  for (const example of ["pass", "fail", "error"] as const) {
    const before = journeyLifecycleSnapshot(1.999, example);
    assert.equal(before.artifact, null);
    const produced = journeyLifecycleSnapshot(2, example);
    assert.equal(produced.artifact, "Generated");
    assert.equal(produced.claim, "Received");
    assert.equal(produced.testament, null);
    const beforeClose = journeyLifecycleSnapshot(2.999, example);
    assert.equal(beforeClose.artifact, "Generated");
    assert.equal(beforeClose.testament, null);
    const closed = journeyLifecycleSnapshot(3, example);
    assert.deepEqual(
      [closed.claim, closed.artifact, closed.testament],
      ["TestamentGenerated", "Attached", "Generated"],
    );
    assert.equal(closed.reportedOutcome, "Complete");
    assert.equal(closed.target, null);
    for (const portrait of [false, true]) {
      const early = journeyLifecycleFrames[example](0, 1.999, portrait);
      const work = journeyLifecycleFrames[example](0, 2, portrait);
      const account = journeyLifecycleFrames[example](0, 3, portrait);
      assert.equal(label(early, "artifact-state").text, "Not generated");
      assert.ok(path(early, "work-artifact-top").opacity > 0.4);
      assert.ok(path(work, "work-artifact-top").opacity > 0.4);
      assert.equal(label(work, "testament-ship-message-id").opacity, 0);
      assert.ok(
        (label(account, "testament-ship-message-id").opacity ?? 1) > 0.5,
      );
      assert.equal(label(work, "artifact-title").text, "ARTIFACT · A / hA");
    }
  }
});

test("a Generated T1 stays at the respondent until posting, then returns before receipt", () => {
  for (const example of examples)
    for (const portrait of [false, true]) {
      const closed = journeyLifecycleFrames[example](0, 3, portrait);
      const sourceHull = path(closed, "testament-ship-spacecraft-hull");
      for (const selection of [3, 3.25, 3.5, 3.75, 3.999]) {
        const state = journeyLifecycleSnapshot(selection, example);
        const frame = journeyLifecycleFrames[example](0, selection, portrait);
        assert.equal(state.testament, "Generated");
        assert.equal(
          path(frame, "testament-ship-spacecraft-hull").d,
          sourceHull.d,
        );
        assert.notEqual(path(frame, "response-lamp").tone, "pass");
      }
      assert.equal(journeyLifecycleSnapshot(4, example).testament, "Posted");
      const returning = journeyLifecycleFrames[example](0, 4.5, portrait);
      assert.ok(
        displacement(
          sourceHull,
          path(returning, "testament-ship-spacecraft-hull"),
        ) > 100,
      );
      assert.equal(journeyLifecycleSnapshot(4.5, example).testament, "Posted");
      assert.notEqual(path(returning, "response-lamp").tone, "pass");
      const received = journeyLifecycleFrames[example](0, 5, portrait);
      assert.equal(path(received, "response-lamp").tone, "pass");
    }
});

test("timely receipt materializes Ready evaluations and passes only delivery", () => {
  for (const example of examples) {
    for (const stage of [0, 1, 2, 3, 4, 4.999]) {
      const state = journeyLifecycleSnapshot(stage, example);
      assert.equal(state.behavior, "Declared");
      assert.equal(state.review, "Declared");
      assert.equal(state.target, null);
    }
    const state = journeyLifecycleSnapshot(5, example);
    assert.equal(state.claim, "TestamentAcknowledged");
    assert.equal(state.testament, "Received");
    assert.equal(state.delivery, "Pass");
    assert.equal(state.behavior, "Ready");
    assert.equal(state.review, "Ready");
    assert.equal(state.attempts, 0);
    for (const portrait of [false, true])
      for (const stage of [5, 5.25, 5.5, 5.999]) {
        const frame = journeyLifecycleFrames[example](0, stage, portrait);
        for (const index of [0, 1]) {
          assert.equal(path(frame, `witness-signal-${index}`).opacity, 0);
          assert.equal(path(frame, `witness-chip-${index}`).opacity, 0);
        }
      }
  }
});

test("the final five normal stages use the exact validator contract, including error retries", () => {
  for (const example of ["pass", "fail", "error"] as const)
    for (let evaluation = 0; evaluation <= 4; evaluation++) {
      const expected = validatorLifecycleSnapshot(evaluation, example);
      const actual = journeyLifecycleSnapshot(evaluation + 5, example);
      for (const key of [
        "claim",
        "artifact",
        "testament",
        "behavior",
        "review",
        "attempts",
        "terminal",
        "target",
      ] as const)
        assert.deepEqual(
          actual[key],
          expected[key],
          `${example} evaluation ${evaluation}: ${key}`,
        );
      assert.equal(actual.definition, "behavior@1 / review@1");
      assert.equal(actual.evaluator, "Maintainer");
    }
  assert.equal(journeyLifecycleSnapshot(7, "error").attempts, 1);
  assert.equal(journeyLifecycleSnapshot(8, "error").attempts, 2);
  assert.equal(journeyLifecycleSnapshot(8.999, "error").behavior, "Validating");
  assert.equal(journeyLifecycleSnapshot(9, "error").behavior, "Errored");
});

test("only the exact final result makes parent states terminal, and failures never satisfy C17", () => {
  for (const example of ["pass", "fail", "error"] as const) {
    for (const stage of [6, 7, 8, 8.5, 8.999]) {
      const state = journeyLifecycleSnapshot(stage, example);
      assert.equal(state.claim, "Validating");
      assert.equal(state.artifact, "Validating");
      assert.equal(state.testament, "Validating");
      assert.equal(state.terminal, false);
    }
    const final = journeyLifecycleSnapshot(9, example);
    assert.equal(final.terminal, true);
    assert.deepEqual(
      [final.claim, final.artifact, final.testament],
      example === "pass"
        ? ["Satisfied", "Validated", "Validated"]
        : example === "fail"
          ? ["ValidationFailed", "ValidationFailed", "ValidationFailed"]
          : ["ValidationErrored", "ValidationFailed", "ValidationErrored"],
    );
    for (const portrait of [false, true]) {
      const frame = journeyLifecycleFrames[example](0, 9, portrait);
      for (const id of familyIds)
        assert.equal(label(frame, `${id}-state`).tone, final.tone);
    }
  }
});

test("missing work uses a real failure account and becomes Incomplete at entry without A or any run", () => {
  const steps = journeyLifecycleSteps("missing");
  assert.match(steps[2].description, /diagnostic D\/hD/);
  assert.match(steps[3].description, /reported Failed outcome/);
  for (let stage = 0; stage <= 6; stage += 0.25) {
    const state = journeyLifecycleSnapshot(stage, "missing");
    assert.equal(state.artifact, null);
    assert.equal(state.target, null);
    assert.equal(state.attempts, 0);
    assert.notEqual(state.claim, "Satisfied");
    for (const portrait of [false, true]) {
      const frame = journeyLifecycleFrames.missing(0, stage, portrait);
      assert.equal(path(frame, "work-artifact-top").opacity, 0);
      assert.equal(label(frame, "artifact-title").text, "ARTIFACT · CHANGE");
      for (const index of [0, 1]) {
        assert.equal(path(frame, `witness-chip-${index}`).opacity, 0);
        assert.equal(path(frame, `witness-signal-${index}`).opacity, 0);
      }
    }
  }
  const final = journeyLifecycleSnapshot(6, "missing");
  assert.equal(final.claim, "ValidationIncomplete");
  assert.equal(final.testament, "ValidationIncomplete");
  assert.equal(final.behavior, "ValidationIncomplete");
  assert.equal(final.review, "Ready");
  assert.equal(final.reportedOutcome, "Failed");
});

test("all branches share the spacecraft engine and fixed four-family topology", () => {
  for (const portrait of [false, true]) {
    const baseline = journeyLifecycleFrames.pass(0, 0, portrait);
    const ids = baseline.paths.map(({ id, kind }) => [id, kind]);
    const labels = baseline.labels.map(({ id, kind }) => [id, kind]);
    assert.equal(
      new Set(baseline.paths.map(({ id }) => id)).size,
      baseline.paths.length,
    );
    assert.equal(
      new Set(baseline.labels.map(({ id }) => id)).size,
      baseline.labels.length,
    );
    assert.ok(baseline.paths.length < 600);
    for (const example of examples)
      for (
        let stage = 0;
        stage < journeyLifecycleSteps(example).length;
        stage += 0.25
      ) {
        const frame = journeyLifecycleFrames[example](7, stage, portrait);
        const shared = spacecraftJourneyFrame(
          7,
          journeyLifecyclePosition(stage, example),
          portrait,
        );
        assert.deepEqual(
          frame.paths.map(({ id, kind }) => [id, kind]),
          ids,
        );
        assert.deepEqual(
          frame.labels.map(({ id, kind }) => [id, kind]),
          labels,
        );
        for (const entry of frame.paths) {
          assert.ok(!/NaN|Infinity/.test(entry.d));
          assert.ok(entry.opacity >= 0 && entry.opacity <= 1);
          if (
            /claim-ship-spacecraft-hull|route-dash/.test(entry.id) ||
            (entry.id === "testament-ship-spacecraft-hull" && stage >= 3)
          )
            assert.equal(entry.d, path(shared, entry.id).d);
        }
        for (const id of familyIds) {
          const readout = label(frame, `${id}-state`);
          assert.ok(readout.x > 0 && readout.x < (portrait ? 420 : 800));
          assert.ok(readout.y > 0 && readout.y < (portrait ? 740 : 520));
        }
      }
  }
});

test("every adjacent stage moves spacecraft, cargo, evaluation hardware or the commit marker", () => {
  for (const example of examples)
    for (const portrait of [false, true])
      for (
        let stage = 0;
        stage < journeyLifecycleSteps(example).length - 1;
        stage++
      ) {
        const before = journeyLifecycleFrames[example](0, stage, portrait);
        const after = journeyLifecycleFrames[example](0, stage + 1, portrait);
        const hardware = before.paths.filter(({ id }) =>
          /spacecraft-hull|work-artifact-|cargo-clamp-|witness-probe-|witness-chip-|ledger-commit/.test(
            id,
          ),
        );
        const moved = hardware.some(
          (entry) => displacement(entry, path(after, entry.id)) > 1,
        );
        assert.ok(
          moved,
          `${example} ${stage} → ${stage + 1} contains physical movement`,
        );
      }
});

test("clock pulses do not advance the spacecraft, artifact or committed state", () => {
  for (const example of examples)
    for (const portrait of [false, true])
      for (const stage of [0, 2, 4, 5, example === "missing" ? 6 : 8.5]) {
        const before = journeyLifecycleFrames[example](0, stage, portrait);
        const after = journeyLifecycleFrames[example](60, stage, portrait);
        for (const entry of before.paths.filter(({ id }) =>
          /spacecraft-hull|work-artifact-|cargo-clamp-/.test(id),
        ))
          assert.equal(entry.d, path(after, entry.id).d);
        assert.deepEqual(after.labels, before.labels);
      }
});
