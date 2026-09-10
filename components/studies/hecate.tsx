"use client";

import { useId, useRef } from "react";
import {
  useStudyMotion,
  type StudyProps,
} from "@/components/studies/use-study-motion";

const TAU = Math.PI * 2;
const SEGMENTS = 46;
type Point = { x: number; y: number; z: number };
type Tile = {
  d: string;
  fill: string;
  endFill: string;
  x1: string;
  y1: string;
  x2: string;
  y2: string;
  depth: number;
};
const coordinate = (point: Point) =>
  `${point.x.toFixed(2)},${point.y.toFixed(2)}`;

function point(arm: number, angle: number, side: number, time: number): Point {
  const bearing = (arm * TAU) / 3 - 0.35;
  const opening = Math.sin(angle / 2);
  const radius = 87 + 91 * Math.cos(angle);
  const width = 10 + 5 * Math.sin(angle + arm);
  const along = radius + side * width * Math.cos(angle);
  const across =
    Math.sin(angle) * (65 + 8 * Math.sin(time * 0.58 + arm)) +
    side * width * Math.sin(angle);
  const x = along * Math.cos(bearing) - across * Math.sin(bearing);
  const y = along * Math.sin(bearing) + across * Math.cos(bearing);
  const z =
    49 * Math.sin(angle) +
    22 * Math.sin(angle * 2 + time * 0.55 + arm) * opening;
  const lean = 0.17 + Math.sin(time * 0.4) * 0.085;
  return {
    x: 320 + x * 1.08 + z * 0.38,
    y: 308 + y * 0.99 - z * 0.32 + x * lean,
    z: z + y * 0.25,
  };
}

function color(arm: number, angle: number, time: number) {
  const light = Math.pow(
    Math.abs(Math.sin(angle * 1.5 + arm * 0.7 - time * 0.23)),
    5,
  );
  const traveling = Math.pow(
    Math.max(0, Math.cos(angle - time * 0.9 + arm * 1.9)),
    18,
  );
  const base = 21 + light * 111;
  const spectrum = [
    [143, 172, 199],
    [181, 157, 195],
    [188, 180, 145],
  ][arm];
  const amount = traveling * 0.58;
  const fill = [base, base + 4, base + 8].map((channel, index) =>
    Math.round(channel * (1 - amount) + spectrum[index] * amount),
  );
  return `rgb(${fill.join(",")})`;
}

function contour(arm: number, time: number) {
  return Array.from(
    { length: SEGMENTS + 1 },
    (_, index) =>
      `${index === 0 ? "M" : "L"}${coordinate(point(arm, (index / SEGMENTS) * TAU, -1, time))}`,
  ).join("");
}

function frame(time: number): Tile[] {
  const tiles: Tile[] = [];
  for (let arm = 0; arm < 3; arm++) {
    for (let segment = 0; segment < SEGMENTS; segment++) {
      const angle = (segment / SEGMENTS) * TAU;
      const next = ((segment + 1.025) / SEGMENTS) * TAU;
      const center = point(arm, angle, 0, time);
      const end = point(arm, next, 0, time);
      const corners = [
        point(arm, angle, -1, time),
        point(arm, next, -1, time),
        point(arm, next, 1, time),
        point(arm, angle, 1, time),
      ];
      tiles.push({
        d: `M${corners.map(coordinate).join("L")}Z`,
        fill: color(arm, angle, time),
        endFill: color(arm, next, time),
        x1: center.x.toFixed(2),
        y1: center.y.toFixed(2),
        x2: end.x.toFixed(2),
        y2: end.y.toFixed(2),
        depth: center.z,
      });
    }
  }
  return tiles.sort((a, b) => a.depth - b.depth);
}

const initial = frame(0);
const elements = new WeakMap<
  SVGSVGElement,
  {
    tiles: NodeListOf<SVGPathElement>;
    edges: NodeListOf<SVGPathElement>;
    gradients: NodeListOf<SVGLinearGradientElement>;
    starts: NodeListOf<SVGStopElement>;
    ends: NodeListOf<SVGStopElement>;
  }
>();

function update(svg: SVGSVGElement, time: number) {
  let nodes = elements.get(svg);
  if (!nodes) {
    nodes = {
      tiles: svg.querySelectorAll("[data-hecate-tile]"),
      edges: svg.querySelectorAll("[data-hecate-edge]"),
      gradients: svg.querySelectorAll("[data-hecate-gradient]"),
      starts: svg.querySelectorAll("[data-hecate-start]"),
      ends: svg.querySelectorAll("[data-hecate-end]"),
    };
    elements.set(svg, nodes);
  }
  frame(time).forEach((tile, index) => {
    nodes.tiles[index].setAttribute("d", tile.d);
    nodes.gradients[index].setAttribute("x1", tile.x1);
    nodes.gradients[index].setAttribute("y1", tile.y1);
    nodes.gradients[index].setAttribute("x2", tile.x2);
    nodes.gradients[index].setAttribute("y2", tile.y2);
    nodes.starts[index].setAttribute("stop-color", tile.fill);
    nodes.ends[index].setAttribute("stop-color", tile.endFill);
  });
  nodes.edges.forEach((edge, arm) =>
    edge.setAttribute("d", contour(arm, time)),
  );
}

/** Three folded optical arms share a precise, quiet center. */
export function HecateStudy({ paused = false, className }: StudyProps) {
  const ref = useRef<SVGSVGElement>(null);
  const id = `hecate-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
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
        {initial.map((tile, index) => (
          <linearGradient
            key={index}
            id={`${id}-tile-${index}`}
            data-hecate-gradient
            x1={tile.x1}
            y1={tile.y1}
            x2={tile.x2}
            y2={tile.y2}
            gradientUnits="userSpaceOnUse"
          >
            <stop data-hecate-start stopColor={tile.fill} />
            <stop data-hecate-end offset="1" stopColor={tile.endFill} />
          </linearGradient>
        ))}
        <radialGradient id={`${id}-core`}>
          <stop stopColor="#bbc6d7" stopOpacity=".12" />
          <stop offset="1" stopColor="#bbc6d7" stopOpacity="0" />
        </radialGradient>
        <linearGradient
          id={`${id}-edge`}
          x1="165"
          y1="105"
          x2="451"
          y2="476"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#aab8c8" />
          <stop offset=".45" stopColor="#e5ded4" />
          <stop offset="1" stopColor="#9b8dab" />
        </linearGradient>
      </defs>
      <ellipse cx="321" cy="311" rx="95" ry="94" fill={`url(#${id}-core)`} />
      <g>
        {initial.map((tile, index) => (
          <path
            key={index}
            data-hecate-tile
            d={tile.d}
            fill={`url(#${id}-tile-${index})`}
            stroke={`url(#${id}-tile-${index})`}
            strokeWidth=".45"
          />
        ))}
      </g>
      <g stroke={`url(#${id}-edge)`} strokeWidth=".65" opacity=".33">
        {[0, 1, 2].map((arm) => (
          <path key={arm} data-hecate-edge d={contour(arm, 0)} />
        ))}
      </g>
      <path
        d="m320 299 9 9-9 9-9-9Z"
        fill="#20232b"
        stroke="#bac3d1"
        strokeWidth=".8"
      />
      <path
        d="M320 290v7m0 22v7m-18-18h7m22 0h7"
        stroke="#9b9caa"
        strokeWidth=".6"
        opacity=".65"
      />
      <circle cx="320" cy="308" r="1.6" fill="#dedbd5" />
      <path
        d="M138 524h23m-12-4v8m330-4h23m-11-4v8"
        stroke="#555965"
        strokeWidth=".7"
        opacity=".5"
      />
    </svg>
  );
}
