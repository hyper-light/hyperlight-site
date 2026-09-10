"use client";

import { Fragment, useId, useRef } from "react";
import {
  useStudyMotion,
  type StudyProps,
} from "@/components/studies/use-study-motion";

type Point = { x: number; y: number };
type Lens = {
  contour: string;
  inner: string;
  rings: string[];
  rib: string;
  sparkle: string;
};
const COUNT = 5;
const RINGS = 11;
const SAMPLES = 73;
const fmt = (value: number) => value.toFixed(2);
const commands = (points: Point[], close = true) =>
  points
    .map(
      (point, index) => `${index ? "L" : "M"}${fmt(point.x)},${fmt(point.y)}`,
    )
    .join("") + (close ? "Z" : "");

function lensPoint(
  layer: number,
  radius: number,
  angle: number,
  time: number,
  thickness = 0,
): Point {
  const center = (layer - 2) * (32 + Math.sin(time * 0.66) * 11);
  const y = Math.cos(angle) * radius;
  const z = Math.sin(angle) * radius;
  const x = center + thickness;
  const lean = 0.83 + Math.sin(time * 0.5 + layer * 0.17) * 0.14;
  const px = x * Math.cos(lean) + z * Math.sin(lean);
  const depth = -x * Math.sin(lean) + z * Math.cos(lean);
  const scale = 960 / (960 - depth);
  const turn = -0.27 + Math.sin(time * 0.41) * 0.075;
  return {
    x: 321 + (px * Math.cos(turn) - y * Math.sin(turn)) * scale,
    y: 308 + (px * Math.sin(turn) + y * Math.cos(turn)) * scale,
  };
}

function circle(layer: number, radius: number, time: number, thickness = 0) {
  return Array.from({ length: SAMPLES }, (_, index) =>
    lensPoint(
      layer,
      radius,
      (index / (SAMPLES - 1)) * Math.PI * 2,
      time,
      thickness,
    ),
  );
}

function frame(time: number) {
  return Array.from({ length: COUNT }, (_, layer): Lens => {
    const radius = [153, 178, 193, 178, 153][layer];
    const outer = circle(layer, radius, time);
    const inner = circle(layer, radius - 7, time, 4);
    const back = circle(layer, radius, time, -7);
    return {
      contour: commands(outer),
      inner: commands(inner),
      rings: Array.from({ length: RINGS }, (_, ring) =>
        commands(
          circle(
            layer,
            31 + (ring * (radius - 44)) / (RINGS - 1),
            time,
            Math.sin((ring / RINGS) * Math.PI) * 6,
          ),
        ),
      ),
      rib: commands([...outer, ...back.toReversed()]),
      sparkle: commands(
        Array.from({ length: 23 }, (_, index) =>
          lensPoint(
            layer,
            radius - 2,
            (index / 22) * Math.PI * 0.85 + time * 0.7 + layer * 0.6,
            time,
          ),
        ),
        false,
      ),
    };
  });
}

function beams(time: number) {
  const sway = Math.sin(time * 0.7) * 13;
  return [-1, 0, 1].map((branch) => {
    const y = 308 + branch * (115 + sway);
    return `M74,${fmt(y)}C${fmt(177 + sway)},${fmt(y - branch * 11)} 195,${fmt(308 + branch * 24)} 322,308C386,308 465,308 567,308`;
  });
}

const FIRST = frame(0);
const FIRST_BEAMS = beams(0);
type Nodes = {
  surfaces: SVGPathElement[];
  outlines: SVGPathElement[];
  inner: SVGPathElement[];
  ribs: SVGPathElement[];
  rings: SVGPathElement[];
  sparks: SVGPathElement[];
  beams: SVGPathElement[];
};
const cache = new WeakMap<SVGSVGElement, Nodes>();

function update(svg: SVGSVGElement, time: number) {
  let nodes = cache.get(svg);
  if (!nodes) {
    const all = (key: string) =>
      Array.from(svg.querySelectorAll<SVGPathElement>(`[data-focal-${key}]`));
    nodes = {
      surfaces: all("surface"),
      outlines: all("outline"),
      inner: all("inner"),
      ribs: all("rib"),
      rings: all("ring"),
      sparks: all("spark"),
      beams: all("beam"),
    };
    cache.set(svg, nodes);
  }
  frame(time).forEach((lens, layer) => {
    nodes.surfaces[layer].setAttribute("d", lens.contour);
    nodes.outlines[layer].setAttribute("d", lens.contour);
    nodes.inner[layer].setAttribute("d", lens.inner);
    nodes.ribs[layer].setAttribute("d", lens.rib);
    nodes.sparks[layer].setAttribute("d", lens.sparkle);
    lens.rings.forEach((ring, index) =>
      nodes.rings[layer * RINGS + index].setAttribute("d", ring),
    );
  });
  const paths = beams(time);
  nodes.beams.forEach((beam, index) => {
    beam.setAttribute("d", paths[index % 3]);
    beam.setAttribute(
      "stroke-dashoffset",
      fmt(-time * 118 + (index % 3) * 170),
    );
  });
}

/** Five glass lenses change their spacing while three light paths find a focus. */
export function FocalStudy({ paused = false, className }: StudyProps) {
  const ref = useRef<SVGSVGElement>(null);
  const id = useId().replaceAll(":", "");
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
          x1="196"
          y1="111"
          x2="436"
          y2="502"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#62727e" stopOpacity=".11" />
          <stop offset=".28" stopColor="#1c242d" stopOpacity=".38" />
          <stop offset=".54" stopColor="#c4d5df" stopOpacity=".025" />
          <stop offset=".8" stopColor="#576779" stopOpacity=".13" />
          <stop offset="1" stopColor="#b0b9cf" stopOpacity=".1" />
        </linearGradient>
        <linearGradient
          id={`${id}-edge`}
          x1="148"
          y1="167"
          x2="477"
          y2="439"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#c6d6df" stopOpacity=".65" />
          <stop offset=".28" stopColor="#77818d" stopOpacity=".22" />
          <stop offset=".51" stopColor="#c3c0cc" stopOpacity=".55" />
          <stop offset=".73" stopColor="#7f8796" stopOpacity=".2" />
          <stop offset="1" stopColor="#e0dfeb" stopOpacity=".64" />
        </linearGradient>
        <linearGradient
          id={`${id}-spectral`}
          x1="155"
          y1="110"
          x2="480"
          y2="498"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#d1d8b1" />
          <stop offset=".25" stopColor="#a3cbd0" />
          <stop offset=".5" stopColor="#a3afe0" />
          <stop offset=".74" stopColor="#c3a3cc" />
          <stop offset="1" stopColor="#d8ae9c" />
        </linearGradient>
        <radialGradient id={`${id}-ambient`}>
          <stop stopColor="#8597b3" stopOpacity=".095" />
          <stop offset="1" stopColor="#8597b3" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}-focus`}>
          <stop stopColor="#ddebf3" stopOpacity=".45" />
          <stop offset=".14" stopColor="#acbadb" stopOpacity=".18" />
          <stop offset="1" stopColor="#ad9bce" stopOpacity="0" />
        </radialGradient>
        <filter id={`${id}-blur`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2.5" />
        </filter>
      </defs>
      <ellipse
        cx="320"
        cy="310"
        rx="240"
        ry="253"
        fill={`url(#${id}-ambient)`}
      />
      {FIRST_BEAMS.map((beam, index) => (
        <path
          key={index}
          data-focal-beam=""
          d={beam}
          pathLength="1000"
          stroke={index === 0 ? "#a4c6d1" : index === 1 ? "#bfaddb" : "#d3b4b7"}
          strokeWidth="1"
          strokeDasharray="60 130 10 800"
          strokeDashoffset={String(index * 170)}
          opacity=".75"
        />
      ))}
      {FIRST.map((lens, layer) => (
        <Fragment key={layer}>
          <path
            data-focal-surface=""
            d={lens.contour}
            fill={`url(#${id}-glass)`}
          />
          <path data-focal-rib="" d={lens.rib} fill="#889cab" opacity=".1" />
          {lens.rings.map((ring, index) => (
            <path
              key={index}
              data-focal-ring=""
              d={ring}
              stroke={`url(#${id}-edge)`}
              strokeWidth=".65"
              opacity={(0.09 + (index / RINGS) * 0.18).toFixed(4)}
            />
          ))}
          <path
            data-focal-inner=""
            d={lens.inner}
            stroke={`url(#${id}-edge)`}
            strokeWidth=".55"
            opacity=".4"
          />
          <path
            data-focal-outline=""
            d={lens.contour}
            stroke={`url(#${id}-edge)`}
            strokeWidth={layer === 2 ? "1.25" : ".9"}
          />
          <path
            data-focal-spark=""
            d={lens.sparkle}
            stroke={`url(#${id}-spectral)`}
            strokeWidth="1.55"
            strokeLinecap="round"
            opacity={layer % 2 === 0 ? ".7" : ".32"}
          />
        </Fragment>
      ))}
      {FIRST_BEAMS.map((beam, index) => (
        <path
          key={index}
          data-focal-beam=""
          d={beam}
          pathLength="1000"
          stroke={`url(#${id}-spectral)`}
          strokeWidth="3.5"
          strokeDasharray="35 965"
          strokeDashoffset={String(index * 170)}
          opacity=".35"
          filter={`url(#${id}-blur)`}
        />
      ))}
      <circle cx="322" cy="308" r="38" fill={`url(#${id}-focus)`} />
      <path d="M322 308H566" stroke="#d4dfe9" strokeWidth=".5" opacity=".43" />
      <circle cx="322" cy="308" r="2" fill="#e0e7ef" opacity=".88" />
    </svg>
  );
}
