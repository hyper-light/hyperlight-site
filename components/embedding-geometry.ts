import {
  embeddingGpuFrame,
  gpuCellPoint,
  gpuMemoryPoint,
  gpuTilePoint,
} from "./embedding-gpu-geometry";

/** A complete GPU-shaped teaching scene, not a hardware requirement. */
export type EmbeddingMode = "lexical" | "learned" | "neural";
export type Blend = [number, number, number];
type V3 = [number, number, number];
export type Point = { x: number; y: number; depth: number };
export const EMBEDDING_MODES: EmbeddingMode[] = [
  "lexical",
  "learned",
  "neural",
];
export const EMBEDDING_CYCLE = 8;
export type EmbeddingPathKind = "input" | "compute" | "reduce" | "output";
export type EmbeddingPath = {
  id: string;
  kind: EmbeddingPathKind;
  d: string;
  activity: number;
  weight: number;
  mode?: EmbeddingMode;
  start: Point;
  end: Point;
  token?: string;
  bucket?: number;
  sign?: number;
};
export type EmbeddingSignal = {
  id: string;
  pathId: string;
  kind: EmbeddingPathKind;
  point: Point;
  /** Normalized projected path length, eased over the route's time window. */
  progress: number;
  opacity: number;
  weight: number;
  mode?: EmbeddingMode;
  radius: number;
};
export type EmbeddingLabel = {
  id: string;
  text: string;
  x: number;
  y: number;
  anchor: "start" | "middle" | "end";
  kind: "token" | "port" | "vector";
  opacity: number;
};
export type EmbeddingFrame = ReturnType<typeof embeddingGpuFrame> & {
  cellActivity: number[];
  cellOperations: ("add" | "subtract" | "multiply" | "none")[];
  /** Transient arithmetic, separate from the cell's held-result illumination. */
  operationActivity: number[];
  /** Fade glyphs through zero when the dominant operation family changes. */
  operationOpacity: number;
  partActivity: Record<string, number>;
  paths: EmbeddingPath[];
  signals: EmbeddingSignal[];
  labels: EmbeddingLabel[];
  phase: {
    stage: "receive" | "process" | "emit";
    progress: number;
    cycle: number;
  };
};
const example = lexicalExample();
const clamp = (value: number) => Math.max(0, Math.min(1, value));
const smooth = (value: number) => value * value * (3 - 2 * value);
const fmt = (value: number) => value.toFixed(2);
const path = (points: Point[]) =>
  points
    .map(
      (point, index) => `${index ? "L" : "M"}${fmt(point.x)},${fmt(point.y)}`,
    )
    .join("");

export function modeBlend(mode: EmbeddingMode): Blend {
  return EMBEDDING_MODES.map((key) => Number(key === mode)) as Blend;
}

/** Board, packages, contacts, traces, sockets and signal endpoints share this pose.
 * Portrait rotates the same board into a tall card; it does not reshape the PCB.
 */
function projector(time: number, portrait: boolean) {
  const yaw = -0.4 + Math.sin(time * 0.22) * 0.027;
  const pitch = -0.48 + Math.sin(time * 0.17) * 0.022;
  const roll = -0.22 + Math.sin(time * 0.14) * 0.012;
  const cy = Math.cos(yaw),
    sy = Math.sin(yaw);
  const cp = Math.cos(pitch),
    sp = Math.sin(pitch);
  const cr = Math.cos(roll),
    sr = Math.sin(roll);
  const scale = portrait ? 1.28 : 1.58;
  return ([x, y, z]: V3): Point => {
    const rx = x * cy + z * sy;
    const rz = -x * sy + z * cy;
    const ry = y * cp - rz * sp;
    const xx = rx * cr - ry * sr;
    const yy = rx * sr + ry * cr;
    return {
      x: portrait ? 210 - yy * scale : 408 + xx * scale,
      y: portrait ? 322 + xx * scale : 217 + yy * scale,
      depth: y * sp + rz * cp,
    };
  };
}

/** Sample the exact rounded SVG polyline by projected arc length. */
function sample(points: Point[], progress: number): Point {
  const lengths = points
    .slice(1)
    .map((point, index) =>
      Math.hypot(point.x - points[index].x, point.y - points[index].y),
    );
  let remaining = lengths.reduce((sum, length) => sum + length, 0) * progress;
  for (let index = 0; index < lengths.length; index++) {
    const length = lengths[index];
    if (remaining <= length || index === lengths.length - 1) {
      const amount = length ? clamp(remaining / length) : 0;
      const a = points[index],
        b = points[index + 1];
      return {
        x: a.x + (b.x - a.x) * amount,
        y: a.y + (b.y - a.y) * amount,
        depth: a.depth + (b.depth - a.depth) * amount,
      };
    }
    remaining -= length;
  }
  return points[0];
}

export function embeddingFrame(
  time: number,
  blend: Blend,
  portrait = false,
  processTime = time,
): EmbeddingFrame {
  const clock = Number.isFinite(time) ? Math.max(0, time) : 0;
  const processClock = Number.isFinite(processTime)
    ? Math.max(0, processTime)
    : 0;
  const progress = (processClock % EMBEDDING_CYCLE) / EMBEDDING_CYCLE;
  const project = projector(clock, portrait);
  const gpu = embeddingGpuFrame(clock, project);
  const paths: EmbeddingPath[] = [];
  const signals: EmbeddingSignal[] = [];
  const labels: EmbeddingLabel[] = [];
  const phase: EmbeddingFrame["phase"] = {
    stage: progress < 0.275 ? "receive" : progress < 0.725 ? "process" : "emit",
    progress,
    cycle: Math.floor(processClock / EMBEDDING_CYCLE),
  };
  const route = (
    id: string,
    kind: EmbeddingPathKind,
    local: V3[],
    from: number,
    to: number,
    metadata: Pick<EmbeddingPath, "token" | "bucket" | "sign" | "mode"> = {},
  ) => {
    const points = local.map((point) => {
      const projected = project(point);
      // Match the rendered path coordinates, including their precision.
      return {
        ...projected,
        x: Number(fmt(projected.x)),
        y: Number(fmt(projected.y)),
      };
    });
    const fraction = clamp((progress - from) / (to - from));
    const travel = smooth(fraction);
    const opacity =
      smooth(clamp(fraction / 0.12)) * smooth(clamp((1 - fraction) / 0.18));
    const weight = metadata.mode
      ? blend[EMBEDDING_MODES.indexOf(metadata.mode)]
      : 1;
    paths.push({
      id,
      kind,
      d: path(points),
      activity: opacity * weight,
      weight,
      start: points[0],
      end: points[points.length - 1],
      ...metadata,
    });
    signals.push({
      id: id + "-signal",
      pathId: id,
      kind,
      point: sample(points, travel),
      progress: travel,
      opacity: opacity * weight,
      weight,
      mode: metadata.mode,
      radius: kind === "compute" ? 2.4 : kind === "output" ? 2.1 : 2,
    });
  };
  const label = (
    id: string,
    text: string,
    location: V3,
    kind: EmbeddingLabel["kind"],
    anchor: EmbeddingLabel["anchor"] = "middle",
    dx = 0,
    dy = 0,
  ) => {
    const point = project(location);
    labels.push({
      id,
      text,
      x: point.x + dx,
      y: point.y + dy,
      kind,
      anchor,
      opacity: 1,
    });
  };

  // Three real connector fingers feed two signed hash routes per token. The
  // numbers and signs are exact only for the lexical teaching example.
  const contactX = [-116, -38, 46];
  const contacts = contactX.map((x): V3 => [x, 113.5, 0.7]);
  const inputs = contacts.map(([x, , z]): V3 => [x, portrait ? 146 : 167, z]);
  example.tokens.forEach((token, index) => {
    route(
      `input-${index}`,
      "input",
      [inputs[index], contacts[index]],
      0.015 + index * 0.035,
      0.18 + index * 0.04,
      { token },
    );
    if (portrait) {
      const point = project(inputs[index]);
      labels.push({
        id: `token-${index}`,
        text: token,
        x: 10,
        y: point.y + 17,
        anchor: "start",
        kind: "token",
        opacity: 1,
      });
    } else
      label(`token-${index}`, token, inputs[index], "token", "middle", 0, 20);
  });
  example.routes.forEach(({ token, bucket, sign }, index) => {
    const input = Math.floor(index / 2);
    const branch = index % 2 ? 1.3 : -1.3;
    const lane = [-107, -52, 52][input] + branch;
    const cell = gpuCellPoint(bucket);
    const start = contacts[input];
    route(
      `compute-${index}`,
      "compute",
      [
        start,
        [start[0], 99, 0.8],
        [lane, 99, 0.8],
        [lane, 66, 1.2],
        [cell[0], 66, 12],
        cell,
      ],
      0.275 + index * 0.038,
      0.405 + index * 0.038,
      { token, bucket, sign, mode: "lexical" },
    );
    route(
      `reduce-${index}`,
      "reduce",
      [
        cell,
        [-62, cell[1], 16],
        [-83, cell[1], 1.4],
        [-83, -10, 1.4],
        [-131, -10, 7.2],
      ],
      0.61 + index * 0.009,
      0.72,
      { token, bucket, sign, mode: "lexical" },
    );
  });
  // Learned query inference retrieves existing word/subword vectors. These
  // memory routes do not represent retraining PPMI/SVD for every query.
  const learnedBanks = [
    [1, 8],
    [3, 9],
    [5, 7],
  ];
  const pooledTiles = [2, 3, 6];
  example.tokens.forEach((token, tokenIndex) => {
    const pool = gpuTilePoint(pooledTiles[tokenIndex]);
    learnedBanks[tokenIndex].forEach((bank, sourceIndex) => {
      const index = tokenIndex * 2 + sourceIndex;
      const memory = gpuMemoryPoint(bank);
      const input = contacts[tokenIndex];
      route(
        `learned-read-${index}`,
        "compute",
        [input, [input[0], 99, 0.8], [memory[0], 99, 0.8], memory],
        0.282 + index * 0.015,
        0.382 + index * 0.015,
        { token, mode: "learned" },
      );
      const lane = memory[0] < 0 ? -82 : 82;
      route(
        `learned-pool-${index}`,
        "compute",
        [memory, [lane, memory[1], 1.5], [lane, pool[1], 1.5], pool],
        0.465 + index * 0.012,
        0.565 + index * 0.012,
        { token, mode: "learned" },
      );
    });
    route(
      `learned-reduce-${tokenIndex}`,
      "reduce",
      [
        pool,
        [-62, pool[1], 16],
        [-83, pool[1], 1.4],
        [-83, -10, 1.4],
        [-131, -10, 7.2],
      ],
      0.64 + tokenIndex * 0.011,
      0.72,
      { token, mode: "learned" },
    );
  });

  // The neural family uses the board differently: token interaction, staged
  // encoder tiles supplied by memory, then one CLS-like pooled representation.
  // Eight teaching tiles do not assert the model's actual layer/core count.
  const encoderOrder = [0, 1, 3, 2, 4, 5, 7, 6];
  const contextPoints = example.tokens.map((_, index): V3 => [
    -24,
    -42.5 + index * 5,
    20.2,
  ]);
  example.tokens.forEach((token, index) => {
    const start = contacts[index];
    route(
      `neural-entry-${index}`,
      "compute",
      [
        start,
        [start[0], 99, 0.8],
        [0, 99, 0.8],
        [0, 62, 12],
        contextPoints[index],
      ],
      0.285 + index * 0.018,
      0.365 + index * 0.018,
      { token, mode: "neural" },
    );
    route(
      `neural-context-${index}`,
      "compute",
      [
        contextPoints[index],
        [24, -42.5 + index * 5, 20.2],
        contextPoints[(index + 1) % 3],
      ],
      0.407 + index * 0.007,
      0.437 + index * 0.007,
      { token, mode: "neural" },
    );
  });
  encoderOrder.forEach((tile, index) => {
    const center = gpuTilePoint(tile);
    const memory = gpuMemoryPoint(index);
    const from = index === 0 ? 0.437 : 0.458 + (index - 1) * 0.027;
    const to = index === 0 ? 0.458 : from + 0.027;
    route(
      `neural-weights-${index}`,
      "compute",
      [memory, [memory[0], center[1], 2], center],
      from,
      to,
      { mode: "neural" },
    );
    if (index < encoderOrder.length - 1) {
      const next = gpuTilePoint(encoderOrder[index + 1]);
      route(
        `neural-layer-${index}`,
        "compute",
        [center, next],
        0.458 + index * 0.027,
        0.485 + index * 0.027,
        { mode: "neural" },
      );
    }
  });
  const cls = gpuTilePoint(encoderOrder[7]);
  route(
    "neural-cls",
    "reduce",
    [
      cls,
      [-62, cls[1], 16],
      [-83, cls[1], 1.4],
      [-83, -10, 1.4],
      [-131, -10, 7.2],
    ],
    0.66,
    0.72,
    { mode: "neural" },
  );

  // The board-mounted buffer receives the completed representation; a small
  // parallel bus exits through its I/O bracket. No detached output object.
  [-6, 0, 6].forEach((offset, index) => {
    route(
      `output-${index}`,
      "output",
      [
        [-155, -10 + offset, 7.2],
        [-173, -10 + offset, 8],
        [portrait ? -219 : -228, -10 + offset, 8],
      ],
      0.745 + index * 0.04,
      0.875 + index * 0.04,
    );
  });
  label("buffer", "L2", [-143, -10, 7.5], "port", "middle", 0, 3);
  if (portrait) {
    labels.push({
      id: "input-port",
      text: "TOKENS",
      x: 10,
      y: project(inputs[0]).y - 18,
      anchor: "start",
      kind: "port",
      opacity: 1,
    });
    labels.push({
      id: "output-port",
      text: "NORMALIZED VECTOR",
      x: 210,
      y: 20,
      anchor: "middle",
      kind: "vector",
      opacity: 1,
    });
  } else {
    label(
      "input-port",
      "TOKEN SIGNALS",
      [-38, 132, 0.7],
      "port",
      "middle",
      0,
      2,
    );
    labels.push({
      id: "output-port",
      text: "VECTOR OUTPUT",
      x: 27,
      y: 174,
      anchor: "start",
      kind: "vector",
      opacity: 1,
    });
  }

  // The patterns below illustrate different kinds of work, never measured
  // utilization or fabricated embedding values. They are driven by arrivals at
  // physical components, not ambient oscillation unrelated to the data flow.
  const fade = 1 - smooth(clamp((progress - 0.725) / 0.06));
  const learnedTileActivity = Array<number>(8).fill(0);
  pooledTiles.forEach((tile, tokenIndex) => {
    const first = smooth(
      clamp((progress - (0.565 + tokenIndex * 0.024)) / 0.014),
    );
    const second = smooth(
      clamp((progress - (0.577 + tokenIndex * 0.024)) / 0.014),
    );
    learnedTileActivity[tile] = (first * 0.32 + second * 0.48) * fade;
  });
  const neuralTileActivity = Array<number>(8).fill(0);
  encoderOrder.forEach((tile, index) => {
    const arrival = index === 0 ? 0.458 : 0.485 + (index - 1) * 0.027;
    const entered = smooth(clamp((progress - arrival) / 0.012));
    const leading = 1 - smooth(clamp((progress - arrival - 0.04) / 0.055));
    // A bright current front plus overlapping dense work on visited tiles.
    neuralTileActivity[tile] = entered * (0.44 + leading * 0.5) * fade;
  });
  const context =
    smooth(clamp((progress - 0.365) / 0.025)) *
    (1 - smooth(clamp((progress - 0.437) / 0.025)));
  neuralTileActivity[0] = Math.max(neuralTileActivity[0], context * 0.72);
  neuralTileActivity[1] = Math.max(
    neuralTileActivity[1],
    context * 0.55 * smooth(clamp((progress - 0.422) / 0.012)),
  );
  const dominantMode = blend.indexOf(Math.max(...blend));
  const sortedBlend = [...blend].sort((a, b) => b - a);
  const operationOpacity = smooth(
    clamp((sortedBlend[0] - sortedBlend[1]) / 0.15),
  );
  const cellOperations: EmbeddingFrame["cellOperations"] = [];
  const operationActivity: number[] = [];
  const operationPulse = (from: number, to: number) => {
    const fraction = clamp((progress - from) / (to - from));
    return smooth(clamp(fraction / 0.2)) * smooth(clamp((1 - fraction) / 0.2));
  };
  const cellActivity = gpu.cells.map((_, index) => {
    const row = Math.floor(index / 16),
      column = index % 16;
    const tile = Math.floor(row / 4) * 2 + Math.floor(column / 8);
    const routeIndex = example.routes.findIndex(
      (item) => item.bucket === index,
    );
    const arrived =
      routeIndex < 0
        ? 0
        : smooth(clamp((progress - (0.405 + routeIndex * 0.038)) / 0.025));
    const lexical = 0.055 + (routeIndex < 0 ? 0 : 0.905 * arrived * fade);
    // Two memory fetches accumulate into a moderately dense token group.
    const learned =
      0.055 +
      learnedTileActivity[tile] *
        (0.65 + 0.35 * (((column % 4) + (row % 2)) / 4));
    // Ordered lanes ripple inside the overlapping encoder tiles; previously
    // reached tiles retain work while the next tile receives the representation.
    const stageIndex = encoderOrder.indexOf(tile);
    const stageArrival =
      stageIndex === 0 ? 0.458 : 0.485 + (stageIndex - 1) * 0.027;
    const laneArrival = stageArrival + (row % 4) * 0.003 + (column % 8) * 0.001;
    const lane = smooth(clamp((progress - laneArrival) / 0.012));
    const neural = 0.055 + neuralTileActivity[tile] * (0.7 + 0.3 * lane);
    // Arithmetic lives on the same die cells as the held results. Every pulse
    // follows a delivered input; none is driven by a free-running random wave.
    let operation: EmbeddingFrame["cellOperations"][number] = "none";
    let activity = 0;
    if (dominantMode === 0 && routeIndex >= 0) {
      operation = example.routes[routeIndex].sign > 0 ? "add" : "subtract";
      const arrival = 0.405 + routeIndex * 0.038;
      activity = operationPulse(arrival, arrival + 0.045);
    } else if (dominantMode === 1 && pooledTiles.includes(tile)) {
      const group = pooledTiles.indexOf(tile);
      const firstArrival = 0.565 + group * 0.024;
      const secondArrival = 0.577 + group * 0.024;
      const multiplyStart =
        firstArrival + (column % 8) * 0.0015 + (row % 4) * 0.001;
      const addStart = Math.max(secondArrival, multiplyStart + 0.035);
      operation = progress < addStart ? "multiply" : "add";
      activity =
        progress < addStart
          ? operationPulse(multiplyStart, addStart)
          : operationPulse(addStart, addStart + 0.035);
    } else if (dominantMode === 2) {
      // Column-wise products are followed by row-wise accumulation. Adjacent
      // encoder tiles overlap as a pipeline; 8 tiles remain an illustration,
      // not a claim about model layers or hardware utilization.
      const multiplyStart =
        stageArrival + (column % 8) * 0.0018 + (row % 4) * 0.0006;
      const multiplyEnd = multiplyStart + 0.025;
      const addStart =
        stageArrival + 0.025 + (row % 4) * 0.0025 + (column % 8) * 0.0018;
      operation = progress < multiplyEnd ? "multiply" : "add";
      activity =
        progress < multiplyEnd
          ? operationPulse(multiplyStart, multiplyEnd)
          : operationPulse(addStart, addStart + 0.035);
    }
    cellOperations.push(operation);
    operationActivity.push(activity * blend[dominantMode]);
    return blend[0] * lexical + blend[1] * learned + blend[2] * neural;
  });
  const signalById = new Map(
    signals.map((signal) => [signal.pathId, signal.opacity]),
  );
  const active = (...ids: string[]) =>
    Math.max(0, ...ids.map((id) => signalById.get(id) ?? 0));
  const partActivity: Record<string, number> = Object.fromEntries(
    gpu.hardware.map(({ id }) => [id, 0]),
  );
  [2, 15, 29].forEach((contact, index) => {
    partActivity[`contact-${contact}`] = active(`input-${index}`);
  });
  learnedBanks.forEach((banks, tokenIndex) =>
    banks.forEach((bank, sourceIndex) => {
      const index = tokenIndex * 2 + sourceIndex;
      const held =
        smooth(clamp((progress - (0.382 + index * 0.015)) / 0.012)) *
        (1 - smooth(clamp((progress - (0.565 + index * 0.012)) / 0.025)));
      partActivity[`memory-${bank}`] = Math.max(
        partActivity[`memory-${bank}`],
        active(`learned-pool-${index}`),
        held * blend[1] * 0.8,
      );
    }),
  );
  encoderOrder.forEach((_, index) => {
    partActivity[`memory-${index}`] = Math.max(
      partActivity[`memory-${index}`],
      active(`neural-weights-${index}`),
    );
  });
  const computeActivity = Math.max(
    0,
    ...signals
      .filter(({ kind }) => kind === "compute")
      .map(({ opacity }) => opacity),
  );
  partActivity["gpu-package"] = computeActivity * 0.6;
  partActivity["die-substrate"] = Math.max(...cellActivity) * 0.55;
  partActivity["pcb"] = computeActivity * 0.15;
  const outputActivity = active("output-0", "output-1", "output-2");
  partActivity["vector-buffer"] = Math.max(
    outputActivity,
    smooth(clamp((progress - 0.72) / 0.02)) *
      (1 - smooth(clamp((progress - 0.955) / 0.03))),
  );
  partActivity["mounting-bracket"] = outputActivity * 0.5;
  partActivity["connector-port-1"] = outputActivity;
  return {
    ...gpu,
    cellActivity,
    cellOperations,
    operationActivity,
    operationOpacity,
    partActivity,
    paths,
    signals,
    labels,
    phase,
  };
}

/** Exact ASCII demonstration of Vorpal's two signed FNV-derived hash contributions. */
export function lexicalExample() {
  const dimensions = Array<number>(256).fill(0);
  const tokens = ["resolve", "import", "path"];
  const one = BigInt(1),
    zero = BigInt(0);
  const mask = (one << BigInt(64)) - one;
  const routes = tokens
    .map((token) => {
      let first = BigInt("0xcbf29ce484222325");
      for (const byte of new TextEncoder().encode(token))
        first = ((first ^ BigInt(byte)) * BigInt("0x100000001b3")) & mask;
      const product = (first * BigInt("0x9e3779b97f4a7c15")) & mask;
      const second = ((product << BigInt(31)) | (product >> BigInt(33))) & mask;
      return [first, second].map((hash) => {
        const bucket = Number(hash % BigInt(256));
        const sign = ((hash >> BigInt(32)) & one) === zero ? 1 : -1;
        dimensions[bucket] += sign;
        return { token, bucket, sign };
      });
    })
    .flat();
  const length = Math.sqrt(
    dimensions.reduce((sum, value) => sum + value * value, 0),
  );
  return { tokens, routes, vector: dimensions.map((value) => value / length) };
}
