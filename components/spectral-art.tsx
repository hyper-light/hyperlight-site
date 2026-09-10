"use client";

import { Fragment, useEffect, useId, useRef } from "react";

type Point = { x: number; y: number; z: number };
type RibbonFrame = {
  points: Float32Array;
  colors: Uint8Array;
  depths: Float32Array;
};

const TAU = Math.PI * 2;
const SEGMENTS = 128;
const WIDTHS = [-1, -0.97, -0.9, -0.8, -0.5, 0, 0.5, 0.97, 1];
const STRIPS = WIDTHS.length - 1;
const TILES = SEGMENTS * STRIPS;
const KEYFRAMES = 84;
const CYCLE_SECONDS = 14;
const FRAME_INTERVAL = 1000 / 30;
const SPECTRUM = [
  [236, 184, 129],
  [221, 145, 161],
  [166, 151, 233],
  [109, 174, 244],
  [121, 211, 209],
  [212, 233, 204],
  [250, 240, 217],
];

function project(angle: number, across: number, phase: number): Point {
  // The surface really turns and flexes in three dimensions; the SVG is its projection.
  const wave = Math.sin(phase);
  const twist = angle * 1.5 + 0.35 + wave * 0.29;
  const width =
    58 * (1 + 0.07 * Math.cos(angle * 2) + 0.035 * Math.sin(phase * 2));
  const radius = 165 + width * across * Math.cos(twist);
  const px = radius * Math.cos(angle);
  const py = radius * Math.sin(angle) * 1.045;
  const pz =
    width * across * Math.sin(twist) +
    8 * (1 - across * across) +
    11 * Math.sin(angle * 2);
  const ax = 0.48 + wave * 0.17;
  const ay = -0.57 + wave * 0.56;
  const az = -0.37 + Math.sin(phase * 2) * 0.055;
  const y = py * Math.cos(ax) - pz * Math.sin(ax);
  const z = py * Math.sin(ax) + pz * Math.cos(ax);
  const x = px * Math.cos(ay) + z * Math.sin(ay);
  const depth = -px * Math.sin(ay) + z * Math.cos(ay);
  const perspective = 850 / (850 - depth);
  return {
    x: 320 + (x * Math.cos(az) - y * Math.sin(az)) * perspective,
    y:
      304 +
      (x * Math.sin(az) + y * Math.cos(az)) * perspective +
      Math.sin(phase * 2) * 5,
    z: depth,
  };
}

function spectralColor(x: number, y: number, phase: number) {
  const projected = Math.max(
    0,
    Math.min(0.9999, ((x - 185) * 270 - (y - 470) * 325) / 178525),
  );
  // Dispersion travels through the material independently of the turning form.
  const position =
    (projected * (SPECTRUM.length - 1) + (phase / TAU) * SPECTRUM.length * 2) %
    SPECTRUM.length;
  const stop = Math.floor(position);
  const fraction = position - stop;
  return SPECTRUM[stop].map(
    (channel, index) =>
      channel +
      (SPECTRUM[(stop + 1) % SPECTRUM.length][index] - channel) * fraction,
  );
}

function makeFrame(phase: number): RibbonFrame {
  const points = new Float32Array((SEGMENTS * 2 + 1) * WIDTHS.length * 3);
  const colors = new Uint8Array(TILES * 3);
  const depths = new Float32Array(TILES);
  for (let row = 0; row <= SEGMENTS * 2; row++) {
    for (let column = 0; column < WIDTHS.length; column++) {
      const point = project(
        (row / (SEGMENTS * 2)) * TAU,
        WIDTHS[column],
        phase,
      );
      const index = (row * WIDTHS.length + column) * 3;
      points[index] = point.x;
      points[index + 1] = point.y;
      points[index + 2] = point.z;
    }
  }
  for (let segment = 0; segment < SEGMENTS; segment++) {
    const start = segment * 2 * WIDTHS.length * 3;
    const middle = start + WIDTHS.length * 3;
    const end = middle + WIDTHS.length * 3;
    const dx = points[end + 15] - points[start + 15];
    const dy = points[end + 16] - points[start + 16];
    const dz = points[end + 17] - points[start + 17];
    const wx = points[middle + 18] - points[middle + 12];
    const wy = points[middle + 19] - points[middle + 13];
    const wz = points[middle + 20] - points[middle + 14];
    const nx = dy * wz - dz * wy;
    const ny = dz * wx - dx * wz;
    const nz = dx * wy - dy * wx;
    const light = Math.abs(
      (-nx * 0.25 - ny * 0.65 + nz * 0.72) / Math.hypot(nx, ny, nz),
    );
    const caustic = Math.pow(
      0.5 +
        Math.cos(((segment + 0.5) / SEGMENTS) * TAU - phase * 2 - 0.8) * 0.5,
      16,
    );
    const base = 11 + light * 16 + Math.pow(light, 9) * 52 + caustic * 18;
    const body = [base, base + 3 + light * 3, base + 5 + light * 4];
    for (let column = 0; column < STRIPS; column++) {
      const tile = segment * STRIPS + column;
      const across = (WIDTHS[column] + WIDTHS[column + 1]) / 2;
      const left = middle + column * 3;
      const right = left + 3;
      const spectrum = spectralColor(
        (points[left] + points[right]) / 2,
        (points[left + 1] + points[right + 1]) / 2,
        phase,
      );
      const dispersion =
        Math.max(0, (-across - 0.79) / 0.21) *
        (0.43 + light * 0.35) *
        (0.9 + caustic * 0.25);
      const edgeLight = across > 0.965 ? 0.2 + light * 0.25 : 0;
      for (let channel = 0; channel < 3; channel++) {
        colors[tile * 3 + channel] = Math.round(
          body[channel] * (1 - dispersion - edgeLight) +
            spectrum[channel] * dispersion +
            [217, 231, 232][channel] * edgeLight,
        );
      }
      depths[tile] = (points[left + 2] + points[right + 2]) / 2;
    }
  }
  return { points, colors, depths };
}

// Only the first pose is needed for SSR. Other poses are cached on demand, so
// reduced-motion users never pay for an animation they will not see.
const FIRST_FRAME = makeFrame(0);
const FRAME_CACHE = new Map<number, RibbonFrame>([[0, FIRST_FRAME]]);
function frameAt(index: number) {
  const key = index % KEYFRAMES;
  let frame = FRAME_CACHE.get(key);
  if (!frame) {
    frame = makeFrame((key / KEYFRAMES) * TAU);
    FRAME_CACHE.set(key, frame);
  }
  return frame;
}

function coordinate(
  a: Float32Array,
  b: Float32Array,
  index: number,
  mix: number,
) {
  return `${(a[index] + (b[index] - a[index]) * mix).toFixed(1)},${(a[index + 1] + (b[index + 1] - a[index + 1]) * mix).toFixed(1)}`;
}

function tilePaths(
  a: Float32Array,
  b: Float32Array,
  tile: number,
  mix: number,
) {
  const column = tile % STRIPS;
  const start = (Math.floor(tile / STRIPS) * 2 * WIDTHS.length + column) * 3;
  const middle = start + WIDTHS.length * 3;
  const end = middle + WIDTHS.length * 3;
  const left = `M${coordinate(a, b, start, mix)}L${coordinate(a, b, middle, mix)}L${coordinate(a, b, end, mix)}`;
  return {
    surface: `${left}L${coordinate(a, b, end + 3, mix)}L${coordinate(a, b, middle + 3, mix)}L${coordinate(a, b, start + 3, mix)}Z`,
    contour: column === 0 || column === 3 || column === 5 ? left : "",
  };
}

function orbitPath(a: Float32Array, b: Float32Array, mix: number) {
  let path = "";
  for (let row = 0; row <= SEGMENTS * 2; row++) {
    path += `${row === 0 ? "M" : "L"}${coordinate(a, b, row * WIDTHS.length * 3, mix)}`;
  }
  return path;
}

function tileColor(a: Uint8Array, b: Uint8Array, tile: number, mix: number) {
  const index = tile * 3;
  return `rgb(${Math.round(a[index] + (b[index] - a[index]) * mix)},${Math.round(a[index + 1] + (b[index + 1] - a[index + 1]) * mix)},${Math.round(a[index + 2] + (b[index + 2] - a[index + 2]) * mix)})`;
}

const FIRST_ORDER = Array.from({ length: TILES }, (_, index) => index).sort(
  (a, b) => FIRST_FRAME.depths[a] - FIRST_FRAME.depths[b],
);
const FIRST_TILES = FIRST_ORDER.map((tile) => ({
  ...tilePaths(FIRST_FRAME.points, FIRST_FRAME.points, tile, 0),
  color: tileColor(FIRST_FRAME.colors, FIRST_FRAME.colors, tile, 0),
}));
const FIRST_ORBIT = orbitPath(FIRST_FRAME.points, FIRST_FRAME.points, 0);

/** An evolving glass ribbon with three half twists and traveling refracted light. */
export function SpectralArt({
  paused = false,
  className,
}: {
  paused?: boolean;
  className?: string;
}) {
  const id = useId().replaceAll(":", "");
  const svgRef = useRef<SVGSVGElement>(null);
  const timeRef = useRef(0);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const surfaces = Array.from(
      svg.querySelectorAll<SVGPathElement>("[data-ribbon-surface]"),
    );
    const contours = Array.from(
      svg.querySelectorAll<SVGPathElement>("[data-ribbon-contour]"),
    );
    const edgePaths = Array.from(
      svg.querySelectorAll<SVGPathElement>("[data-ribbon-edge]"),
    );
    const lightPaths = Array.from(
      svg.querySelectorAll<SVGPathElement>("[data-ribbon-light]"),
    );
    const order = [...FIRST_ORDER];
    const depths = new Float32Array(TILES);
    const colors = surfaces.map((surface) => surface.getAttribute("color"));
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let visible = true;
    let request = 0;
    let previous = 0;
    let lastPaint = 0;

    const animate = (now: number) => {
      request = window.requestAnimationFrame(animate);
      if (previous) timeRef.current += Math.min(now - previous, 100) / 1000;
      previous = now;
      if (now - lastPaint < FRAME_INTERVAL) return;
      lastPaint = now - ((now - lastPaint) % FRAME_INTERVAL);
      const time = timeRef.current;
      const position = ((time % CYCLE_SECONDS) / CYCLE_SECONDS) * KEYFRAMES;
      const index = Math.floor(position);
      const mix = position - index;
      const a = frameAt(index);
      const b = frameAt(index + 1);
      for (let tile = 0; tile < TILES; tile++)
        depths[tile] = a.depths[tile] + (b.depths[tile] - a.depths[tile]) * mix;
      order.sort((left, right) => depths[left] - depths[right]);

      // Fixed drawing slots are repainted in depth order. No DOM reordering,
      // React renders or layout measurements are needed during playback.
      for (let slot = 0; slot < TILES; slot++) {
        const tile = order[slot];
        const paths = tilePaths(a.points, b.points, tile, mix);
        surfaces[slot].setAttribute("d", paths.surface);
        contours[slot].setAttribute("d", paths.contour);
        const color = tileColor(a.colors, b.colors, tile, mix);
        if (color !== colors[slot]) {
          surfaces[slot].setAttribute("color", color);
          colors[slot] = color;
        }
      }
      const orbit = orbitPath(a.points, b.points, mix);
      for (const edge of edgePaths) edge.setAttribute("d", orbit);
      for (const light of lightPaths)
        light.setAttribute("stroke-dashoffset", String(-time * 77));
    };

    const sync = () => {
      window.cancelAnimationFrame(request);
      previous = 0;
      lastPaint = 0;
      if (!paused && !reducedMotion.matches && !document.hidden && visible) {
        request = window.requestAnimationFrame(animate);
      }
    };
    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        sync();
      },
      { rootMargin: "40px" },
    );
    observer.observe(svg);
    reducedMotion.addEventListener("change", sync);
    document.addEventListener("visibilitychange", sync);
    sync();
    return () => {
      window.cancelAnimationFrame(request);
      observer.disconnect();
      reducedMotion.removeEventListener("change", sync);
      document.removeEventListener("visibilitychange", sync);
    };
  }, [paused]);

  return (
    <svg
      ref={svgRef}
      className={className}
      viewBox="0 0 640 640"
      fill="none"
      aria-hidden="true"
      focusable="false"
      style={{
        display: "block",
        width: "100%",
        height: "auto",
        overflow: "visible",
      }}
    >
      <defs>
        <linearGradient
          id={`${id}-spectrum`}
          x1="185"
          y1="470"
          x2="455"
          y2="145"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#ecb881" />
          <stop offset=".17" stopColor="#dd91a1" />
          <stop offset=".37" stopColor="#a697e9" />
          <stop offset=".56" stopColor="#6daef4" />
          <stop offset=".76" stopColor="#79d3d1" />
          <stop offset=".9" stopColor="#d4e9cc" />
          <stop offset="1" stopColor="#faf0d9" />
        </linearGradient>
        <linearGradient
          id={`${id}-silver`}
          x1="218"
          y1="122"
          x2="454"
          y2="499"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#f4eee1" stopOpacity=".9" />
          <stop offset=".3" stopColor="#c0d2dd" stopOpacity=".21" />
          <stop offset=".58" stopColor="#d3e9ed" stopOpacity=".7" />
          <stop offset=".81" stopColor="#e9dfd5" stopOpacity=".26" />
          <stop offset="1" stopColor="#d2ae96" stopOpacity=".65" />
        </linearGradient>
        <radialGradient id={`${id}-halo`}>
          <stop stopColor="#78a8bf" stopOpacity=".3" />
          <stop offset=".4" stopColor="#6179a3" stopOpacity=".12" />
          <stop offset="1" stopColor="#6179a3" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}-ambient`}>
          <stop stopColor="#3a4851" stopOpacity=".15" />
          <stop offset="1" stopColor="#172027" stopOpacity="0" />
        </radialGradient>
        <filter
          id={`${id}-glow`}
          x="-20%"
          y="-20%"
          width="140%"
          height="140%"
          colorInterpolationFilters="sRGB"
        >
          <feGaussianBlur stdDeviation="2.5" />
        </filter>
      </defs>
      <ellipse
        cx="331"
        cy="306"
        rx="253"
        ry="254"
        fill={`url(#${id}-ambient)`}
      />
      <ellipse
        cx="325"
        cy="556"
        rx="158"
        ry="24"
        fill={`url(#${id}-halo)`}
        opacity=".34"
      />
      <g>
        {FIRST_TILES.map((tile, slot) => (
          <Fragment key={slot}>
            <path
              data-ribbon-surface=""
              d={tile.surface}
              color={tile.color}
              fill="currentColor"
              stroke="currentColor"
              strokeWidth=".55"
              strokeLinejoin="round"
            />
            <path
              data-ribbon-contour=""
              d={tile.contour}
              stroke={`url(#${id}-silver)`}
              strokeWidth=".6"
              opacity=".15"
            />
          </Fragment>
        ))}
        <path
          data-ribbon-edge=""
          data-ribbon-light=""
          d={FIRST_ORBIT}
          pathLength="1000"
          stroke={`url(#${id}-spectrum)`}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray="115 355 35 495"
          opacity=".66"
          filter={`url(#${id}-glow)`}
        />
        <path
          data-ribbon-edge=""
          data-ribbon-light=""
          d={FIRST_ORBIT}
          pathLength="1000"
          stroke={`url(#${id}-spectrum)`}
          strokeWidth="1.65"
          strokeLinecap="round"
          strokeDasharray="115 355 35 495"
          opacity=".96"
        />
        <path
          data-ribbon-edge=""
          data-ribbon-light=""
          d={FIRST_ORBIT}
          pathLength="1000"
          stroke="#fff5e7"
          strokeWidth=".8"
          strokeLinecap="round"
          strokeDasharray="65 405 18 512"
          opacity=".8"
        />
      </g>
    </svg>
  );
}
