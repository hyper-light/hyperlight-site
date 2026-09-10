"use client";

import { useId, useRef } from "react";
import {
  useStudyMotion,
  type StudyProps,
} from "@/components/studies/use-study-motion";

type Point = { x: number; y: number; z: number };
const TAU = Math.PI * 2;
const SIDES = 7;
const f = (n: number) => n.toFixed(2);
// Unequal spaces and elevations keep this a fleet, not a stack of repeated panes.
const FLEET = [
  [-131, -73, 4, 0.91, -0.31],
  [-36, -117, 34, 0.72, 0.42],
  [69, -92, -3, 1.05, -0.63],
  [146, -12, 20, 0.82, 0.24],
  [85, 87, 45, 0.95, -0.22],
  [-18, 118, -10, 0.87, 0.61],
  [-132, 70, 21, 1.02, -0.56],
  [-20, -4, 68, 0.93, 0.31],
  [55, 19, -25, 0.64, -0.91],
];
const palette = [
  [155, 191, 198],
  [154, 165, 211],
  [190, 155, 189],
  [212, 188, 152],
  [189, 212, 190],
];
function project(
  shard: number,
  x: number,
  y: number,
  z: number,
  time: number,
): Point {
  const [cx, cy, cz, size, orientation] = FLEET[shard];
  const rotate = orientation + Math.sin(time * 0.39 + shard * 0.91) * 0.085;
  const px = cx + (x * Math.cos(rotate) - y * Math.sin(rotate)) * size;
  const py = cy + (x * Math.sin(rotate) + y * Math.cos(rotate)) * size;
  const pz = cz + z * size + Math.sin(time * 0.53 + shard * 0.82) * 3;
  const pitch = 0.69 + Math.sin(time * 0.27) * 0.045;
  const turn = -0.23;
  const vertical = py * Math.cos(pitch) - pz * Math.sin(pitch);
  const depth = py * Math.sin(pitch) + pz * Math.cos(pitch);
  const scale = (1.2 * 1200) / (1200 - depth);
  return {
    x: 320 + (px * Math.cos(turn) - vertical * Math.sin(turn)) * scale,
    y: 330 + (px * Math.sin(turn) + vertical * Math.cos(turn)) * scale,
    z: depth,
  };
}
function path(points: Point[], close = true) {
  return `M${points.map((p) => `${f(p.x)},${f(p.y)}`).join("L")}${close ? "Z" : ""}`;
}
function vertex(
  shard: number,
  index: number,
  time: number,
  inset = 1,
  floor = false,
) {
  const angle = (index / SIDES) * TAU + Math.sin(index * 2.1 + shard) * 0.16;
  const radius = (30 + Math.sin(index * 1.93 + shard * 1.37) * 8.4) * inset;
  const height = floor
    ? -12
    : 26 +
      Math.max(0, Math.sin(index * 2.61 + shard * 1.13)) * 28 +
      Math.sin(time * 0.52 + index + shard) * 2;
  return project(
    shard,
    Math.cos(angle) * radius,
    Math.sin(angle) * radius,
    height,
    time,
  );
}
function hull(points: Point[]) {
  const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  const cross = (a: Point, b: Point, c: Point) =>
    (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  const lower: Point[] = [],
    upper: Point[] = [];
  for (const p of sorted) {
    while (
      lower.length > 1 &&
      cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0
    )
      lower.pop();
    lower.push(p);
  }
  for (const p of sorted.toReversed()) {
    while (
      upper.length > 1 &&
      cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0
    )
      upper.pop();
    upper.push(p);
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}
function contents(shard: number, time: number) {
  return [0, 1, 2].map((item) => {
    const angle = time * (0.59 + shard * 0.054) + (item / 3) * TAU + shard;
    const x = Math.cos(angle) * (8 + item * 2.2);
    const y = Math.sin(angle) * (8 + item * 2.2);
    const z = 1 + Math.sin(angle * 1.4 + item) * 3;
    return path(
      [
        [-3.5, -1.5],
        [2.5, -2.5],
        [4, 1],
        [-2.5, 2.3],
      ].map(([dx, dy]) => project(shard, x + dx, y + dy, z, time)),
    );
  });
}
function colors(time: number) {
  return palette.map((_, index) => {
    const p = (index + time * 0.45) % palette.length,
      a = Math.floor(p),
      b = (a + 1) % palette.length;
    return `rgb(${palette[a].map((channel, c) => Math.round(channel + (palette[b][c] - channel) * (p - a))).join(",")})`;
  });
}
function frame(time: number) {
  return FLEET.map((_, shard) => {
    const top = Array.from({ length: SIDES }, (_, i) => vertex(shard, i, time));
    const inner = Array.from({ length: SIDES }, (_, i) =>
      vertex(shard, i, time, 0.88),
    );
    const floor = Array.from({ length: SIDES }, (_, i) =>
      vertex(shard, i, time, 0.73, true),
    );
    const walls = top
      .map((p, i) => ({
        d: path([p, top[(i + 1) % SIDES], floor[(i + 1) % SIDES], floor[i]]),
        depth: (p.z + top[(i + 1) % SIDES].z) / 2,
      }))
      .sort((a, b) => a.depth - b.depth);
    const circuit = path(
      Array.from({ length: 40 }, (_, i) => {
        const angle = (i / 39) * TAU;
        return project(
          shard,
          Math.cos(angle) * 15,
          Math.sin(angle) * 11,
          -4,
          time,
        );
      }),
    );
    return {
      shard,
      walls: walls.map((wall) => wall.d),
      rim: path(top),
      inner: path(inner),
      floor: path(floor),
      bevel: path(top) + path(inner.toReversed()),
      clip: path(hull([...top, ...floor])),
      contents: contents(shard, time),
      circuit,
      depth: project(shard, 0, 0, 0, time).z,
    };
  }).sort((a, b) => a.depth - b.depth);
}
const FIRST = frame(0);
type Nodes = {
  floors: SVGPathElement[];
  walls: SVGPathElement[][];
  rims: SVGPathElement[][];
  contents: SVGPathElement[][];
  circuits: SVGPathElement[];
  clips: SVGPathElement[];
  stops: SVGStopElement[];
  reflection: SVGLinearGradientElement | null;
};
const cache = new WeakMap<SVGSVGElement, Nodes>();
function update(svg: SVGSVGElement, time: number) {
  let nodes = cache.get(svg);
  if (!nodes) {
    const groups = Array.from(svg.querySelectorAll("[data-shard-container]"));
    nodes = {
      floors: groups.map((group) =>
        group.querySelector<SVGPathElement>("[data-shard-floor]")!,
      ),
      walls: groups.map((group) =>
        Array.from(group.querySelectorAll<SVGPathElement>("[data-shard-wall]")),
      ),
      rims: groups.map((group) =>
        Array.from(group.querySelectorAll<SVGPathElement>("[data-shard-rim]")),
      ),
      contents: groups.map((group) =>
        Array.from(
          group.querySelectorAll<SVGPathElement>("[data-shard-content]"),
        ),
      ),
      circuits: groups.map((group) =>
        group.querySelector<SVGPathElement>("[data-shard-circuit]")!,
      ),
      clips: Array.from(
        svg.querySelectorAll<SVGPathElement>("[data-shard-clip]"),
      ),
      stops: Array.from(
        svg.querySelectorAll<SVGStopElement>("[data-shard-spectrum] stop"),
      ),
      reflection: svg.querySelector("[data-shard-reflection]"),
    };
    cache.set(svg, nodes);
  }
  frame(time).forEach((container, slot) => {
    nodes.floors[slot].setAttribute("d", container.floor);
    container.walls.forEach((d, i) =>
      nodes.walls[slot][i].setAttribute("d", d),
    );
    [container.bevel, container.rim, container.inner].forEach((d, i) =>
      nodes.rims[slot][i].setAttribute("d", d),
    );
    container.contents.forEach((d, i) =>
      nodes.contents[slot][i].setAttribute("d", d),
    );
    nodes.clips[slot].setAttribute("d", container.clip);
    nodes.circuits[slot].setAttribute("d", container.circuit);
    nodes.circuits[slot].setAttribute(
      "stroke-dashoffset",
      f(-time * (81 + container.shard * 13) + container.shard * 43),
    );
  });
  colors(time).forEach((color, i) =>
    nodes.stops[i].setAttribute("stop-color", color),
  );
  nodes.reflection?.setAttribute("x1", f(-0.2 + Math.sin(time * 0.47) * 0.3));
}

/** A fleet of irregular hollow enclosures. Independent payloads remain visibly inside each shell. */
export function ShardsStudy({ paused = false, className }: StudyProps) {
  const ref = useRef<SVGSVGElement>(null);
  const id = `shards-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  useStudyMotion({ ref, paused, update });
  return (
    <svg
      ref={ref}
      className={className}
      viewBox="0 0 640 640"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient
          id={`${id}-glass`}
          data-shard-reflection=""
          x1="-.2"
          y1="0"
          x2=".95"
          y2="1"
        >
          <stop stopColor="#c3d5dd" stopOpacity=".09" />
          <stop offset=".31" stopColor="#344f66" stopOpacity=".11" />
          <stop offset=".43" stopColor="#d6e1e4" stopOpacity=".24" />
          <stop offset=".54" stopColor="#4c6b80" stopOpacity=".12" />
          <stop offset="1" stopColor="#89a9bb" stopOpacity=".08" />
        </linearGradient>
        <linearGradient
          id={`${id}-spectrum`}
          data-shard-spectrum=""
          x1="90"
          y1="450"
          x2="545"
          y2="155"
          gradientUnits="userSpaceOnUse"
        >
          {colors(0).map((color, i) => (
            <stop key={i} offset={(i / 4).toFixed(4)} stopColor={color} />
          ))}
        </linearGradient>
        <radialGradient id={`${id}-ambient`}>
          <stop stopColor="#7a9eaf" stopOpacity=".065" />
          <stop offset="1" stopColor="#7a9eaf" stopOpacity="0" />
        </radialGradient>
        {FIRST.map((container, i) => (
          <clipPath key={i} id={`${id}-clip-${i}`}>
            <path data-shard-clip="" d={container.clip} />
          </clipPath>
        ))}
      </defs>
      <ellipse
        cx="320"
        cy="317"
        rx="257"
        ry="215"
        fill={`url(#${id}-ambient)`}
      />
      {FIRST.map((container, slot) => (
        <g key={slot} data-shard-container="">
          <path
            data-shard-floor=""
            d={container.floor}
            fill="#527287"
            fillOpacity=".09"
            stroke="#8faebe"
            strokeWidth=".5"
            strokeOpacity=".2"
          />
          <g clipPath={`url(#${id}-clip-${slot})`}>
            <path
              data-shard-circuit=""
              d={container.circuit}
              pathLength="400"
              stroke={`url(#${id}-spectrum)`}
              strokeWidth=".9"
              strokeDasharray="38 362"
              strokeDashoffset={f(container.shard * 43)}
              opacity=".65"
            />
            {container.contents.map((d, i) => (
              <path
                key={i}
                data-shard-content=""
                d={d}
                fill={`url(#${id}-spectrum)`}
                fillOpacity={(0.55 + i * 0.17).toFixed(4)}
                stroke="#d4e2e6"
                strokeWidth=".45"
                strokeOpacity=".5"
              />
            ))}
          </g>
          {container.walls.map((d, i) => (
            <path
              key={i}
              data-shard-wall=""
              d={d}
              fill={`url(#${id}-glass)`}
              stroke="#a9c1cd"
              strokeWidth=".55"
              strokeOpacity=".28"
            />
          ))}
          <path
            data-shard-rim=""
            d={container.bevel}
            fill={`url(#${id}-glass)`}
            fillRule="evenodd"
          />
          <path
            data-shard-rim=""
            d={container.rim}
            stroke={`url(#${id}-spectrum)`}
            strokeWidth=".9"
            strokeOpacity=".75"
          />
          <path
            data-shard-rim=""
            d={container.inner}
            stroke="#b4cbd4"
            strokeWidth=".45"
            strokeOpacity=".25"
          />
        </g>
      ))}
    </svg>
  );
}
