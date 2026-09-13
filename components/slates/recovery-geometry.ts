import type { ProofFrame, ProofTone } from "../proof-work/proof-geometry";
import { recoveryRecord, recoveryState } from "./recovery-data";
import { runtimeAlong } from "./runtime-drawing";
import {
  spatialDrawing,
  spatialPulse,
  type Point2,
  type Point3,
  type Project3,
} from "./spatial-drawing";

/** The anchored memory cartridge is rigid. Only the daemon's execution blade
 * lifts out and returns; its retained contents never follow that motion. */
export function recoveryFrame(
  time: number,
  selection: number,
  portrait: boolean,
): ProofFrame {
  const d = spatialDrawing();
  const state = recoveryState(selection);
  const memory: Project3 = ([x, y, z]) => [
    (portrait ? 43 : 57) + x * 0.93 + y * 0.34,
    (portrait ? 254 : 263) - x * 0.2 + y * 0.66 - z * 0.95,
  ];
  const execution: Project3 = ([x, y, z]) => [
    (portrait ? 113 : 502) + x * 0.92 + y * 0.31,
    (portrait ? 490 : 292) - x * 0.18 + y * 0.55 - z * 0.95,
  ];
  const client: Project3 = ([x, y, z]) => [
    (portrait ? 143 : 567) + x * 0.94 + y * 0.31,
    (portrait ? 672 : 447) - x * 0.15 + y * 0.45 - z * 0.95,
  ];
  const frontAxes = [
    [1, 0, 0],
    [0, 0, -1],
  ] as const;
  const line3 = (
    id: string,
    camera: Project3,
    points: Point3[],
    opacity = 0.5,
    tone?: ProofTone,
  ) => d.line(id, points.map(camera), { opacity, tone });
  const parcel = (
    id: string,
    route: Point2[],
    progress: number,
    opacity: number,
    tone: ProofTone,
  ) => {
    const [x, y] = runtimeAlong(route, progress);
    const p: Project3 = ([a, b, c]) => [
      x + a * 0.94 + b * 0.31,
      y - a * 0.15 + b * 0.45 - c * 0.95,
    ];
    d.solid(id, p, [-5, -3, 0], [10, 7, 6], {
      material: "emissive",
      opacity,
      tone,
    });
  };
  d.label("heading", "RESTORE FILES AND SAVED RESULTS", 26, 35, {
    kind: "heading",
  });
  d.label("anchor-title", "ANCHOR · ALIVE", 26, portrait ? 86 : 96, {
    kind: "name",
    tone: "pass",
  });
  d.label(
    "anchor-role",
    "Keeps this shared memory alive",
    26,
    portrait ? 111 : 120,
  );

  // Deep support rails and keyed contacts remain when the daemon is absent.
  d.face(
    "retained-ram-shadow",
    [
      [-7, 9, -16],
      [307, 9, -16],
      [307, 126, -16],
      [-7, 126, -16],
    ].map(([x, y, z]) => memory([x, y, z])),
    "shadow",
    0.82,
  );
  d.solid("retained-ram-cradle", memory, [-5, 11, -13], [312, 111, 9], {
    material: "metal",
    opacity: 0.92,
  });
  d.solid("retained-ram-board", memory, [0, 0, -4], [302, 111, 10], {
    material: "circuit",
    opacity: 0.98,
  });
  for (let contact = 0; contact < 26; contact++) {
    const x = 11 + contact * 10.7;
    d.solid(
      "retained-ram-contact-" + contact,
      memory,
      [x, 105, -2],
      [5, 16, 3],
      { material: "metal", opacity: contact === 14 ? 0 : 0.82 },
    );
  }
  for (const side of [0, 1]) {
    const x = side ? 298 : -10;
    d.solid("retained-ram-clamp-" + side, memory, [x, 25, -11], [14, 46, 28], {
      material: "metal",
      opacity: 0.95,
    });
    d.solid(
      "retained-ram-clamp-inset-" + side,
      memory,
      [x + 3, 31, 17],
      [8, 34, 3],
      { material: "silicon", opacity: 0.85 },
    );
  }
  for (let trace = 0; trace < 8; trace++) {
    line3(
      "retained-ram-trace-" + trace,
      memory,
      [
        [19, 88 + trace * 1.4, 7],
        [277, 88 + trace * 1.4, 7],
        [277, 107, 7],
      ],
      0.22,
    );
  }
  d.label(
    "ram-title",
    "RETAINED MEMORY",
    portrait ? 210 : 213,
    portrait ? 153 : 163,
    { kind: "small", tone: "pass", anchor: "middle" },
  );

  for (const [name, x] of [
    ["workspace", 20],
    ["completion", 164],
  ] as const) {
    d.solid(name + "-package", memory, [x, 27, 7], [119, 58, 24], {
      material: "silicon",
      opacity: 0.98,
    });
    for (let pin = 0; pin < 10; pin++) {
      d.solid(
        name + "-package-pin-" + pin,
        memory,
        [x + 6 + pin * 10.8, 85, 5],
        [3, 9, 2],
        { material: "metal", opacity: 0.66 },
      );
    }
  }
  d.surfaceLabel(
    "workspace-volume",
    recoveryRecord.volume,
    memory,
    [28, 85, 16],
    { kind: "name", tone: "pass" },
    frontAxes,
  );
  d.surfaceLabel(
    "workspace-root",
    "root " + recoveryRecord.root,
    memory,
    [75, 85, 16],
    { kind: "small" },
    frontAxes,
  );
  d.surfaceLabel(
    "completion-id",
    recoveryRecord.request,
    memory,
    [172, 85, 16],
    { kind: "name", tone: "pass" },
    frontAxes,
  );
  d.surfaceLabel(
    "completion-result",
    "→ " + recoveryRecord.result,
    memory,
    [232, 85, 16],
    { kind: "small" },
    frontAxes,
  );
  for (let byte = 0; byte < 5; byte++) {
    d.solid(
      "workspace-bytes-" + byte,
      memory,
      [29 + byte * 20, 45, 32],
      [14, 23, 4],
      { material: "metal", opacity: 0.74, tone: "pass" },
    );
    line3(
      "workspace-byte-value-" + byte,
      memory,
      [
        [32 + byte * 20, 50, 37],
        [40 + byte * 20, 50, 37],
        [40 + byte * 20, 61, 37],
      ],
      0.75,
      "pass",
    );
  }
  // Like the spacecraft receipt, the status seal faces the reader. Project its
  // attachment point, not its circle: foreshortening the glyph stretches the tick.
  const seal = memory([224, 55, 33]);
  for (const [suffix, radius, opacity] of [
    ["ring", 13, 0.78],
    ["inset", 10.5, 0.36],
  ] as const)
    d.line(
      "completion-seal-" + suffix,
      Array.from({ length: 33 }, (_, i): Point2 => [
        seal[0] + radius * Math.cos((i * Math.PI) / 16),
        seal[1] + radius * Math.sin((i * Math.PI) / 16),
      ]),
      { kind: "edge", opacity, tone: "pass" },
    );
  d.line(
    "completion-seal",
    [
      [seal[0] - 5, seal[1]],
      [seal[0] - 1, seal[1] + 4],
      [seal[0] + 6, seal[1] - 5],
    ],
    { kind: "edge", opacity: 0.95, tone: "pass" },
  );
  const fileCaption = memory([18, 5, 38]),
    resultCaption = memory([168, 5, 38]);
  d.label("workspace-title", "FILE STATE", fileCaption[0], fileCaption[1] - 9, {
    kind: "heading",
  });
  d.label(
    "completion-title",
    "SAVED RESULT",
    resultCaption[0],
    resultCaption[1] - 9,
    { kind: "heading" },
  );

  // The anchor's status lamp is the only activity on the retained board.
  const anchorPulse = spatialPulse(time, 0.33);
  d.solid("anchor-controller", memory, [3, 13, 7], [9, 68, 10], {
    material: "metal",
    opacity: 0.92,
  });
  d.face(
    "anchor-alive-light",
    [
      [5, 19, 18],
      [10, 19, 18],
      [10, 26, 18],
      [5, 26, 18],
    ].map(([x, y, z]) => memory([x, y, z])),
    "emissive",
    0.4 + anchorPulse.opacity * 0.45,
    "pass",
  );
  const memoryPort = memory([152, 122, -2]);
  const socketPort = execution([85, 9, -2]);
  const channel: Point2[] = portrait
    ? [memoryPort, [memoryPort[0], 363], [socketPort[0], 405], socketPort]
    : [memoryPort, [437, memoryPort[1]], [437, socketPort[1]], socketPort];
  d.line("reattach-channel", channel, {
    opacity: 0.16 + Math.max(state.originalDaemon, state.attached) * 0.4,
  });
  for (const side of [-1, 1])
    d.line(
      "reattach-sleeve-" + side,
      channel.map(([x, y]) => [x + side * 3, y]),
      { opacity: 0.15 },
    );
  parcel(
    "rebuild-packet",
    channel,
    state.rebuilt,
    state.attached * (1 - state.rebuilt),
    "pass",
  );

  // Empty socket below the moving blade remains as a visible reference.
  d.solid("daemon-socket", execution, [-6, -5, -15], [184, 91, 11], {
    material: "metal",
    opacity: 0.82,
  });
  d.solid("daemon-socket-well", execution, [1, 2, -3], [170, 76, 3], {
    material: "silicon",
    opacity: 0.95,
  });
  for (let contact = 0; contact < 18; contact++) {
    d.solid(
      "daemon-socket-contact-" + contact,
      execution,
      [6 + contact * 9, 79, -1],
      [4, 7, 5],
      { material: "metal", opacity: 0.65 },
    );
  }
  const assembly = (
    id: string,
    lift: number,
    opacity: number,
    tone?: ProofTone,
  ) => {
    const p: Project3 = ([x, y, z]) => execution([x, y, z + lift]);
    d.solid(id + "-carrier", p, [0, 0, 4], [172, 77, 18], {
      material: "circuit",
      opacity: opacity * 0.98,
      tone,
    });
    d.solid(id + "-processor", p, [25, 17, 22], [92, 46, 13], {
      material: "metal",
      opacity: opacity * 0.96,
      tone,
    });
    d.solid(id + "-die", p, [34, 24, 35], [73, 31, 4], {
      material: "silicon",
      opacity: opacity * 0.95,
      tone,
    });
    for (let row = 0; row < 3; row++)
      for (let cell = 0; cell < 7; cell++) {
        const pulse = spatialPulse(time, 0.5, cell * 0.07 + row * 0.12);
        d.face(
          id + "-activity-" + row + "-" + cell,
          [
            [40 + cell * 8, 28 + row * 8, 40],
            [44 + cell * 8, 28 + row * 8, 40],
            [44 + cell * 8, 32 + row * 8, 40],
            [40 + cell * 8, 32 + row * 8, 40],
          ].map(([x, y, z]) => p([x, y, z])),
          "emissive",
          opacity * (0.1 + pulse.opacity * 0.32),
          tone,
        );
      }
    for (let fin = 0; fin < 6; fin++)
      d.solid(id + "-register-" + fin, p, [128, 11 + fin * 9, 22], [26, 4, 7], {
        material: "silicon",
        opacity: opacity * 0.9,
        tone,
      });
    for (let trace = 0; trace < 6; trace++)
      line3(
        id + "-trace-" + trace,
        p,
        [
          [8, 9 + trace * 9, 23],
          [19, 9 + trace * 9, 23],
          [19, 66, 23],
          [116, 66, 23],
        ],
        opacity * 0.3,
        tone,
      );
    d.surfaceLabel(
      id + "-inscription",
      "DAEMON",
      p,
      [18, 77, 8],
      { kind: "small", opacity },
      frontAxes,
    );
  };
  assembly("original-daemon", state.stopped * 98, state.originalDaemon);
  assembly(
    "replacement-daemon",
    (1 - state.attached) * 98,
    state.replacementDaemon,
    "pass",
  );
  const oldEdge = execution([172, 0, 14 + state.stopped * 98]),
    newEdge = execution([172, 0, 14 + (1 - state.attached) * 98]);
  d.line("original-removal-guide", [execution([177, 0, 0]), oldEdge], {
    opacity: state.stopped * (1 - state.stopped) * 0.6,
    dashArray: "3 5",
  });
  d.line("replacement-attachment-guide", [execution([177, 0, 0]), newEdge], {
    opacity: state.attached * (1 - state.attached) * 0.6,
    dashArray: "3 5",
  });
  d.label("daemon-title", "DAEMON", portrait ? 26 : 644, portrait ? 418 : 99, {
    kind: "heading",
    anchor: portrait ? "start" : "middle",
  });
  d.label(
    "daemon-state",
    state.attached > 0.5
      ? "replacement"
      : state.stopped > 0.5
        ? "stopped"
        : "original",
    portrait ? 26 : 644,
    portrait ? 443 : 121,
    {
      anchor: portrait ? "start" : "middle",
      tone:
        state.attached > 0.5
          ? "pass"
          : state.stopped > 0.5
            ? "fail"
            : "neutral",
    },
  );
  d.label(
    "restored-state",
    "V7 / r42",
    portrait ? 320 : 735,
    portrait ? 552 : 376,
    {
      kind: "small",
      anchor: portrait ? "middle" : "end",
      opacity: Math.max(state.originalDaemon, state.rebuilt),
      tone: "pass",
    },
  );

  // An open laptop makes the waiting caller distinct from both runtime pieces.
  d.solid("client-base", client, [0, 0, -4], [112, 37, 5], {
    material: "metal",
    opacity: 0.93,
  });
  d.solid("client-screen", client, [3, 0, 1], [106, 4, 44], {
    material: "metal",
    opacity: 0.96,
  });
  d.face(
    "client-display",
    [
      [10, 4.2, 7],
      [102, 4.2, 7],
      [102, 4.2, 40],
      [10, 4.2, 40],
    ].map(([x, y, z]) => client([x, y, z])),
    "silicon",
    0.97,
  );
  for (let key = 0; key < 9; key++)
    line3(
      "client-key-" + key,
      client,
      [
        [13 + key * 10, 13, 2],
        [19 + key * 10, 13, 2],
        [19 + key * 10, 24, 2],
        [13 + key * 10, 24, 2],
      ],
      0.4,
    );
  d.surfaceLabel(
    "client-result",
    state.returned > 0.8 ? "V7" : "7:18",
    client,
    [56, 4.3, 17],
    {
      kind: "name",
      anchor: "middle",
      tone: state.returned > 0.8 ? "pass" : "neutral",
    },
    frontAxes,
  );
  const clientTop = client([55, -2, 45]),
    daemonFront = execution([83, 85, -2]);
  const retry: Point2[] = [
    clientTop,
    [clientTop[0] - 18, portrait ? 573 : 377],
    [daemonFront[0] - 18, portrait ? 573 : 377],
    daemonFront,
  ];
  const reply: Point2[] = [
    daemonFront,
    [daemonFront[0] + 25, portrait ? 550 : 385],
    [clientTop[0] + 25, portrait ? 550 : 385],
    clientTop,
  ];
  d.line("retry-route", retry, { opacity: 0.14 + state.retried * 0.4 });
  d.line("reply-route", reply, {
    opacity: 0.14 + state.returned * 0.4,
    tone: "pass",
  });
  parcel(
    "retry-packet",
    retry,
    state.retried,
    state.retried * (1 - state.returned),
    "pending",
  );
  parcel(
    "original-result-packet",
    reply,
    state.returned,
    state.returned,
    "pass",
  );
  d.label(
    "client-title",
    "CLIENT",
    portrait ? 211 : 635,
    portrait ? 708 : 493,
    { kind: "heading", anchor: "middle" },
  );
  d.label(
    "retry-label",
    "retry 7:18",
    portrait ? 29 : 470,
    portrait ? 585 : 417,
  );
  d.label(
    "reply-label",
    "same V7",
    portrait ? 294 : 735,
    portrait ? 596 : 433,
    { anchor: portrait ? "start" : "middle", tone: "pass" },
  );
  d.label(
    "effect-count",
    "EFFECTS · 1",
    portrait ? 65 : 171,
    portrait ? 374 : 421,
    { kind: "heading", anchor: "middle", tone: "pass" },
  );
  d.label(
    "scope",
    "DAEMON RESTART · ANCHOR ALIVE",
    portrait ? 210 : 250,
    portrait ? 731 : 498,
    { kind: "heading", anchor: "middle" },
  );
  return { paths: d.paths, labels: d.labels };
}
