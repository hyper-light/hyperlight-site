type Point = readonly [number, number];
export type ComparisonSurface = {
  skin: string;
  upper: string;
  lower: string;
  spine: string;
  ribs: string;
  depth: string;
};

const path = (points: readonly Point[], closed = false) =>
  points
    .map(
      ([x, y], index) => `${index ? "L" : "M"}${x.toFixed(2)},${y.toFixed(2)}`,
    )
    .join(" ") + (closed ? "Z" : "");

/** An orthographic ribbon: depth moves in y; x remains the exact linear scale. */
export function comparisonSurface(
  width: number,
  row: number,
  time: number,
): ComparisonSurface {
  const baseline = row * 72 + 37;
  const point = (u: number, across: number): Point => {
    const arch = Math.sin(u * Math.PI);
    const roll = 0.46 + Math.sin(time * 0.6 + u * 4 + row * 0.8) * 0.22;
    const lift =
      Math.sin(time * 0.48 + row * 0.65) * 1.6 +
      arch * Math.sin(u * 4.5 - time * 0.72 + row * 0.7) * 4.2;
    const y = baseline + lift + across * 8 * Math.cos(roll);
    const z = 3 + arch * 5 + across * 8 * Math.sin(roll);
    return [width * u, y - z * 0.6];
  };
  const contour = (across: number) =>
    Array.from({ length: 25 }, (_, index) => point(index / 24, across));
  const upper = contour(-1);
  const lower = contour(1);
  return {
    skin: path([...upper, ...lower.slice().reverse()], true),
    upper: path(upper),
    lower: path(lower),
    spine: path(contour(0)),
    ribs: [0.25, 0.5, 0.75]
      .map((u) => path([-1, 0, 1].map((v) => point(u, v))))
      .join(" "),
    depth: [0, 1]
      .map((u) => path([point(u, -1), [width * u, baseline + 2], point(u, 1)]))
      .join(" "),
  };
}
