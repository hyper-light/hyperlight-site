"use client";

import { useId, useRef } from "react";
import {
  useStudyMotion,
  type StudyProps,
} from "@/components/studies/use-study-motion";

type Point = { x: number; y: number; z: number };
type Line = { points: Point[]; closed?: boolean };
const TAU = Math.PI * 2;
const PORTS = 8;
const STEP = TAU / PORTS;
const f = (value: number) => value.toFixed(2);
const clamp = (value: number) => Math.max(0, Math.min(1, value));
const polar = (radius: number, angle: number, z: number): Point => ({
  x: Math.cos(angle) * radius,
  y: Math.sin(angle) * radius,
  z,
});
const sample = (count: number, point: (u: number) => Point) =>
  Array.from({ length: count + 1 }, (_, i) => point(i / count));
const arc = (radius: number, z: number, start = 0, end = TAU) =>
  sample(Math.ceil(((end - start) / TAU) * 96), (u) =>
    polar(radius, start + u * (end - start), z),
  );
const line = (points: Point[], closed = false): Line => ({ points, closed });
const ring = (radius: number, z: number) => line(arc(radius, z), true);
const band = (inner: number, outer: number, z: number, a: number, b: number) =>
  line([...arc(outer, z, a, b), ...arc(inner, z, a, b).toReversed()], true);

// The geometry stays connected: an axial inlet feeds eight equal radial chambers.
// Build its fine glasswork once; animation only projects it and moves the light.
function sculpture() {
  const skins: Line[] = [];
  const mesh: Line[] = [];
  const edges: Line[] = [];
  const rims: Line[] = [];
  const channels: Line[] = [];
  const outlets: Line[] = [];

  for (const z of [-12, -8, 8, 12]) {
    edges.push(ring(53, z), ring(132, z));
  }
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * TAU;
    const b = ((i + 1) / 16) * TAU;
    skins.push(band(53, 132, 12, a, b));
    skins.push(
      line([...arc(132, -12, a, b), ...arc(132, 12, a, b).toReversed()], true),
    );
  }
  for (let i = 0; i < 12; i++) mesh.push(ring(57 + i * 6.4, 12));
  for (let i = 0; i < 80; i++) {
    const angle = (i / 80) * TAU;
    mesh.push(line([polar(53, angle, 12), polar(132, angle, 12)]));
    mesh.push(line([polar(132, angle, -12), polar(132, angle, 12)]));
  }

  for (let port = 0; port < PORTS; port++) {
    const angle = port * STEP;
    const half = STEP * 0.34;
    // Separated, bevelled outlet chambers give the perimeter eight clear destinations.
    const chamber = (inset: number, z: number) =>
      band(
        139 + inset,
        190 - inset,
        z,
        angle - half + inset / 190,
        angle + half - inset / 190,
      );
    const bottom = chamber(0, -20);
    const shoulder = chamber(0, 19);
    const top = chamber(3, 24);
    edges.push(bottom, shoulder);
    rims.push(top, chamber(7, 24.5));
    skins.push(top);
    for (const radius of [139, 190]) {
      skins.push(
        line(
          [
            ...arc(radius, -20, angle - half, angle + half),
            ...arc(radius, 19, angle - half, angle + half).toReversed(),
          ],
          true,
        ),
      );
    }
    for (const side of [-1, 1]) {
      const a = angle + side * half;
      skins.push(
        line(
          [
            polar(139, a, -20),
            polar(190, a, -20),
            polar(190, a, 19),
            polar(139, a, 19),
          ],
          true,
        ),
      );
      edges.push(line([polar(139, a, -20), polar(139, a, 19)]));
      edges.push(line([polar(190, a, -20), polar(190, a, 19)]));
    }
    for (let i = 0; i < 9; i++) {
      const a = angle - half * 0.85 + (i / 8) * half * 1.7;
      mesh.push(line([polar(144, a, 24), polar(184, a, 24)]));
      mesh.push(line([polar(190, a, -18), polar(190, a, 17)]));
    }
    for (let i = 0; i < 6; i++) {
      mesh.push(
        line(arc(145 + i * 7, 24, angle - half * 0.88, angle + half * 0.88)),
      );
      mesh.push(line(arc(190, -15 + i * 6, angle - half, angle + half)));
    }

    const rail = (offset: number, z: number) =>
      sample(20, (u) => {
        const r = 43 + u * 119;
        return polar(r, angle + offset / r, z + Math.sin(u * Math.PI) * 5);
      });
    for (const side of [-1, 1]) {
      const upper = rail(side * 6, 18);
      const lower = rail(side * 6, 8);
      edges.push(line(upper), line(lower));
      skins.push(line([...upper, ...lower.toReversed()], true));
    }
    skins.push(line([...rail(-6, 18), ...rail(6, 18).toReversed()], true));
    for (let i = 0; i < 17; i++) {
      const r = 49 + i * 6.5;
      const z = 18 + Math.sin(((r - 43) / 119) * Math.PI) * 5;
      mesh.push(line([polar(r, angle - 6 / r, z), polar(r, angle + 6 / r, z)]));
    }
    channels.push(line(sample(48, (u) => route(port, 0.23 + u * 0.77))));
    outlets.push(line(arc(174, 26, angle - half * 0.67, angle + half * 0.67)));
    rims.push(line(arc(177, 26, angle - half * 0.67, angle + half * 0.67)));
  }

  // An open, flared central intake. The inner wall and lip remain visible through the shell.
  const neck = (u: number, angle: number, inside = false) =>
    polar(23 + 21 * (1 - u) ** 3 - (inside ? 3 : 0), angle, 18 + u * 64);
  for (let i = 0; i < 32; i++) {
    const a = (i / 32) * TAU;
    const b = ((i + 1) / 32) * TAU;
    skins.push(
      line(
        [
          ...sample(16, (u) => neck(u, a)),
          ...sample(16, (u) => neck(u, b)).toReversed(),
        ],
        true,
      ),
    );
    mesh.push(line(sample(20, (u) => neck(u, a))));
  }
  for (let i = 0; i < 10; i++) {
    const u = i / 9;
    mesh.push(
      line(
        sample(80, (v) => neck(u, v * TAU)),
        true,
      ),
    );
  }
  for (const [r, z] of [
    [23, 82],
    [20, 82],
    [23, 78],
    [20, 72],
    [44, 18],
    [48, 15],
    [48, 8],
  ])
    rims.push(ring(r, z));
  for (let i = 0; i < 8; i++) {
    const angle = i * STEP;
    edges.push(line(sample(24, (u) => neck(u, angle, true))));
  }
  channels.push(line(sample(24, (u) => route(0, u * 0.23))));
  return { skins, mesh, edges, rims, channels, outlets };
}

function route(port: number, u: number): Point {
  const a = port * STEP;
  if (u <= 0.23) return { x: 0, y: 0, z: 98 - (u / 0.23) * 64 };
  if (u <= 0.45) {
    const v = (u - 0.23) / 0.22;
    return polar(
      47 * Math.sin((v * Math.PI) / 2),
      a,
      20 + 14 * Math.cos((v * Math.PI) / 2),
    );
  }
  const v = (u - 0.45) / 0.55;
  return polar(47 + v * 127, a, 20 + 5 * Math.sin(v * Math.PI));
}

const MODEL = sculpture();
const KEYS = ["skins", "mesh", "edges", "rims", "channels", "outlets"] as const;
function frame(t: number) {
  const pitch = 0.65 + Math.sin(t * 0.19) * 0.055;
  const yaw = -0.23 + Math.sin(t * 0.16) * 0.07;
  const cp = Math.cos(pitch),
    sp = Math.sin(pitch);
  const cy = Math.cos(yaw),
    sy = Math.sin(yaw);
  const project = (p: Point) => {
    const x = p.x * cy - p.y * sy;
    const along = p.x * sy + p.y * cy;
    const y = along * cp - p.z * sp;
    const depth = along * sp + p.z * cp;
    const scale = (1.04 * 1300) / (1300 - depth);
    return { x: 320 + x * scale, y: 334 + y * scale };
  };
  const path = ({ points, closed }: Line) =>
    points
      .map((point, i) => {
        const p = project(point);
        return `${i ? "L" : "M"}${f(p.x)},${f(p.y)}`;
      })
      .join("") + (closed ? "Z" : "");
  const cycle = t * 0.72 + 2.1;
  const signals = Array.from({ length: 3 }, (_, i) => {
    const emitted = Math.floor(cycle) - i;
    const port = ((emitted % PORTS) + PORTS) % PORTS;
    const u = (cycle - emitted) / 3;
    return {
      d: path(
        line(sample(18, (v) => route(port, clamp(u - 0.065 + v * 0.065)))),
      ),
      opacity: f(Math.min(1, u * 20, (1 - u) * 18) * 0.9),
      port,
      u,
    };
  });
  // A small sweep around the hub cues the next destination; arrival lights mark delivery.
  const selectorAngle = (cycle - 0.2) * STEP;
  const selector = path(line(arc(49, 19, selectorAngle, selectorAngle + 0.3)));
  const reflections = [0, 1].map((layer) => {
    const angle = t * 0.21 + layer * Math.PI;
    return path(band(56, 130, 12.4, angle, angle + 0.033));
  });
  const projected = Object.fromEntries(
    KEYS.map((key) => [key, MODEL[key].map(path)]),
  ) as Record<(typeof KEYS)[number], string[]>;
  return {
    ...projected,
    signals,
    selector,
    reflections,
    arrivals: Array.from({ length: PORTS }, (_, port) =>
      f(
        0.17 +
          signals.reduce(
            (light, signal) =>
              light +
              (signal.port === port
                ? Math.exp(-(((signal.u - 0.92) / 0.075) ** 2)) * 0.8
                : 0),
            0,
          ),
      ),
    ),
  };
}

const FIRST = frame(0);
type Nodes = Record<
  (typeof KEYS)[number] | "signals" | "reflections" | "selector",
  SVGPathElement[]
>;
const cache = new WeakMap<SVGSVGElement, Nodes>();
function update(svg: SVGSVGElement, t: number) {
  let nodes = cache.get(svg);
  if (!nodes) {
    const all = (key: string) =>
      Array.from(svg.querySelectorAll<SVGPathElement>(`[data-ergo-${key}]`));
    nodes = {
      skins: all("skins"),
      mesh: all("mesh"),
      edges: all("edges"),
      rims: all("rims"),
      channels: all("channels"),
      outlets: all("outlets"),
      signals: all("signals"),
      reflections: all("reflections"),
      selector: all("selector"),
    };
    cache.set(svg, nodes);
  }
  const pose = frame(t);
  for (const key of KEYS)
    pose[key].forEach((d, i) => nodes![key][i].setAttribute("d", d));
  nodes.outlets.forEach((node, i) =>
    node.setAttribute("opacity", pose.arrivals[i]),
  );
  nodes.signals.forEach((node, i) => {
    const signal = pose.signals[i % pose.signals.length];
    node.setAttribute("d", signal.d);
    node.setAttribute("opacity", signal.opacity);
  });
  nodes.reflections.forEach((node, i) =>
    node.setAttribute("d", pose.reflections[i]),
  );
  nodes.selector.forEach((node) => node.setAttribute("d", pose.selector));
}

/** A radial glass distributor: one central intake, eight distinct receiving chambers. */
export function ErgoStudy({ paused = false, className }: StudyProps) {
  const ref = useRef<SVGSVGElement>(null);
  const id = `ergo-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
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
        <linearGradient id={`${id}-glass`} x1="0" y1="0" x2=".9" y2="1">
          <stop stopColor="#c5d7df" stopOpacity=".025" />
          <stop offset=".36" stopColor="#b1c5d5" stopOpacity=".11" />
          <stop offset=".6" stopColor="#919dac" stopOpacity=".025" />
          <stop offset=".85" stopColor="#b4aaca" stopOpacity=".075" />
          <stop offset="1" stopColor="#d6d0bd" stopOpacity=".03" />
        </linearGradient>
        <linearGradient id={`${id}-edge`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#b3cbd6" stopOpacity=".65" />
          <stop offset=".4" stopColor="#a8b8cc" stopOpacity=".23" />
          <stop offset=".7" stopColor="#d2ccdc" stopOpacity=".62" />
          <stop offset="1" stopColor="#c4c9c5" stopOpacity=".32" />
        </linearGradient>
        <linearGradient
          id={`${id}-spectrum`}
          gradientUnits="userSpaceOnUse"
          x1="139"
          y1="195"
          x2="505"
          y2="498"
        >
          <stop stopColor="#a8c8bc" />
          <stop offset=".32" stopColor="#a2bdd9" />
          <stop offset=".64" stopColor="#b6a7cd" />
          <stop offset=".84" stopColor="#cab0bf" />
          <stop offset="1" stopColor="#d0c7a8" />
        </linearGradient>
      </defs>
      <g fill={`url(#${id}-glass)`}>
        {FIRST.skins.map((d, i) => (
          <path key={i} data-ergo-skins d={d} />
        ))}
      </g>
      <g stroke={`url(#${id}-edge)`} strokeWidth=".5" opacity=".4">
        {FIRST.mesh.map((d, i) => (
          <path key={i} data-ergo-mesh d={d} />
        ))}
      </g>
      <g stroke={`url(#${id}-spectrum)`} strokeWidth=".65" opacity=".4">
        {FIRST.edges.map((d, i) => (
          <path key={i} data-ergo-edges d={d} />
        ))}
      </g>
      <g stroke={`url(#${id}-edge)`} strokeWidth=".75" opacity=".9">
        {FIRST.rims.map((d, i) => (
          <path key={i} data-ergo-rims d={d} />
        ))}
      </g>
      <g stroke={`url(#${id}-spectrum)`} strokeWidth=".7" opacity=".2">
        {FIRST.channels.map((d, i) => (
          <path key={i} data-ergo-channels d={d} />
        ))}
      </g>
      <g fill={`url(#${id}-spectrum)`} opacity=".09">
        {FIRST.reflections.map((d, i) => (
          <path key={i} data-ergo-reflections d={d} />
        ))}
      </g>
      <g
        stroke={`url(#${id}-spectrum)`}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path
          data-ergo-selector
          d={FIRST.selector}
          strokeWidth="1.2"
          opacity=".65"
        />
        {FIRST.outlets.map((d, i) => (
          <path
            key={i}
            data-ergo-outlets
            d={d}
            strokeWidth="1.8"
            opacity={FIRST.arrivals[i]}
          />
        ))}
        {[3.5, 1.35].map((width, layer) => (
          <g key={width} strokeWidth={width} strokeOpacity={layer ? 1 : 0.14}>
            {FIRST.signals.map((signal, i) => (
              <path
                key={i}
                data-ergo-signals
                d={signal.d}
                opacity={signal.opacity}
              />
            ))}
          </g>
        ))}
      </g>
    </svg>
  );
}
