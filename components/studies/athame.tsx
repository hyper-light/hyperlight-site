"use client";

import { useId, useRef } from "react";
import {
  useStudyMotion,
  type StudyProps,
} from "@/components/studies/use-study-motion";

type Point = { x: number; y: number };
const f = (n: number) => n.toFixed(2);
const path = (points: Point[], close = false) =>
  points.map((p, i) => `${i ? "L" : "M"}${f(p.x)},${f(p.y)}`).join("") +
  (close ? "Z" : "");
function project(x: number, y: number, z: number, t: number): Point {
  const yaw = -0.37 + Math.sin(t * 0.34) * 0.085;
  const turn = -0.13 + Math.sin(t * 0.29) * 0.035;
  const px = x * Math.cos(yaw) + z * Math.sin(yaw);
  const depth = z * Math.cos(yaw) - x * Math.sin(yaw);
  const scale = 1100 / (1100 - depth);
  return {
    x: 327 + (px * Math.cos(turn) - y * Math.sin(turn)) * scale,
    y: 307 + (px * Math.sin(turn) + y * Math.cos(turn)) * scale,
  };
}
function surface(u: number, v: number, t: number, depth = 0) {
  const width =
    160 * (1 - 0.13 * v) * Math.sqrt(Math.max(0, 1 - Math.pow(v, 4)));
  const z = 39 * (1 - u * u) * Math.sin(v * Math.PI) + depth;
  return project(u * width, -161 + 342 * v + u * u * 29 * (1 - v), z, t);
}
function boundary(t: number, inset = 0, depth = 0) {
  const points: Point[] = [];
  for (let i = 0; i <= 48; i++)
    points.push(surface(-1 + inset, (i / 48) * (1 - inset), t, depth));
  for (let i = 48; i >= 0; i--)
    points.push(surface(1 - inset, (i / 48) * (1 - inset), t, depth));
  for (let i = 48; i >= 0; i--)
    points.push(
      surface(-1 + inset + (i / 48) * (2 - inset * 2), inset * 0.15, t, depth),
    );
  return path(points, true);
}
function frame(t: number) {
  const accepted = [1, 3, 5];
  const paths = Array.from({ length: 7 }, (_, i) => {
    const y = -107 + i * 33;
    const admit = accepted.includes(i);
    return path(
      Array.from({ length: 83 }, (_, j) => {
        const v = j / 82;
        if (v < 0.5) {
          const u = v * 2;
          return project(
            -204 + u * 204,
            y + Math.sin(u * Math.PI) * 7,
            90 - u * 63,
            t,
          );
        }
        const u = (v - 0.5) * 2;
        return admit
          ? project(u * 205, y - Math.sin(u * Math.PI) * 11, 27 - u * 137, t)
          : project(
              -u * 151,
              y - Math.sin(u * Math.PI * 0.5) * 64,
              27 + u * 107,
              t,
            );
      }),
    );
  });
  return {
    shell: boundary(t),
    back: boundary(t, 0, -7),
    inset: boundary(t, 0.035, 2),
    ribs: Array.from({ length: 17 }, (_, i) =>
      path(
        Array.from({ length: 65 }, (_, j) =>
          surface(-0.94 + (i / 16) * 1.88, 0.025 + (j / 64) * 0.95, t, 0.5),
        ),
      ),
    ),
    cross: Array.from({ length: 23 }, (_, i) =>
      path(
        Array.from({ length: 57 }, (_, j) =>
          surface(-0.985 + (j / 56) * 1.97, 0.035 + (i / 22) * 0.91, t, 0.5),
        ),
      ),
    ),
    paths,
    reflections: Array.from({ length: 19 }, (_, strip) => {
      const row = (offset: number) =>
        Array.from({ length: 65 }, (_, j) => {
          const v = 0.025 + (j / 64) * 0.93;
          const u =
            -0.18 +
            Math.sin(t * 0.47) * 0.48 +
            Math.sin(v * Math.PI * 1.3) * 0.2 +
            offset;
          return surface(u, v, t, 1.2);
        });
      return path(
        [
          ...row((strip - 9.5) * 0.018),
          ...row((strip - 8.5) * 0.018).toReversed(),
        ],
        true,
      );
    }),
    marks: Array.from({ length: 7 }, (_, i) => {
      const p = project(0, -107 + i * 33, 32, t);
      const r = 1.7 + 0.55 * Math.sin(t * 1.1 + i);
      return {
        x: f(p.x),
        y: f(p.y),
        r: f(r),
        opacity: (0.35 + (0.35 * (Math.sin(t * 1.1 + i) + 1)) / 2).toFixed(4),
      };
    }),
    scans: [0, 1].map((i) => {
      const v = 0.07 + ((t * 0.12 + i * 0.43) % 1) * 0.86;
      return path(
        Array.from({ length: 65 }, (_, j) =>
          surface(-0.98 + (j / 64) * 1.96, v, t, 1),
        ),
      );
    }),
  };
}
const FIRST = frame(0);
const cache = new WeakMap<
  SVGSVGElement,
  {
    shell: SVGPathElement[];
    back: SVGPathElement[];
    inset: SVGPathElement[];
    ribs: SVGPathElement[];
    cross: SVGPathElement[];
    paths: SVGPathElement[];
    signals: SVGPathElement[];
    scans: SVGPathElement[];
    reflections: SVGPathElement[];
    marks: SVGCircleElement[];
    spectrum: SVGLinearGradientElement;
  }
>();
function update(svg: SVGSVGElement, t: number) {
  let nodes = cache.get(svg);
  if (!nodes) {
    const all = (name: string) =>
      Array.from(svg.querySelectorAll<SVGPathElement>(`[data-athame-${name}]`));
    nodes = {
      shell: all("shell"),
      back: all("back"),
      inset: all("inset"),
      ribs: all("rib"),
      cross: all("cross"),
      paths: all("path"),
      signals: all("signal"),
      scans: all("scan"),
      reflections: all("reflection"),
      marks: Array.from(svg.querySelectorAll("[data-athame-mark]")),
      spectrum: svg.querySelector("[data-athame-spectrum]")!,
    };
    cache.set(svg, nodes);
  }
  const elements = nodes;
  const pose = frame(t);
  (["shell", "back", "inset"] as const).forEach((key) =>
    elements[key].forEach((node) => node.setAttribute("d", pose[key])),
  );
  (["ribs", "cross", "paths", "scans", "reflections"] as const).forEach((key) =>
    pose[key].forEach((d, i) => elements[key][i].setAttribute("d", d)),
  );
  elements.signals.forEach((node, i) => {
    node.setAttribute("d", pose.paths[i]);
    node.setAttribute("stroke-dashoffset", f(-t * (68 + i * 3) + i * 59));
  });
  pose.marks.forEach((mark, i) =>
    Object.entries(mark).forEach(([key, value]) =>
      elements.marks[i].setAttribute(
        key === "x" ? "cx" : key === "y" ? "cy" : key,
        value,
      ),
    ),
  );
  elements.spectrum.setAttribute(
    "gradientTransform",
    `rotate(${f(Math.sin(t * 0.24) * 17)} 320 310)`,
  );
}

/** A transparent protective boundary admits selected paths while others turn back. */
export function AthameStudy({ paused = false, className }: StudyProps) {
  const ref = useRef<SVGSVGElement>(null);
  const id = `athame-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
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
        <linearGradient id={`${id}-reflection`} x1="0" y1="0" x2=".35" y2="1">
          <stop stopColor="#e3ebf1" stopOpacity=".18" />
          <stop offset=".22" stopColor="#c4d6e4" stopOpacity=".75" />
          <stop offset=".48" stopColor="#dce5ef" stopOpacity=".25" />
          <stop offset=".73" stopColor="#b2c7e0" stopOpacity=".65" />
          <stop offset="1" stopColor="#b5c4d4" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${id}-glass`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#8babbc" stopOpacity=".17" />
          <stop offset=".25" stopColor="#526a7e" stopOpacity=".04" />
          <stop offset=".55" stopColor="#b7c8df" stopOpacity=".09" />
          <stop offset=".76" stopColor="#657786" stopOpacity=".015" />
          <stop offset="1" stopColor="#90a7c3" stopOpacity=".11" />
        </linearGradient>
        <linearGradient id={`${id}-edge`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#c4d7e0" stopOpacity=".76" />
          <stop offset=".28" stopColor="#a4bacb" stopOpacity=".22" />
          <stop offset=".59" stopColor="#b4bfd8" stopOpacity=".56" />
          <stop offset=".81" stopColor="#8194a9" stopOpacity=".14" />
          <stop offset="1" stopColor="#c6d5df" stopOpacity=".7" />
        </linearGradient>
        <linearGradient
          id={`${id}-spectrum`}
          data-athame-spectrum=""
          x1="112"
          y1="201"
          x2="533"
          y2="369"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#bdc5a3" />
          <stop offset=".22" stopColor="#92c4bc" />
          <stop offset=".46" stopColor="#93b9df" />
          <stop offset=".73" stopColor="#b8a0d4" />
          <stop offset="1" stopColor="#c99dab" />
        </linearGradient>
      </defs>
      {FIRST.paths.map((d, i) => (
        <path
          key={i}
          data-athame-path=""
          d={d}
          stroke="#8c9cac"
          strokeWidth=".65"
          strokeOpacity={i % 2 ? ".17" : ".08"}
        />
      ))}
      <path
        data-athame-back=""
        d={FIRST.back}
        stroke={`url(#${id}-edge)`}
        strokeWidth=".6"
        opacity=".35"
      />
      <path
        data-athame-shell=""
        d={FIRST.shell}
        fill={`url(#${id}-glass)`}
        stroke={`url(#${id}-edge)`}
        strokeWidth="1.1"
      />
      <path
        data-athame-inset=""
        d={FIRST.inset}
        stroke={`url(#${id}-edge)`}
        strokeWidth=".5"
        opacity=".32"
      />
      {FIRST.ribs.map((d, i) => (
        <path
          key={i}
          data-athame-rib=""
          d={d}
          stroke="#c0d0de"
          strokeWidth=".55"
          strokeOpacity={i % 4 ? ".055" : ".13"}
        />
      ))}
      {FIRST.reflections.map((d, i) => (
        <path
          key={i}
          data-athame-reflection=""
          d={d}
          fill={`url(#${id}-reflection)`}
          opacity={(0.25 * Math.exp(-Math.pow((i - 9) / 3.7, 2))).toFixed(4)}
        />
      ))}
      {FIRST.cross.map((d, i) => (
        <path
          key={i}
          data-athame-cross=""
          d={d}
          stroke="#b0c4d5"
          strokeWidth=".5"
          strokeOpacity={i % 5 ? ".05" : ".105"}
        />
      ))}
      {FIRST.scans.map((d, i) => (
        <path
          key={i}
          data-athame-scan=""
          d={d}
          stroke={`url(#${id}-spectrum)`}
          strokeWidth=".8"
          strokeOpacity=".36"
        />
      ))}
      {FIRST.paths.map((d, i) => (
        <path
          key={i}
          data-athame-signal=""
          d={d}
          stroke={`url(#${id}-spectrum)`}
          strokeWidth={i % 2 ? "1.3" : ".8"}
          strokeLinecap="round"
          strokeDasharray={i % 2 ? "37 420" : "16 480"}
          strokeDashoffset={f(i * 59)}
          strokeOpacity={i % 2 ? ".86" : ".36"}
        />
      ))}
      {FIRST.marks.map((mark, i) => (
        <circle
          key={i}
          data-athame-mark=""
          cx={mark.x}
          cy={mark.y}
          r={mark.r}
          opacity={mark.opacity}
          fill={i % 2 ? `url(#${id}-spectrum)` : "#94a2b2"}
        />
      ))}
    </svg>
  );
}
