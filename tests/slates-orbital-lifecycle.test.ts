import assert from "node:assert/strict";
import { test } from "node:test";
import {
  orbitalFleetState,
  orbitalFleetSteps,
} from "../components/slates/orbital-fleet-data";

test("the opening fleet story keeps each private workspace at its worker", () => {
  const base = orbitalFleetState(0);
  assert.equal(base.headVersion, "v0");
  assert.ok(base.agents.every((agent) => !agent.provisioned));
  assert.ok(orbitalFleetState(1).agents.every((agent) => agent.provisioned));
  assert.ok(orbitalFleetState(2).agents.every((agent) => agent.deployed));
  assert.ok(orbitalFleetState(3).agents.every((agent) => agent.edited));
  assert.ok(orbitalFleetState(4).agents.every((agent) => agent.submitted));
  for (const stage of [4, 5, 6, 7]) {
    assert.ok(orbitalFleetState(stage).agents.every((agent) => agent.deployed));
  }
});

test("candidate edits do not become committed versions before content verification", () => {
  const candidate = orbitalFleetState(5);
  assert.equal(candidate.checkedCount, 3);
  assert.equal(candidate.candidateVersion, "v3");
  assert.equal(candidate.acceptedCount, 0);
  assert.equal(candidate.headVersion, "v0");
  assert.equal(candidate.homeVerified, false);
  const home = orbitalFleetState(6);
  assert.equal(home.acceptedCount, 3);
  assert.equal(home.headVersion, "v3");
  assert.equal(home.homeVerified, true);
  assert.equal(home.mirrorVerified, false);
  assert.equal(home.reply, false);
  const ready = orbitalFleetState(7);
  assert.equal(ready.mirrorVerified, true);
  assert.equal(ready.reply, true);
  assert.equal(ready.diskChanged, false);
  assert.equal(ready.testsPassed, false);
});

test("fractional seeks preserve the causal order of deployment, edits and replies", () => {
  for (let sample = 0; sample <= 1400; sample++) {
    const state = orbitalFleetState(sample / 200);
    for (const agent of state.agents) {
      if (agent.deployProgress > 0) assert.ok(agent.provisioned);
      if (agent.editProgress > 0) assert.ok(agent.deployed);
      if (agent.submitProgress > 0) assert.ok(agent.edited);
      if (agent.checkProgress > 0) assert.ok(agent.submitted);
      assert.ok(
        [
          agent.provisionProgress,
          agent.deployProgress,
          agent.editProgress,
          agent.submitProgress,
          agent.checkProgress,
        ].every(
          (progress) =>
            Number.isFinite(progress) && progress >= 0 && progress <= 1,
        ),
      );
    }
    if (state.homeProgress > 0) assert.equal(state.checkedCount, 3);
    if (state.acceptedCount > 0) assert.ok(state.homeVerified);
    if (state.mirrorProgress > 0) assert.ok(state.homeVerified);
    if (state.replyProgress > 0) assert.ok(state.mirrorVerified);
    if (state.reply) assert.ok(state.homeVerified && state.mirrorVerified);
    assert.equal(state.diskChanged, false);
    assert.equal(state.testsPassed, false);
  }
});

test("fleet stages stay finite, replayable and limited to eight named steps", () => {
  for (const selection of [NaN, Infinity, -Infinity, -5]) {
    assert.deepEqual(orbitalFleetState(selection), orbitalFleetState(0));
  }
  assert.deepEqual(orbitalFleetState(100), orbitalFleetState(7));
  assert.deepEqual(orbitalFleetState(5.5), orbitalFleetState(5.5));
  assert.deepEqual(
    orbitalFleetSteps.map((step) => step.label),
    [
      "Base",
      "Provision",
      "Deploy",
      "Edit",
      "Submit",
      "Merge",
      "Replicate",
      "Ready",
    ],
  );
  assert.ok(orbitalFleetSteps.every((step) => (step.facts?.length ?? 0) <= 3));
});
