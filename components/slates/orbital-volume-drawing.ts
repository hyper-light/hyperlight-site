import type { ProofTone } from "../proof-work/proof-geometry";
import { spatialDrawing, type Point2, type Point3 } from "./spatial-drawing";

export type OrbitalSurface = "hull" | "armor" | "dark" | "glass" | "light";
export type OrbitalChunkState =
  "complete" | "missing" | "received" | "verified" | "unavailable";
export type OrbitalHardwareOptions = {
  time: number;
  activity: number;
  tone?: ProofTone;
  bayOpen?: number;
  checks?: readonly number[];
  /** 0 is powered; 1 extinguishes activity while retaining the physical hull. */
  disabled?: number;
  chunkState?: OrbitalChunkState;
};

const tint: Record<ProofTone, readonly number[]> = {
  neutral: [178, 201, 221],
  pass: [163, 222, 202],
  pending: [166, 194, 234],
  error: [229, 199, 149],
  fail: [224, 158, 174],
};
const surfaceBase = {
  armor: [79, 95, 110],
  dark: [29, 37, 51],
  glass: [48, 82, 105],
  hull: [61, 78, 98],
};

export function orbitalSurfaceLighting(
  points: readonly Point3[],
  surface: OrbitalSurface,
  accent: ProofTone = "neutral",
) {
  const a = points[0],
    b = points[1],
    c = points[2];
  // Preserve the original operation order without allocating vectors for
  // every face of every frame. The normal, lighting and RGB values are exact.
  const ux = b[0] - a[0],
    uy = b[1] - a[1],
    uz = b[2] - a[2];
  const vx = c[0] - a[0],
    vy = c[1] - a[1],
    vz = c[2] - a[2];
  const nx = uy * vz - uz * vy,
    ny = uz * vx - ux * vz,
    nz = ux * vy - uy * vx;
  const length = Math.hypot(nx, ny, nz) || 1;
  const light = Math.max(0, (-0.45 * nx - 0.55 * ny + nz) / (length * 1.227));
  const base = surface === "light" ? tint[accent] : surfaceBase[surface];
  // Quiet, dark planes keep occlusion and directional depth, while the
  // prismatic wire edges carry the same visual weight as the other studies.
  // Bright flat armor would turn the diagram into a solid-shaded model.
  const power = surface === "light" ? 1 : 0.2 + light * 0.55;
  return {
    fillColor: `rgb(${Math.round(base[0] * power)} ${Math.round(base[1] * power)} ${Math.round(base[2] * power)})`,
    strokeOpacity:
      surface === "light"
        ? 0.55
        : surface === "dark"
          ? 0.24
          : 0.48 + light * 0.45,
  };
}

/** Opaque surfaces share a single oblique camera and a single upper-left light.
 * Small details inherit the exact same planes as their parent hull. */
export function orbitalVolume(
  d: ReturnType<typeof spatialDrawing>,
  id: string,
  center: Point2,
  scale: number,
  options: OrbitalHardwareOptions,
) {
  const disabled = Number.isFinite(options.disabled)
    ? Math.max(0, Math.min(1, options.disabled ?? 0))
    : 0;
  const powered = 1 - disabled;
  const clock = disabled === 1 ? 0 : options.time;
  // Partial outages flicker while fading. Fully offline hardware produces no
  // residual blinking, yet its neutral wire edges still locate the lost node.
  const flicker =
    1 -
    disabled *
      0.82 *
      (0.5 + 0.5 * Math.sin(clock * 27.3)) *
      (0.5 + 0.5 * Math.sin(clock * 11.7 + 1.9));
  const lampPower = powered * powered * flicker;
  const p = ([x, y, z]: Point3): Point2 => [
    center[0] + scale * (0.88 * x + 0.44 * y),
    center[1] + scale * (14 - 0.18 * x + 0.46 * y - 0.85 * z),
  ];
  const face = (
    key: string,
    points: readonly Point3[],
    surface: OrbitalSurface = "hull",
    opacity = 1,
    accent: ProofTone = options.tone ?? "neutral",
  ) => {
    d.line(
      `${id}-${key}`,
      points.map(p),
      {
        kind: surface === "dark" ? "shade" : "glass",
        material:
          surface === "light"
            ? "emissive"
            : surface === "dark"
              ? "silicon"
              : "metal",
        ...orbitalSurfaceLighting(points, surface, accent),
        fillOpacity: 1,
        opacity:
          Math.max(0, Math.min(1, opacity)) *
          (surface === "light" ? lampPower : 1 - disabled * 0.28),
        tone: surface === "light" ? accent : "neutral",
      },
      true,
    );
  };
  const line = (
    key: string,
    points: readonly Point3[],
    opacity = 0.36,
    accent: ProofTone = "neutral",
  ) =>
    d.line(`${id}-${key}`, points.map(p), {
      opacity:
        Math.max(0, Math.min(1, opacity)) *
        (accent === "neutral" ? 1 - disabled * 0.42 : lampPower),
      tone: accent,
      kind: /rim|edge/.test(key) ? "edge" : "fine",
    });
  const box = (
    key: string,
    [x, y, z]: Point3,
    [w, l, h]: Point3,
    surface: OrbitalSurface = "hull",
  ) => {
    face(
      `${key}-left`,
      [
        [x, y + l, z],
        [x, y, z],
        [x, y, z + h],
        [x, y + l, z + h],
      ],
      surface,
    );
    face(
      `${key}-front`,
      [
        [x + w, y + l, z],
        [x, y + l, z],
        [x, y + l, z + h],
        [x + w, y + l, z + h],
      ],
      surface,
    );
    face(
      `${key}-top`,
      [
        [x, y, z + h],
        [x + w, y, z + h],
        [x + w, y + l, z + h],
        [x, y + l, z + h],
      ],
      surface,
    );
    line(
      `${key}-rim`,
      [
        [x, y, z + h],
        [x, y + l, z + h],
        [x + w, y + l, z + h],
      ],
      0.64,
    );
  };
  const wave = (offset = 0, speed = 2) =>
    0.5 + Math.sin(clock * speed + offset) * 0.5;
  return { p, face, line, box, wave };
}
