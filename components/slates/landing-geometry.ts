import type {
  ProofFrameFunction,
  ProofPath,
  ProofTone,
} from "../proof-work/proof-geometry";
import { easeLifecycle } from "../proof-work/lifecycle-drawing";
import { landingState, type LandingExample } from "./landing-data";
import { runtimeAlong } from "./runtime-drawing";
import {
  spatialCamera,
  spatialDrawing,
  spatialPulse,
  type Point2,
  type Point3,
  type Project3,
} from "./spatial-drawing";

type Material = NonNullable<ProofPath["material"]>;

/** A stationary bench camera: the stamp moves, the document and NVMe never do.
 * The opened NAND package exposes illustrative cells, not a physical allocation map. */
const landingFrame =
  (example: LandingExample): ProofFrameFunction =>
  (time, selection, portrait) => {
    const d = spatialDrawing();
    const state = landingState(selection, example);
    const phase = (a: number, b: number) =>
      easeLifecycle((state.position - a) / (b - a));
    const grant = phase(0.1, 1),
      check = phase(1.1, 2);
    const controller = example === "clean" ? phase(2.05, 2.45) : 0;
    const programmed = example === "clean" ? phase(2.71, 2.95) : 0;
    const sync = example === "clean" ? phase(2.95, 3) : 0;
    const pulse = spatialPulse(time, 0.31, 0.17);
    const paperWidth = portrait ? 244 : 260,
      paperDepth = portrait ? 255 : 284;
    const paper = spatialCamera(portrait ? [33, 90] : [42, 104], {
      yaw: -0.1,
      pitch: 1.05,
      scale: portrait ? 0.94 : 1,
    });
    const board = spatialCamera(portrait ? [35, 577] : [396, 346], {
      yaw: -0.23,
      pitch: 0.95,
      scale: portrait ? 0.9 : 1,
    });
    const p = (x: number, y: number, z = 7): Point2 => board([x, y, z]);

    function line3(
      id: string,
      points: Point3[],
      project: Project3,
      opacity = 0.5,
      tone?: ProofTone,
    ) {
      d.line(id, points.map(project), { opacity, tone });
    }
    function panel(
      id: string,
      project: Project3,
      x: number,
      y: number,
      z: number,
      w: number,
      depth: number,
      material: Material,
      opacity = 0.9,
      tone?: ProofTone,
    ) {
      d.face(
        id,
        [
          [x, y, z],
          [x + w, y, z],
          [x + w, y + depth, z],
          [x, y + depth, z],
        ].map(([a, b, c]) => project([a, b, c])),
        material,
        opacity,
        tone,
      );
    }
    function cylinder(
      id: string,
      project: Project3,
      at: Point3,
      radius: number,
      height: number,
      material: Material,
      opacity = 0.9,
    ) {
      const points = (z: number) =>
        Array.from({ length: 24 }, (_, i) =>
          project([
            at[0] + radius * Math.cos((i * Math.PI) / 12),
            at[1] + radius * Math.sin((i * Math.PI) / 12),
            at[2] + z,
          ]),
        );
      const base = points(0),
        top = points(height);
      for (let i = 0; i < 24; i++)
        d.face(
          id + "-wall-" + i,
          [base[i], base[(i + 1) % 24], top[(i + 1) % 24], top[i]],
          material,
          opacity * (0.55 + 0.3 * (i / 23)),
        );
      d.face(id + "-top", top, material, opacity);
      d.line(id + "-rim", top, { kind: "edge", opacity: 0.8 }, true);
    }
    function paperSheet(
      id: string,
      project: Project3,
      w: number,
      depth: number,
      fold: number,
    ) {
      const corners: Point3[] = [
        [0, 0, 1],
        [w - fold, 0, 1],
        [w, fold, 1],
        [w, depth, 1],
        [0, depth, 1],
      ];
      d.face(
        id + "-shadow",
        corners.map(([x, y]) => project([x + 5, y + 6, -2])),
        "shadow",
        0.65,
      );
      d.face(id, corners.map(project), "paper", 0.96);
      d.face(
        id + "-edge",
        [
          [0, depth, 1],
          [w, depth, 1],
          [w, depth, -1],
          [0, depth, -1],
        ].map(([x, y, z]) => project([x, y, z])),
        "paper",
        0.72,
      );
      d.face(
        id + "-fold",
        [
          [w - fold, 0, 1],
          [w - fold, fold, 5],
          [w, fold, 1],
        ].map(([x, y, z]) => project([x, y, z])),
        "paper",
        0.92,
      );
    }
    function parcel(
      id: string,
      route: Point2[],
      progress: number,
      opacity: number,
    ) {
      const [x, y] = runtimeAlong(route, progress);
      const local: Project3 = ([a, b, c]) => [
        x + a * 0.94 + b * 0.28,
        y - a * 0.17 + b * 0.65 - c * 0.65,
      ];
      const point = (a: number, b: number, c: number) => local([a, b, c]);
      d.face(
        id + "-front",
        [point(-3, -3, 0), point(3, -3, 0), point(3, -3, 5), point(-3, -3, 5)],
        "emissive",
        opacity * 0.6,
        "pass",
      );
      d.face(
        id + "-side",
        [point(3, -3, 0), point(3, 3, 0), point(3, 3, 5), point(3, -3, 5)],
        "emissive",
        opacity * 0.78,
        "pass",
      );
      d.face(
        id,
        [point(-3, -3, 5), point(3, -3, 5), point(3, 3, 5), point(-3, 3, 5)],
        "emissive",
        opacity,
        "pass",
      );
    }

    d.label("land-heading", "APPROVING A FILE CHANGE", 28, 30, {
      kind: "heading",
    });
    paperSheet("land-manifest", paper, paperWidth, paperDepth, 23);
    d.surfaceLabel("land-plan-label", "CHANGE LIST", paper, [20, 28, 1.2], {
      kind: "name",
      surface: "land-manifest",
    });
    d.surfaceLabel("land-snapshot", "M7 · SNAPSHOT S7", paper, [20, 56, 1.2], {
      surface: "land-manifest",
    });
    d.surfaceLabel("land-entry", "/src/image.rs", paper, [20, 88, 1.2], {
      kind: "label",
      surface: "land-manifest",
    });
    line3(
      "land-manifest-rule",
      [
        [20, 101, 1.3],
        [paperWidth - 20, 101, 1.3],
      ],
      paper,
      0.35,
    );
    d.surfaceLabel(
      "land-replacement",
      "Replace 80 → 90",
      paper,
      [20, 126, 1.2],
      { surface: "land-manifest" },
    );
    for (let row = 0; row < 3; row++)
      line3(
        "land-paper-line-" + row,
        [
          [20, 147 + row * 10, 1.2],
          [row === 2 ? 93 : 126, 147 + row * 10, 1.2],
        ],
        paper,
        0.23,
      );
    d.surfaceLabel(
      "land-manifest-count",
      state.granted ? "1 APPROVED FILE" : "APPROVAL REQUIRED",
      paper,
      [20, paperDepth - 17, 1.2],
      { tone: state.granted ? "pass" : "pending", surface: "land-manifest" },
    );

    // The rubber foot descends, presses the sheet, and lifts away from its ink.
    const stampX = paperWidth - 54,
      stampY = paperDepth - 95;
    const stampZ = 85 * (1 - phase(0.12, 0.55)) + 72 * phase(0.65, 1);
    const stampSlide = 68 * phase(0.65, 1);
    const stamp: Project3 = ([x, y, z]) => paper([x + stampSlide, y, z]);
    const ink = phase(0.82, 1);
    const oval = (radius: number, z: number) =>
      Array.from({ length: 33 }, (_, i) =>
        paper([
          stampX + radius * Math.cos((i * Math.PI) / 16),
          stampY + radius * Math.sin((i * Math.PI) / 16),
          z,
        ]),
      );
    d.face(
      "land-stamp-shadow",
      oval(32, 1.1),
      "shadow",
      0.12 + 0.32 * (1 - stampZ / 90),
    );
    d.line(
      "land-approval-stamp",
      oval(27, 1.3),
      { kind: "edge", opacity: ink * 0.95, tone: "pass" },
      true,
    );
    d.line(
      "land-approval-stamp-inner",
      oval(22, 1.3),
      { opacity: ink * 0.65, tone: "pass" },
      true,
    );
    d.surfaceLabel("land-grant-id", "M7", paper, [stampX, stampY + 5, 1.4], {
      kind: "name",
      anchor: "middle",
      opacity: ink,
      tone: "pass",
      surface: "land-manifest",
    });
    const signY = paperDepth - 61;
    line3(
      "land-human-signature",
      [
        [20, signY, 1.4],
        [29, signY - 12, 1.4],
        [24, signY + 6, 1.4],
        [39, signY - 6, 1.4],
        [49, signY + 1, 1.4],
        [57, signY - 7, 1.4],
        [65, signY, 1.4],
        [99, signY - 4, 1.4],
      ],
      paper,
      grant * 0.9,
      "pass",
    );
    d.surfaceLabel(
      "land-human",
      "Human approval",
      paper,
      [20, paperDepth - 39, 1.4],
      { surface: "land-manifest" },
    );
    d.solid(
      "land-stamp-foot",
      stamp,
      [stampX - 31, stampY - 23, stampZ + 3],
      [62, 46, 9],
      { material: "silicon", opacity: 0.96 },
    );
    d.solid(
      "land-stamp-metal",
      stamp,
      [stampX - 29, stampY - 21, stampZ + 12],
      [58, 42, 5],
      { material: "metal", opacity: 0.95 },
    );
    cylinder(
      "land-stamp-stem",
      stamp,
      [stampX, stampY, stampZ + 17],
      8,
      49,
      "metal",
    );
    cylinder(
      "land-stamp-grip",
      stamp,
      [stampX, stampY, stampZ + 66],
      19,
      11,
      "silicon",
    );
    d.surfaceLabel(
      "land-stamp-mark",
      "M7",
      stamp,
      [stampX, stampY + 5, stampZ + 78],
      { anchor: "middle", kind: "small", surface: "land-stamp-grip-top" },
    );

    const leafOrigins: Point2[] = portrait
      ? [
          [28, 331],
          [157, 331],
          [286, 331],
        ]
      : [
          [407, 94],
          [532, 94],
          [657, 94],
        ];
    const joins: Point2[] = [];
    const compareY = portrait ? 419 : 184;
    const compareX = (leafOrigins[0][0] + leafOrigins[1][0]) / 2 + 43;
    const checkedEvidence = phase(1.82, 2);
    const samples = [phase(1.12, 1.43), phase(1.46, 1.77)];
    const scan = phase(1.3, 1.56);
    for (let i = 0; i < 3; i++) {
      const leaf = spatialCamera(leafOrigins[i], {
        yaw: -0.07,
        pitch: 1.15,
        scale: 1,
      });
      paperSheet("land-comparison-sheet-" + i, leaf, 96, 80, 13);
      panel(
        "land-check-focus-" + i,
        leaf,
        10,
        29,
        1.1,
        76,
        41,
        "emissive",
        i < 2 ? check * 0.18 : 0,
        state.checked
          ? example === "drift" && i === 1
            ? "fail"
            : "pass"
          : "pending",
      );
      d.surfaceLabel(
        "land-input-" + i,
        ["BASE", state.written ? "DISK READ" : "DISK NOW", "PROPOSED"][i],
        leaf,
        [48, 20, 1.2],
        {
          anchor: "middle",
          kind: "small",
          surface: "land-comparison-sheet-" + i,
        },
      );
      d.surfaceLabel(
        "land-byte-" + i,
        [state.baseBytes, state.checkedDisk, state.proposedBytes][i],
        leaf,
        [48, 44, 1.2],
        {
          anchor: "middle",
          kind: "label",
          tone: i === 1 && state.conflict ? "fail" : "neutral",
          surface: "land-comparison-sheet-" + i,
        },
      );
      const bytes = [state.baseBytes, state.checkedDisk, state.proposedBytes][
        i
      ];
      d.surfaceLabel(
        "land-byte-hex-" + i,
        Array.from(bytes, (byte) => byte.charCodeAt(0).toString(16)).join(" "),
        leaf,
        [48, 64, 1.2],
        {
          anchor: "middle",
          kind: "small",
          surface: "land-comparison-sheet-" + i,
        },
      );
      // A read cursor follows the first and then second byte, beneath the ink.
      // The proposal is never read as if it were the witnessed base.
      line3(
        "land-check-cursor-" + i,
        [
          [39 + scan * 10, 50, 1.4],
          [47 + scan * 10, 50, 1.4],
        ],
        leaf,
        i < 2 ? phase(1.1, 1.16) * (1 - checkedEvidence) * 0.9 : 0,
        "pending",
      );
      for (let byte = 0; byte < 2; byte++)
        line3(
          `land-check-byte-${i}-${byte}`,
          [
            [39 + byte * 10, 50, 1.4],
            [47 + byte * 10, 50, 1.4],
          ],
          leaf,
          i < 2 ? checkedEvidence * 0.9 : 0,
          example === "drift" && byte === 0 ? "fail" : "pass",
        );
      line3(
        "land-comparison-rule-" + i,
        [
          [17, 73, 1.2],
          [79, 73, 1.2],
        ],
        leaf,
        0.2,
      );
      const end = leaf([48, 80, 1]);
      joins.push([end[0], compareY]);
      d.line("land-compare-link-" + i, [end, joins[i]], {
        opacity: 0.3 + check * 0.2,
      });
      for (let byte = 0; byte < 2; byte++) {
        const route: Point2[] = [
          end,
          joins[i],
          [compareX + byte * 16 - 8, compareY],
        ];
        const [x, y] = runtimeAlong(route, samples[byte]);
        const opacity = i < 2 ? Math.sin(samples[byte] * Math.PI) * 0.9 : 0;
        d.face(
          `land-check-read-${i}-${byte}`,
          [
            [x, y - 3],
            [x + 3, y],
            [x, y + 3],
            [x - 3, y],
          ],
          "emissive",
          opacity,
          "pending",
        );
      }
    }
    d.line("land-compare-rule", joins.slice(0, 2), { opacity: 0.42 });
    d.line("land-proposal-comparison", joins.slice(1), {
      opacity: 0.25,
      dashArray: "3 5",
    });
    // Both byte results stay on the rail after the read pulses have arrived.
    // The first is a mismatch only for an outside edit; neither result writes.
    for (let byte = 0; byte < 2; byte++) {
      const x = compareX + byte * 16 - 8;
      d.line(
        `land-check-match-${byte}`,
        [
          [x - 4, compareY],
          [x - 1, compareY + 3],
          [x + 5, compareY - 4],
        ],
        {
          kind: "edge",
          opacity:
            checkedEvidence * (example === "drift" && byte === 0 ? 0 : 0.95),
          tone: "pass",
        },
      );
      d.line(
        `land-check-mismatch-${byte}-a`,
        [
          [x - 4, compareY - 4],
          [x + 4, compareY + 4],
        ],
        {
          kind: "edge",
          opacity:
            checkedEvidence * (example === "drift" && byte === 0 ? 0.95 : 0),
          tone: "fail",
        },
      );
      d.line(
        `land-check-mismatch-${byte}-b`,
        [
          [x - 4, compareY + 4],
          [x + 4, compareY - 4],
        ],
        {
          kind: "edge",
          opacity:
            checkedEvidence * (example === "drift" && byte === 0 ? 0.95 : 0),
          tone: "fail",
        },
      );
    }
    d.label(
      "land-validation",
      state.conflict
        ? "80 ≠ 60 ≠ 90 · CONFLICT"
        : state.stage >= 2
          ? "80 = 80 · CHECK MATCHED"
          : check > 0
            ? samples[0] < 1
              ? `BYTE 1 / 2 · 38 ↔ ${example === "drift" ? "36" : "38"}`
              : "BYTE 2 / 2 · 30 ↔ 30"
            : "FILE CHECK PENDING",
      portrait ? 210 : 584,
      portrait ? 448 : 216,
      {
        kind: "label",
        anchor: "middle",
        tone: state.conflict ? "fail" : state.stage >= 2 ? "pass" : "pending",
      },
    );
    d.label(
      "land-disk-label",
      "NVMe TARGET STORAGE",
      portrait ? 210 : 578,
      portrait ? 481 : 245,
      { kind: "name", anchor: "middle" },
    );

    // The board has real thickness: a keyed tongue, plated mounting notch and visible laminate edge.
    const notch: Point3[] = Array.from({ length: 13 }, (_, i) => [
      360 + 10 * Math.cos(-Math.PI / 2 - (i * Math.PI) / 12),
      60 + 10 * Math.sin(-Math.PI / 2 - (i * Math.PI) / 12),
      7,
    ]);
    const perimeter: Point3[] = [
      [18, 0, 7],
      [350, 0, 7],
      [360, 10, 7],
      ...notch,
      [360, 110, 7],
      [350, 120, 7],
      [18, 120, 7],
      [18, 92, 7],
      [0, 92, 7],
      [0, 77, 7],
      [18, 77, 7],
      [18, 69, 7],
      [0, 69, 7],
      [0, 16, 7],
      [18, 16, 7],
    ];
    d.face(
      "land-nvme-shadow",
      perimeter.map(([x, y]) => board([x + 7, y + 9, -10])),
      "shadow",
      0.8,
    );
    for (let i = 0; i < perimeter.length; i++) {
      const a = perimeter[i],
        b = perimeter[(i + 1) % perimeter.length];
      d.face(
        "land-pcb-laminate-" + i,
        [board(a), board(b), board([b[0], b[1], 0]), board([a[0], a[1], 0])],
        "circuit",
        0.75,
      );
    }
    d.face("land-nvme-pcb", perimeter.map(board), "circuit", 0.98);
    d.line(
      "land-nvme-pcb-edge",
      perimeter.map(board),
      { kind: "edge", opacity: 0.84 },
      true,
    );
    const plating: Point2[] = [];
    for (let i = 0; i <= 24; i++)
      plating.push(
        p(
          360 + 16 * Math.cos(-Math.PI / 2 - (i * Math.PI) / 24),
          60 + 16 * Math.sin(-Math.PI / 2 - (i * Math.PI) / 24),
          7.2,
        ),
      );
    for (let i = 24; i >= 0; i--)
      plating.push(
        p(
          360 + 10 * Math.cos(-Math.PI / 2 - (i * Math.PI) / 24),
          60 + 10 * Math.sin(-Math.PI / 2 - (i * Math.PI) / 24),
          7.2,
        ),
      );
    d.face("land-mount-plating", plating, "metal", 0.88);
    for (let i = 0; i < 15; i++) {
      const y = i < 12 ? 20 + i * 4 : 81 + (i - 12) * 3;
      d.solid("land-m-key-contact-" + i, board, [0, y, 7.2], [16, 2.4, 1.2], {
        material: "metal",
        opacity: 0.88,
      });
      line3(
        "land-connector-fanout-" + i,
        [
          [18, y + 1, 7.2],
          [30 + (i % 3) * 3, y + 1, 7.2],
        ],
        board,
        0.45,
      );
    }

    // Copper is beneath the packages. The two routes end at different physical die heights.
    const nandRoutes: Point2[][] = [];
    for (let chip = 0; chip < 2; chip++) {
      const x = 150 + chip * 88,
        targetZ = chip === 0 ? 23 : 54;
      const points: Point3[] =
        chip === 0
          ? [
              [111, 53, 24],
              [132, 53, 9],
              [x + 15, 53, 9],
              [x + 15, 53, targetZ],
            ]
          : [
              [111, 53, 24],
              [134, 53, 9],
              [134, 108, 9],
              [x + 15, 108, 9],
              [x + 15, 53, 9],
              [x + 15, 53, targetZ],
            ];
      nandRoutes.push(points.map(board));
      line3("land-controller-to-nand-" + chip, points, board, 0.5);
    }
    for (let i = 0; i < 5; i++) {
      line3(
        "land-pcb-signal-" + i,
        [
          [29 + i * 2, 22 + i * 6, 7.2],
          [43 + i * 2, 22 + i * 6, 7.2],
          [43 + i * 2, 39 + i * 7, 7.2],
          [59, 39 + i * 7, 7.2],
        ],
        board,
        0.36,
      );
      const center = [33 + i * 5, 105] as const;
      d.line(
        "land-pcb-via-" + i,
        Array.from({ length: 17 }, (_, n) =>
          p(
            center[0] + 2 * Math.cos((n * Math.PI) / 8),
            center[1] + 2 * Math.sin((n * Math.PI) / 8),
            7.3,
          ),
        ),
        { opacity: 0.65 },
        true,
      );
      line3(
        "land-pcb-via-trace-" + i,
        [
          [center[0], center[1], 7.2],
          [center[0], 84 + i * 3, 7.2],
        ],
        board,
        0.35,
      );
    }

    for (let i = 0; i < 7; i++) {
      const x = i < 4 ? 124 : 324,
        y = i < 4 ? 15 + i * 23 : 22 + (i - 4) * 35;
      d.solid("land-passive-body-" + i, board, [x, y, 8], [9, 5, 4], {
        material: "silicon",
        opacity: 0.93,
      });
      d.solid("land-passive-pad-a-" + i, board, [x - 3, y, 7], [3, 5, 2], {
        material: "metal",
        opacity: 0.88,
      });
      d.solid("land-passive-pad-b-" + i, board, [x + 9, y, 7], [3, 5, 2], {
        material: "metal",
        opacity: 0.88,
      });
    }
    for (let i = 0; i < 11; i++)
      line3(
        "land-board-serial-" + i,
        [
          [72 + i * 4, 15, 7.2],
          [72 + i * 4, 24 - (i % 3), 7.2],
        ],
        board,
        0.46,
      );
    d.surfaceLabel("land-board-inscription", "NVMe", board, [75, 113, 7.3], {
      kind: "small",
      surface: "land-nvme-pcb",
    });
    panel(
      "land-board-power-led",
      board,
      330,
      104,
      9,
      5,
      4,
      "emissive",
      0.22 + pulse.opacity * 0.28,
    );

    // QFN controller package, exposed silicon, and its soldered contacts.
    d.solid("land-controller-package", board, [64, 31, 7], [53, 55, 15], {
      material: "silicon",
      opacity: 0.98,
    });
    d.solid("land-controller-die", board, [70, 37, 22], [41, 27, 2], {
      material: "metal",
      opacity: 0.86,
    });
    panel(
      "land-controller-activity",
      board,
      74,
      41,
      24.2,
      33,
      19,
      "emissive",
      example === "clean" ? phase(2.45, 2.5) * 0.65 : 0,
      "pass",
    );
    for (let pin = 0; pin < 6; pin++) {
      const offset = 5 + pin * 7;
      for (const [side, at, size] of [
        ["left", [59, 31 + offset, 8], [5, 2, 2]],
        ["right", [117, 31 + offset, 8], [5, 2, 2]],
        ["top", [64 + offset, 26, 8], [2, 5, 2]],
        ["bottom", [64 + offset, 86, 8], [2, 5, 2]],
      ] as const)
        d.solid("land-qfn-" + side + "-" + pin, board, at, size, {
          material: "metal",
          opacity: 0.9,
        });
    }
    d.surfaceLabel("land-controller-name", "CTRL", board, [91, 79, 22.2], {
      anchor: "middle",
      kind: "small",
      surface: "land-controller-package-top",
    });

    for (let chip = 0; chip < 2; chip++) {
      const x = 150 + chip * 88;
      d.solid(
        "land-nand-package-" + chip,
        board,
        [x, 24, 7],
        [72, 79, chip === 0 ? 12 : 8],
        { material: "silicon", opacity: 0.97 },
      );
      for (let pin = 0; pin < 9; pin++) {
        d.solid(
          "land-nand-left-contact-" + chip + "-" + pin,
          board,
          [x - 4, 27 + pin * 8, 7],
          [4, 2, 2],
          { material: "metal", opacity: 0.85 },
        );
        d.solid(
          "land-nand-right-contact-" + chip + "-" + pin,
          board,
          [x + 72, 27 + pin * 8, 7],
          [4, 2, 2],
          { material: "metal", opacity: 0.85 },
        );
      }
      const dieZ = chip === 0 ? 20 : 50;
      if (chip === 1) {
        // The lifted cap stands behind three separated silicon layers, leaving the programmed plane visible.
        d.solid("land-nand-lifted-cap", board, [x, 20, 45], [72, 4, 54], {
          material: "metal",
          opacity: 0.9,
        });
        d.surfaceLabel(
          "land-nand-name-1",
          "NAND",
          board,
          [x + 36, 19.8, 73],
          {
            anchor: "middle",
            kind: "small",
            surface: "land-nand-lifted-cap-front",
          },
          [
            [1, 0, 0],
            [0, 0, -1.5],
          ],
        );
        for (let layer = 0; layer < 2; layer++)
          d.solid(
            "land-nand-separated-layer-" + layer,
            board,
            [x + 6, 43, 19 + layer * 15],
            [60, 53, 3],
            { material: "silicon", opacity: 0.94 },
          );
        for (const [corner, a, b] of [
          [0, x + 8, 45],
          [1, x + 64, 45],
        ] as const)
          d.line("land-nand-guide-" + corner, [p(a, b, 16), p(a, b, 50)], {
            opacity: 0.28,
            dashArray: "3 4",
          });
      } else {
        d.surfaceLabel(
          "land-nand-name-0",
          "NAND",
          board,
          [x + 36, 36.5, 19.2],
          {
            anchor: "middle",
            kind: "small",
            surface: "land-nand-package-0-top",
          },
        );
      }
      d.solid("land-nand-die-" + chip, board, [x + 6, 43, dieZ], [60, 53, 3], {
        material: "silicon",
        opacity: 0.97,
      });
      for (let row = 0; row < 4; row++)
        for (let column = 0; column < 4; column++) {
          const id = chip + "-" + row + "-" + column;
          const at = [x + 10 + column * 13, 49 + row * 11, dieZ + 3.2] as const;
          panel("land-nand-cell-" + id, board, ...at, 10, 7, "metal", 0.55);
          const order = row * 4 + column;
          const fill =
            example === "clean"
              ? phase(
                  2.71 + chip * 0.12 + order * 0.004,
                  2.77 + chip * 0.12 + order * 0.004,
                )
              : 0;
          panel(
            "land-nand-program-" + id,
            board,
            ...at,
            10,
            7,
            "emissive",
            fill * 0.85,
            "pass",
          );
        }
    }

    const outlet = paper([paperWidth, 174, 1]);
    const inlet = p(0, 53, 9),
      target = p(90, 53, 25);
    const writeRoute: Point2[] = portrait
      ? [
          paper([paperWidth / 2, paperDepth, 1]),
          [153, 312],
          [12, 312],
          [12, inlet[1]],
          inlet,
          target,
        ]
      : [outlet, [367, outlet[1]], [367, inlet[1]], inlet, target];
    d.line("land-write-route", writeRoute, {
      opacity: 0.25 + (example === "clean" ? check * 0.15 : 0),
    });
    parcel(
      "land-entry-write",
      writeRoute,
      controller,
      example === "clean" ? Math.sin(Math.PI * controller) * 0.9 : 0,
    );
    for (let chip = 0; chip < 2; chip++) {
      const travel =
        example === "clean" ? phase(2.45 + chip * 0.12, 2.7 + chip * 0.12) : 0;
      parcel(
        "land-nand-write-" + chip,
        nandRoutes[chip],
        travel,
        example === "clean" ? Math.sin(Math.PI * travel) * 0.9 : 0,
      );
    }
    const stop: Point2 = portrait ? [12, 460] : [367, 299];
    // The physical barrier opens during Land only, after approval and a complete
    // clean comparison. It is already clear before the first write can travel.
    const gateAngle =
      example === "clean" ? (phase(2, 2.045) * -Math.PI) / 2 : 0;
    const hinge: Point2 = [stop[0] - 6, stop[1]];
    const gateEnd: Point2 = [
      hinge[0] + Math.cos(gateAngle) * 12,
      hinge[1] + Math.sin(gateAngle) * 12,
    ];
    const normal: Point2 = [
      -Math.sin(gateAngle) * 1.5,
      Math.cos(gateAngle) * 1.5,
    ];
    for (const side of [-1, 1])
      d.line(
        "land-gate-post-" + side,
        [
          [stop[0] + side * 6, stop[1] - 5],
          [stop[0] + side * 6, stop[1] + 5],
        ],
        { opacity: 0.75, kind: "edge" },
      );
    d.face(
      "land-write-gate",
      [
        [hinge[0] - normal[0], hinge[1] - normal[1]],
        [gateEnd[0] - normal[0], gateEnd[1] - normal[1]],
        [gateEnd[0] + normal[0], gateEnd[1] + normal[1]],
        [hinge[0] + normal[0], hinge[1] + normal[1]],
      ],
      "metal",
      0.94,
      state.conflict ? "fail" : state.canWrite ? "pass" : "pending",
    );
    const refused = example === "drift" ? check : 0;
    d.line(
      "land-refusal-a",
      [
        [stop[0] - 6, stop[1] - 6],
        [stop[0] + 6, stop[1] + 6],
      ],
      { opacity: refused * 0.9, tone: "fail", kind: "edge" },
    );
    d.line(
      "land-refusal-b",
      [
        [stop[0] - 6, stop[1] + 6],
        [stop[0] + 6, stop[1] - 6],
      ],
      { opacity: refused * 0.9, tone: "fail", kind: "edge" },
    );
    d.label(
      "land-storage-note",
      "CONTROLLER → NAND CELLS",
      portrait ? 210 : 586,
      portrait ? 679 : 457,
      { anchor: "middle", kind: "small" },
    );
    d.label(
      "land-writes",
      state.written ? "FILES SYNCED: 1" : "FILES SYNCED: 0",
      28,
      portrait ? 705 : 457,
      { kind: "label", tone: state.written ? "pass" : "neutral" },
    );
    d.label(
      "land-disk-bytes",
      "DISK: " + state.disk,
      portrait ? 392 : 770,
      portrait ? 705 : 482,
      {
        anchor: "end",
        kind: "label",
        tone: state.written ? "pass" : state.conflict ? "fail" : "neutral",
      },
    );
    d.line(
      "land-sync-confirmation",
      [
        [28, portrait ? 716 : 474],
        [portrait ? 392 : 372, portrait ? 716 : 474],
      ],
      { opacity: sync * 0.65, tone: "pass" },
    );
    d.label(
      "land-result",
      state.conflict
        ? "REFUSED · OUTSIDE EDIT KEPT"
        : state.written
          ? "FILE WRITTEN AND SYNCHRONIZED"
          : programmed > 0
            ? "WRITING THE APPROVED FILE"
            : state.canWrite
              ? "CHECK MATCHED · READY TO LAND"
              : "WAITING FOR APPROVAL AND FILE CHECK",
      28,
      portrait ? 731 : 503,
      {
        kind: "small",
        tone: state.conflict ? "fail" : state.written ? "pass" : "pending",
      },
    );
    return { paths: d.paths, labels: d.labels };
  };

export const landingFrames = {
  clean: landingFrame("clean"),
  drift: landingFrame("drift"),
};
