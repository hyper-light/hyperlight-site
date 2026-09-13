import type {
  ProofFrameFunction,
  ProofTone,
} from "../proof-work/proof-geometry";
import {
  createLifecycleDrawing,
  easeLifecycle,
  type LifecyclePoint,
} from "../proof-work/lifecycle-drawing";
import { spatialDrawing, spatialPulse } from "./spatial-drawing";

/** One allocation bank and three independent sets of extent mappings. Cloning changes
 * references, never memory occupancy. Agent 1's write occupies one spare slot. */
export const workspaceFrame: ProofFrameFunction = (
  time,
  selection,
  portrait,
) => {
  const d = createLifecycleDrawing(time, portrait);
  const physical = spatialDrawing();
  const phase = (a: number, b: number) =>
    easeLifecycle((selection - a) / (b - a));
  const cloned = phase(0.12, 1),
    copied = phase(1.14, 2),
    sealed = phase(2.2, 3);
  const changed = selection >= 2;
  const board = portrait
    ? { x: 44, y: 328, length: 340, width: 122 }
    : { x: 125, y: 303, length: 570, width: 122 };
  // The PCB, raised packages and bus endpoints share one fixed 3D camera.
  const p = (u: number, v: number, z = 0): LifecyclePoint =>
    portrait
      ? [
          board.x + u * 0.16 + v * 0.86 - z * 0.25,
          board.y + u * 0.92 - v * 0.28 - z * 0.86,
        ]
      : [
          board.x + u * 0.98 + v * 0.3 - z * 0.25,
          board.y - u * 0.085 + v * 0.78 - z * 0.86,
        ];
  const edge = (
    id: string,
    points: LifecyclePoint[],
    kind: "edge" | "fine" | "rear" | "glass" | "shade" | "light" = "fine",
    opacity = 0.5,
    tone?: ProofTone,
    closed = false,
  ) => d.path(id, points, kind, opacity, tone, closed);
  const local = (
    id: string,
    points: LifecyclePoint[],
    kind: "edge" | "fine" | "rear" | "glass" | "shade" | "light" = "fine",
    opacity = 0.5,
    tone?: ProofTone,
    closed = false,
    height = 0,
  ) =>
    edge(
      id,
      points.map(([u, v]) => p(u, v, height)),
      kind,
      opacity,
      tone,
      closed,
    );
  d.label(
    "workspace-kicker",
    "SHARED MEMORY · PRIVATE CHANGES",
    28,
    38,
    "small",
  );
  const tableWidth = portrait ? 145 : 164;
  const source = portrait ? { x: 30, y: 93 } : { x: 32, y: 92 };
  const alice = portrait ? { x: 244, y: 93 } : { x: 303, y: 92 };
  const bob = portrait ? { x: 244, y: 369 } : { x: 590, y: 92 };
  const rowGap = portrait ? 22 : 21;
  const rowY = (table: typeof source, index: number) =>
    table.y + 50 + index * rowGap;
  function table(
    id: string,
    position: typeof source,
    title: string,
    opacity: number,
    tone?: ProofTone,
  ) {
    const { x, y } = position;
    d.label(id + "-title", title, x, y, "heading", tone, "start", opacity);
    d.label(
      id + "-extent-heading",
      "Extent",
      x,
      y + 25,
      "small",
      undefined,
      "start",
      opacity * 0.68,
    );
    d.label(
      id + "-page-heading",
      "Allocation",
      x + tableWidth - 6,
      y + 25,
      "small",
      undefined,
      "end",
      opacity * 0.68,
    );
    edge(
      id + "-header-rule",
      [
        [x, y + 31],
        [x + tableWidth, y + 31],
      ],
      "fine",
      opacity * 0.35,
    );
    for (let i = 0; i < 5; i++) {
      const cy = rowY(position, i),
        value = id === "alice" && i === 2 && changed ? 5 : i;
      d.label(
        `${id}-extent-${i}`,
        "ABCDE"[i],
        x + 7,
        cy,
        "label",
        tone,
        "start",
        opacity,
      );
      d.label(
        `${id}-address-${i}`,
        `a${value}`,
        x + tableWidth - 6,
        cy,
        "label",
        tone,
        "end",
        opacity,
      );
      edge(
        `${id}-row-${i}`,
        [
          [x, cy + 7],
          [x + tableWidth, cy + 7],
        ],
        "rear",
        opacity * 0.23,
      );
      edge(
        `${id}-entry-link-${i}`,
        [
          [x + 27, cy - 4],
          [x + tableWidth - 37, cy - 4],
        ],
        "fine",
        opacity * (i === 2 ? 0.55 : 0.18),
        tone,
      );
    }
  }
  table("source", source, "SNAPSHOT", 1);
  table("alice", alice, "AGENT 1 / WORK", 0.22 + cloned * 0.78, "pass");
  table("bob", bob, "AGENT 2 / WORK", 0.22 + cloned * 0.78, "pending");

  // DIMM-shaped board: keyed contact edge, retention cut-outs, etched traces,
  // packages, pin legs and small decoupling components. Slots label logical
  // allocation positions, not a claim that a chip stores exactly one extent.
  const L = board.length,
    W = board.width,
    key = L * 0.58;
  const outline: LifecyclePoint[] = [
    [0, 5],
    [8, 0],
    [L - 8, 0],
    [L, 6],
    [L, W - 20],
    [L - 9, W - 20],
    [L - 9, W - 6],
    [key + 8, W - 6],
    [key + 8, W - 23],
    [key - 8, W - 23],
    [key - 8, W - 6],
    [9, W - 6],
    [9, W - 20],
    [0, W - 20],
  ];
  local("ram-pcb-face", outline, "glass", 0.48, undefined, true);
  edge(
    "ram-pcb-solid-edge",
    [
      ...outline.map(([u, v]) => p(u, v, -7)),
      p(...outline[0], -7),
      ...outline.toReversed().map(([u, v]) => p(u, v, 0)),
      p(...outline[0], 0),
    ],
    "shade",
    0.82,
    undefined,
    true,
  );
  local("ram-pcb-edge", outline, "edge", 0.84, undefined, true);
  local(
    "ram-pcb-laminate",
    outline.map(([u, v]) => [u + 2, v + 3]),
    "rear",
    0.33,
    undefined,
    true,
  );
  local(
    "ram-top-trace",
    [
      [12, 8],
      [L - 12, 8],
    ],
    "fine",
    0.42,
  );
  local(
    "ram-contact-boundary",
    [
      [12, W - 24],
      [key - 12, W - 24],
      [key - 12, W - 27],
      [key + 12, W - 27],
      [key + 12, W - 24],
      [L - 12, W - 24],
    ],
    "fine",
    0.5,
  );
  for (let i = 0; i < (portrait ? 34 : 58); i++) {
    const u = 14 + (i * (L - 28)) / (portrait ? 33 : 57),
      visible = Math.abs(u - key) > 13 ? 1 : 0;
    local(
      `ram-contact-${i}`,
      [
        [u, W - 22],
        [u + 4, W - 22],
        [u + 4, W - 7],
        [u, W - 7],
      ],
      "fine",
      visible * 0.62,
      undefined,
      true,
    );
  }
  for (let i = 0; i < 12; i++) {
    const u = 15 + (i * (L - 30)) / 11;
    local(
      `ram-decoupling-${i}`,
      [
        [u, 12],
        [u + 6, 12],
        [u + 6, 18],
        [u, 18],
      ],
      "edge",
      0.44,
      undefined,
      true,
    );
    local(
      `ram-capacitor-pin-${i}`,
      [
        [u - 2, 15],
        [u, 15],
        [u + 6, 15],
        [u + 8, 15],
      ],
      "fine",
      0.36,
    );
  }
  const slot = (i: number) => ({
    u: (portrait ? 18 : 22) + i * (portrait ? 38 : 66),
    v: 26,
    a: portrait ? 30 : 48,
    b: portrait ? 65 : 58,
  });
  const slotMid = (i: number): LifecyclePoint => {
    const s = slot(i);
    return p(s.u + s.a / 2, s.v + s.b / 2, 13);
  };
  for (let i = 0; i < 8; i++) {
    const s = slot(i),
      { u, v, a, b } = s,
      used = i < 5 ? 1 : i === 5 ? copied : 0;
    const tone: ProofTone | undefined = i === 5 ? "pass" : undefined;
    const pkg: LifecyclePoint[] = [
      [u + 3, v],
      [u + a - 3, v],
      [u + a, v + 3],
      [u + a, v + b - 3],
      [u + a - 3, v + b],
      [u + 3, v + b],
      [u, v + b - 3],
      [u, v + 3],
    ];
    for (let side = 0; side < pkg.length; side++) {
      const a = pkg[side],
        b = pkg[(side + 1) % pkg.length];
      edge(
        `ram-package-solid-${i}-${side}`,
        [p(...a, 0), p(...b, 0), p(...b, 12), p(...a, 12)],
        side % 2 ? "glass" : "shade",
        0.64,
        undefined,
        true,
      );
    }
    local(`ram-package-top-${i}`, pkg, "glass", 0.72, undefined, true, 12);
    local(`ram-package-${i}`, pkg, "edge", 0.84, undefined, true, 12);
    local(
      `ram-package-bevel-${i}`,
      pkg.map(([u, v]) => [u + 1.5, v - 2]),
      "rear",
      0.28,
      undefined,
      true,
    );
    for (let n = 0; n < 5; n++) {
      const vv = v + 7 + (n * (b - 14)) / 4;
      local(
        `ram-package-pin-${i}-${n}-left`,
        [
          [u - 4, vv],
          [u, vv],
        ],
        "fine",
        0.5,
      );
      local(
        `ram-package-pin-${i}-${n}-right`,
        [
          [u + a, vv],
          [u + a + 4, vv],
        ],
        "fine",
        0.5,
      );
    }
    local(
      `ram-page-${i}`,
      [
        [u + 5, v + 5],
        [u + a - 5, v + 5],
        [u + a - 5, v + b - 5],
        [u + 5, v + b - 5],
      ],
      "glass",
      used * 0.7,
      tone,
      true,
      13,
    );
    const [cx, cy] = slotMid(i);
    d.label(
      `ram-page-id-${i}`,
      i === 5 ? (changed ? "C′" : "C") : ("ABCDE"[i] ?? ""),
      cx,
      cy + 4,
      "label",
      tone,
      "middle",
      used,
    );
    const address: LifecyclePoint = portrait
      ? p(u + a / 2, 16, 0)
      : p(u + a / 2, W - 30);
    d.label(
      `ram-address-${i}`,
      `a${i}`,
      ...address,
      "small",
      undefined,
      "middle",
    );
    for (let g = 0; g < 4; g++) {
      const yy = cy + (g < 2 ? -12 - g * 3 : 13 + (g - 2) * 3);
      edge(
        `ram-content-grain-${i}-${g}`,
        [
          [cx - (portrait ? 17 : 12), yy],
          [cx + (portrait ? 17 : 12), yy],
        ],
        "fine",
        used * 0.27,
        tone,
      );
    }
    local(
      `ram-pin-trace-${i}`,
      [
        [u + a / 2, v + b],
        [u + a / 2, v + b + 6],
        [u + a / 2 + 5, v + b + 9],
        [u + a / 2 + 5, W - 26],
      ],
      "rear",
      0.29,
    );
  }
  const commonSlot = slot(2);
  const targetSlot = {
    ...commonSlot,
    u: commonSlot.u + (slot(5).u - commonSlot.u) * phase(1.85, 2),
  };
  const targetEnd = portrait
    ? p(targetSlot.u + targetSlot.a / 2, 0)
    : p(targetSlot.u + targetSlot.a / 2, W - 6);
  const bobEnd = portrait
    ? p(commonSlot.u + commonSlot.a / 2, W - 6)
    : p(commonSlot.u + commonSlot.a / 2, 0);
  // Agent 1 reaches the bank from the outside left/bottom. Agent 2's independent
  // reference arrives from the right/top; the wires never cross each other.
  const aY = rowY(alice, 2) - 4,
    bY = rowY(bob, 2) - 4;
  const aliceRoute: LifecyclePoint[] = portrait
    ? [
        [alice.x, aY],
        [207, aY],
        [207, 263],
        [18, 263],
        [18, targetEnd[1]],
        targetEnd,
      ]
    : [
        [alice.x, aY],
        [275, aY],
        [275, 240],
        [98, 240],
        [98, 453],
        [targetEnd[0], 453],
        targetEnd,
      ];
  const bobRoute: LifecyclePoint[] = portrait
    ? [[bob.x, bY], [219, bY], [219, bobEnd[1]], bobEnd]
    : [
        [bob.x + tableWidth, bY],
        [766, bY],
        [766, 267],
        [bobEnd[0], 267],
        bobEnd,
      ];
  edge("alice-page-reference", aliceRoute, "fine", cloned * 0.64, "pass");
  edge("bob-reference-fixed", bobRoute, "fine", cloned * 0.64, "pending");
  // Data moves over the memory bus into one spare allocation. Allocation a2
  // stays occupied and unchanged; only a5's content and Agent 1's mapping change.
  const from = p(slot(2).u + slot(2).a / 2, portrait ? 34 : 10, 0),
    to = p(slot(5).u + slot(5).a / 2, portrait ? 34 : 10, 0);
  const copyRoute: LifecyclePoint[] = [from, to];
  const copying = phase(1.16, 1.3) * (1 - phase(1.84, 2));
  edge("private-copy-bus", copyRoute, "light", copying * 0.9, "pass");
  d.packet("private-copy-packet", copyRoute, copied, copying, "pass");
  const copySource = slot(2),
    copyDestination = slot(5);
  const copyU = copySource.u + (copyDestination.u - copySource.u) * copied;
  const copyV =
    copySource.v + 4 + (portrait ? 45 : 0) * Math.sin(copied * Math.PI);
  const copyZ = 15 + Math.sin(copied * Math.PI) * 58;
  physical.solid(
    "lifted-content",
    ([u, v, z]) => p(u, v, z),
    [copyU + 4, copyV, copyZ],
    [copySource.a - 8, copySource.b - 8, 4],
    { material: "paper", opacity: copying * 0.96, tone: "pass" },
  );
  for (let i = 1; i < 5; i++)
    physical.line(
      `lifted-content-row-${i}`,
      [
        p(copyU + 6, copyV + (i * (copySource.b - 8)) / 5, copyZ + 4.2),
        p(
          copyU + copySource.a - 6,
          copyV + (i * (copySource.b - 8)) / 5,
          copyZ + 4.2,
        ),
      ],
      { kind: "fine", opacity: copying * 0.6, tone: "pass" },
    );
  const liftLabel = p(
    copyU + copySource.a / 2,
    copyV + (copySource.b - 8) / 2,
    copyZ + 6,
  );
  physical.label("lifted-content-label", "C", liftLabel[0], liftLabel[1] + 3, {
    anchor: "middle",
    kind: "small",
    tone: "pass",
    opacity: copying * phase(1.3, 1.42) * (1 - phase(1.68, 1.82)),
  });
  for (let i = 0; i < 6; i++) {
    const scan = spatialPulse(time, 0.2, i * 0.137),
      s = slot(i),
      alpha = i < 5 ? 1 : copied;
    physical.line(
      `ram-read-scan-${i}`,
      [
        p(s.u + 3 + (s.a - 6) * scan.progress, s.v + s.b - 5, 13.5),
        p(s.u + 3 + (s.a - 6) * scan.progress, s.v + s.b - 1, 13.5),
      ],
      {
        kind: "light",
        opacity: scan.opacity * alpha * 0.72,
        tone: i === 5 ? "pass" : undefined,
      },
    );
  }
  const trace = spatialPulse(time, 0.13, 0.12);
  d.packet(
    "snapshot-live-address",
    [
      [source.x + tableWidth, rowY(source, 2) - 4],
      [portrait ? 190 : 225, rowY(source, 2) - 4],
      [portrait ? 190 : 225, portrait ? 247 : 268],
      [portrait ? 18 : 225, portrait ? 247 : 268],
      [portrait ? 18 : 225, portrait ? p(slot(2).u, 10, 0)[1] : 268],
      p(slot(2).u, 10, 0),
    ],
    trace.progress,
    trace.opacity * 0.7,
  );
  const privateSlot = slot(5);
  local(
    "private-seal",
    [
      [privateSlot.u + 3, privateSlot.v + 3],
      [privateSlot.u + privateSlot.a - 3, privateSlot.v + 3],
      [privateSlot.u + privateSlot.a - 3, privateSlot.v + privateSlot.b - 3],
      [privateSlot.u + 3, privateSlot.v + privateSlot.b - 3],
      [privateSlot.u + 3, privateSlot.v + 3],
    ],
    "light",
    sealed * 0.9,
    "pass",
    false,
    14,
  );
  d.label(
    "ram-title",
    `RAM · ${changed ? 6 : 5} allocations`,
    portrait ? 28 : 125,
    portrait ? 278 : 282,
    "small",
  );
  d.label(
    "alice-state",
    selection >= 3 ? "a5 sealed" : changed ? "C → a5" : "C → shared a2",
    alice.x,
    portrait ? 258 : 65,
    "small",
    "pass",
    "start",
    cloned,
  );
  d.label(
    "bob-state",
    "C → shared a2",
    bob.x,
    portrait ? 541 : 65,
    "small",
    "pending",
    "start",
    cloned,
  );
  d.label(
    "remaining-space",
    "a6 and a7 remain free",
    portrait ? 28 : 125,
    portrait ? 672 : 477,
    "small",
  );
  d.label(
    "host-title",
    "HOST BASE · READ ONLY",
    28,
    portrait ? 721 : 507,
    "small",
  );
  const frame = d.frame();
  for (const path of frame.paths) {
    if (
      path.id.startsWith("ram-pcb-") &&
      (path.kind === "glass" || path.kind === "shade")
    )
      path.material = "circuit";
    else if (
      path.id.startsWith("ram-package-") &&
      (path.kind === "glass" || path.kind === "shade")
    )
      path.material = "silicon";
    else if (/^ram-page-\d+$/.test(path.id)) path.material = "circuit";
  }
  frame.paths.push(...physical.paths);
  frame.labels.push(...physical.labels);
  return frame;
};
