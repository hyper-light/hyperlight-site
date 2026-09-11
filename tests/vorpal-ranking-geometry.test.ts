import assert from "node:assert/strict";
import { test } from "node:test";
import {
  fusionDetails,
  fusionPoint,
  rankLeafDetails,
  rankLeafPoint,
  type RankingDetail,
} from "../components/vorpal-ranking-geometry";

const identity = (details: RankingDetail[]) =>
  details.map(({ id, points, kind, closed }) => [
    id,
    points.length,
    kind,
    closed,
  ]);

test("rank leaves preserve their flow attachments and have joined, finite thickness", () => {
  const center = [41, -12, 9] as const;
  for (const time of [0, 0.5, 3, 12, 90]) {
    const details = rankLeafDetails(time, center, 38, 4.4, 0.7);
    const edge = details.find(({ id }) => id === "edge")!;
    const bevel = details.find(({ id }) => id === "bevel")!;
    const rear = details.find(({ id }) => id === "back")!;
    // The portrait flow joins at u=.75, regardless of contour resolution.
    // A 16-segment leaf uses vertex 12; the previous 24-segment leaf used 18.
    assert.deepEqual(
      edge.points[(edge.points.length - 1) * 0.75],
      rankLeafPoint(time, center, 38, 4.4, 0.7, 0.75, -1),
    );
    assert.deepEqual(edge.points, bevel.points.slice(0, edge.points.length));
    assert.deepEqual(
      bevel.points.slice(edge.points.length).reverse(),
      rear.points.slice(0, edge.points.length),
    );
    for (let index = 0; index < edge.points.length; index++) {
      assert.equal(edge.points[index][0], rear.points[index][0]);
      assert.ok(
        Math.abs(edge.points[index][2] - rear.points[index][2] - 2.4) < 1e-10,
      );
    }
    // The original source-sheet and output-flow endpoints do not drift apart.
    assert.deepEqual(
      rankLeafPoint(time, center, 38, 4.4, 0.7, 0, 0),
      [3, -12, 9],
    );
    const tip = rankLeafPoint(time, center, 38, 4.4, 0.7, 1, 0);
    assert.equal(tip[0], 79);
    assert.ok(Math.abs(tip[1] + 12) < 1e-10);
    assert.ok(Math.abs(tip[2] - 9) < 1e-10);
    for (const rib of details.filter(({ kind }) => kind === "rib")) {
      assert.ok(rib.points[1][2] > rib.points[0][2]);
      assert.ok(rib.points.at(-2)![2] > rib.points.at(-1)![2]);
    }
  }
});

test("fusion vanes and collars share one bounded volume in both orientations", () => {
  for (const portrait of [false, true]) {
    for (const time of [0, 1, 6, 30, 120]) {
      const details = fusionDetails(time, portrait);
      assert.equal(new Set(details.map(({ id }) => id)).size, details.length);
      assert.ok(details.length < 120, "detail must not require a large mesh");
      for (const ring of [0, 1, 2, 3, 4]) {
        const collar = details.find(({ id }) => id === `spindle-${ring}`)!;
        assert.deepEqual(
          collar.points[0],
          fusionPoint(time, portrait, ring / 4, 0),
        );
      }
      for (const vane of [0, 1, 2, 3, 4, 5, 6, 7]) {
        const skin = details.find(({ id }) => id === `fusion-vane-${vane}`)!;
        const edge = details.find(
          ({ id }) => id === `fusion-vane-${vane}-edge`,
        )!;
        assert.deepEqual(skin.points.slice(0, edge.points.length), edge.points);
      }
      for (const { points } of details) {
        for (const point of points) {
          assert.ok(point.every(Number.isFinite));
          const axial = point[portrait ? 1 : 0];
          assert.ok(
            axial >= (portrait ? 12 : 38) && axial <= (portrait ? 92 : 118),
          );
          assert.ok(Math.abs(point[portrait ? 0 : 1]) <= 81);
          assert.ok(Math.abs(point[2]) <= 81);
        }
      }
    }
  }
});

test("laminated geometry deforms continuously with stable path identity and topology", () => {
  const build = (time: number) => [
    ...rankLeafDetails(time, [0, 0, 0], 38, 4.4, 0),
    ...fusionDetails(time, false),
  ];
  const initial = build(0);
  const topology = identity(initial);
  let previous = initial;
  let excursion = 0;
  for (let frame = 1; frame <= 600; frame++) {
    const next = build(frame / 60);
    assert.deepEqual(identity(next), topology);
    next.forEach((detail, shape) => {
      detail.points.forEach((point, vertex) => {
        point.forEach((coordinate, axis) => {
          assert.ok(
            Math.abs(coordinate - previous[shape].points[vertex][axis]) < 0.15,
          );
          excursion = Math.max(
            excursion,
            Math.abs(coordinate - initial[shape].points[vertex][axis]),
          );
        });
      });
    });
    previous = next;
  }
  assert.ok(excursion > 5, "geometry must evolve, not only the gradient");
});
