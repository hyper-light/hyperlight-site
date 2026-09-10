"use client";

import { Fragment, useId, useRef } from "react";
import {
  useStudyMotion,
  type StudyProps,
} from "@/components/studies/use-study-motion";

type Point = { x: number; y: number };
type Tablet = {
  outline: string;
  bevel: string;
  inset: string;
  lines: string[];
  cross: string[];
  cut: string;
  shimmer: string;
};
const fmt = (value: number) => value.toFixed(2);
const line = (points: Point[], close = false) =>
  points
    .map(
      (point, index) => `${index ? "L" : "M"}${fmt(point.x)},${fmt(point.y)}`,
    )
    .join("") + (close ? "Z" : "");
const PROFILE = [
  [-166, -108],
  [-152, -122],
  [152, -122],
  [166, -108],
  [166, 108],
  [152, 122],
  [-152, 122],
  [-166, 108],
];

function point(
  layer: number,
  x: number,
  y: number,
  time: number,
  thickness = 0,
): Point {
  const lift = Math.sin(time * 0.65);
  const elevation = layer === 0 ? 65 - lift * 8 : -70 - lift * 21;
  const shift = layer === 0 ? -29 - lift * 5 : 26 + lift * 15;
  const turn = -0.41 + (layer === 0 ? -0.028 : 0.04) * Math.sin(time * 0.56);
  const tilt = 0.65 + Math.sin(time * 0.42 + layer * 0.3) * 0.09;
  const materialBend =
    Math.sin(x / 155 + time * 0.62) * (1 - Math.pow(y / 125, 2)) * 4;
  const py = y * Math.cos(tilt) - (thickness + materialBend) * Math.sin(tilt);
  const z = y * Math.sin(tilt) + (thickness + materialBend) * Math.cos(tilt);
  const perspective = 1000 / (1000 - z);
  return {
    x: 320 + shift + (x * Math.cos(turn) - py * Math.sin(turn)) * perspective,
    y:
      310 +
      elevation +
      (x * Math.sin(turn) + py * Math.cos(turn)) * perspective,
  };
}

function frame(time: number) {
  return [0, 1].map((layer): Tablet => {
    const perimeter = PROFILE.map(([x, y]) => point(layer, x, y, time));
    const bottom = PROFILE.map(([x, y]) => point(layer, x, y, time, -7));
    const cut = [
      [-171, -17],
      [-35, -17],
      [-35, 27],
      [171, 27],
    ].map(([x, y]) => point(layer, x, y, time));
    return {
      outline: line(perimeter, true),
      bevel: line(
        [...perimeter, perimeter[0], bottom[0], ...bottom.toReversed()],
        true,
      ),
      inset: line(
        PROFILE.map(([x, y]) => point(layer, x * 0.93, y * 0.91, time)),
        true,
      ),
      lines: Array.from({ length: 18 }, (_, row) =>
        line(
          Array.from({ length: 31 }, (_, sample) => {
            const x = -151 + (sample / 30) * 302;
            const y =
              -101 +
              (row / 17) * 202 +
              Math.sin((sample / 30) * Math.PI) *
                Math.sin(row * 0.45 + time * 0.6) *
                10;
            return point(layer, x, y, time);
          }),
        ),
      ),
      cross: Array.from({ length: 7 }, (_, column) =>
        line(
          Array.from({ length: 21 }, (_, sample) => {
            const y = -106 + (sample / 20) * 212;
            const x =
              -139 +
              (column / 6) * 278 +
              Math.sin((sample / 20) * Math.PI) *
                Math.sin(column * 0.4 + time * 0.7) *
                8;
            return point(layer, x, y, time);
          }),
        ),
      ),
      cut: line(cut),
      shimmer: line(
        Array.from({ length: 29 }, (_, sample) => {
          const x = -156 + (sample / 28) * 312;
          return point(
            layer,
            x,
            62 + Math.sin(x / 106 + time * 0.85) * 31,
            time,
          );
        }),
      ),
    };
  });
}

const FIRST = frame(0);
type Nodes = {
  surfaces: SVGPathElement[];
  edges: SVGPathElement[];
  bevels: SVGPathElement[];
  insets: SVGPathElement[];
  lines: SVGPathElement[];
  cross: SVGPathElement[];
  shimmers: SVGPathElement[];
  lights: SVGPathElement[];
  cut: SVGPathElement | null;
  dispersion: SVGLinearGradientElement | null;
};
const cache = new WeakMap<SVGSVGElement, Nodes>();

function update(svg: SVGSVGElement, time: number) {
  let nodes = cache.get(svg);
  if (!nodes) {
    const all = (key: string) =>
      Array.from(svg.querySelectorAll<SVGPathElement>(`[data-slate-${key}]`));
    nodes = {
      surfaces: all("surface"),
      edges: all("edge"),
      bevels: all("bevel"),
      insets: all("inset"),
      lines: all("line"),
      cross: all("cross"),
      shimmers: all("shimmer"),
      lights: all("light"),
      cut: svg.querySelector<SVGPathElement>("[data-slate-cut]"),
      dispersion: svg.querySelector<SVGLinearGradientElement>(
        "[data-slate-spectrum]",
      ),
    };
    cache.set(svg, nodes);
  }
  const pose = frame(time);
  pose.forEach((tablet, layer) => {
    nodes.surfaces[layer].setAttribute("d", tablet.outline);
    nodes.edges[layer].setAttribute("d", tablet.outline);
    nodes.bevels[layer].setAttribute("d", tablet.bevel);
    nodes.insets[layer].setAttribute("d", tablet.inset);
    nodes.shimmers[layer].setAttribute("d", tablet.shimmer);
    nodes.shimmers[layer].setAttribute(
      "stroke-dashoffset",
      fmt(-time * 132 + layer * 390),
    );
    nodes.lights[layer].setAttribute("d", tablet.outline);
    nodes.lights[layer].setAttribute(
      "stroke-dashoffset",
      fmt(-time * 92 + layer * 390),
    );
    tablet.lines.forEach((path, index) =>
      nodes.lines[layer * 18 + index].setAttribute("d", path),
    );
    tablet.cross.forEach((path, index) =>
      nodes.cross[layer * 7 + index].setAttribute("d", path),
    );
  });
  nodes.cut?.setAttribute("d", pose[1].cut);
  nodes.dispersion?.setAttribute(
    "gradientTransform",
    `translate(${fmt(Math.sin(time * 0.7) * 90)} 0)`,
  );
}

/** A working tablet lifts from its source; a stepped opening preserves its identity. */
export function SlatesStudy({ paused = false, className }: StudyProps) {
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
          id={`${id}-body`}
          x1="174"
          y1="132"
          x2="448"
          y2="467"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#1b2026" />
          <stop offset=".32" stopColor="#11171b" />
          <stop offset=".57" stopColor="#1c232b" />
          <stop offset=".73" stopColor="#333d46" />
          <stop offset=".8" stopColor="#1b2329" />
          <stop offset="1" stopColor="#111518" />
        </linearGradient>
        <linearGradient
          id={`${id}-edge`}
          x1="120"
          y1="134"
          x2="498"
          y2="452"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#dae0e5" stopOpacity=".8" />
          <stop offset=".27" stopColor="#9ca6b0" stopOpacity=".32" />
          <stop offset=".5" stopColor="#788791" stopOpacity=".43" />
          <stop offset=".73" stopColor="#d6e0e7" stopOpacity=".67" />
          <stop offset="1" stopColor="#57656f" stopOpacity=".3" />
        </linearGradient>
        <linearGradient
          id={`${id}-spectrum`}
          data-slate-spectrum=""
          x1="142"
          y1="150"
          x2="490"
          y2="434"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#c4d5b5" />
          <stop offset=".26" stopColor="#99c7cf" />
          <stop offset=".49" stopColor="#a6b3df" />
          <stop offset=".7" stopColor="#c2a6d1" />
          <stop offset="1" stopColor="#d9afa1" />
        </linearGradient>
        <radialGradient id={`${id}-ambient`}>
          <stop stopColor="#668491" stopOpacity=".12" />
          <stop offset="1" stopColor="#668491" stopOpacity="0" />
        </radialGradient>
        <mask
          id={`${id}-cut`}
          maskUnits="userSpaceOnUse"
          x="40"
          y="30"
          width="560"
          height="540"
        >
          <rect x="40" y="30" width="560" height="540" fill="white" />
          <path
            data-slate-cut=""
            d={FIRST[1].cut}
            stroke="black"
            strokeWidth="7.5"
            strokeLinejoin="miter"
          />
        </mask>
      </defs>
      <ellipse
        cx="320"
        cy="342"
        rx="248"
        ry="217"
        fill={`url(#${id}-ambient)`}
      />
      {FIRST.map((tablet, layer) => (
        <g key={layer} mask={layer === 1 ? `url(#${id}-cut)` : undefined}>
          <path
            data-slate-bevel=""
            d={tablet.bevel}
            fill={`url(#${id}-edge)`}
            opacity=".48"
          />
          <path
            data-slate-surface=""
            d={tablet.outline}
            fill={`url(#${id}-body)`}
          />
          {tablet.lines.map((path, index) => (
            <Fragment key={index}>
              <path
                data-slate-line=""
                d={path}
                stroke={`url(#${id}-edge)`}
                strokeWidth=".65"
                opacity={(
                  0.11 +
                  Math.sin((index / 17) * Math.PI) * 0.18
                ).toFixed(4)}
              />
            </Fragment>
          ))}
          {tablet.cross.map((path, index) => (
            <path
              key={index}
              data-slate-cross=""
              d={path}
              stroke="#adbbc7"
              strokeWidth=".55"
              opacity=".08"
            />
          ))}
          <path
            data-slate-inset=""
            d={tablet.inset}
            stroke={`url(#${id}-edge)`}
            strokeWidth=".55"
            opacity=".45"
          />
          <path
            data-slate-edge=""
            d={tablet.outline}
            stroke={`url(#${id}-edge)`}
            strokeWidth="1.15"
          />
          <path
            data-slate-shimmer=""
            d={tablet.shimmer}
            pathLength="1000"
            stroke={`url(#${id}-spectrum)`}
            strokeWidth=".8"
            strokeDasharray="95 905"
            strokeDashoffset={String(layer * 390)}
            opacity=".63"
          />
          <path
            data-slate-light=""
            d={tablet.outline}
            pathLength="1000"
            stroke={`url(#${id}-spectrum)`}
            strokeWidth="1.5"
            strokeDasharray="115 885"
            strokeDashoffset={String(layer * 390)}
            opacity=".89"
          />
        </g>
      ))}
    </svg>
  );
}
