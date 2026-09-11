"use client";

import { useId, useRef } from "react";
import {
  useStudyMotion,
  type StudyProps,
} from "@/components/studies/use-study-motion";

type Point = [number, number, number];
type Rail = { axis: number; a: number; b: number; outer: boolean };
const f = (n: number) => n.toFixed(2);
const clamp = (n: number) => Math.min(1, Math.max(0, n));
const AXES = [0, 1, 2];
const CELL_SIZE = 62;
const POSITIONS = [-2, -1, 0, 1, 2];
const RAILS: Rail[] = AXES.flatMap((axis) =>
  POSITIONS.flatMap((a) =>
    POSITIONS.map((b) => ({
      axis,
      a,
      b,
      outer: Math.abs(a) === 2 && Math.abs(b) === 2,
    })),
  ),
);
const BRANCHES: Point[][] = [
  [
    [0, 0, 0],
    [1, 0, 0],
    [1, 1, 0],
    [2, 1, 0],
    [2, 1, 1],
  ],
  [
    [0, 0, 0],
    [0, 0, 1],
    [-1, 0, 1],
    [-1, -1, 1],
    [-2, -1, 1],
  ],
  [
    [0, 0, 0],
    [0, 1, 0],
    [0, 1, -1],
    [-1, 1, -1],
    [-1, 2, -1],
  ],
  [
    [0, 0, 0],
    [0, 0, -1],
    [1, 0, -1],
    [1, -1, -1],
    [2, -1, -1],
  ],
];
const ENTRY: Point[] = [
  [-2, -1, 0],
  [0, -1, 0],
  [0, 0, 0],
];
const JOURNEYS = BRANCHES.map((branch) => [...ENTRY, ...branch.slice(1)]);
const palette = [
  [155, 190, 200],
  [164, 177, 205],
  [186, 172, 195],
  [205, 196, 181],
  [181, 202, 197],
];

/** A rigid orthogonal volume. Only the viewpoint and the light move. */
function project([x, y, z]: Point, time: number) {
  const yaw = 0.64 + Math.sin(time * 0.2) * 0.06;
  const pitch = 0.51 + Math.sin(time * 0.17) * 0.035;
  const horizontal = x * Math.cos(yaw) - z * Math.sin(yaw);
  const away = x * Math.sin(yaw) + z * Math.cos(yaw);
  const vertical = y * Math.cos(pitch) - away * Math.sin(pitch);
  const depth = y * Math.sin(pitch) + away * Math.cos(pitch);
  const scale = (CELL_SIZE * 1400) / (1400 - depth * CELL_SIZE);
  return { x: 320 + horizontal * scale, y: 315 - vertical * scale, depth };
}

function path(points: Point[], time: number, closed = false) {
  return (
    points
      .map((point, i) => {
        const p = project(point, time);
        return `${i ? "L" : "M"}${f(p.x)},${f(p.y)}`;
      })
      .join("") + (closed ? "Z" : "")
  );
}

function axisPoint(axis: number, along: number, a: number, b: number): Point {
  const point: Point = [0, 0, 0];
  point[axis] = along;
  point[(axis + 1) % 3] = a;
  point[(axis + 2) % 3] = b;
  return point;
}

function rail(rod: Rail, time: number) {
  const { axis, a, b, outer } = rod;
  const width = outer ? 0.011 : 0.007;
  const corners = [
    axisPoint(axis, -2, a - width, b),
    axisPoint(axis, 2, a - width, b),
    axisPoint(axis, 2, a + width, b),
    axisPoint(axis, -2, a + width, b),
  ];
  return {
    d: path(corners, time, true),
    edge: path([corners[0], corners[1]], time),
    depth: project(axisPoint(axis, 0, a, b), time).depth,
    opacity: outer ? ".71" : f(0.27 + (a + b + 4) * 0.025),
  };
}

function face(
  axis: number,
  position: number,
  low: number,
  high: number,
  time: number,
) {
  return path(
    [
      axisPoint(axis, position, low, low),
      axisPoint(axis, position, high, low),
      axisPoint(axis, position, high, high),
      axisPoint(axis, position, low, high),
    ],
    time,
    true,
  );
}

// Three fine subdivisions in every square on the three visible boundary faces.
function engraving(axis: number, index: number, time: number) {
  const sub = index % 12;
  const position = -2 + Math.floor(sub / 3) + ((sub % 3) + 1) / 4;
  const points =
    index < 12
      ? [axisPoint(axis, 2, -2, position), axisPoint(axis, 2, 2, position)]
      : [axisPoint(axis, 2, position, -2), axisPoint(axis, 2, position, 2)];
  return path(points, time);
}

/** Sample a Manhattan polyline by distance; turns remain anchored to junctions. */
function along(points: Point[], distance: number): Point {
  let remaining = distance;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1],
      b = points[i];
    const length =
      Math.abs(b[0] - a[0]) + Math.abs(b[1] - a[1]) + Math.abs(b[2] - a[2]);
    if (remaining <= length) {
      const t = clamp(remaining / length);
      return [
        a[0] + (b[0] - a[0]) * t,
        a[1] + (b[1] - a[1]) * t,
        a[2] + (b[2] - a[2]) * t,
      ];
    }
    remaining -= length;
  }
  return points[points.length - 1];
}

function packet(points: Point[], head: number, time: number) {
  const start = Math.max(0, head - 0.6);
  const vertices: Point[] = [along(points, start)];
  let distance = 0;
  for (let i = 1; i < points.length; i++) {
    distance += points[i].reduce(
      (sum, value, axis) => sum + Math.abs(value - points[i - 1][axis]),
      0,
    );
    if (distance > start && distance < head) vertices.push(points[i]);
  }
  vertices.push(along(points, head));
  return path(vertices, time);
}

function square(center: Point, radius: number, time: number) {
  return path(
    [
      [center[0], center[1] - radius, center[2] - radius],
      [center[0], center[1] + radius, center[2] - radius],
      [center[0], center[1] + radius, center[2] + radius],
      [center[0], center[1] - radius, center[2] + radius],
    ],
    time,
    true,
  );
}

function frame(time: number) {
  const phases = BRANCHES.map((_, i) => (time * 0.115 + i / 4) % 1);
  const arrival = (phase: number, at: number) =>
    Math.exp(-Math.pow((phase - at) / 0.048, 2));
  return {
    hull: AXES.map((axis) => face(axis, 2, -2, 2, time)),
    regions: AXES.flatMap((axis) => [
      face(axis, 0, -2, 0, time),
      face(axis, 2, 0, 2, time),
    ]),
    rails: RAILS.map((rod) => rail(rod, time)).sort(
      (a, b) => a.depth - b.depth,
    ),
    engraving: AXES.flatMap((axis) =>
      Array.from({ length: 24 }, (_, i) => engraving(axis, i, time)),
    ),
    routes: [
      path(ENTRY, time),
      ...BRANCHES.map((branch) => path(branch, time)),
    ],
    packets: JOURNEYS.map((points, i) => ({
      d: packet(points, phases[i] * 7, time),
      opacity: f(Math.min(1, phases[i] * 20, (1 - phases[i]) * 20) * 0.88),
    })),
    aperture: [square([0, 0, 0], 0.16, time), square([0, 0, 0], 0.22, time)],
    gateLight: f(
      0.46 + Math.max(...phases.map((phase) => arrival(phase, 3 / 7))) * 0.5,
    ),
    endpoints: BRANCHES.map((branch, i) => ({
      d: square(branch[branch.length - 1], 0.065, time),
      opacity: f(0.44 + arrival(phases[i], 0.96) * 0.56),
    })),
    colors: palette.map((_, i) => {
      const p = (i + time * 0.15) % palette.length;
      const a = Math.floor(p),
        b = (a + 1) % palette.length;
      return `rgb(${palette[a].map((c, j) => Math.round(c + (palette[b][j] - c) * (p - a))).join(",")})`;
    }),
  };
}

const FIRST = frame(0);
type Nodes = {
  hull: SVGPathElement[];
  regions: SVGPathElement[];
  rails: SVGPathElement[][];
  engraving: SVGPathElement[];
  routes: SVGPathElement[];
  packets: SVGPathElement[];
  aperture: SVGPathElement[];
  endpoints: SVGPathElement[];
  stops: SVGStopElement[];
  reflection: SVGLinearGradientElement | null;
};
const cache = new WeakMap<SVGSVGElement, Nodes>();

function update(svg: SVGSVGElement, time: number) {
  let nodes = cache.get(svg);
  if (!nodes) {
    const paths = (selector: string) =>
      Array.from(svg.querySelectorAll<SVGPathElement>(selector));
    nodes = {
      hull: paths("[data-grid-hull]"),
      regions: paths("[data-grid-region]"),
      rails: Array.from(svg.querySelectorAll("[data-grid-rail]")).map((group) =>
        Array.from(group.querySelectorAll<SVGPathElement>("path")),
      ),
      engraving: paths("[data-grid-engraving]"),
      routes: paths("[data-grid-route]"),
      packets: paths("[data-grid-packet]"),
      aperture: paths("[data-grid-aperture]"),
      endpoints: paths("[data-grid-endpoint]"),
      stops: Array.from(
        svg.querySelectorAll<SVGStopElement>("[data-grid-spectrum] stop"),
      ),
      reflection: svg.querySelector("[data-grid-reflection]"),
    };
    cache.set(svg, nodes);
  }
  const pose = frame(time);
  pose.hull.forEach((d, i) => nodes.hull[i].setAttribute("d", d));
  pose.regions.forEach((d, i) => nodes.regions[i].setAttribute("d", d));
  pose.rails.forEach((rod, i) => {
    nodes.rails[i][0].setAttribute("d", rod.d);
    nodes.rails[i][1].setAttribute("d", rod.edge);
    nodes.rails[i][1].setAttribute("opacity", rod.opacity);
  });
  pose.engraving.forEach((d, i) => nodes.engraving[i].setAttribute("d", d));
  pose.routes.forEach((d, i) => nodes.routes[i].setAttribute("d", d));
  pose.packets.forEach((p, i) => {
    nodes.packets[i].setAttribute("d", p.d);
    nodes.packets[i].setAttribute("opacity", p.opacity);
  });
  pose.aperture.forEach((d, i) => {
    nodes.aperture[i].setAttribute("d", d);
    nodes.aperture[i].setAttribute("opacity", pose.gateLight);
  });
  pose.endpoints.forEach((endpoint, i) => {
    nodes.endpoints[i].setAttribute("d", endpoint.d);
    nodes.endpoints[i].setAttribute("opacity", endpoint.opacity);
  });
  pose.colors.forEach((color, i) =>
    nodes.stops[i].setAttribute("stop-color", color),
  );
  nodes.reflection?.setAttribute(
    "gradientTransform",
    `translate(${f(Math.sin(time * 0.25) * 46)} ${f(Math.cos(time * 0.25) * 25)})`,
  );
}

/** A private rectilinear network with shared junctions and orthogonal light routes. */
export function GridStudy({ paused = false, className }: StudyProps) {
  const ref = useRef<SVGSVGElement>(null);
  const id = `grid-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
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
          data-grid-reflection
          x1="151"
          y1="139"
          x2="492"
          y2="503"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#a5c1cf" stopOpacity=".035" />
          <stop offset=".3" stopColor="#aabaca" stopOpacity=".065" />
          <stop offset=".44" stopColor="#d2dce2" stopOpacity=".15" />
          <stop offset=".5" stopColor="#92a5b9" stopOpacity=".045" />
          <stop offset=".72" stopColor="#7a98a9" stopOpacity=".018" />
          <stop offset="1" stopColor="#b0c5cf" stopOpacity=".08" />
        </linearGradient>
        <linearGradient
          id={`${id}-silver`}
          x1="147"
          y1="148"
          x2="485"
          y2="506"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#bdd0dc" stopOpacity=".72" />
          <stop offset=".37" stopColor="#9bacc2" stopOpacity=".42" />
          <stop offset=".69" stopColor="#d3dce3" stopOpacity=".8" />
          <stop offset="1" stopColor="#a7c4ca" stopOpacity=".48" />
        </linearGradient>
        <linearGradient
          id={`${id}-spectrum`}
          data-grid-spectrum
          x1="144"
          y1="471"
          x2="483"
          y2="163"
          gradientUnits="userSpaceOnUse"
        >
          {FIRST.colors.map((color, i) => (
            <stop key={i} offset={i / 4} stopColor={color} />
          ))}
        </linearGradient>
      </defs>
      <g
        fill={`url(#${id}-glass)`}
        stroke={`url(#${id}-silver)`}
        strokeWidth=".55"
        strokeOpacity=".25"
      >
        {FIRST.hull.map((d, i) => (
          <path key={i} data-grid-hull d={d} />
        ))}
      </g>
      <g
        fill={`url(#${id}-spectrum)`}
        fillOpacity=".025"
        stroke={`url(#${id}-spectrum)`}
        strokeWidth=".6"
        strokeOpacity=".12"
      >
        {FIRST.regions.map((d, i) => (
          <path key={i} data-grid-region d={d} />
        ))}
      </g>
      <g stroke={`url(#${id}-silver)`} strokeWidth=".4" opacity=".13">
        {FIRST.engraving.map((d, i) => (
          <path key={i} data-grid-engraving d={d} />
        ))}
      </g>
      {FIRST.rails.map((rod, i) => (
        <g key={i} data-grid-rail>
          <path d={rod.d} fill={`url(#${id}-spectrum)`} fillOpacity=".075" />
          <path
            d={rod.edge}
            stroke={`url(#${id}-silver)`}
            strokeWidth=".65"
            opacity={rod.opacity}
          />
        </g>
      ))}
      <g
        stroke={`url(#${id}-spectrum)`}
        strokeWidth=".8"
        strokeLinejoin="miter"
        opacity=".36"
      >
        {FIRST.routes.map((d, i) => (
          <path key={i} data-grid-route d={d} />
        ))}
      </g>
      {FIRST.aperture.map((d, i) => (
        <path
          key={i}
          data-grid-aperture
          d={d}
          stroke={i ? `url(#${id}-silver)` : `url(#${id}-spectrum)`}
          strokeWidth={i ? ".65" : "1"}
          opacity={FIRST.gateLight}
        />
      ))}
      <g
        stroke={`url(#${id}-spectrum)`}
        strokeWidth="1.55"
        strokeLinejoin="miter"
        strokeLinecap="round"
      >
        {FIRST.packets.map((p, i) => (
          <path key={i} data-grid-packet d={p.d} opacity={p.opacity} />
        ))}
      </g>
      {FIRST.endpoints.map((endpoint, i) => (
        <path
          key={i}
          data-grid-endpoint
          d={endpoint.d}
          stroke={`url(#${id}-spectrum)`}
          strokeWidth=".85"
          fill={`url(#${id}-spectrum)`}
          fillOpacity=".19"
          opacity={endpoint.opacity}
        />
      ))}
    </svg>
  );
}
