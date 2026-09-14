import type {
  ProofFrame,
  ProofLabel,
  ProofPath,
  ProofTone,
} from "../proof-work/proof-geometry";

export type Point3 = readonly [number, number, number];
export type Point2 = readonly [number, number];
export type Project3 = (point: Point3) => Point2;
type Style = Partial<
  Pick<
    ProofPath,
    | "kind"
    | "opacity"
    | "tone"
    | "material"
    | "fillOpacity"
    | "dashArray"
    | "fillColor"
    | "strokeOpacity"
  >
>;

/** A fixed orthographic camera. x/y form the bench; z is height above it. */
export function spatialCamera(
  origin: Point2,
  { yaw = -0.32, pitch = 0.85, scale = 1 } = {},
): Project3 {
  const cy = Math.cos(yaw),
    sy = Math.sin(yaw),
    sp = Math.sin(pitch),
    cp = Math.cos(pitch);
  return ([x, y, z]) => [
    origin[0] + scale * (cy * x - sy * y),
    origin[1] + scale * (sp * (sy * x + cy * y) - cp * z),
  ];
}

function spatialPathData(points: readonly Point2[], closed: boolean) {
  return (
    points
      .map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(3)} ${y.toFixed(3)}`)
      .join(" ") + (closed ? " Z" : "")
  );
}

/** One exact last-value snapshot per path ID, never one entry per clock tick.
 * Styles are deliberately excluded: only coordinate serialization is reused. */
export function createSpatialPathCache(capacity = 4096) {
  const entries = new Map<
    string,
    { coordinates: number[]; closed: boolean; data: string }
  >();
  return (id: string, points: readonly Point2[], closed: boolean): string => {
    const previous = entries.get(id);
    let unchanged =
      previous !== undefined &&
      previous.closed === closed &&
      previous.coordinates.length === points.length * 2;
    if (unchanged && previous) {
      for (let i = 0; i < points.length; i++) {
        if (
          !Object.is(previous.coordinates[i * 2], points[i][0]) ||
          !Object.is(previous.coordinates[i * 2 + 1], points[i][1])
        ) {
          unchanged = false;
          break;
        }
      }
      if (unchanged) return previous.data;
    }
    const data = spatialPathData(points, closed);
    if (previous || entries.size < capacity) {
      const coordinates = previous?.coordinates ?? [];
      coordinates.length = points.length * 2;
      for (let i = 0; i < points.length; i++) {
        coordinates[i * 2] = points[i][0];
        coordinates[i * 2 + 1] = points[i][1];
      }
      if (previous) {
        previous.closed = closed;
        previous.data = data;
      } else entries.set(id, { coordinates, closed, data });
    }
    return data;
  };
}

export function spatialDrawing(
  pathCache?: ReturnType<typeof createSpatialPathCache>,
): ProofFrame & {
  line: (
    id: string,
    points: readonly Point2[],
    style?: Style,
    closed?: boolean,
  ) => void;
  face: (
    id: string,
    points: readonly Point2[],
    material?: ProofPath["material"],
    opacity?: number,
    tone?: ProofTone,
  ) => void;
  solid: (
    id: string,
    project: Project3,
    at: Point3,
    size: Point3,
    style?: Style,
  ) => void;
  label: (
    id: string,
    text: string,
    x: number,
    y: number,
    style?: Partial<ProofLabel>,
  ) => void;
  surfaceLabel: (
    id: string,
    text: string,
    project: Project3,
    at: Point3,
    style?: Partial<ProofLabel>,
    axes?: readonly [Point3, Point3],
  ) => void;
} {
  const paths: ProofPath[] = [],
    labels: ProofLabel[] = [];
  const line = (
    id: string,
    points: readonly Point2[],
    style: Style = {},
    closed = false,
  ) => {
    paths.push({
      id,
      d: pathCache
        ? pathCache(id, points, closed)
        : spatialPathData(points, closed),
      kind: "fine",
      opacity: 0.65,
      ...style,
    });
  };
  const face = (
    id: string,
    points: readonly Point2[],
    material: ProofPath["material"] = "metal",
    opacity = 0.85,
    tone?: ProofTone,
  ) => line(id, points, { kind: "glass", material, opacity, tone }, true);
  const solid = (
    id: string,
    project: Project3,
    [x, y, z]: Point3,
    [w, d, h]: Point3,
    style: Style = {},
  ) => {
    const p = (a: number, b: number, c: number) =>
      project([x + a, y + b, z + c]);
    const { opacity = 0.88, material = "metal", tone } = style;
    // Fixed painter ordering keeps the near faces opaque and the topology stable.
    face(
      `${id}-far`,
      [p(0, d, 0), p(w, d, 0), p(w, d, h), p(0, d, h)],
      material,
      opacity * 0.55,
      tone,
    );
    face(
      `${id}-side`,
      [p(w, 0, 0), p(w, d, 0), p(w, d, h), p(w, 0, h)],
      material,
      opacity * 0.68,
      tone,
    );
    face(
      `${id}-front`,
      [p(0, 0, 0), p(w, 0, 0), p(w, 0, h), p(0, 0, h)],
      material,
      opacity * 0.82,
      tone,
    );
    face(
      `${id}-left`,
      [p(0, 0, 0), p(0, d, 0), p(0, d, h), p(0, 0, h)],
      material,
      opacity * 0.68,
      tone,
    );
    face(
      `${id}-top`,
      [p(0, 0, h), p(w, 0, h), p(w, d, h), p(0, d, h)],
      material,
      opacity,
      tone,
    );
    line(`${id}-rim`, [p(0, 0, h), p(w, 0, h), p(w, d, h)], {
      kind: "edge",
      opacity: Math.min(1, opacity * 1.08),
      tone,
    });
  };
  const label = (
    id: string,
    text: string,
    x: number,
    y: number,
    style: Partial<ProofLabel> = {},
  ) =>
    labels.push({ id, text, x, y, kind: "small", anchor: "start", ...style });
  const surfaceLabel = (
    id: string,
    text: string,
    project: Project3,
    at: Point3,
    style: Partial<ProofLabel> = {},
    axes: readonly [Point3, Point3] = [
      [1, 0, 0],
      [0, 1, 0],
    ],
  ) => {
    const origin = project(at);
    const point = (v: Point3) =>
      project([at[0] + v[0], at[1] + v[1], at[2] + v[2]]);
    const u = point(axes[0]),
      v = point(axes[1]);
    label(id, text, 0, 0, {
      surface: id,
      transform: `matrix(${(u[0] - origin[0]).toFixed(5)} ${(u[1] - origin[1]).toFixed(5)} ${(v[0] - origin[0]).toFixed(5)} ${(v[1] - origin[1]).toFixed(5)} ${origin[0].toFixed(3)} ${origin[1].toFixed(3)})`,
      ...style,
    });
  };
  return { paths, labels, line, face, solid, label, surfaceLabel };
}

/** A repeating activity sweep vanishes at its seam; it never changes state. */
export function spatialPulse(time: number, speed = 0.22, offset = 0) {
  const progress = (((Math.max(0, time) * speed + offset) % 1) + 1) % 1;
  return { progress, opacity: Math.min(1, progress * 10, (1 - progress) * 10) };
}
