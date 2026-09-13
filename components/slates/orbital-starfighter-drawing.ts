import type { ProofTone } from "../proof-work/proof-geometry";
import { spatialDrawing, type Point2, type Point3 } from "./spatial-drawing";
import { orbitalSurfaceLighting } from "./orbital-volume-drawing";

/** An unmanned VFS carrier: split forward wings, twin ion drives and a sealed
 * content spine. All detail follows the same rigid projection and flight pose. */
export function drawOrbitalStarfighter(
  d: ReturnType<typeof spatialDrawing>,
  id: string,
  center: Point2,
  scale: number,
  heading: number,
  options: {
    time: number;
    opacity: number;
    thrust: number;
    activity: number;
    tone: ProofTone;
    assembly?: number;
  },
) {
  const { opacity, thrust, activity, tone } = options;
  const time = Number.isFinite(options.time) ? Math.max(0, options.time) : 0;
  const assembly = 1 - (options.assembly ?? 1);
  // The flight heading is a screen-space tangent. Resolve it onto the tilted
  // flight plane before projecting the hull; height must not collapse onto a
  // docked craft's nose-to-tail axis as it would in a flat plan view.
  const worldHeading = Math.atan2(
    Math.sin(heading) / 0.66,
    Math.cos(heading) - (0.32 * Math.sin(heading)) / 0.66,
  );
  const c = Math.cos(worldHeading),
    s = Math.sin(worldHeading);
  const world = ([x, y, z]: Point3): Point3 => [
    x * c - y * s,
    x * s + y * c,
    z,
  ];
  const p = (point: Point3): Point2 => {
    const [x, y, z] = world(point);
    return [
      center[0] + scale * (x + y * 0.32 + z * 0.34),
      center[1] + scale * (y * 0.66 - z * 0.86),
    ];
  };
  const line = (key: string, pts: Point3[], power = 0.5) =>
    d.line(id + "-" + key, pts.map(p), {
      opacity: power * opacity,
      tone: /exhaust|led|power/.test(key) ? tone : "neutral",
      kind: /leading-edge|spine|cover-rim/.test(key) ? "edge" : "fine",
    });
  const face = (
    key: string,
    pts: Point3[],
    material: "metal" | "silicon" | "circuit" | "emissive" = "metal",
    power = 1,
  ) =>
    d.line(
      id + "-" + key,
      pts.map(p),
      {
        material,
        ...orbitalSurfaceLighting(
          pts.map(world),
          material === "emissive"
            ? "light"
            : material === "silicon"
              ? "dark"
              : material === "circuit"
                ? "hull"
                : "armor",
          tone,
        ),
        opacity: opacity * power,
        kind: material === "silicon" ? "shade" : "glass",
        tone: material === "emissive" ? tone : "neutral",
      },
      true,
    );
  const ring = (
    key: string,
    x: number,
    y: number,
    z: number,
    radius: number,
    power = 0.6,
  ) =>
    line(
      key,
      Array.from({ length: 25 }, (_, i): Point3 => [
        x + Math.cos((i * Math.PI) / 12) * radius,
        y + Math.sin((i * Math.PI) / 12) * radius,
        z,
      ]),
      power,
    );

  // Engine light is behind the opaque nozzles, never a disconnected decoration.
  for (const side of [-1, 1]) {
    const y = side * (15 + assembly * 8);
    const flame =
      (12 + thrust * 27) * (0.93 + 0.07 * Math.sin(time * 13 + side));
    face(
      `drive-${side}-exhaust-halo`,
      [
        [-25, y - 3, 3],
        [-25 - flame, y, 3],
        [-25, y + 3, 3],
      ],
      "emissive",
      0.13 + thrust * 0.43,
    );
    face(
      `drive-${side}-exhaust-core`,
      [
        [-26, y - 1, 4],
        [-26 - flame * 0.76, y, 4],
        [-26, y + 1, 4],
      ],
      "emissive",
      0.35 + thrust * 0.6,
    );
    for (let i = 0; i < 3; i++) {
      const at = -29 - i * 6 - thrust * 3;
      line(
        `drive-${side}-exhaust-ring-${i}`,
        [
          [at, y - 1.6, 3],
          [at - 1, y, 3.5],
          [at, y + 1.6, 3],
        ],
        thrust * (0.45 - i * 0.1),
      );
    }
  }

  face("hull-keel", [
    [39, 0, 2],
    [9, -7, 0],
    [-24, -7, 0],
    [-29, 0, -2],
    [-24, 7, 0],
    [9, 7, 0],
  ]);
  for (const side of [-1, 1]) {
    const wingY = (y: number) => side * (y + assembly * 13);
    const top: Point3[] = [
      [22, wingY(6), 4],
      [32, wingY(25), 1],
      [15, wingY(28), 1],
      [-25, wingY(31), 0],
      [-17, wingY(9), 4],
    ];
    face(
      `wing-${side}-thickness`,
      [
        ...top.slice(0, 4),
        ...top
          .slice(0, 4)
          .reverse()
          .map(([x, y, z]): Point3 => [x, y, z - 2.8]),
      ],
      "silicon",
    );
    face(`wing-${side}-armour`, top);
    face(
      `wing-${side}-inset`,
      [
        [16, wingY(11), 4.1],
        [23, wingY(22), 1.4],
        [10, wingY(24), 1.4],
        [-17, wingY(27), 1.1],
        [-12, wingY(12), 4.1],
      ],
      "circuit",
      0.85,
    );
    line(
      `wing-${side}-leading-edge`,
      [
        [22, wingY(6), 4.6],
        [32, wingY(25), 1.5],
        [15, wingY(28), 1.5],
      ],
      0.88,
    );
    line(
      `wing-${side}-spar`,
      [
        [20, wingY(8), 4.4],
        [-20, wingY(29), 1.4],
      ],
      0.55,
    );
    for (let i = 0; i < 6; i++) {
      const x = -14 + i * 4.3;
      line(
        `wing-${side}-radiator-${i}`,
        [
          [x, wingY(19), 2.1],
          [x - 3, wingY(25), 1.7],
        ],
        0.53,
      );
      line(
        `wing-${side}-panel-${i}`,
        [
          [x, wingY(11), 4.1],
          [x + 2, wingY(15), 3.3],
        ],
        0.29,
      );
    }
    face(
      `wing-${side}-navigation`,
      [
        [24, wingY(25), 2],
        [28, wingY(25), 2],
        [26, wingY(27), 2],
      ],
      "emissive",
      0.52 + 0.3 * Math.sin(time * 2.2 + side) ** 2,
    );
    // Twin drives have seated collars, heat fins and recessed intake throats.
    const y = side * (15 + assembly * 8);
    face(`drive-${side}-flank`, [
      [-26, y - 4, 1],
      [6, y - 4, 1],
      [8, y - 4, 6],
      [-25, y - 4, 7],
    ]);
    face(`drive-${side}-roof`, [
      [-25, y - 4, 7],
      [8, y - 4, 6],
      [8, y + 4, 6],
      [-25, y + 4, 7],
    ]);
    face(
      `drive-${side}-near`,
      [
        [-25, y + 4, 7],
        [8, y + 4, 6],
        [6, y + 4, 1],
        [-26, y + 4, 1],
      ],
      "silicon",
    );
    face(
      `drive-${side}-intake`,
      [
        [8.1, y - 3, 2],
        [8.1, y + 3, 2],
        [8.1, y + 3, 5],
        [8.1, y - 3, 5],
      ],
      "silicon",
    );
    for (let i = 0; i < 7; i++)
      line(
        `drive-${side}-cooling-${i}`,
        [
          [-21 + i * 2.2, y - 3.4, 7.1],
          [-21 + i * 2.2, y + 3.4, 7.1],
        ],
        0.67,
      );
    for (let i = 0; i < 3; i++)
      line(
        `drive-${side}-collar-${i}`,
        [
          [-26 + i, y - 4.1, 2],
          [-26 + i, y - 4.1, 7],
          [-26 + i, y + 4.1, 7],
          [-26 + i, y + 4.1, 2],
        ],
        0.66,
      );
    face(
      `drive-${side}-nozzle`,
      [
        [-26.1, y - 2.7, 2],
        [-26.1, y + 2.7, 2],
        [-26.1, y + 2.7, 5.5],
        [-26.1, y - 2.7, 5.5],
      ],
      "emissive",
      0.48 + 0.48 * thrust,
    );
  }

  face("hull-deck", [
    [39, 0, 2],
    [12, -7, 5],
    [-24, -7, 5],
    [-29, 0, 3],
    [-24, 7, 5],
    [12, 7, 5],
  ]);
  face(
    "nose-facet",
    [
      [39, 0, 2],
      [12, 7, 5],
      [7, 0, 8],
    ],
    "metal",
  );
  face(
    "nose-inset",
    [
      [29, 0, 3.5],
      [10, -4, 6],
      [10, 4, 6],
    ],
    "silicon",
  );
  line(
    "nose-spine",
    [
      [39, 0, 2.2],
      [11, 0, 7.9],
    ],
    0.92,
  );
  face(
    "autonomy-core",
    [
      [10, 0, 8 + assembly * 8],
      [1, -5, 10 + assembly * 8],
      [-11, -5, 10 + assembly * 8],
      [-15, 0, 8 + assembly * 8],
      [-11, 5, 10 + assembly * 8],
      [1, 5, 10 + assembly * 8],
    ],
    "silicon",
  );
  line(
    "core-cover-rim",
    [
      [10, 0, 8.4 + assembly * 8],
      [1, -5, 10.4 + assembly * 8],
      [-11, -5, 10.4 + assembly * 8],
      [-15, 0, 8.4 + assembly * 8],
    ],
    0.88,
  );
  face(
    "core-power",
    [
      [-9, -2, 10.7 + assembly * 8],
      [-1, -2, 10.7 + assembly * 8],
      [-1, 2, 10.7 + assembly * 8],
      [-9, 2, 10.7 + assembly * 8],
    ],
    "emissive",
    0.26 + activity * (0.45 + 0.2 * Math.sin(time * 3) ** 2),
  );
  for (let i = 0; i < 4; i++) {
    const x = -22 + i * 3;
    face(
      `content-module-${i}`,
      [
        [x, -5, 6],
        [x + 2, -5, 6],
        [x + 2, 5, 6],
        [x, 5, 6],
      ],
      "circuit",
    );
    line(
      `content-module-${i}-led`,
      [
        [x + 0.5, -3, 6.3],
        [x + 0.5, 3, 6.3],
      ],
      0.25 + activity * (0.35 + 0.3 * Math.sin(time * 4 - i) ** 2),
    );
  }
  for (const side of [-1, 1]) {
    line(
      `sensor-${side}`,
      [
        [17, side * 4, 5],
        [24, side * 5, 6],
        [27, side * 7, 6],
      ],
      0.65,
    );
    ring(
      `core-fastener-${side}`,
      -10,
      side * 5,
      10.5 + assembly * 8,
      0.7,
      0.72,
    );
    face(
      `stabilizer-${side}`,
      [
        [-21, side * 6, 5],
        [-24, side * 7, 14],
        [-15, side * 7, 11],
        [-11, side * 6, 5],
      ],
      "metal",
    );
    line(
      `stabilizer-${side}-stripe`,
      [
        [-22, side * 7, 12],
        [-16, side * 7, 9],
      ],
      0.8,
    );
    line(
      `docking-clamp-${side}`,
      [
        [-4, side * 6, 2],
        [-7, side * 10, -1],
        [-12, side * 10, -1],
      ],
      0.6,
    );
  }
}
