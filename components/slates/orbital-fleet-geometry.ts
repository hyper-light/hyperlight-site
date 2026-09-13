import type {
  ProofFrameFunction,
  ProofTone,
} from "../proof-work/proof-geometry";
import { easeLifecycle } from "../proof-work/lifecycle-drawing";
import { orbitalFleetState } from "./orbital-fleet-data";
import { orbitalSceneHeights } from "./orbital-scene-dimensions";
import {
  orbitalHomeActivity,
  orbitalWorkerActivity,
} from "./orbital-scenario-activity";
import {
  orbitalScenarioState,
  type OrbitalScenario,
} from "./orbital-fleet-scenarios";
import { drawOrbitalStation } from "./orbital-station-drawing";
import { drawOrbitalStarfighter } from "./orbital-starfighter-drawing";
import { spatialDrawing, type Point2, type Point3 } from "./spatial-drawing";

const clamp = (x: number) => Math.max(0, Math.min(1, x));
const mix = (a: Point3, b: Point3, t: number): Point3 => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];
const visibility = (p: number) => clamp(Math.min(p * 12, (1 - p) * 12));

/** A fixed focal camera divides centers, hulls and traveling spacecraft by
 * their shared world-space depth. Labels have independent readable gutters. */
export function orbitalFleetLayout(portrait: boolean) {
  const width = portrait ? 420 : 800,
    height = portrait
      ? orbitalSceneHeights.portrait
      : orbitalSceneHeights.landscape,
    focal = 650;
  const center: Point2 = portrait ? [210, 580] : [400, 320];
  const depthScale = (z: number) => focal / (focal + z);
  const project = ([x, y, z]: Point3): Point2 => [
    center[0] + x * depthScale(z),
    center[1] + y * depthScale(z),
  ];
  const atDepth = ([x, y]: Point2, z: number): Point3 => [
    (x - center[0]) / depthScale(z),
    (y - center[1]) / depthScale(z),
    z,
  ];
  const ownerWorld: Point3 = portrait
    ? atDepth([210, 296], -40)
    : [-129, 58, -150];
  const workerWorlds: Point3[] = portrait
    ? [
        atDepth([112, 662], 180),
        atDepth([305, 547], 550),
        atDepth([100, 456], 950),
      ]
    : [
        [288, 270, 100],
        [258, -38, 390],
        [40, -395, 730],
      ];
  const homeWorld: Point3 = portrait
    ? atDepth([80, 104], 1320)
    : [-670, -360, 1000];
  const mirrorWorld: Point3 = portrait
    ? atDepth([335, 127], 1750)
    : [935, -523, 1250];
  const owner = project(ownerWorld),
    workers = workerWorlds.map(project),
    home = project(homeWorld),
    mirror = project(mirrorWorld);
  const ownerScale = depthScale(ownerWorld[2]) * (portrait ? 0.7216 : 1);
  const workerScales = workerWorlds.map(
    ([, , z], i) => depthScale(z) * (portrait ? (i === 0 ? 0.9 : 1) * 0.88 : 1),
  );
  const copyScales = [depthScale(homeWorld[2]), depthScale(mirrorWorld[2])];
  const ownerPort: Point2 = [owner[0], owner[1] + ownerScale * 65];
  const launches: Point2[] = portrait
    ? [
        [210, 393],
        [98, 358],
        [334, 389],
      ]
    : [
        [owner[0] - 78, ownerPort[1] + 48],
        [owner[0], ownerPort[1] + 73],
        [owner[0] + 78, ownerPort[1] + 48],
      ];
  const launchWorlds = launches.map((p) => atDepth(p, ownerWorld[2]));
  const dockWorlds = workerWorlds.map((w, i) =>
    atDepth(
      [
        workers[i][0],
        workers[i][1] + workerScales[i] * 65 + depthScale(w[2]) * 29,
      ],
      w[2],
    ),
  );
  const docks = dockWorlds.map(project);
  const workerTitles = workers.map(
      ([, y], i) =>
        y - workerScales[i] * 90 - 41 + (portrait ? [25, 12, 8][i] : 0),
    ),
    workerReadouts = workerTitles.map((y) => y + 28),
    workerLabelXs = workers.map(([x]) => x);
  return {
    width,
    height,
    focal,
    center,
    project,
    atDepth,
    depthScale,
    ownerWorld,
    workerWorlds,
    homeWorld,
    mirrorWorld,
    launchWorlds,
    dockWorlds,
    owner,
    workers,
    home,
    mirror,
    ownerScale,
    workerScales,
    copyScales,
    launches,
    docks,
    ownerPort,
    workerScale: Math.max(...workerScales),
    copyScale: copyScales[0],
    ownerTitle: owner[1] - ownerScale * 90 - 35,
    ownerState: owner[1] - ownerScale * 90 - 7,
    workerTitles,
    workerReadouts,
    workerLabelXs,
    copyTitle: [
      home[1] - copyScales[0] * 90 - 24,
      mirror[1] - copyScales[1] * 90 - 24,
    ],
    copyReadout: [
      home[1] + copyScales[0] * 76 + 14,
      mirror[1] + copyScales[1] * 76 + 14,
    ],
    footer: height - 16,
  };
}

/** Cubic spans preserve tangent continuity in XYZ, including their depth. */
function worldSpline(points: readonly Point3[], progress: number): Point3 {
  const at = clamp(progress) * (points.length - 1),
    i = Math.min(points.length - 2, Math.floor(at)),
    t = at - i;
  const a = points[i],
    b = points[i + 1],
    before = points[Math.max(0, i - 1)],
    after = points[Math.min(points.length - 1, i + 2)];
  const u: Point3 = [
    a[0] + (b[0] - before[0]) / 6,
    a[1] + (b[1] - before[1]) / 6,
    a[2] + (b[2] - before[2]) / 6,
  ];
  const v: Point3 = [
    b[0] - (after[0] - a[0]) / 6,
    b[1] - (after[1] - a[1]) / 6,
    b[2] - (after[2] - a[2]) / 6,
  ];
  return mix(
    mix(mix(a, u, t), mix(u, v, t), t),
    mix(mix(u, v, t), mix(v, b, t), t),
    t,
  );
}

function renderOrbitalFleet(
  time: number,
  selection: number,
  portrait: boolean,
  scenario: OrbitalScenario,
) {
  const story = orbitalScenarioState(scenario, selection);
  const d = spatialDrawing(),
    state = orbitalFleetState(story ? 7 : selection),
    layout = orbitalFleetLayout(portrait);
  const elapsed = Number.isFinite(time) ? Math.max(0, time) : 0;
  const {
    width,
    height,
    project,
    atDepth,
    depthScale,
    owner,
    ownerScale,
    workers,
    workerScales,
    home,
    mirror,
    copyScales,
    ownerPort,
  } = layout;
  const tones: ProofTone[] = story?.workerTones ?? ["pass", "pending", "error"];
  const phase = (a: number, b: number) =>
    easeLifecycle((state.position - a) / (b - a));
  const wave = (offset: number, speed = 2) =>
    0.5 + Math.sin(elapsed * speed + offset) * 0.5;
  // Each open corridor is lifted into the station's actual depth plane.
  const flightWorlds = layout.launchWorlds.map((start, i): Point3[] => {
    const end = layout.dockWorlds[i];
    const points: Point2[] = portrait
      ? i === 0
        ? [
            [226, 402],
            [228, 421],
            [181, 473],
            [182, 512],
            [218, 600],
            [218, 681],
            [158, 740],
            [112, 744],
          ]
        : i === 1
          ? [
              [180, 369],
              [221, 381],
              [249, 429],
              [209, 445],
              [185, 483],
              [191, 519],
              [270, 624],
              [305, 643],
            ]
          : [
              [383, 383],
              [385, 424],
              [248, 423],
              [178, 463],
              [85, 509],
            ]
      : i === 0
        ? [
            [243, 618],
            [468, 668],
            [646, 675],
          ]
        : i === 1
          ? [
              [405, 565],
              [542, 475],
              [562, 419],
            ]
          : [
              [407, 512],
              [449, 398],
              [432, 272],
              [419, 225],
            ];
    return [
      start,
      ...points.map((p, n) =>
        atDepth(
          p,
          start[2] + ((end[2] - start[2]) * (n + 1)) / (points.length + 1),
        ),
      ),
      end,
    ];
  });
  const flight = (i: number, p: number) => worldSpline(flightWorlds[i], p);
  const pointsFor = (curve: (p: number) => Point3, count = 90) =>
    Array.from({ length: count }, (_, n) => project(curve(n / (count - 1))));
  // Return packets retrace clear launch corridors instead of crossing captions.
  const submit = (i: number, p: number): Point3 =>
    p < 0.9
      ? flight(i, 1 - p / 0.9)
      : mix(
          layout.launchWorlds[i],
          atDepth(ownerPort, layout.ownerWorld[2]),
          (p - 0.9) / 0.1,
        );
  const homePoints: Point2[] = portrait
    ? [
        [38, 264],
        [11, 210],
        [11, 110],
        [42, 105],
      ]
    : [
        [61, 362],
        [28, 271],
        [36, 182],
      ];
  const mirrorPoints: Point2[] = portrait
    ? [
        [385, 268],
        [410, 220],
        [410, 158],
        [405, 131],
        [375, 130],
      ]
    : [
        [466, 414],
        [756, 387],
        [784, 242],
        [784, 146],
      ];
  const copyWorlds = [homePoints, mirrorPoints].map((points, i) => {
    const end = i ? layout.mirrorWorld : layout.homeWorld;
    const start = atDepth(
      [owner[0] + (i ? 78 : -80) * ownerScale, owner[1] - 8],
      layout.ownerWorld[2],
    );
    return [
      start,
      ...points.map((p, n) =>
        atDepth(
          p,
          start[2] + ((end[2] - start[2]) * (n + 1)) / (points.length + 1),
        ),
      ),
      end,
    ];
  });
  const copyFlight = (i: number, p: number) => worldSpline(copyWorlds[i], p);

  // A deep starfield and inclined orbital paths use the same focal camera.
  for (let i = 0; i < 64; i++) {
    const z = 120 + ((i * 379) % 2200),
      desired: Point2 = [
        12 + ((i * 137.37 + 29) % (width - 24)),
        54 + ((i * 89.13 + 7) % (height - 86)),
      ];
    const w = atDepth(desired, z),
      p = project([w[0] + Math.sin(elapsed * 0.06 + i) * 1.8, w[1], z]),
      r = (i % 9 === 0 ? 2.6 : 1) * depthScale(z);
    d.line(
      `orbital-star-${i}`,
      [
        [p[0] - r, p[1]],
        [p[0] + r, p[1]],
        [p[0], p[1]],
        [p[0], p[1] - r],
        [p[0], p[1] + r],
      ],
      { opacity: 0.08 + wave(i, 0.4) * 0.1 },
    );
  }
  for (let orbit = 0; orbit < 3; orbit++) {
    const z = [-80, 420, 1100][orbit],
      rx = portrait ? 230 + orbit * 115 : 340 + orbit * 140,
      ry = portrait ? 410 + orbit * 160 : 255 + orbit * 100;
    d.line(
      `orbital-navigation-arc-${orbit}`,
      Array.from({ length: 101 }, (_, n) => {
        const a = -0.4 + (n / 100) * Math.PI * 1.7;
        return project([
          Math.cos(a) * rx,
          Math.sin(a) * ry,
          z + Math.sin(a + 0.5) * 120,
        ]);
      }),
      { opacity: 0.06 - orbit * 0.012, dashArray: "2 12" },
    );
  }
  for (let i = 0; i < 3; i++) {
    d.line(
      `deployment-lane-${i}`,
      pointsFor((p) => flight(i, p)),
      {
        opacity: state.stage === 1 ? 0.17 : 0.065,
        dashArray: "2 9",
        tone: tones[i],
      },
    );
    d.line(
      `submission-lane-${i}`,
      pointsFor((p) => submit(i, p)),
      {
        opacity: state.stage >= 3 ? 0.15 : 0.03,
        dashArray: "2 9",
        tone: tones[i],
      },
    );
  }
  d.line(
    "home-content-route",
    pointsFor((p) => copyFlight(0, p)),
    {
      opacity: 0.08 + state.homeProgress * 0.11,
      dashArray: "3 8",
      tone: "pass",
    },
  );
  d.line(
    "mirror-content-route",
    pointsFor((p) => copyFlight(1, p)),
    {
      opacity: 0.08 + state.mirrorProgress * 0.11,
      dashArray: "3 8",
      tone: "pending",
    },
  );

  // The camera is fixed, so stationary hulls have one stable far-to-near order.
  const stations = [
    { kind: "owner", index: 0, z: layout.ownerWorld[2] },
    ...layout.workerWorlds.map((w, index) => ({
      kind: "worker",
      index,
      z: w[2],
    })),
    { kind: "copy", index: 0, z: layout.homeWorld[2] },
    { kind: "copy", index: 1, z: layout.mirrorWorld[2] },
  ].sort((a, b) => b.z - a.z);
  for (const station of stations) {
    if (station.kind === "owner")
      drawOrbitalStation(d, "owner-station", owner, ownerScale, {
        role: "owner",
        time: elapsed,
        disabled: story?.ownerDisabled,
        activity: state.stage > 0 && state.stage < 7 ? 0.9 : 0.3,
        tone: story?.ownerTone ?? (state.homeVerified ? "pass" : "neutral"),
        bayOpen: phase(0.06, 0.56),
        checks:
          story?.checks ??
          state.agents.map((agent) => easeLifecycle(agent.checkProgress)),
      });
    else if (station.kind === "worker") {
      const i = station.index,
        a = state.agents[i];
      drawOrbitalStation(
        d,
        `worker-station-${i + 1}`,
        workers[i],
        workerScales[i],
        {
          role: "worker",
          variant: ([0, 1, 2] as const)[i],
          time: elapsed + i * 0.8,
          activity:
            orbitalWorkerActivity(scenario, story?.position ?? 0, i) ??
            (a.deployed && !a.submitted ? 0.96 : a.submitted ? 0.45 : 0.16),
          tone: tones[i],
          bayOpen: easeLifecycle(a.deployProgress),
        },
      );
    } else {
      const i = station.index,
        p = i ? state.mirrorProgress : state.homeProgress,
        verified = i ? state.mirrorVerified : state.homeVerified;
      drawOrbitalStation(
        d,
        i ? "mirror-station" : "home-station",
        i ? mirror : home,
        copyScales[i],
        {
          role: "mirror",
          variant: i ? "mirror" : "home",
          time: elapsed,
          disabled: i ? story?.mirrorDisabled : story?.homeDisabled,
          chunkState:
            !i && (scenario === "missing" || scenario === "unavailable")
              ? story?.chunkState
              : undefined,
          activity:
            (i === 0
              ? orbitalHomeActivity(scenario, story?.position ?? 0)
              : undefined) ??
            (p > 0 && !verified ? 0.96 : verified ? 0.35 : 0.08),
          tone: story
            ? i
              ? story.mirrorTone
              : story.homeTone
            : verified
              ? "pass"
              : "pending",
          bayOpen: p,
        },
      );
    }
  }
  // Physical owner berths withdraw after their one provisioning operation.
  layout.launches.forEach(([x, y], i) => {
    const berthScale = portrait ? 0.72 : 1;
    const berth = (u: number, v: number): Point2 => [
      x + u * berthScale,
      y + v * berthScale,
    ];
    const a = state.agents[i],
      cradle = 1 - easeLifecycle(clamp(a.deployProgress / 0.2)),
      power = cradle * (0.16 + a.provisionProgress * 0.34);
    const fork = atDepth(ownerPort, layout.ownerWorld[2]),
      end = atDepth(berth(0, -18), layout.ownerWorld[2]),
      feed = (p: number) => mix(fork, end, p);
    d.line(`provisioning-feed-${i}`, pointsFor(feed, 15), {
      opacity: power * 0.7,
      tone: tones[i],
    });
    d.line(
      `provisioning-feed-${i}-return`,
      pointsFor(feed, 15).map(([u, v]): Point2 => [u + 2, v + 1]),
      { opacity: power * 0.3, tone: tones[i] },
    );
    d.face(
      `assembly-cradle-${i}-depth`,
      [berth(-24, 13), berth(24, 13), berth(21, 17), berth(-21, 17)],
      "silicon",
      cradle * 0.3,
    );
    d.face(
      `assembly-cradle-${i}-deck`,
      [
        berth(-20, -18),
        berth(20, -18),
        berth(25, 12),
        berth(20, 15),
        berth(-20, 15),
        berth(-25, 12),
      ],
      "silicon",
      cradle * 0.23,
    );
    for (const side of [-1, 1]) {
      d.face(
        `assembly-cradle-${i}-clamp-${side}`,
        [
          berth(side * 25, -10),
          berth(side * 28, -8),
          berth(side * 28, 8),
          berth(side * 24, 12),
          berth(side * 24, 7),
          berth(side * 25, 5),
        ],
        "metal",
        cradle * 0.6,
      );
      d.line(
        `assembly-cradle-${i}-contact-${side}`,
        [berth(side * 24, -4), berth(side * 24, 4)],
        { opacity: power, tone: tones[i] },
      );
      for (let rib = 0; rib < 3; rib++)
        d.line(
          `assembly-cradle-${i}-rib-${side}-${rib}`,
          [berth(side * 25, -5 + rib * 4), berth(side * 27, -5 + rib * 4)],
          { opacity: cradle * 0.3 },
        );
    }
    for (let packet = 0; packet < 3; packet++) {
      const p = clamp(a.provisionProgress * 1.4 - packet * 0.16),
        [u, v] = project(feed(p));
      d.face(
        `provisioning-feed-${i}-allocation-${packet}`,
        [
          [u - 2, v],
          [u, v - 1.6],
          [u + 2, v],
          [u, v + 1.6],
        ],
        "emissive",
        cradle * visibility(p) * 0.85,
        tones[i],
      );
    }
  });
  // Desktop craft recede with the camera. Phone craft retain one readable
  // footprint throughout their journey, while stations retain depth cues.
  state.agents.forEach((a, i) => {
    const p = easeLifecycle(a.deployProgress),
      w = flight(i, p),
      point = project(w);
    const ahead = project(flight(i, clamp(p + 0.0001))),
      behind = project(flight(i, clamp(p - 0.0001))),
      tangent = Math.atan2(ahead[1] - behind[1], ahead[0] - behind[0]);
    const turn = (x: number, y: number, t: number) =>
      x + Math.atan2(Math.sin(y - x), Math.cos(y - x)) * t;
    const departure = turn(Math.PI / 2, tangent, easeLifecycle(p / 0.08)),
      heading = turn(departure, -Math.PI / 2, easeLifecycle((p - 0.92) / 0.08)),
      shown = easeLifecycle(a.provisionProgress);
    drawOrbitalStarfighter(
      d,
      `vfs-craft-${i + 1}`,
      [point[0], point[1] + Math.sin(elapsed * 1.2 + i) * 0.4],
      portrait ? 0.42 : depthScale(w[2]) * 0.62,
      heading,
      {
        time: elapsed + i,
        opacity: shown,
        thrust: 0.05 + 0.9 * Math.sin(p * Math.PI),
        activity:
          orbitalWorkerActivity(scenario, story?.position ?? 0, i) ??
          (a.edited ? 0.9 : a.deployed ? 0.5 : 0.28),
        tone: tones[i],
        assembly: shown,
      },
    );
  });
  const capsule = (
    id: string,
    curve: (p: number) => Point3,
    progress: number,
    opacity: number,
    tone: ProofTone,
  ) => {
    const w = curve(clamp(progress)),
      [x, y] = project(w),
      s = Math.max(0.5, depthScale(w[2]) * 0.85);
    d.face(
      id + "-side",
      [
        [x - 4 * s, y - 2 * s],
        [x + 3 * s, y - 2 * s],
        [x + 5 * s, y - 4 * s],
        [x - 2 * s, y - 4 * s],
      ],
      "metal",
      opacity,
      tone,
    );
    d.face(
      id + "-body",
      [
        [x - 4 * s, y - 2 * s],
        [x + 3 * s, y - 2 * s],
        [x + 3 * s, y + 3 * s],
        [x - 4 * s, y + 3 * s],
      ],
      "circuit",
      opacity,
      tone,
    );
    d.line(
      id + "-bytes",
      [
        [x - 2 * s, y - 0.5 * s],
        [x + 1 * s, y - 0.5 * s],
        [x - 2 * s, y + 1.5 * s],
        [x + 1 * s, y + 1.5 * s],
      ],
      { opacity, tone, kind: "edge" },
    );
    d.line(id + "-trail", [project(curve(clamp(progress - 0.018))), [x, y]], {
      opacity: opacity * 0.4,
      tone,
      kind: "edge",
    });
  };
  state.agents.forEach((a, i) => {
    for (let packet = 0; packet < 5; packet++) {
      const p = clamp(a.submitProgress * 1.42 - packet * 0.09);
      capsule(
        `agent-${i + 1}-edit-packet-${packet}`,
        (q) => submit(i, q),
        p,
        visibility(p),
        tones[i],
      );
    }
    capsule(
      `agent-${i + 1}-accepted-ack`,
      (p) => submit(i, 1 - p),
      state.replyProgress,
      visibility(state.replyProgress),
      "pass",
    );
  });
  for (let packet = 0; packet < 8; packet++) {
    const h = clamp(state.homeProgress * 1.45 - packet * 0.055),
      m = clamp(state.mirrorProgress * 1.45 - packet * 0.055);
    capsule(
      `home-content-${packet}`,
      (p) => copyFlight(0, p),
      h,
      visibility(h),
      "pass",
    );
    capsule(
      `mirror-content-${packet}`,
      (p) => copyFlight(1, p),
      m,
      visibility(m),
      "pending",
    );
  }

  // Failure chapters keep the established workspaces and use the same clear
  // transport corridors. A return, retry and rejected stale write each have
  // their own identity; none can accidentally animate an accepted write.
  const holderWaypoints: Point2[] = portrait
    ? [
        [153, 106],
        [225, 126],
        [287, 125],
      ]
    : [
        [72, 181],
        [72, 75],
        [132, 62],
        [245, 62],
        [520, 62],
        [607, 74],
        [621, 132],
      ];
  const holderWorlds: Point3[] = [
    layout.homeWorld,
    ...holderWaypoints.map((point, i) =>
      atDepth(
        point,
        layout.homeWorld[2] +
          ((layout.mirrorWorld[2] - layout.homeWorld[2]) * (i + 1)) /
            (holderWaypoints.length + 1),
      ),
    ),
    layout.mirrorWorld,
  ];
  const holders = (p: number) => {
    const world = worldSpline(holderWorlds, p);
    if (!portrait) return world;
    const [x, y] = project(world);
    // The phone's outside relay lane passes left of the replacement's long
    // title. Keep its world-depth curve inside that narrow physical corridor.
    return atDepth([Math.max(10, x), y], world[2]);
  };
  // Route resumed client traffic around A's hull, never through the offline
  // owner's service port. The retained home holder is now the endpoint.
  const bypass: Point2[] = portrait
    ? [
        [153, 370],
        [40, 345],
        [16, 290],
        [16, 245],
      ]
    : [
        [126, 588],
        [30, 548],
        [29, 386],
      ];
  const bypassWorlds: Point3[] = [
    layout.launchWorlds[0],
    ...bypass.map((point) => atDepth(point, layout.ownerWorld[2])),
    copyWorlds[0][1],
  ];
  const workerToHome = (p: number): Point3 => {
    if (p < 0.45) return flight(0, 1 - p / 0.45);
    if (p < 0.65) return worldSpline(bypassWorlds, (p - 0.45) / 0.2);
    return worldSpline(copyWorlds[0].slice(1), (p - 0.65) / 0.35);
  };
  const storyRoutes = {
    worker1Out: (p: number) => submit(0, p),
    worker2Out: (p: number) => submit(1, p),
    worker3Out: (p: number) => submit(2, p),
    worker1Back: (p: number) => submit(0, 1 - p),
    worker2Back: (p: number) => submit(1, 1 - p),
    worker3Back: (p: number) => submit(2, 1 - p),
    homeOut: (p: number) => copyFlight(0, p),
    homeBack: (p: number) => copyFlight(0, 1 - p),
    mirrorOut: (p: number) => copyFlight(1, p),
    mirrorBack: (p: number) => copyFlight(1, 1 - p),
    holdersOut: holders,
    holdersBack: (p: number) => holders(1 - p),
    worker1ToHome: workerToHome,
    homeToWorker1: (p: number) => workerToHome(1 - p),
    staleOut: (p: number) => copyFlight(0, p * 0.7),
  };
  d.line("scenario-holder-link", pointsFor(holders), {
    opacity: scenario === "owner-loss" ? 0.19 : 0,
    dashArray: "2 9",
  });
  for (const channel of Object.keys(
    storyRoutes,
  ) as (keyof typeof storyRoutes)[]) {
    const route = storyRoutes[channel];
    const transfer = story?.traffic[channel];
    const p = clamp(transfer?.progress ?? 0);
    const loss = clamp(transfer?.loss ?? 0);
    const opacity =
      visibility(p) * (1 - loss * easeLifecycle((p - 0.65) / 0.35));
    capsule(
      `scenario-${channel}`,
      route,
      channel === "staleOut" ? p : p * (1 - loss * 0.3),
      opacity,
      transfer?.tone ?? "pending",
    );
    const [x, y] = project(route(channel === "staleOut" ? 1 : 0.7));
    d.line(
      `scenario-${channel}-break`,
      [
        [x - 3, y - 3],
        [x + 3, y + 3],
        [x, y],
        [x + 3, y - 3],
        [x - 3, y + 3],
      ],
      {
        opacity: loss * easeLifecycle((p - 0.6) / 0.4),
        tone: "fail",
        kind: "edge",
      },
    );
  }
  const fence = project(copyFlight(0, 0.7));
  const ahead = project(copyFlight(0, 0.71));
  const angle =
    Math.atan2(ahead[1] - fence[1], ahead[0] - fence[0]) + Math.PI / 2;
  const fencePoint = (along: number, across: number): Point2 => [
    fence[0] + Math.cos(angle) * along - Math.sin(angle) * across,
    fence[1] + Math.sin(angle) * along + Math.cos(angle) * across,
  ];
  d.line(
    "scenario-owner-fence",
    [
      fencePoint(-5, -1.5),
      fencePoint(-5, 1.5),
      fencePoint(5, 1.5),
      fencePoint(5, -1.5),
      fencePoint(-5, -1.5),
    ],
    {
      opacity: scenario === "owner-loss" && story!.checks[0] >= 1 ? 0.9 : 0,
      tone: "pass",
      kind: "edge",
    },
  );
  // No screen-space health bars: semantic labels plus embedded machinery only.
  d.label(
    "owner-title",
    story?.ownerName ?? "SHARED VOLUME OWNER",
    owner[0],
    layout.ownerTitle,
    {
      anchor: "middle",
      kind: "name",
    },
  );
  d.label(
    "owner-head",
    story?.ownerStatus ??
      (state.homeVerified
        ? "ACCEPTED v3"
        : state.checkedCount
          ? `CHECKED ${state.candidateVersion} · not committed`
          : "CAPTURED BASE v0"),
    owner[0],
    layout.ownerState,
    {
      anchor: "middle",
      kind: "small",
      tone: story?.ownerTone ?? (state.homeVerified ? "pass" : "pending"),
    },
  );
  state.agents.forEach((a, i) => {
    d.label(
      `worker-${i + 1}-name`,
      `AGENT ${i + 1}`,
      layout.workerLabelXs[i],
      layout.workerTitles[i],
      { anchor: "middle", kind: "name", tone: tones[i] },
    );
    const initial = ["format=jpeg", "cache=off", "test absent"][i],
      edited =
        a.editProgress >= 1
          ? a.edit
          : a.editProgress > 0
            ? a.edit.slice(
                0,
                Math.max(1, Math.ceil(a.editProgress * a.edit.length)),
              ) + "▏"
            : initial;
    d.label(
      `worker-${i + 1}-edit`,
      story?.workerReadouts[i] ??
        (a.deployed
          ? `W${i + 1} · ${edited}`
          : `W${i + 1} · ${a.provisioned ? "assigned" : "waiting"}`),
      layout.workerLabelXs[i],
      layout.workerReadouts[i],
      {
        anchor: "middle",
        kind: "small",
        tone: story ? tones[i] : a.edited ? "pass" : tones[i],
      },
    );
  });
  if (portrait)
    d.line(
      "near-worker-caption-leader",
      [
        [workers[0][0], layout.workerReadouts[0] + 9],
        [workers[0][0], layout.workerReadouts[0] + 15],
        [workers[0][0] + 4, layout.workerReadouts[0] + 19],
      ],
      { opacity: 0 },
    );
  [home, mirror].forEach((c, i) => {
    const name = i ? "mirror-station" : "home-station",
      p = i ? state.mirrorProgress : state.homeProgress,
      verified = i ? state.mirrorVerified : state.homeVerified;
    d.label(
      name + "-title",
      story
        ? i
          ? story.mirrorName
          : story.homeName
        : i
          ? "MIRROR REGION"
          : "HOME COPIES",
      c[0],
      layout.copyTitle[i],
      { anchor: "middle", kind: "heading" },
    );
    d.label(
      name + "-version",
      story
        ? i
          ? story.mirrorStatus
          : story.homeStatus
        : verified
          ? "v3 · verified"
          : p > 0
            ? "receiving v3"
            : "v0 · retained",
      c[0],
      layout.copyReadout[i],
      {
        anchor: "middle",
        kind: "small",
        tone: story
          ? i
            ? story.mirrorTone
            : story.homeTone
          : verified
            ? "pass"
            : "pending",
      },
    );
  });
  const stages = [
    "ONE BASE · INDEPENDENT AGENTS",
    "THREE PRIVATE VFS WORKSPACES",
    "WORKSPACES AT WORKER STATIONS",
    "THREE PRIVATE EDITS",
    "SUBMISSIONS AT THE OWNER",
    "THREE COMPATIBLE EDITS",
    "HOME COPIES VERIFIED · v3 COMMITTED",
    "SHARED v3 · MIRROR VERIFIED",
  ];
  const actions = [
    "ASSEMBLE PRIVATE VFS WORKSPACES",
    "DISPATCH TO WORKER STATIONS",
    "EDIT PRIVATE FILES",
    "RETURN EDITS + CHANGED CONTENT",
    "OWNER CHECKS EACH SUBMISSION",
    "VERIFY HOME-REGION COPIES",
    "VERIFY THE REGIONAL MIRROR",
  ];
  d.label(
    "orbital-stage",
    story?.caption ??
      (state.position > state.stage
        ? actions[state.stage]
        : stages[state.stage]),
    width / 2,
    26,
    { anchor: "middle", kind: "heading" },
  );
  const footer =
    story?.footer ??
    (state.reply
      ? "READY TO TEST v3 · SOURCE DISK UNCHANGED"
      : state.mirrorVerified
        ? "v3 VERIFIED · RETURNING TO AGENTS"
        : state.homeVerified
          ? "v3 AT HOME · WAITING FOR MIRROR"
          : state.checkedCount
            ? `${state.candidateVersion} CANDIDATE · WAITING FOR COPIES`
            : "SHARED v0 · PRIVATE WORK STAYS PRIVATE");
  d.label("orbital-result", footer, width / 2, layout.footer, {
    anchor: "middle",
    kind: "small",
    tone: story
      ? story.serving === "home"
        ? story.homeTone
        : story.ownerTone
      : state.reply
        ? "pass"
        : "neutral",
  });
  return { paths: d.paths, labels: d.labels };
}

export const orbitalFleetFrames: Record<OrbitalScenario, ProofFrameFunction> = {
  success: (time, selection, portrait) =>
    renderOrbitalFleet(time, selection, portrait, "success"),
  conflict: (time, selection, portrait) =>
    renderOrbitalFleet(time, selection, portrait, "conflict"),
  missing: (time, selection, portrait) =>
    renderOrbitalFleet(time, selection, portrait, "missing"),
  unavailable: (time, selection, portrait) =>
    renderOrbitalFleet(time, selection, portrait, "unavailable"),
  "reply-loss": (time, selection, portrait) =>
    renderOrbitalFleet(time, selection, portrait, "reply-loss"),
  "owner-loss": (time, selection, portrait) =>
    renderOrbitalFleet(time, selection, portrait, "owner-loss"),
};

export const orbitalFleetFrame = orbitalFleetFrames.success;
