import type { ProofFrame, ProofTone } from "../proof-work/proof-geometry";
import {
  illustratedCreditCells,
  transportOperation,
  transportState,
} from "./transport-data";
import { runtimeAlong, type RuntimePoint } from "./runtime-drawing";
import { spatialDrawing, spatialPulse, type Project3 } from "./spatial-drawing";

/** A cutaway stream conduit, with horizontal desktop and vertical mobile cable runs. */
export function transportFrame(
  time: number,
  selection: number,
  portrait: boolean,
): ProofFrame {
  const scene = spatialDrawing();
  const { line } = scene;
  const label: typeof scene.label = (id, text, x, y, style) =>
    scene.label(id, text, x, y, { anchor: "middle", ...style });
  const packet = (
    id: string,
    [x, y]: RuntimePoint,
    opacity: number,
    tone: ProofTone,
  ) => {
    const camera: Project3 = ([u, v, z]) => [x + u + z * 0.3, y + v - z * 0.5];
    scene.solid(id, camera, [-5, -4, 0], [10, 8, 6], {
      material: "emissive",
      opacity,
      tone,
    });
  };
  const state = transportState(selection);
  const request: RuntimePoint[] = portrait
    ? [
        [210, 191],
        [210, 207],
        [76, 244],
        [76, 509],
        [210, 550],
        [210, 558],
      ]
    : [
        [128, 248],
        [166, 248],
        [190, 162],
        [610, 162],
        [636, 248],
        [672, 248],
      ];
  const reply: RuntimePoint[] = portrait
    ? [
        [210, 558],
        [210, 550],
        [344, 509],
        [344, 244],
        [210, 207],
        [210, 191],
      ]
    : [
        [672, 248],
        [636, 248],
        [610, 334],
        [190, 334],
        [166, 248],
        [128, 248],
      ];
  const lostPoint = runtimeAlong(reply, 0.5);
  const sessionOpacity = 0.6 * (1 - state.lost) + 0.6 * state.reconnected;
  label("heading", "RETRY THE ORIGINAL REQUEST", 26, 35, {
    anchor: "start",
    kind: "heading",
  });
  label(
    "origin",
    "ORIGIN · REGION A",
    portrait ? 210 : 126,
    portrait ? 79 : 95,
    { kind: "heading" },
  );
  label(
    "owner",
    "OWNER · REGION B",
    portrait ? 210 : 673,
    portrait ? 616 : 95,
    { kind: "heading" },
  );
  label("request-title", "REQUEST", portrait ? 76 : 211, portrait ? 127 : 111, {
    kind: "heading",
  });
  label("bulk-title", "CONTENT", portrait ? 210 : 400, portrait ? 127 : 201, {
    kind: "heading",
  });
  label("reply-title", "REPLY", portrait ? 344 : 591, portrait ? 127 : 387, {
    kind: "heading",
  });
  label(
    "request-id",
    transportOperation.request,
    portrait ? 76 : 300,
    portrait ? 148 : 111,
    { anchor: "middle", kind: "name" },
  );
  label(
    "result-id",
    transportOperation.result,
    portrait ? 344 : 403,
    portrait ? 148 : 387,
    {
      anchor: "middle",
      kind: "name",
      tone: "pass",
      opacity: state.committed,
    },
  );

  // Physical sockets and their jacket never disappear on a session retry.
  // The opened sleeve enlarges three logical streams; it is not three wires.
  for (const [name, side] of [
    ["origin", 0],
    ["owner", 1],
  ] as const) {
    const end: RuntimePoint = portrait
      ? [210, side ? 558 : 191]
      : [side ? 672 : 128, 248];
    const direction = side ? -1 : 1;
    const p: Project3 = ([u, v, z]) =>
      portrait
        ? [end[0] + v + z * 0.28, end[1] + u * direction - z * 0.55]
        : [end[0] + u * direction + v * 0.13, end[1] + v * 0.9 - z * 0.75];
    const back = portrait ? -44 : -72,
      half = portrait ? 79 : 49;
    scene.solid(
      name + "-network-board",
      p,
      [back, -half, -4],
      [-12 - back, half * 2, 9],
      { material: "circuit", opacity: 0.97 },
    );
    for (const edge of [-1, 1]) {
      const v = edge * (half - 7),
        u = back + 7;
      line(
        name + "-mounting-hole-" + edge,
        Array.from({ length: 13 }, (_, i) =>
          p([
            u + Math.cos((i * Math.PI) / 6) * 3,
            v + Math.sin((i * Math.PI) / 6) * 3,
            6,
          ]),
        ),
        { opacity: 0.58 },
        true,
      );
      for (let trace = 0; trace < 4; trace++) {
        const u = back + 6 + trace * (portrait ? 5 : 8);
        line(
          name + "-board-trace-" + edge + "-" + trace,
          [
            [u, edge * (half - 14), 6],
            [u, edge * 28, 6],
            [-13, edge * 28, 6],
          ].map(([x, y, z]) => p([x, y, z])),
          { opacity: 0.31 },
        );
      }
    }
    const dieU = portrait ? -34 : -61,
      dieV = portrait ? 42 : 0;
    scene.solid(name + "-controller", p, [dieU, dieV - 10, 6], [16, 20, 7], {
      material: "silicon",
      opacity: 0.95,
    });
    for (let pin = 0; pin < 4; pin++)
      for (const side of [-1, 1]) {
        const u = side < 0 ? dieU - 3 : dieU + 16;
        scene.solid(
          name + "-controller-pin-" + side + "-" + pin,
          p,
          [u, dieV - 7 + pin * 4, 6],
          [3, 2, 2],
          { material: "metal", opacity: 0.6 },
        );
      }
    // A deep shield surrounds a black socket mouth. The top latch and strain
    // relief rings make the plug distinct from either a server or memory chip.
    scene.solid(name + "-socket-housing", p, [-20, -25, 6], [33, 50, 22], {
      material: "metal",
      opacity: 0.98,
    });
    scene.solid(name + "-socket-inset", p, [-12, -19, 28], [20, 38, 2], {
      material: "silicon",
      opacity: 0.99,
    });
    for (let contact = 0; contact < 8; contact++)
      scene.solid(
        name + "-socket-contact-" + contact,
        p,
        [-9, -15 + contact * 4, 31],
        [12, 2, 2],
        { material: "metal", opacity: 0.85, tone: "pending" },
      );
    scene.solid(name + "-release-latch", p, [8, -8, 28], [13, 16, 4], {
      material: "metal",
      opacity: 0.92,
    });
    line(
      name + "-latch-grip",
      [
        [12, -5, 33],
        [17, -5, 33],
        [17, 5, 33],
        [12, 5, 33],
      ].map(([x, y, z]) => p([x, y, z])),
      { opacity: 0.6 },
    );
    // Octagonal rings retain a round-cable silhouette while exposing their depth.
    const ring = (u: number, r: number) =>
      Array.from({ length: 13 }, (_, i) =>
        p([
          u,
          Math.cos((i * Math.PI) / 6) * r,
          13 + Math.sin((i * Math.PI) / 6) * r,
        ]),
      );
    for (let sleeve = 0; sleeve < 4; sleeve++) {
      const u = 17 + sleeve * 5,
        r = 11 - sleeve * 0.7;
      const before = ring(u, r),
        after = ring(u + 3, r);
      for (let panel = 0; panel < 12; panel++)
        scene.face(
          name + "-boot-" + sleeve + "-" + panel,
          [before[panel], before[panel + 1], after[panel + 1], after[panel]],
          "silicon",
          0.87,
        );
      line(name + "-boot-ring-" + sleeve, after, { opacity: 0.7 });
    }
    const pulse = spatialPulse(time, 0.4, side * 0.3);
    scene.face(
      name + "-session-light",
      [
        [back + 4, -half + 15, 6],
        [back + 9, -half + 15, 6],
        [back + 9, -half + 22, 6],
        [back + 4, -half + 22, 6],
      ].map(([x, y, z]) => p([x, y, z])),
      "emissive",
      sessionOpacity * (0.3 + pulse.opacity * 0.7),
      "pass",
    );
  }

  // A thick, sliced-open jacket surrounds the enlarged stream cross-section.
  // Its rounded necks remain fixed through loss; only logical signal light dies.
  const ends = portrait
    ? [
        [210, 225],
        [210, 536],
      ]
    : [
        [167, 248],
        [633, 248],
      ];
  const upper: RuntimePoint[] = portrait
    ? [
        [198, 225],
        [83, 246],
        [49, 270],
        [42, 309],
        [42, 460],
        [53, 499],
        [91, 520],
        [198, 536],
      ]
    : [
        [167, 236],
        [188, 162],
        [220, 137],
        [273, 126],
        [528, 126],
        [577, 137],
        [612, 162],
        [633, 236],
      ];
  const lower: RuntimePoint[] = portrait
    ? [
        [222, 225],
        [337, 246],
        [371, 270],
        [378, 309],
        [378, 460],
        [367, 499],
        [329, 520],
        [222, 536],
      ]
    : [
        [167, 260],
        [188, 334],
        [220, 359],
        [273, 370],
        [528, 370],
        [577, 359],
        [612, 334],
        [633, 260],
      ];
  const depth: RuntimePoint = portrait ? [9, -7] : [7, -9];
  const shifted = (points: RuntimePoint[], delta: RuntimePoint) =>
    points.map(([x, y]) => [x + delta[0], y + delta[1]] as RuntimePoint);
  const bottom = [...upper, ...lower.toReversed()];
  // Show the shared scene background through the cutaway, without a dark inset.
  scene.face("jacket-interior", bottom, "shadow", 0);
  for (const [name, edge, side] of [
    ["upper", upper, -1],
    ["lower", lower, 1],
  ] as const) {
    const inset = shifted(edge, portrait ? [-side * 7, 0] : [0, -side * 7]);
    scene.face(
      "jacket-" + name + "-wall",
      [...edge, ...shifted(edge, depth).toReversed()],
      "silicon",
      0.93,
    );
    scene.face(
      "jacket-" + name + "-cut",
      [...edge, ...inset.toReversed()],
      "metal",
      0.88,
    );
    line(
      "jacket-" + name + "-seam",
      shifted(edge, [depth[0] * 0.45, depth[1] * 0.45]),
      { opacity: 0.35 },
    );
    // Short ribs expose the wall thickness without becoming unrelated motion.
    for (const index of [2, 3, 4, 5])
      line("jacket-" + name + "-rib-" + index, [edge[index], inset[index]], {
        opacity: 0.6,
      });
  }
  for (const [index, end] of ends.entries()) {
    for (const offset of [-3, 3]) {
      const ring: RuntimePoint[] = Array.from({ length: 17 }, (_, i) => {
        const angle = (i * Math.PI) / 8;
        return portrait
          ? [
              end[0] + Math.cos(angle) * 12,
              end[1] + offset + Math.sin(angle) * 5,
            ]
          : [
              end[0] + offset + Math.sin(angle) * 5,
              end[1] + Math.cos(angle) * 12,
            ];
      });
      line("jacket-neck-" + index + "-" + offset, ring, { opacity: 0.7 }, true);
    }
  }
  line("request-stream", request, {
    kind: "fine",
    opacity: 0.12 + sessionOpacity * 0.6,
  });
  line("reply-stream", reply, {
    kind: "fine",
    opacity: 0.12 + sessionOpacity * 0.6,
    tone: "pass",
  });
  for (const [name, route] of [
    ["request", request],
    ["reply", reply],
  ] as const) {
    for (const side of [-1, 1])
      line(
        `${name}-insulation-${side}`,
        route.map(([x, y]) =>
          portrait ? [x + side * 4, y] : [x, y + side * 4],
        ),
        { kind: "fine", opacity: sessionOpacity * 0.2 },
      );
    for (const progress of [0.2, 0.8]) {
      const [x, y] = runtimeAlong(route, progress);
      const direction = name === "request" ? 1 : -1;
      line(
        `${name}-direction-${progress}`,
        portrait
          ? [
              [x - 5, y - direction * 5],
              [x, y],
              [x + 5, y - direction * 5],
            ]
          : [
              [x - direction * 5, y - 5],
              [x, y],
              [x - direction * 5, y + 5],
            ],
        { kind: "fine", opacity: sessionOpacity * 0.6 },
      );
    }
  }
  const bulkBefore: RuntimePoint[] = portrait
    ? [
        [210, 191],
        [210, 244],
        [130, 244],
        [130, 312],
        [189, 312],
      ]
    : [
        [128, 248],
        [324, 248],
      ];
  const bulkAfter: RuntimePoint[] = portrait
    ? [
        [210, 417],
        [210, 558],
      ]
    : [
        [468, 248],
        [672, 248],
      ];
  line("bulk-before", bulkBefore, {
    kind: "fine",
    opacity: 0.15 + sessionOpacity * 0.45,
  });
  line("bulk-after", bulkAfter, {
    kind: "fine",
    opacity: 0.15 + sessionOpacity * 0.45,
  });

  const cellWidth = portrait ? 42 : 30;
  for (let cell = 0; cell < illustratedCreditCells; cell++) {
    const x = portrait ? 189 : 324 + cell * 38;
    const y = portrait ? 301 + cell * 31 : 236;
    const cellPath: RuntimePoint[] = [
      [x, y],
      [x + cellWidth, y],
      [x + cellWidth, y + 23],
      [x, y + 23],
    ];
    const buffer: Project3 = ([u, v, z]) => [x + u + z * 0.3, y + v - z * 0.5];
    scene.solid(
      "credit-block-" + cell,
      buffer,
      [0, 0, -5],
      [cellWidth, 23, 5],
      { material: "metal", opacity: 0.9 },
    );
    scene.face("credit-cell-" + cell, cellPath, "silicon", 0.88);
    const inset: RuntimePoint[] = [
      [x + 5, y + 5],
      [x + cellWidth - 5, y + 5],
      [x + cellWidth - 5, y + 18],
      [x + 5, y + 18],
    ];
    scene.face(
      "credited-bytes-" + cell,
      inset,
      "emissive",
      state.contentCells[cell].occupied * 0.85,
      "pending",
    );
    line(
      `credit-slot-link-${cell}`,
      portrait
        ? [
            [210, y + 23],
            [210, y + 31],
          ]
        : [
            [x + cellWidth, 248],
            [x + cellWidth + 8, 248],
          ],
      { kind: "fine", opacity: cell === illustratedCreditCells - 1 ? 0 : 0.4 },
    );
    packet(
      `consumed-content-${cell}`,
      runtimeAlong(bulkAfter, state.contentCells[cell].consumed),
      Math.sin(state.contentCells[cell].consumed * Math.PI) * 0.8,
      "pass",
    );
  }
  line(
    "credit-bracket",
    portrait
      ? [
          [178, 294],
          [171, 294],
          [171, 424],
          [178, 424],
        ]
      : [
          [319, 272],
          [319, 279],
          [470, 279],
          [470, 272],
        ],
    { kind: "fine", opacity: 0.55 },
  );
  label(
    "credit-limit",
    "BOUNDED CREDIT",
    portrait ? 210 : 400,
    portrait ? 266 : 301,
    { kind: "heading" },
  );
  label(
    "credit-detail",
    "4 slots for bytes",
    portrait ? 210 : 400,
    portrait ? 286 : 318,
  );
  label(
    "content-consumed",
    "read → credit",
    portrait ? 276 : 556,
    portrait ? 488 : 281,
    { opacity: state.contentCells[3].consumed, tone: "pass" },
  );

  packet(
    "original-request",
    runtimeAlong(request, state.sent),
    1 - state.committed,
    "pending",
  );
  packet(
    "lost-result",
    runtimeAlong(reply, state.lostReply * 0.5),
    state.committed * (1 - state.lost),
    "pass",
  );
  packet(
    "retried-request",
    runtimeAlong(request, state.retried),
    state.reconnected * (1 - state.returned),
    "pending",
  );
  packet(
    "recorded-result",
    runtimeAlong(reply, state.returned),
    state.returned,
    "pass",
  );
  const lostOpacity = state.lost * (1 - state.reconnected);
  line(
    "lost-reply-mark-a",
    [
      [lostPoint[0] - 8, lostPoint[1] - 8],
      [lostPoint[0] + 8, lostPoint[1] + 8],
    ],
    { opacity: lostOpacity, tone: "fail" },
  );
  line(
    "lost-reply-mark-b",
    [
      [lostPoint[0] - 8, lostPoint[1] + 8],
      [lostPoint[0] + 8, lostPoint[1] - 8],
    ],
    { opacity: lostOpacity, tone: "fail" },
  );
  label(
    "lost-reply-caption",
    "reply lost",
    portrait ? 283 : 400,
    portrait ? 414 : 410,
    { opacity: lostOpacity, tone: "fail" },
  );
  label(
    "completion-record",
    "R17 → S7",
    portrait ? 210 : 673,
    portrait ? 643 : 426,
    { kind: "name", tone: "pass", opacity: state.committed },
  );
  label(
    "effect-count",
    `SNAPSHOTS · ${state.effects}`,
    portrait ? 210 : 673,
    portrait ? 669 : 450,
    { kind: "heading", tone: state.effects ? "pass" : "neutral" },
  );
  label(
    "session-id",
    state.reconnected > 0.5
      ? "SESSION B · SAME R17"
      : state.lost > 0.5
        ? "SESSION A · LOST"
        : "SESSION A · TLS 1.3",
    portrait ? 210 : 400,
    portrait ? 710 : 470,
    {
      kind: "heading",
      tone:
        state.reconnected > 0.5
          ? "pass"
          : state.lost > 0.5
            ? "fail"
            : "neutral",
    },
  );
  label(
    "scope",
    "TRANSPORT SESSION ≠ OPERATION ID",
    portrait ? 210 : 400,
    portrait ? 731 : 505,
    { kind: "heading" },
  );
  return { paths: scene.paths, labels: scene.labels };
}
