/** A stable, illustrative projection of the three embedding processes, not model output. */
export type EmbeddingMode = "lexical" | "learned" | "neural";
export type Blend = [number, number, number];
type V3 = [number, number, number];
export type Point = { x: number; y: number; depth: number };
export const EMBEDDING_MODES: EmbeddingMode[] = [
  "lexical",
  "learned",
  "neural",
];
const TAU = Math.PI * 2;
const hashRoutes = lexicalExample().routes;
const fmt = (value: number) => value.toFixed(2);

export function modeBlend(mode: EmbeddingMode): Blend {
  return EMBEDDING_MODES.map((key) => Number(key === mode)) as Blend;
}

function mix(points: V3[], blend: Blend): V3 {
  return [0, 1, 2].map((axis) =>
    points.reduce((sum, point, i) => sum + point[axis] * blend[i], 0),
  ) as V3;
}

function path(points: Point[], close = false) {
  return (
    points.map((p, i) => `${i ? "L" : "M"}${fmt(p.x)},${fmt(p.y)}`).join("") +
    (close ? "Z" : "")
  );
}

function project(
  [x, y, z]: V3,
  time: number,
  portrait: boolean,
  center?: V3,
): Point {
  const yaw = -0.32 + Math.sin(time * 0.21) * 0.13;
  const pitch = -0.18 + Math.sin(time * 0.17) * 0.07;
  const rx = x * Math.cos(yaw) + z * Math.sin(yaw);
  const rz = -x * Math.sin(yaw) + z * Math.cos(yaw);
  const ry = y * Math.cos(pitch) - rz * Math.sin(pitch);
  const depth = y * Math.sin(pitch) + rz * Math.cos(pitch);
  const scale = ((portrait ? 0.8 : 1) * 1100) / (1100 - depth);
  return {
    x: (center?.[0] ?? (portrait ? 210 : 400)) + rx * scale,
    y: (center?.[1] ?? (portrait ? 300 : 250)) + ry * scale,
    depth,
  };
}

/** Fixed topology throughout mode changes prevents vertices popping in or being replaced. */
function surfacePoint(
  layer: number,
  u: number,
  v: number,
  time: number,
  blend: Blend,
): V3 {
  const depth = layer - 3.5;
  const ripple = Math.sin(u * 2.4 + v * 1.8 + time * 0.58);
  const lexical: V3 = [
    u * 86,
    v * 99,
    depth * 0.8 + (u * u - v * v) * 27 + ripple * 6,
  ];
  const factor = layer < 3 ? 0 : layer < 5 ? 1 : 2;
  const learned: V3 = [
    [-58, 0, 58][factor] + u * [37, 17, 37][factor],
    v * [83, 62, 83][factor] + depth * 2,
    [18, 52, -22][factor] + depth * 4 + Math.sin(u * 2 + time * 0.36) * 14,
  ];
  const neural: V3 = [
    u * 62 + depth * 12,
    v * 85 + Math.sin(u * 2 + time * 0.42 + layer * 0.3) * 11,
    depth * 21 + Math.cos(v * 2.2 + time * 0.35) * 16,
  ];
  return mix([lexical, learned, neural], blend);
}

function sheet(layer: number, time: number, blend: Blend, portrait: boolean) {
  const points: Point[] = [];
  for (let edge = 0; edge < 4; edge++) {
    for (let i = 0; i < 16; i++) {
      const t = -1 + (i * 2) / 15;
      const [u, v] = [
        [t, -1],
        [1, t],
        [-t, 1],
        [-1, -t],
      ][edge];
      points.push(
        project(surfacePoint(layer, u, v, time, blend), time, portrait),
      );
    }
  }
  return path(points, true);
}

export function embeddingFrame(time: number, blend: Blend, portrait = false) {
  const surfaces = Array.from({ length: 8 }, (_, i) =>
    sheet(i, time, blend, portrait),
  );
  const lines = Array.from({ length: 48 }, (_, i) => {
    const layer = Math.floor(i / 6);
    const row = i % 6;
    return path(
      Array.from({ length: 21 }, (_, j) => {
        const span = -1 + j / 10,
          line = ((i % 16) - 7.5) / 8;
        const lexical = surfacePoint(
          7,
          i < 16 ? span : line,
          i < 16 ? line : span,
          time,
          [1, 0, 0],
        );
        const learned = surfacePoint(
          layer,
          span,
          -0.85 + row * 0.34,
          time,
          [0, 1, 0],
        );
        const neural = surfacePoint(
          layer,
          span,
          -0.85 + row * 0.34,
          time,
          [0, 0, 1],
        );
        return project(mix([lexical, learned, neural], blend), time, portrait);
      }),
    );
  });
  const cells = Array.from({ length: 256 }, (_, i) => {
    const row = Math.floor(i / 16),
      column = i % 16;
    const u = (column - 7.5) / 8,
      v = (row - 7.5) / 8;
    const lexical = surfacePoint(7, u, v, time, [1, 0, 0]);
    const learned = surfacePoint(Math.floor(column / 2), u, v, time, [0, 1, 0]);
    const neural = surfacePoint(
      column % 8,
      (Math.floor(column / 8) - 0.5) * 1.2 + Math.sin(row * 1.9) * 0.2,
      v,
      time,
      [0, 0, 1],
    );
    return project(mix([lexical, learned, neural], blend), time, portrait);
  });
  const connections = Array.from({ length: 64 }, (_, i) => {
    const a = cells[(i * 17) % 256],
      b = cells[(i * 17 + 37) % 256];
    return `M${fmt(a.x)},${fmt(a.y)}Q${fmt((a.x + b.x) / 2 + Math.sin(time * 0.4 + i) * 7)},${fmt((a.y + b.y) / 2 - 9)} ${fmt(b.x)},${fmt(b.y)}`;
  });
  const inputs = ["resolve", "import", "path"].map((word, i) => {
    const center: V3 = portrait
      ? [114 + i * 96, 65 + Math.sin(time * 0.5 + i) * 5, 0]
      : [142, 175 + i * 73 + Math.sin(time * 0.5 + i) * 5, 0];
    const points = Array.from({ length: 25 }, (_, j): V3 => {
      const u = j / 24;
      return [
        -53 + u * 106,
        17 + Math.sin(u * Math.PI * 2 + time * 0.3 + i) * 3,
        Math.sin(u * Math.PI) * 14,
      ];
    });
    const projected = points.map((p) => project(p, time, portrait, center));
    const outlet = projected[projected.length - 1];
    const previous = projected[projected.length - 2];
    const dx = outlet.x - previous.x;
    const dy = outlet.y - previous.y;
    const length = Math.hypot(dx, dy);
    return {
      word,
      x: center[0],
      y: center[1],
      body: path(projected),
      outlet,
      tangent: { x: dx / length, y: dy / length },
    };
  });
  const flows = Array.from({ length: 6 }, (_, i) => {
    const input = inputs[Math.floor(i / 2)];
    const destination = cells[hashRoutes[i].bucket];
    // Share the projected endpoint and tangent with the token curve. An
    // approximate screen-space offset leaves a visible gap as the camera moves.
    const { outlet, tangent } = input;
    const reach = portrait ? 28 : 48;
    const c1 = {
      x: outlet.x + tangent.x * reach,
      y: outlet.y + tangent.y * reach,
    };
    const c2 = portrait
      ? { x: destination.x, y: destination.y - 62 }
      : { x: destination.x - 62, y: destination.y };
    return `M${fmt(outlet.x)},${fmt(outlet.y)}C${fmt(c1.x)},${fmt(c1.y)} ${fmt(c2.x)},${fmt(c2.y)} ${fmt(destination.x)},${fmt(destination.y)}`;
  });
  const outputCenter: V3 = portrait ? [210, 552, 0] : [662, 250, 0];
  const outputRadius = portrait ? 66 : 83;
  const rings = Array.from({ length: 9 }, (_, ring) =>
    path(
      Array.from({ length: 65 }, (_, i) => {
        const theta = (i / 64) * TAU;
        const spin = time * 0.16;
        const latitude = -0.65 + ring * 0.325;
        const phi = ((ring - 5) / 4) * Math.PI + spin;
        const radius =
          outputRadius * Math.sqrt(Math.max(0, 1 - latitude * latitude));
        const p: V3 =
          ring < 5
            ? [
                radius * Math.cos(theta + spin),
                latitude * outputRadius,
                radius * Math.sin(theta + spin),
              ]
            : [
                Math.sin(theta) * Math.cos(phi) * outputRadius,
                Math.cos(theta) * outputRadius,
                Math.sin(theta) * Math.sin(phi) * outputRadius,
              ];
        return project(p, time, portrait, outputCenter);
      }),
    ),
  );
  const vectors = Array.from({ length: 18 }, (_, i) => {
    const theta = i * 2.39996 + time * 0.13;
    const z = 1 - (2 * (i + 0.5)) / 18;
    const r = Math.sqrt(1 - z * z);
    const p = project(
      [
        Math.cos(theta) * r * outputRadius,
        Math.sin(theta) * r * outputRadius,
        z * outputRadius,
      ],
      time,
      portrait,
      outputCenter,
    );
    return {
      point: p,
      ray: `M${outputCenter[0]},${outputCenter[1]}L${fmt(p.x)},${fmt(p.y)}`,
    };
  });
  // Join the meridian's north pole on mobile, and the rotating equator on
  // desktop. These are actual surface points, not approximate silhouette bounds.
  const outputPort = project(
    portrait
      ? [0, -outputRadius, 0]
      : [
          -Math.cos(time * 0.16) * outputRadius,
          0,
          -Math.sin(time * 0.16) * outputRadius,
        ],
    time,
    portrait,
    outputCenter,
  );
  const outgoing = Array.from({ length: 6 }, (_, i) => {
    const start = cells[hashRoutes[i].bucket];
    return portrait
      ? `M${fmt(start.x)},${fmt(start.y)}C${fmt(start.x)},450 ${fmt(outputPort.x)},${fmt(outputPort.y - 34)} ${fmt(outputPort.x)},${fmt(outputPort.y)}`
      : `M${fmt(start.x)},${fmt(start.y)}C${fmt(start.x + 55)},${fmt(start.y)} ${fmt(outputPort.x - 44)},${fmt(outputPort.y)} ${fmt(outputPort.x)},${fmt(outputPort.y)}`;
  });
  return {
    surfaces,
    lines,
    cells,
    connections,
    inputs,
    flows,
    rings,
    vectors,
    outgoing,
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
