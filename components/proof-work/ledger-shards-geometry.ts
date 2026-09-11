import type {
  ProofFrame,
  ProofLabel,
  ProofPath,
  ProofTone,
} from "./proof-geometry";
import { blend } from "./process-geometry";

type V = readonly [number, number, number];

/** A range is a contiguous strip of affinities, not a second independent session. */
export function ledgerShardsFrame(
  time: number,
  selection: number,
  portrait: boolean,
): ProofFrame {
  const paths: ProofPath[] = [],
    labels: ProofLabel[] = [];
  const stage = Math.max(0, Math.min(4, Math.round(selection)));
  const copy = blend(selection, [0, 1, 1, 1, 1]);
  const catchup = blend(selection, [0, 0, 1, 1, 1]);
  const fenced = blend(selection, [0, 0, 0, 1, 0]);
  const active = blend(selection, [0, 0, 0, 0, 1]);
  const centerX = portrait ? 210 : 400,
    centerY = portrait ? 370 : 260;
  const pitch = -0.34 + Math.sin(time * 0.3) * 0.035;
  const yaw = 0.2 + Math.sin(time * 0.23) * 0.045;
  function project([x, y, z]: V): [number, number] {
    const dx = x - centerX,
      dy = y - centerY,
      scale = portrait ? 0.9 : 0.95;
    return [
      centerX + (dx * Math.cos(yaw) + z * Math.sin(yaw)) * scale,
      centerY +
        (dy * Math.cos(pitch) -
          (z * Math.cos(yaw) - dx * Math.sin(yaw)) * Math.sin(pitch)) *
          scale,
    ];
  }
  function line(
    id: string,
    points: readonly V[],
    kind: ProofPath["kind"] = "fine",
    opacity = 0.6,
    tone: ProofTone = "neutral",
  ) {
    paths.push({
      id,
      d: points
        .map(
          (point, i) =>
            (i ? "L" : "M") +
            project(point)
              .map((value) => value.toFixed(2))
              .join(" "),
        )
        .join(" "),
      kind,
      opacity,
      tone,
    });
  }
  function label(
    id: string,
    text: string,
    x: number,
    y: number,
    kind: ProofLabel["kind"] = "small",
    tone: ProofTone = "neutral",
    anchor: ProofLabel["anchor"] = "start",
  ) {
    const p = project([x, y, 0]);
    labels.push({ id, text, x: p[0], y: p[1], kind, tone, anchor });
  }
  function plate(
    id: string,
    x: number,
    y: number,
    w: number,
    h: number,
    z: number,
    kind: ProofPath["kind"] = "glass",
    opacity = 0.45,
    tone: ProofTone = "neutral",
  ) {
    const points: V[] = [
      [x + 6, y, z],
      [x + w - 6, y, z],
      [x + w, y + 6, z],
      [x + w, y + h - 6, z],
      [x + w - 6, y + h, z],
      [x + 6, y + h, z],
      [x, y + h - 6, z],
      [x, y + 6, z],
      [x + 6, y, z],
    ];
    line(id, points, kind, opacity, tone);
  }
  const a = portrait
    ? { x: 48, y: 134, w: 324, h: 146 }
    : { x: 58, y: 172, w: 288, h: 146 };
  const b = portrait
    ? { x: 48, y: 432, w: 324, h: 146 }
    : { x: 454, y: 172, w: 288, h: 146 };
  const cw = (a.w - 44) / 8,
    ch = 23;
  function bank(id: string, bank: typeof a, destination: boolean) {
    const { x, y, w, h } = bank;
    plate(id + "-back", x, y, w, h, -17, "rear", 0.3);
    plate(id + "-laminate", x, y, w, h, -8, "rear", 0.2);
    plate(id + "-body", x, y, w, h, 0, "glass", 0.25);
    for (const [i, px] of [x + 6, x + w - 6].entries()) {
      line(
        id + "-depth-" + i,
        [
          [px, y, -17],
          [px, y, 0],
          [px, y + h, 0],
          [px, y + h, -17],
        ],
        "edge",
        0.55,
      );
    }
    for (let pin = 0; pin < 36; pin++) {
      const px = x + 16 + (pin * (w - 32)) / 36;
      line(
        id + "-pin-" + pin,
        [
          [px, y + h, -9],
          [px, y + h + 12, -9],
          [px + 3, y + h + 12, -9],
          [px + 3, y + h, -9],
        ],
        "edge",
        0.43,
      );
    }
    for (let rail = 0; rail < 6; rail++)
      line(
        id + "-rail-" + rail,
        [
          [x + 9, y + 3 + rail * 1.5, -rail],
          [x + w - 9, y + 3 + rail * 1.5, -rail],
        ],
        rail === 0 ? "light" : "fine",
        rail === 0 ? 0.63 : 0.24,
      );
    for (let group = 0; group < 32; group++) {
      const gx = x + 22 + (group % 8) * cw,
        gy = y + 24 + Math.floor(group / 8) * ch;
      const selected = group >= 8 && group < 16;
      plate(
        id + "-group-" + group,
        gx,
        gy,
        cw - 4,
        ch - 5,
        3,
        "glass",
        destination ? 0.12 : selected ? 0.6 - active * 0.25 : 0.3,
        selected ? "pending" : "neutral",
      );
      line(
        id + "-trace-" + group,
        [
          [gx + 5, gy + 6, 4],
          [gx + cw - 10, gy + 6, 4],
        ],
        "fine",
        destination ? 0.08 : 0.48,
      );
      line(
        id + "-group-depth-" + group,
        [
          [gx, gy + 6, 3],
          [gx, gy + 6, -2],
          [gx, gy + ch - 11, -2],
          [gx + 6, gy + ch - 5, -2],
          [gx + cw - 10, gy + ch - 5, -2],
          [gx + cw - 10, gy + ch - 5, 3],
        ],
        "fine",
        destination ? 0.12 : 0.37,
      );
    }
    for (let row = 0; row < 4; row++)
      label(
        id + "-range-" + row,
        ["A", "B", "C", "D"][row],
        x + 8,
        y + 38 + row * ch,
        "small",
        row === 1 ? "pending" : "neutral",
      );
  }
  bank("voters", a, false);
  bank("holder", b, true);
  label("voters-title", "Session voters", a.x, a.y - 41, "label");
  label("voters-detail", "All ranges retained", a.x, a.y - 11);
  label("holder-title", "Holder B", b.x, b.y - 41, "label");
  label(
    "holder-detail",
    [
      "Range B destination",
      "Snapshot copy",
      "Committed-log catch-up",
      "Readiness required",
      "Range B active",
    ][stage],
    b.x,
    b.y - 11,
    "small",
    stage === 4 ? "pass" : "pending",
  );

  // The selected strip is copied; source rows remain present in every state.
  for (let group = 0; group < 8; group++) {
    const x = a.x + 22 + group * cw + (b.x - a.x) * copy;
    const y =
      a.y +
      24 +
      ch +
      (b.y - a.y) * copy -
      Math.sin(copy * Math.PI) * (portrait ? 26 : 45);
    const z = 7 + Math.sin(copy * Math.PI) * 38;
    plate(
      "transfer-group-" + group,
      x,
      y,
      cw - 4,
      ch - 5,
      z,
      "glass",
      0.6,
      active > 0.5 ? "pass" : "pending",
    );
    line(
      "transfer-light-" + group,
      [
        [x + 4, y + 2, z + 1],
        [x + cw - 8, y + 2, z + 1],
      ],
      "light",
      0.7,
    );
  }
  const selectedY = a.y + 24 + ch;
  line(
    "range-boundary",
    [
      [a.x + 17, selectedY - 5, 5],
      [a.x + 17, selectedY + ch - 1, 5],
      [a.x + a.w - 17, selectedY + ch - 1, 5],
      [a.x + a.w - 17, selectedY - 5, 5],
    ],
    "edge",
    0.68,
    "pending",
  );
  const sourcePort: V = [a.x + 12, a.y + a.h + 20, 0];
  const targetPort: V = [b.x + b.w - 12, b.y + b.h + 20, 0];
  const log = portrait ? { x: 52, y: 654, w: 316 } : { x: 76, y: 432, w: 648 };
  label(
    "session-log-title",
    "S1 · one ordered session log",
    log.x,
    log.y - 22,
    "label",
  );
  line(
    "session-log",
    [
      [log.x, log.y, 0],
      [log.x + log.w, log.y, 0],
    ],
    "edge",
    0.62,
  );
  const logNames = ["Begin", "Snapshot", "Mutation", "Barrier", "Activate"];
  logNames.forEach((name, index) => {
    const x = log.x + 8 + (index * (log.w - 16)) / 4;
    line(
      "log-entry-" + index,
      [
        [x - 3, log.y - 4, 0],
        [x + 3, log.y - 4, 0],
        [x + 3, log.y + 4, 0],
        [x - 3, log.y + 4, 0],
        [x - 3, log.y - 4, 0],
      ],
      "glass",
      0.22 + Math.max(0, Math.min(1, selection - index + 1)) * 0.45,
    );
    label(
      "log-entry-label-" + index,
      name,
      x,
      log.y + 23,
      "small",
      "neutral",
      "middle",
    );
  });
  const lx =
    log.x + 8 + (Math.max(0, Math.min(4, selection)) * (log.w - 16)) / 4;
  line(
    "log-position",
    [
      [lx - 5, log.y - 8, 0],
      [lx, log.y - 13, 0],
      [lx + 5, log.y - 8, 0],
    ],
    "light",
    0.83,
  );
  line(
    "source-log-link",
    [
      sourcePort,
      [portrait ? 28 : log.x + 8, sourcePort[1], 0],
      [portrait ? 28 : log.x + 8, log.y, 0],
      [log.x + 8, log.y, 0],
    ],
    "fine",
    0.28,
  );
  line(
    "destination-log-link",
    [
      [log.x + log.w - 8, log.y, 0],
      [portrait ? 392 : log.x + log.w - 8, log.y, 0],
      [portrait ? 392 : log.x + log.w - 8, targetPort[1], 0],
      targetPort,
    ],
    "light",
    0.25 + catchup * 0.47,
  );
  const fy = b.y + 24 + ch;
  line(
    "source-write-fence",
    [
      [a.x + 15, selectedY - 5, 9],
      [a.x + 15, selectedY + ch, 9],
      [a.x + a.w - 15, selectedY + ch, 9],
      [a.x + a.w - 15, selectedY - 5, 9],
    ],
    "edge",
    0.12 + fenced * 0.76,
    "pending",
  );
  line(
    "write-fence",
    [
      [b.x + 15, fy - 5, 9],
      [b.x + 15, fy + ch, 9],
      [b.x + b.w - 15, fy + ch, 9],
      [b.x + b.w - 15, fy - 5, 9],
    ],
    "edge",
    0.12 + fenced * 0.76,
    "pending",
  );
  label(
    "range-state",
    [
      "Select contiguous range B",
      "Copy without retiring source",
      "Replay later committed changes",
      "RangeMoving · touched writes",
      "Range epoch 8 · Holder B",
    ][stage],
    portrait ? 210 : 400,
    portrait ? 354 : 366,
    "small",
    stage === 4 ? "pass" : "pending",
    "middle",
  );
  label(
    "ownership-state",
    stage === 4
      ? "Epoch 7 superseded · copies retained"
      : "Range epoch 7 · S1 authority unchanged",
    portrait ? 210 : 400,
    portrait ? 379 : 391,
    "small",
    "neutral",
    "middle",
  );
  return { paths, labels };
}
