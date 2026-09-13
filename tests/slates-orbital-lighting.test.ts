import assert from "node:assert/strict";
import { test } from "node:test";
import { orbitalVolume } from "../components/slates/orbital-volume-drawing";
import { spatialDrawing } from "../components/slates/spatial-drawing";

test("orbital hulls use opaque directional light rather than the same gradient on every face", () => {
  const d = spatialDrawing();
  orbitalVolume(d, "hull", [0, 0], 1, { time: 0, activity: 0 }).box(
    "test",
    [0, 0, 0],
    [30, 20, 15],
    "armor",
  );
  const faces = d.paths.filter((path) => path.fillColor);
  assert.equal(faces.length, 3);
  assert.equal(new Set(faces.map((path) => path.fillColor)).size, 3);
  assert.ok(
    faces.every((path) => path.opacity === 1 && path.fillOpacity === 1),
  );
  const brightness = (id: string) => {
    const color = faces.find((path) => path.id === id)!.fillColor!;
    return [...color.matchAll(/\d+/g)].reduce(
      (sum, match) => sum + Number(match[0]),
      0,
    );
  };
  assert.ok(brightness("hull-test-top") > brightness("hull-test-front") * 2);
  assert.ok(brightness("hull-test-left") > brightness("hull-test-front"));
});

test("the orbital camera separates height, width and depth without altering legacy materials", () => {
  const d = spatialDrawing();
  const { p } = orbitalVolume(d, "hull", [0, 0], 1, { time: 0, activity: 0 });
  const origin = p([0, 0, 0]);
  const axes = [p([20, 0, 0]), p([0, 20, 0]), p([0, 0, 20])].map((point) => [
    point[0] - origin[0],
    point[1] - origin[1],
  ]);
  for (let i = 0; i < axes.length; i++)
    for (let j = i + 1; j < axes.length; j++)
      assert.ok(
        Math.abs(axes[i][0] * axes[j][1] - axes[i][1] * axes[j][0]) > 50,
      );
  d.face(
    "legacy",
    [
      [0, 0],
      [1, 0],
      [1, 1],
    ],
    "metal",
  );
  assert.equal(d.paths[0].fillColor, undefined);
  assert.equal(d.paths[0].strokeOpacity, undefined);
});
