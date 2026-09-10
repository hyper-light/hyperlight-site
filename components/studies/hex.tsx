"use client";

import { useId, useRef } from "react";
import {
  useStudyMotion,
  type StudyProps,
} from "@/components/studies/use-study-motion";

type Point = { x: number; y: number; z: number };
type Cell = { layer: number; q: number; r: number; key: number };
const f = (n: number) => n.toFixed(2);
const palette = [
  [157, 191, 196],
  [151, 166, 207],
  [188, 160, 194],
  [209, 187, 152],
  [188, 210, 191],
];
const CELLS: Cell[] = [];
for (let layer = 0; layer < 2; layer++) {
  const extent = layer === 0 ? 2 : 1;
  for (let q = -extent; q <= extent; q++)
    for (let r = -extent; r <= extent; r++) {
      if (Math.abs(q + r) <= extent)
        CELLS.push({ layer, q, r, key: CELLS.length });
    }
}
const TARGETS = CELLS.filter(
  (cell) => cell.layer === 1 && (cell.q !== 0 || cell.r !== 0),
);
function project(x: number, y: number, z: number, time: number): Point {
  const tilt = 0.74 + Math.sin(time * 0.29) * 0.085;
  const turn = -0.24 + Math.sin(time * 0.33) * 0.045;
  const py = y * Math.cos(tilt) - z * Math.sin(tilt);
  const depth = y * Math.sin(tilt) + z * Math.cos(tilt);
  const scale = (1.38 * 1100) / (1100 - depth);
  return {
    x: 320 + (x * Math.cos(turn) - py * Math.sin(turn)) * scale,
    y: 332 + (x * Math.sin(turn) + py * Math.cos(turn)) * scale,
    z: depth,
  };
}
function activity(cell: Cell, time: number) {
  const route = TARGETS.reduce((best, candidate, index) => {
    const distance = (candidate.q - cell.q) ** 2 + (candidate.r - cell.r) ** 2;
    const closest = TARGETS[best];
    return distance < (closest.q - cell.q) ** 2 + (closest.r - cell.r) ** 2
      ? index
      : best;
  }, 0);
  const phase = (time * 0.29 + route / 6) % 1;
  // The trace head reaches its destination at 0.916 of its cycle.
  const target =
    cell.layer === 1 ? (cell.q === 0 && cell.r === 0 ? 0.67 : 0.916) : 0.48;
  return Math.exp(-Math.pow((phase - target) / 0.12, 2));
}
function location(cell: Cell, time: number) {
  const x = (cell.q + cell.r / 2) * 57;
  const y = cell.r * 49.4;
  const z =
    (cell.layer === 0 ? -30 : 49) +
    (x * x + y * y) / 1300 +
    Math.sin(time * 0.62 + cell.q * 0.65 + cell.r * 0.8) * 6 +
    activity(cell, time) * 11;
  return { x, y, z };
}
function cellPath(cell: Cell, time: number, height = 0, inset = 1) {
  const center = location(cell, time);
  return (
    Array.from({ length: 7 }, (_, i) => {
      const angle = ((i % 6) / 6) * Math.PI * 2 + Math.PI / 6;
      const x = center.x + Math.cos(angle) * 30 * inset;
      const y = center.y + Math.sin(angle) * 30 * inset;
      const p = project(
        x,
        y,
        center.z + height + Math.sin(angle * 2 + time * 0.55 + cell.q) * 1.5,
        time,
      );
      return `${i ? "L" : "M"}${f(p.x)},${f(p.y)}`;
    }).join("") + "Z"
  );
}
function routePath(route: number, time: number) {
  const target = location(TARGETS[route], time);
  return Array.from({ length: 39 }, (_, index) => {
    const t = index / 38,
      inv = 1 - t;
    const p = project(
      inv ** 3 * (-171 + route * 9) +
        3 * inv * inv * t * -63 +
        3 * inv * t * t * (target.x * 0.4) +
        t ** 3 * target.x,
      inv ** 3 * (98 + route * 5) +
        3 * inv * inv * t * 50 +
        3 * inv * t * t * target.y +
        t ** 3 * target.y,
      inv ** 3 * -77 +
        3 * inv * inv * t * -47 +
        3 * inv * t * t * target.z +
        t ** 3 * target.z,
      time,
    );
    return `${index ? "L" : "M"}${f(p.x)},${f(p.y)}`;
  }).join("");
}
function colors(time: number) {
  return palette.map((_, index) => {
    const value = (index + time * 0.45) % palette.length,
      a = Math.floor(value),
      b = (a + 1) % palette.length;
    return `rgb(${palette[a].map((channel, c) => Math.round(channel + (palette[b][c] - channel) * (value - a))).join(",")})`;
  });
}
function frame(time: number) {
  return CELLS.map((cell) => {
    const center = location(cell, time);
    return {
      body: cellPath(cell, time),
      lower: cellPath(cell, time, -2.7),
      inset: cellPath(cell, time, 0.3, 0.87),
      depth: project(center.x, center.y, center.z, time).z,
      active: activity(cell, time),
      sheen: -1.05 + ((time * 0.2 + cell.key * 0.073) % 1) * 2,
    };
  }).sort((a, b) => a.depth - b.depth);
}
const FIRST = frame(0);
type Nodes = {
  paths: SVGPathElement[][];
  routes: SVGPathElement[];
  signals: SVGPathElement[];
  stops: SVGStopElement[];
  reflections: SVGLinearGradientElement[];
};
const cache = new WeakMap<SVGSVGElement, Nodes>();
function update(svg: SVGSVGElement, time: number) {
  let nodes = cache.get(svg);
  if (!nodes) {
    nodes = {
      paths: Array.from(svg.querySelectorAll("[data-hex-cell]")).map((group) =>
        Array.from(group.querySelectorAll<SVGPathElement>("path")),
      ),
      routes: Array.from(
        svg.querySelectorAll<SVGPathElement>("[data-hex-route]"),
      ),
      signals: Array.from(
        svg.querySelectorAll<SVGPathElement>("[data-hex-signal]"),
      ),
      stops: Array.from(
        svg.querySelectorAll<SVGStopElement>("[data-hex-spectrum] stop"),
      ),
      reflections: Array.from(
        svg.querySelectorAll<SVGLinearGradientElement>("[data-hex-reflection]"),
      ),
    };
    cache.set(svg, nodes);
  }
  frame(time).forEach((cell, index) => {
    const paths = nodes.paths[index];
    paths[0].setAttribute("d", cell.lower);
    paths[1].setAttribute("d", cell.body);
    paths[2].setAttribute("d", cell.inset);
    paths[3].setAttribute("d", cell.body);
    paths[4].setAttribute("d", cell.body);
    paths[1].setAttribute(
      "fill-opacity",
      (0.19 + cell.active * 0.17).toFixed(4),
    );
    paths[3].setAttribute("opacity", (0.1 + cell.active * 0.76).toFixed(4));
    paths[4].setAttribute("opacity", (0.52 + cell.active * 0.35).toFixed(4));
    nodes.reflections[index].setAttribute("x1", f(cell.sheen));
    nodes.reflections[index].setAttribute("x2", f(cell.sheen + 0.66));
  });
  nodes.routes.forEach((node, index) => {
    const d = routePath(index, time);
    node.setAttribute("d", d);
    nodes.signals[index].setAttribute("d", d);
    nodes.signals[index].setAttribute(
      "stroke-dashoffset",
      f(73 - ((time * 0.29 + index / 6) % 1) * 880),
    );
  });
  colors(time).forEach((color, i) =>
    nodes.stops[i].setAttribute("stop-color", color),
  );
}

/** Work enters a thin volumetric compute field and allocates regions at different depths. */
export function HexStudy({ paused = false, className }: StudyProps) {
  const ref = useRef<SVGSVGElement>(null);
  const id = `hex-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
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
        {FIRST.map((cell, index) => (
          <linearGradient
            key={index}
            id={`${id}-reflection-${index}`}
            data-hex-reflection=""
            x1={f(cell.sheen)}
            y1="0"
            x2={f(cell.sheen + 0.66)}
            y2="1"
          >
            <stop stopColor="#d9e5e9" stopOpacity="0" />
            <stop offset=".35" stopColor="#d9e5e9" stopOpacity="0" />
            <stop offset=".5" stopColor="#d9e5e9" stopOpacity=".46" />
            <stop offset=".62" stopColor="#d9e5e9" stopOpacity="0" />
            <stop offset="1" stopColor="#d9e5e9" stopOpacity="0" />
          </linearGradient>
        ))}
        <linearGradient id={`${id}-glass`} x1=".05" y1="0" x2=".9" y2="1">
          <stop stopColor="#bdc8cf" />
          <stop offset=".21" stopColor="#5b7486" />
          <stop offset=".58" stopColor="#192a38" />
          <stop offset=".82" stopColor="#708898" />
          <stop offset="1" stopColor="#acbac3" />
        </linearGradient>
        <linearGradient
          id={`${id}-spectrum`}
          data-hex-spectrum=""
          x1="110"
          y1="440"
          x2="500"
          y2="150"
          gradientUnits="userSpaceOnUse"
        >
          {colors(0).map((color, i) => (
            <stop key={i} offset={(i / 4).toFixed(4)} stopColor={color} />
          ))}
        </linearGradient>
        <radialGradient id={`${id}-ambient`}>
          <stop stopColor="#6c96ad" stopOpacity=".07" />
          <stop offset="1" stopColor="#6c96ad" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse
        cx="320"
        cy="316"
        rx="260"
        ry="217"
        fill={`url(#${id}-ambient)`}
      />
      {TARGETS.map((_, i) => (
        <path
          key={i}
          data-hex-route=""
          d={routePath(i, 0)}
          stroke={`url(#${id}-spectrum)`}
          strokeWidth=".7"
          opacity=".15"
        />
      ))}
      {FIRST.map((cell, index) => (
        <g key={index} data-hex-cell="">
          <path
            d={cell.lower}
            fill="#354b5b"
            fillOpacity=".1"
            stroke="#a5b9c6"
            strokeWidth=".55"
            strokeOpacity=".13"
          />
          <path
            d={cell.body}
            fill={`url(#${id}-glass)`}
            fillOpacity={(0.19 + cell.active * 0.17).toFixed(4)}
            stroke="#adc1cc"
            strokeWidth=".7"
            strokeOpacity=".25"
          />
          <path
            d={cell.inset}
            stroke="#a9bfc9"
            strokeWidth=".45"
            opacity=".13"
          />
          <path
            d={cell.body}
            stroke={`url(#${id}-spectrum)`}
            strokeWidth="1.25"
            opacity={(0.1 + cell.active * 0.76).toFixed(4)}
          />
          <path
            d={cell.body}
            fill={`url(#${id}-reflection-${index})`}
            opacity={(0.52 + cell.active * 0.35).toFixed(4)}
          />
        </g>
      ))}
      {TARGETS.map((_, i) => (
        <path
          key={i}
          data-hex-signal=""
          d={routePath(i, 0)}
          pathLength="800"
          stroke={`url(#${id}-spectrum)`}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeDasharray="67 820"
          strokeDashoffset={f(73 - (i / 6) * 880)}
        />
      ))}
    </svg>
  );
}
