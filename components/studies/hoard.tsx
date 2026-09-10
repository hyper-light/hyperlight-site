"use client";

import { useId, useRef } from "react";
import {
  useStudyMotion,
  type StudyProps,
} from "@/components/studies/use-study-motion";

type Point = { x: number; y: number };
type Packet = { d: string; opacity: string };
const f = (n: number) => n.toFixed(2);
const xy = (p: Point) => `${f(p.x)},${f(p.y)}`;
const clamp = (v: number) => Math.min(1, Math.max(0, v));
const palette = [
  [157, 195, 184],
  [139, 177, 207],
  [171, 157, 201],
  [204, 171, 171],
  [207, 193, 162],
];

/** Two thin optical data fields: a remote origin and a nearby resident copy. */
function point(remote: boolean, u: number, v: number, time: number): Point {
  const corners = remote
    ? [
        { x: 369, y: 122 },
        { x: 551, y: 176 },
        { x: 475, y: 298 },
        { x: 318, y: 237 },
      ]
    : [
        { x: 126, y: 293 },
        { x: 309, y: 267 },
        { x: 380, y: 428 },
        { x: 181, y: 475 },
      ];
  const top = {
    x: corners[0].x + (corners[1].x - corners[0].x) * u,
    y: corners[0].y + (corners[1].y - corners[0].y) * u,
  };
  const bottom = {
    x: corners[3].x + (corners[2].x - corners[3].x) * u,
    y: corners[3].y + (corners[2].y - corners[3].y) * u,
  };
  const drift = Math.sin(time * 0.38 + (remote ? 1.4 : 0));
  return {
    x:
      top.x +
      (bottom.x - top.x) * v +
      Math.sin(v * Math.PI) * Math.sin(u * 3 + time * 0.23) * 8,
    y:
      top.y +
      (bottom.y - top.y) * v +
      Math.sin(u * Math.PI) * (9 + drift * 5) +
      Math.sin(v * Math.PI) * drift * 6,
  };
}

function line(
  remote: boolean,
  u0: number,
  v0: number,
  u1: number,
  v1: number,
  time: number,
  steps = 24,
) {
  return Array.from(
    { length: steps + 1 },
    (_, i) =>
      `${i ? "L" : "M"}${xy(point(remote, u0 + ((u1 - u0) * i) / steps, v0 + ((v1 - v0) * i) / steps, time))}`,
  ).join("");
}

function tile(
  remote: boolean,
  column: number,
  row: number,
  columns: number,
  rows: number,
  time: number,
) {
  const margin = 0.011;
  const left = column / columns + margin,
    right = (column + 1) / columns - margin;
  const top = row / rows + margin,
    bottom = (row + 1) / rows - margin;
  const points: Point[] = [];
  for (let i = 0; i <= 6; i++)
    points.push(point(remote, left + ((right - left) * i) / 6, top, time));
  for (let i = 1; i <= 6; i++)
    points.push(point(remote, right, top + ((bottom - top) * i) / 6, time));
  for (let i = 1; i <= 6; i++)
    points.push(point(remote, right - ((right - left) * i) / 6, bottom, time));
  for (let i = 1; i <= 6; i++)
    points.push(point(remote, left, bottom - ((bottom - top) * i) / 6, time));
  return `M${points.map(xy).join("L")}Z`;
}

function curve(a: Point, b: Point, c: Point, d: Point, t: number): Point {
  const s = 1 - t;
  return {
    x: s ** 3 * a.x + 3 * s * s * t * b.x + 3 * s * t * t * c.x + t ** 3 * d.x,
    y: s ** 3 * a.y + 3 * s * s * t * b.y + 3 * s * t * t * c.y + t ** 3 * d.y,
  };
}

function routes(time: number) {
  const cache = point(false, 0.5, 0.5, time),
    origin = point(true, 0.5, 0.625, time);
  const reader = { x: 84, y: 353 };
  return [
    [reader, { x: 136, y: 303 }, { x: 190, y: 318 }, cache],
    [cache, { x: 284, y: 253 }, { x: 377, y: 293 }, origin],
    [origin, { x: 410, y: 313 }, { x: 336, y: 282 }, cache],
    [cache, { x: 204, y: 421 }, { x: 136, y: 404 }, reader],
  ];
}

function segment(points: Point[], start: number, end: number, steps = 24) {
  return Array.from(
    { length: steps + 1 },
    (_, i) =>
      `${i ? "L" : "M"}${xy(curve(points[0], points[1], points[2], points[3], start + ((end - start) * i) / steps))}`,
  ).join("");
}

function frame(time: number) {
  const paths = routes(time),
    phase = (time + 5.8) % 13;
  const resident = clamp((phase - 4.1) / 0.6) * clamp((12.8 - phase) / 0.8);
  // First retrieval reaches the origin. Later requests use only the near field.
  const journeys = [
    { route: 0, start: 0.1, duration: 1.0 },
    { route: 1, start: 1.1, duration: 1.55 },
    { route: 2, start: 2.9, duration: 1.5 },
    { route: 3, start: 4.45, duration: 0.8 },
    { route: 0, start: 6.0, duration: 0.7 },
    { route: 3, start: 6.8, duration: 0.65 },
    { route: 0, start: 8.5, duration: 0.7 },
    { route: 3, start: 9.3, duration: 0.65 },
    { route: 0, start: 11.0, duration: 0.7 },
    { route: 3, start: 11.8, duration: 0.65 },
  ];
  const packets: Packet[] = journeys.map((journey) => {
    const progress = (phase - journey.start) / journey.duration;
    return {
      d: segment(
        paths[journey.route],
        clamp(progress - 0.11),
        clamp(progress),
        10,
      ),
      opacity: progress >= 0 && progress <= 1 ? "1.0000" : "0.0000",
    };
  });
  const cells = [
    ...Array.from({ length: 20 }, (_, i) =>
      tile(true, i % 5, Math.floor(i / 5), 5, 4, time),
    ),
    ...Array.from({ length: 9 }, (_, i) =>
      tile(false, i % 3, Math.floor(i / 3), 3, 3, time),
    ),
  ];
  const engraving = [
    ...Array.from({ length: 28 }, (_, i) =>
      line(true, 0, (i + 1) / 29, 1, (i + 1) / 29, time),
    ),
    ...Array.from({ length: 24 }, (_, i) =>
      line(false, 0, (i + 1) / 25, 1, (i + 1) / 25, time),
    ),
  ];
  const glyph = (remote: boolean) =>
    [0, 1, 2].map((i) =>
      line(
        remote,
        0.45,
        remote ? 0.565 + i * 0.04 : 0.44 + i * 0.055,
        0.57 - (i === 1 ? 0.035 : 0),
        remote ? 0.565 + i * 0.04 : 0.44 + i * 0.055,
        time,
        8,
      ),
    );
  return {
    cells,
    engraving,
    paths: paths.map((p) => segment(p, 0, 1)),
    packets,
    resident: resident.toFixed(4),
    glyphs: [...glyph(true), ...glyph(false)],
    cache: tile(false, 1, 1, 3, 3, time),
    origin: tile(true, 2, 2, 5, 4, time),
    color: palette.map((_, i) => {
      const value = (i + time * 0.28) % palette.length,
        left = Math.floor(value),
        mix = value - left;
      return `rgb(${palette[left].map((c, j) => Math.round(c + (palette[(left + 1) % palette.length][j] - c) * mix)).join(",")})`;
    }),
  };
}

const initial = frame(0);
const elements = new WeakMap<
  SVGSVGElement,
  {
    cells: NodeListOf<SVGPathElement>;
    engraving: NodeListOf<SVGPathElement>;
    routes: NodeListOf<SVGPathElement>;
    packets: NodeListOf<SVGPathElement>;
    glyphs: NodeListOf<SVGPathElement>;
    cache: SVGPathElement | null;
    origin: SVGPathElement | null;
    resident: NodeListOf<SVGElement>;
    stops: NodeListOf<SVGStopElement>;
    reflection: SVGLinearGradientElement | null;
  }
>();
function update(svg: SVGSVGElement, time: number) {
  let nodes = elements.get(svg);
  if (!nodes) {
    nodes = {
      cells: svg.querySelectorAll("[data-cache-cell]"),
      engraving: svg.querySelectorAll("[data-cache-engraving]"),
      routes: svg.querySelectorAll("[data-cache-route]"),
      packets: svg.querySelectorAll("[data-cache-packet]"),
      glyphs: svg.querySelectorAll("[data-cache-glyph]"),
      cache: svg.querySelector("[data-cache-resident-cell]"),
      origin: svg.querySelector("[data-cache-origin]"),
      resident: svg.querySelectorAll("[data-cache-resident]"),
      stops: svg.querySelectorAll("[data-cache-spectrum] stop"),
      reflection: svg.querySelector("[data-cache-reflection]"),
    };
    elements.set(svg, nodes);
  }
  const next = frame(time);
  nodes.cells.forEach((node, i) => node.setAttribute("d", next.cells[i]));
  nodes.engraving.forEach((node, i) =>
    node.setAttribute("d", next.engraving[i]),
  );
  nodes.routes.forEach((node, i) => node.setAttribute("d", next.paths[i]));
  nodes.packets.forEach((node, i) => {
    node.setAttribute("d", next.packets[i].d);
    node.setAttribute("opacity", next.packets[i].opacity);
  });
  nodes.glyphs.forEach((node, i) => node.setAttribute("d", next.glyphs[i]));
  nodes.resident.forEach((node) => node.setAttribute("opacity", next.resident));
  nodes.cache?.setAttribute("d", next.cache);
  nodes.origin?.setAttribute("d", next.origin);
  nodes.stops.forEach((node, i) =>
    node.setAttribute("stop-color", next.color[i]),
  );
  nodes.reflection?.setAttribute(
    "gradientTransform",
    `translate(${f(Math.sin(time * 0.34) * 65)} ${f(Math.cos(time * 0.34) * 30)})`,
  );
}

/** An optical cache: retrieve once from a distant origin, then reuse a resident copy. */
export function HoardStudy({ paused = false, className }: StudyProps) {
  const ref = useRef<SVGSVGElement>(null);
  const id = `hoard-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
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
          id={`${id}-spectrum`}
          data-cache-spectrum
          x1="124"
          y1="427"
          x2="493"
          y2="137"
          gradientUnits="userSpaceOnUse"
        >
          {initial.color.map((color, i) => (
            <stop key={i} offset={(i / 4).toFixed(4)} stopColor={color} />
          ))}
        </linearGradient>
        <linearGradient
          id={`${id}-glass`}
          data-cache-reflection
          x1="159"
          y1="117"
          x2="489"
          y2="465"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#8cabb8" stopOpacity=".06" />
          <stop offset=".19" stopColor="#9caebd" stopOpacity=".1" />
          <stop offset=".35" stopColor="#adc3ce" stopOpacity=".18" />
          <stop offset=".415" stopColor="#d5dfe2" stopOpacity=".38" />
          <stop offset=".47" stopColor="#9cb4c1" stopOpacity=".2" />
          <stop offset=".56" stopColor="#354653" stopOpacity=".09" />
          <stop offset=".8" stopColor="#a3b9bf" stopOpacity=".2" />
          <stop offset="1" stopColor="#2b414c" stopOpacity=".07" />
        </linearGradient>
        <linearGradient
          id={`${id}-edge`}
          x1="198"
          y1="150"
          x2="413"
          y2="439"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#bfd2d6" stopOpacity=".2" />
          <stop offset=".41" stopColor="#bcc8ce" stopOpacity=".57" />
          <stop offset=".68" stopColor="#7f97a4" stopOpacity=".2" />
          <stop offset="1" stopColor="#b4bbc7" stopOpacity=".5" />
        </linearGradient>
        <radialGradient id={`${id}-aura`}>
          <stop stopColor="#a4c6d0" stopOpacity=".045" />
          <stop offset="1" stopColor="#a4c6d0" stopOpacity="0" />
        </radialGradient>
        <filter id={`${id}-light`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2.2" />
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <ellipse cx="319" cy="312" rx="247" ry="199" fill={`url(#${id}-aura)`} />
      <g
        fill={`url(#${id}-glass)`}
        stroke={`url(#${id}-edge)`}
        strokeWidth=".65"
      >
        {initial.cells.map((d, i) => (
          <path key={i} data-cache-cell d={d} />
        ))}
      </g>
      <g stroke="#adbfca" strokeWidth=".4" opacity=".07">
        {initial.engraving.map((d, i) => (
          <path key={i} data-cache-engraving d={d} />
        ))}
      </g>
      <path
        data-cache-origin
        d={initial.origin}
        fill={`url(#${id}-spectrum)`}
        fillOpacity=".07"
        stroke={`url(#${id}-spectrum)`}
        strokeWidth=".9"
        strokeOpacity=".6"
      />
      <g data-cache-resident opacity={initial.resident}>
        <path
          data-cache-resident-cell
          d={initial.cache}
          fill={`url(#${id}-spectrum)`}
          fillOpacity=".17"
          stroke={`url(#${id}-spectrum)`}
          strokeWidth="1.05"
        />
      </g>
      <g
        stroke={`url(#${id}-spectrum)`}
        strokeWidth="1.4"
        strokeLinecap="round"
      >
        {initial.glyphs.map((d, i) => (
          <path
            key={i}
            data-cache-glyph
            {...(i >= 3
              ? { "data-cache-resident": "", opacity: initial.resident }
              : { opacity: ".7" })}
            d={d}
          />
        ))}
      </g>
      <g stroke="#9ab2be" strokeWidth=".65" opacity=".25">
        {initial.paths.map((d, i) => (
          <path key={i} data-cache-route d={d} />
        ))}
      </g>
      <g
        stroke={`url(#${id}-spectrum)`}
        strokeWidth="1.65"
        strokeLinecap="round"
        filter={`url(#${id}-light)`}
      >
        {initial.packets.map((packet, i) => (
          <path
            key={i}
            data-cache-packet
            d={packet.d}
            opacity={packet.opacity}
          />
        ))}
      </g>
      <circle cx="84" cy="353" r="4" fill="#c2ced1" />
      <circle
        cx="84"
        cy="353"
        r="11"
        stroke="#8fa8b5"
        strokeWidth=".6"
        opacity=".45"
      />
    </svg>
  );
}
