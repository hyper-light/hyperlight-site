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
  validatorExamples,
  validatorLifecycleSnapshot,
} from "../components/proof-work/validator-lifecycle-data";
import type {
  ProofFrame,
  ProofPath,
} from "../components/proof-work/proof-geometry";

function path(frame: ProofFrame, id: string) {
  const found = frame.paths.find((entry) => entry.id === id);
  assert.ok(found, `${id} belongs to the shared journey`);
  return found;
}
function label(frame: ProofFrame, id: string) {
  const found = frame.labels.find((entry) => entry.id === id);
  assert.ok(found, `${id} belongs to the shared journey`);
  return found;
}
function coordinates(shape: ProofPath) {
  return shape.d.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
}
function topology(frame: ProofFrame) {
  return {
    paths: frame.paths.map(({ id, kind, d }) => [
      id,
      kind,
      d.replace(/[^MLCZ]/g, ""),
    ]),
    labels: frame.labels.map(({ id, kind, anchor }) => [id, kind, anchor]),
  };
}

test("pure receipt passes delivery without accepting its exact work", () => {
  const state = validatorLifecycleSnapshot(0, "pass");
  assert.deepEqual(
    [
      state.delivery,
      state.behavior,
      state.review,
      state.artifact,
      state.testament,
      state.claim,
      state.attempts,
      state.terminal,
    ],
    [
      "Pass",
      "Ready",
      "Ready",
      "Attached",
      "Received",
      "TestamentAcknowledged",
      0,
      false,
    ],
  );
});

test("independent checks retain the immutable definition, evaluator and exact target", () => {
  for (const { value } of validatorExamples)
    for (const step of [0, 0.5, 1, 2, 3, 4]) {
      const state = validatorLifecycleSnapshot(step, value);
      assert.equal(state.definition, "behavior@1 / review@1");
      assert.equal(state.evaluator, "Maintainer");
      assert.deepEqual(
        state.target,
        value === "missing"
          ? null
          : { artifact: "A", digest: "hA", response: "T1", slot: "change" },
      );
    }
  const begun = validatorLifecycleSnapshot(1, "pass");
  assert.equal(begun.behavior, "Validating");
  assert.equal(begun.review, "ValidatingQualityBar");
  assert.deepEqual(
    [begun.artifact, begun.testament, begun.claim],
    ["Validating", "Validating", "Validating"],
  );
});

test("one required Pass cannot complete acceptance before the final exact verdict", () => {
  for (const step of [2, 2.5, 3, 3.999]) {
    const state = validatorLifecycleSnapshot(step, "pass");
    assert.equal(state.behavior, "Validated");
    assert.equal(state.review, "ValidatingQualityBar");
    assert.deepEqual(
      [state.artifact, state.testament, state.claim],
      ["Validating", "Validating", "Validating"],
    );
    assert.equal(state.terminal, false);
  }
  const final = validatorLifecycleSnapshot(4, "pass");
  assert.deepEqual(
    [
      final.behavior,
      final.review,
      final.artifact,
      final.testament,
      final.claim,
    ],
    ["Validated", "Validated", "Validated", "Validated", "Satisfied"],
  );
  assert.equal(final.delivery, "Pass");
  assert.equal(final.terminal, true);
  assert.equal(final.cause, null);
});

test("conclusive quality Fail preserves behavior Pass but blocks the work", () => {
  const state = validatorLifecycleSnapshot(4, "fail");
  assert.equal(state.behavior, "Validated");
  assert.equal(state.review, "QualityBarValidationFailed");
  assert.deepEqual(
    [state.artifact, state.testament, state.claim],
    ["ValidationFailed", "ValidationFailed", "ValidationFailed"],
  );
  assert.equal(state.attempts, 1);
});

test("execution Error stays nonterminal until the pinned retry budget is exhausted", () => {
  assert.deepEqual(
    [0, 1, 2, 3, 4].map(
      (step) => validatorLifecycleSnapshot(step, "error").attempts,
    ),
    [0, 1, 1, 2, 2],
  );
  for (const step of [1, 2, 2.75, 3, 3.999]) {
    const state = validatorLifecycleSnapshot(step, "error");
    assert.equal(state.behavior, "Validating");
    assert.deepEqual(
      [state.artifact, state.testament, state.claim],
      ["Validating", "Validating", "Validating"],
    );
    assert.equal(state.terminal, false);
    assert.equal(state.cause, null);
  }
  const final = validatorLifecycleSnapshot(4, "error");
  assert.equal(final.behavior, "Errored");
  assert.equal(final.review, "Validated");
  assert.deepEqual(
    [final.artifact, final.testament, final.claim],
    ["ValidationFailed", "ValidationErrored", "ValidationErrored"],
  );
});

test("missing targets produce Incomplete at entry without an invented artifact or run", () => {
  for (const step of [0, 0.5, 1, 2, 4]) {
    const state = validatorLifecycleSnapshot(step, "missing");
    assert.equal(state.target, null);
    assert.equal(state.artifact, null);
    assert.equal(state.attempts, 0);
    assert.equal(state.review, "Ready");
    assert.equal(state.delivery, "Pass");
    if (step >= 1)
      assert.deepEqual(
        [state.behavior, state.testament, state.claim],
        [
          "ValidationIncomplete",
          "ValidationIncomplete",
          "ValidationIncomplete",
        ],
      );
  }
});

test("one continuous journey preserves every object birth, post and receipt boundary", () => {
  const expected = [
    ["Generated", null, null, "Declared", "Declared"],
    ["Received", null, null, "Declared", "Declared"],
    ["Received", "Generated", null, "Declared", "Declared"],
    ["TestamentGenerated", "Attached", "Generated", "Declared", "Declared"],
    ["TestamentGenerated", "Attached", "Posted", "Declared", "Declared"],
    ["TestamentAcknowledged", "Attached", "Received", "Ready", "Ready"],
    [
      "Validating",
      "Validating",
      "Validating",
      "Validating",
      "ValidatingQualityBar",
    ],
    [
      "Validating",
      "Validating",
      "Validating",
      "Validated",
      "ValidatingQualityBar",
    ],
    [
      "Validating",
      "Validating",
      "Validating",
      "Validated",
      "ValidatingQualityBar",
    ],
    ["Satisfied", "Validated", "Validated", "Validated", "Validated"],
  ];
  assert.equal(journeyLifecycleSteps("pass").length, 10);
  expected.forEach((values, step) => {
    const state = journeyLifecycleSnapshot(step, "pass");
    assert.deepEqual(
      [
        state.claim,
        state.artifact,
        state.testament,
        state.behavior,
        state.review,
      ],
      values,
    );
    assert.equal(state.delivery, step >= 5 ? "Pass" : "Pending");
    assert.equal(state.reportedOutcome, step >= 3 ? "Complete" : null);
    assert.equal(state.target === null, step < 5);
  });
  assert.match(
    journeyLifecycleSteps("pass")[9].description,
    /no pending graph conditions/,
  );
});

test("the full failure journeys preserve diagnostics and never become satisfied", () => {
  for (const example of ["fail", "error", "missing"] as const) {
    const last = example === "missing" ? 6 : 9;
    assert.equal(journeyLifecycleSteps(example).length, last + 1);
    for (let step = 0; step <= last; step++) {
      const state = journeyLifecycleSnapshot(step, example);
      assert.notEqual(state.claim, "Satisfied");
      if (step < last) assert.equal(state.terminal, false);
      if (example === "missing") {
        assert.equal(state.artifact, null);
        assert.equal(state.target, null);
        assert.equal(state.attempts, 0);
        assert.equal(state.reportedOutcome, step >= 3 ? "Failed" : null);
      }
    }
  }
  assert.deepEqual(
    [6, 7, 8, 9].map(
      (step) => journeyLifecycleSnapshot(step, "error").attempts,
    ),
    [1, 1, 2, 2],
  );
  assert.equal(journeyLifecycleSnapshot(9, "error").claim, "ValidationErrored");
  assert.equal(journeyLifecycleSnapshot(9, "fail").claim, "ValidationFailed");
  assert.equal(
    journeyLifecycleSnapshot(6, "missing").claim,
    "ValidationIncomplete",
  );
  assert.match(
    journeyLifecycleSteps("missing")[2].description,
    /diagnostic D\/hD/,
  );
});

test("draft assembly precedes exact births, while T1 cannot travel before posting", () => {
  for (const portrait of [false, true])
    for (const { value } of validatorExamples) {
      const initial = journeyLifecycleFrames[value](0, 0, portrait);
      const closed = journeyLifecycleFrames[value](0, 3, portrait);
      for (const step of [
        0, 0.1, 0.5, 1, 1.5, 1.999, 2, 2.5, 2.999, 3, 3.25, 3.5, 3.999, 4, 4.5,
        5,
      ]) {
        const state = journeyLifecycleSnapshot(step, value);
        const frame = journeyLifecycleFrames[value](0, step, portrait);
        assert.equal(
          path(frame, "work-artifact-top").opacity > 0,
          value !== "missing" && step > 1.15,
        );
        assert.equal(
          path(frame, "testament-ship-spacecraft-hull").opacity > 0,
          step > 2.15,
        );
        assert.equal(
          label(frame, "testament-ship-message-id").opacity! > 0,
          step > 2.15,
        );
        assert.equal(state.artifact !== null, value !== "missing" && step >= 2);
        assert.equal(state.testament !== null, step >= 3);
        if (state.claim === "Generated")
          assert.equal(
            path(frame, "claim-ship-spacecraft-hull").d,
            path(initial, "claim-ship-spacecraft-hull").d,
          );
        if (step >= 3 && step < 4)
          assert.equal(
            path(frame, "testament-ship-spacecraft-hull").d,
            path(closed, "testament-ship-spacecraft-hull").d,
            "Generated T1 remains at the respondent until posting",
          );
        if (step < 4)
          assert.equal(path(frame, "return-signal-pulse").opacity, 0);
        if (step < 5)
          assert.notEqual(path(frame, "response-lamp").tone, "pass");
        else assert.equal(path(frame, "response-lamp").tone, "pass");
      }
    }
});

test("C17 stays at the respondent while a separately identified T1 returns", () => {
  for (const portrait of [false, true]) {
    const acquired = journeyLifecycleFrames.pass(0, 1, portrait);
    for (const step of [2, 3, 4, 4.5, 5, 6, 7, 8, 9]) {
      const frame = journeyLifecycleFrames.pass(0, step, portrait);
      assert.equal(
        path(frame, "claim-ship-spacecraft-hull").d,
        path(acquired, "claim-ship-spacecraft-hull").d,
      );
      assert.equal(label(frame, "claim-ship-message-id").text, "C17");
      assert.ok(path(frame, "claim-ship-spacecraft-hull").opacity > 0);
    }
    const outbound = journeyLifecycleFrames.pass(0, 4, portrait),
      returned = journeyLifecycleFrames.pass(0, 5, portrait);
    assert.notEqual(
      path(outbound, "testament-ship-spacecraft-hull").d,
      path(returned, "testament-ship-spacecraft-hull").d,
    );
    assert.equal(label(returned, "testament-ship-message-id").text, "T1");
  }
});

test("evaluation signals and successful result routes require their actual committed facts", () => {
  for (const portrait of [false, true])
    for (const { value } of validatorExamples) {
      const last = value === "missing" ? 6 : 9;
      for (const step of [
        0, 2, 3, 4, 5, 5.5, 5.999, 6, 6.999, 7, 8, 8.999, 9,
      ].filter((step) => step <= last)) {
        const state = journeyLifecycleSnapshot(step, value);
        const frame = journeyLifecycleFrames[value](1, step, portrait);
        for (const i of [0, 1]) {
          if (step < 6 || value === "missing") {
            assert.equal(path(frame, `witness-signal-${i}`).opacity, 0);
            assert.equal(path(frame, `witness-scan-window-${i}`).opacity, 0);
          }
          const passed =
            (i === 0 ? state.behavior : state.review) === "Validated";
          if (!passed) {
            assert.notEqual(path(frame, `witness-chip-${i}`).tone, "pass");
            assert.equal(
              path(frame, `witness-result-route-${i}`).opacity,
              0,
              "no successful proof route exists before a Pass commits",
            );
          }
        }
        assert.equal(label(frame, "claim-state").text, state.claim);
        assert.equal(
          label(frame, "testament-state").text,
          state.testament ?? "Not generated",
        );
        if (value !== "pass")
          assert.notEqual(label(frame, "claim-state").text, "Satisfied");
      }
    }
});

test("all examples use the same two-party journey topology and bounded responsive geometry", () => {
  for (const portrait of [false, true]) {
    const initial = journeyLifecycleFrames.pass(0, 0, portrait),
      expected = topology(initial);
    assert.equal(
      new Set(initial.paths.map(({ id }) => id)).size,
      initial.paths.length,
    );
    assert.equal(
      new Set(initial.labels.map(({ id }) => id)).size,
      initial.labels.length,
    );
    assert.ok(initial.paths.length < 750);
    for (const { value } of validatorExamples)
      for (const time of [0, 0.25, 2, 9])
        for (const step of [
          0, 0.5, 1, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 7, 8, 9,
        ].filter((step) => value !== "missing" || step <= 6)) {
          const frame = journeyLifecycleFrames[value](time, step, portrait);
          const shared = spacecraftJourneyFrame(
            time,
            journeyLifecyclePosition(step, value),
            portrait,
          );
          assert.deepEqual(topology(frame), expected);
          assert.deepEqual(topology(frame), topology(shared));
          for (const shape of frame.paths) {
            if (
              /^(claim-ship-|outbound-|return-|posted-|holder-|dock-beacon)/.test(
                shape.id,
              ) ||
              (shape.id.startsWith("testament-ship-") && step >= 3)
            )
              assert.equal(shape.d, path(shared, shape.id).d);
            assert.ok(
              Number.isFinite(shape.opacity) &&
                shape.opacity >= 0 &&
                shape.opacity <= 1,
            );
            const values = coordinates(shape);
            for (let i = 0; i < values.length; i += 2) {
              assert.ok(
                values[i] >= 4 && values[i] <= (portrait ? 416 : 796),
                `${shape.id} x=${values[i]}`,
              );
              assert.ok(
                values[i + 1] >= 4 && values[i + 1] <= (portrait ? 736 : 516),
                `${shape.id} y=${values[i + 1]}`,
              );
            }
          }
          for (const text of frame.labels) {
            assert.ok(text.x >= 4 && text.x <= (portrait ? 416 : 796));
            assert.ok(text.y >= 4 && text.y <= (portrait ? 736 : 516));
            assert.ok(
              text.opacity === undefined ||
                (Number.isFinite(text.opacity) &&
                  text.opacity >= 0 &&
                  text.opacity <= 1),
            );
          }
        }
  }
});

test("the same artifact unloads for inspection and independent probes visibly scan it", () => {
  for (const portrait of [false, true]) {
    const received = journeyLifecycleFrames.pass(0, 5, portrait),
      entered = journeyLifecycleFrames.pass(0, 6, portrait);
    assert.notEqual(
      path(received, "work-artifact-top").d,
      path(entered, "work-artifact-top").d,
    );
    for (const i of [0, 1]) {
      const a = journeyLifecycleFrames.pass(0, 6, portrait),
        b = journeyLifecycleFrames.pass(1.5, 6, portrait);
      assert.notEqual(
        path(a, `witness-probe-head-${i}-top`).d,
        path(b, `witness-probe-head-${i}-top`).d,
      );
      assert.notEqual(
        path(a, `witness-scan-window-${i}`).d,
        path(b, `witness-scan-window-${i}`).d,
      );
      assert.ok(path(a, `witness-scan-window-${i}`).opacity > 0);
      assert.equal(
        path(a, "work-artifact-top").d,
        path(b, "work-artifact-top").d,
      );
    }
    const retry = journeyLifecycleFrames.error(0, 8, portrait),
      later = journeyLifecycleFrames.error(1, 8, portrait);
    assert.notEqual(
      path(retry, "witness-probe-head-0-top").d,
      path(later, "witness-probe-head-0-top").d,
    );
    assert.equal(
      path(retry, "work-artifact-top").d,
      path(later, "work-artifact-top").d,
    );
    assert.equal(label(retry, "claim-state").text, "Validating");
  }
});

test("journey input normalization is finite and motion between commit boundaries stays continuous", () => {
  for (const { value } of validatorExamples)
    for (const portrait of [false, true]) {
      assert.deepEqual(
        journeyLifecycleFrames[value](Number.NaN, Number.NaN, portrait),
        journeyLifecycleFrames[value](0, 0, portrait),
      );
      const last = value === "missing" ? 6 : 9;
      assert.deepEqual(
        journeyLifecycleSnapshot(999, value),
        journeyLifecycleSnapshot(last, value),
      );
      for (const step of [0.3, 1.3, 2.3, 3.3, 4.3, 5.3, 6.3, 7.3, 8.3].filter(
        (step) => step < last,
      )) {
        const before = journeyLifecycleFrames[value](3, step, portrait),
          after = journeyLifecycleFrames[value](3, step + 0.001, portrait);
        before.paths.forEach((shape, i) => {
          const a = coordinates(shape),
            b = coordinates(after.paths[i]);
          assert.equal(a.length, b.length);
          for (let j = 0; j < a.length; j++)
            assert.ok(
              Math.abs(a[j] - b[j]) < 2,
              `${shape.id} must interpolate continuously`,
            );
        });
      }
    }
});
