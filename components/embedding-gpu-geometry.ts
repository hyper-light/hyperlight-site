/** A GPU-shaped teaching object, not a specification of Vorpal's execution hardware. */
type V3 = [number, number, number];
type Point = { x: number; y: number; depth: number };
type Project = (point: V3) => Point;
type Kind =
  | "board-back"
  | "board-wall"
  | "board"
  | "trace"
  | "contact"
  | "memory-wall"
  | "memory"
  | "package-wall"
  | "package"
  | "socket"
  | "pin"
  | "component"
  | "mount"
  | "bracket";
export type GpuPart = { id: string; kind: Kind; d: string };
export const GPU_MEMORY_PACKAGES = [
  ...[-78, -26, 26, 78].flatMap((x) =>
    [-86, 83].map((y) => ({ x, y, width: 36, height: 21 })),
  ),
  ...[-111, 111].flatMap((x) =>
    [-31, 27].map((y) => ({ x, y, width: 27, height: 34 })),
  ),
];
export function gpuMemoryPoint(index: number): V3 {
  const { x, y } = GPU_MEMORY_PACKAGES[index];
  return [x, y, 8.2];
}
export function gpuTilePoint(index: number): V3 {
  return [index % 2 ? 24 : -24, Math.floor(index / 2) * 25 - 37.5, 20.2];
}
const fmt = (value: number) => value.toFixed(2);
const path = (points: Point[], closed = false) =>
  points.map((p, i) => `${i ? "L" : "M"}${fmt(p.x)},${fmt(p.y)}`).join("") +
  (closed ? "Z" : "");

function rectangle(
  x: number,
  y: number,
  width: number,
  height: number,
  z: number,
): V3[] {
  return [
    [x - width / 2, y - height / 2, z],
    [x + width / 2, y - height / 2, z],
    [x + width / 2, y + height / 2, z],
    [x - width / 2, y + height / 2, z],
  ];
}

/** Row-major lexical bucket addresses remain fixed on eight exposed die tiles.
 * The tile count is illustrative, not a GPU core count or neural output dimension.
 */
export function gpuCellPoint(index: number): V3 {
  const column = index % 16;
  const row = Math.floor(index / 16);
  return [
    -43.25 + column * 5.5 + Math.floor(column / 8) * 4,
    -45.75 + row * 5.5 + Math.floor(row / 4) * 3,
    20.2,
  ];
}

export function embeddingGpuFrame(time: number, project: Project) {
  const hardware: GpuPart[] = [];
  const add = (id: string, kind: Kind, points: V3[], closed = false) => {
    hardware.push({ id, kind, d: path(points.map(project), closed) });
  };
  const solid = (
    id: string,
    kind: "memory" | "package" | "component" | "bracket",
    x: number,
    y: number,
    width: number,
    height: number,
    bottom: number,
    top: number,
  ) => {
    const front = rectangle(x, y, width, height, top);
    const back = rectangle(x, y, width, height, bottom);
    const wallKind = kind === "memory" ? "memory-wall" : "package-wall";
    for (let edge = 0; edge < 4; edge++) {
      const next = (edge + 1) % 4;
      add(
        `${id}-wall-${edge}`,
        wallKind,
        [front[edge], front[next], back[next], back[edge]],
        true,
      );
    }
    add(id, kind, front, true);
  };
  const ring = (x: number, y: number, radius: number, z: number) =>
    Array.from({ length: 17 }, (_, i): V3 => [
      x + Math.cos((i / 16) * Math.PI * 2) * radius,
      y + Math.sin((i / 16) * Math.PI * 2) * radius,
      z,
    ]);
  // A keyed edge connector and mounting bracket give the PCB its recognizable
  // expansion-board silhouette. Every face uses the same rigid 3-D projection.
  const outline: V3[] = [
    [-156, -108, 0],
    [156, -108, 0],
    [164, -100, 0],
    [164, 97, 0],
    [156, 105, 0],
    [71, 105, 0],
    [71, 122, 0],
    [-74, 122, 0],
    [-74, 111, 0],
    [-82, 111, 0],
    [-82, 122, 0],
    [-133, 122, 0],
    [-133, 105, 0],
    [-156, 105, 0],
    [-164, 97, 0],
    [-164, -100, 0],
  ];
  const underside = outline.map(([x, y]): V3 => [x, y, -7]);
  add("pcb-back", "board-back", underside, true);
  for (let edge = 0; edge < outline.length; edge++) {
    const next = (edge + 1) % outline.length;
    add(
      `pcb-wall-${edge}`,
      "board-wall",
      [outline[edge], outline[next], underside[next], underside[edge]],
      true,
    );
  }
  add("pcb", "board", outline, true);

  // Fine copper buses are surface-mounted traces, not an unrelated floating grid.
  const memoryLocations = GPU_MEMORY_PACKAGES;
  memoryLocations.forEach(({ x, y }, index) => {
    const vertical = Math.abs(y) > 70;
    for (let lane = 0; lane < 4; lane++) {
      const offset = (lane - 1.5) * 3;
      const sign = Math.sign(vertical ? y : x);
      const start: V3 = vertical
        ? [x + offset, y - sign * 11, 1]
        : [x - sign * 14, y + offset, 1];
      const bend: V3 = vertical
        ? [x + offset, sign * 68, 1]
        : [sign * 83, y + offset, 1];
      const end: V3 = vertical
        ? [Math.max(-58, Math.min(58, x)) + offset, sign * 62, 12]
        : [sign * 64, y + offset, 12];
      add(`memory-bus-${index}-${lane}`, "trace", [start, bend, end]);
    }
  });
  for (let index = 0; index < 32; index++) {
    const x = -128 + index * 6;
    if (x > -87 && x < -72) continue;
    add(`contact-${index}`, "contact", rectangle(x, 113.5, 3.6, 12, 0.7), true);
    add(`contact-bus-${index}`, "trace", [
      [x, 106, 0.8],
      [x, 98, 0.8],
      [x + 8, 93, 0.8],
    ]);
  }
  solid("mounting-bracket", "bracket", -173, 1, 10, 235, -5, 8);
  [-76, -10, 55].forEach((y, index) => {
    add(
      `connector-port-${index}`,
      "socket",
      rectangle(-173, y, 7, 38, 8.3),
      true,
    );
    add(
      `connector-port-inset-${index}`,
      "pin",
      rectangle(-173, y, 3, 29, 8.5),
      true,
    );
  });

  memoryLocations.forEach(({ x, y, width, height }, index) => {
    solid(`memory-${index}`, "memory", x, y, width, height, 1.5, 8);
    add(`memory-mark-${index}`, "pin", [
      [x - width / 2 + 4, y - height / 2 + 4, 8.2],
      [x - width / 2 + 11, y - height / 2 + 4, 8.2],
    ]);
    for (let pin = 0; pin < 6; pin++) {
      const xx = x - width / 2 + 4 + pin * ((width - 8) / 5);
      for (const side of [-1, 1]) {
        add(`memory-pin-${index}-${pin}-${side}`, "pin", [
          [xx, y + (side * height) / 2, 5],
          [xx, y + side * (height / 2 + 3), 1.5],
        ]);
      }
    }
  });
  // A board-mounted teaching buffer collects the normalized representation
  // before it leaves through the bracket; this is not a memory-size claim.
  solid("vector-buffer", "component", -143, -10, 24, 64, 1, 7);
  for (let lane = 0; lane < 5; lane++) {
    add(`vector-buffer-lane-${lane}`, "pin", [
      [-150, -32 + lane * 11, 7.2],
      [-136, -32 + lane * 11, 7.2],
    ]);
  }
  // Power components and plated mounting holes establish scale around the die.
  [-65, -32, 1, 34, 67].forEach((y, index) => {
    solid(`power-${index}`, "component", 143, y, 13, 16, 1, 8.5);
    add(`capacitor-${index}`, "component", ring(156, y + 1, 3.3, 6), true);
    add(`capacitor-seam-${index}`, "pin", [
      [153.8, y + 1, 6.2],
      [158.2, y + 1, 6.2],
    ]);
    add(`power-bus-${index}`, "trace", [
      [136, y, 1],
      [127, y, 1],
      [127, y + 8, 1],
      [119, y + 8, 1],
    ]);
  });
  for (const x of [-151, 152]) {
    for (const y of [-96, 92]) {
      add(`board-mount-${x}-${y}`, "mount", ring(x, y, 4.2, 0.4), true);
      add(`board-mount-core-${x}-${y}`, "mount", ring(x, y, 1.8, 0.5), true);
    }
  }
  solid("gpu-package", "package", 0, 0, 133, 143, 1, 12);
  // The package's exposed silicon is a raised, inset object—not a plane that
  // changes shape when a different embedding method is selected.
  solid("die-substrate", "package", 0, 0, 111, 120, 12, 16);
  add("die-socket", "socket", rectangle(0, 0, 103, 106, 16.3), true);
  for (let index = 0; index < 20; index++) {
    const x = -58 + index * (116 / 19);
    for (const side of [-1, 1]) {
      add(`package-pin-${index}-${side}`, "pin", [
        [x, side * 71.5, 9],
        [x, side * 75, 1.5],
      ]);
    }
  }
  for (const x of [-74, 74]) {
    for (const y of [-65, 65]) {
      add(`cooler-mount-${x}-${y}`, "mount", ring(x, y, 3.1, 1), true);
    }
  }

  const cells = Array.from({ length: 256 }, (_, index) =>
    project(gpuCellPoint(index)),
  );
  const materials = Array.from({ length: 8 }, (_, tile) => {
    const x = tile % 2 ? 24 : -24;
    const y = Math.floor(tile / 2) * 25 - 37.5;
    const front = rectangle(x, y, 45, 22.5, 20).map(project);
    const back = rectangle(x, y, 45, 22.5, 16).map(project);
    const etching = Array.from({ length: 32 }, (_, index) => {
      const row = Math.floor(tile / 2) * 4 + Math.floor(index / 8);
      const column = (tile % 2) * 8 + (index % 8);
      const [cx, cy, z] = gpuCellPoint(row * 16 + column);
      return path(rectangle(cx, cy, 3.2, 3.2, z).map(project), true);
    }).join("");
    const sweep = Math.sin(time * 0.42 + tile * 0.4) * 20;
    return {
      front: path(front, true),
      back: path(back, true),
      wall: path([...front, ...back.toReversed()], true),
      rim: path(rectangle(x, y, 42, 19.5, 20.1).map(project), true),
      ribs: front.map((point, index) => path([point, back[index]])).join(""),
      etching,
      sheen: path(
        [
          [x + sweep, y - 9, 20.3],
          [x + sweep, y + 9, 20.3],
        ].map((p) => project(p as V3)),
      ),
    };
  });
  const lines = Array.from({ length: 48 }, (_, index) => {
    const tile = Math.floor(index / 6);
    const x = tile % 2 ? 24 : -24;
    const y = Math.floor(tile / 2) * 25 - 37.5;
    const lane = index % 6;
    return path(
      (lane < 4
        ? [
            [x - 20.5, y - 8.25 + lane * 5.5, 20.1],
            [x + 20.5, y - 8.25 + lane * 5.5, 20.1],
          ]
        : [
            [x + (lane === 4 ? -11 : 11), y - 9.5, 20.1],
            [x + (lane === 4 ? -11 : 11), y + 9.5, 20.1],
          ]
      ).map((point) => project(point as V3)),
    );
  });
  const connections = Array.from({ length: 64 }, (_, index) => {
    const a = gpuCellPoint(index * 4);
    const b = gpuCellPoint((index * 4 + 17) % 256);
    return path([project(a), project([a[0], b[1], 20.4]), project(b)]);
  });
  return {
    hardware,
    materials,
    surfaces: materials.map((item) => item.front),
    cells,
    lines,
    connections,
  };
}
