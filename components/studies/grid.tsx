"use client";

import { useId, useRef } from "react";
import {
  useStudyMotion,
  type StudyProps,
} from "@/components/studies/use-study-motion";

type Point = { x: number; y: number; z: number };
const TAU = Math.PI * 2;
const f = (n: number) => n.toFixed(2);
const clamp = (n: number) => Math.min(1, Math.max(0, n));
const TARGETS = [
  [0.76, -0.57],
  [0.87, -0.16],
  [0.77, 0.47],
  [0.35, 0.79],
  [-0.13, -0.8],
  [-0.56, -0.56],
];
const palette = [
  [151, 188, 198],
  [161, 172, 203],
  [184, 168, 195],
  [202, 193, 178],
  [176, 201, 196],
];

function project(p: Point, time: number) {
  const pitch = 0.73 + Math.sin(time * 0.23) * 0.055;
  const turn = -0.2 + Math.sin(time * 0.19) * 0.035;
  const y = p.y * Math.cos(pitch) - p.z * Math.sin(pitch);
  const depth = p.y * Math.sin(pitch) + p.z * Math.cos(pitch);
  const scale = (1.22 * 1200) / (1200 - depth);
  return {
    x: 319 + (p.x * Math.cos(turn) - y * Math.sin(turn)) * scale,
    y: 325 + (p.x * Math.sin(turn) + y * Math.cos(turn)) * scale,
  };
}

function surface(plane: number, u: number, v: number, time: number): Point {
  const breath = Math.sin(time * 0.38 + u * 1.8 + v) * 3;
  return plane === 0
    ? { x: u * 153, y: v * 123, z: 34 * (u * u - v * v) + breath }
    : {
        x: 22 * u + 28 * v * v,
        y: 119 * u,
        z: 132 * v + 19 * u * u + breath,
      };
}

function path(points: Point[], time: number, close = false) {
  return (
    points
      .map((point, i) => {
        const p = project(point, time);
        return `${i ? "L" : "M"}${f(p.x)},${f(p.y)}`;
      })
      .join("") + (close ? "Z" : "")
  );
}

function boundary(plane: number, time: number, inset = 1) {
  return path(
    Array.from({ length: 97 }, (_, i) => {
      const angle = (i / 96) * TAU;
      const c = Math.cos(angle),
        s = Math.sin(angle);
      return surface(
        plane,
        Math.sign(c) * Math.sqrt(Math.abs(c)) * inset,
        Math.sign(s) * Math.sqrt(Math.abs(s)) * inset,
        time,
      );
    }),
    time,
    true,
  );
}

function mesh(plane: number, index: number, time: number) {
  const alongU = index < 25;
  const fixed = ((index % 25) - 12) / 13;
  const reach = Math.pow(1 - fixed ** 4, 0.25);
  return path(
    Array.from({ length: 29 }, (_, i) => {
      const moving = (i / 14 - 1) * reach;
      return surface(
        plane,
        alongU ? moving : fixed,
        alongU ? fixed : moving,
        time,
      );
    }),
    time,
  );
}

function cubic(a: Point, b: Point, c: Point, d: Point, t: number): Point {
  const s = 1 - t;
  return {
    x: s ** 3 * a.x + 3 * s * s * t * b.x + 3 * s * t * t * c.x + t ** 3 * d.x,
    y: s ** 3 * a.y + 3 * s * s * t * b.y + 3 * s * t * t * c.y + t ** 3 * d.y,
    z: s ** 3 * a.z + 3 * s * s * t * b.z + 3 * s * t * t * c.z + t ** 3 * d.z,
  };
}

function route(index: number, progress: number, time: number) {
  const gate = surface(0, 0, 0, time);
  if (progress <= 0.4)
    return cubic(
      { x: -148, y: 88, z: -30 },
      { x: -108, y: 95, z: -29 },
      { x: -46, y: -3, z: gate.z },
      gate,
      progress / 0.4,
    );
  const [u, v] = TARGETS[index];
  const target = surface(0, u, v, time);
  return cubic(
    gate,
    { x: 39, y: v * 12, z: gate.z + 6 },
    { x: target.x * 0.93, y: target.y * 0.67, z: target.z + 26 },
    { ...target, z: target.z + 1.6 },
    (progress - 0.4) / 0.6,
  );
}

function segment(index: number, start: number, end: number, time: number) {
  return path(
    Array.from({ length: 33 }, (_, i) =>
      route(index, start + ((end - start) * i) / 32, time),
    ),
    time,
  );
}

function aperture(time: number, radius: number) {
  const center = surface(0, 0, 0, time);
  return path(
    Array.from({ length: 65 }, (_, i) => {
      const angle = (i / 64) * TAU;
      return {
        x: center.x + Math.cos(angle) * radius * 0.185,
        y: center.y + Math.cos(angle) * radius,
        z: center.z + Math.sin(angle) * radius,
      };
    }),
    time,
    true,
  );
}

function frame(time: number) {
  const phases = TARGETS.map((_, i) => (time * 0.135 + i / TARGETS.length) % 1);
  const arrival = (phase: number, at: number) =>
    Math.exp(-Math.pow((phase - at) / 0.055, 2));
  return {
    planes: [1, 0].map((plane) => ({
      body: boundary(plane, time),
      rim: boundary(plane, time, 0.982),
      mesh: Array.from({ length: 50 }, (_, i) => mesh(plane, i, time)),
    })),
    routes: [
      segment(0, 0, 0.4, time),
      ...TARGETS.map((_, i) => segment(i, 0.4, 1, time)),
    ],
    packets: phases.map((phase, i) => ({
      d: segment(i, clamp(phase - 0.064), phase, time),
      opacity: f(Math.min(1, phase * 15, (1 - phase) * 20) * 0.84),
    })),
    aperture: [aperture(time, 13), aperture(time, 17.5)],
    gateLight: f(
      0.35 + Math.max(...phases.map((phase) => arrival(phase, 0.4))) * 0.55,
    ),
    endpoints: TARGETS.map(([u, v], i) => ({
      d: path(
        Array.from({ length: 5 }, (_, j) => {
          const angle = (j / 4) * TAU;
          const p = surface(
            0,
            u + Math.cos(angle) * 0.027,
            v + Math.sin(angle) * 0.036,
            time,
          );
          return { ...p, z: p.z + 2 };
        }),
        time,
        true,
      ),
      opacity: f(0.34 + arrival(phases[i], 0.955) * 0.66),
    })),
    colors: palette.map((_, i) => {
      const p = (i + time * 0.17) % palette.length;
      const a = Math.floor(p),
        b = (a + 1) % palette.length;
      return `rgb(${palette[a].map((c, j) => Math.round(c + (palette[b][j] - c) * (p - a))).join(",")})`;
    }),
  };
}

const FIRST = frame(0);
type Nodes = {
  planes: SVGPathElement[][];
  meshes: SVGPathElement[][];
  routes: SVGPathElement[];
  packets: SVGPathElement[];
  aperture: SVGPathElement[];
  endpoints: SVGPathElement[];
  stops: SVGStopElement[];
  reflection: SVGLinearGradientElement | null;
};
const cache = new WeakMap<SVGSVGElement, Nodes>();

function update(svg: SVGSVGElement, time: number) {
  let nodes = cache.get(svg);
  if (!nodes) {
    const planes = Array.from(svg.querySelectorAll("[data-grid-plane]"));
    nodes = {
      planes: planes.map((plane) =>
        Array.from(
          plane.querySelectorAll<SVGPathElement>("[data-grid-boundary]"),
        ),
      ),
      meshes: planes.map((plane) =>
        Array.from(plane.querySelectorAll<SVGPathElement>("[data-grid-mesh]")),
      ),
      routes: Array.from(
        svg.querySelectorAll<SVGPathElement>("[data-grid-route]"),
      ),
      packets: Array.from(
        svg.querySelectorAll<SVGPathElement>("[data-grid-packet]"),
      ),
      aperture: Array.from(
        svg.querySelectorAll<SVGPathElement>("[data-grid-aperture]"),
      ),
      endpoints: Array.from(
        svg.querySelectorAll<SVGPathElement>("[data-grid-endpoint]"),
      ),
      stops: Array.from(
        svg.querySelectorAll<SVGStopElement>("[data-grid-spectrum] stop"),
      ),
      reflection: svg.querySelector("[data-grid-reflection]"),
    };
    cache.set(svg, nodes);
  }
  const pose = frame(time);
  pose.planes.forEach((plane, i) => {
    nodes.planes[i][0].setAttribute("d", plane.body);
    nodes.planes[i][1].setAttribute("d", plane.rim);
    plane.mesh.forEach((d, j) => nodes.meshes[i][j].setAttribute("d", d));
  });
  pose.routes.forEach((d, i) => nodes.routes[i].setAttribute("d", d));
  pose.packets.forEach((packet, i) => {
    nodes.packets[i].setAttribute("d", packet.d);
    nodes.packets[i].setAttribute("opacity", packet.opacity);
  });
  pose.aperture.forEach((d, i) => {
    nodes.aperture[i].setAttribute("d", d);
    nodes.aperture[i].setAttribute("opacity", pose.gateLight);
  });
  pose.endpoints.forEach((endpoint, i) => {
    nodes.endpoints[i].setAttribute("d", endpoint.d);
    nodes.endpoints[i].setAttribute("opacity", endpoint.opacity);
  });
  pose.colors.forEach((color, i) =>
    nodes.stops[i].setAttribute("stop-color", color),
  );
  nodes.reflection?.setAttribute(
    "gradientTransform",
    `translate(${f(Math.sin(time * 0.27) * 45)} ${f(Math.cos(time * 0.27) * 28)})`,
  );
}

/** A conceptual network: curved private spaces, a policy aperture, and routed light. */
export function GridStudy({ paused = false, className }: StudyProps) {
  const ref = useRef<SVGSVGElement>(null);
  const id = `grid-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
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
          id={`${id}-film`}
          data-grid-reflection
          x1="170"
          y1="170"
          x2="460"
          y2="480"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#a8bcc9" stopOpacity=".035" />
          <stop offset=".26" stopColor="#849baa" stopOpacity=".08" />
          <stop offset=".41" stopColor="#cfdae0" stopOpacity=".19" />
          <stop offset=".47" stopColor="#acbecb" stopOpacity=".065" />
          <stop offset=".67" stopColor="#84929f" stopOpacity=".025" />
          <stop offset="1" stopColor="#aabfc7" stopOpacity=".1" />
        </linearGradient>
        <linearGradient
          id={`${id}-silver`}
          x1="175"
          y1="175"
          x2="456"
          y2="473"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#bdd0d9" stopOpacity=".38" />
          <stop offset=".32" stopColor="#a1aebf" stopOpacity=".21" />
          <stop offset=".69" stopColor="#d5dde1" stopOpacity=".44" />
          <stop offset="1" stopColor="#9bb7c2" stopOpacity=".19" />
        </linearGradient>
        <linearGradient
          id={`${id}-spectrum`}
          data-grid-spectrum
          x1="142"
          y1="432"
          x2="477"
          y2="173"
          gradientUnits="userSpaceOnUse"
        >
          {FIRST.colors.map((color, i) => (
            <stop key={i} offset={i / 4} stopColor={color} />
          ))}
        </linearGradient>
        <radialGradient id={`${id}-ambient`}>
          <stop stopColor="#8faec1" stopOpacity=".04" />
          <stop offset="1" stopColor="#8faec1" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse
        cx="320"
        cy="321"
        rx="218"
        ry="194"
        fill={`url(#${id}-ambient)`}
      />
      {FIRST.planes.map((plane, i) => (
        <g key={i} data-grid-plane={i}>
          <path
            data-grid-boundary
            d={plane.body}
            fill={`url(#${id}-film)`}
            stroke={`url(#${id}-silver)`}
            strokeWidth=".7"
          />
          <g
            stroke={`url(#${id}-silver)`}
            strokeWidth=".47"
            opacity={i === 0 ? ".49" : ".62"}
          >
            {plane.mesh.map((d, j) => (
              <path key={j} data-grid-mesh d={d} />
            ))}
          </g>
          <path
            data-grid-boundary
            d={plane.rim}
            stroke={`url(#${id}-spectrum)`}
            strokeWidth=".52"
            opacity=".22"
          />
        </g>
      ))}
      <g stroke={`url(#${id}-spectrum)`} strokeWidth=".75" opacity=".23">
        {FIRST.routes.map((d, i) => (
          <path key={i} data-grid-route d={d} />
        ))}
      </g>
      {FIRST.aperture.map((d, i) => (
        <path
          key={i}
          data-grid-aperture
          d={d}
          stroke={i ? `url(#${id}-silver)` : `url(#${id}-spectrum)`}
          strokeWidth={i ? ".6" : "1.05"}
          opacity={FIRST.gateLight}
        />
      ))}
      <g
        stroke={`url(#${id}-spectrum)`}
        strokeWidth="1.4"
        strokeLinecap="round"
      >
        {FIRST.packets.map((packet, i) => (
          <path
            key={i}
            data-grid-packet
            d={packet.d}
            opacity={packet.opacity}
          />
        ))}
      </g>
      {FIRST.endpoints.map((endpoint, i) => (
        <path
          key={i}
          data-grid-endpoint
          d={endpoint.d}
          stroke={`url(#${id}-spectrum)`}
          strokeWidth=".85"
          fill={`url(#${id}-spectrum)`}
          fillOpacity=".14"
          opacity={endpoint.opacity}
        />
      ))}
    </svg>
  );
}
