import assert from "node:assert/strict";
import { test } from "node:test";
import { orbitalFleetFrame } from "../components/slates/orbital-fleet-geometry";

test("provisioning feeds connect physical launch cradles with stable topology", () => {
  for (const portrait of [false, true]) {
    const hardware = (position: number) =>
      orbitalFleetFrame(3, position, portrait).paths.filter(({ id }) =>
        /^(provisioning-feed|assembly-cradle)-/.test(id),
      );
    const initial = hardware(0);
    assert.ok(initial.length > 40);
    assert.equal(new Set(initial.map(({ id }) => id)).size, initial.length);
    for (const position of [0.2, 0.5, 1, 1.4, 2, 7]) {
      const state = hardware(position);
      assert.deepEqual(
        state.map(({ id }) => id),
        initial.map(({ id }) => id),
      );
      assert.deepEqual(
        state.map(({ d }) => d.replace(/-?[\d.]+/g, "#")),
        initial.map(({ d }) => d.replace(/-?[\d.]+/g, "#")),
      );
      assert.ok(state.every(({ opacity }) => opacity >= 0 && opacity <= 1));
    }
    assert.ok(
      hardware(0.5).some(
        ({ id, opacity }) => id.includes("-allocation-") && opacity > 0.5,
      ),
    );
    assert.ok(
      hardware(1)
        .filter(({ id }) => id.includes("-allocation-"))
        .every(({ opacity }) => opacity === 0),
      "completed provisions stop sending allocation packets",
    );
    assert.ok(
      hardware(2).every(({ opacity }) => opacity === 0),
      "launch cradles withdraw after all ships leave",
    );
    assert.ok(
      hardware(7).every(({ opacity }) => opacity === 0),
      "committed stages never provision new workspaces",
    );
  }
});
