import type { ProofTone } from "../proof-work/proof-geometry";
import {
  type Point2,
  type Point3,
  type Project3,
  spatialDrawing,
} from "./spatial-drawing";

export const desktopTowerPort: Point3 = [112, 0, 74];

export type TowerActivityMode =
  "idle" | "edit" | "send" | "conflict" | "read" | "verify" | "accepted";

/** A glass-sided desktop chassis, with its broad side and chamfered intake
 * corner exposed. The optional integrated display widens the same chassis
 * between the broad window and intake corner: (110 + displayWidth) × depth × 164.
 * Only the cable contact extends two units beyond the case. Phase and response
 * time come from the caller's stopped study clock, never wall time. Activity is
 * the original 0..1 operation fraction; response describes the held state. */
export function drawDesktopTower(
  d: ReturnType<typeof spatialDrawing>,
  project: Project3,
  options: {
    id: string;
    tone: ProofTone;
    activity: number;
    phase: number;
    displayWidth?: number;
    depth?: number;
    response?: { mode: TowerActivityMode; time: number };
  },
): Point2 {
  const { id, tone } = options;
  const displayWidth = Number.isFinite(options.displayWidth)
    ? Math.max(0, options.displayWidth ?? 0)
    : 0;
  const depth = Number.isFinite(options.depth)
    ? Math.max(38, options.depth ?? 38)
    : 38;
  const rearExtension = depth - 38;
  // Structural faces bridge the inserted panel. Components that meet that
  // seam (fans and feet) keep their shape and move as complete assemblies.
  let section: "chassis" | "left" | "right" = "chassis";
  const q: Project3 = ([x, y, z]) =>
    project([
      x +
        (section === "right" || (section === "chassis" && x >= 80)
          ? displayWidth
          : 0),
      y,
      z,
    ]);
  const progress = Number.isFinite(options.activity)
    ? Math.max(0, Math.min(1, options.activity))
    : 0;
  const phase = Number.isFinite(options.phase) ? options.phase : 0;
  const working = Math.min(1, progress * 10, (1 - progress) * 10);
  const mode = options.response?.mode ?? "idle";
  const responseTime = Number.isFinite(options.response?.time)
    ? Math.max(0, options.response?.time ?? 0)
    : 0;
  const wave = (speed: number, offset = 0) =>
    (Math.sin(responseTime * speed + offset) + 1) / 2;
  const computing = mode === "edit" || mode === "verify";
  const memoryActive = computing || mode === "read";
  const name = (suffix: string) => id + "-" + suffix;
  const line = (
    suffix: string,
    points: readonly Point3[],
    opacity = 0.55,
    accent?: ProofTone,
  ) => d.line(name(suffix), points.map(q), { opacity, tone: accent });
  const face = (
    suffix: string,
    points: readonly Point3[],
    material: "metal" | "silicon" | "circuit" | "emissive" = "metal",
    opacity = 1,
    accent?: ProofTone,
  ) => d.face(name(suffix), points.map(q), material, opacity, accent);
  const solid = (
    suffix: string,
    at: Point3,
    size: Point3,
    material: "metal" | "silicon" | "circuit" = "metal",
    opacity = 1,
  ) => d.solid(name(suffix), q, at, size, { material, opacity });
  const front = (
    suffix: string,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    material: "metal" | "silicon" | "circuit" | "emissive" = "silicon",
    opacity = 1,
    accent?: ProofTone,
  ) =>
    face(
      suffix,
      [
        [x, y, z],
        [x + w, y, z],
        [x + w, y, z + h],
        [x, y, z + h],
      ],
      material,
      opacity,
      accent,
    );
  const plane =
    (at: Point3, u: Point3, v: Point3, normal: Point3) =>
    (a: number, b: number, depth = 0): Point3 => [
      at[0] + u[0] * a + v[0] * b + normal[0] * depth,
      at[1] + u[1] * a + v[1] * b + normal[1] * depth,
      at[2] + u[2] * a + v[2] * b + normal[2] * depth,
    ];
  const circle = (
    p: ReturnType<typeof plane>,
    radius: number,
    depth = 0,
    samples = 32,
  ) =>
    Array.from({ length: samples }, (_, i) => {
      const angle = (i / samples) * Math.PI * 2;
      return p(Math.cos(angle) * radius, Math.sin(angle) * radius, depth);
    });
  function fan(
    suffix: string,
    p: ReturnType<typeof plane>,
    radius: number,
    rotation: number,
    brightness: number,
    visibility = 1,
  ) {
    const r = radius + 1.6,
      cut = 2.6;
    const housing = [
      [-r + cut, -r],
      [r - cut, -r],
      [r, -r + cut],
      [r, r - cut],
      [r - cut, r],
      [-r + cut, r],
      [-r, r - cut],
      [-r, -r + cut],
    ];
    face(
      suffix + "-housing",
      housing.map(([x, y]) => p(x, y, 1.5)),
      "metal",
      visibility,
    );
    face(suffix + "-recess", circle(p, radius, 0.8), "silicon", visibility);
    // The closed outer contour and reversed inner contour form a real ring,
    // not a luminous filled disc that conceals the fan blades.
    face(
      suffix + "-ring",
      [...circle(p, radius, 0.3), ...circle(p, radius - 0.85, 0.3).reverse()],
      "emissive",
      (brightness + working * 0.16) * visibility,
      tone,
    );
    for (let blade = 0; blade < 7; blade++) {
      const angle = rotation + (blade * Math.PI * 2) / 7;
      const outline = [
        [0.21, -0.23],
        [0.76, -0.2],
        [0.88, 0.08],
        [0.7, 0.32],
        [0.28, 0.2],
        [0.19, 0.05],
      ];
      face(
        suffix + "-blade-" + blade,
        outline.map(([distance, turn]) =>
          p(
            Math.cos(angle + turn) * radius * distance,
            Math.sin(angle + turn) * radius * distance,
            0.45,
          ),
        ),
        "metal",
        0.82 * visibility,
      );
    }
    face(
      suffix + "-hub",
      circle(p, radius * 0.24, 0.15),
      "silicon",
      visibility,
    );
    d.line(
      name(suffix + "-hub-ring"),
      circle(p, radius * 0.18, 0.1).map(q),
      { opacity: 0.5 * visibility, tone },
      true,
    );
    for (let screw = 0; screw < 4; screw++) {
      const x = (screw % 2 ? 1 : -1) * (r - 2.8),
        y = (screw < 2 ? 1 : -1) * (r - 2.8);
      line(
        suffix + "-fastener-" + screw,
        [p(x - 0.6, y, 0.4), p(x + 0.6, y, 0.4)],
        0.48 * visibility,
      );
    }
  }
  function tube(suffix: string, controls: readonly Point3[]) {
    const [a, b, c, end] = controls;
    const points = Array.from({ length: 25 }, (_, i): Point3 => {
      const t = i / 24,
        s = 1 - t;
      return [0, 1, 2].map(
        (axis) =>
          s * s * s * a[axis] +
          3 * s * s * t * b[axis] +
          3 * s * t * t * c[axis] +
          t * t * t * end[axis],
      ) as [number, number, number];
    });
    const edges = points.map((p, i) => {
      const before = points[Math.max(0, i - 1)],
        after = points[Math.min(points.length - 1, i + 1)];
      const dx = after[0] - before[0],
        dz = after[2] - before[2];
      const length = Math.hypot(dx, dz) || 1;
      return [-dz / length, dx / length];
    });
    face(
      suffix,
      [
        ...points.map(([x, y, z], i): Point3 => [
          x + edges[i][0],
          y,
          z + edges[i][1],
        ]),
        ...points
          .map(([x, y, z], i): Point3 => [x - edges[i][0], y, z - edges[i][1]])
          .reverse(),
      ],
      "silicon",
    );
    line(
      suffix + "-braid",
      points.map(([x, y, z], i): Point3 => [
        x + edges[i][0] * 0.55,
        y - 0.2,
        z + edges[i][1] * 0.55,
      ]),
      0.52,
    );
  }

  const footprint = [
    [0, 0],
    [80, 0],
    [110, 18],
    [110, depth],
    [0, depth],
  ];
  for (const [i, [x, y]] of [
    [7, 3],
    [69, 3],
    [7, 28 + rearExtension],
    [93, 26 + rearExtension],
  ].entries()) {
    section = x >= 80 ? "right" : "left";
    solid("foot-" + i, [x, y, 0], [11, 9, 5], "silicon");
    front("foot-pad-" + i, x + 1, y - 0.1, 0.5, 9, 1.5, "metal", 0.65);
  }
  section = "chassis";
  // Opaque chamber planes come first. Components in front mask board traces;
  // the glass is drawn only after every interior assembly has been placed.
  face(
    "chamber-back",
    [
      [0, depth, 9],
      [110, depth, 9],
      [110, depth, 158],
      [0, depth, 158],
    ],
    "silicon",
  );
  face(
    "chamber-side",
    [
      [110, 18, 9],
      [110, depth, 9],
      [110, depth, 158],
      [110, 18, 158],
    ],
    "silicon",
  );
  face(
    "chamber-left",
    [
      [0, 0, 9],
      [0, depth, 9],
      [0, depth, 158],
      [0, 0, 158],
    ],
    "metal",
    0.95,
  );
  face(
    "floor",
    footprint.map(([x, y]): Point3 => [x, y, 11]),
    "silicon",
  );
  face(
    "floor-depth",
    [
      [0, 0, 5],
      [80, 0, 5],
      [110, 18, 5],
      [110, 18, 12],
      [80, 0, 12],
      [0, 0, 12],
    ],
    "metal",
  );
  for (let vent = 0; vent < 13; vent++)
    line(
      "side-vent-" + vent,
      [
        [110, 23, 18 + vent * 9.5],
        [110, depth - 4, 18 + vent * 9.5],
      ],
      0.45,
    );

  // A separate rear service chamber supplies the added physical depth. Its
  // seams and fasteners stay on the side plane; the visible motherboard,
  // cooling system and intake fans remain rigid in their near-side chamber.
  const rearVisible = rearExtension > 0 ? 1 : 0;
  const rearSeam = Math.min(42, depth - 8);
  line(
    "rear-chamber-frame",
    [
      [110, rearSeam, 14],
      [110, depth - 3, 14],
      [110, depth - 3, 152],
      [110, rearSeam, 152],
      [110, rearSeam, 14],
    ],
    rearVisible * 0.58,
  );
  for (let screw = 0; screw < 4; screw++) {
    const y = screw % 2 ? depth - 6 : rearSeam + 3;
    const z = screw < 2 ? 17 : 149;
    line(
      "rear-chamber-fastener-" + screw,
      [
        [110, y - 1, z],
        [110, y + 1, z],
      ],
      rearVisible * 0.7,
    );
  }
  const hatchFront = rearSeam + 2;
  const hatchBack = depth - 5;
  const hatch = [
    [hatchFront + 1, 20],
    [hatchBack - 1, 20],
    [hatchBack, 23],
    [hatchBack, 143],
    [hatchBack - 1, 146],
    [hatchFront + 1, 146],
    [hatchFront, 143],
    [hatchFront, 23],
  ];
  face(
    "rear-service-well",
    hatch.map(([y, z]): Point3 => [108.5, y, z]),
    "silicon",
    rearVisible,
  );
  for (let edge = 0; edge < hatch.length; edge++) {
    const a = hatch[edge];
    const b = hatch[(edge + 1) % hatch.length];
    face(
      "rear-service-bevel-" + edge,
      [
        [110, a[0], a[1]],
        [110, b[0], b[1]],
        [108.5, b[0], b[1]],
        [108.5, a[0], a[1]],
      ],
      "metal",
      rearVisible * (edge < 4 ? 0.7 : 0.4),
    );
  }
  for (let vent = 0; vent < 9; vent++) {
    const z = 39 + vent * 10;
    face(
      "rear-service-vent-" + vent,
      [
        [108.7, hatchFront + 3, z],
        [108.7, hatchBack - 3, z],
        [108.7, hatchBack - 3, z + 5],
        [108.7, hatchFront + 3, z + 5],
      ],
      "circuit",
      rearVisible * 0.9,
    );
    face(
      "rear-service-louver-" + vent,
      [
        [108.7, hatchFront + 3, z + 4],
        [108.7, hatchBack - 3, z + 4],
        [110, hatchBack - 3, z + 5],
        [110, hatchFront + 3, z + 5],
      ],
      "metal",
      rearVisible * 0.76,
    );
  }
  line(
    "rear-service-latch",
    [
      [109.1, hatchFront + 4, 28],
      [109.1, hatchBack - 4, 28],
      [109.1, hatchBack - 4, 31],
      [109.1, hatchFront + 4, 31],
      [109.1, hatchFront + 4, 28],
    ],
    rearVisible * 0.65,
  );

  solid("motherboard-tray", [7, 30, 39], [69, 3, 103], "metal");
  front("motherboard", 9, 29.5, 42, 65, 98, "circuit");
  for (let trace = 0; trace < 7; trace++) {
    const x = 14 + trace * 7.6;
    line(
      "board-trace-" + trace,
      [
        [x, 29.1, 50],
        [x, 29.1, 79],
        [x + 4, 29.1, 85],
        [x + 4, 29.1, 135],
      ],
      0.25,
    );
  }
  for (let screw = 0; screw < 4; screw++) {
    const p = plane(
      [screw % 2 ? 69 : 13, 29.1, screw < 2 ? 46 : 136],
      [1, 0, 0],
      [0, 0, 1],
      [0, 1, 0],
    );
    face("motherboard-mount-" + screw, circle(p, 1.4, 0, 12), "metal", 0.8);
  }
  solid("vrm-heatsink", [18, 23, 130], [36, 7, 9], "metal");
  for (let fin = 0; fin < 10; fin++)
    line(
      "vrm-fin-" + fin,
      [
        [20 + fin * 3.3, 22.9, 131],
        [20 + fin * 3.3, 22.9, 138],
      ],
      0.58,
    );
  for (let slot = 0; slot < 2; slot++) {
    const x = 62 + slot * 7;
    solid("dimm-" + slot, [x, 19, 102], [4.2, 10, 34], "silicon");
    front("dimm-spreader-" + slot, x + 0.4, 18.8, 104, 3.4, 30, "metal");
    line(
      "dimm-light-" + slot,
      [
        [x + 2, 18.5, 106],
        [x + 2, 18.5, 133],
      ],
      0.62,
      tone,
    );
    // The light bar reads and writes successive banks. Fixed cells retain
    // their location when the operation changes; only their illumination does.
    for (let bank = 0; bank < 4; bank++)
      front(
        `reactive-dimm-${slot}-${bank}`,
        x + 0.75,
        18.3,
        105 + bank * 7,
        2.7,
        4.2,
        "emissive",
        memoryActive
          ? 0.15 +
              0.65 *
                Math.pow(
                  wave(
                    mode === "verify" ? 2.4 : 1.8,
                    mode === "verify"
                      ? (bank % 2) * Math.PI + slot * Math.PI * 0.5
                      : (mode === "read" ? -1 : 1) * (bank * 0.85 + slot * 1.5),
                  ),
                  2,
                )
          : 0,
        "pending",
      );
    for (let pin = 0; pin < 4; pin++)
      line(
        "dimm-pin-" + slot + "-" + pin,
        [
          [x + 0.5, 18.9, 103 + pin * 8],
          [x + 3.7, 18.9, 103 + pin * 8],
        ],
        0.48,
      );
  }
  solid("m2-drive", [20, 25, 82], [31, 4, 7], "silicon");
  for (let chip = 0; chip < 3; chip++)
    front(
      "m2-package-" + chip,
      23 + chip * 8.4,
      24.8,
      83.4,
      5.5,
      4.2,
      "metal",
      0.8,
    );

  // Pump block, two routed hoses, and the radiator mounted under the case roof.
  solid("cpu-socket", [25, 21, 101], [27, 9, 28], "silicon");
  const pump = plane([38, 15, 115], [1, 0, 0], [0, 0, 1], [0, 1, 0]);
  face("cpu-pump-back", circle(pump, 11.8, 6), "metal");
  face("cpu-pump", circle(pump, 11.8), "silicon");
  face(
    "cpu-pump-rim",
    [...circle(pump, 10.2, -0.15), ...circle(pump, 9.3, -0.15).reverse()],
    "emissive",
    0.55,
    tone,
  );
  front("cpu-face", 30.5, 14.7, 109.5, 15, 11, "silicon");
  front(
    "reactive-cpu-core",
    31.7,
    14.4,
    110.6,
    12.6,
    8.8,
    "emissive",
    computing
      ? 0.12 +
          wave(
            mode === "verify" ? 2.4 : 1.8,
            mode === "verify" ? Math.PI / 2 : 0,
          ) *
            0.3
      : 0,
    "pending",
  );
  front(
    "cpu-activity",
    32,
    14.5,
    111.5,
    12 * progress,
    7,
    "emissive",
    working * 0.86,
    tone,
  );
  const pumpSweep = Array.from({ length: 17 }, (_, i) => {
    const angle = responseTime * 0.9 + (i / 16) * Math.PI * 0.6;
    return [Math.cos(angle), Math.sin(angle)] as const;
  });
  face(
    "reactive-cpu-sweep",
    [
      ...pumpSweep.map(([x, z]) => pump(x * 10.2, z * 10.2, -0.3)),
      ...pumpSweep.map(([x, z]) => pump(x * 9.1, z * 9.1, -0.3)).reverse(),
    ],
    "emissive",
    computing ? 0.62 + wave(1.4) * 0.2 : 0,
    "pending",
  );
  line(
    "reactive-memory-link",
    [
      [49, 18.2, 104],
      [54, 18.2, 98],
      [63.5, 18.2, 98],
      [63.5, 18.2, 103],
    ],
    memoryActive ? 0.2 + wave(1.8, 1.2) * 0.4 : 0,
    "pending",
  );
  solid("radiator", [8, 7, 146], [68, 24, 7], "metal");
  for (let fin = 0; fin < 16; fin++)
    line(
      "radiator-fin-" + fin,
      [
        [11 + fin * 4, 7, 147],
        [11 + fin * 4, 7, 152],
      ],
      0.48,
    );
  for (let i = 0; i < 3; i++)
    fan(
      "radiator-fan-" + i,
      plane([20 + i * 22, 19, 144], [1, 0, 0], [0, 1, 0], [0, 0, 1]),
      9.4,
      phase * 1.05 + i * 0.6,
      0.38,
    );
  tube("aio-tube-0", [
    [48, 14, 117],
    [65, 12, 119],
    [61, 10, 142],
    [58, 9, 146],
  ]);
  tube("aio-tube-1", [
    [38, 14, 126],
    [30, 12, 133],
    [37, 10, 142],
    [29, 9, 146],
  ]);
  for (const [i, [x, z]] of [
    [48, 117],
    [38, 126],
  ].entries())
    solid("aio-coupler-" + i, [x - 2, 12, z - 1.4], [4, 5, 2.8], "metal");
  fan(
    "rear-fan",
    plane([5, 20, 121], [0, 1, 0], [0, 0, 1], [1, 0, 0]),
    12,
    phase * 1.1,
    0.38,
  );

  // A substantial horizontal graphics card and its power lead sit ahead of
  // the motherboard, leaving a visible PCIe mount and a three-slot heat sink.
  solid("gpu", [12, 7, 53], [64, 23, 19], "metal");
  front("gpu-shroud", 13, 6.8, 54, 62, 16, "silicon");
  for (let fin = 0; fin < 5; fin++)
    line(
      "gpu-fin-" + fin,
      [
        [17, 6.6, 56 + fin * 2.5],
        [65, 6.6, 56 + fin * 2.5],
      ],
      0.62,
    );
  solid("gpu-backplate", [12, 7, 72], [64, 23, 2], "metal");
  line(
    "gpu-edge-light",
    [
      [15, 6.5, 70],
      [54, 6.5, 70],
      [57, 6.5, 68],
    ],
    0.66,
    tone,
  );
  solid("gpu-power-plug", [68, 5, 63], [7, 6, 8], "silicon");
  tube("gpu-power-lead", [
    [71, 5, 63],
    [79, 4, 51],
    [76, 7, 43],
    [69, 12, 35],
  ]);
  solid("gpu-brace", [65, 12, 33], [4, 9, 20], "metal", 0.88);
  for (let slot = 0; slot < 3; slot++)
    front("gpu-io-" + slot, 4, 7, 55 + slot * 5.5, 6, 2.4, "silicon");

  solid("psu-shroud", [5, 5, 13], [72, 29, 20], "silicon");
  front("psu-front", 5, 4.8, 14, 72, 18, "silicon");
  face(
    "psu-top",
    [
      [5, 5, 33],
      [77, 5, 33],
      [77, 34, 33],
      [5, 34, 33],
    ],
    "metal",
  );
  for (let vent = 0; vent < 11; vent++)
    line(
      "psu-vent-" + vent,
      [
        [11 + vent * 5.4, 4.6, 18],
        [11 + vent * 5.4, 4.6, 27],
      ],
      0.48,
    );
  line(
    "circuit-signal",
    [
      [28, 28.8, 96],
      [28, 28.8, 91],
      [54, 28.8, 91],
      [58, 28.8, 95],
    ],
    working * 0.86,
    tone,
  );

  // Three full-size intake fans sit behind the angled front corner, rather
  // than being stamped onto the side window as flat decorative circles.
  section = "right";
  for (let i = 0; i < 3; i++)
    fan(
      "intake-" + i,
      plane(
        [92.97, 10.11, 43 + i * 42],
        [0.85749, 0.5145, 0],
        [0, 0, 1],
        [-0.5145, 0.85749, 0],
      ),
      14,
      phase * 1.2 + i * 0.37,
      0.62,
    );
  section = "chassis";

  // Transparent broad side plus chamfered front glazing. The dark chamber
  // remains behind the components; these faces add only a restrained tint.
  d.line(
    name("glass-window"),
    [
      [4, 0, 14],
      [77, 0, 14],
      [77, 0, 155],
      [4, 0, 155],
    ].map(([x, y, z]) => q([x, y, z])),
    { kind: "glass", material: "circuit", opacity: 0.78, fillOpacity: 0.075 },
    true,
  );
  d.line(
    name("glass-corner"),
    [
      [81, 0.6, 14],
      [107, 16.2, 14],
      [107, 16.2, 155],
      [81, 0.6, 155],
    ].map(([x, y, z]) => q([x, y, z])),
    { kind: "glass", material: "silicon", opacity: 0.78, fillOpacity: 0.06 },
    true,
  );
  line(
    "glass-reflection-0",
    [
      [7, 0.1, 148],
      [21, 0.1, 152],
      [41, 0.1, 152],
    ],
    0.3,
  );
  line(
    "glass-reflection-1",
    [
      [72, 0.1, 88],
      [72, 0.1, 121],
    ],
    0.2,
  );
  solid("front-frame", [0, 0, 10], [4, 5, 148], "metal");
  solid("window-mullion", [77, 0, 10], [4, 5, 148], "metal");
  // This is the widened case mullion itself, not a separate monitor. Its
  // lettering surface deliberately uses the original, unwarped projection.
  const displayInset = Math.min(4, displayWidth / 2);
  const displayOpacity = displayWidth > 0 ? 1 : 0;
  d.face(
    name("integrated-bezel"),
    [
      [80, -0.2, 10],
      [80 + displayWidth, -0.2, 10],
      [80 + displayWidth, -0.2, 158],
      [80, -0.2, 158],
    ].map(([x, y, z]) => project([x, y, z])),
    "metal",
    displayOpacity,
  );
  d.face(
    name("integrated-display"),
    [
      [80 + displayInset, -0.3, 14],
      [80 + displayWidth - displayInset, -0.3, 14],
      [80 + displayWidth - displayInset, -0.3, 154],
      [80 + displayInset, -0.3, 154],
    ].map(([x, y, z]) => project([x, y, z])),
    "silicon",
    displayOpacity,
  );
  d.face(
    name("integrated-bezel-crown"),
    [
      [80, -0.2, 158],
      [80 + displayWidth, -0.2, 158],
      [80 + displayWidth, 4, 158],
      [80, 4, 158],
    ].map(([x, y, z]) => project([x, y, z])),
    "metal",
    displayOpacity,
  );
  face(
    "corner-frame",
    [
      [107, 16.2, 10],
      [110, 18, 10],
      [110, 18, 158],
      [107, 16.2, 158],
    ],
    "metal",
  );
  face(
    "top-frame",
    footprint.map(([x, y]): Point3 => [x, y, 164]),
    "metal",
  );
  face(
    "top-frame-depth",
    [
      [0, 0, 156],
      [80, 0, 156],
      [110, 18, 156],
      [110, 18, 164],
      [80, 0, 164],
      [0, 0, 164],
    ],
    "metal",
  );
  face(
    "top-mesh-bed",
    [
      [7, 6, 164],
      [76, 6, 164],
      [99, 21, 164],
      [99, depth - 6, 164],
      [7, depth - 6, 164],
    ],
    "silicon",
  );
  for (let vent = 0; vent < 16; vent++)
    line(
      "top-mesh-" + vent,
      [
        [11 + vent * 4.1, 9, 164],
        [11 + vent * 4.1, depth - 9, 164],
      ],
      0.56,
    );
  for (let cross = 0; cross < 7; cross++) {
    const y = 32 + ((depth - 40) * cross) / 6;
    line(
      "rear-mesh-cross-" + cross,
      [
        [10, y, 164],
        [97, y, 164],
      ],
      rearVisible * 0.3,
    );
  }
  // Rear cooling is cut into the roof, with fan assemblies below its lip.
  // This section uses already-expanded x coordinates, keeping circular fans
  // rigid even when the integrated display widens the chassis underneath.
  section = "left";
  const roofWidth = 110 + displayWidth;
  const bayFront = Math.min(36, depth - 9);
  const bayBack = depth - 6;
  const bay = [
    [11, bayFront],
    [roofWidth - 11, bayFront],
    [roofWidth - 8, bayFront + 3],
    [roofWidth - 8, bayBack - 3],
    [roofWidth - 11, bayBack],
    [11, bayBack],
    [8, bayBack - 3],
    [8, bayFront + 3],
  ];
  face(
    "roof-cooling-well",
    bay.map(([x, y]): Point3 => [x, y, 160]),
    "silicon",
    rearVisible,
  );
  for (let edge = 0; edge < bay.length; edge++) {
    const a = bay[edge];
    const b = bay[(edge + 1) % bay.length];
    face(
      "roof-cooling-bevel-" + edge,
      [
        [a[0], a[1], 164],
        [b[0], b[1], 164],
        [b[0], b[1], 160],
        [a[0], a[1], 160],
      ],
      "metal",
      rearVisible * (edge < 4 ? 0.56 : 0.78),
    );
  }
  const roofFanRadius = Math.max(
    0.1,
    Math.min(18, (bayBack - bayFront) / 2 - 4, (roofWidth - 66) / 4),
  );
  for (let i = 0; i < 3; i++)
    fan(
      "roof-fan-" + i,
      plane(
        [28 + (i * (roofWidth - 56)) / 2, (bayFront + bayBack) / 2, 160.2],
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1],
      ),
      roofFanRadius,
      phase * 1.3 + i * 0.53,
      0.46,
      rearVisible,
    );
  for (let bar = 0; bar < 3; bar++) {
    const y = bayFront + ((bar + 1) * (bayBack - bayFront)) / 4;
    face(
      "roof-cooling-grille-" + bar,
      [
        [10, y - 0.35, 164],
        [roofWidth - 10, y - 0.35, 164],
        [roofWidth - 10, y + 0.35, 164],
        [10, y + 0.35, 164],
      ],
      "metal",
      rearVisible * 0.55,
    );
  }
  line(
    "roof-service-seam",
    [
      [7, 5, 164],
      [roofWidth - 7, 5, 164],
      [roofWidth - 7, 33, 164],
      [7, 33, 164],
      [7, 5, 164],
    ],
    rearVisible * 0.6,
  );
  for (let screw = 0; screw < 4; screw++) {
    const p = plane(
      [screw % 2 ? roofWidth - 6 : 6, screw < 2 ? 7 : depth - 4, 163.8],
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    );
    face(
      "roof-fastener-seat-" + screw,
      circle(p, 1.8, 0, 16),
      "metal",
      rearVisible * 0.85,
    );
    face(
      "roof-fastener-core-" + screw,
      circle(p, 0.85, -0.5, 16),
      "silicon",
      rearVisible,
    );
    line(
      "roof-fastener-slot-" + screw,
      [p(-0.65, 0, -0.5), p(0.65, 0, -0.5)],
      rearVisible * 0.8,
    );
  }
  face(
    "roof-io-recess",
    [
      [roofWidth - 29, 22, 163.3],
      [roofWidth - 5, 22, 163.3],
      [roofWidth - 3, 24, 163.3],
      [roofWidth - 3, 32, 163.3],
      [roofWidth - 29, 32, 163.3],
    ],
    "silicon",
    rearVisible,
  );
  line(
    "roof-io-recess-lip",
    [
      [roofWidth - 29, 22, 164],
      [roofWidth - 5, 22, 164],
      [roofWidth - 3, 24, 164],
      [roofWidth - 3, 32, 164],
    ],
    rearVisible * 0.7,
  );
  section = "chassis";
  line(
    "frame-light",
    [
      [4, 0, 155],
      [77, 0, 155],
      [80, 0, 155],
      [108, 18, 155],
    ],
    0.5,
    tone,
  );
  line(
    "sill-light",
    [
      [5, 0, 12.4],
      [77, 0, 12.4],
      [80, 0, 12.4],
      [107, 17, 12.4],
    ],
    0.5,
    tone,
  );
  // Case indicators are outside the glass but stay on the existing rails.
  // Slow, continuous envelopes distinguish a held conflict from acceptance
  // without flashes, new screen content, or a moving chassis.
  for (const [rail, z] of [
    ["frame", 155],
    ["sill", 12.4],
  ] as const) {
    const strip: Point3[] = [
      [5, 0, z],
      [77, 0, z],
    ];
    line(
      "reactive-warning-" + rail,
      strip,
      mode === "conflict" ? 0.26 + wave(0.9) * 0.22 : 0,
      "fail",
    );
    line(
      "reactive-confirmation-" + rail,
      strip,
      mode === "accepted" ? 0.12 + Math.pow(wave(1.2), 3) * 0.46 : 0,
      "pass",
    );
  }
  for (let screw = 0; screw < 4; screw++) {
    const p = plane(
      [screw % 2 ? 79 : 2, 0, screw < 2 ? 16 : 152],
      [1, 0, 0],
      [0, 0, 1],
      [0, 1, 0],
    );
    face("glass-mount-" + screw, circle(p, 0.9, 0, 12), "silicon");
  }
  // Discrete top-panel I/O and one side-facing network socket at the fixed
  // routing endpoint. The body fits the case; only its contact extends to112.
  for (let port = 0; port < 2; port++)
    face(
      "front-usb-" + port,
      [
        [85 + port * 7, 24, 164],
        [89 + port * 7, 24, 164],
        [89 + port * 7, 28, 164],
        [85 + port * 7, 28, 164],
      ],
      "silicon",
    );
  face(
    "power-button",
    circle(plane([103, 29, 164], [1, 0, 0], [0, 1, 0], [0, 0, 1]), 2.1, 0, 16),
    "silicon",
  );
  // On the deep chassis the same rigid socket sits at the rear edge. Its
  // contact clears the enclosure's projected silhouette, so an outgoing
  // cable does not appear to run across the opaque side panel.
  const networkY = rearExtension > 0 ? depth - 7 : 0;
  const networkPort: Point3 = [112, rearExtension > 0 ? depth : 0, 74];
  const networkContact: Point3 = [110, networkY + 3, 74];
  solid("network-socket", [105, networkY, 68], [5, 7, 12], "metal");
  face(
    "network-inset",
    [
      [110, networkY + 1, 70],
      [110, networkY + 6, 70],
      [110, networkY + 6, 78],
      [110, networkY + 1, 78],
    ],
    "silicon",
  );
  for (let pin = 0; pin < 4; pin++)
    line(
      "network-contact-" + pin,
      [
        [110, networkY + 1.7 + pin, 71],
        [110, networkY + 1.7 + pin, 73],
      ],
      0.8,
      tone,
    );
  line("network-port", [networkContact, networkPort], 0.85, tone);
  front(
    "reactive-network-tx",
    105.7,
    networkY - 0.2,
    76.5,
    1.5,
    2.2,
    "emissive",
    mode === "send" ? 0.3 + wave(2.2) * 0.5 : 0,
    "pending",
  );
  front(
    "reactive-network-rx",
    108,
    networkY - 0.2,
    76.5,
    1.5,
    2.2,
    "emissive",
    mode === "read" ? 0.3 + wave(2.2, 1.2) * 0.5 : 0,
    "pending",
  );
  // Short optical sweeps follow the actual connector contact. Their travel
  // never extends or replaces the scene's authoritative message routes.
  const signal = (responseTime * 0.38) % 1;
  const signalOpacity = Math.sin(signal * Math.PI);
  const contact = (t: number): Point3 => [
    networkContact[0] + (networkPort[0] - networkContact[0]) * t,
    networkContact[1] + (networkPort[1] - networkContact[1]) * t,
    74,
  ];
  for (const direction of ["out", "in"] as const) {
    const start = direction === "out" ? signal * 0.7 : 1 - signal * 0.7;
    const end = start + (direction === "out" ? 0.3 : -0.3);
    line(
      "reactive-network-" + direction,
      [contact(start), contact(end)],
      (direction === "out" ? mode === "send" : mode === "read")
        ? signalOpacity * 0.95
        : 0,
      "pending",
    );
  }
  return q(networkPort);
}
