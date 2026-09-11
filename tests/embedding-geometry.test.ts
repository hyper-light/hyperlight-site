import assert from "node:assert/strict";
import { test } from "node:test";
import {
  embeddingFrame,
  lexicalExample,
  modeBlend,
  EMBEDDING_MODES,
  EMBEDDING_CYCLE,
  type Blend,
  type EmbeddingFrame,
} from "../components/embedding-geometry";

function coordinates(path: string): [number, number][] {
  const values = path.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
  return Array.from({ length: values.length / 2 }, (_, index) => [
    values[index * 2],
    values[index * 2 + 1],
  ]);
}
function renderedPaths(frame: EmbeddingFrame) {
  return [
    ...frame.hardware.map((part) => part.d),
    ...frame.surfaces,
    ...frame.lines,
    ...frame.connections,
    ...frame.paths.map((route) => route.d),
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
  ];
}
const blends: Blend[] = [...EMBEDDING_MODES.map(modeBlend), [0.2, 0.3, 0.5]];
const round = (point: { x: number; y: number }) => [
  Number(point.x.toFixed(2)),
  Number(point.y.toFixed(2)),
];

test("lexical hashing keeps the exact signed buckets and normalized output", () => {
  const { tokens, routes, vector } = lexicalExample();
  assert.deepEqual(tokens, ["resolve", "import", "path"]);
  assert.deepEqual(routes, [
    { token: "resolve", bucket: 163, sign: -1 },
    { token: "resolve", bucket: 144, sign: -1 },
    { token: "import", bucket: 244, sign: 1 },
    { token: "import", bucket: 82, sign: 1 },
    { token: "path", bucket: 118, sign: -1 },
    { token: "path", bucket: 1, sign: -1 },
  ]);
  assert.equal(vector.length, 256);
  assert.equal(vector.filter((value) => value !== 0).length, 6);
  assert.ok(
    Math.abs(vector.reduce((sum, value) => sum + value * value, 0) - 1) < 1e-12,
  );
  routes.forEach(({ bucket, sign }) =>
    assert.ok(Math.abs(vector[bucket] - sign / Math.sqrt(6)) < 1e-12),
  );
  assert.deepEqual(lexicalExample(), lexicalExample());
});

test("one dominant GPU contains mounted packages, keyed contacts and an output buffer in both layouts", () => {
  for (const portrait of [false, true]) {
    for (const time of [0, 3, 17, 40]) {
      const frame = embeddingFrame(time, [1, 0, 0], portrait);
      const parts = frame.hardware;
      assert.equal(new Set(parts.map((part) => part.id)).size, parts.length);
      assert.equal(parts.filter((part) => part.kind === "memory").length, 12);
      assert.equal(parts.filter((part) => part.kind === "contact").length, 29);
      for (const id of [
        "pcb",
        "mounting-bracket",
        "gpu-package",
        "die-substrate",
        "vector-buffer",
      ])
        assert.ok(
          parts.some((part) => part.id === id),
          id,
        );
      const board = coordinates(parts.find((part) => part.id === "pcb")!.d);
      const width =
        Math.max(...board.map(([x]) => x)) - Math.min(...board.map(([x]) => x));
      const height =
        Math.max(...board.map(([, y]) => y)) -
        Math.min(...board.map(([, y]) => y));
      assert.ok(
        width > (portrait ? 420 : 800) * 0.55,
        "GPU fills the scene horizontally",
      );
      assert.ok(
        height > (portrait ? 634 * 0.6 : 510 * 0.5),
        "GPU fills the scene vertically",
      );
      assert.equal(frame.cells.length, 256);
      assert.equal(
        frame.materials.length,
        8,
        "fixed exposed die tiles, not folded mode layers",
      );
      for (const key of [
        "inputs",
        "flows",
        "outgoing",
        "rings",
        "vectors",
        "outputMaterials",
      ])
        assert.ok(!(key in frame), "no detached ribbon or sphere API: " + key);
    }
  }
});

test("board, memory and die have shared front/back vertices and real projected thickness", () => {
  for (const portrait of [false, true]) {
    for (const time of [0, 3, 17]) {
      const frame = embeddingFrame(time, [1, 0, 0], portrait);
      const parts = frame.hardware;
      const front = coordinates(parts.find((part) => part.id === "pcb")!.d);
      const back = coordinates(parts.find((part) => part.id === "pcb-back")!.d);
      assert.equal(front.length, 16, "connector notch is in the board outline");
      assert.equal(back.length, front.length);
      front.forEach((point, index) => {
        assert.ok(
          Math.hypot(point[0] - back[index][0], point[1] - back[index][1]) > 1,
        );
        const next = (index + 1) % front.length;
        assert.deepEqual(
          coordinates(parts.find((part) => part.id === "pcb-wall-" + index)!.d),
          [point, front[next], back[next], back[index]],
        );
      });
      for (let index = 0; index < 12; index++) {
        const top = coordinates(
          parts.find((part) => part.id === "memory-" + index)!.d,
        );
        for (let edge = 0; edge < 4; edge++) {
          const wall = coordinates(
            parts.find(
              (part) => part.id === "memory-" + index + "-wall-" + edge,
            )!.d,
          );
          assert.deepEqual(wall.slice(0, 2), [top[edge], top[(edge + 1) % 4]]);
          assert.ok(
            Math.hypot(wall[0][0] - wall[3][0], wall[0][1] - wall[3][1]) > 1,
          );
        }
      }
      frame.materials.forEach((material) => {
        const face = coordinates(material.front),
          rear = coordinates(material.back);
        assert.deepEqual(coordinates(material.wall), [
          ...face,
          ...rear.toReversed(),
        ]);
        assert.ok(material.etching.length > 0 && material.ribs.length > 0);
      });
    }
  }
});

test("every token enters a physical finger then branches to its exact signed die addresses", () => {
  const routes = lexicalExample().routes;
  for (const portrait of [false, true]) {
    for (const blend of blends) {
      const frame = embeddingFrame(3.4, blend, portrait);
      assert.deepEqual(frame.paths.map(({ kind }) => kind).sort(), [
        ...Array(39).fill("compute"),
        ...Array(3).fill("input"),
        ...Array(3).fill("output"),
        ...Array(10).fill("reduce"),
      ]);
      routes.forEach(({ token, bucket, sign }, index) => {
        const input = frame.paths.find(
          (route) => route.id === "input-" + Math.floor(index / 2),
        )!;
        const compute = frame.paths.find(
          (route) => route.id === "compute-" + index,
        )!;
        const reduce = frame.paths.find(
          (route) => route.id === "reduce-" + index,
        )!;
        assert.deepEqual(round(input.end), round(compute.start));
        assert.deepEqual(
          { token: compute.token, bucket: compute.bucket, sign: compute.sign },
          { token, bucket, sign },
        );
        assert.deepEqual(round(compute.end), round(frame.cells[bucket]));
        assert.deepEqual(round(reduce.start), round(frame.cells[bucket]));
        assert.deepEqual(
          round(reduce.end),
          round(frame.paths.find((route) => route.id === "reduce-0")!.end),
        );
        assert.deepEqual(
          coordinates(compute.d).at(-1),
          round(frame.cells[bucket]),
        );
      });
      const contacts = frame.hardware
        .filter((part) => part.kind === "contact")
        .map((part) => coordinates(part.d));
      for (const input of frame.paths.filter(
        (route) => route.kind === "input",
      )) {
        assert.ok(
          contacts.some((face) => {
            const center = face.reduce(
              (point, [x, y]) => [
                point[0] + x / face.length,
                point[1] + y / face.length,
              ],
              [0, 0],
            );
            return (
              Math.hypot(center[0] - input.end.x, center[1] - input.end.y) <
              0.02
            );
          }),
          "incoming signal terminates at a physical contact",
        );
      }
    }
  }
});

test("packet positions exactly sample their rendered routes by normalized arc length", () => {
  for (const portrait of [false, true]) {
    for (let time = 0; time <= 8; time += 0.13) {
      const frame = embeddingFrame(time, [1, 0, 0], portrait);
      assert.equal(frame.signals.length, frame.paths.length);
      for (const signal of frame.signals) {
        const route = frame.paths.find((item) => item.id === signal.pathId)!;
        assert.ok(route && route.kind === signal.kind);
        const points = coordinates(route.d);
        const lengths = points
          .slice(1)
          .map(([x, y], i) => Math.hypot(x - points[i][0], y - points[i][1]));
        let length =
          lengths.reduce((sum, value) => sum + value, 0) * signal.progress;
        let expected = points[0];
        for (let index = 0; index < lengths.length; index++) {
          if (length <= lengths[index] || index === lengths.length - 1) {
            const amount = lengths[index]
              ? Math.max(0, Math.min(1, length / lengths[index]))
              : 0;
            expected = [
              points[index][0] +
                (points[index + 1][0] - points[index][0]) * amount,
              points[index][1] +
                (points[index + 1][1] - points[index][1]) * amount,
            ];
            break;
          }
          length -= lengths[index];
        }
        assert.ok(
          Math.hypot(
            signal.point.x - expected[0],
            signal.point.y - expected[1],
          ) < 1e-9,
        );
        assert.ok(signal.progress >= 0 && signal.progress <= 1);
        assert.ok(signal.opacity >= 0 && signal.opacity <= 1);
        assert.equal(route.activity, signal.opacity);
      }
    }
  }
});

test("receive, process, reduce and emit are causal, finite windows in the eight-second cycle", () => {
  assert.equal(EMBEDDING_CYCLE, 8);
  for (const [time, stage] of [
    [0, "receive"],
    [2.199, "receive"],
    [2.2, "process"],
    [5.799, "process"],
    [5.8, "emit"],
    [7.999, "emit"],
    [8, "receive"],
  ] as const)
    assert.equal(embeddingFrame(time, [1, 0, 0]).phase.stage, stage);
  for (const [time, kind] of [
    [1, "input"],
    [3, "compute"],
    [5.4, "reduce"],
    [6.8, "output"],
  ] as const) {
    const frame = embeddingFrame(time, [1, 0, 0]);
    const visible = frame.signals.filter((signal) => signal.opacity > 0);
    assert.ok(visible.length > 0, kind + " is visibly active");
    assert.ok(visible.every((signal) => signal.kind === kind));
  }
  for (let time = 0; time < 8; time += 0.05) {
    const frame = embeddingFrame(time, [1, 0, 0]);
    for (const signal of frame.signals.filter((item) => item.opacity > 0)) {
      if (signal.kind === "compute") assert.ok(time >= 2.2);
      if (signal.kind === "reduce")
        assert.ok(
          time > 4.76,
          "all input-to-die routes arrived before pooling",
        );
      if (signal.kind === "output")
        assert.ok(
          time > 5.76,
          "all die-to-buffer routes arrived before emission",
        );
    }
  }
  for (const time of [0, 7.999, 8, 8.001, 16])
    assert.ok(
      embeddingFrame(time, [1, 0, 0]).signals.every(
        (signal) => signal.opacity === 0,
      ),
      "no visible packet teleports at a loop boundary",
    );
});

test("modes share one rigid board and addressed cells; activity blends without geometry popping", () => {
  for (const portrait of [false, true]) {
    const reference = embeddingFrame(3.7, [1, 0, 0], portrait);
    const modes = EMBEDDING_MODES.map((mode) =>
      embeddingFrame(3.7, modeBlend(mode), portrait),
    );
    assert.equal(
      new Set(modes.map((frame) => JSON.stringify(frame.cellActivity))).size,
      3,
    );
    for (const frame of modes) {
      assert.deepEqual(frame.hardware, reference.hardware);
      assert.deepEqual(frame.surfaces, reference.surfaces);
      assert.deepEqual(frame.cells, reference.cells);
      assert.deepEqual(
        frame.paths.map(({ id, d, start, end }) => ({ id, d, start, end })),
        reference.paths.map(({ id, d, start, end }) => ({ id, d, start, end })),
      );
    }
    const blend: Blend = [0.2, 0.3, 0.5];
    const mixed = embeddingFrame(3.7, blend, portrait);
    mixed.cellActivity.forEach((value, index) => {
      assert.ok(
        Math.abs(
          value -
            modes.reduce(
              (sum, frame, mode) =>
                sum + frame.cellActivity[index] * blend[mode],
              0,
            ),
        ) < 1e-12,
      );
      assert.ok(value >= 0 && value <= 1);
    });
    const hot = new Set(lexicalExample().routes.map(({ bucket }) => bucket));
    reference.cellActivity.forEach((value, index) =>
      assert.ok(hot.has(index) ? value >= 0.055 : value === 0.055),
    );
  }
});

test("mode-specific route families use memory retrieval, signed addresses or contextual stages without geometry changes", () => {
  for (const portrait of [false, true]) {
    const frames = EMBEDDING_MODES.map((mode) =>
      embeddingFrame(4.05, modeBlend(mode), portrait),
    );
    assert.equal(
      new Set(
        frames.map((frame) =>
          frame.paths
            .filter(({ activity }) => activity > 0.1)
            .map(({ id }) => id)
            .join(","),
        ),
      ).size,
      3,
    );
    frames.forEach((frame, index) => {
      assert.equal(frame.paths.length, 55);
      assert.deepEqual(
        ["lexical", "learned", "neural"].map(
          (mode) => frame.paths.filter((path) => path.mode === mode).length,
        ),
        [12, 15, 22],
      );
      frame.paths.forEach((route) => {
        assert.equal(
          route.weight,
          route.mode ? Number(route.mode === EMBEDDING_MODES[index]) : 1,
        );
        if (route.mode && route.mode !== EMBEDDING_MODES[index])
          assert.equal(route.activity, 0);
        if (route.mode !== "lexical") {
          assert.equal(route.bucket, undefined);
          assert.equal(route.sign, undefined);
        }
      });
      for (let token = 0; token < 3; token++) {
        for (let source = 0; source < 2; source++) {
          const suffix = token * 2 + source;
          const read = frame.paths.find(
            ({ id }) => id === `learned-read-${suffix}`,
          )!;
          const pool = frame.paths.find(
            ({ id }) => id === `learned-pool-${suffix}`,
          )!;
          const reduce = frame.paths.find(
            ({ id }) => id === `learned-reduce-${token}`,
          )!;
          assert.deepEqual(
            read.start,
            frame.paths.find(({ id }) => id === `input-${token}`)!.end,
          );
          assert.deepEqual(read.end, pool.start);
          assert.deepEqual(pool.end, reduce.start);
          const bank = [
            [1, 8],
            [3, 9],
            [5, 7],
          ][token][source];
          const face = coordinates(
            frame.hardware.find(({ id }) => id === `memory-${bank}`)!.d,
          );
          const center = face.reduce(
            (sum, point) => [sum[0] + point[0] / 4, sum[1] + point[1] / 4],
            [0, 0],
          );
          assert.ok(
            Math.hypot(read.end.x - center[0], read.end.y - center[1]) < 0.2,
            "retrieval terminates on the memory package front, not an overlay",
          );
        }
      }
      for (let stage = 0; stage < 6; stage++) {
        const route = frame.paths.find(
          ({ id }) => id === `neural-layer-${stage}`,
        )!;
        const next = frame.paths.find(
          ({ id }) => id === `neural-layer-${stage + 1}`,
        )!;
        const weights = frame.paths.find(
          ({ id }) => id === `neural-weights-${stage + 1}`,
        )!;
        assert.deepEqual(route.end, next.start);
        assert.deepEqual(route.end, weights.end);
      }
      assert.deepEqual(
        frame.paths.find(({ id }) => id === "neural-layer-6")!.end,
        frame.paths.find(({ id }) => id === "neural-cls")!.start,
      );
    });
  }
});

test("physical component activity and core operations express sparse, grouped and dense computation", () => {
  const modes = EMBEDDING_MODES.map((mode) =>
    embeddingFrame(5.4, modeBlend(mode)),
  );
  assert.deepEqual(
    modes.map(
      (frame) => frame.cellActivity.filter((value) => value > 0.35).length,
    ),
    [6, 96, 256],
  );
  assert.deepEqual(
    modes.map(
      (frame) =>
        frame.cellOperations.filter((operation) => operation !== "none").length,
    ),
    [6, 96, 256],
  );
  lexicalExample().routes.forEach(({ bucket, sign }) =>
    assert.equal(
      modes[0].cellOperations[bucket],
      sign === 1 ? "add" : "subtract",
    ),
  );
  for (const mode of EMBEDDING_MODES) {
    for (let time = 0; time <= 8; time += 0.04) {
      const frame = embeddingFrame(time, modeBlend(mode));
      Object.entries(frame.partActivity).forEach(([id, value]) => {
        assert.ok(
          frame.hardware.some((part) => part.id === id),
          "activity belongs to actual hardware",
        );
        assert.ok(value >= 0 && value <= 1);
        if (mode === "lexical" && id.startsWith("memory-"))
          assert.equal(value, 0);
      });
      frame.cellActivity.forEach((value) =>
        assert.ok(value >= 0 && value <= 1),
      );
    }
  }
  const learned = embeddingFrame(3.65, modeBlend("learned"));
  assert.ok(
    Object.entries(learned.partActivity)
      .filter(([id]) => /^memory-\d+$/.test(id))
      .some(([, value]) => value > 0.5),
  );
  const neural = embeddingFrame(4.05, modeBlend("neural"));
  assert.ok(
    Object.entries(neural.partActivity)
      .filter(([id]) => /^memory-\d+$/.test(id))
      .some(([, value]) => value > 0.5),
  );
  const pendingRead = embeddingFrame(2.4, modeBlend("learned"));
  assert.ok(
    pendingRead.signals.some(
      ({ pathId, opacity }) =>
        pathId.startsWith("learned-read-") && opacity > 0,
    ),
  );
  assert.ok(
    Object.entries(pendingRead.partActivity)
      .filter(([id]) => /^memory-\d+$/.test(id))
      .every(([, value]) => value === 0),
    "a destination memory package stays quiet until its request arrives",
  );
  const pendingContext = embeddingFrame(0.415 * 8, modeBlend("neural"));
  assert.ok(
    pendingContext.cellActivity
      .filter((_, index) => Math.floor(index / 16) < 4 && index % 16 >= 8)
      .every((value) => value === 0.055),
    "the adjacent tile stays quiet until the interaction reaches it",
  );
  const initial = embeddingFrame(0, modeBlend("neural"));
  assert.ok(
    initial.cellActivity.every((value) => value === 0.055),
    "no operation before input arrives",
  );
  assert.ok(
    modes.every((frame) =>
      frame.labels.every(
        ({ id }) => !id.startsWith("math-") && id !== "output-norm",
      ),
    ),
    "math is carried by physical operations, with no equation inscriptions",
  );
});

test("signed writes, learned pooling and neural MAC pulses precede held results on the same cells", () => {
  const frameAt = (mode: "lexical" | "learned" | "neural", progress: number) =>
    embeddingFrame(progress * 8, modeBlend(mode));
  lexicalExample().routes.forEach(({ bucket, sign }, index) => {
    const arrival = 0.405 + index * 0.038;
    assert.equal(
      frameAt("lexical", arrival - 0.001).operationActivity[bucket],
      0,
    );
    const writing = frameAt("lexical", arrival + 0.02);
    assert.equal(writing.cellOperations[bucket], sign > 0 ? "add" : "subtract");
    assert.equal(writing.operationActivity[bucket], 1);
    const held = frameAt("lexical", arrival + 0.05);
    assert.equal(held.operationActivity[bucket], 0);
    assert.ok(held.cellActivity[bucket] > 0.9);
  });
  for (const [mode, cell, multiply, add, done] of [
    ["learned", 64, 0.58, 0.615, 0.69],
    ["neural", 0, 0.47, 0.5, 0.56],
  ] as const) {
    const product = frameAt(mode, multiply);
    const sum = frameAt(mode, add);
    const held = frameAt(mode, done);
    assert.equal(product.cellOperations[cell], "multiply");
    assert.ok(product.operationActivity[cell] > 0.9);
    assert.equal(sum.cellOperations[cell], "add");
    assert.ok(sum.operationActivity[cell] > 0.9);
    assert.equal(held.operationActivity[cell], 0);
    assert.ok(held.cellActivity[cell] > 0.35);
  }
  for (const [mode, cell, boundary] of [
    ["learned", 64, 0.6],
    ["neural", 0, 0.483],
  ] as const) {
    const before = frameAt(mode, boundary - 1e-7);
    const after = frameAt(mode, boundary + 1e-7);
    assert.notEqual(before.cellOperations[cell], after.cellOperations[cell]);
    assert.ok(
      before.operationActivity[cell] < 1e-8 &&
        after.operationActivity[cell] < 1e-8,
      "multiply and add glyphs meet at zero opacity",
    );
  }
  for (const mode of EMBEDDING_MODES) {
    for (let time = 0; time <= 8; time += 0.037) {
      const state = embeddingFrame(time, modeBlend(mode));
      assert.equal(state.operationActivity.length, 256);
      assert.ok(
        state.operationActivity.every((value) => value >= 0 && value <= 1),
      );
      if (time < 2.2 || time > 6)
        assert.ok(state.operationActivity.every((value) => value === 0));
    }
  }
});

test("operation-family changes fade glyphs through zero without fading the compute surface", () => {
  const before = embeddingFrame(5, [0.5001, 0.4999, 0]);
  const crossing = embeddingFrame(5, [0.5, 0.5, 0]);
  const after = embeddingFrame(5, [0.4999, 0.5001, 0]);
  assert.equal(crossing.operationOpacity, 0);
  assert.ok(
    before.operationOpacity < 0.00001 && after.operationOpacity < 0.00001,
  );
  assert.ok(
    before.cellOperations.some(
      (operation, index) => operation !== after.cellOperations[index],
    ),
  );
  assert.ok(crossing.cellActivity.some((activity) => activity > 0.2));
  for (const mode of EMBEDDING_MODES)
    assert.equal(embeddingFrame(5, modeBlend(mode)).operationOpacity, 1);
});

test("the process clock restarts independently without resetting the board pose or topology", () => {
  const before = embeddingFrame(15.3, modeBlend("learned"), false, 5.4);
  const restarted = embeddingFrame(15.3, modeBlend("learned"), false, 0);
  assert.deepEqual(before.hardware, restarted.hardware);
  assert.deepEqual(before.materials, restarted.materials);
  assert.deepEqual(before.cells, restarted.cells);
  assert.deepEqual(
    before.paths.map(({ d }) => d),
    restarted.paths.map(({ d }) => d),
  );
  assert.equal(restarted.phase.stage, "receive");
  assert.equal(restarted.phase.progress, 0);
  assert.ok(restarted.signals.every(({ opacity }) => opacity === 0));
  assert.ok(restarted.cellActivity.every((value) => value === 0.055));
  assert.deepEqual(
    embeddingFrame(15.3, [1, 0, 0], false, Infinity),
    embeddingFrame(15.3, [1, 0, 0], false, 0),
  );
});

test("the complete GPU and its port labels remain finite, in bounds and topologically stable", () => {
  const topology = (frame: EmbeddingFrame) =>
    renderedPaths(frame).map((value) => value.match(/[MLCQZ]/g)?.join(""));
  for (const portrait of [false, true]) {
    const first = embeddingFrame(0, [1, 0, 0], portrait);
    const expected = topology(first);
    for (const blend of blends) {
      for (let time = 0; time <= 40; time += 2) {
        const frame = embeddingFrame(time, blend, portrait);
        assert.deepEqual(topology(frame), expected);
        assert.deepEqual(
          frame.paths.map(({ id }) => id),
          first.paths.map(({ id }) => id),
        );
        assert.deepEqual(
          frame.signals.map(({ id }) => id),
          first.signals.map(({ id }) => id),
        );
        assert.deepEqual(
          frame.labels.map(({ id }) => id),
          first.labels.map(({ id }) => id),
        );
        assert.doesNotMatch(JSON.stringify(frame), /NaN|Infinity|null/);
        for (const [x, y] of [
          ...renderedPaths(frame).flatMap(coordinates),
          ...frame.labels.map(({ x, y }) => [x, y]),
        ]) {
          assert.ok(
            x > 5 && x < (portrait ? 415 : 795),
            "horizontal clipping at " + x,
          );
          assert.ok(
            y > 5 && y < (portrait ? 629 : 505),
            "vertical clipping at " + y,
          );
        }
        frame.cells.forEach((point, index) => {
          const tile =
            Math.floor(Math.floor(index / 16) / 4) * 2 +
            Math.floor((index % 16) / 8);
          const face = coordinates(frame.surfaces[tile]);
          const sides = face.map(([x, y], edge) => {
            const next = face[(edge + 1) % face.length];
            return (
              (next[0] - x) * (point.y - y) - (next[1] - y) * (point.x - x)
            );
          });
          assert.ok(
            sides.every((value) => value > 0) ||
              sides.every((value) => value < 0),
            "socket stays on its own raised die tile",
          );
        });
      }
    }
  }
});

test("physical hardware moves continuously and invalid time resolves to the initial scene", () => {
  for (const portrait of [false, true]) {
    for (let time = 0; time <= 40; time += 2) {
      const before = renderedPaths(
        embeddingFrame(time, [1, 0, 0], portrait),
      ).flatMap(coordinates);
      const after = renderedPaths(
        embeddingFrame(time + 1 / 60, [1, 0, 0], portrait),
      ).flatMap(coordinates);
      assert.equal(before.length, after.length);
      before.forEach(([x, y], index) =>
        assert.ok(Math.hypot(x - after[index][0], y - after[index][1]) < 1),
      );
    }
    for (const time of [-1, NaN, Infinity, -Infinity])
      assert.deepEqual(
        embeddingFrame(time, [1, 0, 0], portrait),
        embeddingFrame(0, [1, 0, 0], portrait),
      );
  }
});
