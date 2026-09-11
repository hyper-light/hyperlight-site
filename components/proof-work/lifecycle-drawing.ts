import type {
  ProofFrame,
  ProofLabel,
  ProofPath,
  ProofTone,
} from "./proof-geometry";

export type LifecyclePoint = [number, number];
export const clampLifecycle = (value: number) =>
  Math.max(0, Math.min(1, value));
export const easeLifecycle = (value: number) => {
  const t = clampLifecycle(value);
  return t * t * (3 - 2 * t);
};

/** Small physical drawing primitives, not a reused ledger scene. Coordinates
 * and hierarchy belong to each instrument; responsive layouts are explicit. */
export function createLifecycleDrawing(time: number, portrait: boolean) {
  const paths: ProofPath[] = [];
  const labels: ProofLabel[] = [];
  const clock = Number.isFinite(time) ? Math.max(0, time) : 0;
  function path(
    id: string,
    points: LifecyclePoint[],
    kind: ProofPath["kind"] = "fine",
    opacity = 0.4,
    tone?: ProofTone,
    closed = false,
  ) {
    paths.push({
      id,
      d:
        points
          .map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(2)} ${y.toFixed(2)}`)
          .join(" ") + (closed ? " Z" : ""),
      kind,
      opacity: clampLifecycle(opacity),
      tone,
    });
  }
  function line(
    id: string,
    a: LifecyclePoint,
    b: LifecyclePoint,
    opacity = 0.4,
    tone?: ProofTone,
  ) {
    path(id, [a, b], "fine", opacity, tone);
  }
  function label(
    id: string,
    text: string,
    x: number,
    y: number,
    kind: ProofLabel["kind"] = "label",
    tone?: ProofTone,
    anchor: ProofLabel["anchor"] = "start",
    opacity = 1,
  ) {
    labels.push({ id, text, x, y, kind, tone, anchor, opacity });
  }
  function slab(
    id: string,
    x: number,
    y: number,
    w: number,
    h: number,
    depth = 8,
    tone?: ProofTone,
    opacity = 1,
  ) {
    const cut = Math.min(9, w / 8, h / 5);
    const face: LifecyclePoint[] = [
      [x + cut, y],
      [x + w - cut, y],
      [x + w, y + cut],
      [x + w, y + h - cut],
      [x + w - cut, y + h],
      [x + cut, y + h],
      [x, y + h - cut],
      [x, y + cut],
    ];
    const offset: LifecyclePoint = [depth * 0.65, -depth];
    path(
      id + "-back",
      face.map(([px, py]) => [px + offset[0], py + offset[1]]),
      "rear",
      0.25 * opacity,
      tone,
      true,
    );
    for (let i = 0; i < face.length; i++)
      line(
        `${id}-depth-${i}`,
        face[i],
        [face[i][0] + offset[0], face[i][1] + offset[1]],
        0.36 * opacity,
        tone,
      );
    path(id + "-face", face, "glass", 0.7 * opacity, tone, true);
    path(id + "-edge", face, "edge", 0.62 * opacity, tone, true);
    line(
      id + "-lip",
      [x + cut, y + 3],
      [x + w - cut, y + 3],
      0.65 * opacity,
      tone,
    );
  }
  function ring(
    id: string,
    x: number,
    y: number,
    radius: number,
    opacity = 0.5,
    tone?: ProofTone,
  ) {
    path(
      id,
      Array.from({ length: 33 }, (_, i) => [
        x + Math.cos((i * Math.PI) / 16) * radius,
        y + Math.sin((i * Math.PI) / 16) * radius,
      ]),
      "edge",
      opacity,
      tone,
      true,
    );
  }
  function packet(
    id: string,
    points: LifecyclePoint[],
    progress: number,
    opacity = 0.85,
    tone?: ProofTone,
  ) {
    const lengths = points
      .slice(1)
      .map((p, i) => Math.hypot(p[0] - points[i][0], p[1] - points[i][1]));
    const length = lengths.reduce((a, b) => a + b, 0);
    let remaining = clampLifecycle(progress) * length;
    let p = points[0] ?? [0, 0];
    for (let i = 0; i < lengths.length; i++) {
      if (remaining <= lengths[i] || i === lengths.length - 1) {
        const t = lengths[i] ? remaining / lengths[i] : 0;
        p = [
          points[i][0] + (points[i + 1][0] - points[i][0]) * t,
          points[i][1] + (points[i + 1][1] - points[i][1]) * t,
        ];
        break;
      }
      remaining -= lengths[i];
    }
    path(
      id,
      [
        [p[0], p[1] - 3],
        [p[0] + 3, p[1]],
        [p[0], p[1] + 3],
        [p[0] - 3, p[1]],
      ],
      "glass",
      opacity,
      tone,
      true,
    );
  }
  return {
    path,
    line,
    label,
    slab,
    ring,
    packet,
    clock,
    portrait,
    frame: (): ProofFrame => ({ paths, labels }),
  };
}

export type LifecycleReadout = {
  id: string;
  title: string;
  value: string;
  tone?: ProofTone;
};

/** One unboxed ledger trace for every view of the same exchange. */
export function drawLifecycleRecord(
  drawing: ReturnType<typeof createLifecycleDrawing>,
  readouts: LifecycleReadout[],
  progress = 0,
) {
  const { portrait, line, label, packet } = drawing;
  const left = portrait ? 27 : 38;
  const right = portrait ? 392 : 762;
  const railY = portrait ? 585 : 427;
  label(
    "ledger-title",
    "LEDGER · RECORDED EXCHANGE",
    left,
    railY - 12,
    "small",
  );
  line("ledger-spine", [left, railY], [right, railY], 0.62);
  line("ledger-depth", [left + 4, railY + 3], [right - 4, railY + 3], 0.18);
  for (let i = 0; i < 24; i++) {
    const x = right - 116 + i * 5;
    line(
      `ledger-entry-${i}`,
      [x, railY - 19],
      [x, railY - 14],
      i / 23 <= progress ? 0.72 : 0.15,
    );
  }
  packet(
    "ledger-commit",
    [
      [left, railY],
      [right, railY],
    ],
    progress,
    0.8,
  );
  readouts.forEach((readout, i) => {
    const x = left + (portrait ? (i % 2) * 192 : i * 184);
    const y = portrait ? 624 + Math.floor(i / 2) * 53 : 461;
    line(
      `${readout.id}-record-link`,
      [x, y - 22],
      [x, y - 13],
      0.48,
      readout.tone,
    );
    label(`${readout.id}-title`, readout.title, x + 8, y - 7, "small");
    label(
      `${readout.id}-state`,
      readout.value,
      x + 8,
      y + 12,
      "small",
      readout.tone,
    );
  });
}
