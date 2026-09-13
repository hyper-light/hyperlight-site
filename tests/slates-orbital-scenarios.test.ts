import assert from "node:assert/strict";
import { orbitalWorkerActivity } from "../components/slates/orbital-scenario-activity";
import { test } from "node:test";
import { orbitalFleetSteps } from "../components/slates/orbital-fleet-data";
import {
  orbitalScenarios,
  orbitalScenarioState,
  orbitalScenarioSteps,
  type OrbitalScenario,
} from "../components/slates/orbital-fleet-scenarios";

const state = (scenario: OrbitalScenario, position: number) => {
  const value = orbitalScenarioState(scenario, position);
  assert.ok(value);
  return value;
};

test("private editing, head inspection and revision have distinct compute activity", () => {
  assert.equal(orbitalWorkerActivity("success", 1, 0), undefined);
  assert.ok(
    orbitalWorkerActivity("conflict", 1, 0)! >
      orbitalWorkerActivity("conflict", 0, 0)!,
  );
  assert.ok(
    orbitalWorkerActivity("conflict", 5, 1)! >
      orbitalWorkerActivity("conflict", 4, 1)!,
  );
  assert.equal(orbitalWorkerActivity("conflict", 5, 2), 0.12);
  for (let p = 0; p <= 7; p += 0.01)
    for (let worker = 0; worker < 3; worker++) {
      const activity = orbitalWorkerActivity("conflict", p, worker)!;
      assert.ok(activity >= 0 && activity <= 1);
      assert.ok(
        Math.abs(
          activity - orbitalWorkerActivity("conflict", p + 1e-6, worker)!,
        ) < 0.0001,
      );
    }
});

test("success retains its existing lifecycle; five faults are separate bounded stories", () => {
  assert.equal(orbitalScenarioSteps("success"), orbitalFleetSteps);
  assert.equal(orbitalScenarioState("success", 3), null);
  assert.equal(orbitalScenarios.length, 6);
  assert.equal(new Set(orbitalScenarios.map((value) => value.value)).size, 6);
  for (const { value } of orbitalScenarios.filter(
    (value) => value.value !== "success",
  )) {
    assert.ok(orbitalScenarioSteps(value).length >= 8);
    assert.deepEqual(state(value, Infinity), state(value, 0));
    assert.deepEqual(state(value, NaN), state(value, 0));
    assert.deepEqual(state(value, -5), state(value, 0));
    assert.deepEqual(
      state(value, 100),
      state(value, orbitalScenarioSteps(value).length - 1),
    );
  }
});

test("every fractional story state is replayable, finite and fits the caption budget", () => {
  for (const { value } of orbitalScenarios.filter(
    (value) => value.value !== "success",
  ))
    for (
      let sample = 0;
      sample <= (orbitalScenarioSteps(value).length - 1) * 100;
      sample++
    ) {
      const at = sample / 100,
        s = state(value, at);
      assert.deepEqual(s, state(value, at));
      assert.ok(s.caption.length <= 40, `${value}/${at}: ${s.caption}`);
      assert.ok(s.footer.length <= 47, `${value}/${at}: ${s.footer}`);
      assert.ok(s.ownerStatus.length <= 28, `${value}/${at}: ${s.ownerStatus}`);
      assert.ok(s.homeStatus.length <= 16, `${value}/${at}: ${s.homeStatus}`);
      assert.ok(
        s.mirrorStatus.length <= 20,
        `${value}/${at}: ${s.mirrorStatus}`,
      );
      assert.ok(
        s.workerReadouts.every((text) => text.length <= 25),
        `${value}/${at}: ${s.workerReadouts.join(" | ")}`,
      );
      for (const progress of [
        s.ownerDisabled,
        s.homeDisabled,
        s.mirrorDisabled,
        ...s.checks,
        ...Object.values(s.traffic).flatMap((packet) => [
          packet.progress,
          packet.loss ?? 0,
        ]),
      ])
        assert.ok(
          Number.isFinite(progress) && progress >= 0 && progress <= 1,
          `${value}/${at}`,
        );
    }
});

test("conflicting edits preserve accepted work until deliberate revision and a new acceptance", () => {
  assert.equal(state("conflict", 1).commitVersion, "v0");
  assert.equal(state("conflict", 2).commitVersion, "v1");
  const conflict = state("conflict", 3);
  assert.match(conflict.workerReadouts[1], /80 \/ 90 \/ 60/);
  assert.equal(conflict.commitVersion, "v1");
  assert.match(state("conflict", 4).workerReadouts[1], /fresh v1 · 90/);
  assert.match(state("conflict", 5).workerReadouts[1], /choose 85/);
  assert.equal(state("conflict", 6).commitVersion, "v1");
  assert.equal(state("conflict", 7).commitVersion, "v2");
  assert.match(state("conflict", 7).ownerStatus, /85/);
  assert.ok(state("conflict", 7).replyReceived);
});

test("missing content is received, verified and acknowledged before the candidate commits", () => {
  assert.equal(state("missing", 0).chunkState, "missing");
  assert.equal(state("missing", 1).chunkState, "missing");
  assert.equal(state("missing", 3).chunkState, "received");
  assert.equal(state("missing", 4).chunkState, "verified");
  assert.equal(state("missing", 5).commitVersion, "v0");
  assert.equal(state("missing", 5).checks[2], 1);
  assert.equal(state("missing", 6).commitVersion, "v3");
  assert.equal(state("missing", 5).workerReadouts[0], "W1 · await placement");
  assert.equal(state("missing", 6).workerReadouts[0], "W1 · await reply");
  assert.equal(state("missing", 6.97).workerReadouts[0], "W1 · await reply");
  assert.equal(state("missing", 7).workerReadouts[0], "W1 · received v3");
  assert.equal(state("missing", 7).workerTones[0], "pass");
  assert.ok(state("missing", 7).replyReceived);
  for (let sample = 0; sample <= 700; sample++) {
    const s = state("missing", sample / 100);
    if (s.commitVersion === "v3") {
      assert.equal(s.chunkState, "verified");
      assert.equal(s.checks[2], 1);
    }
    if (s.checks[2] === 1) assert.equal(s.chunkState, "verified");
  }
});

test("unavailable content never gains a placement acknowledgement or commits a candidate", () => {
  assert.equal(state("unavailable", 0).chunkState, "missing");
  for (let sample = 0; sample <= 700; sample++) {
    const s = state("unavailable", sample / 100);
    assert.equal(s.commitVersion, "v0");
    assert.equal(s.checks[2], 0);
    assert.notEqual(s.chunkState, "verified");
  }
  assert.equal(state("unavailable", 7).chunkState, "unavailable");
  assert.equal(state("unavailable", 4).ownerStatus, "v3 candidate · head v0");
  assert.equal(state("unavailable", 4.93).ownerTone, "pending");
  assert.equal(state("unavailable", 5).ownerStatus, "v0 · candidate refused");
  assert.equal(state("unavailable", 4.5).traffic.homeBack?.tone, "fail");
  assert.equal(
    state("unavailable", 6.97).workerReadouts[0],
    "W1 · await placement",
  );
  assert.equal(state("unavailable", 6.97).workerTones[0], "pending");
  assert.equal(state("unavailable", 7).workerReadouts[0], "W1 · unavailable");
  assert.equal(state("unavailable", 7).workerTones[0], "fail");
  assert.match(state("unavailable", 7).homeStatus, /no ACK/);
  assert.ok(
    state("unavailable", 7).replyReceived,
    "caller gets a failure, not silence or a success",
  );
});

test("a lost reply keeps R17 and returns the original S7 without another effect", () => {
  for (let sample = 0; sample <= 700; sample++) {
    const s = state("reply-loss", sample / 100);
    assert.equal(s.requestId, "R17");
    assert.equal(s.commitVersion, "v3");
    assert.doesNotMatch(s.workerReadouts.join(" ") + s.ownerStatus, /R18|S8/);
  }
  assert.match(state("reply-loss", 1).ownerStatus, /R17 → S7/);
  assert.equal(
    state("reply-loss", 1).ownerStatus,
    state("reply-loss", 2).ownerStatus,
    "the effect and completion are already retained before the Record highlight",
  );
  assert.deepEqual(state("reply-loss", 1).checks, [1, 0, 0]);
  assert.deepEqual(state("reply-loss", 1.93).checks, [1, 0, 0]);
  assert.deepEqual(state("reply-loss", 2).checks, [1, 1, 0]);
  assert.deepEqual(state("reply-loss", 6).checks, [1, 1, 1]);
  assert.match(state("reply-loss", 3).workerReadouts[0], /unknown/);
  assert.equal(state("reply-loss", 6).replyReceived, false);
  assert.match(state("reply-loss", 7).workerReadouts[0], /received S7/);
  assert.ok(state("reply-loss", 7).replyReceived);
});

test("suspecting or authorizing a new owner does not skip fencing, recovery or recommit", () => {
  assert.equal(state("owner-loss", 0).serving, "owner");
  assert.equal(state("owner-loss", 1).epoch, 4);
  assert.equal(state("owner-loss", 2).epoch, 5);
  for (const at of [1, 2, 3, 4, 5, 6])
    assert.equal(state("owner-loss", at).serving, "none");
  assert.equal(state("owner-loss", 3).checks[0], 1);
  assert.equal(state("owner-loss", 4).checks[1], 1);
  assert.equal(state("owner-loss", 5).chunkState, "verified");
  assert.equal(state("owner-loss", 6).checks[2], 1);
  assert.equal(state("owner-loss", 6.8).replyReceived, false);
  assert.equal(state("owner-loss", 6.8).traffic.worker1ToHome?.progress, 1);
  assert.equal(state("owner-loss", 6.98).serving, "home");
  assert.ok(state("owner-loss", 6.98).traffic.homeToWorker1!.progress > 0);
  assert.equal(state("owner-loss", 7).replyReceived, true);
  for (let sample = 0; sample <= 800; sample++) {
    const s = state("owner-loss", sample / 100);
    assert.equal(s.commitVersion, "v3");
    assert.equal(s.mirrorName, "HOME HOLDER C");
    if (s.serving === "home") {
      assert.equal(s.epoch, 5);
      assert.deepEqual(s.checks, [1, 1, 1]);
      assert.equal(s.chunkState, "verified");
    }
  }
  assert.equal(state("owner-loss", 8).serving, "home");
  assert.match(state("owner-loss", 8).ownerStatus, /StaleEpoch/);
});
