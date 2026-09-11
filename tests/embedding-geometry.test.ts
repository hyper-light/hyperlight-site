import assert from "node:assert/strict";
import { test } from "node:test";
import {
  embeddingFrame,
  lexicalExample,
  modeBlend,
  EMBEDDING_MODES,
} from "../components/embedding-geometry";

function coordinates(path: string): [number, number][] {
  const values = path.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
  return Array.from({ length: values.length / 2 }, (_, i) => [
    values[i * 2],
    values[i * 2 + 1],
  ]);
}

function renderedPaths(frame: ReturnType<typeof embeddingFrame>) {
  return [
    ...frame.surfaces,
    ...frame.lines,
    ...frame.connections,
    ...frame.flows,
    ...frame.outgoing,
    ...frame.rings,
    ...frame.materials.flatMap(
      ({ front, back, wall, rim, ribs, etching, sheen }) => [
        front,
        back,
        wall,
        rim,
        ribs,
        etching,
        sheen,
      ],
    ),
    ...frame.inputs.flatMap(({ body, skin, back, ribs }) => [
      body,
      skin,
      back,
      ribs,
    ]),
    ...frame.outputMaterials.flatMap(({ spine, skin, ribs }) => [
      spine,
      skin,
      ribs,
    ]),
    ...frame.outputSegments.map((segment) => segment.path),
    ...frame.vectors.map((vector) => vector.ray),
  ];
}

test("embedding strands stay joined to their token curves throughout motion and mode changes", () => {
  for (const portrait of [false, true]) {
    for (const blend of [
      ...EMBEDDING_MODES.map(modeBlend),
      [0.2, 0.3, 0.5] as [number, number, number],
    ]) {
      for (const time of [0, 1, 5, 15, 100]) {
        const frame = embeddingFrame(time, blend, portrait);
        for (let i = 0; i < frame.flows.length; i++) {
          const token = coordinates(frame.inputs[Math.floor(i / 2)].body);
          const end = token[token.length - 1];
          const [start, control] = coordinates(frame.flows[i]);
          assert.deepEqual(
            start,
            end,
            `strand ${i} at t=${time}, portrait=${portrait}`,
          );
          const prior = token[token.length - 2];
          const a = [end[0] - prior[0], end[1] - prior[1]];
          const b = [control[0] - start[0], control[1] - start[1]];
          const alignment =
            (a[0] * b[0] + a[1] * b[1]) / (Math.hypot(...a) * Math.hypot(...b));
          assert.ok(alignment > 0.999, `strand ${i} has a kink at t=${time}`);
        }
      }
    }
  }
});

test("embedding output strands terminate on the projected vector sphere", () => {
  for (const portrait of [false, true]) {
    for (const time of [0, 1, 5, 15, 100]) {
      const frame = embeddingFrame(time, modeBlend("learned"), portrait);
      const sphere = frame.rings.flatMap(coordinates);
      for (const strand of frame.outgoing) {
        const points = coordinates(strand);
        const end = points[points.length - 1];
        assert.ok(
          sphere.some(([x, y]) => Math.hypot(x - end[0], y - end[1]) < 0.02),
          "output is disconnected from the sphere",
        );
      }
    }
  }
});

test("embedding scenes keep stable topology and finite geometry in every mode and layout", () => {
  for (const portrait of [false, true]) {
    for (const mode of EMBEDDING_MODES) {
      for (const time of [0, 1, 15, 10000]) {
        const frame = embeddingFrame(time, modeBlend(mode), portrait);
        assert.equal(frame.surfaces.length, 8);
        assert.equal(frame.cells.length, 256);
        assert.equal(frame.flows.length, 6);
        assert.equal(frame.vectors.length, 18);
        assert.doesNotMatch(JSON.stringify(frame), /NaN|Infinity|null/);
        for (const point of [
          ...frame.cells,
          ...frame.vectors.map((v) => v.point),
        ]) {
          assert.ok(point.x > 0 && point.x < (portrait ? 420 : 800));
          assert.ok(point.y > 0 && point.y < (portrait ? 634 : 510));
        }
      }
    }
  }
});

test("embedding geometry is continuous over animation frames and modes are distinct", () => {
  const silhouettes = new Set<string>();
  for (const mode of EMBEDDING_MODES) {
    const a = embeddingFrame(8, modeBlend(mode));
    const b = embeddingFrame(8 + 1 / 60, modeBlend(mode));
    silhouettes.add(a.surfaces.join(""));
    for (let i = 0; i < a.cells.length; i++) {
      assert.ok(
        Math.hypot(a.cells[i].x - b.cells[i].x, a.cells[i].y - b.cells[i].y) <
          1,
      );
    }
  }
  assert.equal(silhouettes.size, 3);
});

test("lexical example uses two signed hashes per token and has a unit-length output", () => {
  const { routes, tokens, vector } = lexicalExample();
  assert.deepEqual(tokens, ["resolve", "import", "path"]);
  assert.equal(routes.length, 6);
  assert.equal(vector.length, 256);
  for (const token of tokens)
    assert.equal(routes.filter((r) => r.token === token).length, 2);
  for (const route of routes) {
    assert.ok(route.bucket >= 0 && route.bucket < 256);
    assert.ok(route.sign === 1 || route.sign === -1);
  }
  assert.ok(
    Math.abs(vector.reduce((sum, value) => sum + value * value, 0) - 1) < 1e-12,
  );
  assert.deepEqual(lexicalExample(), lexicalExample());
});

test("embedding materials have actual projected thickness and stay joined to their front faces", () => {
  for (const portrait of [false, true]) {
    for (const mode of EMBEDDING_MODES) {
      const frame = embeddingFrame(3, modeBlend(mode), portrait);
      assert.equal(frame.materials?.length, frame.surfaces.length);
      for (const [index, material] of frame.materials.entries()) {
        const front = coordinates(frame.surfaces[index]);
        const back = coordinates(material.back);
        assert.equal(front.length, back.length);
        assert.ok(
          front.some(
            ([x, y], i) => Math.hypot(x - back[i][0], y - back[i][1]) > 1,
          ),
        );
        const wall = coordinates(material.wall);
        assert.deepEqual(wall.slice(0, front.length), front);
        assert.deepEqual(wall.slice(front.length), back.toReversed());
        assert.ok(material.etching.length > 0);
        assert.ok(material.ribs.length > 0);
      }
    }
  }
});

test("token ribbons and vector-shell details share the same surfaces as their connections", () => {
  for (const portrait of [false, true]) {
    for (const time of [0, 4, 19]) {
      const frame = embeddingFrame(time, modeBlend("neural"), portrait);
      for (const input of frame.inputs) {
        const curve = coordinates(input.body);
        const skin = coordinates(input.skin);
        assert.deepEqual(skin.slice(0, curve.length), curve);
        assert.ok(input.ribs.length > 0);
      }
      assert.equal(frame.outputMaterials?.length, 8);
      for (const [index, material] of frame.outputMaterials.entries()) {
        assert.equal(material.spine, frame.rings[9 + index]);
        assert.ok(material.skin.length > 0);
        assert.ok(material.ribs.length > 0);
      }
    }
  }
});

test("all engraving and material paths keep their topology and fit both layouts throughout a motion cycle", () => {
  const topology = (paths: string[]) =>
    paths.map((value) => value.match(/[MLCQZ]/g)?.join(""));
  for (const portrait of [false, true]) {
    const initial = topology(
      renderedPaths(embeddingFrame(0, [1, 0, 0], portrait)),
    );
    for (const blend of [
      ...EMBEDDING_MODES.map(modeBlend),
      [0.25, 0.5, 0.25] as [number, number, number],
    ]) {
      for (let time = 0; time <= 40; time += 2) {
        const paths = renderedPaths(embeddingFrame(time, blend, portrait));
        assert.deepEqual(topology(paths), initial);
        for (const [x, y] of paths.flatMap(coordinates)) {
          assert.ok(
            x > 8 && x < (portrait ? 412 : 792),
            `horizontal clipping at ${x}, t=${time}`,
          );
          assert.ok(
            y > 30 && y < (portrait ? 618 : 460),
            `vertical clipping at ${y}, t=${time}`,
          );
        }
      }
    }
  }
});

test("material motion has no vertex or illumination jumps at successive sixty-Hz frames", () => {
  for (const portrait of [false, true]) {
    for (const mode of EMBEDDING_MODES) {
      for (let time = 0; time <= 40; time += 4) {
        const a = embeddingFrame(time, modeBlend(mode), portrait);
        const b = embeddingFrame(time + 1 / 60, modeBlend(mode), portrait);
        const before = renderedPaths(a).flatMap(coordinates);
        const after = renderedPaths(b).flatMap(coordinates);
        assert.equal(before.length, after.length);
        for (let index = 0; index < before.length; index++) {
          assert.ok(
            Math.hypot(
              before[index][0] - after[index][0],
              before[index][1] - after[index][1],
            ) < 1,
          );
        }
        for (let index = 0; index < a.outputSegments.length; index++) {
          assert.ok(
            Math.abs(
              a.outputSegments[index].light - b.outputSegments[index].light,
            ) < 0.01,
          );
        }
      }
    }
  }
});
