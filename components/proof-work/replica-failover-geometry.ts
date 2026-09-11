import type {
  ProofFrame,
  ProofLabel,
  ProofPath,
  ProofTone,
} from "./proof-geometry";
import { committedPrefix, replicaStates } from "./replica-failover-data";

type Point = readonly [number, number];
type Vertex = readonly [number, number, number];

function mix(selection: number, values: readonly number[]) {
  const index = Math.max(0, Math.min(values.length - 1, selection));
  const lower = Math.floor(index);
  return (
    values[lower] +
    (values[Math.min(lower + 1, values.length - 1)] - values[lower]) *
      (index - lower)
  );
}
const coord = (point: Point) =>
  point.map((value) => value.toFixed(2)).join(" ");

/** Physical voting replicas of one ordered log; no executor runs inside these servers. */
export function replicaFailoverFrame(
  time: number,
  selection: number,
  portrait: boolean,
): ProofFrame {
  const paths: ProofPath[] = [];
  const labels: ProofLabel[] = [];
  const stateIndex = Math.max(0, Math.min(3, Math.round(selection)));
  const state = replicaStates[stateIndex];
  const nodes = ["A", "B", "C"].map((id, index) => {
    const center: Point = portrait
      ? [252, 180 + index * 202]
      : [164 + index * 236, 252];
    const scale = portrait ? 0.9 : 1;
    const yaw = 0.51 + Math.sin(time * 0.29 + index * 0.45) * 0.07;
    const pitch = 0.48 + Math.sin(time * 0.34 + index * 0.6) * 0.06;
    const lift = Math.sin(time * 0.42 + index * 0.65) * 5;
    const project = ([x, y, z]: Vertex): Point => {
      const depth = -x * Math.sin(yaw) + z * Math.cos(yaw);
      return [
        center[0] + (x * Math.cos(yaw) + z * Math.sin(yaw)) * scale,
        center[1] +
          (y * Math.cos(pitch) + depth * Math.sin(pitch)) * scale +
          lift,
      ];
    };
    return { id, index, center, project };
  });

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
  function label(
    id: string,
    text: string,
    x: number,
    y: number,
    kind: ProofLabel["kind"] = "label",
    tone: ProofTone = "neutral",
    anchor: ProofLabel["anchor"] = "middle",
  ) {
    labels.push({ id, text, x, y, kind, tone, anchor });
  }

  label(
    "session",
    "SESSION S1 / ONE REPLICATED LOG",
    portrait ? 210 : 400,
    portrait ? 39 : 38,
    "heading",
  );
  label(
    "prefix-caption",
    "Committed prefix 01–04",
    portrait ? 210 : 400,
    portrait ? 65 : 61,
    "small",
  );

  // Cables join real chassis ports. Darkening a route never removes or reroutes the wire.
  const connections = [
    {
      id: "A-B",
      a: 0,
      b: 1,
      sideA: 1,
      sideB: portrait ? 1 : -1,
      activity: [0.84, 0.08, 0.06, 0.06],
    },
    {
      id: "A-C",
      a: 0,
      b: 2,
      sideA: portrait ? 1 : -1,
      sideB: 1,
      activity: [0.75, 0.08, 0.06, 0.06],
    },
    {
      id: "B-C",
      a: 1,
      b: 2,
      sideA: 1,
      sideB: portrait ? 1 : -1,
      activity: [0.35, 0.62, 0.9, 0.06],
    },
  ];
  for (const [index, connection] of connections.entries()) {
    const from = nodes[connection.a].project([connection.sideA * 92, 26, 0]);
    const to = nodes[connection.b].project([connection.sideB * 92, 26, 0]);
    let route: Point[];
    if (portrait) {
      const channelX = [368, 390, 379][index];
      route = [from, [channelX, from[1]], [channelX, to[1]], to];
    } else if (index === 1) {
      route = [from, [44, from[1]], [44, 429], [756, 429], [756, to[1]], to];
    } else {
      route = [
        from,
        [(from[0] + to[0]) / 2, from[1]],
        [(from[0] + to[0]) / 2, to[1]],
        to,
      ];
    }
    line("replicate-" + connection.id, route, "fine", 0.34);
    line(
      "replicate-" + connection.id + "-flow",
      route,
      "light",
      mix(selection, connection.activity),
    );
  }

  for (const node of nodes) {
    const { id, index, project, center } = node;
    const visibility =
      index === 0
        ? mix(selection, [1, 0.4, 0.4, 0.4])
        : index === 2
          ? mix(selection, [1, 1, 1, 0.4])
          : 1;
    const leader = state.leader === id;
    const tone: ProofTone =
      stateIndex === 3 && index === 1
        ? "fail"
        : leader
          ? "pass"
          : index === 0 && stateIndex > 0
            ? "pending"
            : "neutral";
    const body = (
      suffix: string,
      points: readonly Vertex[],
      kind: ProofPath["kind"] = "fine",
      opacity = 0.5,
      close = false,
    ) =>
      line(
        `node-${id}-${suffix}`,
        points.map(project),
        kind,
        opacity * visibility,
        tone,
        close,
      );
    const front: Vertex[] = [
      [-92, -49, 56],
      [92, -49, 56],
      [92, 49, 56],
      [-92, 49, 56],
      [-92, -49, 56],
    ];
    const rear: Vertex[] = [
      [-92, -49, -56],
      [92, -49, -56],
      [92, 49, -56],
      [-92, 49, -56],
      [-92, -49, -56],
    ];

    body("rear-frame", rear, "rear", 0.5);
    body(
      "floor",
      [
        [-92, 49, -56],
        [92, 49, -56],
        [92, 49, 56],
        [-92, 49, 56],
      ],
      "glass",
      0.28,
      true,
    );
    body(
      "side",
      [
        [92, -49, -56],
        [92, 49, -56],
        [92, 49, 56],
        [92, -49, 56],
      ],
      "glass",
      0.32,
      true,
    );
    for (let edge = 0; edge < 4; edge++)
      body(`rail-${edge}`, [front[edge], rear[edge]], "edge", 0.7);

    // A lifted clear lid exposes the motherboard, memory traces, and finned heat sink.
    body(
      "motherboard",
      [
        [-82, -39, -45],
        [82, -39, -45],
        [82, -39, 45],
        [-82, -39, 45],
      ],
      "glass",
      0.33,
      true,
    );
    for (let trace = 0; trace < 12; trace++) {
      const x = -77 + trace * 12.6;
      body(
        `board-trace-${trace}`,
        [
          [x, -40, -38],
          [x, -40, -14],
          [x + 5, -40, -9],
          [x + 5, -40, 34],
        ],
        "fine",
        0.4,
      );
    }
    for (let fin = 0; fin < 12; fin++) {
      const x = -20 + fin * 4.1;
      body(
        `heatsink-${fin}`,
        [
          [x, -41, -31],
          [x, -65, -31],
          [x, -65, 10],
          [x, -41, 10],
        ],
        fin % 3 ? "fine" : "edge",
        0.52,
      );
    }
    for (let slot = 0; slot < 3; slot++) {
      const z = 14 + slot * 8;
      body(
        `memory-bank-${slot}`,
        [
          [-75, -43, z],
          [-28, -43, z],
          [-28, -53, z],
          [-75, -53, z],
          [-75, -43, z],
        ],
        "edge",
        0.5,
      );
      for (let pin = 0; pin < 7; pin++) {
        const x = -70 + pin * 6;
        body(
          `memory-pin-${slot}-${pin}`,
          [
            [x, -43, z],
            [x, -47, z],
          ],
          "fine",
          0.46,
        );
      }
    }
    const lid: Vertex[] = [
      [-96, -72, -60],
      [96, -72, -60],
      [96, -72, 60],
      [-96, -72, 60],
      [-96, -72, -60],
    ];
    body("lid", lid, "glass", 0.25);
    body("lid-leading-rim", [lid[2], lid[3]], "edge", 0.63);
    for (const [corner, x] of [-83, 83].entries()) {
      body(
        `lid-strut-${corner}`,
        [
          [x, -49, -49],
          [x, -72, -49],
        ],
        "edge",
        0.52,
      );
      body(
        `lid-lock-${corner}`,
        [
          [x - 4, -73, -51],
          [x + 4, -73, -51],
          [x + 4, -73, -45],
          [x - 4, -73, -45],
          [x - 4, -73, -51],
        ],
        "fine",
        0.55,
      );
    }

    body("front-face", front, "glass", 0.38);
    body("front-border", front, "edge", 0.7);
    body(
      "front-recess",
      [
        [-85, -42, 57],
        [85, -42, 57],
        [85, 42, 57],
        [-85, 42, 57],
        [-85, -42, 57],
      ],
      "fine",
      0.48,
    );
    for (let vent = 0; vent < 10; vent++) {
      const y = -39 + vent * 8;
      body(
        `side-vent-${vent}`,
        [
          [93, y, -42],
          [93, y, 38],
        ],
        "fine",
        0.48,
      );
    }
    for (let fan = 0; fan < 2; fan++) {
      const cx = -48 + fan * 53;
      for (let ring = 0; ring < 3; ring++) {
        const radius = [23, 20, 5][ring];
        const circle: Vertex[] = Array.from({ length: 33 }, (_, point) => [
          cx + Math.cos((point * Math.PI) / 16) * radius,
          -8 + Math.sin((point * Math.PI) / 16) * radius,
          58,
        ]);
        body(
          `fan-${fan}-ring-${ring}`,
          circle,
          ring ? "fine" : "edge",
          ring ? 0.42 : 0.62,
        );
      }
      for (let blade = 0; blade < 7; blade++) {
        const angle = time * 0.42 + (blade * Math.PI * 2) / 7 + fan * 0.3;
        const points: Vertex[] = [
          [cx + Math.cos(angle) * 6, -8 + Math.sin(angle) * 6, 58.5],
          [
            cx + Math.cos(angle + 0.35) * 18,
            -8 + Math.sin(angle + 0.35) * 18,
            58.5,
          ],
          [
            cx + Math.cos(angle + 0.64) * 17,
            -8 + Math.sin(angle + 0.64) * 17,
            58.5,
          ],
        ];
        body(`fan-${fan}-blade-${blade}`, points, "fine", 0.46);
      }
      body(
        `fan-${fan}-brace`,
        [
          [cx - 23, -31, 58],
          [cx + 23, -31, 58],
          [cx + 23, 15, 58],
          [cx - 23, 15, 58],
          [cx - 23, -31, 58],
        ],
        "rear",
        0.44,
      );
    }

    // Four persistent slots are the same committed log entries on every voter.
    for (let entry = 0; entry < committedPrefix.length; entry++) {
      const y = -33 + entry * 17;
      const vertices: Vertex[] = [
        [43, y, 58],
        [78, y, 58],
        [78, y + 11, 58],
        [43, y + 11, 58],
        [43, y, 58],
      ];
      line(
        `node-${id}-entry-${committedPrefix[entry]}`,
        vertices.map(project),
        "glass",
        0.5,
        "pass",
      );
      for (let bit = 0; bit < 5; bit++) {
        const x = 48 + bit * 5;
        line(
          `node-${id}-entry-${committedPrefix[entry]}-bit-${bit}`,
          [project([x, y + 4, 59]), project([x, y + 8, 59])],
          "fine",
          0.47 + ((entry + bit) % 2) * 0.16,
          "pass",
        );
      }
    }
    for (let port = 0; port < 3; port++) {
      const x = -76 + port * 33;
      body(
        `front-port-${port}`,
        [
          [x, 28, 58],
          [x + 23, 28, 58],
          [x + 23, 38, 58],
          [x, 38, 58],
          [x, 28, 58],
        ],
        "edge",
        0.65,
      );
      for (let pin = 0; pin < 5; pin++)
        body(
          `front-port-${port}-pin-${pin}`,
          [
            [x + 3 + pin * 4, 28, 59],
            [x + 3 + pin * 4, 31, 59],
          ],
          "fine",
          0.5,
        );
    }
    for (const side of [-1, 1]) {
      const port: Vertex = [side * 92, 26, 0];
      body(
        `port-${side === -1 ? "left" : "right"}`,
        [port, [side * 99, 26, 0]],
        "edge",
        0.76,
      );
      body(
        `foot-${side}`,
        [
          [side * 73, 49, 37],
          [side * 73, 57, 37],
          [side * 62, 57, 37],
        ],
        "edge",
        0.55,
      );
    }
    const fenced = index === 0 ? mix(selection, [0, 0.85, 0.85, 0.85]) : 0;
    const fenceA = project([-95, 52, 64]),
      fenceB = project([95, 52, 64]);
    line(
      `node-${id}-authority-fence`,
      [fenceA, fenceB],
      "edge",
      fenced,
      "pending",
    );

    if (portrait) {
      label(
        `node-${id}-region`,
        `REGION ${id}`,
        28,
        center[1] - 45,
        "heading",
        "neutral",
        "start",
      );
      label(
        `node-${id}-role`,
        state.roles[index],
        28,
        center[1] - 18,
        "label",
        tone,
        "start",
      );
      label(
        `node-${id}-prefix`,
        "01–04 retained",
        28,
        center[1] + 9,
        "small",
        "neutral",
        "start",
      );
    } else {
      label(`node-${id}-region`, `REGION ${id}`, center[0], 91, "heading");
      label(
        `node-${id}-role`,
        state.roles[index],
        center[0],
        116,
        "label",
        tone,
      );
      label(`node-${id}-prefix`, "01 · 02 · 03 · 04", center[0], 388, "small");
    }
  }
  const outcomeTone =
    state.writes === "Admitted"
      ? "pass"
      : state.writes === "Refused"
        ? "fail"
        : "pending";
  label(
    "quorum-status",
    state.status,
    portrait ? 210 : 400,
    portrait ? 710 : 474,
    "status",
    outcomeTone,
  );
  return { paths, labels };
}
