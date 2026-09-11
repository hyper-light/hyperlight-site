import type { ProofPath, ProofTone } from "./proof-geometry";

export type ActivityPoint3 = [number, number, number];
export type ActivityPoint2 = [number, number];
type Project = (point: ActivityPoint3) => ActivityPoint2;
const TAU = Math.PI * 2;
const CYCLE = 10;
const clamp = (value: number) => Math.max(0, Math.min(1, value));
const smooth = (value: number) => value * value * (3 - 2 * value);
const mix = (a: number, b: number, amount: number) => a + (b - a) * amount;
const norm = (point: ActivityPoint3): ActivityPoint3 => {
  const length = Math.hypot(...point);
  return length > 1e-12
    ? (point.map((value) => value / length) as ActivityPoint3)
    : [0, 0, 1];
};

/** Shortest surface-following route with radial clearance, never a world-space
 * chord through the planet. Endpoint radii are preserved exactly. */
export function sphericalRoutePoint(
  start: ActivityPoint3,
  end: ActivityPoint3,
  progress: number,
  lift: number,
): ActivityPoint3 {
  const t = clamp(Number.isFinite(progress) ? progress : 0);
  if (t === 0) return [...start];
  if (t === 1) return [...end];
  const a = norm(start),
    b = norm(end);
  const dot = Math.max(
    -1,
    Math.min(
      1,
      a.reduce((sum, value, index) => sum + value * b[index], 0),
    ),
  );
  let unit: ActivityPoint3;
  if (dot > 0.9995)
    unit = norm(
      a.map((value, index) => mix(value, b[index], t)) as ActivityPoint3,
    );
  else if (dot < -0.9995) {
    const axis: ActivityPoint3 = Math.abs(a[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
    const toward = b.map(
      (value, index) => value - a[index] * dot,
    ) as ActivityPoint3;
    const tangent = norm(
      Math.hypot(...toward) > 1e-10
        ? toward
        : [
            a[1] * axis[2] - a[2] * axis[1],
            a[2] * axis[0] - a[0] * axis[2],
            a[0] * axis[1] - a[1] * axis[0],
          ],
    );
    const angle = Math.acos(dot);
    unit = a.map(
      (value, index) =>
        value * Math.cos(angle * t) + tangent[index] * Math.sin(angle * t),
    ) as ActivityPoint3;
  } else {
    const angle = Math.acos(dot),
      denominator = Math.sin(angle);
    unit = a.map(
      (value, index) =>
        (value * Math.sin((1 - t) * angle) + b[index] * Math.sin(t * angle)) /
        denominator,
    ) as ActivityPoint3;
  }
  const radius =
    mix(Math.hypot(...start), Math.hypot(...end), t) +
    Math.max(0, Number.isFinite(lift) ? lift : 0) * Math.sin(Math.PI * t);
  return unit.map((value) => value * radius) as ActivityPoint3;
}

// Unlabelled illustrative clients, not replicas, measured workloads, or actual
// deployment locations. The fourth client in each group is in the south:
// São Paulo, Johannesburg, and Sydney respectively.
const regions = [
  {
    hub: [39, -70],
    extent: [11, 19],
    sites: [
      [42, -75],
      [36, -80],
      [46, -66],
      [-23.55, -46.63],
    ],
  },
  {
    hub: [50, 15],
    extent: [8, 13],
    sites: [
      [52, 9],
      [47, 8],
      [49, 20],
      [-26.2, 28.04],
    ],
  },
  {
    hub: [18, 101],
    extent: [8, 10],
    sites: [
      [21, 100],
      [16, 104],
      [14, 101],
      [-33.87, 151.21],
    ],
  },
] as const;

function globePoint(lat: number, lon: number, radius: number): ActivityPoint3 {
  const latitude = (lat * Math.PI) / 180,
    longitude = ((lon - 18) * Math.PI) / 180;
  return [
    radius * Math.cos(latitude) * Math.sin(longitude),
    -radius * Math.sin(latitude),
    radius * Math.cos(latitude) * Math.cos(longitude),
  ];
}
function axes(point: ActivityPoint3): [ActivityPoint3, ActivityPoint3] {
  const [x, y, z] = norm(point),
    horizontal = Math.hypot(x, z);
  return horizontal > 1e-10
    ? [
        [z / horizontal, 0, -x / horizontal],
        [(-y * x) / horizontal, horizontal, (-y * z) / horizontal],
      ]
    : [
        [1, 0, 0],
        [0, 0, 1],
      ];
}
function tangentPoint(
  center: ActivityPoint3,
  x: number,
  y: number,
): ActivityPoint3 {
  const [east, north] = axes(center);
  return center.map(
    (value, index) => value + east[index] * x + north[index] * y,
  ) as ActivityPoint3;
}
function envelope(time: number, start: number, end: number) {
  const fraction = clamp((time - start) / (end - start));
  return smooth(clamp(fraction / 0.15)) * smooth(clamp((1 - fraction) / 0.18));
}

/** 117 persistent paths. The caller alone owns the globe's rotation/projection.
 * A transaction is request → hub arrival → response → site arrival, then rest.
 * Residency mode leaves C's clients as quiet markers with no active traffic. */
export function activityFrame(
  time: number,
  mode: number,
  project: Project,
  frontness: (point: ActivityPoint3) => number = () => 1,
): ProofPath[] {
  const clock = Number.isFinite(time) ? Math.max(0, time) : 0;
  const selection = Number.isFinite(mode)
    ? Math.max(0, Math.min(2, Math.round(mode)))
    : 0;
  const paths: ProofPath[] = [];
  const depthOpacity = (point: ActivityPoint3) => {
    const value = frontness(point);
    return 0.22 + 0.78 * clamp(Number.isFinite(value) ? value : 1);
  };
  const draw = (
    id: string,
    points: ActivityPoint3[],
    kind: ProofPath["kind"],
    opacity: number,
    tone: ProofTone,
    close = false,
  ) => {
    paths.push({
      id,
      d:
        points
          .map((point, index) => {
            const [x, y] = project(point);
            return `${index ? "L" : "M"}${x.toFixed(2)} ${y.toFixed(2)}`;
          })
          .join(" ") + (close ? " Z" : ""),
      kind,
      opacity: clamp(opacity),
      tone,
    });
  };
  const ring = (
    id: string,
    center: ActivityPoint3,
    radius: number,
    kind: ProofPath["kind"],
    opacity: number,
    tone: ProofTone,
  ) =>
    draw(
      id,
      Array.from({ length: 17 }, (_, index) =>
        tangentPoint(
          center,
          Math.cos((index / 16) * TAU) * radius,
          Math.sin((index / 16) * TAU) * radius,
        ),
      ),
      kind,
      opacity * depthOpacity(center),
      tone,
      true,
    );

  regions.forEach((region, regionIndex) => {
    const hub = globePoint(region.hub[0], region.hub[1], 1.04);
    const blocked = selection === 2 && regionIndex === 2;
    const tone: ProofTone = blocked
      ? "fail"
      : selection !== 0 || regionIndex === 0
        ? "pass"
        : regionIndex === 1
          ? "pending"
          : "neutral";
    // These are visual group envelopes, not claimed legal residency borders.
    draw(
      `local-region-${regionIndex}-boundary`,
      Array.from({ length: 41 }, (_, index) => {
        const angle = (index / 40) * TAU;
        return globePoint(
          region.hub[0] + Math.sin(angle) * region.extent[0],
          region.hub[1] + Math.cos(angle) * region.extent[1],
          1.008,
        );
      }),
      "fine",
      (blocked ? 0.27 : 0.16) * depthOpacity(hub),
      tone,
      true,
    );
    const gate = globePoint(region.hub[0] - 3, region.hub[1], 1.025);
    for (const direction of [-1, 1])
      draw(
        `local-region-${regionIndex}-gate-${direction}`,
        [
          tangentPoint(gate, -0.015, -0.015 * direction),
          tangentPoint(gate, 0.015, 0.015 * direction),
        ],
        "edge",
        blocked ? 0.65 * depthOpacity(gate) : 0,
        "fail",
      );

    region.sites.forEach(([lat, lon], siteIndex) => {
      const id = `local-${regionIndex}-${siteIndex}`;
      const site = globePoint(lat, lon, 1.014);
      const route = (amount: number) =>
        sphericalRoutePoint(site, hub, amount, siteIndex === 3 ? 0.055 : 0.024);
      const phase =
        (((clock - regionIndex * 2.8 - siteIndex * 0.7) % CYCLE) + CYCLE) %
        CYCLE;
      const enabled = Number(!blocked);
      draw(
        `${id}-route`,
        Array.from({ length: 33 }, (_, index) => route(index / 32)),
        "fine",
        (blocked ? 0.07 : 0.22) * depthOpacity(route(0.5)),
        tone,
      );
      ring(`${id}-site`, site, 0.013, "fine", blocked ? 0.13 : 0.56, tone);
      ring(`${id}-core`, site, 0.0045, "glass", blocked ? 0.055 : 0.82, tone);

      for (const [name, start, end, reverse] of [
        ["request", 0.45, 2.2, false],
        ["response", 2.85, 4.6, true],
      ] as const) {
        const travel = smooth(clamp((phase - start) / (end - start)));
        // Invisible carriers return gently during rest, so even hidden path
        // coordinates are continuous at the ten-second cycle boundary.
        const reset = smooth(clamp((phase - 6) / 4));
        const progress = reverse ? 1 - travel + reset : travel - reset;
        const point = route(progress);
        const opacity = envelope(phase, start, end) * enabled;
        draw(
          `${id}-${name}-trail`,
          Array.from({ length: 9 }, (_, index) =>
            route(
              clamp(progress + (reverse ? 1 : -1) * (1 - index / 8) * 0.16),
            ),
          ),
          "edge",
          opacity * 0.94 * depthOpacity(point),
          tone,
        );
        ring(`${id}-${name}`, point, 0.009, "glass", opacity, tone);
      }
      for (const [name, center, start, end] of [
        ["hub-arrival", hub, 2.2, 2.85],
        ["site-arrival", site, 4.6, 5.35],
      ] as const) {
        const growth =
          smooth(clamp((phase - start) / (end - start))) *
          (1 - smooth(clamp((phase - end) / 0.65)));
        ring(
          `${id}-${name}`,
          center,
          0.009 + growth * 0.028,
          "edge",
          envelope(phase, start, end) * enabled * 0.9,
          tone,
        );
      }
    });
  });
  return paths;
}
