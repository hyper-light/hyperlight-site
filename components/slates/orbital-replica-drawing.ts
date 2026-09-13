import {
  orbitalVolume,
  type OrbitalHardwareOptions,
  type OrbitalSurface,
} from "./orbital-volume-drawing";
import { spatialDrawing, type Point2, type Point3 } from "./spatial-drawing";

/** Archive vaults and a dish relay are different machines, not scaled copies of
 * the owner station. Their meshes share its camera and stopped animation clock.
 * Both variants stay inside local [-112, 112] × [-90, 75]. */
export function drawOrbitalReplica(
  d: ReturnType<typeof spatialDrawing>,
  id: string,
  center: Point2,
  scale: number,
  options: OrbitalHardwareOptions & { variant?: "home" | "mirror" },
) {
  const { face, line, box, wave } = orbitalVolume(
    d,
    id,
    center,
    scale,
    options,
  );
  const activity = Math.max(0, Math.min(1, options.activity));
  const vaultSegments = 20;
  const angle = (segment: number, count = 24) =>
    (segment * Math.PI * 2) / count;
  const radial = (
    x: number,
    y: number,
    z: number,
    radius: number,
    theta: number,
  ): Point3 => [x + Math.cos(theta) * radius, y, z + Math.sin(theta) * radius];
  const circle = (x: number, y: number, z: number, radius: number) =>
    Array.from({ length: vaultSegments }, (_, i) =>
      radial(x, y, z, radius, angle(i, vaultSegments)),
    );
  const lamp = (
    key: string,
    [x, y, z]: Point3,
    width: number,
    height: number,
    opacity: number,
  ) =>
    face(
      key,
      [
        [x, y, z],
        [x, y, z + height],
        [x + width, y, z + height],
        [x + width, y, z],
      ],
      "light",
      opacity,
      options.tone ?? "pass",
    );

  const vault = (
    key: string,
    x: number,
    back: number,
    front: number,
    z: number,
    radius: number,
    chunk?: "a" | "b" | "c",
  ) => {
    // Only the upper/left barrel faces face the camera. The near end cap is
    // drawn last, hiding the barrel's rear seams rather than showing wireframe.
    for (let i = 0; i < vaultSegments; i++) {
      const a = angle(i, vaultSegments),
        b = angle(i + 1, vaultSegments),
        middle = (a + b) / 2;
      if (-0.374 * Math.cos(middle) + 0.484 * Math.sin(middle) < 0) continue;
      face(
        `${key}-barrel-${i}`,
        [
          radial(x, back, z, radius, a),
          radial(x, front - 4, z, radius, a),
          radial(x, front - 4, z, radius, b),
          radial(x, back, z, radius, b),
        ],
        i % 3 === 0 ? "armor" : "hull",
      );
      line(
        `${key}-skin-seam-${i}`,
        [
          radial(x, back + 4, z, radius + 0.08, a),
          radial(x, front - 8, z, radius + 0.08, a),
        ],
        0.21,
      );
      for (let belt = 0; belt < 2; belt++) {
        const y = back + 9 + (front - back - 22) * belt;
        face(
          `${key}-belt-${belt}-${i}`,
          [
            radial(x, y, z, radius + 0.8, a),
            radial(x, y + 2.3, z, radius + 0.8, a),
            radial(x, y + 2.3, z, radius + 0.8, b),
            radial(x, y, z, radius + 0.8, b),
          ],
          "dark",
        );
      }
    }
    for (let i = 0; i < vaultSegments; i++) {
      const a = angle(i, vaultSegments),
        b = angle(i + 1, vaultSegments);
      face(
        `${key}-end-bevel-${i}`,
        [
          radial(x, front - 4, z, radius, a),
          radial(x, front, z, radius - 3, a),
          radial(x, front, z, radius - 3, b),
          radial(x, front - 4, z, radius, b),
        ],
        "armor",
      );
    }
    face(
      `${key}-sealed-cap`,
      circle(x, front, z, radius - 3).reverse(),
      "dark",
    );
    face(
      `${key}-hatch`,
      circle(x, front + 0.4, z, radius - 6).reverse(),
      "hull",
    );
    line(
      `${key}-hatch-rim`,
      [
        ...circle(x, front + 0.7, z, radius - 6),
        radial(x, front + 0.7, z, radius - 6, 0),
      ],
      0.65,
    );
    for (let lock = 0; lock < 6; lock++) {
      const a = angle(lock, 6);
      const at = radial(x, front + 0.8, z, radius - 4.4, a);
      line(
        `${key}-lock-${lock}`,
        [
          [at[0] - 0.75, at[1], at[2]],
          [at[0] + 0.75, at[1], at[2]],
        ],
        0.66,
      );
    }
    for (let cell = 0; cell < 4; cell++) {
      const at: Point3 = [x - 7 + cell * 4, front + 1, z - 1.2];
      lamp(
        `${key}-health-${cell}`,
        at,
        2,
        2.4,
        chunk && options.chunkState
          ? 0
          : 0.27 + wave(cell + x / 9, 2.3) * (0.15 + activity * 0.6),
      );
    }
    line(
      `${key}-latch`,
      [
        [x - 3, front + 0.8, z - 6],
        [x + 3, front + 0.8, z - 6],
        [x + 3, front + 0.8, z - 4],
      ],
      chunk && options.chunkState ? 0 : 0.45,
    );
    if (chunk) {
      // The scenario opens the archive's existing hatch to expose a physical
      // cartridge socket. This is recessed machinery, not an overlay badge.
      // A and C remain seated while the center vault's B cartridge is missing.
      const shown = options.chunkState ? 1 : 0;
      const missing =
        chunk === "b" &&
        (options.chunkState === "missing" ||
          options.chunkState === "unavailable");
      const received = chunk === "b" && options.chunkState === "received";
      const present = shown * (missing ? 0 : 1);
      const verified =
        chunk !== "b" ||
        options.chunkState === "verified" ||
        options.chunkState === "complete";
      const plane = front + 1.2;
      const moduleDepth = received ? 7 : 2.6;
      const name = `chunk-${chunk}`;
      face(
        name + "-socket",
        [
          [x - 9, plane, z - 8],
          [x + 9, plane, z - 8],
          [x + 9, plane, z + 8],
          [x - 9, plane, z + 8],
        ],
        "dark",
        shown,
      );
      face(
        name + "-socket-left-jamb",
        [
          [x - 9, plane, z - 8],
          [x - 7, plane + 1.2, z - 7],
          [x - 7, plane + 1.2, z + 7],
          [x - 9, plane, z + 8],
        ],
        "hull",
        shown,
      );
      face(
        name + "-socket-right-jamb",
        [
          [x + 7, plane + 1.2, z - 7],
          [x + 9, plane, z - 8],
          [x + 9, plane, z + 8],
          [x + 7, plane + 1.2, z + 7],
        ],
        "hull",
        shown,
      );
      for (const side of [-1, 1]) {
        line(
          name + `-guide-${side}`,
          [
            [x + side * 6, plane + 0.1, z - 6],
            [x + side * 6, plane + 0.1, z + 6],
          ],
          shown * 0.42,
        );
      }
      for (let pin = 0; pin < 3; pin++) {
        line(
          name + `-socket-contact-${pin}`,
          [
            [x - 4 + pin * 4, plane + 0.2, z - 4],
            [x - 4 + pin * 4, plane + 0.2, z - 2],
          ],
          shown * 0.33,
        );
      }
      face(
        name + "-module-side",
        [
          [x - 6, plane + 0.4, z - 6],
          [x - 6, plane + moduleDepth, z - 6],
          [x - 6, plane + moduleDepth, z + 6],
          [x - 6, plane + 0.4, z + 6],
        ],
        "dark",
        present,
      );
      face(
        name + "-module-roof",
        [
          [x - 6, plane + 0.4, z + 6],
          [x + 6, plane + 0.4, z + 6],
          [x + 6, plane + moduleDepth, z + 6],
          [x - 6, plane + moduleDepth, z + 6],
        ],
        "armor",
        present,
      );
      face(
        name + "-module-face",
        [
          [x - 6, plane + moduleDepth, z - 6],
          [x + 6, plane + moduleDepth, z - 6],
          [x + 6, plane + moduleDepth, z + 6],
          [x - 6, plane + moduleDepth, z + 6],
        ],
        "hull",
        present,
      );
      line(
        name + "-module-handle",
        [
          [x - 3, plane + moduleDepth + 0.1, z - 3],
          [x - 3, plane + moduleDepth + 0.1, z + 3],
          [x + 2, plane + moduleDepth + 0.1, z + 3],
        ],
        present * 0.65,
      );
      // A received block is present but unverified: amber, not a green success.
      face(
        name + "-module-status",
        [
          [x + 4, plane + moduleDepth + 0.2, z - 4],
          [x + 5, plane + moduleDepth + 0.2, z - 4],
          [x + 5, plane + moduleDepth + 0.2, z + 4],
          [x + 4, plane + moduleDepth + 0.2, z + 4],
        ],
        "light",
        present * (verified ? 0.72 : 0.38),
        verified ? "pass" : "pending",
      );
    }
  };

  if ((options.variant ?? "home") === "home") {
    // A skeletal service gantry and exposed interconnect carry three separately
    // sealed vaults. Staggered lengths/heights keep all three endcaps readable.
    box("archive-backbone", [-82, -49, 16], [162, 12, 12], "dark");
    box("archive-backbone-cover", [-80, -48, 28], [158, 10, 3], "armor");
    for (let connection = 0; connection < 9; connection++) {
      const x = -73 + connection * 17;
      box(
        `archive-interconnect-${connection}`,
        [x, -47, 31],
        [8, 8, 5],
        "hull",
      );
      lamp(
        `archive-network-${connection}`,
        [x + 2, -38.7, 32],
        4,
        2,
        0.2 + wave(connection * 0.8) * (0.18 + activity * 0.6),
      );
    }
    box("gantry-back-left-foot", [-80, -30, 2], [13, 19, 8], "dark");
    box("gantry-back-right-foot", [65, -30, 2], [13, 19, 8], "dark");
    box("gantry-back-left-column", [-77, -24, 9], [7, 8, 58], "hull");
    box("gantry-back-right-column", [68, -24, 9], [7, 8, 58], "hull");
    line(
      "gantry-left-brace",
      [
        [-73, -20, 18],
        [-62, -20, 57],
        [-40, -20, 67],
      ],
      0.55,
    );
    line(
      "gantry-right-brace",
      [
        [71, -20, 18],
        [60, -20, 57],
        [40, -20, 67],
      ],
      0.42,
    );
    box("archive-deck", [-71, -19, -2], [140, 72, 7], "dark");
    vault("vault-starboard", 48, -34, 41, 23, 18, "c");
    vault("vault-upper", -4, -43, 34, 42, 20, "b");
    vault("vault-port", -54, -27, 51, 22, 18, "a");

    box("gantry-crossbeam", [-76, -24, 67], [150, 10, 7], "armor");
    box("gantry-running-rail", [-73, -18, 74], [144, 2, 2], "dark");
    for (let brace = 0; brace < 12; brace++) {
      const x = -71 + brace * 12;
      line(
        `gantry-crossbeam-rib-${brace}`,
        [
          [x, -13.9, 68],
          [x + 6, -13.9, 72],
        ],
        0.3,
      );
    }
    const carriage = -21 + (wave(0.7, 0.35) - 0.5) * 5;
    box("gantry-service-carriage", [carriage, -28, 75], [22, 20, 5], "hull");
    box("gantry-service-head", [carriage + 7, -10, 64], [10, 13, 11], "dark");
    line(
      "gantry-service-arm",
      [
        [carriage + 12, 3, 64],
        [carriage + 12, 10, 58],
        [carriage + 3, 12, 58],
      ],
      0.66,
    );
    for (let led = 0; led < 4; led++)
      lamp(
        `gantry-carriage-led-${led}`,
        [carriage + 2 + led * 5, -7.8, 76],
        2.5,
        1.6,
        0.28 + wave(led + 0.5) * 0.5,
      );
    box("archive-service-coupler", [-36, 48, -1], [23, 21, 8], "hull");
    box("archive-service-recess", [-32, 69.1, 1], [15, 1.8, 4], "dark");
    for (let pin = 0; pin < 5; pin++)
      lamp(
        `archive-service-pin-${pin}`,
        [-30.5 + pin * 2.8, 71, 2],
        1.2,
        1.8,
        0.24 + wave(pin * 0.7) * activity * 0.58,
      );
    return;
  }

  // The mirror has a receiver dish, not an archive gantry. The storage vault
  // sits below/right of the receiver and its communications mast extends out
  // of the opposite edge to create a distinctly asymmetric relay silhouette.
  box("relay-keel", [-51, -23, -3], [111, 49, 9], "dark");
  box("relay-dish-pedestal", [-46, -24, 6], [27, 25, 22], "hull");
  box("relay-elevation-yoke", [-39, -22, 25], [10, 15, 24], "armor");
  box("relay-feed-backbone", [-9, -15, 8], [53, 12, 16], "hull");
  box("relay-storage-saddle", [12, -15, 4], [41, 50, 8], "dark");
  vault("relay-storage-vault", 32, -12, 44, 25, 20);

  const cx = -28,
    cy = -10,
    cz = 60,
    radius = 44;
  const bowl = (r: number, theta: number): Point3 => [
    cx + Math.cos(theta) * r,
    cy - 23 * (1 - (r / radius) ** 2),
    cz + Math.sin(theta) * r,
  ];
  const dishSegments = 24;
  // A deep rolled lip is visible around the parabolic skin. Its front and back
  // circumferences are separated in world depth rather than offset in screen.
  for (let i = 0; i < dishSegments; i++) {
    const a = angle(i, dishSegments),
      b = angle(i + 1, dishSegments);
    face(
      `relay-dish-outer-rim-${i}`,
      [
        radial(cx, cy - 5, cz, radius + 2.5, a),
        radial(cx, cy + 2, cz, radius + 1.5, a),
        radial(cx, cy + 2, cz, radius + 1.5, b),
        radial(cx, cy - 5, cz, radius + 2.5, b),
      ],
      "hull",
    );
    face(
      `relay-dish-rim-lip-${i}`,
      [
        radial(cx, cy + 2, cz, radius + 1.5, a),
        radial(cx, cy, cz, radius - 1, a),
        radial(cx, cy, cz, radius - 1, b),
        radial(cx, cy + 2, cz, radius + 1.5, b),
      ],
      "armor",
    );
  }
  const rings = [0, 12, 25, 35, 43];
  for (let band = 0; band < rings.length - 1; band++) {
    for (let i = 0; i < dishSegments; i++) {
      const a = angle(i, dishSegments),
        b = angle(i + 1, dishSegments);
      const points: Point3[] =
        band === 0
          ? [bowl(0, a), bowl(rings[band + 1], b), bowl(rings[band + 1], a)]
          : [
              bowl(rings[band], a),
              bowl(rings[band], b),
              bowl(rings[band + 1], b),
              bowl(rings[band + 1], a),
            ];
      const surface: OrbitalSurface = (i + band) % 7 === 0 ? "armor" : "hull";
      face(`relay-dish-reflector-${band}-${i}`, points, surface);
    }
  }
  for (let rib = 0; rib < 8; rib++) {
    const theta = angle(rib, 8);
    line(
      `relay-dish-radial-seam-${rib}`,
      [bowl(12, theta), bowl(25, theta), bowl(35, theta), bowl(43, theta)],
      0.25,
    );
  }
  // Three swept struts hold a receiver ahead of the concave surface. The feed
  // cannot be mistaken for a flat badge painted on the dish.
  const receiver: Point3 = [cx, cy + 26, cz];
  for (let strut = 0; strut < 3; strut++) {
    const a = angle(strut, 3) + 0.4;
    const start = radial(cx, cy + 1, cz, 40, a);
    const knee: Point3 = [
      cx + Math.cos(a) * 23,
      cy + 19,
      cz + Math.sin(a) * 23,
    ];
    line(`relay-receiver-strut-${strut}`, [start, knee, receiver], 0.71);
    line(
      `relay-receiver-strut-inner-${strut}`,
      [
        [start[0] + 1.5, start[1], start[2]],
        [knee[0] + 1.5, knee[1], knee[2]],
      ],
      0.3,
    );
  }
  box("relay-receiver-head", [cx - 5, cy + 20, cz - 5], [10, 10, 10], "dark");
  for (let sensor = 0; sensor < 4; sensor++)
    lamp(
      `relay-receiver-signal-${sensor}`,
      [
        cx - 3 + (sensor % 2) * 4,
        cy + 30.2,
        cz - 3 + Math.floor(sensor / 2) * 4,
      ],
      2,
      2,
      0.25 + wave(sensor * 1.1, 2.7) * (0.2 + activity * 0.55),
    );

  const swing = (wave(1.8, 0.45) - 0.5) * 3;
  line(
    "relay-antenna-lower-boom",
    [
      [17, -2, 30],
      [49, -2, 47],
      [86, -2 + swing, 54],
    ],
    0.72,
  );
  line(
    "relay-antenna-upper-boom",
    [
      [15, -2, 38],
      [49, -2, 54],
      [86, -2 + swing, 60],
    ],
    0.64,
  );
  for (let segment = 0; segment < 5; segment++) {
    const x = 49 + segment * 7;
    line(
      `relay-antenna-boom-brace-${segment}`,
      [
        [x, -2 + (swing * segment) / 5, 48 + segment * 1.3],
        [x + 7, -2 + (swing * (segment + 1)) / 5, 55 + segment * 1.3],
      ],
      0.34,
    );
  }
  for (let panel = 0; panel < 3; panel++) {
    const x = 51 + panel * 16,
      y = -1 + swing;
    box(`relay-array-${panel}-body`, [x, y, 51], [12, 4, 27], "dark");
    face(
      `relay-array-${panel}-ceramic`,
      [
        [x + 1, y + 4.1, 53],
        [x + 1, y + 4.1, 76],
        [x + 11, y + 4.1, 76],
        [x + 11, y + 4.1, 53],
      ],
      "armor",
    );
    for (let element = 0; element < 5; element++) {
      const z = 55 + element * 4;
      line(
        `relay-array-${panel}-element-${element}`,
        [
          [x + 3, y + 4.3, z],
          [x + 9, y + 4.3, z],
        ],
        0.44,
      );
    }
    lamp(
      `relay-array-${panel}-activity`,
      [x + 4, y + 4.5, 52.5],
      4,
      1.2,
      0.22 + wave(panel, 2.4) * (0.2 + activity * 0.6),
    );
  }
  box("relay-lower-coupler", [-9, 29, 0], [24, 24, 9], "hull");
  for (let pin = 0; pin < 5; pin++)
    lamp(
      `relay-coupler-${pin}`,
      [-5 + pin * 3.2, 53.2, 3],
      1.6,
      2,
      0.3 + wave(pin * 0.8) * activity * 0.55,
    );
}
