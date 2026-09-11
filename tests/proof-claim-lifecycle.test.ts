import assert from "node:assert/strict";
import { test } from "node:test";
import { claimLifecycleSteps } from "../components/proof-work/claim-lifecycle-data";
import {
  claimLifecycleFrame,
  spacecraftJourneyFrame,
} from "../components/proof-work/claim-lifecycle-geometry";
import { journeyLifecycleFrame } from "../components/proof-work/journey-lifecycle-geometry";

type Frame = ReturnType<typeof claimLifecycleFrame>;

test("both receipt requests are consumed instead of leaving duplicate ledger checks", () => {
  for (const portrait of [false, true]) {
    const complete = claimLifecycleFrame(0, 5, portrait);
    assert.equal(path(complete, "execution-receipt-request").opacity, 0);
    assert.equal(path(complete, "testament-delivery-ack").opacity, 0);
    assert.ok(path(complete, "execution-receipt-grant").opacity > 0.5);
    assert.ok(path(complete, "testament-delivery-confirmation").opacity > 0.5);
    assert.ok(
      !complete.paths.some(({ id }) => id === "testament-delivery-socket"),
    );
  }
});
const coordinates = (d: string) =>
  Array.from(d.matchAll(/-?\d+(?:\.\d+)?/g), ([n]) => Number(n));
const path = (frame: Frame, id: string) => {
  const value = frame.paths.find((item) => item.id === id);
  assert.ok(value, `Missing ${id}`);
  return value;
};
const text = (frame: Frame, id: string) => {
  const value = frame.labels.find((item) => item.id === id);
  assert.ok(value, `Missing ${id}`);
  return value.text;
};
const states = (frame: Frame) =>
  ["claim", "artifact", "testament", "checks"].map((id) =>
    text(frame, id + "-state"),
  );

test("review signal crosses its loop boundary without a visible position jump", () => {
  const boundary = 1 / 0.18;
  for (const portrait of [false, true]) {
    const before = claimLifecycleFrame(boundary - 0.0001, 4, portrait),
      after = claimLifecycleFrame(boundary + 0.0001, 4, portrait);
    const a = path(before, "witness-signal-1"),
      b = path(after, "witness-signal-1");
    const pa = coordinates(a.d),
      pb = coordinates(b.d);
    const jump = Math.max(
      ...pa.map((value, index) => Math.abs(value - pb[index])),
    );
    assert.ok(
      jump < 0.1 || Math.max(a.opacity, b.opacity) < 0.01,
      `visible review signal jumps ${jump.toFixed(2)} units at repeat`,
    );
  }
});

test("review hardware remains continuous when its verdict commits", () => {
  for (const portrait of [false, true])
    for (const example of ["pass", "fail"] as const) {
      const before = journeyLifecycleFrame(1.7, 8.99998, portrait, example),
        after = journeyLifecycleFrame(1.7, 9, portrait, example);
      for (const id of [
        "witness-probe-1",
        "witness-probe-head-1-top",
        "witness-scan-window-1",
      ]) {
        const a = coordinates(path(before, id).d),
          b = coordinates(path(after, id).d);
        const jump = Math.max(
          ...a.map((value, index) => Math.abs(value - b[index])),
        );
        assert.ok(
          jump < 0.1,
          `${example} ${id} jumps ${jump.toFixed(2)} units on commit`,
        );
      }
    }
});

test("claim teaching distinguishes participant authority, delivery, and exact evidence witnesses", () => {
  assert.deepEqual(
    claimLifecycleSteps.map((step) => step.label),
    ["Generate", "Acquire", "Close", "Receive", "Check", "Satisfy"],
  );
  assert.match(
    claimLifecycleSteps[0].description,
    /both Behavior and Review on the same exact artifact/,
  );
  assert.match(
    claimLifecycleSteps[1].description,
    /participant performs the work with its own tools/,
  );
  assert.equal(
    claimLifecycleSteps[2].facts![1].value,
    "T1 Generated + A/hA Attached",
  );
  assert.match(
    claimLifecycleSteps[3].description,
    /that exact response under its matching receipt fence/,
  );
  assert.match(
    claimLifecycleSteps[4].description,
    /Behavior pass alone cannot satisfy/,
  );
});

test("four independent object states and related atomic commits remain exact", () => {
  const expected = [
    ["Generated", "Not generated", "Not generated", "Declared"],
    ["Received", "Not generated", "Not generated", "Declared"],
    ["TestamentGenerated", "Attached", "Generated", "Declared"],
    ["TestamentAcknowledged", "Attached", "Received", "Ready"],
    ["Validating", "Validating", "Validating", "Checks running"],
    ["Satisfied", "Validated", "Validated", "All Required passed"],
  ];
  for (const portrait of [false, true]) {
    for (let stage = 0; stage <= 5; stage++)
      assert.deepEqual(
        states(claimLifecycleFrame(0, stage, portrait)),
        expected[stage],
      );
    assert.deepEqual(
      states(claimLifecycleFrame(0, 1.969, portrait)).slice(0, 3),
      ["Received", "Generated", "Not generated"],
    );
    assert.deepEqual(
      states(claimLifecycleFrame(0, 1.97, portrait)).slice(0, 3),
      expected[2].slice(0, 3),
    );
    assert.deepEqual(
      states(claimLifecycleFrame(0, 4.649, portrait)),
      expected[4],
    );
    assert.deepEqual(
      states(claimLifecycleFrame(0, 4.65, portrait)),
      expected[5],
    );
    assert.equal(states(claimLifecycleFrame(0, 0.5, portrait))[0], "Posted");
    assert.equal(states(claimLifecycleFrame(0, 2.5, portrait))[2], "Posted");
  }
});

test("C17 stays with the respondent while separately authored T1 returns to the claimant", () => {
  for (const portrait of [false, true]) {
    const frames = [0, 1, 2, 3, 4, 5].map((stage) =>
      claimLifecycleFrame(0, stage, portrait),
    );
    const axis = portrait ? 1 : 0,
      claim = "claim-ship-spacecraft-hull",
      response = "testament-ship-spacecraft-hull";
    assert.ok(
      coordinates(path(frames[1], claim).d)[axis] -
        coordinates(path(frames[0], claim).d)[axis] >
        (portrait ? 280 : 470),
    );
    assert.equal(path(frames[1], claim).d, path(frames[5], claim).d);
    assert.equal(path(frames[0], response).opacity, 0);
    assert.equal(
      path(claimLifecycleFrame(0, 1.969, portrait), response).opacity,
      0,
    );
    assert.ok(path(frames[2], response).opacity > 0.5);
    assert.ok(
      coordinates(path(frames[2], response).d)[axis] -
        coordinates(path(frames[3], response).d)[axis] >
        (portrait ? 290 : 490),
    );
    assert.equal(path(frames[3], response).d, path(frames[5], response).d);
    for (const frame of frames) {
      assert.equal(text(frame, "claim-ship-message-id"), "C17");
      assert.equal(text(frame, "testament-ship-message-id"), "T1");
      assert.equal(text(frame, "claimant-party"), "CLAIMANT");
      assert.equal(text(frame, "respondent-party"), "RESPONDENT");
      assert.ok(
        !frame.paths.some(({ id }) =>
          /identity-panel|identity-stalk|track-|chassis-tie|object-badge/.test(
            id,
          ),
        ),
      );
      assert.ok(!frame.labels.some(({ text }) => text === "ACCEPTANCE"));
    }
    assert.notEqual(
      path(frames[0], "outbound-route-dash-0").d,
      path(frames[0], "return-route-dash-0").d,
    );
    const preclose = claimLifecycleFrame(0, 1.5, portrait);
    assert.ok(path(preclose, "work-artifact-top").opacity > 0);
    assert.equal(path(preclose, response).opacity, 0);
  }
});

test("transfer gates and independent check witnesses use committed facts", () => {
  for (const portrait of [false, true]) {
    for (const [id, cut] of [
      ["posted", 0.18],
      ["holder", 0.97],
      ["response", 2.97],
    ] as const) {
      assert.equal(
        path(
          claimLifecycleFrame(0, cut - 0.001, portrait),
          id + "-crossbar-outline",
        ).tone,
        "neutral",
      );
      assert.equal(
        path(claimLifecycleFrame(0, cut, portrait), id + "-crossbar-outline")
          .tone,
        "pass",
      );
    }
    const onePassed = claimLifecycleFrame(0, 4.12, portrait);
    assert.equal(path(onePassed, "witness-chip-0").tone, "pass");
    assert.equal(path(onePassed, "witness-chip-1").tone, "pending");
    assert.equal(states(onePassed)[0], "Validating");
    assert.equal(
      path(claimLifecycleFrame(0, 4.65, portrait), "witness-chip-1").tone,
      "pass",
    );
    assert.notEqual(
      path(claimLifecycleFrame(0, 2, portrait), "response-tooth-0-top").d,
      path(claimLifecycleFrame(0, 3, portrait), "response-tooth-0-top").d,
    );
  }
});

test("missing evidence never fabricates a visible artifact or tool run", () => {
  const frame = spacecraftJourneyFrame(0, 5, false, {
    artifactVisible: 0,
    probes: [
      {
        title: "Behavior",
        target: "Missing slot",
        progress: 0,
        tone: "pending",
      },
      { title: "Review", target: "No target", progress: 0, tone: "pending" },
    ],
  });
  assert.equal(path(frame, "work-artifact-top").opacity, 0);
  assert.equal(path(frame, "witness-signal-0").opacity, 0);
  assert.equal(path(frame, "witness-signal-1").opacity, 0);
});

test("shared geometry remains deterministic, bounded and topologically stable in both layouts", () => {
  for (const portrait of [false, true]) {
    const initial = claimLifecycleFrame(0, 0, portrait),
      ids = initial.paths.map(({ id }) => id),
      labelIds = initial.labels.map(({ id }) => id);
    assert.ok(ids.length > 120 && ids.length < 350);
    assert.equal(new Set(ids).size, ids.length);
    assert.equal(new Set(labelIds).size, labelIds.length);
    for (const time of [0, 1.3, 9])
      for (const selection of [
        0, 0.15, 0.5, 1, 1.6, 1.97, 2, 2.3, 2.5, 3, 4.12, 4.65, 5,
      ]) {
        const frame = claimLifecycleFrame(time, selection, portrait);
        assert.deepEqual(frame, claimLifecycleFrame(time, selection, portrait));
        assert.deepEqual(
          frame.paths.map(({ id }) => id),
          ids,
        );
        assert.deepEqual(
          frame.labels.map(({ id }) => id),
          labelIds,
        );
        frame.paths.forEach((entry, index) => {
          assert.ok(entry.opacity >= 0 && entry.opacity <= 1, entry.id);
          const values = coordinates(entry.d);
          assert.equal(
            values.length,
            coordinates(initial.paths[index].d).length,
            entry.id,
          );
          values.forEach((value, axis) =>
            assert.ok(
              Number.isFinite(value) &&
                value >= 8 &&
                value <=
                  (axis % 2 ? (portrait ? 732 : 512) : portrait ? 412 : 792),
              entry.id,
            ),
          );
        });
      }
  }
});

test("both ships dwell at their docks and ambient time cannot advance either journey", () => {
  for (const portrait of [false, true]) {
    for (const [id, start, end] of [
      ["claim-ship-spacecraft-hull", 0, 0.14],
      ["claim-ship-spacecraft-hull", 1, 5],
      ["testament-ship-spacecraft-hull", 1.98, 2.2],
      ["testament-ship-spacecraft-hull", 3, 5],
    ] as const)
      assert.equal(
        path(claimLifecycleFrame(0, start, portrait), id).d,
        path(claimLifecycleFrame(8, end, portrait), id).d,
      );
    let before = claimLifecycleFrame(0.3, 0, portrait);
    for (let sample = 1; sample <= 1200; sample++) {
      const frame = claimLifecycleFrame(0.3, sample / 240, portrait);
      frame.paths.forEach((entry, index) => {
        const prior = coordinates(before.paths[index].d);
        coordinates(entry.d).forEach((value, axis) =>
          assert.ok(Math.abs(value - prior[axis]) < 23, entry.id),
        );
      });
      before = frame;
    }
  }
});

test("execution receipt is requested by the respondent, committed, and visibly granted back", () => {
  for (const portrait of [false, true]) {
    const request = journeyLifecycleFrame(0, 0.93, portrait),
      committed = journeyLifecycleFrame(0, 1, portrait),
      copy = journeyLifecycleFrame(0, 1.25, portrait),
      held = journeyLifecycleFrame(0, 2, portrait);
    assert.equal(states(request)[0], "Posted");
    assert.ok(path(request, "execution-receipt-request").opacity > 0.5);
    assert.equal(path(request, "execution-receipt-grant").opacity, 0);
    assert.equal(path(request, "holder-crossbar-outline").tone, "neutral");
    assert.equal(states(committed)[0], "Received");
    assert.equal(path(committed, "execution-receipt-grant").tone, "pass");
    assert.notEqual(
      path(committed, "execution-receipt-grant").d,
      path(copy, "execution-receipt-grant").d,
    );
    assert.notEqual(
      path(copy, "execution-receipt-grant").d,
      path(held, "execution-receipt-grant").d,
    );
    assert.equal(path(held, "execution-receipt-request").opacity, 0);
    assert.equal(path(held, "execution-receipt-socket").tone, "pass");
  }
});

test("claimant sends T1's acknowledgment into the ledger only after actual arrival", () => {
  for (const portrait of [false, true]) {
    const posted = journeyLifecycleFrame(0, 4, portrait),
      traveling = journeyLifecycleFrame(0, 4.93, portrait),
      received = journeyLifecycleFrame(0, 5, portrait);
    assert.equal(path(posted, "testament-delivery-ack").opacity, 0);
    assert.ok(path(traveling, "testament-delivery-ack").opacity > 0.5);
    assert.equal(states(traveling)[2], "Posted");
    assert.equal(path(traveling, "testament-delivery-ack").tone, "neutral");
    assert.notEqual(
      path(traveling, "testament-delivery-ack").d,
      path(received, "testament-delivery-ack").d,
    );
    assert.equal(states(received)[2], "Received");
    assert.equal(path(received, "testament-delivery-ack").opacity, 0);
    assert.equal(
      path(received, "testament-delivery-confirmation").tone,
      "pass",
    );
    const failed = journeyLifecycleFrame(0, 5, portrait, "missing");
    assert.equal(path(failed, "testament-delivery-ack").opacity, 0);
    assert.equal(path(failed, "testament-delivery-confirmation").tone, "pass");
    assert.equal(path(failed, "work-artifact-top").opacity, 0);
  }
});

test("T1 receipt visibly confirms back to the claimant before cargo inspection begins", () => {
  for (const portrait of [false, true]) {
    const before = journeyLifecycleFrame(0, 4.99, portrait),
      committed = journeyLifecycleFrame(0, 5, portrait),
      returning = journeyLifecycleFrame(0, 5.15, portrait),
      settled = journeyLifecycleFrame(0, 5.3, portrait),
      inspecting = journeyLifecycleFrame(0, 6, portrait);
    assert.equal(path(before, "testament-delivery-confirmation").opacity, 0);
    assert.equal(
      path(committed, "testament-delivery-confirmation").tone,
      "pass",
    );
    assert.ok(path(returning, "testament-delivery-confirmation").opacity > 0.8);
    assert.notEqual(
      path(committed, "testament-delivery-confirmation").d,
      path(returning, "testament-delivery-confirmation").d,
    );
    assert.notEqual(
      path(returning, "testament-delivery-confirmation").d,
      path(settled, "testament-delivery-confirmation").d,
    );
    assert.equal(
      path(settled, "testament-delivery-confirmation").d,
      path(inspecting, "testament-delivery-confirmation").d,
    );
    assert.ok(
      path(returning, "response-receipt-confirmation-wave").opacity > 0.4,
    );
    assert.equal(
      path(settled, "response-receipt-confirmation-wave").opacity,
      0,
    );
    assert.ok(path(settled, "testament-confirmation-socket").opacity > 0.5);
    assert.equal(path(returning, "inspection-cradle-top").opacity, 0);
    assert.ok(path(inspecting, "response-crossbar-outline").opacity > 0.45);
    assert.ok(
      !settled.paths.some(({ id }) => id === "response-receipt-port-seal"),
    );
  }
});

test("partial formation moves real parts without recording either object before its birth", () => {
  for (const portrait of [false, true]) {
    const readouts = [
      { id: "claim", title: "CLAIM", value: "Received" },
      { id: "artifact", title: "ARTIFACT", value: "Not generated" },
      { id: "testament", title: "TESTAMENT", value: "Not generated" },
      { id: "checks", title: "CHECKS", value: "Declared" },
    ];
    const forming = (amount: number) =>
      spacecraftJourneyFrame(0, 1.7, portrait, {
        artifactVisible: amount,
        testamentVisible: amount,
        readouts,
        deliveryReceived: false,
      });
    const early = forming(0.2),
      later = forming(0.8);
    for (const id of [
      "work-artifact-top",
      "testament-ship-spacecraft-cockpit",
      "testament-ship-spacecraft-wing-0",
      "testament-ship-spacecraft-engine-1",
    ]) {
      assert.notEqual(path(early, id).d, path(later, id).d, id);
      assert.ok(path(early, id).opacity < path(later, id).opacity, id);
    }
    for (const frame of [early, later]) {
      assert.deepEqual(states(frame), [
        "Received",
        "Not generated",
        "Not generated",
        "Declared",
      ]);
      assert.equal(path(frame, "ledger-append-lip-2").tone, "neutral");
      assert.equal(path(frame, "return-signal-pulse").opacity, 0);
      assert.equal(path(frame, "cargo-loading-hoist").opacity, 0);
      assert.equal(path(frame, "testament-delivery-confirmation").opacity, 0);
    }
    assert.deepEqual(
      early.paths.map(({ id }) => id),
      later.paths.map(({ id }) => id),
    );
  }
});

test("ship identity captions clear both spacecraft and the complete cargo-loading envelope", () => {
  const intersects = (a: number[], b: number[], box: number[]) => {
    let low = 0,
      high = 1;
    for (let axis = 0; axis < 2; axis++) {
      const delta = b[axis] - a[axis];
      if (Math.abs(delta) < 0.0001) {
        if (a[axis] < box[axis] || a[axis] > box[axis + 2]) return false;
      } else {
        const enter = (box[axis] - a[axis]) / delta,
          leave = (box[axis + 2] - a[axis]) / delta;
        low = Math.max(low, Math.min(enter, leave));
        high = Math.min(high, Math.max(enter, leave));
        if (low > high) return false;
      }
    }
    return true;
  };
  for (const portrait of [false, true])
    for (let sample = 40; sample <= 120; sample++) {
      const selection = sample / 20,
        frame = journeyLifecycleFrame(0, selection, portrait);
      for (const label of frame.labels.filter(
        ({ id, opacity }) =>
          id.endsWith("-message-id") && (opacity ?? 1) > 0.05,
      )) {
        const half = label.text.length * 3.6 + 3;
        const box = [label.x - half, label.y - 15, label.x + half, label.y + 5];
        for (const item of frame.paths.filter(
          ({ id, opacity }) =>
            /^(claim-ship-|testament-ship-|cargo-|work-artifact-)/.test(id) &&
            opacity > 0.05,
        )) {
          const values = coordinates(item.d);
          for (let index = 2; index < values.length; index += 2)
            assert.ok(
              !intersects(
                values.slice(index - 2, index),
                values.slice(index, index + 2),
                box,
              ),
              `${portrait ? "portrait" : "desktop"} ${selection}: ${label.text} touches ${item.id}`,
            );
        }
      }
    }
});

test("the same strapped cargo pod loads and locks onto generated T1 before posting", () => {
  for (const portrait of [false, true]) {
    const produced = journeyLifecycleFrame(0, 2, portrait),
      closed = journeyLifecycleFrame(0, 3, portrait),
      loading = journeyLifecycleFrame(0, 3.35, portrait),
      secured = journeyLifecycleFrame(0, 3.95, portrait),
      posted = journeyLifecycleFrame(0, 4, portrait);
    assert.ok(path(produced, "work-artifact-top").opacity > 0.5);
    assert.equal(path(produced, "testament-ship-spacecraft-hull").opacity, 0);
    assert.ok(path(produced, "cargo-loading-rack-top").opacity > 0);
    assert.equal(path(closed, "testament-ship-spacecraft-hull").opacity, 0.78);
    assert.equal(states(closed)[1], "Attached");
    assert.equal(states(loading)[2], "Generated");
    assert.ok(path(loading, "cargo-loading-hoist").opacity > 0.5);
    assert.notEqual(
      path(closed, "work-artifact-top").d,
      path(loading, "work-artifact-top").d,
    );
    assert.notEqual(
      path(loading, "work-artifact-top").d,
      path(secured, "work-artifact-top").d,
    );
    assert.notEqual(
      path(loading, "cargo-clamp-top").d,
      path(secured, "cargo-clamp-top").d,
    );
    assert.equal(
      path(secured, "work-artifact-top").d,
      path(posted, "work-artifact-top").d,
    );
    assert.equal(path(secured, "cargo-loading-rack-top").opacity, 0);
    assert.equal(path(secured, "cargo-loading-hoist").opacity, 0);
    assert.ok(path(secured, "cargo-pod-band-0").opacity > 0.5);
    assert.ok(path(secured, "cargo-pod-band-1").opacity > 0.5);
    assert.equal(
      path(closed, "testament-ship-spacecraft-hull").d,
      path(posted, "testament-ship-spacecraft-hull").d,
    );
  }
});

test("continuous journey ledger slots follow committed receipt and result readouts", () => {
  for (const [before, after, slot] of [
    [0.99, 1, 1],
    [4.99, 5, 4],
    [8.99, 9, 5],
  ] as const) {
    const pending = journeyLifecycleFrame(0, before, false),
      committed = journeyLifecycleFrame(0, after, false);
    assert.equal(path(pending, `ledger-append-lip-${slot}`).tone, "neutral");
    assert.equal(path(committed, `ledger-append-lip-${slot}`).tone, "pass");
  }
  assert.equal(
    path(journeyLifecycleFrame(0, 9, false, "fail"), "ledger-append-lip-5")
      .tone,
    "fail",
  );
});

test("the same returned artifact unloads into a substantial inspection cradle", () => {
  for (const portrait of [false, true]) {
    const received = claimLifecycleFrame(0, 3, portrait),
      inspecting = claimLifecycleFrame(0, 4, portrait);
    const before = coordinates(path(received, "work-artifact-top").d),
      after = coordinates(path(inspecting, "work-artifact-top").d);
    assert.ok(
      Math.hypot(after[0] - before[0], after[1] - before[1]) >
        (portrait ? 135 : 250),
    );
    assert.ok(path(inspecting, "inspection-cradle-top").opacity > 0.3);
    assert.equal(path(received, "inspection-cradle-top").opacity, 0);
    assert.equal(path(inspecting, "cargo-clamp-top").opacity, 0);
    assert.equal(
      received.paths.filter(({ id }) => id === "work-artifact-top").length,
      1,
    );
    assert.ok(
      path(inspecting, "posted-crossbar-outline").opacity <
        path(received, "posted-crossbar-outline").opacity * 0.5,
    );
    for (let row = 0; row < 7; row++)
      assert.ok(path(inspecting, `artifact-byte-rib-${row}`).opacity > 0.7);
  }
});

test("Behavior and Review make independent visible sweeps over fixed artifact bytes", () => {
  for (const portrait of [false, true]) {
    const first = claimLifecycleFrame(0, 4, portrait),
      later = claimLifecycleFrame(1.7, 4, portrait);
    assert.equal(
      path(first, "work-artifact-top").d,
      path(later, "work-artifact-top").d,
    );
    for (let row = 0; row < 7; row++)
      assert.equal(
        path(first, `artifact-byte-rib-${row}`).d,
        path(later, `artifact-byte-rib-${row}`).d,
      );
    for (let probe = 0; probe < 2; probe++) {
      assert.notEqual(
        path(first, `witness-scan-window-${probe}`).d,
        path(later, `witness-scan-window-${probe}`).d,
      );
      assert.ok(path(first, `witness-scan-edge-${probe}`).opacity > 0.4);
      assert.ok(path(first, `witness-beam-${probe}`).opacity > 0.4);
    }
  }
});

test("inspection passes withdraw probes, failures hold, errors retry, and missing evidence never scans", () => {
  const render = (
    time: number,
    tone: "pass" | "fail" | "error",
    artifactVisible = 1,
  ) =>
    spacecraftJourneyFrame(time, 4.4, false, {
      artifactVisible,
      probes: [
        {
          title: "Behavior",
          target: "A/hA",
          tone,
          active: true,
          progress: 0.6,
        },
        { title: "Review", target: "A/hA", tone, active: true, progress: 0.6 },
      ],
    });
  const passed = render(0, "pass"),
    failed = render(0, "fail"),
    error = render(0, "error"),
    missing = render(0, "error", 0);
  assert.equal(path(passed, "witness-beam-0").opacity, 0);
  assert.ok(path(passed, "witness-result-route-0").opacity > 0);
  assert.notEqual(
    path(passed, "witness-probe-head-0-top").d,
    path(failed, "witness-probe-head-0-top").d,
  );
  assert.equal(
    path(failed, "witness-probe-head-0-top").d,
    path(render(2, "fail"), "witness-probe-head-0-top").d,
  );
  assert.notEqual(
    path(error, "witness-probe-head-0-top").d,
    path(render(2, "error"), "witness-probe-head-0-top").d,
  );
  for (let probe = 0; probe < 2; probe++)
    for (const part of [
      "witness-beam",
      "witness-signal",
      "witness-scan-window",
      "witness-scan-edge",
    ])
      assert.equal(path(missing, `${part}-${probe}`).opacity, 0);
  assert.equal(path(missing, "work-artifact-top").opacity, 0);
  assert.equal(path(missing, "inspection-cradle-top").opacity, 0);
});
