import type {
  ProofFrame,
  ProofLabel,
  ProofPath,
  ProofTone,
} from "./proof-geometry";
import {
  activityFrame,
  sphericalRoutePoint,
} from "./ledger-placement-activity";
import {
  WORLD_COASTLINES,
  WORLD_BORDERS,
  type GeographicChunk,
} from "./world-geography";

type Point = [number, number, number];
const TAU = Math.PI * 2;
export const LEDGER_GLOBE_REVOLUTION_SECONDS = 90;
const regions = [
  { name: "Region A", lat: 39, lon: -70 },
  { name: "Region B", lat: 50, lon: 15 },
  { name: "Region C", lat: 18, lon: 101 },
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

function prepareGeography(chunks: readonly GeographicChunk[]) {
  return chunks.map((chunk) => {
    const lines = chunk.lines.map((line) =>
      line.map(([lon, lat]) => globePoint(lat, lon, 1.006)),
    );
    const all = lines.flat();
    const center = all.reduce<Point>(
      (sum, point) => [
        sum[0] + point[0] / all.length,
        sum[1] + point[1] / all.length,
        sum[2] + point[2] / all.length,
      ],
      [0, 0, 0],
    );
    return { id: chunk.id, disputed: chunk.disputed, lines, center };
  });
}
const coastGeometry = prepareGeography(WORLD_COASTLINES);
const borderGeometry = prepareGeography(WORLD_BORDERS);

/** Geographic routing is independent of the logical identity of the session. */
export function ledgerPlacementFrame(
  time: number,
  selection: number,
  portrait: boolean,
): ProofFrame {
  const clock = Number.isFinite(time) ? Math.max(0, time) : 0;
  const paths: ProofPath[] = [],
    labels: ProofLabel[] = [];
  const mode = Math.max(0, Math.min(2, Math.round(selection)));
  const cx = portrait ? 210 : 400,
    cy = portrait ? 305 : 250,
    radius = portrait ? 153 : 170;
  // One slow geographic rotation on the shared scene clock. Selection changes
  // affect placement policy, never the globe's pose or motion preferences.
  const yaw =
    ((clock % LEDGER_GLOBE_REVOLUTION_SECONDS) /
      LEDGER_GLOBE_REVOLUTION_SECONDS) *
    TAU;
  const roll = -0.12 + Math.sin(clock * 0.19) * 0.025;
  const yawCos = Math.cos(yaw),
    yawSin = Math.sin(yaw),
    rollCos = Math.cos(roll),
    rollSin = Math.sin(roll);
  const depthOf = ([x, , z]: Point) => z * yawCos - x * yawSin;
  const frontness = (point: Point) => {
    // Fade through the limb rather than popping a coastline on/off halfway
    // around the sphere. The rear remains visible through the wireframe shell.
    const amount = Math.max(0, Math.min(1, (depthOf(point) + 0.12) / 0.24));
    return amount * amount * (3 - 2 * amount);
  };
  const project = ([x, y, z]: Point): [number, number] => {
    const turned = x * yawCos + z * yawSin;
    const depth = depthOf([x, y, z]);
    const scale = (radius * 5) / (5 - depth * 0.2);
    return [
      cx + (turned * rollCos - y * rollSin) * scale,
      cy + (turned * rollSin + y * rollCos) * scale,
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
        // Split latitude rings at the current silhouette, not a fixed world
        // longitude; otherwise the bright front half would rotate to the rear.
        project(
          globePoint(
            lat,
            18 - 90 + half * 180 + (i / 48) * 180 - (yaw * 180) / Math.PI,
          ),
        ),
      );
      path(`latitude-${lat}-${half}`, points, "fine", half ? 0.045 : 0.22);
    }
  }
  for (let lon = -162; lon < 198; lon += 15) {
    path(
      `longitude-${lon}`,
      Array.from({ length: 49 }, (_, i) =>
        project(globePoint(-90 + (i / 48) * 180, lon)),
      ),
      "fine",
      0.045 + 0.175 * frontness(globePoint(0, lon)),
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
  for (const [chunks, coastline] of [
    [borderGeometry, false],
    [coastGeometry, true],
  ] as const) {
    for (const chunk of chunks) {
      const visibility = frontness(chunk.center);
      paths.push({
        id: chunk.id,
        d: chunk.lines
          .map((line) =>
            line
              .map((point, index) => {
                const [x, y] = project(point);
                return `${index ? "L" : "M"}${x.toFixed(2)} ${y.toFixed(2)}`;
              })
              .join(" "),
          )
          .join(" "),
        kind: coastline ? "edge" : "fine",
        opacity: coastline
          ? 0.055 + visibility * 0.545
          : 0.025 + visibility * 0.255,
        dashArray: chunk.disputed ? "2 3" : undefined,
      });
    }
  }
  const positions = regions.map((region) =>
    project(globePoint(region.lat, region.lon, 1.04)),
  );
  paths.push(...activityFrame(clock, mode, project, frontness));
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
    const visibility =
      0.4 + 0.6 * frontness(globePoint(region.lat, region.lon, 1.04));
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
        (blocked ? 0.3 : 0.68 - ring * 0.1) * visibility,
        tone,
      );
    for (let tick = 0; tick < 12; tick++) {
      const a = (tick / 12) * TAU + clock * 0.1;
      path(
        `hub-tick-${index}-${tick}`,
        [
          [x + Math.cos(a) * 16, y + Math.sin(a) * 16],
          [x + Math.cos(a) * 19, y + Math.sin(a) * 19],
        ],
        "fine",
        0.46 * visibility,
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
      0.3 * visibility,
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
      blocked ? 0.9 * visibility : 0,
      "fail",
    );
    path(
      `blocked-x-b-${index}`,
      [
        [x - 9, y + 9],
        [x + 9, y - 9],
      ],
      "edge",
      blocked ? 0.9 * visibility : 0,
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
    const routeWorld = (t: number) => sphericalRoutePoint(start, end, t, 0.04);
    const routePoint = (t: number) => project(routeWorld(t));
    const blocked = mode === 2 && destination === 2;
    path(
      `replication-route-${destination}`,
      Array.from({ length: 41 }, (_, i) => routePoint(i / 40)),
      "edge",
      mode ? 0.55 : 0.08,
      blocked ? "fail" : "pass",
    );
    // A short batch leaves the ordering region; its acknowledgement returns
    // only after the last packet reaches the replica. A residency rejection
    // stops at the visible gate and never produces an arrival or an ack.
    const phase = (clock / 7 + destination * 0.21) % 1;
    const clamp = (value: number) => Math.max(0, Math.min(1, value));
    const ease = (value: number) => value * value * (3 - 2 * value);
    const envelope = (value: number) =>
      ease(clamp(value / 0.12)) * ease(clamp((1 - value) / 0.18));
    for (let packet = 0; packet < 3; packet++) {
      const fraction = (phase - packet * 0.08) / 0.38;
      const progress = clamp(fraction) * (blocked ? 0.53 : 1);
      const p = routePoint(progress);
      const opacity = mode
        ? envelope(fraction) * (0.3 + 0.65 * frontness(routeWorld(progress)))
        : 0;
      circle(
        packet === 0
          ? `packet-${destination}`
          : `replication-packet-${destination}-${packet}`,
        p[0],
        p[1],
        packet === 0 ? 2.8 : 2.1,
        "glass",
        opacity,
        blocked ? "fail" : "pass",
      );
      path(
        `replication-trail-${destination}-${packet}`,
        Array.from({ length: 6 }, (_, index) =>
          routePoint(Math.max(0, progress - (1 - index / 5) * 0.075)),
        ),
        "edge",
        opacity * 0.9,
        blocked ? "fail" : "pass",
      );
    }
    const ackProgress = clamp((phase - 0.62) / 0.34);
    const ack = routePoint(1 - ackProgress);
    const ackOpacity =
      mode && !blocked
        ? envelope((phase - 0.62) / 0.34) *
          (0.3 + 0.6 * frontness(routeWorld(1 - ackProgress)))
        : 0;
    circle(
      `replication-ack-${destination}`,
      ack[0],
      ack[1],
      2.2,
      "glass",
      ackOpacity,
      "pending",
    );
    path(
      `replication-ack-trail-${destination}`,
      Array.from({ length: 6 }, (_, index) =>
        routePoint(Math.min(1, 1 - ackProgress + (1 - index / 5) * 0.075)),
      ),
      "edge",
      ackOpacity,
      "pending",
    );
    const arrival = (phase - 0.54) / 0.12;
    const endPoint = routePoint(blocked ? 0.53 : 1);
    circle(
      `replication-arrival-${destination}`,
      endPoint[0],
      endPoint[1],
      3 + 12 * ease(clamp(arrival)),
      "edge",
      mode ? envelope(arrival) * 0.65 : 0,
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
