"use client";

import { Fragment, useId, useRef } from "react";
import {
  useStudyMotion,
  type StudyProps,
} from "@/components/studies/use-study-motion";

type Point = { x: number; y: number; z: number };
type Trace = {
  body: string;
  edge: string;
  shade: string;
  opacity: string;
  depth: number;
};
const LANES = 15;
const SAMPLES = 35;
const fmt = (value: number) => value.toFixed(2);

function point(
  branch: number,
  lane: number,
  progress: number,
  time: number,
): Point {
  const q = (lane / LANES) * 2 - 1;
  const bend = Math.sin(progress * Math.PI);
  const open = progress * progress * (3 - 2 * progress);
  const spread = (branch - 1) * (158 + Math.sin(time * 0.55) * 19);
  const width = 10 + bend * 24;
  const torsion = progress * 3.5 + time * 0.48 + branch * 0.55;
  const x =
    -223 +
    progress * 449 +
    Math.sin(progress * Math.PI * 2 + time * 0.48) * bend * 13;
  const y =
    spread * open +
    Math.sin(progress * Math.PI * 2 + branch * 0.9 + time * 0.62) * bend * 32 +
    q * width * Math.cos(torsion);
  const z =
    Math.sin(progress * Math.PI + branch * 1.2) * 69 +
    q * width * Math.sin(torsion);
  const angle = -0.22 + Math.sin(time * 0.46) * 0.19;
  const px = x * Math.cos(angle) + z * Math.sin(angle);
  const depth = -x * Math.sin(angle) + z * Math.cos(angle);
  const perspective = 980 / (980 - depth);
  return {
    x: 320 + (px * 0.978 - y * 0.208) * perspective,
    y: 309 + (px * 0.208 + y * 0.978) * perspective,
    z: depth,
  };
}

function line(points: Point[], close = false) {
  return (
    points
      .map((p, index) => `${index ? "L" : "M"}${fmt(p.x)},${fmt(p.y)}`)
      .join("") + (close ? "Z" : "")
  );
}

function frame(time: number) {
  const strips: Trace[] = [];
  const edges: string[] = [];
  const tips: Point[] = [];
  for (let branch = 0; branch < 3; branch++) {
    const rows = Array.from({ length: LANES + 1 }, (_, lane) =>
      Array.from({ length: SAMPLES }, (_, sample) =>
        point(branch, lane, sample / (SAMPLES - 1), time),
      ),
    );
    for (let lane = 0; lane < LANES; lane++) {
      const glint = Math.pow(
        Math.max(
          0,
          Math.cos((lane / LANES) * Math.PI * 2 + branch * 0.8 + time * 0.55),
        ),
        6,
      );
      const grey = Math.round(15 + glint * 49 + (lane / LANES) * 8);
      strips.push({
        body: line([...rows[lane], ...rows[lane + 1].toReversed()], true),
        edge: line(rows[lane]),
        shade: `rgb(${grey},${grey + 3},${grey + 6})`,
        opacity: (0.12 + glint * 0.37).toFixed(4),
        depth: rows[lane][17].z,
      });
    }
    edges.push(line(rows[0]), line(rows[LANES]), line(rows[7]));
    tips.push(point(branch, 7.5, 1, time));
  }
  return { strips: strips.sort((a, b) => a.depth - b.depth), edges, tips };
}

const FIRST = frame(0);
type Elements = {
  bodies: SVGPathElement[];
  contours: SVGPathElement[];
  edges: SVGPathElement[];
  glows: SVGPathElement[];
  tips: SVGCircleElement[];
  dispersion: SVGLinearGradientElement | null;
};
const elements = new WeakMap<SVGSVGElement, Elements>();

function update(svg: SVGSVGElement, time: number) {
  let nodes = elements.get(svg);
  if (!nodes) {
    nodes = {
      bodies: Array.from(
        svg.querySelectorAll<SVGPathElement>("[data-trace-body]"),
      ),
      contours: Array.from(
        svg.querySelectorAll<SVGPathElement>("[data-trace-contour]"),
      ),
      edges: Array.from(
        svg.querySelectorAll<SVGPathElement>("[data-trace-edge]"),
      ),
      glows: Array.from(
        svg.querySelectorAll<SVGPathElement>("[data-trace-glow]"),
      ),
      tips: Array.from(
        svg.querySelectorAll<SVGCircleElement>("[data-trace-tip]"),
      ),
      dispersion: svg.querySelector<SVGLinearGradientElement>(
        "[data-trace-spectrum]",
      ),
    };
    elements.set(svg, nodes);
  }
  const pose = frame(time);
  pose.strips.forEach((strip, index) => {
    nodes.bodies[index].setAttribute("d", strip.body);
    nodes.bodies[index].setAttribute("fill", strip.shade);
    nodes.contours[index].setAttribute("d", strip.edge);
    nodes.contours[index].setAttribute("opacity", strip.opacity);
  });
  pose.edges.forEach((edge, index) => {
    nodes.edges[index].setAttribute("d", edge);
    nodes.edges[index].setAttribute(
      "stroke-dashoffset",
      fmt(-time * (82 + index * 3) + index * 67),
    );
  });
  pose.tips.forEach((tip, index) => {
    nodes.tips[index].setAttribute("cx", fmt(tip.x));
    nodes.tips[index].setAttribute("cy", fmt(tip.y));
    nodes.glows[index].setAttribute("d", pose.edges[index * 3]);
    nodes.glows[index].setAttribute(
      "stroke-dashoffset",
      fmt(-time * (82 + index * 9) + index * 201),
    );
  });
  nodes.dispersion?.setAttribute(
    "gradientTransform",
    `translate(${fmt(Math.sin(time * 0.6) * 85)} 0)`,
  );
}

/** A branching glass braid: the routes separate, their light keeps moving. */
export function VorpalStudy({ paused = false, className }: StudyProps) {
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
          id={`${id}-spectrum`}
          data-trace-spectrum=""
          x1="100"
          y1="130"
          x2="525"
          y2="460"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#a4c9bf" />
          <stop offset=".27" stopColor="#92b8e0" />
          <stop offset=".5" stopColor="#b7a0d6" />
          <stop offset=".73" stopColor="#d49eaf" />
          <stop offset="1" stopColor="#e0c79f" />
        </linearGradient>
        <linearGradient
          id={`${id}-silver`}
          x1="95"
          y1="170"
          x2="470"
          y2="430"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#76838d" />
          <stop offset=".3" stopColor="#e0e9eb" />
          <stop offset=".48" stopColor="#65717e" />
          <stop offset=".75" stopColor="#e0dde5" />
          <stop offset="1" stopColor="#86909b" />
        </linearGradient>
        <radialGradient id={`${id}-ambient`}>
          <stop stopColor="#637480" stopOpacity=".12" />
          <stop offset="1" stopColor="#637480" stopOpacity="0" />
        </radialGradient>
        <filter id={`${id}-soft`} x="-25%" y="-25%" width="150%" height="150%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
      </defs>
      <ellipse
        cx="325"
        cy="319"
        rx="260"
        ry="220"
        fill={`url(#${id}-ambient)`}
      />
      {FIRST.strips.map((strip, index) => (
        <Fragment key={index}>
          <path
            data-trace-body=""
            d={strip.body}
            fill={strip.shade}
            fillOpacity=".88"
          />
          <path
            data-trace-contour=""
            d={strip.edge}
            stroke={`url(#${id}-silver)`}
            strokeWidth=".72"
            opacity={strip.opacity}
          />
        </Fragment>
      ))}
      {[0, 1, 2].map((branch) => (
        <path
          key={branch}
          data-trace-glow=""
          d={FIRST.edges[branch * 3]}
          pathLength="1000"
          stroke={`url(#${id}-spectrum)`}
          strokeWidth="5"
          strokeDasharray="90 910"
          strokeDashoffset={String(branch * 201)}
          opacity=".48"
          filter={`url(#${id}-soft)`}
        />
      ))}
      {FIRST.edges.map((edge, index) => (
        <path
          key={index}
          data-trace-edge=""
          d={edge}
          pathLength="1000"
          stroke={index % 3 === 2 ? "#dce6e8" : `url(#${id}-spectrum)`}
          strokeWidth={index % 3 === 2 ? ".65" : "1.35"}
          strokeLinecap="round"
          strokeDasharray={index % 3 === 2 ? "27 973" : "90 910"}
          strokeDashoffset={String(index * 67)}
          opacity={index % 3 === 2 ? ".65" : ".91"}
        />
      ))}
      {FIRST.tips.map((tip, index) => (
        <circle
          key={index}
          data-trace-tip=""
          cx={fmt(tip.x)}
          cy={fmt(tip.y)}
          r="1.7"
          fill="#d9e5e8"
          opacity=".8"
        />
      ))}
    </svg>
  );
}
