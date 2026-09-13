import type { ProofFrame, ProofTone } from "../proof-work/proof-geometry";
import { authorityActivity, authorityState } from "./authority-data";
import { spatialDrawing, spatialPulse, type Point2 } from "./spatial-drawing";
import {
  runtimeAlong,
  runtimeDrawing,
  runtimePhase,
  type RuntimePoint,
} from "./runtime-drawing";

/** Fixed machines make the ownership handoff visible; epochs govern requests, not motion. */
export function authorityFrame(
  time: number,
  selection: number,
  portrait: boolean,
): ProofFrame {
  const d = runtimeDrawing();
  const { line, label, packet } = d;
  const state = authorityState(selection);
  const xs = portrait ? [76, 210, 344] : [155, 400, 645];
  const cy = portrait ? 271 : 279;
  const w = portrait ? 68 : 100,
    h = portrait ? 106 : 148;
  const top = cy - h / 2,
    bottom = cy + h / 2;
  // The front plane is level and the depth axis recedes consistently. Only
  // actual admission endpoints are projected; network bends stay in their lanes.
  const machinePoint = (
    index: number,
    x: number,
    y: number,
    depth = 0,
  ): Point2 => [
    xs[index] + (x - xs[index]) * 0.88 + depth * 0.54,
    y - depth * 0.24,
  ];
  const admissionPoint = ([x, y]: RuntimePoint): RuntimePoint => {
    for (let i = 0; i < 3; i++)
      if (
        (Math.abs(x - (xs[i] - w / 2)) < 0.01 ||
          Math.abs(x - (xs[i] + w / 2)) < 0.01) &&
        [cy - 17, cy, cy + 13].some((v) => Math.abs(v - y) < 0.01)
      )
        return machinePoint(i, x, y);
    return [x, y];
  };
  const controller: RuntimePoint = portrait ? [210, 113] : [400, 100];
  const journal: RuntimePoint = portrait ? [210, 534] : [520, 431];
  const client: RuntimePoint = portrait ? [76, 435] : [84, 433];
  const frame = (
    id: string,
    x: number,
    y: number,
    width: number,
    height: number,
    opacity = 0.7,
    tone: ProofTone = "neutral",
  ) =>
    line(
      id,
      [
        [x, y],
        [x + width, y],
        [x + width, y + height],
        [x, y + height],
      ],
      { kind: "glass", opacity, tone },
      true,
    );
  const circle = (
    id: string,
    x: number,
    y: number,
    radius: number,
    opacity: number,
    tone: ProofTone = "neutral",
  ) =>
    line(
      id,
      Array.from({ length: 25 }, (_, i): RuntimePoint => [
        x + radius * Math.cos((i * Math.PI) / 12),
        y + radius * Math.sin((i * Math.PI) / 12),
      ]),
      { opacity, tone },
      true,
    );

  label("heading", "RECOVER BEFORE SERVING", 26, 30, {
    kind: "heading",
    anchor: "start",
  });
  label("council-name", "REGIONAL COUNCIL", controller[0], portrait ? 62 : 46, {
    kind: "heading",
    anchor: "middle",
  });
  // Three voters report to a configuration terminal, with an explicit epoch readout.
  const terminalX = controller[0] - 92,
    terminalY = controller[1] - 29;
  frame("council-terminal", terminalX, terminalY, 184, 58);
  frame("council-display", controller[0] - 23, controller[1] - 20, 46, 35, 0.6);
  for (let seat = 0; seat < 3; seat++) {
    const vx = terminalX + 15 + seat * 16;
    frame(
      "council-voter-" + seat,
      vx,
      terminalY + 17,
      9,
      16,
      0.35 + state.authorization * 0.5,
      "pass",
    );
    line(
      "council-vote-wire-" + seat,
      [
        [vx + 4, terminalY + 33],
        [vx + 4, terminalY + 44],
        [controller[0] - 29, terminalY + 44],
      ],
      { opacity: 0.2 + state.authorization * 0.3, kind: "fine" },
    );
  }
  for (let vent = 0; vent < 5; vent++)
    line(
      "council-vent-" + vent,
      [
        [controller[0] + 39, terminalY + 14 + vent * 6],
        [controller[0] + 76, terminalY + 14 + vent * 6],
      ],
      { opacity: 0.25, kind: "fine" },
    );
  label("council-epoch", "E" + state.epoch, controller[0], controller[1] + 3, {
    kind: "name",
    anchor: "middle",
    tone: state.epoch === 5 ? "pass" : "neutral",
  });
  label(
    "council-status",
    state.epoch === 5
      ? "AUTHORIZE OWNER B · EPOCH 5"
      : "CURRENT OWNER A · EPOCH 4",
    controller[0],
    portrait ? 174 : 166,
    {
      kind: "small",
      anchor: "middle",
      tone: state.epoch === 5 ? "pass" : "neutral",
    },
  );

  // Surviving holders install the configuration without contacting failed A.
  const controlY = portrait ? 194 : 183;
  line(
    "council-control-bus",
    portrait
      ? [
          [302, 113],
          [406, 113],
          [406, controlY],
          [118, controlY],
        ]
      : [
          [492, 100],
          [784, 100],
          [784, controlY],
          [215, controlY],
        ],
    { kind: "fine", opacity: 0.15 + state.authorization * 0.4 },
  );
  xs.forEach((x, index) => {
    const outer = x + w / 2 + (portrait ? 27 : 43);
    const installed = index === 0 ? 0 : state.authorization;
    line(
      "candidate-config-" + index,
      [
        [outer, controlY],
        [outer, cy - 17],
        [x + w / 2, cy - 17],
      ],
      { kind: "fine", opacity: 0.1 + installed * 0.4, tone: "pass" },
    );
    frame(
      "installed-fence-" + ["A", "B", "C"][index],
      outer - 3,
      cy - 20,
      6,
      6,
      installed * 0.8,
      "pass",
    );
  });

  for (let index = 0; index < 3; index++) {
    const id = ["A", "B", "C"][index],
      x = xs[index],
      left = x - w / 2;
    const resumed = runtimePhase(selection, 4.05, 4.4);
    const powered =
      index === 0 ? 1 - state.suspicion * 0.8 + resumed * 0.35 : 1;
    const owner =
      index === 0
        ? (1 - state.suspicion) * (1 - state.authorization)
        : index === 1
          ? state.service
          : 0;
    const role =
      index === 0
        ? selection >= 4.4
          ? "OLD OWNER"
          : selection >= 1
            ? "OFFLINE"
            : "OWNER"
        : index === 1
          ? selection >= 4
            ? "OWNER"
            : selection >= 2
              ? "RECOVERING"
              : "REPLICA"
          : "REPLICA";
    const stored = index === 2 && selection < 4 ? "v6" : "v7";
    label("candidate-" + id, id, x, top + 16, {
      kind: "name",
      anchor: "middle",
    });
    // A compact server cabinet, not an exposed PCB: level face, recessed
    // rack-mounted units, two uprights and independently seated drive trays.
    frame("machine-" + id + "-front", left, top, w, h, 0.96);
    frame(
      "machine-" + id + "-recess",
      left + 5,
      top + 21,
      w - 10,
      h - 27,
      0.95,
    );
    frame("machine-" + id + "-header", left + 5, top + 2, w - 10, 21, 0.9);
    for (const edge of [-1, 1]) {
      const ex = x + edge * (w / 2 - 8);
      line(
        "machine-" + id + "-ear-" + edge,
        [
          [ex - 2, top + 23],
          [ex + 2, top + 23],
          [ex + 2, bottom - 8],
          [ex - 2, bottom - 8],
        ],
        { kind: "glass", opacity: 0.88 },
        true,
      );
      for (let slot = 0; slot < (portrait ? 6 : 9); slot++)
        frame(
          `machine-${id}-rail-hole-${edge}-${slot}`,
          ex - 0.8,
          top + 26 + slot * (portrait ? 11 : 12),
          1.6,
          2.5,
          0.6,
        );
      for (let screw = 0; screw < 2; screw++) {
        const sy = top + 6 + screw * (h - 12);
        circle(
          `machine-${id}-screw-${edge}-${screw}`,
          ex + edge * 5,
          sy,
          1.2,
          0.6,
        );
        line(
          `machine-${id}-screw-slot-${edge}-${screw}`,
          [
            [ex + edge * 5 - 0.7, sy],
            [ex + edge * 5 + 0.7, sy],
          ],
          { kind: "fine", opacity: 0.65 },
        );
      }
    }
    const fanBayY = top + 25,
      fanBayH = portrait ? 27 : 38,
      driveBayY = fanBayY + fanBayH + 5,
      driveBayH = portrait ? 20 : 36;
    for (const [bay, yy, hh] of [
      [0, fanBayY, fanBayH],
      [1, driveBayY, driveBayH],
    ] as const) {
      frame(
        `machine-${id}-bay-shadow-${bay}`,
        left + 10,
        yy - 1,
        w - 20,
        hh + 3,
        0.96,
      );
      frame(`machine-${id}-bay-${bay}`, left + 12, yy, w - 24, hh, 0.9);
      // Beveled lower rail and short U-shaped pull handles read as inserted units.
      line(
        `machine-${id}-bay-lip-${bay}`,
        [
          [left + 12, yy + hh],
          [left + 14, yy + hh + 2],
          [left + w - 10, yy + hh + 2],
          [left + w - 12, yy + hh],
        ],
        { kind: "glass", opacity: 0.82 },
        true,
      );
      for (const direction of [-1, 1]) {
        const hx = x + direction * (w / 2 - 15);
        line(
          `machine-${id}-tray-handle-${bay}-${direction}`,
          [
            [hx, yy + hh * 0.25],
            [hx - direction * 2.5, yy + hh * 0.25],
            [hx - direction * 2.5, yy + hh * 0.73],
            [hx, yy + hh * 0.73],
          ],
          { kind: "edge", opacity: 0.78 },
        );
      }
    }
    for (let fan = 0; fan < 2; fan++) {
      const fx = x + (fan ? 1 : -1) * w * 0.19,
        fy = fanBayY + fanBayH * 0.47,
        radius = portrait ? 6.3 : 9.5;
      circle(`machine-${id}-fan-well-${fan}`, fx, fy, radius + 1.3, 0.88);
      circle(
        "machine-" + id + "-fan-" + fan,
        fx,
        fy,
        radius,
        0.3 + powered * 0.3,
      );
      circle(`machine-${id}-fan-hub-${fan}`, fx, fy, radius * 0.2, 0.55);
      for (let blade = 0; blade < 4; blade++) {
        const a =
          (blade * Math.PI) / 2 +
          time * 2.3 * (index === 0 ? 1 - state.suspicion + resumed : 1);
        line(
          `machine-${id}-blade-${fan}-${blade}`,
          [
            [
              fx + Math.cos(a) * radius * 0.18,
              fy + Math.sin(a) * radius * 0.18,
            ],
            [
              fx + Math.cos(a + 0.2) * radius * 0.78,
              fy + Math.sin(a + 0.2) * radius * 0.78,
            ],
            [
              fx + Math.cos(a + 0.72) * radius * 0.68,
              fy + Math.sin(a + 0.72) * radius * 0.68,
            ],
            [
              fx + Math.cos(a + 0.7) * radius * 0.28,
              fy + Math.sin(a + 0.7) * radius * 0.28,
            ],
          ],
          { kind: "glass", opacity: powered * 0.62 },
          true,
        );
      }
      for (let vent = 0; vent < 3; vent++)
        line(
          `machine-${id}-fan-grille-${fan}-${vent}`,
          [
            [fx - radius * 0.65, fy + radius + 3 + vent * 1.5],
            [fx + radius * 0.65, fy + radius + 3 + vent * 1.5],
          ],
          { kind: "fine", opacity: 0.3 },
        );
    }
    // Preserve the memory-bank identity while showing the actual removable
    // front trays, with latch rails, handles, and activity indicators.
    frame(
      "machine-" + id + "-ram",
      left + 17,
      driveBayY + 3,
      w - 34,
      driveBayH - 6,
      0.94,
    );
    for (let bank = 0; bank < 4; bank++) {
      const span = (w - 34) / 4,
        bx = left + 17 + bank * span;
      frame(
        `machine-${id}-ram-chip-${bank}`,
        bx + 1,
        driveBayY + 4,
        span - 2,
        driveBayH - 8,
        0.88,
      );
      line(
        `machine-${id}-drive-latch-${bank}`,
        [
          [bx + 2, driveBayY + 7],
          [bx + span - 2, driveBayY + 7],
          [bx + span - 2, driveBayY + driveBayH - 6],
        ],
        { kind: "fine", opacity: 0.62 },
      );
      line(
        `machine-${id}-drive-light-${bank}`,
        [
          [bx + 2, driveBayY + driveBayH - 4],
          [bx + span - 2, driveBayY + driveBayH - 4],
        ],
        { kind: "fine", opacity: 0.15 + powered * 0.48, tone: "pass" },
      );
    }
    const readoutY = bottom - 13;
    frame(`machine-${id}-display`, left + 10, readoutY - 13, w - 20, 19, 0.97);
    label("initial-" + id, stored, x - (portrait ? 11 : 12), readoutY, {
      kind: "small",
      anchor: "middle",
      tone: index === 2 && selection < 4 ? "pending" : "pass",
    });
    label(
      "machine-epoch-" + id,
      "E" + (index === 0 ? 4 : state.epoch),
      x + (portrait ? 11 : 15),
      readoutY,
      {
        kind: "small",
        anchor: "middle",
        tone: index === 0 && selection >= 4.4 ? "fail" : "neutral",
      },
    );
    line(
      "machine-" + id + "-service-light",
      [
        [left + 13, bottom - 6],
        [left + w - 13, bottom - 6],
      ],
      { opacity: 0.13 + owner * 0.8, tone: "pass" },
    );
    label("role-" + id, role, x, bottom + 26, {
      kind: "small",
      anchor: "middle",
      tone:
        role === "OFFLINE" || role === "OLD OWNER"
          ? "fail"
          : role === "OWNER"
            ? "pass"
            : "neutral",
    });
    for (const direction of [-1, 1]) {
      line(
        "machine-" + id + "-port-" + direction,
        [
          [x + (direction * w) / 2, cy + 13],
          [x + direction * (w / 2 + 5), cy + 13],
        ],
        { opacity: 0.65, kind: "fine" },
      );
      for (const [socket, yy] of [
        ["config", cy - 17],
        ["replica", cy],
        ["write", cy + 13],
      ] as const)
        frame(
          `machine-${id}-socket-${direction}-${socket}`,
          x + (direction * w) / 2 - 1.7,
          yy - 2.4,
          3.4,
          4.8,
          0.8,
        );
    }
    for (let cross = 0; cross < 2; cross++)
      line(
        "machine-" + id + "-failed-" + cross,
        [
          [x - 4, fanBayY + fanBayH * 0.47 - 4 + cross * 8],
          [x + 4, fanBayY + fanBayH * 0.47 + 4 - cross * 8],
        ],
        {
          opacity: index === 0 ? state.suspicion * (1 - resumed) : 0,
          tone: "fail",
        },
      );
  }

  // An application sends writes over the active owner's route.
  frame("client-screen", client[0] - 23, client[1] - 20, 46, 30, 0.6);
  line(
    "client-keyboard",
    [
      [client[0] - 23, client[1] + 10],
      [client[0] + 23, client[1] + 10],
      [client[0] + 31, client[1] + 22],
      [client[0] - 31, client[1] + 22],
    ],
    { opacity: 0.65 },
    true,
  );
  for (let row = 0; row < 3; row++)
    line(
      "client-command-" + row,
      [
        [client[0] - 16, client[1] - 12 + row * 6],
        [client[0] + (row === 1 ? 4 : 16), client[1] - 12 + row * 6],
      ],
      { kind: "fine", opacity: 0.4 },
    );
  label("client-label", "CLIENT WRITES", client[0], client[1] - 35, {
    kind: "small",
    anchor: "middle",
  });
  const oldRoute: RuntimePoint[] = portrait
    ? [
        [client[0] - 23, client[1]],
        [18, client[1]],
        [18, cy + 13],
        [xs[0] - w / 2, cy + 13],
      ]
    : [
        [client[0] - 23, client[1]],
        [34, client[1]],
        [34, cy + 13],
        [xs[0] - w / 2, cy + 13],
      ];
  const newRoute: RuntimePoint[] = portrait
    ? [
        [client[0] + 23, client[1]],
        [277, client[1]],
        [277, cy + 13],
        [xs[1] + w / 2, cy + 13],
      ]
    : [
        [client[0] + 23, client[1]],
        [321, client[1]],
        [321, cy + 13],
        [xs[1] - w / 2, cy + 13],
      ];
  line("old-write-route", oldRoute, {
    kind: "fine",
    opacity: 0.1 + (1 - state.suspicion) * 0.5,
    tone: "pending",
  });
  line("new-write-route", newRoute, {
    kind: "fine",
    opacity: state.service * 0.7,
    tone: "pass",
  });
  packet(
    "new-owner-write",
    runtimeAlong(newRoute, runtimePhase(selection, 4, 4.8)),
    runtimePhase(selection, 4, 4.08) *
      (1 - runtimePhase(selection, 4.8, 5)) *
      0.85,
    "pass",
  );

  // Two returned records are read side by side. The accepted v7 is retained, not invented.
  const pageY = journal[1] - 24,
    pageX = journal[0] - 57;
  for (let n = 0; n < 2; n++) {
    const x = pageX + n * 65;
    line(
      "recovery-record-" + n,
      [
        [x, pageY],
        [x + 33, pageY],
        [x + 46, pageY + 12],
        [x + 46, pageY + 48],
        [x, pageY + 48],
      ],
      {
        kind: "glass",
        opacity: state.adoption * 0.6,
        tone: n === 0 ? "pass" : "pending",
      },
      true,
    );
    line(
      "recovery-fold-" + n,
      [
        [x + 33, pageY],
        [x + 33, pageY + 12],
        [x + 46, pageY + 12],
      ],
      { opacity: state.adoption * 0.65 },
    );
    label(
      "recovery-version-" + n,
      n === 0 ? "B: v7" : "C: v6",
      x + 22,
      pageY + 31,
      {
        kind: "small",
        anchor: "middle",
        opacity: state.adoption,
        tone: n === 0 ? "pass" : "pending",
      },
    );
  }
  const promiseRoutes: RuntimePoint[][] = [];
  for (let n = 0; n < 2; n++) {
    const sx = xs[n + 1] + w / 2;
    const path: RuntimePoint[] =
      n === 0
        ? [
            [sx, cy + 13],
            [portrait ? 284 : 455, cy + 13],
            [portrait ? 284 : 455, pageY - 18],
            [pageX + 22, pageY - 18],
            [pageX + 22, pageY],
          ]
        : [
            [sx, cy + 13],
            [portrait ? 399 : 748, cy + 13],
            [portrait ? 399 : 748, journal[1]],
            [pageX + 111, journal[1]],
          ];
    promiseRoutes.push(path);
    line("promise-" + ["B", "C"][n] + "-route", path, {
      kind: "fine",
      opacity: state.adoption * 0.35,
      tone: "pass",
    });
    packet(
      "promise-" + ["B", "C"][n],
      runtimeAlong(path, state.adoption),
      state.adoption * (1 - runtimePhase(selection, 2.8, 3)),
      "pass",
    );
  }
  label(
    "recovered-head",
    "RECOVER v7 FROM B + C",
    journal[0],
    journal[1] + 52,
    { kind: "small", anchor: "middle", opacity: state.adoption, tone: "pass" },
  );

  // Recommit v7 to C under epoch 5 before B becomes the serving owner.
  const replicaRoute: RuntimePoint[] = [
    [xs[1] + w / 2, cy],
    [xs[2] - w / 2, cy],
  ];
  line("recommit-route", replicaRoute, {
    kind: "fine",
    opacity: state.service * 0.6,
    tone: "pass",
  });
  packet(
    "recommit-v7",
    runtimeAlong(replicaRoute, state.service),
    state.service * (1 - state.service) * 3,
    "pass",
  );

  // The old owner's attempted write is stopped at the successor's epoch check.
  const refusalX = portrait ? 153 : 301;
  const staleRoute: RuntimePoint[] = [
    [xs[0] + w / 2, cy + 13],
    [refusalX - 9, cy + 13],
  ];
  line("stale-route", staleRoute, {
    kind: "fine",
    opacity: state.staleArrival * 0.4,
    tone: "fail",
  });
  packet(
    "stale-request",
    runtimeAlong(staleRoute, state.staleArrival),
    state.staleArrival * 0.8,
    "fail",
  );
  for (let cross = 0; cross < 2; cross++)
    line(
      "stale-refused-cross-" + cross,
      [
        [refusalX - 5, cy + 7 + cross * 12],
        [refusalX + 5, cy + 19 - cross * 12],
      ],
      { opacity: state.refusal, tone: "fail" },
    );
  label(
    "refusal-label",
    "E4 REFUSED",
    portrait ? 210 : 280,
    portrait ? 382 : 393,
    { kind: "small", anchor: "middle", opacity: state.refusal, tone: "fail" },
  );

  const status = state.rejected
    ? "A RETURNS · ITS WRITES ARE REJECTED"
    : state.servedVersion
      ? "B SERVES v7 UNDER EPOCH 5"
      : state.adoptedVersion
        ? "B RECOVERS v7 · NOT SERVING YET"
        : state.epoch === 5
          ? "B AUTHORIZED · RECOVERY REQUIRED"
          : selection >= 1
            ? "A OFFLINE · WRITES WAIT"
            : "A SERVES v7 UNDER EPOCH 4";
  label("status", status, portrait ? 210 : 400, portrait ? 652 : 503, {
    kind: "heading",
    anchor: "middle",
    tone: state.rejected ? "fail" : state.servedVersion ? "pass" : "pending",
  });
  if (portrait) {
    label("rule", "Recover, recommit, then resume writes.", 210, 683, {
      anchor: "middle",
    });
    label("unchanged-version", "New owner. Same accepted version.", 210, 712, {
      anchor: "middle",
    });
  }

  // Each held stage replays its own message exchange. Hardware and accepted
  // state stay fixed: these are requests, replies and returned records, not
  // an ambient clock that can promote a writer or manufacture a commit.
  const activity = authorityActivity(time, selection);
  const route = (points: readonly RuntimePoint[]) => points.map(admissionPoint);
  const reverse = (points: readonly RuntimePoint[]) => [...points].reverse();
  const ownRoute = route(oldRoute),
    servingRoute = route(newRoute);
  const ownReplica = route([
    [xs[0] + w / 2, cy],
    [xs[1] - w / 2, cy],
  ]);
  const probeRoute = route([
    [controller[0] - 92, controller[1]],
    [portrait ? 18 : 34, controller[1]],
    [portrait ? 18 : 34, cy + 13],
    [xs[0] - w / 2, cy + 13],
  ]);
  const epochRoute = (index: number): RuntimePoint[] => {
    const outer = xs[index] + w / 2 + (portrait ? 27 : 43);
    return [
      [controller[0] + 92, controller[1]],
      [portrait ? 406 : 784, controller[1]],
      [portrait ? 406 : 784, controlY],
      [outer, controlY],
      [outer, cy - 17],
    ];
  };
  const returnedB = route(promiseRoutes[0]),
    returnedC = route(promiseRoutes[1]);
  const recommit = route(replicaRoute);
  const refused = route([
    [xs[0] + w / 2, cy + 13],
    [refusalX - 6, cy + 13],
  ]);
  line("activity-own-replica-route", ownReplica, {
    opacity: activity.own * 0.45,
    tone: "pending",
    kind: "fine",
  });
  line("activity-probe-route", probeRoute, {
    opacity: activity.suspect * 0.4,
    tone: "pending",
    kind: "fine",
  });
  const datagram = (
    name: string,
    points: readonly RuntimePoint[],
    state: { progress: number; opacity: number },
    tone: ProofTone,
  ) => {
    const [px, py] = runtimeAlong(points, state.progress),
      r = portrait ? 5 : 6;
    line(
      `activity-${name}-packet`,
      [
        [px - r, py - 4],
        [px + r - 3, py - 4],
        [px + r, py - 1],
        [px + r, py + 4],
        [px - r, py + 4],
      ],
      { kind: "glass", opacity: state.opacity * 0.98, tone },
      true,
    );
    line(
      `activity-${name}-fold`,
      [
        [px + r - 3, py - 4],
        [px + r - 3, py - 1],
        [px + r, py - 1],
      ],
      { kind: "edge", opacity: state.opacity * 0.85, tone },
    );
    line(
      `activity-${name}-content`,
      [
        [px - r + 2, py + 1],
        [px + r - 2, py + 1],
      ],
      { kind: "edge", opacity: state.opacity * 0.85, tone },
    );
  };
  datagram("own-write", ownRoute, activity.packets.ownWrite, "pending");
  datagram("own-copy-v7", ownReplica, activity.packets.ownCopy, "pending");
  datagram("own-ack-v7", reverse(ownReplica), activity.packets.ownAck, "pass");
  datagram(
    "own-client-reply",
    reverse(ownRoute),
    activity.packets.ownReply,
    "pass",
  );
  datagram(
    "suspect-probe",
    probeRoute,
    activity.packets.suspectProbe,
    "pending",
  );
  datagram("authorize-B", epochRoute(1), activity.packets.authorizeB, "pass");
  datagram("authorize-C", epochRoute(2), activity.packets.authorizeC, "pass");
  datagram("adopt-B-v7", returnedB, activity.packets.adoptB, "pass");
  datagram("adopt-C-v6", returnedC, activity.packets.adoptC, "pending");
  datagram(
    "adopt-content-v7",
    reverse(returnedB),
    activity.packets.adoptContent,
    "pass",
  );
  datagram("serve-copy-v7", recommit, activity.packets.serveCopy, "pass");
  datagram(
    "serve-ack-v7",
    reverse(recommit),
    activity.packets.serveAck,
    "pass",
  );
  datagram(
    "serve-client-write",
    servingRoute,
    activity.packets.serveWrite,
    "pending",
  );
  datagram(
    "serve-client-reply",
    reverse(servingRoute),
    activity.packets.serveReply,
    "pass",
  );
  datagram("refused-write", refused, activity.packets.refusedWrite, "fail");
  datagram(
    "refused-StaleEpoch",
    reverse(refused),
    activity.packets.refusedReply,
    "fail",
  );
  // Pending work stays beside the client while A is unresponsive; no success
  // reply or replication is drawn anywhere in the Suspect stage.
  for (let i = 2; i >= 0; i--)
    line(
      `activity-waiting-request-${i}-packet`,
      [
        [client[0] + 35 + i * 4, client[1] - 14 - i * 5],
        [client[0] + 47 + i * 4, client[1] - 14 - i * 5],
        [client[0] + 51 + i * 4, client[1] - 10 - i * 5],
        [client[0] + 51 + i * 4, client[1] - 2 - i * 5],
        [client[0] + 35 + i * 4, client[1] - 2 - i * 5],
      ],
      {
        kind: "glass",
        opacity: activity.suspect * (0.6 + i * 0.1),
        tone: "pending",
      },
      true,
    );
  const timerX = portrait ? 18 : 34,
    timerY = cy - 28;
  circle(
    "activity-probe-timer",
    timerX,
    timerY,
    7,
    activity.suspect * 0.48,
    "pending",
  );
  line(
    "activity-probe-timer-progress",
    Array.from({ length: 25 }, (_, i): RuntimePoint => {
      const a = -Math.PI / 2 + (activity.timer * Math.PI * 2 * i) / 24;
      return [timerX + 7 * Math.cos(a), timerY + 7 * Math.sin(a)];
    }),
    {
      kind: "edge",
      opacity: activity.probeWait,
      tone: activity.probeExpired > 0.5 ? "fail" : "pending",
    },
  );
  for (let cross = 0; cross < 2; cross++)
    line(
      `activity-probe-timeout-${cross}`,
      [
        [timerX - 3, timerY - 3 + cross * 6],
        [timerX + 3, timerY + 3 - cross * 6],
      ],
      { kind: "edge", opacity: activity.probeExpired, tone: "fail" },
    );
  for (const index of [1, 2]) {
    const ex = xs[index] + w / 2 + (portrait ? 27 : 43),
      ey = cy - 17;
    line(
      `activity-installed-${index}`,
      [
        [ex - 4, ey],
        [ex - 1, ey + 3],
        [ex + 5, ey - 4],
      ],
      {
        kind: "edge",
        opacity: index === 1 ? activity.fenceB : activity.fenceC,
        tone: "pass",
      },
    );
  }
  line(
    "epoch-admission-fence",
    [
      [refusalX, cy + 5],
      [refusalX, cy + 22],
    ],
    { kind: "edge", opacity: state.authorization * 0.8, tone: "pass" },
  );
  label("fence-epoch", "E5", refusalX, cy - 2, {
    kind: "small",
    anchor: "middle",
    opacity: state.authorization,
    tone: "pass",
  });
  for (let cross = 0; cross < 2; cross++)
    line(
      `activity-refusal-impact-${cross}`,
      [
        [refusalX - 4, cy + 8 + cross * 12],
        [refusalX + 4, cy + 20 - cross * 12],
      ],
      { kind: "edge", opacity: activity.blocked, tone: "fail" },
    );
  label("activity-caption", activity.caption, 28, portrait ? 477 : 478, {
    kind: "small",
    anchor: "start",
    tone: selection >= 4.8 || activity.probeExpired > 0.5 ? "fail" : "pending",
  });
  // Chassis have a coherent front plane and deep side/top surfaces. All front
  // components, inscriptions and cable ports share the same fixed projection.
  const bodies = spatialDrawing();
  bodies.face(
    "council-shadow",
    [
      [terminalX + 4, terminalY + 60],
      [terminalX + 194, terminalY + 60],
      [terminalX + 203, terminalY + 51],
      [terminalX + 13, terminalY + 51],
    ],
    "shadow",
    0.72,
  );
  bodies.face(
    "council-top",
    [
      [terminalX, terminalY],
      [terminalX + 184, terminalY],
      [terminalX + 195, terminalY - 9],
      [terminalX + 11, terminalY - 9],
    ],
    "metal",
    0.94,
  );
  bodies.face(
    "council-side",
    [
      [terminalX + 184, terminalY],
      [terminalX + 184, terminalY + 58],
      [terminalX + 195, terminalY + 49],
      [terminalX + 195, terminalY - 9],
    ],
    "metal",
    0.82,
  );
  for (let vent = 0; vent < 7; vent++) {
    bodies.line(
      "council-top-slot-" + vent,
      [
        [terminalX + 105 + vent * 8, terminalY - 2],
        [terminalX + 112 + vent * 8, terminalY - 7],
      ],
      { opacity: 0.42, kind: "fine" },
    );
    bodies.line(
      "council-side-slot-" + vent,
      [
        [terminalX + 186, terminalY + 11 + vent * 5],
        [terminalX + 193, terminalY + 6 + vent * 5],
      ],
      { opacity: 0.42, kind: "fine" },
    );
  }
  const machineDepth = portrait ? 43 : 64;
  for (let index = 0; index < 3; index++) {
    const id = ["A", "B", "C"][index],
      x = xs[index],
      left = x - w / 2,
      right = x + w / 2;
    const p = (xx: number, yy: number, z = 0) => machinePoint(index, xx, yy, z);
    bodies.face(
      "rack-shadow-" + id,
      [
        p(left - 5, bottom + 7),
        p(right + 4, bottom + 7),
        p(right + 4, bottom + 7, machineDepth + 6),
        p(left - 5, bottom + 7, machineDepth + 6),
      ],
      "shadow",
      0.8,
    );
    bodies.face(
      "rack-side-" + id,
      [
        p(right, top),
        p(right, bottom),
        p(right, bottom, machineDepth),
        p(right, top, machineDepth),
      ],
      "metal",
      0.93,
    );
    bodies.face(
      "rack-top-" + id,
      [
        p(left, top),
        p(right, top),
        p(right, top, machineDepth),
        p(left, top, machineDepth),
      ],
      "metal",
      0.98,
    );
    bodies.face(
      `rack-side-inset-${id}`,
      [
        p(right, top + 10, 7),
        p(right, bottom - 12, 7),
        p(right, bottom - 12, machineDepth - 6),
        p(right, top + 10, machineDepth - 6),
      ],
      "silicon",
      0.72,
    );
    bodies.line(
      `rack-rear-upright-${id}`,
      [
        p(right, top + 3, machineDepth - 2),
        p(right, bottom - 3, machineDepth - 2),
      ],
      { kind: "edge", opacity: 0.82 },
    );
    for (let vent = 0; vent < (portrait ? 12 : 18); vent++)
      bodies.line(
        "rack-side-vent-" + id + "-" + vent,
        [
          p(right, top + 18 + vent * 6, 11),
          p(right, top + 18 + vent * 6, machineDepth - 10),
        ],
        { opacity: 0.48 },
      );
    for (const foot of [-1, 1]) {
      const fx = x + foot * (w / 2 - 10) - 4;
      for (const rear of [false, true]) {
        const z = rear ? machineDepth - 12 : 3,
          key = `rack-foot-${id}-${foot}-${rear ? "rear" : "front"}`;
        bodies.face(
          key + "-side",
          [
            p(fx + 8, bottom + 1, z),
            p(fx + 8, bottom + 8, z),
            p(fx + 8, bottom + 8, z + 8),
            p(fx + 8, bottom + 1, z + 8),
          ],
          "silicon",
          0.94,
        );
        bodies.face(
          key + "-face",
          [
            p(fx, bottom + 1, z),
            p(fx + 8, bottom + 1, z),
            p(fx + 8, bottom + 8, z),
            p(fx, bottom + 8, z),
          ],
          "metal",
          0.92,
        );
      }
    }
    bodies.face(
      `rack-plinth-${id}`,
      [
        p(left + 2, bottom - 3),
        p(right - 2, bottom - 3),
        p(right - 2, bottom + 3),
        p(left + 2, bottom + 3),
      ],
      "metal",
      0.98,
    );
    for (let fin = 0; fin < 6; fin++)
      bodies.line(
        "rack-top-vent-" + id + "-" + fin,
        [
          p(left + 14 + (fin * (w - 28)) / 6, top, 7),
          p(left + 14 + (fin * (w - 28)) / 6, top, machineDepth - 6),
        ],
        { opacity: 0.58 },
      );
    const sweep = spatialPulse(time, 0.25, index * 0.22),
      alive = index === 0 ? 1 - state.suspicion : 1;
    bodies.line(
      "rack-health-sweep-" + id,
      [
        p(left + 13 + sweep.progress * (w - 26), bottom - 6),
        p(left + 13 + sweep.progress * (w - 26), bottom - 3),
      ],
      { kind: "edge", opacity: sweep.opacity * alive * 0.8, tone: "pass" },
    );
  }
  const mapped = d.paths.map((path) => {
    const machine = /^machine-([ABC])-/.exec(path.id);
    const project = machine
      ? (x: number, y: number) => machinePoint("ABC".indexOf(machine[1]), x, y)
      : undefined;
    const mappedD = path.d.replace(
      /([ML])(-?[\d.]+)\s+(-?[\d.]+)/g,
      (all, command, xValue, yValue) => {
        const x = Number(xValue),
          y = Number(yValue);
        if (project) {
          const [px, py] = project(x, y);
          return command + px.toFixed(3) + " " + py.toFixed(3);
        }
        if (path.id.startsWith("activity-")) return all;
        const [px, py] = admissionPoint([x, y]);
        if (px !== x || py !== y)
          return command + px.toFixed(3) + " " + py.toFixed(3);
        return all;
      },
    );
    const result = { ...path, d: mappedD };
    if (/^machine-.-front$/.test(path.id)) {
      result.material = "metal";
      result.opacity = 0.96;
    } else if (
      /^machine-.-(?:recess|bay-shadow-|display|fan-well-|rail-hole-)/.test(
        path.id,
      )
    )
      result.material = "silicon";
    else if (/^machine-.-(?:header|ear-|bay-|blade-|ram-chip)/.test(path.id))
      result.material = "metal";
    else if (/^machine-.-ram$/.test(path.id)) result.material = "silicon";
    else if (/council-terminal|client-keyboard/.test(path.id)) {
      result.material = "metal";
      result.opacity = 0.94;
    } else if (/council-display|client-screen/.test(path.id)) {
      result.material = "silicon";
      result.opacity = 0.96;
    } else if (/recovery-record/.test(path.id)) result.material = "paper";
    else if (/^activity-.*-packet$/.test(path.id)) result.material = "paper";
    if (/^machine-.-depth$/.test(path.id)) result.opacity = 0;
    return result;
  });
  const labels = d.labels.map((item) => {
    const id = /^(?:candidate|initial|machine-epoch)-([ABC])$/.exec(
      item.id,
    )?.[1];
    if (!id) return item;
    const index = "ABC".indexOf(id),
      origin = machinePoint(index, 0, 0);
    return {
      ...item,
      surface: "machine-" + id,
      transform: `matrix(.88 0 0 1 ${origin[0].toFixed(3)} ${origin[1].toFixed(3)})`,
    };
  });
  // Front-panel activity is drawn last; the opaque metal chassis must not
  // cover the health indicator that is physically mounted on that face.
  const frontActivity = bodies.paths.filter(({ id }) =>
    id.startsWith("rack-health-sweep-"),
  );
  const structure = bodies.paths.filter(
    ({ id }) => !id.startsWith("rack-health-sweep-"),
  );
  return { paths: [...structure, ...mapped, ...frontActivity], labels };
}
