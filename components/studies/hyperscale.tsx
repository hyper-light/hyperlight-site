"use client";

import { Fragment, useId, useRef } from "react";
import {
  useStudyMotion,
  type StudyProps,
} from "@/components/studies/use-study-motion";

type Point = { x: number; y: number; z: number };
type Skin = {
  d: string;
  edge: string;
  shell: number;
  spectral: boolean;
  depth: number;
};
type Metal = {
  x1: string;
  y1: string;
  x2: string;
  y2: string;
  colors: string[];
};
type Pose = {
  skins: Skin[];
  seams: string[];
  spectrum: string[];
  metals: Metal[];
};
const TAU = Math.PI * 2;
const SHELLS = 7;
const SAMPLES = 48;
const WIDTHS = [
  -1, -0.985, -0.955, -0.9, -0.75, -0.5, -0.25, 0, 0.25, 0.5, 0.75, 0.9, 0.955,
  0.985, 1,
];
const PALETTE = [
  [155, 195, 186],
  [131, 175, 211],
  [164, 145, 196],
  [194, 147, 165],
  [213, 186, 144],
  [204, 217, 196],
];
const fmt = (value: number) => value.toFixed(2);
const coordinate = (p: Point) => `${fmt(p.x)},${fmt(p.y)}`;

function point(
  shell: number,
  across: number,
  progress: number,
  time: number,
): Point {
  const u = progress * 2 - 1;
  const breath = Math.sin(time * 0.69);
  const theta =
    (shell / SHELLS) * TAU +
    across * 0.39 +
    0.26 * Math.sin(u * 1.9 - time * 0.43) +
    u * 0.12;
  const waist = 31 + breath * 7;
  const mouth = u < 0 ? 117 : 141 + Math.sin(shell * 1.8 + 0.5) * 14;
  const radius =
    waist +
    mouth * Math.pow(Math.abs(u), 1.85) +
    Math.sin(u * 3.3 - time * 0.75 + shell * 0.38) * (1 - u * u) * 5;
  const exit = Math.max(0, u) ** 3;
  const x =
    u * 195 +
    exit * (Math.sin(shell * 1.63) * 32) +
    Math.sin(time * 0.42) * (1 - u * u) * 9;
  const y =
    radius * Math.cos(theta) + Math.sin(time * 0.6 + shell * 0.7) * exit * 7;
  const z = radius * Math.sin(theta);
  const yaw = 0.57 + Math.sin(time * 0.43) * 0.15;
  const turn = -0.3 + Math.sin(time * 0.38) * 0.055;
  const px = x * Math.cos(yaw) + z * Math.sin(yaw);
  const depth = -x * Math.sin(yaw) + z * Math.cos(yaw);
  const perspective = 1100 / (1100 - depth);
  return {
    x: 320 + (px * Math.cos(turn) - y * Math.sin(turn)) * perspective,
    y: 310 + (px * Math.sin(turn) + y * Math.cos(turn)) * perspective,
    z: depth,
  };
}

function spectrum(time: number) {
  return PALETTE.map((_, index) => {
    const position = (index + time * 0.57) % PALETTE.length;
    const stop = Math.floor(position);
    const mix = position - stop;
    const a = PALETTE[stop];
    const b = PALETTE[(stop + 1) % PALETTE.length];
    return `rgb(${a.map((channel, c) => Math.round(channel + (b[c] - channel) * mix)).join(",")})`;
  });
}

function frame(time: number): Pose {
  const skins: Skin[] = [];
  const seams: string[] = [];
  const metals: Metal[] = [];
  for (let shell = 0; shell < SHELLS; shell++) {
    const rows = WIDTHS.map((across) =>
      Array.from({ length: SAMPLES + 1 }, (_, sample) =>
        point(shell, across, sample / SAMPLES, time),
      ),
    );
    const leftLight = point(shell, -1.2, 0.88, time);
    const rightLight = point(shell, 1.2, 0.88, time);
    const light = Math.pow(
      (Math.cos((shell / SHELLS) * TAU - 0.8 + Math.sin(time * 0.53) * 0.65) +
        1) /
        2,
      3,
    );
    metals.push({
      x1: fmt(leftLight.x),
      y1: fmt(leftLight.y),
      x2: fmt(rightLight.x),
      y2: fmt(rightLight.y),
      colors: [0.08, 0.17, 0.43, 0.81, 0.48, 0.15, 0.035].map((reflection) => {
        const grey = Math.round(10 + reflection * (28 + light * 104));
        return `rgb(${grey},${grey + 3},${grey + 5})`;
      }),
    });
    for (let column = 0; column < WIDTHS.length - 1; column++) {
      for (let half = 0; half < 2; half++) {
        const start = (half * SAMPLES) / 2;
        const end = start + SAMPLES / 2;
        const left = rows[column].slice(start, end + 1);
        const right = rows[column + 1].slice(start, end + 1);
        const leading = left.map(coordinate).join("L");
        const trailing = right.toReversed().map(coordinate).join("L");
        skins.push({
          d: `M${leading}L${trailing}Z`,
          edge:
            column === 0 || column === 6 || column === 13 ? `M${leading}` : "",
          shell,
          spectral: column === 0 || column === 13,
          depth: left.reduce((sum, p) => sum + p.z, 0) / left.length,
        });
      }
    }
    seams.push(`M${rows[0].map(coordinate).join("L")}`);
  }
  return {
    skins: skins.sort((a, b) => a.depth - b.depth),
    seams,
    spectrum: spectrum(time),
    metals,
  };
}

const FIRST = frame(0);
type Elements = {
  bodies: SVGPathElement[];
  contours: SVGPathElement[];
  light: SVGPathElement[];
  glow: SVGPathElement[];
  stops: SVGStopElement[];
  metals: SVGLinearGradientElement[];
  metalStops: SVGStopElement[][];
  tint: string;
};
const elements = new WeakMap<SVGSVGElement, Elements>();
function update(svg: SVGSVGElement, time: number) {
  let nodes = elements.get(svg);
  if (!nodes) {
    nodes = {
      bodies: Array.from(
        svg.querySelectorAll<SVGPathElement>("[data-scale-body]"),
      ),
      contours: Array.from(
        svg.querySelectorAll<SVGPathElement>("[data-scale-contour]"),
      ),
      light: Array.from(
        svg.querySelectorAll<SVGPathElement>("[data-scale-signal]"),
      ),
      glow: Array.from(
        svg.querySelectorAll<SVGPathElement>("[data-scale-glow]"),
      ),
      stops: Array.from(
        svg.querySelectorAll<SVGStopElement>("[data-scale-spectrum] stop"),
      ),
      metals: Array.from(
        svg.querySelectorAll<SVGLinearGradientElement>("[data-scale-metal]"),
      ),
      metalStops: Array.from(
        svg.querySelectorAll<SVGLinearGradientElement>("[data-scale-metal]"),
      ).map((metal) => Array.from(metal.querySelectorAll("stop"))),
      tint: `url(#${svg.querySelector("[data-scale-spectrum]")!.id})`,
    };
    elements.set(svg, nodes);
  }
  const pose = frame(time);
  pose.skins.forEach((skin, slot) => {
    nodes.bodies[slot].setAttribute("d", skin.d);
    const fill = skin.spectral
      ? nodes.tint
      : `url(#${nodes.metals[skin.shell].id})`;
    nodes.bodies[slot].setAttribute("fill", fill);
    nodes.bodies[slot].setAttribute("stroke", fill);
    nodes.contours[slot].setAttribute("d", skin.edge);
  });
  pose.seams.forEach((path, shell) => {
    const offset = fmt(-time * (73 + shell * 7.7) + shell * 137);
    nodes.light[shell].setAttribute("d", path);
    nodes.light[shell].setAttribute("stroke-dashoffset", offset);
    nodes.glow[shell].setAttribute("d", path);
    nodes.glow[shell].setAttribute("stroke-dashoffset", offset);
  });
  pose.spectrum.forEach((color, index) =>
    nodes.stops[index].setAttribute("stop-color", color),
  );
  pose.metals.forEach((metal, shell) => {
    nodes.metals[shell].setAttribute("x1", metal.x1);
    nodes.metals[shell].setAttribute("y1", metal.y1);
    nodes.metals[shell].setAttribute("x2", metal.x2);
    nodes.metals[shell].setAttribute("y2", metal.y2);
    metal.colors.forEach((color, index) =>
      nodes.metalStops[shell][index].setAttribute("stop-color", color),
    );
  });
}

/** Concurrent workflows gather, pass through a loaded system, and return at different rates.
 * Seven open laminar shells make that flow physical; the timing is illustrative.
 */
export function HyperscaleStudy({ paused = false, className }: StudyProps) {
  const ref = useRef<SVGSVGElement>(null);
  const id = `scale-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
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
        {FIRST.metals.map((metal, shell) => (
          <linearGradient
            key={shell}
            id={`${id}-metal-${shell}`}
            data-scale-metal=""
            x1={metal.x1}
            y1={metal.y1}
            x2={metal.x2}
            y2={metal.y2}
            gradientUnits="userSpaceOnUse"
          >
            {metal.colors.map((color, index) => (
              <stop
                key={index}
                offset={[0, 0.18, 0.36, 0.47, 0.57, 0.76, 1][index].toFixed(4)}
                stopColor={color}
              />
            ))}
          </linearGradient>
        ))}
        <linearGradient
          id={`${id}-spectrum`}
          data-scale-spectrum=""
          x1="110"
          y1="450"
          x2="540"
          y2="185"
          gradientUnits="userSpaceOnUse"
        >
          {FIRST.spectrum.map((color, index) => (
            <stop
              key={index}
              offset={(index / (FIRST.spectrum.length - 1)).toFixed(4)}
              stopColor={color}
            />
          ))}
        </linearGradient>
        <linearGradient
          id={`${id}-silver`}
          x1="125"
          y1="120"
          x2="470"
          y2="490"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#e1e5df" stopOpacity=".64" />
          <stop offset=".36" stopColor="#8c9baa" stopOpacity=".2" />
          <stop offset=".65" stopColor="#d7d9dc" stopOpacity=".47" />
          <stop offset="1" stopColor="#f0dfcd" stopOpacity=".22" />
        </linearGradient>
        <radialGradient id={`${id}-ambient`}>
          <stop stopColor="#57758b" stopOpacity=".065" />
          <stop offset="1" stopColor="#162028" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}-shadow`}>
          <stop stopColor="#94afb7" stopOpacity=".055" />
          <stop offset="1" stopColor="#94afb7" stopOpacity="0" />
        </radialGradient>
        <filter
          id={`${id}-glow`}
          x="-15%"
          y="-15%"
          width="130%"
          height="130%"
          colorInterpolationFilters="sRGB"
        >
          <feGaussianBlur stdDeviation="2.2" />
        </filter>
      </defs>
      <ellipse
        cx="325"
        cy="320"
        rx="267"
        ry="205"
        fill={`url(#${id}-ambient)`}
      />
      <ellipse cx="326" cy="541" rx="176" ry="20" fill={`url(#${id}-shadow)`} />
      {FIRST.skins.map((skin, slot) => (
        <Fragment key={slot}>
          <path
            data-scale-body=""
            d={skin.d}
            fill={
              skin.spectral
                ? `url(#${id}-spectrum)`
                : `url(#${id}-metal-${skin.shell})`
            }
            stroke={
              skin.spectral
                ? `url(#${id}-spectrum)`
                : `url(#${id}-metal-${skin.shell})`
            }
            strokeWidth=".36"
            strokeLinejoin="round"
          />
          <path
            data-scale-contour=""
            d={skin.edge}
            stroke={`url(#${id}-silver)`}
            strokeWidth=".65"
            opacity=".56"
          />
        </Fragment>
      ))}
      {FIRST.seams.map((path, shell) => (
        <Fragment key={shell}>
          <path
            data-scale-glow=""
            d={path}
            pathLength="1000"
            stroke={`url(#${id}-spectrum)`}
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeDasharray="54 946"
            strokeDashoffset={(shell * 137).toFixed(2)}
            opacity=".4"
            filter={`url(#${id}-glow)`}
          />
          <path
            data-scale-signal=""
            d={path}
            pathLength="1000"
            stroke={`url(#${id}-spectrum)`}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeDasharray="54 946"
            strokeDashoffset={(shell * 137).toFixed(2)}
            opacity=".93"
          />
        </Fragment>
      ))}
    </svg>
  );
}
