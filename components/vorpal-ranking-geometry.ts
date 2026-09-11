export type RankingPoint = readonly [number, number, number];
export type RankingDetail = {
  id: string;
  points: RankingPoint[];
  kind: "glass" | "wire" | "rim" | "bevel" | "rib" | "sheen";
  closed?: boolean;
};

const TAU = Math.PI * 2;
const samples = (count: number, point: (u: number) => RankingPoint) =>
  Array.from({ length: count + 1 }, (_, index) => point(index / count));

/** Front surface shared by the leaf and its incoming contribution path. */
export function rankLeafPoint(
  time: number,
  center: RankingPoint,
  halfWidth: number,
  halfHeight: number,
  phase: number,
  u: number,
  side: number,
  depth = 0,
): RankingPoint {
  const arch = Math.sin(u * Math.PI);
  const twist = Math.sin(time * 0.43 + phase) * 0.3;
  return [
    center[0] - halfWidth + u * halfWidth * 2,
    center[1] -
      arch * (3 + Math.sin(phase + time * 0.4) * 1.5) +
      side * halfHeight * (1 - u * 0.68) +
      depth * 0.12,
    center[2] +
      arch * (23 + Math.sin(time * 0.37 + phase) * 7) +
      side * arch * (8 + twist * 8) -
      depth,
  ];
}

/** Lamination stays attached to the curved leaf, including its narrow tip. */
export function rankLeafDetails(
  time: number,
  center: RankingPoint,
  halfWidth: number,
  halfHeight: number,
  phase: number,
): RankingDetail[] {
  const point = (u: number, side: number, depth = 0) =>
    rankLeafPoint(time, center, halfWidth, halfHeight, phase, u, side, depth);
  const contour = (side: number, depth = 0) =>
    samples(16, (u) => point(u, side, depth));
  const upper = contour(-1);
  const lower = contour(1);
  const back = contour(-1, 2.4);
  return [
    {
      id: "back",
      points: [...back, ...contour(1, 2.4).reverse()],
      kind: "wire",
      closed: true,
    },
    {
      id: "bevel",
      points: [...upper, ...back.slice().reverse()],
      kind: "bevel",
      closed: true,
    },
    { id: "edge", points: upper, kind: "rim" },
    { id: "depth", points: lower, kind: "wire" },
    { id: "grain", points: contour(0.18), kind: "wire" },
    {
      id: "reflection",
      points: samples(13, (u) => point(0.08 + u * 0.81, -0.73)),
      kind: "sheen",
    },
    ...[0.16, 0.36, 0.59, 0.81].map((u, index): RankingDetail => ({
      id: `rib-${index}`,
      // One bent rib crosses the front and returns onto the back edge.
      points: [
        point(u, -1, 2.4),
        ...samples(4, (side) => point(u, side * 2 - 1)),
        point(u, 1, 2.4),
      ],
      kind: "rib",
    })),
  ];
}

/** One coordinate system joins the collars, fluted glass and internal ribs. */
export function fusionPoint(
  time: number,
  portrait: boolean,
  u: number,
  angle: number,
  radialOffset = 0,
): RankingPoint {
  const arch = Math.sin(u * Math.PI);
  const radius =
    (51 + arch * 25) * (1 + Math.sin(time * 0.62) * 0.055) + radialOffset;
  const turn = angle + arch * (0.24 + Math.sin(time * 0.38) * 0.13);
  return portrait
    ? [Math.cos(turn) * radius, 12 + u * 80, Math.sin(turn) * radius]
    : [38 + u * 80, Math.cos(turn) * radius, Math.sin(turn) * radius];
}

/** Fixed topology and painter order: no rotating face sorting or pop-in. */
export function fusionDetails(
  time: number,
  portrait: boolean,
): RankingDetail[] {
  const details: RankingDetail[] = [];
  const point = (u: number, angle: number, inset = 0) =>
    fusionPoint(time, portrait, u, angle, inset);
  // Beveled collars define the common volume; the center remains transparent.
  for (let ring = 0; ring < 5; ring++) {
    const u = ring / 4;
    const outer = samples(40, (t) => point(u, t * TAU));
    const inner = samples(40, (t) => point(u, t * TAU, -2));
    details.push(
      { id: `spindle-${ring}`, points: outer, kind: "rim", closed: true },
      {
        id: `spindle-${ring}-inset`,
        points: inner,
        kind: "wire",
        closed: true,
      },
      {
        id: `spindle-${ring}-bevel`,
        points: [...outer, ...inner.slice().reverse()],
        kind: "bevel",
        closed: true,
      },
    );
  }
  // Curved, thin-walled vanes reveal radial depth without a solid sphere.
  for (let vane = 0; vane < 8; vane++) {
    const angle = (vane / 8) * TAU;
    const edge = (side: number, inset = 0) =>
      samples(24, (u) => point(u, angle + side * 0.235, inset));
    const upper = edge(-1);
    const lower = edge(1);
    const back = edge(-1, -3.2);
    details.push(
      {
        id: `fusion-vane-${vane}`,
        points: [...upper, ...lower.slice().reverse()],
        kind: "glass",
        closed: true,
      },
      {
        id: `fusion-vane-${vane}-bevel`,
        points: [...upper, ...back.slice().reverse()],
        kind: "bevel",
        closed: true,
      },
      { id: `fusion-vane-${vane}-edge`, points: upper, kind: "rim" },
      { id: `fusion-vane-${vane}-back`, points: back, kind: "wire" },
      { id: `fusion-vane-${vane}-depth`, points: lower, kind: "wire" },
      {
        id: `fusion-vane-${vane}-reflection`,
        points: samples(20, (u) => point(0.06 + u * 0.86, angle - 0.17)),
        kind: "sheen",
      },
    );
    for (let rib = 1; rib < 6; rib++) {
      const u = rib / 6;
      details.push({
        id: `fusion-vane-${vane}-rib-${rib}`,
        points: [
          point(u, angle - 0.235, -3.2),
          ...samples(6, (side) => point(u, angle + (side * 2 - 1) * 0.235)),
          point(u, angle + 0.235, -3.2),
        ],
        kind: "rib",
      });
    }
    // A second, inset spine makes the chamber's open interior legible.
    details.push({
      id: `spindle-thread-${vane}`,
      points: samples(24, (u) => point(u, angle, -16)),
      kind: "wire",
    });
  }
  return details;
}
