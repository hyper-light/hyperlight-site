import type {
  ProofFrame,
  ProofLabel,
  ProofPath,
  ProofTone,
} from "../proof-work/proof-geometry";

export type RuntimePoint = readonly [number, number];
export const runtimeEase = (value: number) => {
  const clamped = Math.max(0, Math.min(1, value));
  return clamped * clamped * (3 - 2 * clamped);
};
export const runtimePhase = (selection: number, from: number, to: number) =>
  runtimeEase((selection - from) / (to - from));

/** A fixed camera: bevels and pins describe hardware; lettering stays screen-aligned. */
export function runtimeDrawing(): ProofFrame & {
  line: (
    id: string,
    points: readonly RuntimePoint[],
    options?: Partial<
      Pick<ProofPath, "kind" | "opacity" | "tone" | "dashArray">
    >,
    closed?: boolean,
  ) => void;
  label: (
    id: string,
    text: string,
    x: number,
    y: number,
    options?: Partial<ProofLabel>,
  ) => void;
  plate: (
    id: string,
    x: number,
    y: number,
    width: number,
    height: number,
    options?: { opacity?: number; tone?: ProofTone; depth?: number },
  ) => void;
  chip: (
    id: string,
    x: number,
    y: number,
    width: number,
    height: number,
    opacity?: number,
    tone?: ProofTone,
  ) => void;
  packet: (
    id: string,
    point: RuntimePoint,
    opacity?: number,
    tone?: ProofTone,
  ) => void;
} {
  const paths: ProofPath[] = [];
  const labels: ProofLabel[] = [];
  const line = (
    id: string,
    points: readonly RuntimePoint[],
    options: Partial<
      Pick<ProofPath, "kind" | "opacity" | "tone" | "dashArray">
    > = {},
    closed = false,
  ) =>
    paths.push({
      id,
      d:
        points
          .map(
            ([x, y], index) =>
              `${index ? "L" : "M"}${x.toFixed(3)} ${y.toFixed(3)}`,
          )
          .join(" ") + (closed ? " Z" : ""),
      kind: "edge",
      opacity: 0.7,
      ...options,
    });
  const label = (
    id: string,
    text: string,
    x: number,
    y: number,
    options: Partial<ProofLabel> = {},
  ) => labels.push({ id, text, x, y, kind: "small", ...options });
  const plate = (
    id: string,
    x: number,
    y: number,
    width: number,
    height: number,
    {
      opacity = 0.75,
      tone = "neutral",
      depth = 7,
    }: { opacity?: number; tone?: ProofTone; depth?: number } = {},
  ) => {
    const cut = Math.min(7, width / 8, height / 5);
    const top: RuntimePoint[] = [
      [x + cut, y],
      [x + width - cut, y],
      [x + width, y + cut],
      [x + width, y + height - cut],
      [x + width - cut, y + height],
      [x + cut, y + height],
      [x, y + height - cut],
      [x, y + cut],
    ];
    line(`${id}-face`, top, { kind: "glass", opacity, tone }, true);
    line(
      `${id}-bevel`,
      [
        top[6],
        [x + depth, y + height - cut + depth],
        [x + cut + depth, y + height + depth],
        [x + width - cut + depth, y + height + depth],
        [x + width + depth, y + height - cut + depth],
        [x + width + depth, y + cut + depth],
        top[2],
      ],
      { kind: "fine", opacity: opacity * 0.7, tone },
    );
    line(
      `${id}-edge`,
      [top[4], [x + width - cut + depth, y + height + depth]],
      { kind: "fine", opacity, tone },
    );
    line(
      `${id}-inset`,
      [
        [x + 7, y + 8],
        [x + 7, y + height - 10],
        [x + width - 10, y + height - 10],
      ],
      { kind: "fine", opacity: opacity * 0.35, tone },
    );
  };
  const chip = (
    id: string,
    x: number,
    y: number,
    width: number,
    height: number,
    opacity = 0.8,
    tone: ProofTone = "neutral",
  ) => {
    plate(id, x - width / 2, y - height / 2, width, height, {
      opacity,
      tone,
      depth: 6,
    });
    plate(
      `${id}-die`,
      x - width * 0.25,
      y - height * 0.25,
      width * 0.5,
      height * 0.5,
      { opacity: opacity * 0.7, tone, depth: 3 },
    );
    for (let index = 0; index < 6; index++) {
      const offset = (index - 2.5) * (width / 8);
      line(
        `${id}-pins-${index}`,
        [
          [x + offset, y - height / 2 - 9],
          [x + offset, y - height / 2],
          [x + offset + 2, y - height / 2],
          [x + offset + 2, y - height / 2 - 9],
        ],
        { kind: "fine", opacity, tone },
      );
      line(
        `${id}-lower-pins-${index}`,
        [
          [x + offset, y + height / 2 + 6],
          [x + offset, y + height / 2 + 14],
          [x + offset + 2, y + height / 2 + 14],
          [x + offset + 2, y + height / 2 + 6],
        ],
        { kind: "fine", opacity, tone },
      );
    }
  };
  const packet = (
    id: string,
    [x, y]: RuntimePoint,
    opacity = 1,
    tone: ProofTone = "pending",
  ) => {
    line(
      id,
      [
        [x - 6, y],
        [x, y - 6],
        [x + 6, y],
        [x, y + 6],
      ],
      { kind: "glass", opacity, tone },
      true,
    );
    line(
      `${id}-mark`,
      [
        [x - 2, y],
        [x, y + 2],
        [x + 3, y - 2],
      ],
      { kind: "edge", opacity, tone },
    );
  };
  return { paths, labels, line, label, plate, chip, packet };
}

/** Arc-length motion keeps queue/reply packets continuous around every bend. */
export function runtimeAlong(
  points: readonly RuntimePoint[],
  progress: number,
): RuntimePoint {
  const lengths = points
    .slice(1)
    .map((point, index) =>
      Math.hypot(point[0] - points[index][0], point[1] - points[index][1]),
    );
  let remaining =
    Math.max(0, Math.min(1, progress)) *
    lengths.reduce((sum, length) => sum + length, 0);
  for (let index = 0; index < lengths.length; index++) {
    if (remaining <= lengths[index] || index === lengths.length - 1) {
      const fraction = lengths[index] ? remaining / lengths[index] : 0;
      return [
        points[index][0] + (points[index + 1][0] - points[index][0]) * fraction,
        points[index][1] + (points[index + 1][1] - points[index][1]) * fraction,
      ];
    }
    remaining -= lengths[index];
  }
  return points[0];
}
