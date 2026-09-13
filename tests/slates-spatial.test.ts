import assert from "node:assert/strict";
import { test } from "node:test";
import {
  spatialCamera,
  spatialDrawing,
} from "../components/slates/spatial-drawing";

test("solid assemblies include both side faces under either fixed-camera yaw", () => {
  for (const yaw of [-0.32, 0.32]) {
    const drawing = spatialDrawing();
    const camera = spatialCamera([200, 200], { yaw });
    drawing.solid("body", camera, [0, 0, 0], [100, 50, 20]);
    for (const face of ["left", "side", "front", "far", "top"])
      assert.ok(
        drawing.paths.find(
          ({ id, material }) => id === `body-${face}` && material === "metal",
        ),
      );
    const left = drawing.paths.find(({ id }) => id === "body-left")!;
    const corners = [
      [0, 0, 0],
      [0, 50, 0],
      [0, 50, 20],
      [0, 0, 20],
    ] as const;
    for (const corner of corners) {
      const [x, y] = camera(corner);
      assert.ok(left.d.includes(`${x.toFixed(3)} ${y.toFixed(3)}`));
    }
  }
});

test("removing an assembly also removes its rim without changing topology", () => {
  const visible = spatialDrawing(),
    hidden = spatialDrawing();
  const camera = spatialCamera([200, 200]);
  visible.solid("body", camera, [0, 0, 0], [100, 50, 20], { opacity: 1 });
  hidden.solid("body", camera, [0, 0, 0], [100, 50, 20], { opacity: 0 });
  assert.deepEqual(
    visible.paths.map(({ id, d }) => ({ id, d })),
    hidden.paths.map(({ id, d }) => ({ id, d })),
  );
  assert.ok(hidden.paths.every(({ opacity }) => opacity === 0));
});
