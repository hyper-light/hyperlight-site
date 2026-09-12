import type { ProofFrameFunction, ProofTone } from "./proof-geometry";
import { mobileJourneyAssembly, mobileJourneyGate, mobileJourneyPoint } from "./mobile-journey-layout";
import {
  createLifecycleDrawing,
  drawLifecycleRecord,
  easeLifecycle,
  type LifecyclePoint,
} from "./lifecycle-drawing";

export type SpacecraftJourneyOptions = {
  heading?: string;
  action?: string;
  message?: string;
  readouts?: Array<{
    id: string;
    title: string;
    value: string;
    tone?: ProofTone;
  }>;
  probes?: Array<{
    title: string;
    target: string;
    tone?: ProofTone;
    progress?: number;
    active?: boolean;
  }>;
  artifactVisible?: number;
  testamentVisible?: number;
  deliveryReceived?: boolean;
};

/** One shared, two-party journey. C17 remains at its destination; the separately
 * authored T1 returns with A/hA. Evidence checks never target the claim ship. */
export function spacecraftJourneyFrame(
  time: number,
  selection: number,
  portrait: boolean,
  options: SpacecraftJourneyOptions = {},
) {
  const drawing = createLifecycleDrawing(time, portrait);
  const { path, line, label, ring, packet } = drawing;
  const s = Math.max(
    0,
    Math.min(5, Number.isFinite(selection) ? selection : 0),
  );
  const phase = (a: number, b = a + 1) => easeLifecycle((s - a) / (b - a));
  const outbound = phase(0.18, 0.85),
    inbound = phase(2.22, 2.85);
  const claimX = 55 + outbound * 555,
    responseX = 550 - inbound * 495;
  // Clear the return gate before pivoting into the berth. Keep every attached
  // assembly on the same turn, with a continuous wing fold like C17's landing.
  const responseLanding = phase(2.86, 3);
  const responseYaw = 1.7 * (1 - responseLanding);
  const responseVisible = options.testamentVisible ?? (s >= 1.97 ? 1 : 0);
  const responseReadout = options.readouts?.find(
    ({ id }) => id === "testament",
  )?.value;
  const responseRecorded = responseReadout
    ? !/^(Not generated|Absent|Not yet)$/i.test(responseReadout)
    : responseVisible > 0;
  const claimReadout = options.readouts?.find(({ id }) => id === "claim");
  const claimPosted = claimReadout
    ? !/^(Generated|Not generated|Absent)$/.test(claimReadout.value)
    : s >= 0.18;
  const executionHeld = claimReadout
    ? [
        "Received",
        "Progressed",
        "TestamentGenerated",
        "TestamentAcknowledged",
        "Validating",
        "Satisfied",
        "ValidationIncomplete",
        "ValidationFailed",
        "ValidationErrored",
      ].includes(claimReadout.value)
    : s >= 0.97;
  const executionCut = options.readouts ? 1 : 0.97;
  const responseCut = options.readouts ? 2 : 1.97;
  const deliveryCut = options.readouts ? 3 : 2.97;
  const deliveryConfirmed = options.deliveryReceived ?? s >= 2.97;
  const terminalRecorded = claimReadout
    ? [
        "Satisfied",
        "ValidationIncomplete",
        "ValidationFailed",
        "ValidationErrored",
      ].includes(claimReadout.value)
    : s >= 4.65;
  const responsePosted = responseReadout
    ? !/generated|absent|not yet/i.test(responseReadout)
    : s >= 2.2;
  const artifactVisible = options.artifactVisible ?? (s >= 1.18 ? 1 : 0);
  const check = phase(3.3, 4);
  const pulse = (drawing.clock * 0.18) % 1;
  // Repeating particles disappear at both endpoints before their position wraps.
  const pulseVisibility = easeLifecycle(
    Math.min(pulse / 0.08, (1 - pulse) / 0.08),
  );
  const stageProject = (x: number, y: number, z = 0): LifecyclePoint =>
    portrait
      ? mobileJourneyPoint(x, y, z)
      : [64 + x + 0.48 * y, 273 + 0.68 * y - z];
  let project = stageProject;
  const assembly = (x: number, y: number) =>
    portrait ? mobileJourneyAssembly(x, y) : stageProject;

  function prism(
    id: string,
    x: number,
    y: number,
    z: number,
    w: number,
    d: number,
    h: number,
    opacity = 0.6,
    tone?: ProofTone,
  ) {
    const a = project(x, y, z),
      b = project(x + w, y, z),
      c = project(x + w, y + d, z),
      e = project(x, y, z + h),
      f = project(x + w, y, z + h),
      g = project(x + w, y + d, z + h),
      q = project(x, y + d, z + h);
    path(id + "-side", [b, c, g, f], "shade", opacity * 0.45, tone, true);
    path(id + "-top", [e, f, g, q], "glass", opacity * 0.7, tone, true);
    path(
      id + "-outline",
      [a, b, f, e, a, project(x, y + d, z), q, e, f, g, q],
      "edge",
      opacity,
      tone,
    );
  }

  label(
    "journey-action",
    options.action ??
      [
        "Freeze the obligation",
        "C17 travels to the respondent",
        "Respondent authors T1",
        "T1 returns with the evidence",
        "Check the returned evidence",
        "Derive claim satisfaction",
      ][Math.round(s)],
    portrait ? 26 : 38,
    30,
    "name",
  );
  label(
    "claimant-party",
    "CLAIMANT",
    portrait ? 26 : 130,
    portrait ? 60 : 88,
    "name",
    undefined,
    portrait ? "start" : "middle",
  );
  label(
    "respondent-party",
    "RESPONDENT",
    portrait ? 252 : 670,
    portrait ? 550 : 88,
    "name",
    undefined,
    portrait ? "start" : "middle",
  );
  label(
    "ledger-party",
    "LEDGER",
    portrait ? 332 : 384,
    portrait ? 250 : 88,
    "name",
    undefined,
    portrait ? "start" : "middle",
  );

  // Parallel outbound and return lanes share the same projection throughout.
  for (let i = 0; i < 23; i++) {
    const x = 65 + i * 23;
    line(
      `outbound-route-dash-${i}`,
      project(x, -50, 24),
      project(x + 7, -50, 24),
      0.2,
    );
    line(
      `return-route-dash-${i}`,
      project(x, 50, 24),
      project(x + 7, 50, 24),
      0.2,
    );
  }
  for (let i = 0; i < 3; i++) {
    const x = 240 + i * 92;
    path(
      `outbound-direction-${i}`,
      [
        project(x - 5, -54, 24),
        project(x + 3, -50, 24),
        project(x - 5, -46, 24),
      ],
      "edge",
      0.3,
    );
    path(
      `return-direction-${i}`,
      [project(x + 5, 46, 24), project(x - 3, 50, 24), project(x + 5, 54, 24)],
      "edge",
      0.3,
    );
  }
  packet(
    "signal-pulse",
    [project(65, -50, 24), project(575, -50, 24)],
    pulse,
    0.35,
  );
  packet(
    "return-signal-pulse",
    [project(575, 50, 24), project(65, 50, 24)],
    pulse,
    responsePosted ? responseVisible * 0.35 : 0,
  );
  for (let i = 0; i < 2; i++) {
    const dock = project(i ? 608 : 79, 0, 5);
    ring(`dock-beacon-${i}`, dock[0], dock[1], portrait ? 6 : 19, 0.25);
    for (let spoke = 0; spoke < 4; spoke++) {
      const angle = (spoke * Math.PI) / 2;
      line(
        `dock-beacon-${i}-tick-${spoke}`,
        [dock[0] + Math.cos(angle) * (portrait ? 9 : 24), dock[1] + Math.sin(angle) * (portrait ? 9 : 24)],
        [dock[0] + Math.cos(angle) * (portrait ? 12 : 30), dock[1] + Math.sin(angle) * (portrait ? 12 : 30)],
        0.3,
      );
    }
  }

  const gates = [
    {
      id: "posted",
      x: 307,
      y: -50,
      // The mobile projection brings the leading hull to the opening sooner.
      // Retract before the nose arrives; receipt lamps still follow commits.
      open: portrait ? phase(0.08, 0.4) : phase(0.08, 0.48),
      passed: claimPosted,
      title: "",
    },
    {
      id: "holder",
      x: 520,
      y: -50,
      open: portrait ? phase(0.34, 0.54) : phase(0.4, 0.96),
      passed: executionHeld,
      title: "EXECUTION RECEIPT",
    },
    {
      id: "response",
      x: 171,
      y: 50,
      open: portrait ? phase(2.22, 2.55) : phase(2.22, 2.85),
      passed: deliveryConfirmed,
      title: "T1 RECEIPT",
    },
  ];
  for (const gate of gates) {
    project = portrait ? mobileJourneyGate(gate.x, gate.y) : stageProject;
    const tone: ProofTone = gate.passed ? "pass" : "neutral";
    for (const side of [-1, 1])
      prism(
        `${gate.id}-post-${side}`,
        gate.x,
        gate.y + side * 34 - 4,
        5,
        9,
        8,
        49,
        0.55,
      );
    prism(
      gate.id + "-crossbar",
      gate.x - 2,
      gate.y - 38,
      54,
      13,
      76,
      8,
      0.65,
      tone,
    );
    for (let tooth = 0; tooth < 3; tooth++)
      prism(
        `${gate.id}-tooth-${tooth}`,
        gate.x + 1,
        gate.y - 23 + tooth * 19,
        portrait ? 27 + gate.open * 30 : 27 + gate.open * 23,
        7,
        9,
        portrait ? 26 - gate.open * 25 : 26 - gate.open * 21,
        0.65,
        tone,
      );
    if (portrait)
      prism(gate.id + "-threshold", gate.x - 2, gate.y - 38, 3, 13, 76, 3, 0.55, tone);
    const status = project(gate.x + 4, gate.y - 33, 60);
    ring(gate.id + "-lamp", status[0], status[1], 2.5, 0.6, tone);
    if (gate.id !== "posted")
      label(
        gate.id + "-title",
        portrait && gate.id === "holder" ? "EXECUTION" : gate.title,
        portrait ? (gate.id === "response" ? 290 : 90) : 64 + gate.x + 0.48 * gate.y,
        portrait ? (gate.id === "response" ? 186 : 320) : gate.id === "response" ? 198 : 128,
        "small",
        undefined,
        portrait ? (gate.id === "response" ? "start" : "end") : "middle",
      );
    if (portrait && gate.id === "holder")
      label("holder-title-detail", "RECEIPT", 90, 341, "small", undefined, "end");
  }

  // The posting gate is the outbound port of one shared ledger station. Its
  // return port occupies the other route; the append stack joins both ports.
  // This open architecture records participant facts and invokes no tools.
  const stationX = 307;
  project = portrait ? mobileJourneyGate(stationX, 50) : stageProject;
  for (const side of [-1, 1])
    prism(
      `ledger-return-post-${side}`,
      stationX,
      50 + side * 34 - 4,
      5,
      9,
      8,
      49,
      0.55,
    );
  prism(
    "ledger-return-crossbar",
    stationX - 2,
    12,
    54,
    13,
    76,
    8,
    0.65,
    responsePosted ? "pass" : "neutral",
  );
  const returnPortOpen = portrait ? phase(2.2, 2.41) : phase(2.2, 2.5);
  for (let tooth = 0; tooth < 3; tooth++)
    prism(
      `ledger-return-tooth-${tooth}`,
      stationX + 1,
      27 + tooth * 19,
      portrait ? 27 + returnPortOpen * 30 : 27 + returnPortOpen * 23,
      7,
      9,
      portrait ? 26 - returnPortOpen * 25 : 26 - returnPortOpen * 21,
      0.65,
      responsePosted ? "pass" : "neutral",
    );
  if (portrait)
    prism("ledger-return-threshold", stationX - 2, 12, 3, 13, 76, 3, 0.55);
  const ledgerProject = portrait ? mobileJourneyAssembly(stationX, 0, [336, 340]) : stageProject;
  project = ledgerProject;
  prism("ledger-port-bridge", stationX - 2, -14, 56, 13, 28, 5, portrait ? 0 : 0.55);
  prism("ledger-record-spine", stationX - 7, -11, 8, 7, 22, 55, 0.65);
  for (let slot = 0; slot < 6; slot++) {
    const z = 11 + slot * 8;
    const committed = [
      claimPosted,
      executionHeld,
      responseRecorded,
      responsePosted,
      deliveryConfirmed,
      terminalRecorded,
    ][slot];
    const commitTone: ProofTone =
      slot === 5 ? (claimReadout?.tone ?? "pass") : "pass";
    prism(
      `ledger-append-slot-${slot}`,
      stationX,
      -11,
      z,
      27,
      22,
      3,
      committed ? 0.72 : 0.28,
    );
    line(
      `ledger-append-lip-${slot}`,
      project(stationX + 3, 11, z + 3),
      project(stationX + 24, 11, z + 3),
      committed ? 0.85 : 0.2,
      committed ? commitTone : "neutral",
    );
  }
  project = portrait ? mobileJourneyGate(stationX, 50) : stageProject;
  const inboundPort = [
    project(stationX + 31, 50, 24),
    project(stationX - 17, 50, 24),
  ];
  project = portrait ? mobileJourneyGate(stationX, -50) : stageProject;
  const outboundPort = [
    project(stationX - 17, -50, 24),
    project(stationX + 31, -50, 24),
  ];
  packet(
    "ledger-claim-port-pulse",
    outboundPort,
    pulse,
    claimPosted ? 0.65 : 0,
  );
  packet(
    "ledger-response-port-pulse",
    inboundPort,
    pulse,
    responsePosted ? 0.65 : 0,
  );
  project = stageProject;
  if (portrait) {
    path("ledger-outbound-conduit", [ledgerProject(stationX + 20, 0, 50), [285, 297], stageProject(stationX, -50, 8)], "fine", 0.24);
    path("ledger-return-conduit", [ledgerProject(stationX + 20, 0, 14), [285, 335], stageProject(stationX, 50, 8)], "fine", 0.24);
  }

  // Receipt handoffs are one-shot participant-authored messages, never ambient
  // packet loops. The ledger retains the committed fact; its receipt copy can
  // then travel back to the respondent without another lifecycle transition.
  function routePoint(
    points: LifecyclePoint[],
    amount: number,
  ): LifecyclePoint {
    const lengths = points
      .slice(1)
      .map((point, i) =>
        Math.hypot(point[0] - points[i][0], point[1] - points[i][1]),
      );
    let remaining =
      Math.max(0, Math.min(1, amount)) *
      lengths.reduce((sum, value) => sum + value, 0);
    for (let i = 0; i < lengths.length; i++) {
      if (remaining <= lengths[i] || i === lengths.length - 1) {
        const t = lengths[i] ? remaining / lengths[i] : 0;
        return [
          points[i][0] + (points[i + 1][0] - points[i][0]) * t,
          points[i][1] + (points[i + 1][1] - points[i][1]) * t,
        ];
      }
      remaining -= lengths[i];
    }
    return points[0];
  }
  function receiptToken(
    id: string,
    route: LifecyclePoint[],
    amount: number,
    opacity: number,
    tone?: ProofTone,
  ) {
    const [x, y] = routePoint(route, amount);
    path(
      id,
      [
        [x - 7, y - 7],
        [x + 4, y - 7],
        [x + 8, y - 3],
        [x + 8, y + 5],
        [x + 3, y + 9],
        [x - 7, y + 9],
      ],
      "glass",
      opacity,
      tone,
      true,
    );
    path(
      id + "-seal",
      [
        [x - 3, y],
        [x, y + 3],
        [x + 5, y - 3],
      ],
      "edge",
      opacity,
      tone,
    );
  }
  const executionRequest: LifecyclePoint[] = [
    project(603, -88, 16),
    project(420, -102, 18),
    ledgerProject(stationX + 17, -11, 22),
  ];
  const acquisition = phase(0.85, executionCut);
  const grant = phase(
    executionCut,
    executionCut + (options.readouts ? 0.25 : 0.2),
  );
  const requestVisible =
    s >= 0.85 && !executionHeld ? Math.min(1, acquisition * 4) : 0;
  path(
    "execution-receipt-request-route",
    executionRequest,
    "fine",
    requestVisible * 0.25,
  );
  receiptToken(
    "execution-receipt-request",
    executionRequest,
    acquisition,
    requestVisible * 0.85,
  );
  const grantRoute = [...executionRequest].reverse();
  path(
    "execution-receipt-grant-route",
    grantRoute,
    "fine",
    executionHeld ? (1 - grant) * 0.3 : 0,
    "pass",
  );
  receiptToken(
    "execution-receipt-grant",
    grantRoute,
    grant,
    executionHeld ? 0.9 : 0,
    "pass",
  );
  const holderSocket = executionRequest[0];
  ring(
    "execution-receipt-socket",
    holderSocket[0],
    holderSocket[1],
    11,
    executionHeld && grant >= 1 ? 0.5 : 0.12,
    executionHeld ? "pass" : "neutral",
  );
  // Dock on the same local hull position as C17's receipt, respecting T1's
  // reversed heading. The identity remains above the ship, never in the seal.
  const deliverySocket = portrait
    ? mobileJourneyAssembly(55, 50, undefined, responseYaw)(62, 68, 16)
    : project(79, 65, 12);
  const deliveryRoute: LifecyclePoint[] = [
    deliverySocket,
    project(220, 65, 18),
    ledgerProject(stationX + 17, 11, 46),
  ];
  const acknowledgment = phase(2.85, deliveryCut);
  const acknowledgmentVisible =
    responsePosted && s >= 2.85 && !deliveryConfirmed ? 1 : 0;
  path(
    "testament-delivery-ack-route",
    deliveryRoute,
    "fine",
    acknowledgmentVisible * (1 - acknowledgment) * 0.3,
  );
  receiptToken(
    "testament-delivery-ack",
    deliveryRoute,
    acknowledgment,
    acknowledgmentVisible * 0.9,
    deliveryConfirmed ? "pass" : "neutral",
  );
  const confirmation = phase(deliveryCut, deliveryCut + 0.3);
  const confirmationRoute = [...deliveryRoute].reverse();
  path(
    "testament-delivery-confirmation-route",
    confirmationRoute,
    "fine",
    deliveryConfirmed ? (1 - confirmation) * 0.4 : 0,
    "pass",
  );
  receiptToken(
    "testament-delivery-confirmation",
    confirmationRoute,
    confirmation,
    deliveryConfirmed ? 0.95 : 0,
    "pass",
  );
  const claimantReceiptSocket = deliveryRoute[0];
  ring(
    "testament-confirmation-socket",
    claimantReceiptSocket[0],
    claimantReceiptSocket[1],
    11,
    deliveryConfirmed ? confirmation * 0.55 : 0,
    "pass",
  );
  const receiptPort = project(171, 50, 32);
  ring(
    "response-receipt-confirmation-wave",
    receiptPort[0],
    receiptPort[1],
    10 + Math.sin(Math.PI * confirmation) * 18,
    deliveryConfirmed ? (1 - confirmation) * 0.95 : 0,
    "pass",
  );
  function ship(
    prefix: string,
    x: number,
    lane: number,
    direction: 1 | -1,
    opacity: number,
    power: number,
    parked: boolean,
    identity: string,
  ) {
    // Partial visibility denotes assembly, not a durable generated record.
    // Hull, canopy, wings and engines converge at the berth before Close.
    const assembly =
      identity === "T1" && options.testamentVisible !== undefined
        ? 1 - easeLifecycle(opacity)
        : 0;
    const shipProject = portrait ? mobileJourneyAssembly(x, lane, undefined, identity === "T1" ? responseYaw : 1.7 * (1 - phase(0.86, 1))) : project;
    let silhouetteTop = Infinity;
    const p = (dx: number, dy: number, z: number) => {
      const point = shipProject(x + dx * direction, lane + dy * direction, z + assembly * 12);
      silhouetteTop = Math.min(silhouetteTop, point[1]);
      return point;
    };
    const spread = portrait
      ? 34 - 10 * (identity === "T1" ? responseLanding : phase(0.86, 1))
      : parked ? 24 : 34;
    const hull = [
      p(65, 0, 27),
      p(26, -16, 32),
      p(-12, -15, 28),
      p(-18, 0, 22),
      p(-12, 15, 28),
      p(26, 16, 32),
    ];
    path(
      prefix + "-spacecraft-hull",
      hull,
      "glass",
      opacity * 0.78,
      undefined,
      true,
    );
    path(
      prefix + "-spacecraft-hull-outline",
      hull,
      "edge",
      opacity * 0.9,
      undefined,
      true,
    );
    path(
      prefix + "-spacecraft-keel",
      [p(65, 0, 27), p(15, 0, 15), p(-18, 0, 22)],
      "edge",
      opacity * 0.5,
    );
    path(
      prefix + "-spacecraft-nose-facet",
      [p(65, 0, 27), p(26, 16, 32), p(15, 0, 15)],
      "shade",
      opacity * 0.4,
      undefined,
      true,
    );
    path(
      prefix + "-spacecraft-cockpit",
      [
        p(47, 0, 34 + assembly * 22),
        p(27, -9, 42 + assembly * 22),
        p(17, -8, 43 + assembly * 22),
        p(17, 8, 43 + assembly * 22),
        p(27, 9, 42 + assembly * 22),
      ],
      "glass",
      opacity * 0.72,
      undefined,
      true,
    );
    line(
      prefix + "-spacecraft-canopy-spine",
      p(21, 0, 44 + assembly * 22),
      p(47, 0, 34 + assembly * 22),
      opacity * 0.6,
    );
    for (let side = 0; side < 2; side++) {
      const sign = side ? 1 : -1;
      const wingOffset = assembly * 24 * sign;
      const wing = [
        p(26, 14 * sign + wingOffset, 29),
        p(-25, spread * sign + wingOffset, 21),
        p(-17, 21 * sign + wingOffset, 22),
        p(-9, 13 * sign + wingOffset, 28),
      ];
      path(
        `${prefix}-spacecraft-wing-${side}`,
        wing,
        "glass",
        opacity * 0.58,
        undefined,
        true,
      );
      path(
        `${prefix}-spacecraft-wing-${side}-outline`,
        wing,
        "edge",
        opacity * 0.8,
        undefined,
        true,
      );
      line(
        `${prefix}-spacecraft-wing-${side}-spar`,
        p(11, 16 * sign + wingOffset, 29),
        p(-25, spread * sign + wingOffset, 21),
        opacity * 0.5,
      );
      const engineOffset = assembly * 14 * sign;
      const engine = [
        p(2, 17 * sign + engineOffset, 29),
        p(-23, 18 * sign + engineOffset, 28),
        p(-24, 26 * sign + engineOffset, 23),
        p(2, 25 * sign + engineOffset, 26),
      ];
      path(
        `${prefix}-spacecraft-engine-${side}`,
        engine,
        "glass",
        opacity * 0.6,
        undefined,
        true,
      );
      path(
        `${prefix}-spacecraft-engine-${side}-outline`,
        engine,
        "edge",
        opacity * 0.8,
        undefined,
        true,
      );
      const nozzle = p(-24, 22 * sign + engineOffset, 25);
      ring(
        `${prefix}-spacecraft-engine-${side}-nozzle`,
        nozzle[0],
        nozzle[1],
        3,
        opacity * 0.65,
      );
      path(
        `${prefix}-spacecraft-engine-${side}-plume`,
        [
          p(-24, 19 * sign + engineOffset, 25),
          p(-29 - power * 19, 22 * sign + engineOffset, 25),
          p(-24, 25 * sign + engineOffset, 25),
        ],
        "glass",
        opacity * (0.18 + power * 0.65),
        undefined,
        true,
      );
    }
    const labelX = p(15, 0, 43)[0],
      labelY =
        // In its horizontal pose T1's stowed cargo sits just above the canopy.
        portrait ? silhouetteTop - 14 - (identity === "T1" ? responseLanding * 4 : 0)
          : identity === "T1" ? 350
            : Math.min(...hull.map((point) => point[1]), p(21, 0, 44)[1]) - 14;
    label(
      prefix + "-message-id",
      identity,
      labelX,
      labelY,
      "label",
      undefined,
      "middle",
      opacity,
    );
    return p;
  }
  ship(
    "claim-ship",
    claimX,
    -50 - phase(0.86, 1) * 20,
    1,
    1 - phase(0.86, 1) * 0.25,
    4 * outbound * (1 - outbound),
    s >= 1,
    "C17",
  );
  ship(
    "testament-ship",
    responseX,
    50,
    -1,
    responseVisible,
    4 * inbound * (1 - inbound),
    false,
    "T1",
  );

  // A is independently generated at the respondent's berth before T1 exists.
  // Attachment changes its carrier, never its immutable identity or digest.
  const unload = check * Math.min(1, artifactVisible);
  const artifactAssembly =
    options.artifactVisible === undefined
      ? 0
      : 1 - easeLifecycle(artifactVisible);
  // The mobile inspection berth occupies the foreground, left of the
  // respondent. Its entire articulated sweep clears the two flight lanes.
  const dock = { x: 270, y: 130, z: 12 };
  const mobileInspection: LifecyclePoint = [66, 441];
  const blend = (a: number, b: number, t: number) => a + (b - a) * t;
  // The frozen attachment commits at Close. Loading is the subsequent physical
  // packaging of that same binding into the generated, still-unposted T1 ship.
  const load = phase(responseCut, 2.14) * (responseVisible > 0 ? 1 : 0);
  const secure = phase(2.1, 2.19) * (responseVisible > 0 ? 1 : 0);
  const artifactX = blend(blend(570, responseX - 8, load), dock.x, unload);
  const artifactY = blend(blend(100, 39, load), dock.y, unload);
  const artifactZ =
    blend(
      blend(26, 38, load) + Math.sin(Math.PI * load) * 36,
      dock.z + 8,
      unload,
    ) +
    artifactAssembly * 12;
  const responseProject = portrait ? mobileJourneyAssembly(responseX, 50, undefined, responseYaw) : stageProject;
  const workPosition = stageProject(570, 100);
  const loadedPosition = responseProject(responseX - 8, 39);
  const sourcePosition: LifecyclePoint = [blend(workPosition[0], loadedPosition[0], load), blend(workPosition[1], loadedPosition[1], load)];
  const artifactProject = portrait
    ? mobileJourneyAssembly(artifactX, artifactY, [
        blend(sourcePosition[0], mobileInspection[0], unload),
        blend(sourcePosition[1], mobileInspection[1], unload),
      ], responseYaw * load * (1 - unload))
    : stageProject;
  project = artifactProject;
  const artifactWidth = blend(24, 40, unload) * (1 - artifactAssembly * 0.45),
    artifactDepth = blend(22, 36, unload) * (1 - artifactAssembly * 0.45);
  const cut = 4;
  const podPlan: Array<[number, number]> = [
    [artifactX + cut, artifactY],
    [artifactX + artifactWidth - cut, artifactY],
    [artifactX + artifactWidth, artifactY + cut],
    [artifactX + artifactWidth, artifactY + artifactDepth - cut],
    [artifactX + artifactWidth - cut, artifactY + artifactDepth],
    [artifactX + cut, artifactY + artifactDepth],
    [artifactX, artifactY + artifactDepth - cut],
    [artifactX, artifactY + cut],
  ];
  const podTop = podPlan.map(([x, y]) => project(x, y, artifactZ + 12));
  const podBottom = podPlan.map(([x, y]) => project(x, y, artifactZ));
  path(
    "work-artifact-top",
    podTop,
    "glass",
    artifactVisible * 0.72,
    undefined,
    true,
  );
  path(
    "work-artifact-side",
    [
      podBottom[2],
      podBottom[3],
      podBottom[4],
      podBottom[5],
      podTop[5],
      podTop[4],
      podTop[3],
      podTop[2],
    ],
    "shade",
    artifactVisible * 0.5,
    undefined,
    true,
  );
  path(
    "work-artifact-outline",
    [
      ...podTop,
      podTop[0],
      podBottom[0],
      podBottom[7],
      podTop[7],
      podTop[6],
      podBottom[6],
      podBottom[5],
      podTop[5],
    ],
    "edge",
    artifactVisible * 0.95,
  );
  for (let band = 0; band < 2; band++) {
    const x = artifactX + artifactWidth * (band ? 0.73 : 0.27);
    path(
      `cargo-pod-band-${band}`,
      [
        project(x, artifactY, artifactZ + 1),
        project(x, artifactY, artifactZ + 13),
        project(x, artifactY + artifactDepth, artifactZ + 13),
        project(x, artifactY + artifactDepth, artifactZ + 1),
      ],
      "edge",
      artifactVisible * 0.7,
    );
  }
  project = assembly(563, 93);
  prism(
    "cargo-loading-rack",
    563,
    93,
    17,
    44,
    34,
    4,
    artifactVisible * (1 - load) * 0.45,
  );
  project = responseProject;
  prism(
    "cargo-bay-floor",
    responseX - 12,
    35,
    30,
    30,
    30,
    3,
    responseVisible * 0.4 * (1 - unload),
  );
  prism(
    "cargo-clamp",
    responseX - 12,
    blend(25, 35, secure),
    33,
    30,
    3,
    9,
    responseVisible * 0.7 * (1 - unload),
  );
  prism(
    "cargo-clamp-rear",
    responseX - 12,
    blend(75, 62, secure),
    33,
    30,
    3,
    9,
    responseVisible * 0.7 * (1 - unload),
  );
  const liftVisibility = artifactVisible * 4 * load * (1 - load);
  project = artifactProject;
  const liftingPoint = project(
    artifactX + artifactWidth / 2,
    artifactY + artifactDepth / 2,
    artifactZ + 18,
  );
  path(
    "cargo-loading-hoist",
    [assembly(560, 100)(560, 120, 8), assembly(560, 100)(548, 90, 105), liftingPoint],
    "edge",
    liftVisibility * 0.55,
  );
  line(
    "cargo-loading-grip-left",
    liftingPoint,
    project(artifactX + 5, artifactY + artifactDepth / 2, artifactZ + 13),
    liftVisibility * 0.7,
  );
  line(
    "cargo-loading-grip-right",
    liftingPoint,
    project(
      artifactX + artifactWidth - 5,
      artifactY + artifactDepth / 2,
      artifactZ + 13,
    ),
    liftVisibility * 0.7,
  );
  // The identical A/hA capsule leaves the ship and is held at the inspection
  // cradle. Fine ribs are fixed content; only the external scan windows move.
  for (let row = 0; row < 7; row++) {
    const y = artifactY + 5 + (row * (artifactDepth - 10)) / 6;
    line(
      `artifact-byte-rib-${row}`,
      project(artifactX + 4, y, artifactZ + 12.5),
      project(
        artifactX + artifactWidth - 4 - (row % 3) * 3,
        y,
        artifactZ + 12.5,
      ),
      artifactVisible * (0.35 + unload * 0.45),
    );
    line(
      `artifact-byte-notch-${row}`,
      project(artifactX + 5, y, artifactZ + 12.5),
      project(artifactX + 5, y + 1.8, artifactZ + 12.5),
      artifactVisible * 0.6,
    );
  }
  project = portrait ? mobileJourneyAssembly(dock.x, dock.y, mobileInspection) : stageProject;
  prism(
    "inspection-cradle",
    dock.x - 8,
    dock.y - 7,
    dock.z - 1,
    56,
    50,
    5,
    unload * 0.55,
  );
  for (let corner = 0; corner < 4; corner++) {
    const x = dock.x + (corner % 2 ? 39 : -5),
      y = dock.y + (corner < 2 ? -6 : 35);
    prism(
      `inspection-clamp-${corner}`,
      x,
      y,
      dock.z + 4,
      6,
      7,
      12,
      unload * 0.7,
    );
  }

  for (let i = 0; i < 2; i++) {
    const probe = options.probes?.[i];
    const amount = probe?.progress ?? phase(i ? 4.12 : 3.5, i ? 4.65 : 4.12);
    const active = (probe?.active ?? s >= 3.6) && artifactVisible > 0;
    const passed = s >= (i ? 4.65 : 4.12);
    const tone: ProofTone =
      probe?.tone ?? (passed ? "pass" : active ? "pending" : "neutral");
    const successful = tone === "pass",
      blocked = tone === "fail",
      retrying = tone === "error";
    const motion =
      0.5 - 0.5 * Math.cos(drawing.clock * (i ? 1.25 : 1.8) + amount * Math.PI);
    // Finishing motion converges before the verdict commits. A color/status
    // change must not teleport the articulated head to an unrelated pose.
    const settling = easeLifecycle((amount - 0.78) / 0.22);
    const traversal = blend(
      blocked || successful ? 0.55 : motion,
      0.55,
      settling,
    );
    const retryEntry = easeLifecycle(Math.abs(amount - 0.55) / 0.12);
    const retraction = blend(
      successful ? 18 : retrying ? (5 + motion * 18) * retryEntry : 0,
      18,
      settling,
    );
    const hardwareOpacity = unload * 0.8;
    const scanOpacity =
      active && !successful ? unload * (retrying ? 0.25 : 0.55) : 0;
    const scanX = dock.x + 4 + 32 * traversal;
    const scanY = dock.y + 4 + 28 * traversal;
    const target = project(
      i ? dock.x + 31 : scanX,
      i ? scanY : dock.y + 18,
      dock.z + 17,
    );
    const head = i
      ? project(dock.x + 53 + retraction, scanY, dock.z + 30 + retraction * 0.4)
      : project(scanX, dock.y + 18, dock.z + 37 + retraction);
    const base = i
      ? project(dock.x + 74, dock.y + 18, dock.z + 13)
      : project(dock.x - 25, dock.y + 18, dock.z + 13);
    const elbow = i
      ? project(dock.x + 68 + retraction * 0.3, scanY, dock.z + 45)
      : project(scanX, dock.y + 18, dock.z + 48 + retraction);
    path(
      `witness-probe-${i}`,
      [base, elbow, head],
      "edge",
      hardwareOpacity,
      tone,
    );
    ring(
      `witness-probe-collar-${i}`,
      head[0],
      head[1],
      5,
      hardwareOpacity,
      tone,
    );
    ring(
      `witness-probe-joint-${i}`,
      elbow[0],
      elbow[1],
      3,
      hardwareOpacity * 0.7,
      tone,
    );
    prism(
      `witness-probe-head-${i}`,
      i ? dock.x + 49 + retraction : scanX - 3,
      i ? scanY - 4 : dock.y - 4,
      dock.z + 31 + retraction,
      i ? 8 : 6,
      i ? 8 : 44,
      5,
      hardwareOpacity,
      tone,
    );
    const window: LifecyclePoint[] = i
      ? [
          project(dock.x + 3, scanY - 2, dock.z + 17),
          project(dock.x + 38, scanY - 2, dock.z + 17),
          project(dock.x + 38, scanY + 3, dock.z + 17),
          project(dock.x + 3, scanY + 3, dock.z + 17),
        ]
      : [
          project(scanX, dock.y - 3, dock.z + 13),
          project(scanX, dock.y + 39, dock.z + 13),
          project(scanX, dock.y + 39, dock.z + 33 + retraction),
          project(scanX, dock.y - 3, dock.z + 33 + retraction),
        ];
    path(
      `witness-scan-window-${i}`,
      window,
      "glass",
      scanOpacity * 0.65,
      tone,
      true,
    );
    path(`witness-scan-edge-${i}`, window, "edge", scanOpacity, tone, true);
    path(`witness-beam-${i}`, [head, target], "edge", scanOpacity, tone);
    packet(
      `witness-signal-${i}`,
      [head, target],
      pulse,
      scanOpacity * pulseVisibility,
      tone,
    );
    const ledgerPoint: LifecyclePoint = portrait
      ? [240 + i * 95, 585]
      : [520 + i * 95, 427];
    const resultRoute: LifecyclePoint[] = portrait
      ? [head, [i ? 402 : 16, 471], [i ? 402 : 16, 585], ledgerPoint]
      : [head, [head[0] + (i ? 24 : -24), 397], ledgerPoint];
    path(
      `witness-result-route-${i}`,
      resultRoute,
      "fine",
      successful && active ? unload * 0.25 : 0,
      tone,
    );
    packet(
      `witness-chip-${i}`,
      resultRoute,
      pulse,
      (active ? (successful ? 0.85 : blocked ? 0.5 : 0) : 0) * pulseVisibility,
      tone,
    );
    label(
      `witness-title-${i}`,
      probe?.title ?? (i ? "Review" : "Behavior"),
      portrait ? 26 : 356 + i * 122,
      portrait ? 496 + i * 25 : 394,
      "small",
      tone,
      undefined,
      check,
    );
  }

  // One direct connection makes the lower history the record of this station.
  project = stageProject;
  const railY = portrait ? 585 : 427;
  const stationBase = ledgerProject(stationX + 10, 0, 8);
  const stationHistory: LifecyclePoint[] = portrait
    ? [stationBase, [402, stationBase[1]], [402, railY], [392, railY]]
    : [stationBase, [stationBase[0], railY]];
  path("ledger-station-history", stationHistory, "fine", 0.2);
  packet("ledger-station-commit", stationHistory, pulse, s >= 0.18 ? 0.45 : 0);
  const claimState =
    s < 0.18
      ? "Generated"
      : s < 0.97
        ? "Posted"
        : s < 1.97
          ? "Received"
          : s < 2.97
            ? "TestamentGenerated"
            : s < 3.6
              ? "TestamentAcknowledged"
              : s < 4.65
                ? "Validating"
                : "Satisfied";
  const artifactState =
    s < 1.18
      ? "Not generated"
      : s < 1.97
        ? "Generated"
        : s < 3.6
          ? "Attached"
          : s < 4.65
            ? "Validating"
            : "Validated";
  const testamentState =
    s < 1.97
      ? "Not generated"
      : s < 2.2
        ? "Generated"
        : s < 2.97
          ? "Posted"
          : s < 3.6
            ? "Received"
            : s < 4.65
              ? "Validating"
              : "Validated";
  const checksState =
    s < 2.97
      ? "Declared"
      : s < 3.6
        ? "Ready"
        : s < 4.65
          ? "Checks running"
          : "All Required passed";
  drawLifecycleRecord(
    drawing,
    options.readouts ??
      [
        { id: "claim", title: "CLAIM · C17", value: claimState },
        { id: "artifact", title: "ARTIFACT · A / hA", value: artifactState },
        { id: "testament", title: "TESTAMENT · T1", value: testamentState },
        { id: "checks", title: "CHECKS", value: checksState },
      ].map((readout) => ({
        ...readout,
        tone: s >= 4.65 ? ("pass" as const) : ("neutral" as const),
      })),
    s / 5,
  );
  const frame = drawing.frame();
  // Keep the exchange visible as context while inspection becomes the focal
  // action; dim only its routes and transfer hardware, never object identities.
  const contextOpacity = 1 - unload * 0.7;
  for (const item of frame.paths)
    if (
      /^(outbound-|return-|posted-|ledger-(return-|port-|record-|append-|claim-port|response-port)|holder-|response-(post|crossbar|tooth|lamp)|dock-beacon)/.test(
        item.id,
      )
    )
      item.opacity *=
        item.id.startsWith("response-") && deliveryConfirmed
          ? Math.max(contextOpacity, 0.75)
          : contextOpacity;
  for (const item of frame.labels)
    if (/^(posted|holder|response)-title(?:-detail)?$/.test(item.id))
      item.opacity =
        item.id === "response-title" && deliveryConfirmed
          ? Math.max(contextOpacity, 0.75)
          : contextOpacity;
  for (const identity of frame.labels.filter(({ id }) =>
    id.endsWith("-message-id"),
  ))
    identity.surface = "claim-spacecraft-id";
  return frame;
}

export const claimLifecycleFrame: ProofFrameFunction = (
  time,
  selection,
  portrait,
) => spacecraftJourneyFrame(time, selection, portrait);
