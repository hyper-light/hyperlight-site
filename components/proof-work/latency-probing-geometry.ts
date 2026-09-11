import type {
  ProofFrame,
  ProofLabel,
  ProofPath,
  ProofTone,
} from "./proof-geometry";
import {
  latencyExamples,
  latencyMeasurements,
  type LatencyCoordinate,
} from "./latency-probing-data";

type Point = readonly [number, number];
type Vertex = readonly [number, number, number];
const coord = (point: Point) =>
  point.map((value) => value.toFixed(2)).join(" ");
function blend(selection: number, values: readonly number[]) {
  const index = Math.max(0, Math.min(values.length - 1, selection));
  const lower = Math.floor(index);
  return (
    values[lower] +
    (values[Math.min(lower + 1, values.length - 1)] - values[lower]) *
      (index - lower)
  );
}
function embedded(coordinate: LatencyCoordinate): Vertex {
  const v = coordinate.vector;
  // An explicitly illustrative 8D → 3D projection. Numerical RTT uses every axis independently.
  return [
    -110 + (v[0] * 0.85 + v[2] * 0.15 - v[4] * 0.45 + v[6] * 0.35) * 2.2,
    -20 + (v[1] * 0.75 + v[3] * 0.35 - v[5] * 0.25 + v[7] * 0.15) * 1.8,
    coordinate.height * 5 + 6,
  ];
}

/** A moving coordinate instrument, not a geographic map or request router. */
export function latencyProbingFrame(
  time: number,
  selection: number,
  portrait: boolean,
): ProofFrame {
  const paths: ProofPath[] = [];
  const labels: ProofLabel[] = [];
  const selected = Math.max(0, Math.min(2, Math.round(selection)));
  const example = latencyExamples[selected];
  const measurement = latencyMeasurements[selected];
  const center: Point = portrait ? [210, 258] : [251, 250];
  const scale = portrait ? 0.79 : 1;
  const pitch = 0.64 + Math.sin(time * 0.31) * 0.06;
  const yaw = 0.075 + Math.sin(time * 0.25) * 0.045;
  const project = ([x, y, z]: Vertex): Point => [
    center[0] + (x * Math.cos(yaw) - y * Math.sin(yaw)) * scale,
    center[1] +
      ((x * Math.sin(yaw) + y * Math.cos(yaw)) * Math.cos(pitch) -
        z * Math.sin(pitch)) *
        scale,
  ];
  const peaks = latencyExamples.map(({ peer }) => embedded(peer));
  const learned = latencyMeasurements.map(({ updated }) => embedded(updated));
  const interpolatePoint = (points: readonly Vertex[]): Vertex => [
    blend(
      selection,
      points.map((point) => point[0]),
    ),
    blend(
      selection,
      points.map((point) => point[1]),
    ),
    blend(
      selection,
      points.map((point) => point[2]),
    ),
  ];
  const observer = interpolatePoint(learned);
  const peerCenters: Vertex[] = peaks.map((peer, index) => [
    peer[0],
    peer[1],
    peer[2] + 7 + Math.sin(time * 0.45 + index) * 2,
  ]);
  const weight = (index: number) =>
    blend(
      selection,
      [0, 1, 2].map((candidate) => (candidate === index ? 1 : 0.18)),
    );
  const terrain = (x: number, y: number) => {
    let height =
      Math.sin(x * 0.014 + time * 0.45) * 3 +
      Math.cos(y * 0.015 - time * 0.36) * 3;
    for (const [index, peer] of peaks.entries()) {
      const distance = ((x - peer[0]) / 75) ** 2 + ((y - peer[1]) / 62) ** 2;
      height += Math.exp(-distance) * (9 + weight(index) * 15);
    }
    return height;
  };
  function line(
    id: string,
    points: readonly Point[],
    kind: ProofPath["kind"] = "fine",
    opacity = 0.5,
    tone: ProofTone = "neutral",
    close = false,
  ) {
    paths.push({
      id,
      d:
        points
          .map((point, index) => `${index ? "L" : "M"}${coord(point)}`)
          .join(" ") + (close ? " Z" : ""),
      kind,
      opacity,
      tone,
    });
  }
  function physical(
    id: string,
    points: readonly Vertex[],
    kind: ProofPath["kind"] = "fine",
    opacity = 0.5,
    tone: ProofTone = "neutral",
    close = false,
  ) {
    line(id, points.map(project), kind, opacity, tone, close);
  }
  function label(
    id: string,
    text: string,
    x: number,
    y: number,
    kind: ProofLabel["kind"] = "label",
    anchor: ProofLabel["anchor"] = "middle",
    tone: ProofTone = "neutral",
  ) {
    labels.push({ id, text, x, y, kind, anchor, tone });
  }
  label(
    "coordinate-title",
    "RTT OBSERVATIONS / COORDINATE UPDATE",
    portrait ? 210 : 251,
    38,
    "heading",
  );
  label(
    "projection",
    "Illustrative projection of eight dimensions",
    portrait ? 210 : 251,
    63,
    "small",
  );

  // A suspended, open metric lattice: two levels and sparse ribs provide depth without a slab.
  for (let layer = 0; layer < 2; layer++) {
    for (let row = 0; row < 13; row++) {
      const y = -125 + row * 23;
      const points: Vertex[] = Array.from({ length: 29 }, (_, index) => {
        const x = -190 + index * 13.5;
        return [x, y, terrain(x, y) - layer * 19];
      });
      physical(
        `field-${layer}-row-${row}`,
        points,
        layer ? "rear" : "fine",
        layer ? 0.16 : 0.3,
      );
    }
    for (let column = 0; column < 17; column++) {
      const x = -190 + column * 23.625;
      const points: Vertex[] = Array.from({ length: 25 }, (_, index) => {
        const y = -125 + index * 11.5;
        return [x, y, terrain(x, y) - layer * 19];
      });
      physical(
        `field-${layer}-column-${column}`,
        points,
        layer ? "rear" : "fine",
        layer ? 0.13 : 0.26,
      );
    }
  }
  for (let rib = 0; rib < 12; rib++) {
    const x = -190 + rib * 34.36;
    for (const [side, y] of [-125, 151].entries()) {
      const z = terrain(x, y);
      physical(
        `field-rib-${side}-${rib}`,
        [
          [x, y, z],
          [x, y, z - 19],
        ],
        "edge",
        0.35,
      );
    }
  }
  for (let contour = 0; contour < 4; contour++) {
    const radius = 49 + contour * 39;
    const points: Vertex[] = Array.from({ length: 65 }, (_, index) => {
      const angle = (index * Math.PI) / 32;
      const x = Math.cos(angle) * radius,
        y = 10 + Math.sin(angle) * radius * 0.64;
      return [x, y, terrain(x, y) + 1];
    });
    physical(`metric-contour-${contour}`, points, "edge", 0.26);
    physical(`metric-contour-${contour}-flow`, points, "light", 0.2);
  }

  // The observer's before/after coordinate is an actual single update, never an invented counter.
  const before = interpolatePoint(
    latencyExamples.map(({ local }) => embedded(local)),
  );
  physical("coordinate-adjustment", [before, observer], "edge", 0.8);
  for (let ring = 0; ring < 3; ring++) {
    const circle: Vertex[] = Array.from({ length: 33 }, (_, index) => {
      const angle = (index * Math.PI) / 16;
      const radius = 5 + ring * 3;
      return [
        observer[0] + Math.cos(angle) * radius,
        observer[1] + Math.sin(angle) * radius,
        observer[2] + ring * 4,
      ];
    });
    physical(
      `observer-ring-${ring}`,
      circle,
      ring ? "fine" : "edge",
      0.8 - ring * 0.14,
    );
  }
  physical(
    "observer-height",
    [[observer[0], observer[1], terrain(observer[0], observer[1])], observer],
    "edge",
    0.7,
  );

  for (const [index, peer] of peaks.entries()) {
    const active = weight(index);
    const radius = [12, 18, 36][index];
    const pulse = 1 + Math.sin(time * 0.55 + index * 1.2) * 0.045;
    const beadZ = peerCenters[index][2];
    physical(
      `peer-${index}-height`,
      [
        [peer[0], peer[1], terrain(peer[0], peer[1])],
        [peer[0], peer[1], beadZ],
      ],
      "edge",
      0.3 + active * 0.5,
    );
    for (let meridian = 0; meridian < 8; meridian++) {
      const turn = (meridian * Math.PI) / 8 + time * 0.035;
      const points: Vertex[] = Array.from({ length: 33 }, (_, vertex) => {
        const angle = (vertex * Math.PI) / 16;
        return [
          peer[0] + Math.cos(angle) * Math.cos(turn) * radius * pulse,
          peer[1] + Math.cos(angle) * Math.sin(turn) * radius * pulse,
          beadZ + Math.sin(angle) * radius * 0.65 * pulse,
        ];
      });
      physical(
        `peer-${index}-meridian-${meridian}`,
        points,
        "fine",
        0.12 + active * 0.23,
      );
    }
    for (let latitude = -2; latitude <= 2; latitude++) {
      const height = latitude * 0.29;
      const ringRadius = Math.sqrt(1 - height * height) * radius * pulse;
      const points: Vertex[] = Array.from({ length: 41 }, (_, vertex) => {
        const angle = (vertex * Math.PI) / 20;
        return [
          peer[0] + Math.cos(angle) * ringRadius,
          peer[1] + Math.sin(angle) * ringRadius,
          beadZ + height * radius * 0.65 * pulse,
        ];
      });
      physical(
        `peer-${index}-latitude-${latitude}`,
        points,
        latitude ? "fine" : "edge",
        0.16 + active * 0.28,
      );
    }
    for (let ring = 0; ring < 2; ring++) {
      const points: Vertex[] = Array.from({ length: 33 }, (_, vertex) => {
        const angle = (vertex * Math.PI) / 16;
        return [
          peer[0] + Math.cos(angle) * (4 + ring * 4),
          peer[1] + Math.sin(angle) * (4 + ring * 4),
          beadZ + 2,
        ];
      });
      physical(
        `peer-${index}-coordinate-${ring}`,
        points,
        "edge",
        0.45 + active * 0.35,
      );
    }
    for (let direction = 0; direction < 2; direction++) {
      const from: Vertex = direction ? [peer[0], peer[1], beadZ] : observer;
      const to: Vertex = direction ? observer : [peer[0], peer[1], beadZ];
      const route: Vertex[] = Array.from({ length: 33 }, (_, vertex) => {
        const progress = vertex / 32;
        return [
          from[0] + (to[0] - from[0]) * progress,
          from[1] +
            (to[1] - from[1]) * progress +
            Math.sin(progress * Math.PI) * (direction ? -11 : 11),
          from[2] +
            (to[2] - from[2]) * progress +
            Math.sin(progress * Math.PI) * (direction ? 22 : 42),
        ];
      });
      physical(
        `peer-${index}-${direction ? "ack" : "probe"}`,
        route,
        "fine",
        0.12 + active * 0.37,
      );
      physical(
        `peer-${index}-${direction ? "ack" : "probe"}-flow`,
        route,
        "light",
        0.12 + active * 0.75,
      );
    }
  }

  const callouts = portrait
    ? [
        [194, 123],
        [333, 411],
        [73, 123],
      ]
    : [
        [211, 119],
        [442, 392],
        [64, 123],
      ];
  for (let index = 0; index < peaks.length; index++) {
    const [x, y] = callouts[index];
    const position = project(peerCenters[index]);
    line(
      `peer-${index}-callout`,
      [position, [x, y + (index === 1 ? -14 : 11)]],
      "fine",
      0.2 + weight(index) * 0.35,
    );
    label(`peer-${index}-name`, latencyExamples[index].label, x, y, "label");
  }
  const observerLabel: Point = portrait ? [80, 411] : [81, 392];
  line(
    "observer-callout",
    [project(observer), [observerLabel[0], observerLabel[1] - 14]],
    "fine",
    0.42,
  );
  label(
    "observer-name",
    "Observer",
    observerLabel[0],
    observerLabel[1],
    "label",
  );

  if (portrait) {
    for (const [index, [title, value]] of [
      ["OBSERVED RTT", `${example.observed} ms`],
      ["ESTIMATE", `${measurement.estimate.toFixed(1)} ms`],
      ["ERROR MARGIN", `+${measurement.margin.toFixed(1)} ms`],
    ].entries()) {
      const x = [77, 210, 343][index];
      label(`metric-${index}-title`, title, x, 480, "heading");
      label(`metric-${index}-value`, value, x, 506, "label");
    }
    label(
      "sample-state",
      measurement.fallback
        ? "Under 3 samples · conservative defaults"
        : "Acknowledgement updates all eight axes",
      210,
      545,
      "small",
    );
    label("deadline-title", "PEER PROBE DEADLINE", 210, 585, "heading");
    label(
      "deadline-value",
      `${measurement.deadline.toLocaleString("en-US")} ms · health ${measurement.health}×`,
      210,
      611,
      "status",
    );
  } else {
    for (const [index, [title, value]] of [
      ["OBSERVED RTT", `${example.observed} ms`],
      [
        "ESTIMATE + ERROR",
        `${measurement.estimate.toFixed(1)} + ${measurement.margin.toFixed(1)} ms`,
      ],
      ["OBSERVER HEALTH", `${measurement.health}× timeout`],
    ].entries()) {
      label(`metric-${index}-title`, title, 637, 159 + index * 91, "heading");
      label(`metric-${index}-value`, value, 637, 185 + index * 91, "label");
    }
    label(
      "sample-state",
      measurement.fallback
        ? "Under 3 samples · fallback"
        : "Updated from the acknowledgement",
      637,
      399,
      "small",
    );
    label("deadline-title", "PEER PROBE DEADLINE", 638, 443, "heading");
    label(
      "deadline-value",
      `${measurement.deadline.toLocaleString("en-US")} ms`,
      638,
      471,
      "status",
    );
  }

  // One linear time rail: the returned RTT marker precedes the peer-specific deadline gate.
  const rail: [number, number, number] = portrait
    ? [60, 646, 300]
    : [65, 449, 406];
  const deadline = blend(
    selection,
    latencyMeasurements.map((item) => item.deadline),
  );
  const observed = blend(
    selection,
    latencyExamples.map((item) => item.observed),
  );
  const deadlineX = rail[0] + (rail[2] * deadline) / 1500;
  const returnedX = rail[0] + (rail[2] * observed) / 1500;
  for (let level = 0; level < 2; level++)
    line(
      `deadline-rail-${level}`,
      [
        [rail[0], rail[1] + level * 5],
        [rail[0] + rail[2], rail[1] + level * 5],
      ],
      level ? "rear" : "fine",
      level ? 0.25 : 0.6,
    );
  for (let tick = 0; tick <= 15; tick++) {
    const x = rail[0] + (rail[2] * tick) / 15;
    line(
      `deadline-tick-${tick}`,
      [
        [x, rail[1] - (tick % 5 ? 2 : 5)],
        [x, rail[1] + 5],
      ],
      "fine",
      tick % 5 ? 0.25 : 0.5,
    );
  }
  line(
    "deadline-window",
    [
      [rail[0], rail[1]],
      [deadlineX, rail[1]],
    ],
    "light",
    0.8,
  );
  line(
    "deadline-gate",
    [
      [deadlineX - 4, rail[1] - 11],
      [deadlineX, rail[1] - 15],
      [deadlineX + 4, rail[1] - 11],
      [deadlineX + 4, rail[1] + 11],
      [deadlineX, rail[1] + 15],
      [deadlineX - 4, rail[1] + 11],
      [deadlineX - 4, rail[1] - 11],
    ],
    "edge",
    0.85,
  );
  line(
    "returned-rtt",
    [
      [returnedX, rail[1] - 7],
      [returnedX, rail[1] + 7],
    ],
    "edge",
    0.95,
    "pass",
  );
  label("time-zero", "0", rail[0], rail[1] + 30, "small");
  label("time-capacity", "1.5 s", rail[0] + rail[2], rail[1] + 30, "small");
  label(
    "timing-only",
    "Probe timing, not routing authority",
    portrait ? 210 : 268,
    portrait ? 716 : 503,
    "small",
  );
  return { paths, labels };
}
