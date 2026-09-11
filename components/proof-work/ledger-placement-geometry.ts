import type {
  ProofFrame,
  ProofLabel,
  ProofPath,
  ProofTone,
} from "./proof-geometry";

type Point = [number, number, number];
const TAU = Math.PI * 2;
const regions = [
  { name: "Region A", lat: 39, lon: -70 },
  { name: "Region B", lat: 50, lon: 15 },
  { name: "Region C", lat: 18, lon: 101 },
];
// Hand-drawn, deliberately approximate coastlines: placement is illustrative.
const coasts = [
  [
    [-166, 65],
    [-141, 70],
    [-128, 61],
    [-123, 49],
    [-117, 32],
    [-106, 24],
    [-91, 19],
    [-84, 22],
    [-81, 26],
    [-81, 31],
    [-70, 43],
    [-60, 49],
    [-66, 58],
    [-86, 67],
    [-110, 72],
    [-140, 70],
    [-166, 65],
  ],
  [
    [-81, 11],
    [-72, 12],
    [-60, 6],
    [-49, -1],
    [-36, -6],
    [-39, -20],
    [-52, -33],
    [-67, -55],
    [-73, -43],
    [-77, -14],
    [-81, 11],
  ],
  [
    [-53, 60],
    [-43, 60],
    [-21, 71],
    [-31, 82],
    [-50, 82],
    [-62, 73],
    [-53, 60],
  ],
  [
    [-10, 36],
    [-9, 43],
    [-2, 49],
    [8, 54],
    [6, 59],
    [20, 70],
    [31, 70],
    [26, 58],
    [39, 55],
    [51, 69],
    [90, 75],
    [130, 69],
    [166, 61],
    [154, 50],
    [140, 46],
    [129, 36],
    [123, 30],
    [109, 20],
    [105, 1],
    [99, 5],
    [93, 23],
    [80, 8],
    [70, 23],
    [52, 26],
    [44, 12],
    [37, 20],
    [35, 31],
    [28, 41],
    [23, 36],
    [15, 39],
    [10, 44],
    [3, 41],
    [-10, 36],
  ],
  [
    [-17, 29],
    [-5, 36],
    [10, 37],
    [24, 32],
    [34, 31],
    [43, 12],
    [51, 11],
    [42, -2],
    [40, -16],
    [32, -30],
    [19, -35],
    [11, -18],
    [8, 4],
    [-3, 5],
    [-16, 14],
    [-17, 29],
  ],
  [
    [113, -22],
    [114, -34],
    [133, -33],
    [146, -39],
    [154, -28],
    [144, -14],
    [132, -12],
    [126, -17],
    [113, -22],
  ],
  [
    [130, 31],
    [138, 35],
    [142, 43],
    [145, 44],
  ],
  [
    [46, -13],
    [50, -16],
    [47, -25],
    [44, -22],
    [46, -13],
  ],
];

function globePoint(lat: number, lon: number, radius = 1): Point {
  const a = (lat * Math.PI) / 180,
    b = ((lon - 18) * Math.PI) / 180;
  return [
    radius * Math.cos(a) * Math.sin(b),
    -radius * Math.sin(a),
    radius * Math.cos(a) * Math.cos(b),
  ];
}

/** Geographic routing is independent of the logical identity of the session. */
export function ledgerPlacementFrame(
  time: number,
  selection: number,
  portrait: boolean,
): ProofFrame {
  const paths: ProofPath[] = [],
    labels: ProofLabel[] = [];
  const mode = Math.max(0, Math.min(2, Math.round(selection)));
  const cx = portrait ? 210 : 400,
    cy = portrait ? 305 : 242,
    radius = portrait ? 153 : 170;
  const roll = -0.12 + Math.sin(time * 0.19) * 0.025;
  const project = ([x, y, z]: Point): [number, number] => {
    const yaw = Math.sin(time * 0.17) * 0.025;
    const turned = x * Math.cos(yaw) + z * Math.sin(yaw);
    const depth = z * Math.cos(yaw) - x * Math.sin(yaw);
    const scale = (radius * 5) / (5 - depth * 0.2);
    return [
      cx + (turned * Math.cos(roll) - y * Math.sin(roll)) * scale,
      cy + (turned * Math.sin(roll) + y * Math.cos(roll)) * scale,
    ];
  };
  const path = (
    id: string,
    points: [number, number][],
    kind: ProofPath["kind"] = "fine",
    opacity = 0.3,
    tone?: ProofTone,
    close = false,
  ) => {
    paths.push({
      id,
      d:
        points
          .map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(2)} ${y.toFixed(2)}`)
          .join(" ") + (close ? "Z" : ""),
      kind,
      opacity,
      tone,
    });
  };
  const label = (
    id: string,
    text: string,
    x: number,
    y: number,
    kind: ProofLabel["kind"] = "label",
    tone?: ProofTone,
  ) => labels.push({ id, text, x, y, kind, tone, anchor: "middle" });
  const circle = (
    id: string,
    x: number,
    y: number,
    r: number,
    kind: ProofPath["kind"],
    opacity: number,
    tone?: ProofTone,
  ) =>
    path(
      id,
      Array.from({ length: 33 }, (_, i) => [
        x + Math.cos((i / 32) * TAU) * r,
        y + Math.sin((i / 32) * TAU) * r,
      ]),
      kind,
      opacity,
      tone,
    );
  // A translucent shell with visible front and rear graticules gives real depth.
  for (let lat = -75; lat <= 75; lat += 15) {
    for (let half = 0; half < 2; half++) {
      const points = Array.from({ length: 49 }, (_, i) =>
        project(globePoint(lat, 18 - 90 + half * 180 + (i / 48) * 180)),
      );
      path(`latitude-${lat}-${half}`, points, "fine", half ? 0.11 : 0.36);
    }
  }
  for (let lon = -162; lon < 198; lon += 15) {
    path(
      `longitude-${lon}`,
      Array.from({ length: 49 }, (_, i) =>
        project(globePoint(-90 + (i / 48) * 180, lon)),
      ),
      "fine",
      Math.cos(((lon - 18) * Math.PI) / 180) > 0 ? 0.32 : 0.1,
    );
  }
  circle("globe-rim", cx, cy, radius, "edge", 0.58);
  for (let ring = 0; ring < 3; ring++) {
    path(
      `orbital-ring-${ring}`,
      Array.from({ length: 97 }, (_, i) => {
        const a = (i / 96) * TAU;
        return [
          cx + Math.cos(a) * (radius + 13 + ring * 5),
          cy + Math.sin(a) * (radius * 0.27 + ring * 4) + Math.cos(a) * 24,
        ];
      }),
      ring === 1 ? "light" : "fine",
      0.16,
    );
  }
  for (let tick = 0; tick < 72; tick++) {
    const a = (tick / 72) * TAU,
      inner = radius + 7,
      outer = inner + (tick % 6 ? 2 : 5);
    path(
      `limb-tick-${tick}`,
      [
        [cx + Math.cos(a) * inner, cy + Math.sin(a) * inner],
        [cx + Math.cos(a) * outer, cy + Math.sin(a) * outer],
      ],
      "fine",
      0.23,
    );
  }
  coasts.forEach((coast, index) => {
    coast.slice(1).forEach((b, segment) => {
      const a = coast[segment];
      const points = Array.from({ length: 5 }, (_, i) =>
        project(
          globePoint(
            a[1] + ((b[1] - a[1]) * i) / 4,
            a[0] + ((b[0] - a[0]) * i) / 4,
            1.012,
          ),
        ),
      );
      const front = globePoint((a[1] + b[1]) / 2, (a[0] + b[0]) / 2)[2] > 0;
      path(`coast-${index}-${segment}`, points, "edge", front ? 0.58 : 0.1);
    });
  });
  const positions = regions.map((region) =>
    project(globePoint(region.lat, region.lon, 1.04)),
  );
  const captions = portrait
    ? [
        [94, 83],
        [308, 83],
        [210, 555],
      ]
    : [
        [130, 117],
        [673, 117],
        [400, 456],
      ];
  regions.forEach((region, index) => {
    const [x, y] = positions[index],
      [lx, ly] = captions[index];
    const blocked = mode === 2 && index === 2;
    const tone: ProofTone = blocked
      ? "fail"
      : index === 0 || mode !== 0
        ? "pass"
        : "neutral";
    for (let ring = 0; ring < 5; ring++)
      circle(
        `hub-${index}-${ring}`,
        x,
        y,
        3 + ring * 2.4,
        ring === 0 ? "glass" : "fine",
        blocked ? 0.3 : 0.68 - ring * 0.1,
        tone,
      );
    for (let tick = 0; tick < 12; tick++) {
      const a = (tick / 12) * TAU + time * 0.1;
      path(
        `hub-tick-${index}-${tick}`,
        [
          [x + Math.cos(a) * 16, y + Math.sin(a) * 16],
          [x + Math.cos(a) * 19, y + Math.sin(a) * 19],
        ],
        "fine",
        0.46,
        tone,
      );
    }
    path(
      `region-leader-${index}`,
      portrait
        ? [
            [lx, index === 2 ? ly - 35 : ly + 65],
            [index === 2 ? 357 : lx, index === 2 ? 490 : 169],
            [x, y],
          ]
        : [
            [
              index === 0 ? 219 : index === 1 ? 600 : lx,
              index === 2 ? ly - 30 : ly + 22,
            ],
            [x, y],
          ],
      "fine",
      0.3,
      tone,
    );
    label(`region-${index}`, region.name, lx, ly);
    label(
      `assignment-${index}`,
      mode === 0
        ? `Session ${["α", "β", "γ"][index]}`
        : blocked
          ? "Outside policy"
          : "Session α replica",
      lx,
      ly + 22,
      "small",
      tone,
    );
    label(
      `authority-${index}`,
      mode === 0
        ? "Independent order"
        : blocked
          ? "Placement blocked"
          : index === 0
            ? "Ordering leader"
            : "Durable copy",
      lx,
      ly + 42,
      "small",
      tone,
    );
    // A visible crossed route in the residency view, not a silently missing node.
    path(
      `blocked-x-a-${index}`,
      [
        [x - 9, y - 9],
        [x + 9, y + 9],
      ],
      "edge",
      blocked ? 0.9 : 0,
      "fail",
    );
    path(
      `blocked-x-b-${index}`,
      [
        [x - 9, y + 9],
        [x + 9, y - 9],
      ],
      "edge",
      blocked ? 0.9 : 0,
      "fail",
    );
  });
  for (let destination = 1; destination < 3; destination++) {
    const start = globePoint(regions[0].lat, regions[0].lon, 1.04),
      end = globePoint(
        regions[destination].lat,
        regions[destination].lon,
        1.04,
      );
    const routePoint = (t: number) => {
      const lift = Math.sin(t * Math.PI) * 0.3;
      const point: Point = [
        start[0] * (1 - t) + end[0] * t,
        start[1] * (1 - t) + end[1] * t - lift,
        start[2] * (1 - t) + end[2] * t + lift,
      ];
      return project(point);
    };
    const blocked = mode === 2 && destination === 2;
    path(
      `replication-route-${destination}`,
      Array.from({ length: 41 }, (_, i) => routePoint(i / 40)),
      "edge",
      mode ? 0.55 : 0.08,
      blocked ? "fail" : "pass",
    );
    const t = (time * 0.16 + destination * 0.37) % 1;
    const p = routePoint(blocked ? Math.min(t, 0.53) : t);
    circle(
      `packet-${destination}`,
      p[0],
      p[1],
      3.2,
      "glass",
      mode ? 0.95 : 0,
      blocked ? "fail" : "pass",
    );
    const [bx, by] = routePoint(0.55);
    path(
      `route-fence-${destination}`,
      [
        [bx - 6, by - 9],
        [bx + 6, by + 9],
      ],
      "edge",
      blocked ? 0.9 : 0,
      "fail",
    );
  }
  label(
    "placement-summary",
    [
      "Separate sessions, separate order",
      "One session, geographically replicated",
      "Every durable copy must be authorized",
    ][mode],
    cx,
    portrait ? 658 : 34,
    "label",
  );
  label(
    "placement-detail",
    [
      "No global sequencer",
      "Remote durability adds network latency",
      "Artifacts and backups follow residency too",
    ][mode],
    cx,
    portrait ? 682 : 56,
    "small",
  );
  return { paths, labels };
}
