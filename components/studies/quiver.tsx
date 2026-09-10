"use client";

import { useId, useRef } from "react";
import {
  useStudyMotion,
  type StudyProps,
} from "@/components/studies/use-study-motion";

type Point = { x: number; y: number; z: number };
type Lance = {
  surfaces: string[];
  edge: string;
  core: string;
  light: string;
  interior: string;
  contours: string;
  depth: number;
  gradient: string[];
  beam: string[];
  brightness: string[];
};
const LANES = 7;
const SAMPLES = 18;
const CROSS = [-1, -0.945, -0.62, 0, 0.66, 0.95, 1];
const PALETTE = [
  [154, 195, 183],
  [148, 181, 213],
  [171, 160, 201],
  [202, 163, 181],
  [212, 190, 153],
  [193, 207, 189],
];
const f = (value: number) => value.toFixed(2);
const coordinate = (point: Point) => f(point.x) + "," + f(point.y);
const path = (points: Point[], close = false) =>
  "M" + points.map(coordinate).join("L") + (close ? "Z" : "");
function project(x: number, y: number, z: number, time: number): Point {
  const yaw = -0.25 + Math.sin(time * 0.23) * 0.035;
  const tilt = -0.28 + Math.sin(time * 0.19) * 0.025;
  const px = x * Math.cos(yaw) + z * Math.sin(yaw);
  const depth = z * Math.cos(yaw) - x * Math.sin(yaw);
  return {
    x: 325 + px * Math.cos(tilt) - y * Math.sin(tilt),
    y: 315 + px * Math.sin(tilt) + y * Math.cos(tilt),
    z: depth,
  };
}

/** A narrow convex optical volume, never a folded or notched wing. */
function lance(
  x: number,
  y: number,
  z: number,
  length: number,
  radius: number,
  heading: number,
  phase: number,
  station: number,
  time: number,
): Lance {
  const roll = 0.24 + Math.sin(time * 0.43 + phase * 0.2) * 0.12;
  const bend = Math.sin(time * 0.58 - phase * 0.2) * 2.2;
  const point = (u: number, across: number, inside = 1): Point => {
    // The widest section sits aft of center, with an uninterrupted long, sharp tip.
    const profile =
      u < 0.2
        ? Math.sin((u / 0.2) * Math.PI * 0.5)
        : Math.pow((1 - u) / 0.8, 1.08);
    const width = radius * profile;
    const along = (u - 0.48) * length;
    const side = across * width;
    const crown =
      Math.sqrt(Math.max(0, 1 - across * across)) * width * 0.43 * inside;
    const py = side * Math.cos(roll) - crown * Math.sin(roll);
    const pz = side * Math.sin(roll) + crown * Math.cos(roll);
    return project(
      x + along * Math.cos(heading) - py * Math.sin(heading),
      y +
        along * Math.sin(heading) +
        py * Math.cos(heading) +
        Math.sin(u * Math.PI) * bend,
      z + pz,
      time,
    );
  };
  const rows = CROSS.map((across) =>
    Array.from({ length: SAMPLES + 1 }, (_, sample) =>
      point(sample / SAMPLES, across),
    ),
  );
  const surfaces = CROSS.slice(1).map((_, index) =>
    path([...rows[index], ...rows[index + 1].toReversed()], true),
  );
  const reflection = -0.06 + Math.sin(time * 0.63 - station * 0.55) * 0.27;
  const left = point(0.24, reflection - 1.0);
  const right = point(0.24, reflection + 1.0);
  const tail = point(0, 0);
  const tip = point(1, 0);
  const contours = [-0.43, 0.39]
    .map((across) =>
      path(
        Array.from({ length: 15 }, (_, index) =>
          point(0.12 + (index / 14) * 0.79, across),
        ),
      ),
    )
    .join("");
  return {
    surfaces,
    edge: path(rows[0]),
    core: path(rows[3]),
    contours,
    interior:
      path(rows[CROSS.length - 1]) +
      [-0.2, 0.18]
        .map((across) =>
          path(
            Array.from({ length: SAMPLES + 1 }, (_, sample) =>
              point(sample / SAMPLES, across, -0.65),
            ),
          ),
        )
        .join(""),
    light: path(rows[1]),
    depth: project(x, y, z, time).z,
    gradient: [f(left.x), f(left.y), f(right.x), f(right.y)],
    beam: [f(tail.x), f(tail.y), f(tip.x), f(tip.y)],
    brightness: Array.from({ length: 11 }, (_, index) => {
      const phase = time * 1.65 - (station + (index / 10) * 1.15) * 2.8;
      return (0.035 + 0.965 * Math.pow((Math.cos(phase) + 1) / 2, 14)).toFixed(
        4,
      );
    }),
  };
}

function frame(time: number) {
  const fleet: Lance[] = [];
  const breath = Math.sin(time * 0.58);
  for (let lane = 0; lane < LANES; lane++) {
    const branch = lane - 3;
    fleet.push(
      lance(
        67 - Math.abs(branch) * 8 + breath * 3,
        branch * (48 + breath * 1.1),
        24 * Math.cos(branch * 0.48),
        132,
        12.5,
        branch * 0.16,
        branch * 0.36,
        Math.abs(branch) * 0.075,
        time,
      ),
    );
  }
  const ingress = lance(
    -142 + breath * 3,
    0,
    18,
    157,
    15,
    0,
    0.31,
    -1.42,
    time,
  );
  const colors = PALETTE.map((_, index) => {
    const position = (index + time * 0.42) % PALETTE.length;
    const stop = Math.floor(position);
    const mix = position - stop;
    const a = PALETTE[stop];
    const b = PALETTE[(stop + 1) % PALETTE.length];
    return (
      "rgb(" +
      a
        .map((channel, c) => Math.round(channel + (b[c] - channel) * mix))
        .join(",") +
      ")"
    );
  });
  return { lances: [...fleet, ingress], colors };
}

const FIRST = frame(0);
type Nodes = {
  surfaces: SVGPathElement[];
  edges: SVGPathElement[];
  cores: SVGPathElement[];
  contours: SVGPathElement[];
  lights: SVGPathElement[];
  interiors: SVGPathElement[];
  glows: SVGPathElement[];
  gradients: SVGLinearGradientElement[];
  beams: SVGLinearGradientElement[];
  beamStops: SVGStopElement[][];
  stops: SVGStopElement[];
};
const cache = new WeakMap<SVGSVGElement, Nodes>();

function update(svg: SVGSVGElement, time: number) {
  let nodes = cache.get(svg);
  if (!nodes) {
    const paths = (name: string) =>
      Array.from(
        svg.querySelectorAll<SVGPathElement>("[data-quiver-" + name + "]"),
      );
    nodes = {
      surfaces: paths("surface"),
      edges: paths("edge"),
      cores: paths("core"),
      contours: paths("contour"),
      lights: paths("light"),
      interiors: paths("interior"),
      glows: paths("glow"),
      gradients: Array.from(svg.querySelectorAll("[data-quiver-metal]")),
      beams: Array.from(svg.querySelectorAll("[data-quiver-beam]")),
      beamStops: Array.from(svg.querySelectorAll("[data-quiver-beam]")).map(
        (gradient) => Array.from(gradient.querySelectorAll("stop")),
      ),
      stops: Array.from(svg.querySelectorAll("[data-quiver-spectrum] stop")),
    };
    cache.set(svg, nodes);
  }
  const pose = frame(time);
  pose.lances.forEach((item, slot) => {
    item.surfaces.forEach((d, strip) =>
      nodes.surfaces[slot * (CROSS.length - 1) + strip].setAttribute("d", d),
    );
    nodes.edges[slot].setAttribute("d", item.edge);
    nodes.cores[slot].setAttribute("d", item.core);
    nodes.contours[slot].setAttribute("d", item.contours);
    nodes.lights[slot].setAttribute("d", item.light);
    nodes.interiors[slot].setAttribute("d", item.interior);
    nodes.glows[slot].setAttribute("d", item.light);
    ["x1", "y1", "x2", "y2"].forEach((attribute, index) =>
      nodes.gradients[slot].setAttribute(attribute, item.gradient[index]),
    );
    ["x1", "y1", "x2", "y2"].forEach((attribute, index) =>
      nodes.beams[slot].setAttribute(attribute, item.beam[index]),
    );
    item.brightness.forEach((value, index) =>
      nodes.beamStops[slot][index].setAttribute("stop-opacity", value),
    );
  });
  pose.colors.forEach((color, index) =>
    nodes.stops[index].setAttribute("stop-color", color),
  );
}

/** One persistent ingress and seven equal persistent vectors share an orthographic field.
 * Dispatch propagates as continuous illumination; no form spawns, scales, fades, or resets.
 */
export function QuiverStudy({ paused = false, className }: StudyProps) {
  const ref = useRef<SVGSVGElement>(null);
  const id = "quiver-" + useId().replace(/[^a-zA-Z0-9_-]/g, "");
  useStudyMotion({ ref, paused, update, fps: 60 });
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
        <filter
          id={id + "-soft"}
          x="-20%"
          y="-100%"
          width="140%"
          height="300%"
          colorInterpolationFilters="sRGB"
        >
          <feGaussianBlur stdDeviation=".8" />
        </filter>
        {FIRST.lances.map((item, slot) => (
          <linearGradient
            key={slot}
            id={id + "-beam-" + slot}
            data-quiver-beam=""
            gradientUnits="userSpaceOnUse"
            x1={item.beam[0]}
            y1={item.beam[1]}
            x2={item.beam[2]}
            y2={item.beam[3]}
          >
            {item.brightness.map((value, index) => (
              <stop
                key={index}
                offset={(index / 10).toFixed(4)}
                stopColor="#deddd6"
                stopOpacity={value}
              />
            ))}
          </linearGradient>
        ))}
        {FIRST.lances.map((item, slot) => (
          <linearGradient
            key={slot}
            id={id + "-metal-" + slot}
            data-quiver-metal=""
            gradientUnits="userSpaceOnUse"
            x1={item.gradient[0]}
            y1={item.gradient[1]}
            x2={item.gradient[2]}
            y2={item.gradient[3]}
          >
            <stop stopColor="#b4d3dc" stopOpacity=".065" />
            <stop offset=".17" stopColor="#b3c6d3" stopOpacity=".085" />
            <stop offset=".34" stopColor="#c3d4df" stopOpacity=".11" />
            <stop offset=".393" stopColor="#e5edee" stopOpacity=".26" />
            <stop offset=".416" stopColor="#e5edee" stopOpacity=".3" />
            <stop offset=".455" stopColor="#a2b9ce" stopOpacity=".085" />
            <stop offset=".62" stopColor="#b1c3d2" stopOpacity=".075" />
            <stop offset=".9" stopColor="#bcd4de" stopOpacity=".06" />
            <stop offset="1" stopColor="#d8deda" stopOpacity=".12" />
          </linearGradient>
        ))}
        <linearGradient
          id={id + "-spectrum"}
          data-quiver-spectrum=""
          x1="95"
          y1="420"
          x2="550"
          y2="190"
          gradientUnits="userSpaceOnUse"
        >
          {FIRST.colors.map((color, index) => (
            <stop
              key={index}
              offset={(index / 5).toFixed(4)}
              stopColor={color}
            />
          ))}
        </linearGradient>
        <linearGradient id={id + "-contour"} x1="0" y1="0" x2="1" y2="0">
          <stop stopColor="#b2c4cf" stopOpacity="0" />
          <stop offset=".22" stopColor="#c3ced5" stopOpacity=".5" />
          <stop offset=".68" stopColor="#b9c5cc" stopOpacity=".18" />
          <stop offset="1" stopColor="#e7e6df" stopOpacity=".8" />
        </linearGradient>
      </defs>
      {FIRST.lances.map((item, slot) => (
        <g key={slot} data-quiver-lance="">
          <path
            data-quiver-interior=""
            d={item.interior}
            stroke={"url(#" + id + "-contour)"}
            strokeWidth=".62"
            strokeOpacity=".35"
          />
          {item.surfaces.map((d, strip) => (
            <path
              key={strip}
              data-quiver-surface=""
              d={d}
              fill={
                strip === 0
                  ? "url(#" + id + "-spectrum)"
                  : "url(#" + id + "-metal-" + slot + ")"
              }
              fillOpacity={strip === 0 ? ".34" : ".9"}
              stroke={
                strip === 0 ? "none" : "url(#" + id + "-metal-" + slot + ")"
              }
              strokeWidth=".24"
              strokeLinejoin="round"
            />
          ))}
          <path
            data-quiver-contour=""
            d={item.contours}
            stroke="#d3dce0"
            strokeWidth=".43"
            strokeOpacity=".11"
          />
          <path
            data-quiver-core=""
            d={item.core}
            stroke={"url(#" + id + "-contour)"}
            strokeWidth=".55"
            strokeOpacity=".37"
          />
          <path
            data-quiver-edge=""
            d={item.edge}
            stroke={"url(#" + id + "-spectrum)"}
            strokeWidth=".66"
            strokeOpacity=".69"
          />
          <path
            data-quiver-glow=""
            d={item.light}
            stroke={"url(#" + id + "-beam-" + slot + ")"}
            strokeWidth="2.6"
            strokeOpacity=".26"
            filter={"url(#" + id + "-soft)"}
          />
          <path
            data-quiver-light=""
            d={item.light}
            stroke={"url(#" + id + "-beam-" + slot + ")"}
            strokeWidth={slot === FIRST.lances.length - 1 ? "1.25" : ".95"}
            strokeLinecap="round"
          />
        </g>
      ))}
    </svg>
  );
}
