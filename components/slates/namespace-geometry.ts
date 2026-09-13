import type {
  ProofFrameFunction,
  ProofTone,
} from "../proof-work/proof-geometry";
import { easeLifecycle } from "../proof-work/lifecycle-drawing";
import { namespaceSnapshot } from "./namespace-data";
import { runtimeAlong } from "./runtime-drawing";
import {
  spatialDrawing,
  spatialPulse,
  type Point2,
  type Point3,
  type Project3,
} from "./spatial-drawing";

/** Two hinged directory folders, one bound file and an independently connected reader. */
export const namespaceFrame: ProofFrameFunction = (
  time,
  selection,
  portrait,
) => {
  const d = spatialDrawing();
  const s = Math.max(
    0,
    Math.min(4, Number.isFinite(selection) ? selection : 0),
  );
  const phase = (a: number, b: number) => easeLifecycle((s - a) / (b - a));
  const opening = phase(0.08, 1),
    connected = phase(0.48, 0.85),
    loaded = phase(0.82, 1),
    rename = phase(1.12, 2),
    linked = phase(2.12, 3),
    removed = phase(3.12, 4);
  const state = namespaceSnapshot(s);
  const folderProject =
    (origin: Point2): Project3 =>
    ([x, y, z]) => [
      origin[0] + x + 0.43 * y,
      origin[1] + 0.14 * x + 0.6 * y - z,
    ];
  const rp = folderProject(portrait ? [34, 231] : [51, 276]);
  const sp = folderProject(portrait ? [225, 267] : [278, 241]);
  const fw = portrait ? 126 : 145,
    depth = 35;
  const fileOrigin: Point2 = portrait ? [65, 374] : [525, 154];
  const fp: Project3 = ([x, y, z]) => [
    fileOrigin[0] + x + 0.2 * y,
    fileOrigin[1] - 0.12 * x + 0.86 * y - z,
  ];
  const fileW = portrait ? 169 : 184,
    fileH = portrait ? 182 : 204;
  const readerOrigin: Point2 = portrait ? [235, 637] : [326, 435];
  const hp: Project3 = ([x, y, z]) => [
    readerOrigin[0] + x + 0.35 * y,
    readerOrigin[1] - 0.13 * x + 0.55 * y - z,
  ];
  const hw = portrait ? 133 : 151,
    hd = 70;
  const poly = (
    id: string,
    p: Project3,
    points: Point3[],
    material:
      | "paper"
      | "metal"
      | "circuit"
      | "silicon"
      | "shadow"
      | "emissive" = "paper",
    opacity = 0.85,
    tone?: ProofTone,
  ) => d.face(id, points.map(p), material, opacity, tone);
  d.label(
    "namespace-kicker",
    [
      "FILE EXISTS · NO OPEN HANDLE",
      "OPEN /src/image.rs → HANDLE 7",
      "RENAME image.rs → codec.rs",
      "LINK /saved.rs → SAME FILE",
      "UNLINK /src/codec.rs",
    ][Math.min(4, Math.ceil(s))],
    28,
    38,
  );
  // Cables run behind the physical pieces and connect to their actual ports.
  const activeLift = Math.sin(rename * Math.PI) * 10 + removed * 10;
  const activeStart = sp([fw - 17, 13, 87 + activeLift]);
  const savedStart = rp([fw - 17, 13, 87 + 24 * (1 - linked)]);
  const savedEnd = fp([7, 53, 8]),
    activeEnd = fp([7, 92, 8]);
  const savedRoute: Point2[] = portrait
    ? [
        savedStart,
        [195, savedStart[1]],
        [195, 325],
        [savedEnd[0], 325],
        savedEnd,
      ]
    : [
        savedStart,
        [239, savedStart[1]],
        [239, 330],
        [495, 330],
        [495, savedEnd[1]],
        savedEnd,
      ];
  const activeRoute: Point2[] = portrait
    ? [
        activeStart,
        [392, activeStart[1]],
        [392, 344],
        [activeEnd[0], 344],
        activeEnd,
      ]
    : [activeStart, [485, activeStart[1]], [485, activeEnd[1]], activeEnd];
  const out = fp([fileW, fileH - 26, 7]),
    inlet = hp([hw, 23, 24]);
  const cable: Point2[] = portrait
    ? [out, [303, out[1]], [303, 570], [394, 570], [394, inlet[1]], inlet]
    : [out, [775, out[1]], [775, 421], [inlet[0] + 13, 421], inlet];
  d.line("saved-inode-reference", savedRoute, {
    opacity: linked * 0.72,
    tone: "pass",
  });
  d.line("active-inode-reference", activeRoute, {
    opacity: (1 - removed) * 0.72,
  });
  d.line("open-handle-reference", cable, {
    opacity: connected * 0.88,
    kind: "edge",
    tone: "pending",
  });
  d.line("open-handle-live-trace", cable, {
    opacity: connected * 0.82,
    kind: "light",
    tone: "pass",
  });

  function folder(
    id: string,
    p: Project3,
    title: string,
    entry: string,
    visibility: number,
    lift: number,
    tone?: ProofTone,
  ) {
    // Floor, spine and deep side gussets make a real pocket. Its front is hinged.
    poly(
      id + "-shadow",
      p,
      [
        [0, -13, -4],
        [fw + 8, -13, -4],
        [fw + 8, depth + 13, -4],
        [0, depth + 13, -4],
      ],
      "shadow",
      0.62,
    );
    d.solid(id + "-spine", p, [0, depth, 0], [fw, 5, 120], {
      material: "paper",
      opacity: 0.92,
      tone,
    });
    poly(
      id + "-tab",
      p,
      [
        [0, depth, 110],
        [0, depth, 137],
        [58, depth, 137],
        [70, depth, 120],
        [fw, depth, 120],
        [fw, depth, 110],
      ],
      "paper",
      0.97,
      tone,
    );
    for (let i = 0; i < 4; i++) {
      const y = depth - 5 - i * 4,
        z = 95 + i * 3;
      poly(
        id + "-divider-" + i,
        p,
        [
          [7, y, 4],
          [fw - 6, y, 4],
          [fw - 6, y, z],
          [7, y, z],
        ],
        "paper",
        0.55 + i * 0.07,
      );
      d.line(id + "-divider-rim-" + i, [p([7, y, z]), p([fw - 6, y, z])], {
        kind: "edge",
        opacity: 0.3 + i * 0.1,
      });
    }
    const z = 81 + lift;
    poly(
      id + "-entry-paper",
      p,
      [
        [11, 11, z],
        [fw - 13, 11, z],
        [fw - 13, 11, z + 80],
        [11, 11, z + 80],
      ],
      "paper",
      visibility * 0.94,
      tone,
    );
    d.line(id + "-entry-rim", [p([11, 11, z + 80]), p([fw - 13, 11, z + 80])], {
      kind: "edge",
      opacity: visibility,
      tone,
    });
    const prefix = id === "root-folder" ? "saved-entry" : "active-entry";
    const changedName = id === "src-folder" ? rename * (1 - removed) : 0;
    d.surfaceLabel(
      prefix + "-previous-name",
      "image.rs",
      p,
      [18, 11, z + 65],
      { kind: "small", opacity: changedName * 0.65, tone: "fail" },
      [
        [1, 0, 0],
        [0, 0, -1],
      ],
    );
    d.line(
      prefix + "-previous-strike",
      [p([17, 11, z + 69]), p([78, 11, z + 69])],
      { kind: "edge", opacity: changedName * 0.9, tone: "fail" },
    );
    d.line(
      prefix + "-rename-underline",
      [p([17, 11, z + 37]), p([81, 11, z + 37])],
      { kind: "edge", opacity: changedName, tone: "pass" },
    );
    d.surfaceLabel(
      prefix + "-name",
      entry,
      p,
      [18, 11, z + 41],
      {
        kind: "small",
        opacity: visibility,
        tone: changedName > 0 ? "pass" : tone,
      },
      [
        [1, 0, 0],
        [0, 0, -1],
      ],
    );
    d.surfaceLabel(
      prefix + "-inode",
      "→ 41",
      p,
      [18, 11, z + 13],
      { kind: "small", opacity: visibility * 0.8, tone },
      [
        [1, 0, 0],
        [0, 0, -1],
      ],
    );
    const opening = 14 + Math.sin(rename * Math.PI) * 7;
    poly(
      id + "-left-gusset",
      p,
      [
        [0, 0, 0],
        [0, depth, 0],
        [0, depth, 87],
        [0, -opening, 66],
      ],
      "paper",
      0.7,
    );
    poly(
      id + "-right-gusset",
      p,
      [
        [fw, 0, 0],
        [fw, depth, 0],
        [fw, depth, 87],
        [fw, -opening, 66],
      ],
      "paper",
      0.68,
    );
    poly(
      id + "-hinged-front",
      p,
      [
        [0, 0, 0],
        [fw, 0, 0],
        [fw, -opening, 66],
        [0, -opening, 66],
      ],
      "paper",
      0.92,
      tone,
    );
    for (let i = 0; i < 4; i++)
      d.line(
        id + "-pleat-" + i,
        [p([fw, depth - i * 7, 5]), p([fw, depth - i * 9, 80 - i * 4])],
        { opacity: 0.4 },
      );
    d.line(id + "-front-stitch", [p([8, -1, 9]), p([fw - 8, -1, 9])], {
      opacity: 0.58,
    });
    const titlePoint: Point2 = [
      p([9, 0, 0])[0],
      portrait
        ? id === "root-folder"
          ? 63
          : 96
        : id === "root-folder"
          ? 102
          : 70,
    ];
    d.label(id + "-directory", title, titlePoint[0], titlePoint[1], {
      kind: "label",
    });
  }
  folder("root-folder", rp, "/", "saved.rs", linked, 24 * (1 - linked), "pass");
  folder(
    "src-folder",
    sp,
    "/src",
    rename < 0.5 ? "image.rs" : "codec.rs",
    1 - removed,
    activeLift,
  );

  // The file is a tilted, bound stack with a turned corner, not another name card.
  poly(
    "inode-shadow",
    fp,
    [
      [5, 5, -5],
      [fileW + 8, 5, -5],
      [fileW + 8, fileH + 8, -5],
      [5, fileH + 8, -5],
    ],
    "shadow",
    0.74,
  );
  for (let i = 0; i < 4; i++)
    d.solid("inode-leaf-" + i, fp, [0, 0, i * 2], [fileW, fileH, 1.5], {
      material: "paper",
      opacity: 0.77,
    });
  const z = 8;
  poly(
    "inode-document-face",
    fp,
    [
      [0, 0, z],
      [fileW - 25, 0, z],
      [fileW, 25, z],
      [fileW, fileH, z],
      [0, fileH, z],
    ],
    "paper",
    0.96,
  );
  poly(
    "inode-fold",
    fp,
    [
      [fileW - 25, 0, z],
      [fileW - 25, 25, z + 8],
      [fileW, 25, z],
    ],
    "metal",
    0.65,
  );
  d.line("inode-binding-rule", [fp([17, 13, z]), fp([17, fileH - 10, z])], {
    opacity: 0.52,
  });
  for (let i = 0; i < 7; i++) {
    const y = 18 + (i * (fileH - 35)) / 6;
    const pts: Point2[] = Array.from({ length: 17 }, (_, j) =>
      fp([
        7 + 3 * Math.cos((j * Math.PI) / 8),
        y + 3 * Math.sin((j * Math.PI) / 8),
        z + 1,
      ]),
    );
    d.line("inode-binding-ring-" + i, pts, { kind: "edge", opacity: 0.77 });
  }
  d.surfaceLabel("inode-identity", "inode 41", fp, [27, 27, z], {
    kind: "label",
  });
  d.surfaceLabel("inode-bytes-caption", "FILE CONTENT", fp, [27, 56, z], {
    kind: "heading",
  });
  d.surfaceLabel("inode-content-format", "format=webp", fp, [27, 86, z], {
    kind: "label",
  });
  d.surfaceLabel("inode-content-quality", "quality=80", fp, [27, 118, z], {
    kind: "label",
  });
  for (let i = 0; i < 4; i++)
    d.line(
      "inode-content-rule-" + i,
      [
        fp([27, 131 + i * 11, z]),
        fp([fileW - 19 - (i % 2) * 22, 131 + i * 11, z]),
      ],
      { opacity: 0.35 },
    );
  d.label("file-title", "ONE FILE", portrait ? 80 : 545, portrait ? 313 : 99, {
    kind: "heading",
  });
  d.label(
    "file-count",
    "names: " + state.nlink,
    portrait ? 63 : 548,
    portrait ? 555 : 368,
    { tone: "pass" },
  );

  // The reader has a deep enclosure, a recessed glass display and a physical inlet.
  poly(
    "handle-shadow",
    hp,
    [
      [0, 0, -4],
      [hw + 5, 0, -4],
      [hw + 5, hd + 6, -4],
      [0, hd + 6, -4],
    ],
    "shadow",
    0.7,
  );
  d.solid("handle-shell", hp, [0, 0, 0], [hw, hd, 43], {
    material: "metal",
    opacity: 0.95,
  });
  d.solid("handle-display-bezel", hp, [14, 12, 43], [hw - 28, 39, 3], {
    material: "silicon",
    opacity: 0.96,
  });
  poly(
    "handle-screen-glass",
    hp,
    [
      [19, 17, 47],
      [hw - 19, 17, 47],
      [hw - 19, 45, 47],
      [19, 45, 47],
    ],
    "silicon",
    0.98,
  );
  for (let i = 0; i < 4; i++)
    d.line(
      "handle-vent-" + i,
      [hp([hw - 39 + i * 9, hd, 9]), hp([hw - 39 + i * 9, hd, 27])],
      { kind: "edge", opacity: 0.75 },
    );
  d.solid("handle-inlet", hp, [hw, 16, 16], [9, 17, 13], {
    material: "metal",
    opacity: 0.96,
  });
  for (let i = 0; i < 4; i++)
    d.line(
      "handle-inlet-pin-" + i,
      [hp([hw + 9, 19 + i * 3, 18]), hp([hw + 9, 19 + i * 3, 26])],
      { opacity: 0.85 },
    );
  d.surfaceLabel(
    "handle-readout",
    loaded > 0.5 ? "webp" : "—",
    hp,
    [hw / 2, 40, 48],
    {
      anchor: "middle",
      kind: "label",
      tone: "pass",
      opacity: 0.3 + loaded * 0.7,
    },
    [
      [1, 0, 0],
      [0, 1.7, 0],
    ],
  );
  d.surfaceLabel(
    "handle-id",
    connected >= 1 ? "handle 7" : "no handle",
    hp,
    [12, hd, 18],
    { kind: "small" },
    [
      [1, 0, 0],
      [0, 0, -1],
    ],
  );
  d.label(
    "handle-title",
    loaded >= 1 ? "OPEN READER" : "READER CLOSED",
    portrait ? 230 : 325,
    portrait ? 582 : 359,
    { kind: "heading" },
  );
  // A scanning read head and an illuminated indicator supply activity without moving identity.
  const pulse = spatialPulse(time, 0.2);
  d.line(
    "reader-read-scan",
    [
      hp([20 + pulse.progress * (hw - 42), 18, 48]),
      hp([20 + pulse.progress * (hw - 42), 44, 48]),
    ],
    { kind: "edge", opacity: loaded * pulse.opacity * 0.7, tone: "pass" },
  );
  poly(
    "reader-live-indicator",
    hp,
    [
      [hw - 18, 55, 44],
      [hw - 12, 55, 44],
      [hw - 12, 61, 44],
      [hw - 18, 61, 44],
    ],
    "emissive",
    loaded * (0.5 + 0.25 * Math.sin(time * 2)),
  );
  // Opening is a lookup followed by a read. Renaming never repeats this trip.
  const lookup = runtimeAlong(activeRoute, Math.min(1, opening * 2));
  const read = runtimeAlong(cable, Math.max(0, opening * 2 - 1));
  for (const [id, point, visible] of [
    ["open-lookup", lookup, s > 0 && s < 0.6 ? Math.sin(opening * Math.PI) : 0],
    [
      "open-first-read",
      read,
      s >= 0.48 && s < 1 ? Math.sin(opening * Math.PI) : 0,
    ],
  ] as const)
    d.face(
      id,
      [
        [point[0] - 5, point[1] - 5],
        [point[0] + 5, point[1] - 5],
        [point[0] + 5, point[1] + 5],
        [point[0] - 5, point[1] + 5],
      ],
      "emissive",
      visible,
      "pass",
    );
  d.label(
    "operation-result",
    [
      "image.rs names inode 41. The reader is closed.",
      "NEW: handle 7 is connected to inode 41.",
      "CHANGED: filename. UNCHANGED: handle 7.",
      "Two names now lead to the same inode 41.",
      "codec.rs is gone. saved.rs still names the file.",
    ][Math.min(4, Math.floor(s))],
    28,
    portrait ? 692 : 476,
  );
  d.label(
    "handle-count-note",
    loaded >= 1
      ? "The reader still reads format=webp."
      : "Opening will create a separate handle.",
    28,
    portrait ? 718 : 500,
  );
  return d;
};
