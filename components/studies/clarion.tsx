"use client";

import { useId, useRef } from "react";
import {
  useStudyMotion,
  type StudyProps,
} from "@/components/studies/use-study-motion";

type Point = { x: number; y: number };
const TAU = Math.PI * 2;
const SOURCE = [-34, -12];
const RINGS = 39;
const SAMPLES = 96;
const RECEIVERS = [
  [126, -66],
  [-104, 127],
  [107, 123],
];
const f = (n: number) => n.toFixed(2);
const palette = [
  [149, 190, 198],
  [156, 164, 211],
  [190, 154, 187],
  [216, 190, 153],
  [189, 211, 188],
];
const progress = (time: number, offset = 0) =>
  (((time - offset) % 3.6) + 3.6) % 3.6;
const radii = (time: number) =>
  [0, 1.2, 2.4].map((offset) => progress(time, offset) * 64);
function amplitude(distance: number, fronts: number[]) {
  return fronts.reduce((sum, radius) => {
    const delta = distance - radius;
    return sum + Math.cos(delta / 9) * Math.exp(-Math.pow(delta / 17, 2));
  }, 0);
}
function project(
  x: number,
  y: number,
  time: number,
  fronts: number[],
  lift = 0,
): Point {
  const distance = Math.hypot(x - SOURCE[0], y - SOURCE[1]);
  const z =
    -(x * x + y * y) / 1260 +
    amplitude(distance, fronts) * 10 +
    Math.sin(x / 107 + time * 0.35) * 2.5 +
    lift;
  const pitch = 0.85 + Math.sin(time * 0.26) * 0.06;
  const turn = -0.29;
  const py = y * Math.cos(pitch) - z * Math.sin(pitch);
  const depth = y * Math.sin(pitch) + z * Math.cos(pitch);
  const scale = 1060 / (1060 - depth);
  return {
    x: 320 + (x * Math.cos(turn) - py * Math.sin(turn)) * scale,
    y: 308 + (x * Math.sin(turn) + py * Math.cos(turn)) * scale,
  };
}
function circle(
  x: number,
  y: number,
  radius: number,
  time: number,
  fronts: number[],
  lift = 0,
) {
  return (
    Array.from({ length: SAMPLES + 1 }, (_, i) => {
      const angle = (i / SAMPLES) * TAU;
      const p = project(
        x + Math.cos(angle) * radius,
        y + Math.sin(angle) * radius,
        time,
        fronts,
        lift,
      );
      return `${i ? "L" : "M"}${f(p.x)},${f(p.y)}`;
    }).join("") + "Z"
  );
}
function colors(time: number) {
  return palette.map((_, index) => {
    const p = (index + time * 0.47) % palette.length,
      a = Math.floor(p),
      b = (a + 1) % palette.length;
    return `rgb(${palette[a].map((channel, c) => Math.round(channel + (palette[b][c] - channel) * (p - a))).join(",")})`;
  });
}
function frame(time: number) {
  const fronts = radii(time);
  const source = project(SOURCE[0], SOURCE[1], time, fronts, 3);
  return {
    membrane: circle(0, 0, 213, time, fronts),
    rings: Array.from({ length: RINGS }, (_, i) =>
      circle(0, 0, 10 + i * 5.2, time, fronts),
    ),
    waves: fronts.map((radius) => ({
      d: circle(SOURCE[0], SOURCE[1], radius, time, fronts, 0.6),
      opacity: (Math.sin(Math.min(1, radius / 230) * Math.PI) * 0.82).toFixed(
        4,
      ),
    })),
    source: {
      x: f(source.x),
      y: f(source.y),
      radius: f(1.6 + Math.exp(-Math.pow(progress(time) / 0.2, 2)) * 1.5),
    },
    receivers: RECEIVERS.map(([x, y], receiver) => {
      const distance = Math.hypot(x - SOURCE[0], y - SOURCE[1]);
      const active = Math.min(
        1,
        fronts.reduce(
          (sum, radius) =>
            sum + Math.exp(-Math.pow((distance - radius) / 10, 2)),
          0,
        ),
      );
      const nearest = fronts.reduce((a, b) =>
        Math.abs(a - distance) < Math.abs(b - distance) ? a : b,
      );
      const after = nearest - distance;
      const ripple = Math.max(0, Math.min(1, after / 32));
      const p = project(x, y, time, fronts, 2.5);
      const diamond = [
        [-3, 0],
        [0, -4],
        [3, 0],
        [0, 4],
      ]
        .map(([dx, dy]) => `${f(p.x + dx)},${f(p.y + dy)}`)
        .join("L");
      return {
        d: `M${diamond}Z`,
        opacity: (0.25 + active * 0.75).toFixed(4),
        response: circle(x, y, 4 + ripple * 22, time, fronts, 1),
        responseOpacity: (after >= 0 && after <= 32
          ? Math.sin(ripple * Math.PI) * 0.8
          : 0
        ).toFixed(4),
        index: receiver,
      };
    }),
  };
}
const FIRST = frame(0);
type Nodes = {
  membrane: SVGPathElement[];
  rings: SVGPathElement[];
  waves: SVGPathElement[][];
  receivers: SVGPathElement[];
  responses: SVGPathElement[];
  source: SVGCircleElement | null;
  stops: SVGStopElement[];
};
const cache = new WeakMap<SVGSVGElement, Nodes>();
function update(svg: SVGSVGElement, time: number) {
  let nodes = cache.get(svg);
  if (!nodes) {
    nodes = {
      membrane: Array.from(
        svg.querySelectorAll<SVGPathElement>("[data-clarion-membrane]"),
      ),
      rings: Array.from(
        svg.querySelectorAll<SVGPathElement>("[data-clarion-ring]"),
      ),
      waves: Array.from(svg.querySelectorAll("[data-clarion-wave]")).map(
        (group) => Array.from(group.querySelectorAll<SVGPathElement>("path")),
      ),
      receivers: Array.from(
        svg.querySelectorAll<SVGPathElement>("[data-clarion-receiver]"),
      ),
      responses: Array.from(
        svg.querySelectorAll<SVGPathElement>("[data-clarion-response]"),
      ),
      source: svg.querySelector("[data-clarion-source]"),
      stops: Array.from(
        svg.querySelectorAll<SVGStopElement>("[data-clarion-spectrum] stop"),
      ),
    };
    cache.set(svg, nodes);
  }
  const pose = frame(time);
  nodes.membrane.forEach((node) => node.setAttribute("d", pose.membrane));
  pose.rings.forEach((d, i) => nodes.rings[i].setAttribute("d", d));
  pose.waves.forEach((wave, i) =>
    nodes.waves[i].forEach((node) => {
      node.setAttribute("d", wave.d);
      node.setAttribute("opacity", wave.opacity);
    }),
  );
  pose.receivers.forEach((receiver, i) => {
    nodes.receivers[i].setAttribute("d", receiver.d);
    nodes.receivers[i].setAttribute("opacity", receiver.opacity);
    nodes.responses[i].setAttribute("d", receiver.response);
    nodes.responses[i].setAttribute("opacity", receiver.responseOpacity);
  });
  nodes.source?.setAttribute("cx", pose.source.x);
  nodes.source?.setAttribute("cy", pose.source.y);
  nodes.source?.setAttribute("r", pose.source.radius);
  colors(time).forEach((color, i) =>
    nodes.stops[i].setAttribute("stop-color", color),
  );
}

/** An event excites a curved optical membrane. Wavefront arrival drives each receiver. */
export function ClarionStudy({ paused = false, className }: StudyProps) {
  const ref = useRef<SVGSVGElement>(null);
  const id = `clarion-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
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
        <linearGradient id={`${id}-film`} x1=".1" y1="0" x2=".8" y2="1">
          <stop stopColor="#a3bdcb" stopOpacity=".08" />
          <stop offset=".38" stopColor="#263e50" stopOpacity=".12" />
          <stop offset=".66" stopColor="#9bb6c3" stopOpacity=".09" />
          <stop offset="1" stopColor="#5e8197" stopOpacity=".055" />
        </linearGradient>
        <linearGradient
          id={`${id}-silver`}
          x1="160"
          y1="175"
          x2="477"
          y2="493"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#c8d6dc" stopOpacity=".22" />
          <stop offset=".4" stopColor="#8fa9bc" stopOpacity=".14" />
          <stop offset=".67" stopColor="#d5e0df" stopOpacity=".35" />
          <stop offset="1" stopColor="#829eb3" stopOpacity=".12" />
        </linearGradient>
        <linearGradient
          id={`${id}-spectrum`}
          data-clarion-spectrum=""
          x1="135"
          y1="450"
          x2="506"
          y2="160"
          gradientUnits="userSpaceOnUse"
        >
          {colors(0).map((color, i) => (
            <stop key={i} offset={(i / 4).toFixed(4)} stopColor={color} />
          ))}
        </linearGradient>
        <clipPath id={`${id}-clip`}>
          <path data-clarion-membrane="" d={FIRST.membrane} />
        </clipPath>
        <filter
          id={`${id}-glow`}
          x="-15%"
          y="-15%"
          width="130%"
          height="130%"
          colorInterpolationFilters="sRGB"
        >
          <feGaussianBlur stdDeviation="1.7" />
        </filter>
      </defs>
      <path
        data-clarion-membrane=""
        d={FIRST.membrane}
        fill={`url(#${id}-film)`}
        stroke={`url(#${id}-silver)`}
        strokeWidth=".65"
      />
      <g clipPath={`url(#${id}-clip)`}>
        {FIRST.rings.map((d, i) => (
          <path
            key={i}
            data-clarion-ring=""
            d={d}
            stroke={`url(#${id}-silver)`}
            strokeWidth=".58"
          />
        ))}
        {FIRST.waves.map((wave, i) => (
          <g key={i} data-clarion-wave="">
            <path
              d={wave.d}
              stroke={`url(#${id}-spectrum)`}
              strokeWidth="3"
              opacity={wave.opacity}
              filter={`url(#${id}-glow)`}
            />
            <path
              d={wave.d}
              stroke={`url(#${id}-spectrum)`}
              strokeWidth="1"
              opacity={wave.opacity}
            />
          </g>
        ))}
        {FIRST.receivers.map((receiver, i) => (
          <g key={i}>
            <path
              data-clarion-response=""
              d={receiver.response}
              stroke={`url(#${id}-spectrum)`}
              strokeWidth="1.1"
              opacity={receiver.responseOpacity}
            />
            <path
              data-clarion-receiver=""
              d={receiver.d}
              fill={`url(#${id}-spectrum)`}
              opacity={receiver.opacity}
            />
          </g>
        ))}
        <circle
          data-clarion-source=""
          cx={FIRST.source.x}
          cy={FIRST.source.y}
          r={FIRST.source.radius}
          fill="#d3e2e5"
        />
      </g>
    </svg>
  );
}
