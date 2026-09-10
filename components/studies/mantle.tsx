"use client";

import { useId, useRef } from "react";
import {
  useStudyMotion,
  type StudyProps,
} from "@/components/studies/use-study-motion";

const PI = Math.PI;
const RADIUS = 207;
const STRATA = 34;
const CONTOURS = 69;
type Point = { x: number; y: number; z: number };
const fixed = (value: number) => value.toFixed(2);
const coordinate = ({ x, y }: Point) => `${fixed(x)},${fixed(y)}`;

/** Orthographic spherical coordinates keep the silhouette round at every pose. */
function point(
  latitude: number,
  longitude: number,
  radius: number,
  time: number,
): Point {
  const tilt = -0.34 + Math.sin(time * 0.16) * 0.045;
  const x = radius * Math.cos(latitude) * Math.sin(longitude);
  const y = radius * Math.sin(latitude);
  return {
    x: 320 + x * Math.cos(tilt) - y * Math.sin(tilt),
    y: 302 + x * Math.sin(tilt) + y * Math.cos(tilt),
    z: radius * Math.cos(latitude) * Math.cos(longitude),
  };
}

function cutLongitude(time: number) {
  return -0.29 + Math.sin(time * 0.23) * 0.085;
}

function shell(time: number, left: number, right: number) {
  const points: Point[] = [];
  for (let i = 0; i <= 100; i++)
    points.push(point(-PI / 2 + (i / 100) * PI, left, RADIUS, time));
  for (let i = 100; i >= 0; i--)
    points.push(point(-PI / 2 + (i / 100) * PI, right, RADIUS, time));
  return `M${points.map(coordinate).join("L")}Z`;
}

function meridian(radius: number, longitude: number, time: number) {
  return Array.from(
    { length: 101 },
    (_, i) =>
      `${i ? "L" : "M"}${coordinate(point(-PI / 2 + (i / 100) * PI, longitude, radius, time))}`,
  ).join("");
}

function contour(index: number, time: number) {
  const latitude = -PI / 2 + ((index + 1) / (CONTOURS + 1)) * PI;
  return Array.from({ length: 91 }, (_, i) => {
    const longitude = -PI / 2 + (i / 90) * PI;
    const drift = longitude + time * 0.072;
    const relief =
      (Math.sin(drift * 4.1 + latitude * 7) * 0.024 +
        Math.sin(drift * 9 - latitude * 12) * 0.009) *
      Math.cos(latitude);
    return `${i ? "L" : "M"}${coordinate(point(latitude + relief, longitude, RADIUS, time))}`;
  }).join("");
}

function frame(time: number) {
  const edge = cutLongitude(time);
  return {
    shell: shell(time, -PI / 2, edge) + shell(time, 1.3, PI / 2),
    contours: Array.from({ length: CONTOURS }, (_, i) => contour(i, time)),
    meridians: Array.from({ length: 25 }, (_, i) =>
      meridian(RADIUS, (((i / 25) * PI + time * 0.045) % PI) - PI / 2, time),
    ),
    seams: Array.from({ length: 3 }, (_, i) =>
      meridian(RADIUS - i * 2.1, edge, time),
    ),
    strata: Array.from({ length: STRATA }, (_, i) => {
      const radius = 83 + (i * (RADIUS - 83)) / (STRATA - 1);
      const d =
        Array.from({ length: 161 }, (_, j) => {
          const angle = (j / 160) * PI * 2;
          const tilt = -0.34 + Math.sin(time * 0.16) * 0.045;
          const relief =
            1 + Math.sin(angle * 5 + i * 0.28 + time * 0.12) * 0.0018;
          const x = Math.cos(angle) * radius * relief;
          const y = Math.sin(angle) * radius * relief;
          return `${j ? "L" : "M"}${fixed(320 + x * Math.cos(tilt) - y * Math.sin(tilt))},${fixed(302 + x * Math.sin(tilt) + y * Math.cos(tilt))}`;
        }).join("") + "Z";
      const light = 0.5 + 0.5 * Math.sin(i * 0.59 - time * 0.32);
      return { d, opacity: (0.17 + light * 0.25).toFixed(4) };
    }),
  };
}

const initial = frame(0);
const elements = new WeakMap<
  SVGSVGElement,
  {
    shells: NodeListOf<SVGPathElement>;
    contours: NodeListOf<SVGPathElement>;
    meridians: NodeListOf<SVGPathElement>;
    seams: NodeListOf<SVGPathElement>;
    strata: NodeListOf<SVGPathElement>;
    lights: NodeListOf<SVGPathElement>;
    spectrum: SVGLinearGradientElement | null;
  }
>();

function update(svg: SVGSVGElement, time: number) {
  let nodes = elements.get(svg);
  if (!nodes) {
    nodes = {
      shells: svg.querySelectorAll("[data-mantle-shell]"),
      contours: svg.querySelectorAll("[data-mantle-contour]"),
      meridians: svg.querySelectorAll("[data-mantle-meridian]"),
      seams: svg.querySelectorAll("[data-mantle-seam]"),
      strata: svg.querySelectorAll("[data-mantle-stratum]"),
      lights: svg.querySelectorAll("[data-mantle-light]"),
      spectrum: svg.querySelector("[data-mantle-spectrum]"),
    };
    elements.set(svg, nodes);
  }
  const next = frame(time);
  nodes.shells.forEach((node) => node.setAttribute("d", next.shell));
  nodes.contours.forEach((node, i) => node.setAttribute("d", next.contours[i]));
  nodes.meridians.forEach((node, i) =>
    node.setAttribute("d", next.meridians[i]),
  );
  nodes.seams.forEach((node, i) => node.setAttribute("d", next.seams[i % 3]));
  nodes.strata.forEach((node, i) => {
    node.setAttribute("d", next.strata[i].d);
    node.setAttribute("opacity", next.strata[i].opacity);
  });
  nodes.lights.forEach((node, i) =>
    node.setAttribute("stroke-dashoffset", fixed(-time * (20 + i * 7))),
  );
  nodes.spectrum?.setAttribute(
    "gradientTransform",
    `rotate(${fixed(Math.sin(time * 0.2) * 32)} 320 302)`,
  );
}

/** Bedrock, not a container: a continuous globe revealing densely layered strata. */
export function MantleStudy({ paused = false, className }: StudyProps) {
  const ref = useRef<SVGSVGElement>(null);
  const id = `mantle-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
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
        <radialGradient id={`${id}-stone`} cx=".28" cy=".2" r=".86">
          <stop stopColor="#667071" />
          <stop offset=".26" stopColor="#353e40" />
          <stop offset=".62" stopColor="#151c20" />
          <stop offset=".91" stopColor="#0b1013" />
          <stop offset="1" stopColor="#384246" />
        </radialGradient>
        <radialGradient id={`${id}-section`} cx=".38" cy=".31" r=".76">
          <stop stopColor="#4b5252" />
          <stop offset=".25" stopColor="#242d31" />
          <stop offset=".48" stopColor="#354044" />
          <stop offset=".51" stopColor="#12191c" />
          <stop offset=".69" stopColor="#414647" />
          <stop offset=".72" stopColor="#171e21" />
          <stop offset=".9" stopColor="#2c3437" />
          <stop offset="1" stopColor="#131a1e" />
        </radialGradient>
        <radialGradient id={`${id}-core`} cx=".33" cy=".25" r=".8">
          <stop stopColor="#92998e" />
          <stop offset=".23" stopColor="#596461" />
          <stop offset=".61" stopColor="#2c383b" />
          <stop offset=".9" stopColor="#1b252b" />
          <stop offset="1" stopColor="#586263" />
        </radialGradient>
        <linearGradient
          id={`${id}-spectrum`}
          data-mantle-spectrum
          x1="168"
          y1="132"
          x2="491"
          y2="468"
          gradientUnits="userSpaceOnUse"
          gradientTransform="rotate(0.00 320 302)"
        >
          <stop stopColor="#aac7bb" />
          <stop offset=".23" stopColor="#91bbd0" />
          <stop offset=".48" stopColor="#b1a3c6" />
          <stop offset=".73" stopColor="#c1a6ad" />
          <stop offset="1" stopColor="#c7b48d" />
        </linearGradient>
        <linearGradient
          id={`${id}-engraving`}
          x1="181"
          y1="154"
          x2="446"
          y2="451"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#c4d0cc" stopOpacity=".36" />
          <stop offset=".46" stopColor="#a0b3b8" stopOpacity=".2" />
          <stop offset="1" stopColor="#849898" stopOpacity=".06" />
        </linearGradient>
        <radialGradient id={`${id}-shadow`}>
          <stop stopColor="#819a9d" stopOpacity=".1" />
          <stop offset="1" stopColor="#819a9d" stopOpacity="0" />
        </radialGradient>
        <clipPath id={`${id}-surface`}>
          <path data-mantle-shell d={initial.shell} />
        </clipPath>
        <clipPath id={`${id}-globe`}>
          <circle cx="320" cy="302" r={RADIUS} />
        </clipPath>
      </defs>
      <ellipse cx="320" cy="541" rx="164" ry="23" fill={`url(#${id}-shadow)`} />
      <circle cx="320" cy="302" r={RADIUS} fill={`url(#${id}-section)`} />
      <g clipPath={`url(#${id}-globe)`}>
        <g stroke={`url(#${id}-spectrum)`} strokeWidth=".65">
          {initial.strata.map((stratum, i) => (
            <path
              key={i}
              data-mantle-stratum
              d={stratum.d}
              opacity={stratum.opacity}
            />
          ))}
        </g>
        <circle
          cx="320"
          cy="302"
          r="82"
          fill={`url(#${id}-core)`}
          stroke="#9ba9aa"
          strokeWidth=".65"
          strokeOpacity=".3"
        />
        <g stroke="#8faaa7" strokeOpacity=".14" strokeWidth=".5">
          {Array.from({ length: 15 }, (_, i) => (
            <circle key={i} cx="320" cy="302" r={fixed(36 + i * 3.12)} />
          ))}
        </g>
        <path data-mantle-shell d={initial.shell} fill={`url(#${id}-stone)`} />
        <g clipPath={`url(#${id}-surface)`}>
          <g stroke={`url(#${id}-engraving)`} strokeWidth=".65">
            {initial.contours.map((d, i) => (
              <path key={i} data-mantle-contour d={d} />
            ))}
          </g>
          <g stroke="#acbbb9" strokeWidth=".45" strokeOpacity=".095">
            {initial.meridians.map((d, i) => (
              <path key={i} data-mantle-meridian d={d} />
            ))}
          </g>
        </g>
        <g stroke={`url(#${id}-spectrum)`}>
          {initial.seams.map((d, i) => (
            <path
              key={i}
              data-mantle-seam
              d={d}
              strokeWidth={1.4 - i * 0.3}
              opacity={0.7 - i * 0.18}
            />
          ))}
          <path
            data-mantle-seam
            data-mantle-light
            d={initial.seams[0]}
            strokeWidth="2"
            strokeDasharray="61 610"
            strokeDashoffset="0"
            strokeLinecap="round"
          />
        </g>
      </g>
      <circle
        cx="320"
        cy="302"
        r={RADIUS}
        stroke={`url(#${id}-engraving)`}
        strokeWidth=".9"
      />
      <path
        d="M316 557h8m-4-4v8"
        stroke="#829395"
        strokeWidth=".6"
        opacity=".4"
      />
    </svg>
  );
}
