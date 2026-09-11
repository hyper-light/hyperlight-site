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
