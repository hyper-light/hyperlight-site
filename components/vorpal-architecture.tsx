"use client";

import { useId, useRef } from "react";
import { Pause, Play } from "lucide-react";
import { AnimationMotionControls } from "./animation-motion-controls";
import { useMotionPreference } from "@/components/motion-provider";
import { useStudyMotion } from "@/components/studies/use-study-motion";
import styles from "./vorpal-architecture.module.css";

const stages = [
  {
    title: "Files",
    detail: "Code + history",
    note: "Your repository",
    description: "Read source files and the repository's change history.",
  },
  {
    title: "Parse",
    detail: "Tree-sitter",
    note: "Names + references",
    description:
      "Tree-sitter finds definitions, references, and call sites in each file.",
  },
  {
    title: "Resolve",
    detail: "Links across files",
    note: "Evidence for each link",
    description:
      "Match references to definitions across files, recording evidence and confidence for each match.",
  },
  {
    title: "Index",
    detail: "Graph + search indexes",
    note: "Cached file results",
    description:
      "Store the graph, cache each file's results, and build search indexes.",
  },
  {
    title: "CLI / MCP",
    detail: "Query the code",
    note: "Agents + editors",
    description:
      "Find definitions, follow links, and read source through the command line or an MCP server.",
  },
];
type Point = [number, number, number];
type Piece = {
  d: string;
  kind: "glass" | "edge" | "fine" | "light" | "point";
  opacity: number;
};
const TAU = Math.PI * 2;
const fmt = (value: number) => value.toFixed(2);
const xy = (point: Point) => `${fmt(point[0])},${fmt(point[1])}`;
const desktopCenters = [
  [100, 159],
  [290, 134],
  [490, 168],
  [690, 134],
  [890, 164],
];
const mobileCenters = [
  [95, 87],
  [247, 222],
  [110, 367],
  [244, 510],
  [133, 663],
];

function frame(time: number, vertical: boolean): Piece[] {
  const pieces: Piece[] = [];
  const centers = vertical ? mobileCenters : desktopCenters;
  const add = (d: string, kind: Piece["kind"], opacity = 1) =>
    pieces.push({ d, kind, opacity: Number(opacity.toFixed(3)) });
  const line = (points: Point[], close = false) =>
    `M${points.map(xy).join("L")}${close ? "Z" : ""}`;
  const sample = (fn: (t: number) => Point, count = 18) =>
    Array.from({ length: count + 1 }, (_, i) => fn(i / count));
  const project = (stage: number, [x, y, z]: Point): Point => {
    const yaw = 0.38 + Math.sin(time * 0.38 - stage * 0.38) * 0.18;
    const pitch = 0.2 + Math.sin(time * 0.29) * 0.055;
    const px = x * Math.cos(yaw) + z * Math.sin(yaw);
    const depth = -x * Math.sin(yaw) + z * Math.cos(yaw);
    const scale = vertical ? 0.94 : 1.15;
    return [
      centers[stage][0] + px * scale,
      centers[stage][1] +
        (y * Math.cos(pitch) - depth * Math.sin(pitch)) * scale +
        Math.sin(time * 0.48 - stage * 0.57) * 4,
      depth,
    ];
  };
  const dot = (p: Point, radius: number, opacity: number) => {
    add(
      `M${fmt(p[0] - radius)},${fmt(p[1])}a${radius},${radius} 0 1,0 ${radius * 2},0a${radius},${radius} 0 1,0 ${-radius * 2},0`,
      "point",
      opacity,
    );
  };
  const connection = (a: Point, b: Point, bend: number) =>
    `M${xy(a)}C${fmt(a[0] + (b[0] - a[0]) * 0.48)},${fmt(a[1] + bend)} ${fmt(b[0] - (b[0] - a[0]) * 0.48)},${fmt(b[1] - bend)} ${xy(b)}`;

  // Persistent streams connect all five stages. Their paths flex with the material.
  for (let stage = 0; stage < 4; stage++) {
    for (let lane = -1; lane <= 1; lane++) {
      const direction = vertical && stage % 2 ? -1 : 1;
      const a = project(stage, [
        direction * 34,
        vertical ? 22 : lane * 7,
        lane * 6,
      ]);
      const inlet: Point =
        stage === 0
          ? [-54, lane * 2, lane * 2]
          : stage === 3
            ? [-53, -18 + lane * 3, -7 + lane]
            : [-direction * 34, vertical ? -29 : lane * 7, lane * 6];
      const b = project(stage + 1, inlet);
      const bend =
        (vertical ? 39 : 13) + Math.sin(time * 0.53 - stage) * 6 + lane * 9;
      const d = connection(a, b, bend);
      add(d, "fine", 0.28 + (lane === 0 ? 0.18 : 0));
      add(d, "light", lane === 0 ? 0.88 : 0.43);
    }
  }
  const start = project(3, [-22, 39, -10]);
  const end = project(1, [-31, 25, -8]);
  const refresh = vertical
    ? `M${xy(start)}C${fmt(start[0] - 100)},${fmt(start[1] + 67)} 14,${fmt(end[1] + 120)} ${xy(end)}`
    : `M${xy(start)}C680,327 280,332 ${xy(end)}`;
  add(refresh, "fine", 0.24);
  add(refresh, "light", 0.43);

  // Source files: independently bowed, transparent folios with code on each face.
  for (let sheet = 0; sheet < 4; sheet++) {
    const surface = (u: number, v: number) =>
      project(0, [
        u * 23 + sheet * 10 - 16,
        v * 43 + sheet * 3 - 6,
        sheet * 13 -
          19 +
          Math.sin(u * 1.3 + time * 0.42) * 7 +
          Math.sin(v * 2.3 - time * 0.48) * 3,
      ]);
    const perimeter = [
      ...sample((t) => surface(t * 2 - 1, -1)),
      ...sample((t) => surface(1, t * 2 - 1)),
      ...sample((t) => surface(1 - t * 2, 1)),
      ...sample((t) => surface(-1, 1 - t * 2)),
    ];
    add(line(perimeter, true), "glass", 0.8);
    add(line(perimeter, true), "edge", 0.38);
    add(line(sample((t) => surface(-0.94, t * 2 - 1))), "light", 0.66);
    for (let row = 0; row < 8; row++) {
      const v = -0.7 + row * 0.19;
      const length = row % 3 === 0 ? 1.16 : row % 3 === 1 ? 0.86 : 1.36;
      add(
        line(sample((t) => surface(-0.7 + t * length, v), 6)),
        "fine",
        0.3 + sheet * 0.05,
      );
    }
  }

  // Extraction is a rooted syntax tree: definitions and references branch out.
  const tree: Point[] = [
    [-54, 0, 0],
    [-22, -22, -7],
    [-22, 22, 9],
    [17, -42, 16],
    [17, -12, -17],
    [17, 12, 20],
    [17, 42, -10],
  ];
  const parents = [0, 0, 0, 1, 1, 2, 2];
  tree.forEach((p, i) => {
    const point = project(1, p);
    if (i) {
      const parent = tree[parents[i]];
      const junction = (parent[0] + p[0]) / 2;
      const d = line([
        project(1, parent),
        project(1, [junction, parent[1], parent[2]]),
        project(1, [junction, p[1], p[2]]),
        point,
      ]);
      add(d, "edge", 0.56);
      add(d, "light", 0.73);
    }
    const width = i > 2 ? 12 : 6;
    const height = i > 2 ? 8 : 6;
    const corners: Point[] = [
      [-width, -height, 0],
      [width - 3, -height, 0],
      [width, -height + 3, 0],
      [width, height, 0],
      [-width + 2, height, 0],
      [-width, height - 2, 0],
    ];
    const node = (offset: Point) =>
      project(1, [p[0] + offset[0], p[1] + offset[1], p[2] + offset[2]]);
    const face = line(corners.map(node), true);
    add(face, "glass", 0.95);
    add(face, "edge", 0.61);
    add(
      line([
        node([-width, -height, 0]),
        node([-width, -height, 6]),
        node([width - 3, -height, 6]),
        node([width - 3, -height, 0]),
      ]),
      "fine",
      0.31,
    );
    add(
      line([node([-width, -height, 0]), node([width - 3, -height, 0])]),
      "light",
      0.83,
    );
    if (i > 2) {
      for (const sign of [-1, 1]) {
        const bracket: Point[] = [
          [sign * 4, -4, 1],
          [sign * 7, -4, 1],
          [sign * 7, 4, 1],
          [sign * 4, 4, 1],
        ];
        add(line(bracket.map(node)), "edge", 0.74);
      }
    } else {
      add(line([node([-2.5, 0, 1]), node([2.5, 0, 1])]), "light", 0.8);
    }
  });

  // The resolved graph adds cross-file edges in three spatial dimensions.
  const graph = Array.from({ length: 14 }, (_, i): Point => {
    const y = 1 - (i / 13) * 2;
    const radius = Math.sqrt(1 - y * y);
    const angle = i * 2.39996323 + Math.sin(time * 0.31) * 0.14;
    return [
      Math.cos(angle) * radius * 49,
      y * 46,
      Math.sin(angle) * radius * 42,
    ];
  });
  graph.forEach((point, i) => {
    for (const jump of [3, 5]) {
      const other = (i + jump) % graph.length;
      if (other < i) continue;
      const from = project(2, point);
      const to = project(2, graph[other]);
      const d = connection(from, to, Math.sin(i * 1.7 + time * 0.43) * 6);
      add(d, "fine", 0.17 + (point[2] + 42) / 500);
      if (jump === 3) add(d, "light", 0.43);
    }
  });
  for (let ring = 0; ring < 2; ring++) {
    add(
      line(
        sample(
          (t) =>
            project(2, [
              Math.cos(t * TAU) * (ring ? 48 : 28),
              Math.sin(t * TAU) * 48,
              Math.cos(t * TAU) * (ring ? 14 : 44),
            ]),
          52,
        ),
        true,
      ),
      "fine",
      0.16,
    );
  }
  graph.forEach((point, i) =>
    dot(
      project(2, point),
      2.1 + (i % 3) * 0.35,
      0.6 + Math.sin(time * 1.35 - i * 0.47) * 0.2,
    ),
  );
  dot(project(2, [0, 0, 0]), 3.4, 0.94);

  // Stored indexes are fine, curved strata: separate planes, shared coordinates.
  for (let layer = 0; layer < 4; layer++) {
    const plane = (u: number, v: number) =>
      project(3, [
        u * 48,
        v * 19 + layer * 13 - 23,
        v * 31 +
          layer * 3 +
          u * u * 8 +
          Math.sin(u * 2 + time * 0.5 - layer * 0.3) * 4,
      ]);
    const perimeter = [
      ...sample((t) => plane(t * 2 - 1, -1)),
      ...sample((t) => plane(1, t * 2 - 1)),
      ...sample((t) => plane(1 - t * 2, 1)),
      ...sample((t) => plane(-1, 1 - t * 2)),
    ];
    add(line(perimeter, true), "glass", 0.8);
    add(line(perimeter, true), "edge", 0.36);
    add(line(sample((t) => plane(t * 2 - 1, 1))), "light", 0.75);
    for (let row = 0; row < 4; row++) {
      const v = -0.66 + row * 0.43;
      add(line(sample((t) => plane(t * 1.7 - 0.85, v), 12)), "fine", 0.2);
      if (row === layer)
        add(line(sample((t) => plane(t * 1.7 - 0.85, v), 12)), "light", 0.63);
    }
  }

  // A command and a structured reply: interfaces, not a physical terminal device.
  const query = ([x, y, z]: Point): Point =>
    project(4, [x, y, z + Math.sin(y * 0.045 - time * 0.45) * 4]);
  const folios: Point[][] = [
    [
      [-53, -39, -7],
      [3, -39, -7],
      [7, -35, -7],
      [7, 7, -7],
      [-53, 7, -7],
    ],
    [
      [-7, -4, 15],
      [43, -4, 15],
      [48, 1, 15],
      [48, 47, 15],
      [-7, 47, 15],
    ],
  ];
  for (const corners of folios) {
    const perimeter = corners.flatMap((point, i) => {
      const next = corners[(i + 1) % corners.length];
      return sample(
        (t) =>
          query([
            point[0] + (next[0] - point[0]) * t,
            point[1] + (next[1] - point[1]) * t,
            point[2],
          ]),
        10,
      );
    });
    add(line(perimeter, true), "glass", 0.95);
    add(line(perimeter, true), "edge", 0.66);
    add(line(perimeter.slice(0, 11)), "light", 0.86);
    add(
      line(
        corners.map(([x, y, z]) => query([x + 2, y - 1, z - 5])),
        true,
      ),
      "fine",
      0.18,
    );
  }
  const prompt: Point[] = [
    [-42, -26, -6],
    [-33, -20, -6],
    [-42, -14, -6],
  ];
  add(line(prompt.map(query)), "edge", 0.95);
  add(line([query([-29, -13, -6]), query([-19, -13, -6])]), "edge", 0.95);
  add(line([query([-42, -2, -6]), query([-9, -2, -6])]), "fine", 0.36);
  for (const sign of [-1, 1]) {
    const x = sign === -1 ? 3 : 37;
    const brace: Point[] = [
      [x - sign * 4, 6, 16],
      [x, 6, 16],
      [x, 17, 16],
      [x + sign * 3, 21, 16],
      [x, 25, 16],
      [x, 37, 16],
      [x - sign * 4, 37, 16],
    ];
    add(line(brace.map(query)), "edge", 0.86);
  }
  for (let row = 0; row < 3; row++) {
    const d = line([
      query([10, 12 + row * 9, 16]),
      query([row === 1 ? 24 : 29, 12 + row * 9, 16]),
    ]);
    add(d, "fine", 0.39);
    add(d, "light", 0.68);
  }
  const request = connection(query([-44, 8, -6]), query([-9, 24, 15]), 19);
  const response = connection(query([46, 1, 15]), query([7, -26, -6]), -12);
  for (const d of [request, response]) {
    add(d, "fine", 0.31);
    add(d, "light", 0.82);
  }
  add(
    line([query([-14, 20, 15]), query([-9, 24, 15]), query([-14, 27, 15])]),
    "edge",
    0.64,
  );
  add(
    line([query([13, -30, -6]), query([7, -26, -6]), query([13, -23, -6])]),
    "edge",
    0.64,
  );
  return pieces;
}

const initial = { desktop: frame(0, false), mobile: frame(0, true) };
type FlowNodes = {
  pieces: SVGPathElement[];
  prism: SVGLinearGradientElement;
  reflection: SVGLinearGradientElement;
  vertical: boolean;
};
const cache = new WeakMap<SVGSVGElement, FlowNodes>();
function animate(svg: SVGSVGElement, time: number) {
  let nodes = cache.get(svg);
  if (!nodes) {
    nodes = {
      pieces: Array.from(
        svg.querySelectorAll<SVGPathElement>("[data-architecture-piece]"),
      ),
      prism: svg.querySelector<SVGLinearGradientElement>(
        "[data-architecture-prism]",
      )!,
      reflection: svg.querySelector<SVGLinearGradientElement>(
        "[data-architecture-reflection]",
      )!,
      vertical: svg.dataset.layout === "mobile",
    };
    cache.set(svg, nodes);
  }
  frame(time, nodes.vertical).forEach((piece, i) => {
    const path = nodes.pieces[i];
    path.setAttribute("d", piece.d);
    path.setAttribute("opacity", String(piece.opacity));
    if (piece.kind === "light")
      path.setAttribute("stroke-dashoffset", fmt(-time * 18 + i * 8.7));
  });
  const drift = Math.sin(time * 0.35) * (nodes.vertical ? 110 : 330);
  nodes.prism.setAttribute("x1", fmt(-130 + drift));
  nodes.prism.setAttribute("x2", fmt((nodes.vertical ? 360 : 950) + drift));
  nodes.prism.setAttribute("y1", fmt(Math.sin(time * 0.24) * 100 - 80));
  nodes.reflection.setAttribute("x1", fmt(-0.6 + Math.sin(time * 0.38) * 0.7));
  nodes.reflection.setAttribute("x2", fmt(0.9 + Math.sin(time * 0.38) * 0.7));
}

function Flow({ vertical, paused }: { vertical: boolean; paused: boolean }) {
  const ref = useRef<SVGSVGElement>(null);
  const id = "architecture-" + useId().replace(/[^a-zA-Z0-9_-]/g, "");
  useStudyMotion({ ref, paused, update: animate, fps: 60 });
  const centers = vertical ? mobileCenters : desktopCenters;
  const pieces = vertical ? initial.mobile : initial.desktop;
  return (
    <svg
      ref={ref}
      data-architecture-flow=""
      data-layout={vertical ? "mobile" : "desktop"}
      viewBox={vertical ? "0 0 360 768" : "0 0 1000 365"}
      className={vertical ? styles.mobile : styles.desktop}
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient
          id={id + "-glass"}
          data-architecture-reflection=""
          x1="-.6"
          y1="0"
          x2=".9"
          y2=".7"
        >
          <stop stopColor="#c8d2df" stopOpacity=".01" />
          <stop offset=".38" stopColor="#b4c3d2" stopOpacity=".055" />
          <stop offset=".49" stopColor="#e2e6e8" stopOpacity=".19" />
          <stop offset=".55" stopColor="#adbacc" stopOpacity=".065" />
          <stop offset=".83" stopColor="#99aec4" stopOpacity=".015" />
          <stop offset="1" stopColor="#cfb9d4" stopOpacity=".06" />
        </linearGradient>
        <linearGradient id={id + "-edge"} x1="0" y1="1" x2=".8" y2="0">
          <stop stopColor="#6a7789" />
          <stop offset=".5" stopColor="#b7c1cf" />
          <stop offset=".82" stopColor="#e1e4e8" />
          <stop offset="1" stopColor="#7c91a4" />
        </linearGradient>
        <linearGradient
          id={id + "-prism"}
          data-architecture-prism=""
          gradientUnits="userSpaceOnUse"
          x1="-130"
          y1="-80"
          x2={vertical ? "360" : "950"}
          y2={vertical ? "768" : "365"}
        >
          <stop stopColor="#96c7c4" />
          <stop offset=".32" stopColor="#a7bedc" />
          <stop offset=".62" stopColor="#bfa9d0" />
          <stop offset=".84" stopColor="#d5b6b2" />
          <stop offset="1" stopColor="#d6caa9" />
        </linearGradient>
        <radialGradient id={id + "-point"} cx=".35" cy=".25" r=".8">
          <stop stopColor="#f0eee7" />
          <stop offset=".3" stopColor="#bed0e2" />
          <stop offset=".74" stopColor="#879ab5" stopOpacity=".5" />
          <stop offset="1" stopColor="#a59cbb" stopOpacity=".15" />
        </radialGradient>
      </defs>
      {pieces.map((piece, i) => (
        <path
          key={i}
          data-architecture-piece=""
          data-architecture-trace={piece.kind === "light" ? "" : undefined}
          d={piece.d}
          fill={
            piece.kind === "glass"
              ? `url(#${id}-glass)`
              : piece.kind === "point"
                ? `url(#${id}-point)`
                : "none"
          }
          stroke={
            piece.kind === "edge"
              ? `url(#${id}-edge)`
              : piece.kind === "fine"
                ? "#a1b0c1"
                : piece.kind === "light"
                  ? `url(#${id}-prism)`
                  : "none"
          }
          strokeWidth={
            piece.kind === "light" ? 1.25 : piece.kind === "fine" ? 0.7 : 0.85
          }
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={piece.opacity}
          pathLength={piece.kind === "light" ? 100 : undefined}
          strokeDasharray={piece.kind === "light" ? "17 83" : undefined}
          strokeDashoffset={
            piece.kind === "light" ? Number((i * 8.7).toFixed(2)) : undefined
          }
        />
      ))}
      {stages.map((stage, i) => (
        <g
          key={stage.title}
          transform={`translate(${centers[i][0]} ${centers[i][1] + (vertical ? 74 : 94)})`}
        >
          <text className={styles.number} x="0" y="-23" textAnchor="middle">
            {String(i + 1).padStart(2, "0")}
          </text>
          <text className={styles.nodeTitle} x="0" y="0" textAnchor="middle">
            {stage.title}
          </text>
          {!vertical && (
            <text
              className={styles.nodeDetail}
              x="0"
              y="20"
              textAnchor="middle"
            >
              {stage.detail}
            </text>
          )}
        </g>
      ))}
      {!vertical && (
        <text className={styles.loopLabel} x="491" y="344" textAnchor="middle">
          CHANGED FILES → PARSE → UPDATE
        </text>
      )}
    </svg>
  );
}

/** The diagram is explanatory, not a live trace or a performance visualization. */
export function VorpalArchitecture({ description }: { description: string }) {
  const { paused, reduced, toggle } = useMotionPreference();
  const id = useId();
  return (
    <figure
      className={styles.figure}
      aria-labelledby={id + "-title"}
      aria-describedby={id + "-caption"}
    >
      <div className={styles.header}>
        <div>
          <span className={styles.eyebrow}>VORPAL / SYSTEM MAP</span>
          <h3 className={styles.title} id={id + "-title"}>
            How Vorpal works.
          </h3>
        </div>
        <AnimationMotionControls unavailableReplayLabel="Replay architecture animation (unavailable)">
          <button
            className={styles.motion}
            type="button"
            onClick={toggle}
            disabled={reduced}
            aria-pressed={paused}
            aria-label={
              reduced
                ? "Architecture follows reduced motion"
                : paused
                  ? "Resume architecture animation"
                  : "Pause architecture animation"
            }
            title={
              reduced
                ? "Following your device's motion preference"
                : paused
                  ? "Resume all ambient motion"
                  : "Pause all ambient motion"
            }
          >
            {paused ? (
              <Play size={14} aria-hidden="true" />
            ) : (
              <Pause size={14} aria-hidden="true" />
            )}
          </button>
        </AnimationMotionControls>
      </div>
      <div className={styles.diagram}>
        <Flow vertical={false} paused={paused} />
        <Flow vertical paused={paused} />
      </div>
      <ol className={styles.legend}>
        {stages.map((stage) => (
          <li key={stage.title}>
            <strong>{stage.title}.</strong> {stage.description}
          </li>
        ))}
      </ol>
      <figcaption className={styles.caption} id={id + "-caption"}>
        <span>{description}</span>
        <span className={styles.note}>
          Vorpal reparses edited files and reuses cached results for files you
          haven’t changed.
        </span>
      </figcaption>
    </figure>
  );
}
