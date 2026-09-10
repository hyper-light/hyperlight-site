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

// Positive longitude moves northeast on the near side and southwest behind
// the core. The camera's roll is fixed; this is rotation in depth, not 2D spin.
const ORBIT_SECONDS = 28;
const CUT_LONGITUDE = -0.29;
const TILT = -PI / 4;
const phase = (time: number) => (time / ORBIT_SECONDS) * PI * 2;
type Side = "back" | "front";

function project(x: number, y: number, z: number): Point {
  return {
    x: 320 + x * Math.cos(TILT) - y * Math.sin(TILT),
    y: 302 + x * Math.sin(TILT) + y * Math.cos(TILT),
    z,
  };
}

/** Split at the horizon, retaining the exact crossing rather than popping paths. */
function visibleLine(points: Point[], side: Side) {
  let d = "";
  let drawing = false;
  const inside = (p: Point) => (side === "front" ? p.z >= 0 : p.z < 0);
  for (let i = 0; i < points.length; i++) {
    const current = points[i];
    const previous = points[i - 1];
    if (previous && inside(previous) !== inside(current)) {
      const t = previous.z / (previous.z - current.z);
      const crossing = {
        x: previous.x + (current.x - previous.x) * t,
        y: previous.y + (current.y - previous.y) * t,
        z: 0,
      };
      d += `${drawing ? "L" : "M"}${coordinate(crossing)}`;
      drawing = inside(current);
    }
    if (inside(current)) {
      d += `${drawing ? "L" : "M"}${coordinate(current)}`;
      drawing = true;
    } else {
      drawing = false;
    }
  }
  return d || "M320,302";
}

/** Orthographic spherical coordinates keep the silhouette round at every pose. */
function point(
  latitude: number,
  longitude: number,
  radius: number,
  time: number,
): Point {
  const turn = longitude + phase(time);
  const x = radius * Math.cos(latitude) * Math.sin(turn);
  const y = radius * Math.sin(latitude);
  return project(x, y, radius * Math.cos(latitude) * Math.cos(turn));
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
  return Array.from({ length: 101 }, (_, i) =>
    point(-PI / 2 + (i / 100) * PI, longitude, radius, time),
  );
}

function contour(index: number, time: number) {
  const latitude = -PI / 2 + ((index + 1) / (CONTOURS + 1)) * PI;
  return Array.from({ length: 91 }, (_, i) => {
    const longitude = 1.3 + (i / 90) * (PI * 2 + CUT_LONGITUDE - 1.3);
    const relief =
      (Math.sin(longitude * 4.1 + latitude * 7) * 0.024 +
        Math.sin(longitude * 9 - latitude * 12) * 0.009) *
      Math.cos(latitude);
    return point(latitude + relief, longitude, RADIUS, time);
  });
}

function surface(time: number, side: Side) {
  // Clip the spherical patch in longitude BEFORE projecting. A wrapped patch
  // cannot be represented by just its two projected boundary meridians.
  const turn = phase(time) % (PI * 2);
  const start = 1.3 + turn;
  const end = PI * 2 + CUT_LONGITUDE + turn;
  let d = "";
  for (let k = -1; k <= 2; k++) {
    const horizon = (side === "front" ? -PI / 2 : PI / 2) + k * PI * 2;
    const left = Math.max(start, horizon);
    const right = Math.min(end, horizon + PI);
    if (right > left) d += shell(0, left, right);
  }
  return d || "M320,302Z";
}

function frame(time: number) {
  const contours = Array.from({ length: CONTOURS }, (_, i) => contour(i, time));
  const meridians = Array.from({ length: 25 }, (_, i) =>
    meridian(RADIUS, 1.3 + (i / 24) * (PI * 2 + CUT_LONGITUDE - 1.3), time),
  );
  const seams = Array.from({ length: 6 }, (_, i) =>
    meridian(RADIUS - (i % 3) * 2.1, i < 3 ? CUT_LONGITUDE : 1.3, time),
  );
  const strata = Array.from({ length: STRATA }, (_, i) => {
    const radius = 83 + (i * (RADIUS - 83)) / (STRATA - 1);
    const points = Array.from({ length: 161 }, (_, j) => {
      const angle = (j / 160) * PI * 2;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      const turn = phase(time) + 0.12 + (i / (STRATA - 1) - 0.5) * 0.18;
      return project(x * Math.cos(turn), y, -x * Math.sin(turn));
    });
    const light = 0.5 + 0.5 * Math.sin(i * 0.59 - time * 0.75);
    return { points, opacity: (0.16 + light * light * 0.4).toFixed(4) };
  });
  const layer = (side: Side) => ({
    shell: surface(time, side),
    contours: contours.map((points) => visibleLine(points, side)).join(""),
    meridians: meridians.map((points) => visibleLine(points, side)).join(""),
    seams: seams.map((points) => visibleLine(points, side)),
    strata: strata.map(({ points, opacity }) => ({
      d: visibleLine(points, side),
      opacity,
    })),
  });
  return { back: layer("back"), front: layer("front") };
}

const initial = frame(0);
const elements = new WeakMap<
  SVGSVGElement,
  {
    layers: Array<{
      side: Side;
      shell: SVGPathElement | null;
      contours: SVGPathElement | null;
      meridians: SVGPathElement | null;
      seams: NodeListOf<SVGPathElement>;
      strata: NodeListOf<SVGPathElement>;
      lights: NodeListOf<SVGPathElement>;
    }>;
    spectrum: SVGLinearGradientElement | null;
    stone: SVGRadialGradientElement | null;
    core: SVGRadialGradientElement | null;
  }
>();

function update(svg: SVGSVGElement, time: number) {
  let nodes = elements.get(svg);
  if (!nodes) {
    nodes = {
      layers: (["back", "front"] as const).map((side) => {
        const group = svg.querySelector(`[data-mantle-layer="${side}"]`)!;
        return {
          side,
          shell: group.querySelector<SVGPathElement>("[data-mantle-shell]"),
          contours: group.querySelector<SVGPathElement>(
            "[data-mantle-contour]",
          ),
          meridians: group.querySelector<SVGPathElement>(
            "[data-mantle-meridian]",
          ),
          seams: group.querySelectorAll<SVGPathElement>("[data-mantle-edge]"),
          strata: group.querySelectorAll<SVGPathElement>(
            "[data-mantle-stratum]",
          ),
          lights: group.querySelectorAll<SVGPathElement>("[data-mantle-light]"),
        };
      }),
      spectrum: svg.querySelector("[data-mantle-spectrum]"),
      stone: svg.querySelector("[data-mantle-stone]"),
      core: svg.querySelector("[data-mantle-core]"),
    };
    elements.set(svg, nodes);
  }
  const next = frame(time);
  nodes.layers.forEach((layer) => {
    const pose = next[layer.side];
    layer.shell?.setAttribute("d", pose.shell);
    layer.contours?.setAttribute("d", pose.contours);
    layer.meridians?.setAttribute("d", pose.meridians);
    layer.seams.forEach((node, i) => node.setAttribute("d", pose.seams[i % 6]));
    layer.strata.forEach((node, i) => {
      node.setAttribute("d", pose.strata[i].d);
      node.setAttribute("opacity", pose.strata[i].opacity);
    });
    layer.lights.forEach((node, i) =>
      node.setAttribute("stroke-dashoffset", fixed(-time * (34 + i * 7))),
    );
  });
  nodes.spectrum?.setAttribute(
    "gradientTransform",
    `rotate(${fixed(time * 12)} 320 302)`,
  );
  // Move the illumination, not the core itself: bedrock stays anchored while
  // grazing light reveals the material. The same clock freezes every detail.
  const lightX = Math.sin(time * 0.34);
  const lightY = 1 - Math.cos(time * 0.34);
  nodes.stone?.setAttribute("cx", (0.28 + lightX * 0.1).toFixed(4));
  nodes.stone?.setAttribute("cy", (0.2 + lightY * 0.06).toFixed(4));
  nodes.core?.setAttribute("cx", (0.33 + lightX * 0.14).toFixed(4));
  nodes.core?.setAttribute("cy", (0.25 + lightY * 0.09).toFixed(4));
}

/** Bedrock, not a container: a continuous globe revealing densely layered strata. */
export function MantleStudy({ paused = false, className }: StudyProps) {
  const ref = useRef<SVGSVGElement>(null);
  const id = `mantle-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  useStudyMotion({ ref, paused, update });
  const crust = (side: Side) => (
    <>
      <path
        data-mantle-shell
        d={initial[side].shell}
        fill={`url(#${id}-stone)`}
        fillOpacity={side === "front" ? 0.62 : 0.32}
      />
      <path
        data-mantle-contour
        d={initial[side].contours}
        stroke={`url(#${id}-engraving)`}
        strokeWidth=".65"
        opacity={side === "front" ? 1 : 0.28}
      />
      <path
        data-mantle-meridian
        d={initial[side].meridians}
        stroke="#acbbb9"
        strokeWidth=".45"
        strokeOpacity=".095"
        opacity={side === "front" ? 1 : 0.35}
      />
      <g stroke={`url(#${id}-spectrum)`}>
        {initial[side].seams.map((d, i) => (
          <path
            key={i}
            data-mantle-edge
            data-mantle-seam={side === "front" ? "" : undefined}
            d={d}
            strokeWidth={1.4 - (i % 3) * 0.3}
            opacity={0.7 - (i % 3) * 0.18}
          />
        ))}
        <path
          data-mantle-edge
          data-mantle-light
          d={initial[side].seams[0]}
          strokeWidth="2"
          strokeDasharray="61 610"
          strokeDashoffset="0"
          strokeLinecap="round"
        />
      </g>
    </>
  );
  const layer = (side: Side) => (
    <g data-mantle-layer={side}>
      {side === "back" && crust(side)}
      <g stroke={`url(#${id}-spectrum)`} strokeWidth=".65">
        {initial[side].strata.map((stratum, i) => (
          <path
            key={i}
            data-mantle-stratum
            d={stratum.d}
            opacity={stratum.opacity}
          />
        ))}
      </g>
      {side === "front" && crust(side)}
    </g>
  );
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
        <radialGradient
          id={`${id}-stone`}
          data-mantle-stone
          cx=".28"
          cy=".2"
          r=".86"
        >
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
        <radialGradient
          id={`${id}-core`}
          data-mantle-core
          cx=".33"
          cy=".25"
          r=".8"
        >
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
        <clipPath id={`${id}-globe`}>
          <circle cx="320" cy="302" r={RADIUS} />
        </clipPath>
      </defs>
      <ellipse cx="320" cy="541" rx="164" ry="23" fill={`url(#${id}-shadow)`} />
      <circle cx="320" cy="302" r={RADIUS} fill={`url(#${id}-section)`} />
      <g clipPath={`url(#${id}-globe)`}>
        {layer("back")}
        <circle
          data-mantle-anchor
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
        {layer("front")}
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
