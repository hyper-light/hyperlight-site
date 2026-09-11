import assert from "node:assert/strict";
import { test } from "node:test";
import { comparisonSurface } from "../components/comparison-geometry";

const points = (path: string) =>
  Array.from(path.matchAll(/[ML](-?[\d.]+),(-?[\d.]+)/g), (match) => [
    Number(match[1]),
    Number(match[2]),
  ]);

test("comparison surfaces keep exact horizontal measurement endpoints at every pose", () => {
  for (const width of [0, 1, 63.25, 191.57, 600]) {
    for (const row of [0, 1, 2]) {
      for (const time of [0, 0.25, 2, 7, 30, 120]) {
        const shape = comparisonSurface(width, row, time);
        for (const contour of [
          shape.skin,
          shape.upper,
          shape.lower,
          shape.spine,
          shape.depth,
        ]) {
          const vertices = points(contour);
          assert.equal(Math.min(...vertices.map(([x]) => x)), 0);
          assert.equal(Math.max(...vertices.map(([x]) => x)), width);
          assert.ok(vertices.every((vertex) => vertex.every(Number.isFinite)));
          assert.ok(
            vertices.every(([, y]) => y > row * 72 + 20 && y < row * 72 + 49),
          );
        }
      }
    }
  }
});

test("ribbon geometry breathes continuously without resetting its topology or occupied length", () => {
  const initial = points(comparisonSurface(450, 0, 0).skin);
  let previous = initial;
  let excursion = 0;
  for (let frame = 1; frame <= 600; frame++) {
    const current = points(comparisonSurface(450, 0, frame / 60).skin);
    assert.equal(current.length, initial.length);
    current.forEach(([x, y], index) => {
      assert.equal(x, initial[index][0]);
      assert.ok(Math.abs(y - previous[index][1]) < 0.1);
      excursion = Math.max(excursion, Math.abs(y - initial[index][1]));
    });
    previous = current;
  }
  assert.ok(excursion > 3, "the body must move, not only its light");
});
