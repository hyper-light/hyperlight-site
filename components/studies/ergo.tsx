"use client";

import { useId, useRef } from "react";
import {
  useStudyMotion,
  type StudyProps,
} from "@/components/studies/use-study-motion";

type Point = { x: number; y: number; z: number };
type Skin = { d: string; depth: number; opacity: string };
const TAU = Math.PI * 2;
const f = (n: number) => n.toFixed(2);
const sample = (count: number, point: (u: number) => Point) =>
  Array.from({ length: count + 1 }, (_, i) => point(i / count));
const path = (points: Point[], closed = false) =>
  points.map((p, i) => `${i ? "L" : "M"}${f(p.x)},${f(p.y)}`).join("") +
  (closed ? "Z" : "");
const add = (a: Point, b: Point): Point => ({
  x: a.x + b.x,
  y: a.y + b.y,
  z: a.z + b.z,
});
const mul = (p: Point, k: number): Point => ({
  x: p.x * k,
  y: p.y * k,
  z: p.z * k,
});
const unit = (p: Point) => mul(p, 1 / Math.hypot(p.x, p.y, p.z));
const cross = (a: Point, b: Point): Point => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
});
const ENDS: Point[] = [
  { x: 179, y: -128, z: 24 },
  { x: 205, y: -39, z: -32 },
  { x: 201, y: 57, z: 30 },
  { x: 162, y: 145, z: -8 },
];
const CONTROLS: Point[][] = [
  [
    { x: -199, y: -79, z: 28 },
    { x: -89, y: -165, z: 15 },
    { x: -120, y: 0, z: -14 },
    { x: -43, y: 0, z: 0 },
  ],
  ...ENDS.map((end) => [
    { x: 43, y: 0, z: 0 },
    { x: 97, y: end.y * 0.11, z: -end.z },
    { x: 107, y: end.y * 1.13, z: end.z * 1.7 },
    end,
  ]),
];

function conduit(index: number, u: number, t: number): Point {
  const [p0, p1, p2, p3] = CONTROLS[index];
  const v = 1 - u;
  const a = v ** 3,
    b = 3 * v * v * u,
    c = 3 * v * u * u,
    d = u ** 3;
  const envelope = Math.sin(Math.PI * u) ** 2;
  return {
    x: p0.x * a + p1.x * b + p2.x * c + p3.x * d,
    y:
      p0.y * a +
      p1.y * b +
      p2.y * c +
      p3.y * d +
      envelope * Math.sin(u * TAU + index * 1.2 - t * 0.32) * 4,
    z:
      p0.z * a +
      p1.z * b +
      p2.z * c +
      p3.z * d +
      envelope * Math.sin(u * TAU + index * 1.5 - t * 0.26) * 12,
  };
}

function frame(t: number) {
  const yaw = -0.59 + Math.sin(t * 0.21) * 0.075;
  const roll = -0.19 + Math.sin(t * 0.17) * 0.035;
  const pitch = 0.12 + Math.sin(t * 0.23) * 0.035;
  const cy = Math.cos(yaw),
    sy = Math.sin(yaw);
  const cr = Math.cos(roll),
    sr = Math.sin(roll);
  const cp = Math.cos(pitch),
    sp = Math.sin(pitch);
  const project = (p: Point): Point => {
    const x = p.x * cy + p.z * sy;
    const z = p.z * cy - p.x * sy;
    const y = p.y * cp - z * sp;
    const depth = z * cp + p.y * sp;
    const perspective = 1100 / (1100 - depth);
    return {
      x: 314 + (x * cr - y * sr) * perspective,
      y: 328 + (x * sr + y * cr) * perspective,
      z: depth,
    };
  };
  const skins: Skin[] = [];
  const rails: string[] = [];
  const mesh: string[] = [];
  const rims: string[] = [];
  const reflections: string[] = [];
  const cores: string[] = [];
  const skin = (points: Point[], opacity: number) =>
    skins.push({
      d: path(points, true),
      depth: points.reduce((sum, p) => sum + p.z, 0) / points.length,
      opacity: f(opacity),
    });

  // Closed cross-sections follow the tangent, so the glass has thickness at every bend.
  for (let tube = 0; tube < 5; tube++) {
    const stations = new Map<
      number,
      { center: Point; normal: Point; binormal: Point; radius: number }
    >();
    const ring = (u: number, angle: number, radiusScale = 1) => {
      let station = stations.get(u);
      if (!station) {
        const a = conduit(tube, Math.max(0, u - 0.001), t);
        const b = conduit(tube, Math.min(1, u + 0.001), t);
        const tangent = unit(add(b, mul(a, -1)));
        const normal = unit(cross(tangent, { x: 0, y: 0, z: 1 }));
        station = {
          center: conduit(tube, u, t),
          normal,
          binormal: cross(tangent, normal),
          radius: (tube === 0 ? 11 : 7.2) * (1 + 0.16 * Math.sin(u * Math.PI)),
        };
        stations.set(u, station);
      }
      const { center, normal, binormal } = station;
      const radius = station.radius * radiusScale;
      return project(
        add(
          center,
          add(
            mul(normal, Math.cos(angle) * radius),
            mul(binormal, Math.sin(angle) * radius),
          ),
        ),
      );
    };
    const rows = Array.from({ length: 9 }, (_, i) =>
      sample(32, (u) => ring(u, (i / 8) * TAU)),
    );
    for (let i = 0; i < 8; i++)
      skin([...rows[i], ...rows[i + 1].toReversed()], 0.42);
    rails.push(
      rows
        .filter((_, i) => i % 2 === 0)
        .map((row) => path(row))
        .join(""),
    );
    mesh.push(
      Array.from({ length: 13 }, (_, i) =>
        path(
          sample(24, (u) => ring(0.045 + (i / 12) * 0.91, u * TAU)),
          true,
        ),
      ).join(""),
    );
    const end = tube === 0 ? 0 : 1;
    rims.push(
      [1, 0.72]
        .map((scale) =>
          path(
            sample(48, (u) => ring(end, u * TAU, scale)),
            true,
          ),
        )
        .join(""),
    );
    rims.push(
      path(
        sample(48, (u) => ring(tube === 0 ? 0.028 : 0.972, u * TAU)),
        true,
      ),
    );
    reflections.push(
      path(
        [
          ...sample(32, (u) =>
            ring(u, 0.83 + 0.19 * Math.sin(t * 0.41 + u * 3 + tube)),
          ),
          ...sample(32, (u) =>
            ring(u, 1.02 + 0.19 * Math.sin(t * 0.41 + u * 3 + tube)),
          ).toReversed(),
        ],
        true,
      ),
    );
    cores.push(path(sample(64, (u) => project(conduit(tube, u, t)))));
  }

  // Three bowed optical leaves form a translucent manifold, with open space between layers.
  for (let layer = -1; layer <= 1; layer++) {
    const leaf = (radius: number, theta: number, back = false): Point => {
      const angle = theta + layer * 0.07 + 0.035 * Math.sin(t * 0.29);
      const profile = 1 + 0.085 * Math.cos(angle * 3 + layer * 0.28);
      return project({
        x:
          layer * 21 +
          (back ? -1 : 1) * 17 * Math.sqrt(Math.max(0, 1 - radius * radius)),
        y: Math.cos(angle) * radius * 90 * profile,
        z: Math.sin(angle) * radius * 76 * profile,
      });
    };
    for (let facet = 0; facet < 12; facet++) {
      const a = (facet / 12) * TAU;
      const b = ((facet + 1) / 12) * TAU;
      skin(
        [
          ...sample(12, (u) => leaf(u, a)),
          ...sample(5, (u) => leaf(1, a + (b - a) * u)),
          ...sample(12, (u) => leaf(1 - u, b)),
        ],
        0.36,
      );
    }
    rails.push(
      path(
        sample(72, (u) => leaf(1, u * TAU)),
        true,
      ),
    );
    mesh.push(
      Array.from({ length: 6 }, (_, i) =>
        path(
          sample(64, (u) => leaf(0.16 + i * 0.14, u * TAU)),
          true,
        ),
      ).join(""),
    );
    mesh.push(
      Array.from({ length: 18 }, (_, i) =>
        path(sample(16, (u) => leaf(u, (i / 18) * TAU))),
      ).join(""),
    );
    rims.push(
      path(
        sample(72, (u) => leaf(0.98, u * TAU, true)),
        true,
      ),
    );
    for (let band = 0; band < 5; band++) {
      const angle = t * 0.19 + layer * 0.67 + band * 0.024;
      reflections.push(
        path(
          [
            ...sample(24, (u) => leaf(0.1 + 0.87 * u, angle + u * 0.8)),
            ...sample(24, (u) =>
              leaf(0.1 + 0.87 * u, angle + u * 0.8 + 0.018),
            ).toReversed(),
          ],
          true,
        ),
      );
    }
  }

  // One packet follows a whole connected path; its next pass selects a different outlet.
  const order = [0, 2, 1, 3];
  const cycle = t * 0.29 + 0.18;
  const outlet = order[Math.floor(cycle) % order.length];
  const progress = cycle % 1;
  const route = (u: number): Point => {
    if (u < 0.4) return project(conduit(0, u / 0.4, t));
    if (u > 0.57) return project(conduit(outlet + 1, (u - 0.57) / 0.43, t));
    const v = (u - 0.4) / 0.17;
    return project({
      x: -43 + v * 86,
      y: Math.sin(v * Math.PI) * (outlet - 1.5) * 4,
      z: Math.sin(v * Math.PI) * 8,
    });
  };
  const pulse = path(
    sample(14, (u) =>
      route(Math.max(0, Math.min(1, progress - 0.037 + u * 0.037))),
    ),
  );
  const opacity = f(
    Math.min(1, progress / 0.035, (1 - progress) / 0.035) * 0.85,
  );
  const inner = Array.from({ length: 4 }, (_, outlet) =>
    path(
      sample(24, (u) =>
        project({
          x: -43 + u * 86,
          y: Math.sin(u * Math.PI) * (outlet - 1.5) * 4,
          z: Math.sin(u * Math.PI) * 8,
        }),
      ),
    ),
  ).join("");
  return {
    skins: skins.sort((a, b) => a.depth - b.depth),
    rails,
    mesh,
    rims,
    reflections,
    cores,
    pulse,
    opacity,
    inner,
  };
}

const FIRST = frame(0);
const KEYS = [
  "skins",
  "rails",
  "mesh",
  "rims",
  "reflections",
  "cores",
] as const;
type Nodes = Record<
  (typeof KEYS)[number] | "pulse" | "inner",
  SVGPathElement[]
> & { spectrum: SVGLinearGradientElement };
const cache = new WeakMap<SVGSVGElement, Nodes>();
function update(svg: SVGSVGElement, t: number) {
  let nodes = cache.get(svg);
  if (!nodes) {
    const all = (key: string) =>
      Array.from(svg.querySelectorAll<SVGPathElement>(`[data-ergo-${key}]`));
    nodes = {
      skins: all("skins"),
      rails: all("rails"),
      mesh: all("mesh"),
      rims: all("rims"),
      reflections: all("reflections"),
      cores: all("cores"),
      pulse: all("pulse"),
      inner: all("inner"),
      spectrum: svg.querySelector<SVGLinearGradientElement>(
        "[data-ergo-spectrum]",
      )!,
    };
    cache.set(svg, nodes);
  }
  const elements = nodes;
  const pose = frame(t);
  KEYS.forEach((key) =>
    pose[key].forEach((value, i) => {
      elements[key][i].setAttribute(
        "d",
        typeof value === "string" ? value : value.d,
      );
      if (typeof value !== "string")
        elements[key][i].setAttribute("fill-opacity", value.opacity);
    }),
  );
  elements.pulse.forEach((node) => {
    node.setAttribute("d", pose.pulse);
    node.setAttribute("opacity", pose.opacity);
  });
  elements.inner.forEach((node) => node.setAttribute("d", pose.inner));
  elements.spectrum.setAttribute(
    "gradientTransform",
    `rotate(${f(Math.sin(t * 0.17) * 24)} 320 320)`,
  );
}

/** An optical routing sculpture: persistent glass channels carry a moving point of light. */
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
        <linearGradient id={`${id}-glass`} x1=".1" y1="0" x2=".84" y2="1">
          <stop stopColor="#aec5d7" stopOpacity=".07" />
          <stop offset=".29" stopColor="#cfdee7" stopOpacity=".18" />
          <stop offset=".44" stopColor="#829cab" stopOpacity=".015" />
          <stop offset=".78" stopColor="#b7afcf" stopOpacity=".11" />
          <stop offset="1" stopColor="#b8d4cc" stopOpacity=".04" />
        </linearGradient>
        <linearGradient id={`${id}-edge`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#c9d9e5" stopOpacity=".67" />
          <stop offset=".36" stopColor="#9cadc4" stopOpacity=".2" />
          <stop offset=".65" stopColor="#e0e6ec" stopOpacity=".56" />
          <stop offset="1" stopColor="#aabfc8" stopOpacity=".32" />
        </linearGradient>
        <linearGradient
          id={`${id}-spectrum`}
          data-ergo-spectrum
          gradientUnits="userSpaceOnUse"
          x1="137"
          y1="224"
          x2="486"
          y2="430"
        >
          <stop stopColor="#a8c8bc" />
          <stop offset=".32" stopColor="#a2bdd9" />
          <stop offset=".64" stopColor="#b6a7cd" />
          <stop offset=".84" stopColor="#cab0bf" />
          <stop offset="1" stopColor="#d0c7a8" />
        </linearGradient>
        <filter id={`${id}-soft`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation=".8" />
        </filter>
      </defs>
      <g stroke={`url(#${id}-edge)`} strokeWidth=".55" opacity=".31">
        {FIRST.cores.map((d, i) => (
          <path key={i} data-ergo-cores d={d} />
        ))}
        <path data-ergo-inner d={FIRST.inner} />
      </g>
      {FIRST.skins.map((skin, i) => (
        <path
          key={i}
          data-ergo-skins
          d={skin.d}
          fill={`url(#${id}-glass)`}
          fillOpacity={skin.opacity}
        />
      ))}
      <g stroke={`url(#${id}-edge)`} strokeWidth=".52" opacity=".3">
        {FIRST.mesh.map((d, i) => (
          <path key={i} data-ergo-mesh d={d} />
        ))}
      </g>
      <g stroke={`url(#${id}-spectrum)`} strokeWidth=".7" opacity=".49">
        {FIRST.rails.map((d, i) => (
          <path key={i} data-ergo-rails d={d} />
        ))}
      </g>
      <g stroke={`url(#${id}-edge)`} strokeWidth=".72" opacity=".76">
        {FIRST.rims.map((d, i) => (
          <path key={i} data-ergo-rims d={d} />
        ))}
      </g>
      <g fill={`url(#${id}-spectrum)`} opacity=".25">
        {FIRST.reflections.map((d, i) => (
          <path key={i} data-ergo-reflections d={d} />
        ))}
      </g>
      <g stroke={`url(#${id}-spectrum)`} strokeLinecap="round">
        <path
          data-ergo-pulse
          d={FIRST.pulse}
          opacity={FIRST.opacity}
          strokeWidth="3.4"
          filter={`url(#${id}-soft)`}
          strokeOpacity=".27"
        />
        <path
          data-ergo-pulse
          d={FIRST.pulse}
          opacity={FIRST.opacity}
          strokeWidth="1.25"
        />
      </g>
    </svg>
  );
}
