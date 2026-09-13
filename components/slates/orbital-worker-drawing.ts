import type { ProofTone } from "../proof-work/proof-geometry";
import {
  orbitalVolume,
  type OrbitalHardwareOptions,
  type OrbitalSurface,
} from "./orbital-volume-drawing";
import { spatialDrawing, type Point2, type Point3 } from "./spatial-drawing";

/** Three purpose-built outposts, not miniature copies of the volume owner.
 * The shared camera, shaded hulls and external contact [0,65] fit the existing
 * [-112,112] × [-90,75] local flight envelope. */
export function drawOrbitalWorker(
  d: ReturnType<typeof spatialDrawing>,
  id: string,
  center: Point2,
  scale: number,
  options: OrbitalHardwareOptions & { variant?: 0 | 1 | 2 },
) {
  const time = Number.isFinite(options.time) ? Math.max(0, options.time) : 0;
  const activity = Number.isFinite(options.activity)
    ? Math.max(0, Math.min(1, options.activity))
    : 0;
  const open = Number.isFinite(options.bayOpen)
    ? Math.max(0, Math.min(1, options.bayOpen ?? 0))
    : 0;
  const accent: ProofTone = options.tone ?? "pass";
  const { face, line, box, wave } = orbitalVolume(d, id, center, scale, {
    ...options,
    time,
    activity,
  });
  const variant = options.variant ?? 0;
  const pointAt = ([x, y]: Point2, z: number): Point3 => [x, y, z];

  // Only camera-facing walls are painted. Their outward normals give the near
  // face a different value from its roof instead of outlining transparent boxes.
  const hull = (
    key: string,
    plan: readonly Point2[],
    bottom: number,
    top: number,
    surface: OrbitalSurface = "hull",
  ) => {
    plan.forEach((a, i) => {
      const b = plan[(i + 1) % plan.length];
      if (b[1] < a[1] || b[0] < a[0])
        face(
          `${key}-wall-${i}`,
          [
            pointAt(a, bottom),
            pointAt(b, bottom),
            pointAt(b, top),
            pointAt(a, top),
          ],
          surface,
        );
    });
    face(
      key + "-roof",
      plan.map((point) => pointAt(point, top)),
      surface,
    );
    line(
      key + "-rim",
      [...plan, plan[0]].map((point) => pointAt(point, top)),
      0.57,
    );
  };
  const roundedPlan = (
    x: number,
    y: number,
    w: number,
    l: number,
    cut = 5,
  ): Point2[] => [
    [x + cut, y],
    [x + w - cut, y],
    [x + w, y + cut],
    [x + w, y + l - cut],
    [x + w - cut, y + l],
    [x + cut, y + l],
    [x, y + l - cut],
    [x, y + cut],
  ];
  const plate = (
    key: string,
    x: number,
    y: number,
    z: number,
    w: number,
    l: number,
    surface: OrbitalSurface = "dark",
    opacity = 1,
  ) =>
    face(
      key,
      [
        [x, y, z],
        [x + w, y, z],
        [x + w, y + l, z],
        [x, y + l, z],
      ],
      surface,
      opacity,
      accent,
    );
  const coolingPod = (key: string, x: number, y: number, z: number) => {
    hull(key, roundedPlan(x - 11, y - 20, 22, 36, 5), z, z + 14, "armor");
    plate(key + "-intake", x - 7, y - 16, z + 14.15, 14, 23);
    for (let rib = 0; rib < 5; rib++)
      line(
        key + "-intake-rib-" + rib,
        [
          [x - 6, y - 13 + rib * 4, z + 14.3],
          [x + 6, y - 13 + rib * 4, z + 14.3],
        ],
        0.49,
      );
    const mouth: Point3[] = Array.from({ length: 12 }, (_, i) => {
      const angle = (i * Math.PI) / 6;
      return [
        x + Math.cos(angle) * 7,
        y + 16.05,
        z + 7 + Math.sin(angle) * 5.5,
      ];
    });
    face(key + "-recessed-drive", mouth, "dark");
    for (let blade = 0; blade < 4; blade++) {
      const angle = time * (0.65 + activity) + (blade * Math.PI) / 2;
      line(
        key + "-rotor-" + blade,
        [
          [x, y + 16.15, z + 7],
          [x + Math.cos(angle) * 5.5, y + 16.15, z + 7 + Math.sin(angle) * 4],
        ],
        0.36 + activity * 0.28,
        accent,
      );
    }
  };

  if (variant === 0) {
    // A forked repair dock: two long engine booms surround an open approach.
    for (const side of [-1, 1]) {
      const left: Point2[] = [
        [-84, -46],
        [-53, -46],
        [-42, -29],
        [-40, 39],
        [-50, 51],
        [-76, 47],
        [-87, 30],
      ];
      const plan =
        side < 0 ? left : left.map(([x, y]): Point2 => [-x, y]).reverse();
      hull(`outrigger-${side}`, plan, -4, 15);
      coolingPod(`service-drive-${side}`, side * 63, 4, 15);
      for (let rib = 0; rib < 4; rib++) {
        const x = side * 69,
          y = -37 + rib * 7;
        line(
          `outrigger-${side}-armour-seam-${rib}`,
          [
            [x - side * 10, y, 15.15],
            [x + side * 8, y + 2, 15.15],
          ],
          0.33,
        );
      }
      line(
        `outrigger-${side}-feed`,
        [
          [side * 47, -29, 16],
          [side * 40, -17, 16],
          [side * 26, -17, 22],
        ],
        0.42 + activity * wave(side) * 0.3,
        accent,
      );
      plate(
        `outrigger-${side}-beacon`,
        side * 63 - 3,
        41,
        15.4,
        6,
        4,
        "light",
        0.35 + wave(side, 1.2) * 0.5,
      );
    }
    hull(
      "aft-bridge",
      [
        [-58, -40],
        [51, -40],
        [59, -17],
        [36, -5],
        [-43, -5],
      ],
      8,
      25,
      "armor",
    );
    plate("bridge-machinery-well", -28, -34, 25.15, 53, 21);
    for (let cell = 0; cell < 4; cell++) {
      box(
        `bridge-processor-${cell}`,
        [-23 + cell * 12, -30, 25.3],
        [8, 12, 5],
        "hull",
      );
      plate(
        `bridge-processor-${cell}-status`,
        -21 + cell * 12,
        -25,
        30.5,
        4,
        4,
        "light",
        0.2 + activity * wave(cell * 0.8, 3) * 0.75,
      );
    }
    // A low sensor arch belongs to the bridge rather than becoming another tower.
    box("sensor-foot-left", [-37, -35, 25], [5, 8, 16], "hull");
    box("sensor-foot-right", [29, -35, 25], [5, 8, 16], "hull");
    box("sensor-crossbeam", [-37, -35, 41], [71, 7, 5], "armor");
    plate("sensor-scan-window", -20, -34, 46.2, 35, 4, "glass");
    const scan = (time * 0.2) % 1;
    plate(
      "sensor-traveling-read",
      -20 + scan * 30,
      -34,
      46.4,
      5,
      4,
      "light",
      activity * Math.sin(scan * Math.PI),
    );
  } else if (variant === 1) {
    // A broad wedge-shaped research deck, with an off-axis moving instrument.
    const outline: Point2[] = [
      [-9, -72],
      [5, -72],
      [84, 27],
      [74, 45],
      [-72, 45],
      [-85, 28],
    ];
    hull("research-wedge", outline, -5, 13, "armor");
    face(
      "research-inset",
      [
        [-3, -54, 13.2],
        [64, 28, 13.2],
        [-64, 28, 13.2],
      ],
      "hull",
    );
    for (let sector = 0; sector < 4; sector++) {
      const at = -48 + sector * 28;
      line(
        `research-deck-seam-${sector}`,
        [
          [-2, -46, 13.5],
          [at, 22, 13.5],
          [at + 4, 32, 13.5],
        ],
        0.3,
      );
    }
    // Recessed sample trays make the broad deck readable at a small scale.
    for (let tray = 0; tray < 2; tray++) {
      hull(
        `sample-tray-${tray}`,
        roundedPlan(-56 + tray * 78, 3, 27, 23, 4),
        13,
        18,
        "hull",
      );
      plate(`sample-tray-${tray}-well`, -51 + tray * 78, 7, 18.1, 17, 14);
      for (let sample = 0; sample < 3; sample++)
        plate(
          `sample-tray-${tray}-sample-${sample}`,
          -48 + tray * 78 + sample * 5,
          10,
          18.3,
          3,
          8,
          "light",
          0.22 + activity * wave(tray + sample, 2.4) * 0.64,
        );
    }
    hull("instrument-sled", roundedPlan(-21, -49, 32, 37, 6), 13, 23);
    box("instrument-mast", [-7, -38, 23], [5, 8, 34], "hull");
    // The bowl turns as one rigid assembly around its pedestal.
    const yaw = Math.sin(time * 0.43) * 0.22;
    const dishPoint = (radius: number, angle: number, inset = 0): Point3 => {
      const u = Math.cos(angle) * radius,
        v = Math.sin(angle) * radius;
      return [
        -4 + u * Math.cos(yaw) - v * Math.sin(yaw) * 0.48,
        -34 + u * Math.sin(yaw) + v * Math.cos(yaw) * 0.48,
        58 + v * 0.66 - inset,
      ];
    };
    const rim = Array.from({ length: 16 }, (_, i) =>
      dishPoint(16, (i * Math.PI) / 8),
    );
    face("research-dish-shell", rim, "armor");
    face(
      "research-dish-recess",
      Array.from({ length: 16 }, (_, i) =>
        dishPoint(12.8, (i * Math.PI) / 8, 1.8),
      ),
      "dark",
    );
    for (let spoke = 0; spoke < 4; spoke++)
      line(
        `research-dish-support-${spoke}`,
        [dishPoint(13, (spoke * Math.PI) / 2, 1.5), [-4, -34, 61]],
        0.5,
      );
    line(
      "research-dish-emitter",
      [
        [-4, -34, 57],
        [-4, -34, 67],
      ],
      0.64,
      accent,
    );
    face(
      "research-dish-signal",
      [
        [-6, -35, 65],
        [-2, -35, 65],
        [-2, -33, 65],
        [-6, -33, 65],
      ],
      "light",
      0.25 + activity * wave(0, 2.5) * 0.7,
      accent,
    );
    // Small directional engines sit under the wide corners, not on a ring.
    coolingPod("research-port-drive", -63, 24, 10);
    coolingPod("research-starboard-drive", 62, 22, 10);
  } else {
    // A low pressure drum with broad radiator wings: a solid cap, not an annulus.
    for (const side of [-1, 1]) {
      const x = side < 0 ? -99 : 42;
      hull(
        `thermal-wing-${side}`,
        roundedPlan(x, -39, 56, 46, 4),
        3,
        9,
        "armor",
      );
      plate(`thermal-wing-${side}-recess`, x + 5, -34, 9.2, 46, 36);
      for (let column = 0; column < 4; column++)
        for (let row = 0; row < 3; row++) {
          const atX = x + 7 + column * 11,
            atY = -31 + row * 10;
          plate(
            `thermal-wing-${side}-cell-${column}-${row}`,
            atX,
            atY,
            9.35,
            9,
            8,
            "glass",
          );
          line(
            `thermal-wing-${side}-cell-feed-${column}-${row}`,
            [
              [atX + 1, atY + 6, 9.5],
              [atX + 7, atY + 6, 9.5],
            ],
            0.18 + activity * wave(column + row, 1) * 0.13,
            accent,
          );
        }
      box(
        `thermal-wing-${side}-hinge`,
        [side < 0 ? -43 : 31, -24, 5],
        [12, 18, 13],
        "hull",
      );
      line(
        `thermal-wing-${side}-conduit`,
        [
          [side * 29, -10, 18],
          [side * 39, -10, 18],
          [side * 48, -10, 10],
        ],
        0.65,
        accent,
      );
    }
    const drum: Point2[] = Array.from({ length: 12 }, (_, i) => {
      const angle = (i * Math.PI) / 6;
      return [-5 + Math.cos(angle) * 37, -16 + Math.sin(angle) * 33];
    });
    hull("reactor-drum", drum, -5, 31);
    const cap: Point2[] = Array.from({ length: 12 }, (_, i) => {
      const angle = (i * Math.PI) / 6;
      return [-5 + Math.cos(angle) * 29, -16 + Math.sin(angle) * 25];
    });
    hull("reactor-raised-cap", cap, 31, 35, "armor");
    for (let vane = 0; vane < 6; vane++) {
      const angle = (vane * Math.PI) / 3;
      const x = -5 + Math.cos(angle) * 20,
        y = -16 + Math.sin(angle) * 17;
      face(
        `reactor-cap-vent-${vane}`,
        [
          [x - 4, y - 3, 35.1],
          [x + 4, y - 3, 35.1],
          [x + 4, y + 3, 35.1],
          [x - 4, y + 3, 35.1],
        ],
        "dark",
      );
      plate(
        `reactor-cap-pulse-${vane}`,
        x - 2,
        y - 1.3,
        35.3,
        4,
        2.6,
        "light",
        0.2 + activity * wave((vane * Math.PI) / 3, 2.8) * 0.76,
      );
    }
    hull("reactor-crown", roundedPlan(-13, -23, 16, 14, 4), 35, 41, "hull");
    plate("reactor-crown-window", -9, -20, 41.2, 8, 8, "glass");
    // The crown's scanning arm turns on its seated bearing. Raised sidewalls
    // make it a piece of machinery, not a rotating mark painted on the lid.
    box("reactor-scan-bearing", [-7, -18, 41.3], [4, 4, 3], "armor");
    const scanAngle = time * (0.28 + activity * 0.32);
    const scanPoint = (x: number, y: number, z: number): Point3 => [
      -5 + x * Math.cos(scanAngle) - y * Math.sin(scanAngle),
      -16 + x * Math.sin(scanAngle) + y * Math.cos(scanAngle),
      z,
    ];
    const scanPlan: Point2[] = [
      [-10, -1.5],
      [10, -1.5],
      [10, 1.5],
      [-10, 1.5],
    ];
    scanPlan.forEach(([x, y], index) => {
      const [u, v] = scanPlan[(index + 1) % scanPlan.length];
      const a = scanPoint(x, y, 44),
        b = scanPoint(u, v, 44);
      const facing = -0.374 * (b[1] - a[1]) - 0.748 * (b[0] - a[0]);
      face(
        `reactor-scan-arm-side-${index}`,
        [a, b, scanPoint(u, v, 46.5), scanPoint(x, y, 46.5)],
        "hull",
        facing > 0 ? 1 : 0,
      );
    });
    face(
      "reactor-scan-arm-top",
      scanPlan.map(([x, y]) => scanPoint(x, y, 46.5)),
      "armor",
    );
    face(
      "reactor-scan-arm-sensor",
      [
        [7, -1, 46.65],
        [9.5, -1, 46.65],
        [9.5, 1, 46.65],
        [7, 1, 46.65],
      ].map(([x, y, z]) => scanPoint(x, y, z)),
      "light",
      0.32 + activity * 0.48,
      accent,
    );
    for (let rib = 0; rib < 4; rib++) {
      const x = -24 + rib * 12;
      line(
        `reactor-front-cooling-${rib}`,
        [
          [x, 13, -1],
          [x, 13, 22],
          [x + 4, 11, 28],
        ],
        0.5,
      );
    }
    // Twin whip aerials and a lateral service cartridge break the round profile.
    box("reactor-service-socket", [-40, 5, 7], [14, 18, 11], "armor");
    for (const side of [-1, 1]) {
      const x = side * 24 - 5;
      line(
        `reactor-aerial-${side}`,
        [
          [x, -30, 28],
          [x, -30, 57],
          [x + side * 6, -30, 62],
        ],
        0.56,
      );
      line(
        `reactor-aerial-tip-${side}`,
        [
          [x + side * 3, -30, 59],
          [x + side * 8, -30, 64],
        ],
        0.24 + wave(side, 1.2) * 0.5,
        accent,
      );
    }
  }

  // A recessed berth is a void cut between raised rails. A tapered extension
  // follows the projected approach and ends at the established [0,65] contact.
  const bay: Point2[] = [
    [-41, 43],
    [-2, 43],
    [-26, 92.727],
    [-66.727, 92.727],
  ];
  hull("berth-lower-keel", bay, -5, 0, "hull");
  face(
    "berth-floor",
    [
      [-37, 49, 0.2],
      [-9, 49, 0.2],
      [-31.5, 87, 0.2],
      [-60, 87, 0.2],
    ],
    "dark",
  );
  face(
    "berth-rear-shadow",
    [
      [-44, 45, 0],
      [-2, 45, 0],
      [-2, 45, 26],
      [-44, 45, 26],
    ],
    "dark",
  );
  for (const side of [-1, 1]) {
    const offset = side < 0 ? -20 : 15;
    const plan: Point2[] = [
      [-21.5 + offset, 43],
      [-15.5 + offset, 43],
      [-40.36 + offset, 92.727],
      [-46.36 + offset, 92.727],
    ];
    hull(`berth-rail-${side}`, plan, 0, 11, "armor");
    for (let lamp = 0; lamp < 4; lamp++) {
      const y = 54 + lamp * 9,
        x = -y / 2 + (side < 0 ? -16 : 17);
      plate(
        `berth-${side}-guidance-${lamp}`,
        x - 1.6,
        y,
        11.15,
        3.2,
        4,
        "light",
        0.24 + (open * 0.48 + activity * 0.22) * wave(lamp * 0.9 + side, 2.1),
      );
    }
    const x = -23 + side * (10 + open * 15);
    face(
      `berth-shutter-${side}`,
      [
        [x - 9, 45.2, 3],
        [x + 9, 45.2, 3],
        [x + 9, 45.2, 23],
        [x - 9, 45.2, 23],
      ],
      "hull",
    );
    for (let slat = 0; slat < 4; slat++)
      line(
        `berth-shutter-${side}-seam-${slat}`,
        [
          [x - 8, 45.3, 6 + slat * 4],
          [x + 8, 45.3, 6 + slat * 4],
        ],
        0.32,
      );
  }
  box("berth-lintel", [-48, 41, 26], [51, 8, 6], "armor");
  for (let notch = 0; notch < 3; notch++)
    plate(
      `berth-traffic-${notch}`,
      -31 + notch * 10,
      43,
      32.15,
      5,
      3,
      "light",
      0.2 + open * 0.6,
    );
  line(
    "berth-contact-rim",
    [
      [-57.4, 92.727, 0.1],
      [-35.3, 92.727, 0.1],
    ],
    0.54,
    accent,
  );
}
