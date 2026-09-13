import type { Point2, Point3, spatialDrawing } from "./spatial-drawing";
import {
  orbitalVolume,
  type OrbitalHardwareOptions,
  type OrbitalSurface,
} from "./orbital-volume-drawing";

/** A capital drydock, not a freestanding computer: two unequal armored arms
 * shelter a deep launch trench. Local bounds stay [-112,112] × [-90,75]. */
export function drawOrbitalOwner(
  drawing: ReturnType<typeof spatialDrawing>,
  id: string,
  center: Point2,
  scale: number,
  options: OrbitalHardwareOptions,
) {
  const { face, line, box, wave } = orbitalVolume(
    drawing,
    id,
    center,
    scale,
    options,
  );
  const activity = Math.max(0, Math.min(1, options.activity));
  const open = Math.max(0, Math.min(1, options.bayOpen ?? 0));
  const accent = options.tone === "neutral" ? "pass" : (options.tone ?? "pass");
  const deck = (
    key: string,
    outline: readonly Point2[],
    bottom: number,
    top: number,
    material: OrbitalSurface = "hull",
  ) => {
    const signed = outline.reduce((area, [x, y], index) => {
      const next = outline[(index + 1) % outline.length];
      return area + x * next[1] - next[0] * y;
    }, 0);
    const points = signed < 0 ? [...outline].reverse() : [...outline];
    for (let side = 0; side < points.length; side++) {
      const [x, y] = points[side],
        [u, v] = points[(side + 1) % points.length];
      // Only outward near-facing planes are visible from the fixed camera.
      if (-(v - y) - 2 * (u - x) <= 0) continue;
      face(
        `${key}-wall-${side}`,
        [
          [x, y, bottom],
          [u, v, bottom],
          [u, v, top],
          [x, y, top],
        ],
        material,
      );
    }
    face(
      key + "-top",
      points.map(([x, y]): Point3 => [x, y, top]),
      material,
    );
  };

  // Unequal radiator assemblies sit behind the opaque hull. Their thick spars
  // and hinged panels establish the spacecraft's full width before the dock.
  for (const side of [-1, 1]) {
    const x = side < 0 ? -93 : 79;
    const y = side < 0 ? -30 : 13;
    box(
      `radiator-${side}-strut`,
      [x, y, 4],
      [side < 0 ? 42 : 18, 7, 7],
      "hull",
    );
    box(`radiator-${side}-panel`, [x - 9, y - 17, 11], [22, 43, 4], "armor");
    face(
      `radiator-${side}-inset`,
      [
        [x - 6, y - 14, 15.1],
        [x + 10, y - 14, 15.1],
        [x + 10, y + 23, 15.1],
        [x - 6, y + 23, 15.1],
      ],
      "dark",
    );
    for (let cell = 0; cell < 8; cell++) {
      const v = y - 12 + cell * 4.6;
      line(
        `radiator-${side}-rib-${cell}`,
        [
          [x - 5, v, 15.2],
          [x + 9, v, 15.2],
        ],
        0.35,
      );
    }
    for (let rail = 0; rail < 3; rail++) {
      const u = x - 3 + rail * 5;
      line(
        `radiator-${side}-rail-${rail}`,
        [
          [u, y - 13, 15.3],
          [u, y + 22, 15.3],
        ],
        0.21,
      );
    }
    box(`radiator-${side}-hinge`, [x + 9, y - 1, 15], [6, 10, 5], "hull");
  }

  const leftHull: Point2[] = [
    [-69, -26],
    [-62, -43],
    [-39, -49],
    [-18, -35],
    [-16, -8],
    [-28, 38],
    [-52, 46],
    [-74, 25],
  ];
  const rightHull: Point2[] = [
    [15, -38],
    [48, -42],
    [69, -19],
    [70, 12],
    [57, 43],
    [40, 57],
    [13, 45],
    [11, 15],
    [22, -7],
  ];
  // The armored underside is larger and darker than the upper flight decks.
  deck(
    "port-keel",
    leftHull.map(([x, y]) => [x - 2, y + 2] as Point2),
    1,
    8,
    "dark",
  );
  deck(
    "starboard-keel",
    rightHull.map(([x, y]) => [x + 2, y + 2] as Point2),
    0,
    8,
    "dark",
  );
  deck(
    "aft-crossmember",
    [
      [-42, -44],
      [30, -43],
      [34, -29],
      [-39, -29],
    ],
    3,
    16,
    "hull",
  );

  // A low floor lets the elevated inner walls occlude it. No translucent back
  // edges are drawn through the arms, and the center stays visibly open.
  face(
    "launch-trench",
    [
      [-20, -29, 1],
      [18, -28, 1],
      [12, 46, 1],
      [-30, 46, 1],
    ],
    "dark",
  );
  face(
    "launch-throat",
    [
      [-30, 43, 1],
      [12, 43, 1],
      [-30.364, 92.727, 0],
      [-62.364, 92.727, 0],
    ],
    "dark",
  );
  for (let marking = 0; marking < 5; marking++) {
    const y = -17 + marking * 12;
    line(
      `trench-deck-mark-${marking}`,
      [
        [-16, y, 1.2],
        [-5, y + 1, 1.2],
        [6, y, 1.2],
      ],
      0.17,
    );
  }
  line(
    "launch-rail-port",
    [
      [-18, -17, 1.5],
      [-22, 39, 1.5],
      [-57.364, 92.727, 0.5],
    ],
    0.32,
    accent,
  );
  line(
    "launch-rail-starboard",
    [
      [7, -17, 1.5],
      [4, 39, 1.5],
      [-35.364, 92.727, 0.5],
    ],
    0.32,
    accent,
  );

  deck("port-arm", leftHull, 8, 25, "hull");
  deck("starboard-arm", rightHull, 8, 19, "hull");
  // Dark inner bulkheads make the trench's seventeen-unit drop unmistakable.
  face(
    "port-inner-bulkhead",
    [
      [-16, -8, 8],
      [-28, 38, 8],
      [-28, 38, 25],
      [-16, -8, 25],
    ],
    "dark",
  );
  face(
    "starboard-inner-bulkhead",
    [
      [11, 15, 8],
      [13, 45, 8],
      [13, 45, 19],
      [11, 15, 19],
    ],
    "dark",
  );
  deck(
    "port-raised-armor",
    [
      [-66, -25],
      [-56, -37],
      [-41, -40],
      [-27, -31],
      [-27, -8],
      [-38, 31],
      [-52, 35],
      [-65, 21],
    ],
    25,
    30,
    "armor",
  );
  deck(
    "starboard-raised-armor",
    [
      [29, -28],
      [47, -31],
      [58, -17],
      [58, 12],
      [47, 35],
      [34, 43],
      [23, 36],
      [23, 17],
      [32, -7],
    ],
    19,
    24,
    "armor",
  );
  // Separate chamfered nose caps produce a thick foreground silhouette.
  deck(
    "port-bow",
    [
      [-51, 32],
      [-32, 29],
      [-29, 38],
      [-51, 46],
      [-64, 32],
    ],
    8,
    23,
    "armor",
  );
  deck(
    "starboard-bow",
    [
      [20, 37],
      [41, 45],
      [54, 38],
      [40, 57],
      [13, 45],
    ],
    8,
    17,
    "armor",
  );
  for (let panel = 0; panel < 4; panel++) {
    const y = -21 + panel * 11;
    line(
      `port-armor-seam-${panel}`,
      [
        [-61, y, 30.1],
        [-38, y + 4, 30.1],
      ],
      0.3,
    );
    line(
      `starboard-armor-seam-${panel}`,
      [
        [34, y, 24.1],
        [52, y + 3, 24.1],
      ],
      0.3,
    );
  }

  // Service bays are cut into hull surfaces, never floating rack-shaped props.
  face(
    "port-service-recess",
    [
      [-68, -17, 11],
      [-68, 17, 11],
      [-68, 17, 21],
      [-68, -17, 21],
    ],
    "dark",
  );
  for (let bay = 0; bay < 5; bay++) {
    const y = -14 + bay * 6;
    face(
      `port-service-${bay}-blade`,
      [
        [-68.1, y, 12],
        [-68.1, y + 4, 12],
        [-68.1, y + 4, 19],
        [-68.1, y, 19],
      ],
      "hull",
    );
    line(
      `port-service-${bay}-light`,
      [
        [-68.2, y + 1, 18],
        [-68.2, y + 3, 18],
      ],
      0.2 + activity * wave(bay, 3) * 0.6,
      accent,
    );
  }
  face(
    "starboard-upper-service-well",
    [
      [35, -22, 24.1],
      [52, -22, 24.1],
      [52, 11, 24.1],
      [35, 11, 24.1],
    ],
    "dark",
  );
  // Three recessed compute blades react in submission order. Each blade seats
  // and lights as its check finishes; the result remains visible when paused.
  // They are part of the service well, not progress tiles laid over the hull.
  for (let bay = 0; bay < 3; bay++) {
    const rawCheck = options.checks?.[bay] ?? 0;
    const checked = Number.isFinite(rawCheck)
      ? Math.max(0, Math.min(1, rawCheck))
      : 0;
    const y = -19 + bay * 9;
    const z = 24.2 + (1 - checked) * 2.5;
    box(`starboard-service-${bay}`, [37, y, z], [12, 6.8, 2], "hull");
    face(
      `starboard-service-${bay}-compute-face`,
      [
        [38, y + 1, z + 2.1],
        [48, y + 1, z + 2.1],
        [48, y + 5.8, z + 2.1],
        [38, y + 5.8, z + 2.1],
      ],
      "light",
      checked * (0.38 + wave(bay + 2) * 0.14),
      accent,
    );
    line(
      `starboard-service-${bay}-status`,
      [
        [38, y + 2, z + 2.2],
        [42, y + 2, z + 2.2],
      ],
      0.24 + activity * wave(bay + 2) * 0.5,
      accent,
    );
  }

  // An offset bridge grows out of the port arm. Sloping glazing belongs to its
  // forward wall; its broad roof and dark side are larger than its fine detail.
  deck(
    "bridge-foundation",
    [
      [-60, -34],
      [-39, -39],
      [-25, -26],
      [-28, -7],
      [-55, -9],
    ],
    30,
    37,
    "hull",
  );
  face(
    "bridge-side",
    [
      [-58, -31, 37],
      [-55, -9, 37],
      [-51, -12, 56],
      [-54, -28, 56],
    ],
    "hull",
  );
  face(
    "bridge-front",
    [
      [-55, -9, 37],
      [-28, -7, 37],
      [-30, -12, 53],
      [-51, -12, 56],
    ],
    "hull",
  );
  face(
    "bridge-roof",
    [
      [-54, -28, 56],
      [-39, -32, 56],
      [-28, -22, 53],
      [-30, -12, 53],
      [-51, -12, 56],
    ],
    "armor",
  );
  face(
    "bridge-glazing",
    [
      [-50, -10.4, 43],
      [-31, -9, 43],
      [-32, -11.6, 50],
      [-49, -11.6, 52],
    ],
    "glass",
  );
  for (let pane = 0; pane < 3; pane++) {
    const x = -46 + pane * 5;
    line(
      `bridge-window-mullion-${pane}`,
      [
        [x, -10, 43.5],
        [x, -11.7, 50.5],
      ],
      0.33,
    );
  }
  box("sensor-plinth", [-49, -27, 56], [11, 10, 5], "hull");
  const spin = options.time * 0.27;
  const sensor = (x: number, y: number, z: number): Point3 => [
    -43 + x * Math.cos(spin) - y * Math.sin(spin),
    -22 + x * Math.sin(spin) + y * Math.cos(spin),
    z,
  ];
  face(
    "sensor-dish",
    Array.from({ length: 20 }, (_, n): Point3 =>
      sensor(
        Math.cos((n * Math.PI) / 10) * 9,
        Math.sin((n * Math.PI) / 10) * 5,
        65,
      ),
    ),
    "armor",
  );
  line(
    "sensor-dish-feed",
    [sensor(-7, 0, 65), sensor(0, 0, 74), sensor(7, 0, 65)],
    0.48,
  );
  line(
    "sensor-dish-signal",
    [sensor(-1, 0, 74), sensor(1, 0, 74)],
    0.2 + activity * wave(2) * 0.65,
    accent,
  );
  line(
    "command-mast",
    [
      [-47, -29, 59],
      [-47, -29, 109],
    ],
    0.53,
  );
  line(
    "command-mast-outrigger",
    [
      [-55, -29, 92],
      [-39, -29, 92],
    ],
    0.4,
  );
  line(
    "command-mast-brace",
    [
      [-53, -28, 61],
      [-47, -29, 84],
      [-41, -28, 61],
    ],
    0.3,
  );
  line(
    "command-beacon",
    [
      [-48, -29, 109],
      [-46, -29, 109],
    ],
    0.35 + wave(1, 2.6) * 0.55,
    "pending",
  );

  // A substantial crane is attached to the shorter starboard arm. Its boom is
  // an opaque truss volume, with a moving hoist above the open docking trench.
  box("gantry-foot", [42, -23, 24], [12, 13, 7], "armor");
  box("gantry-column", [45, -20, 31], [6, 7, 32], "hull");
  box("gantry-boom", [-12, -20, 62], [65, 9, 7], "hull");
  for (let truss = 0; truss < 5; truss++) {
    const x = -7 + truss * 11;
    line(
      `gantry-truss-${truss}`,
      [
        [x, -10.9, 63],
        [x + 5, -10.9, 68],
        [x + 10, -10.9, 63],
      ],
      0.32,
    );
  }
  const trolley = -7 + wave(2, 0.55) * 9;
  box("gantry-trolley", [trolley, -21, 58], [8, 11, 5], "dark");
  const hoist = 18 + wave(3, 0.8) * activity * 11;
  line(
    "gantry-cable-port",
    [
      [trolley + 2, -14, 58],
      [trolley + 2, -14, hoist],
    ],
    0.4,
  );
  line(
    "gantry-cable-starboard",
    [
      [trolley + 6, -14, 58],
      [trolley + 6, -14, hoist],
    ],
    0.4,
  );
  box("gantry-hook", [trolley + 1, -17, hoist - 3], [7, 6, 3], "armor");
  line(
    "gantry-power",
    [
      [49, -20, 33],
      [49, -20, 60],
      [5, -20, 60],
    ],
    0.15 + activity * wave(5) * 0.5,
    accent,
  );

  // Split bay gates retract into the two heavy nose caps. The ramp ends at the
  // exact shared launch contact rather than adding a second disconnected dock.
  const leftEdge = -27,
    rightEdge = 14,
    middle = (leftEdge + rightEdge) / 2;
  const leftInner = middle - open * (middle - leftEdge);
  const rightInner = middle + open * (rightEdge - middle);
  face(
    "bay-gate-port",
    [
      [leftEdge, 44, 2],
      [leftInner, 44, 2],
      [leftInner, 44, 17],
      [leftEdge, 44, 17],
    ],
    "hull",
  );
  face(
    "bay-gate-starboard",
    [
      [rightInner, 44, 2],
      [rightEdge, 44, 2],
      [rightEdge, 44, 17],
      [rightInner, 44, 17],
    ],
    "hull",
  );
  for (let rib = 0; rib < 3; rib++) {
    const z = 5 + rib * 4;
    line(
      `bay-gate-port-rib-${rib}`,
      [
        [leftEdge, 44.1, z],
        [leftInner, 44.1, z],
      ],
      0.33,
    );
    line(
      `bay-gate-starboard-rib-${rib}`,
      [
        [rightInner, 44.1, z],
        [rightEdge, 44.1, z],
      ],
      0.33,
    );
  }
  for (let guide = 0; guide < 4; guide++) {
    const f = (guide + 1) / 5;
    const x = -9 + (-46.364 + 9) * f,
      y = 48 + (92.727 - 48) * f;
    line(
      `launch-guide-${guide}`,
      [
        [x - 2, y - 1, 0.3],
        [x, y + 1, 0.3],
        [x + 2, y - 1, 0.3],
      ],
      (0.13 + wave(guide, 2.3) * 0.65) * open,
      accent,
    );
  }
  line(
    "launch-contact",
    [
      [-50.364, 92.727, 0],
      [-42.364, 92.727, 0],
    ],
    0.3 + open * 0.6,
    accent,
  );
}
