import type {
  ProofFrameFunction,
  ProofTone,
} from "../proof-work/proof-geometry";
import { operationMapState } from "./operation-map-data";
import { runtimeAlong, type RuntimePoint } from "./runtime-drawing";
import { spatialDrawing, type Point3, type Project3 } from "./spatial-drawing";

/** The owner opens the current file for an insertion, maps the arriving edit
 * to its original bytes, then replaces only that mapped content. */
export const operationMapFrame: ProofFrameFunction = (
  time,
  selection,
  portrait,
) => {
  const s = spatialDrawing(),
    state = operationMapState(selection);
  const phase = (a: number, b: number) => {
    const n = Math.max(0, Math.min(1, (selection - a) / (b - a)));
    return n * n * (3 - 2 * n);
  };
  const main: Project3 = ([x, y, z]) => [
    (portrait ? 54 : 310) + x * 0.97 + y * 0.22,
    (portrait ? 381 : 156) - x * 0.13 + y * 0.88 - z * 0.8,
  ];
  const record: Project3 = ([x, y, z]) => [
    (portrait ? 45 : 48) + x * 0.97 + y * 0.22,
    (portrait ? 145 : 153) - x * 0.13 + y * 0.88 - z * 0.8,
  ];
  const rowHeight = 44,
    rowStart = 54,
    gap = state.opened * rowHeight;
  // Geist Mono's normal advance; code is a contiguous run, not spaced glyphs.
  const pitch = portrait ? 7.8 : 6.6,
    textX = 38,
    targetX = textX + 8 * pitch;
  const originalTargetX = 14 + 8 * pitch;
  const fileDepth = 174 + gap;
  // The incoming paper temporarily covers the header's printed annotations.
  const headerVisible = 1 - phase(0.45, 0.6) + phase(0.92, 1);
  const removed = phase(2.12, 2.5),
    replacement = phase(2.42, 3);
  const lifted = Math.sin(removed * Math.PI) * 35;
  const line3 = (
    id: string,
    p: Project3,
    vertices: Point3[],
    opacity = 0.5,
    tone?: ProofTone,
  ) => s.line(id, vertices.map(p), { opacity, tone });
  const paper = (
    id: string,
    p: Project3,
    at: Point3,
    size: Point3,
    opacity = 1,
    tone?: ProofTone,
  ) =>
    s.solid(id, p, at, size, {
      material: "paper",
      opacity: opacity * 0.95,
      tone,
    });
  const glyph = (
    id: string,
    text: string,
    p: Project3,
    at: Point3,
    tone: ProofTone = "neutral",
    opacity = 1,
    kind: "small" | "label" | "heading" = "label",
  ) => s.surfaceLabel(id, text, p, at, { kind, tone, opacity });
  const code = (
    id: string,
    text: string,
    p: Project3,
    at: Point3,
    tone: ProofTone = "neutral",
    opacity = 1,
  ) => glyph(id, text, p, at, tone, opacity);
  const bracket = (
    id: string,
    p: Project3,
    x: number,
    y: number,
    z: number,
    opacity: number,
    tone: ProofTone,
  ) => {
    // These rails frame the ink, not the whole content patch. Keeping the
    // dimensions in the text's own plane also aligns the final 90 precisely.
    const fontSize = portrait ? 13 : 11;
    const top = y - fontSize * 0.9 - 2;
    const bottom = y + fontSize * 0.2 + 2;
    for (const [name, at] of [
      ["left", x - 2.8],
      ["right", x + 2 * pitch + 2],
    ] as const)
      s.solid(id + "-" + name, p, [at, top, z], [0.8, bottom - top, 0.5], {
        material: "metal",
        opacity,
        tone,
      });
    line3(
      id + "-back",
      p,
      [
        [x - 2.8, top, z + 0.5],
        [x + 2 * pitch + 2.8, top, z + 0.5],
      ],
      opacity,
      tone,
    );
    line3(
      id + "-front",
      p,
      [
        [x - 2.8, bottom, z + 0.5],
        [x + 2 * pitch + 2.8, bottom, z + 0.5],
      ],
      opacity,
      tone,
    );
  };

  s.label("map-kicker", "MAP AN INCOMING EDIT TO THE CURRENT FILE", 28, 38, {
    kind: "heading",
  });
  const stage =
    selection >= 2.98 ? 3 : selection >= 1.98 ? 2 : selection >= 0.98 ? 1 : 0;
  s.label(
    "action",
    [
      "Agent 2 sends an edit targeting 80.",
      "Owner accepts a 12-byte insertion.",
      "Owner maps Agent 2’s edit to the new head.",
      "Owner writes 90 at the mapped range.",
    ][stage],
    28,
    80,
    { kind: "label", tone: stage === 3 ? "pass" : "pending" },
  );

  // The operation arrives during mapping, after the insertion changed the head.
  const recordPort = record([178, 89, 2]),
    ownerPort = main([220, 38, 11]);
  const delivery: RuntimePoint[] = portrait
    ? [recordPort, [258, 237], [326, 276], [330, 323], [289, 356], ownerPort]
    : [recordPort, [261, 223], [286, 252], [579, 252], ownerPort];
  s.line("incoming-operation-route", delivery, {
    kind: "fine",
    dashArray: "3 6",
    opacity: 0.26,
    tone: "pending",
  });
  const [packetX, packetY] = runtimeAlong(delivery, state.mapped);
  const packetProject: Project3 = ([x, y, z]) => [
    packetX + x * 0.97 + y * 0.22,
    packetY - x * 0.13 + y * 0.88 - z * 0.8,
  ];
  paper(
    "incoming-operation",
    packetProject,
    [-4, -3, 0],
    [8, 6, 3],
    Math.sin(state.mapped * Math.PI) * 0.9,
    "pending",
  );

  // A retained operation record holds the original selection and replacement.
  // This is provenance, not a second editor or a second current file.
  s.label("bob-role", "AGENT 2 · INCOMING EDIT", 28, portrait ? 119 : 121, {
    kind: "heading",
    tone: "pending",
  });
  paper("operation-record-underleaf", record, [-2, 3, -5], [182, 91, 2], 0.75);
  paper("operation-record", record, [0, 0, 0], [178, 89, 4]);
  s.face(
    "operation-fold",
    [
      [158, 0, 4],
      [178, 20, 4],
      [158, 20, 7],
    ].map(([x, y, z]) => record([x, y, z])),
    "paper",
    0.94,
  );
  for (let rule = 0; rule < 3; rule++)
    line3(
      "operation-rule-" + rule,
      record,
      [
        [14, 29 + rule * 24, 4.5],
        [161, 29 + rule * 24, 4.5],
      ],
      0.19,
    );
  glyph(
    "original-filename",
    "image.conf",
    record,
    [14, 19, 5],
    "neutral",
    1,
    "small",
  );
  code("original-code", "quality=80", record, [14, 45, 5], "pending");
  glyph(
    "declared-range",
    "[8, 10)",
    record,
    [14, 72, 5],
    "pending",
    1,
    "small",
  );
  glyph("replacement-arrow", "→", record, [103, 72, 5], "pending");
  bracket(
    "original-selection",
    record,
    originalTargetX,
    45,
    5,
    0.63,
    "pending",
  );
  // The replacement is a sealed content patch waiting with the declaration.
  paper("replacement-slot", record, [130, 51, 4], [29, 29, 2], 0.45);
  const from = record([132, 51, 7]);
  const to = main([targetX - 3, rowStart + rowHeight, 11]);
  const byteFontSize = portrait ? 13 : 11;
  const patchTop = 30 - byteFontSize * 0.9 - 3;
  const patchHeight = byteFontSize * 1.1 + 6;
  const replacementOrigin: Point3 = [0, patchTop, 0];
  const inkOffset: RuntimePoint = [9.51, 22.97];
  const startInk: RuntimePoint = [
    from[0] + inkOffset[0],
    from[1] + inkOffset[1],
  ];
  const endInk: RuntimePoint = [to[0] + inkOffset[0], to[1] + inkOffset[1]];
  // Carry the patch through the empty gutter, then into the vacated byte slot.
  // Its final text baseline is exactly the baseline of the removed 80.
  const replacementRoute: RuntimePoint[] = portrait
    ? [
        startInk,
        [350, 315],
        [350, 488],
        [endInk[0] + (488 - endInk[1]) * 0.25, 488],
        endInk,
      ]
    : [startInk, [265, 228], [endInk[0], 228], endInk];
  const replacementInk = runtimeAlong(replacementRoute, replacement);
  const replacementProject: Project3 = ([x, y, z]) => [
    replacementInk[0] - inkOffset[0] + x * 0.97 + y * 0.22,
    replacementInk[1] - inkOffset[1] - x * 0.13 + y * 0.88 - z * 0.8,
  ];
  paper(
    "replacement-patch",
    replacementProject,
    replacementOrigin,
    [2 * pitch + 6, patchHeight, 3],
    1,
    "pass",
  );
  code("replacement-byte", "90", replacementProject, [3, 30, 3.8], "pass");

  // Several visible content layers form one current file. Only the tail opens
  // to admit the inserted row; the header and earlier bytes do not slide.
  s.label(
    "owner-role",
    "OWNER · CURRENT FILE",
    portrait ? 28 : 315,
    portrait ? 605 : 398,
    {
      kind: "heading",
    },
  );
  for (let layer = 0; layer < 3; layer++) {
    const y = layer * 3,
      z = -12 + layer * 3;
    paper(
      "file-layer-" + layer,
      main,
      [-5, y, z],
      [257, fileDepth + 5, 2],
      0.62 + layer * 0.1,
    );
    line3(
      "file-edge-" + layer,
      main,
      [
        [0, fileDepth + y, z + 2],
        [245, fileDepth + y, z + 2],
      ],
      0.44,
    );
  }
  paper("file-header", main, [0, 0, 0], [247, rowStart, 8]);
  paper("quality-row", main, [0, rowStart + gap, 0], [247, rowHeight, 8]);
  paper("cache-row", main, [0, rowStart + rowHeight + gap, 0], [247, 42, 8]);
  paper("file-footer", main, [0, 140 + gap, 0], [247, 34, 8]);
  // Cut edges, byte ruling and the folded file corner identify the content
  // structure without suggesting an unrelated machine performs the merge.
  s.face(
    "file-fold",
    [
      [225, 0, 8],
      [247, 22, 8],
      [225, 22, 12],
    ].map(([x, y, z]) => main([x, y, z])),
    "paper",
    0.96,
  );
  glyph(
    "current-filename",
    "image.conf",
    main,
    [20, 23, 9],
    "neutral",
    headerVisible,
    "label",
  );
  glyph(
    "current-head",
    state.typed >= 1 ? "head r2" : "head r1",
    main,
    [170, 23, 9],
    "neutral",
    headerVisible,
    "small",
  );
  line3(
    "header-divider",
    main,
    [
      [18, 35, 9],
      [225, 35, 9],
    ],
    0.36,
  );
  glyph(
    "byte-column-title",
    "BYTE",
    main,
    [2, 48, 9],
    "neutral",
    headerVisible,
    "heading",
  );
  glyph(
    "content-column-title",
    "CONTENT",
    main,
    [textX, 48, 9],
    "neutral",
    headerVisible,
    "heading",
  );
  for (const [id, y, offset, text] of [
    ["quality", rowStart + gap, state.typed >= 1 ? "12" : "0", "quality="],
    [
      "cache",
      rowStart + rowHeight + gap,
      state.typed >= 1 ? "23" : "11",
      "cache=off",
    ],
  ] as const) {
    glyph(
      id + "-row-offset",
      offset,
      main,
      [11, y + 26, 9],
      "neutral",
      1,
      "small",
    );
    line3(
      id + "-margin",
      main,
      [
        [29, y + 3, 9],
        [29, y + 38, 9],
      ],
      0.28,
    );
    line3(
      id + "-baseline",
      main,
      [
        [textX, y + 32, 9],
        [221, y + 32, 9],
      ],
      0.17,
    );
    code(id + "-code", text, main, [textX, y + 26, 10]);
    glyph(
      id + "-newline",
      "↵",
      main,
      [textX + (id === "quality" ? 10 : 9) * pitch + 4, y + 26, 10],
      "neutral",
      0.45,
    );
  }
  // An excised patch, not a second mutation, carries the old 80 out.
  const oldPatch: Project3 = ([x, y, z]) =>
    main([targetX - 3 + x, rowStart + gap + y, 11 + z + lifted]);
  paper(
    "removed-patch",
    oldPatch,
    [0, patchTop, 0],
    [2 * pitch + 6, patchHeight, 3],
    1 - removed,
    "pending",
  );
  code(
    "current-old-byte",
    "80",
    oldPatch,
    [3, 30, 3.8],
    "pending",
    1 - removed,
  );
  glyph(
    "file-size",
    state.typed >= 1 ? "33 bytes · 3 lines" : "21 bytes · 2 lines",
    main,
    [19, 160 + gap, 9],
    "neutral",
    1,
    "small",
  );
  glyph(
    "file-encoding",
    "ASCII / LF",
    main,
    [158, 160 + gap, 9],
    "neutral",
    1,
    "small",
  );

  // Agent 1's full row arrives. Its 12 bytes include the newline.
  const arrival = state.typed;
  const sourceCaption = 1 - phase(0.34, 0.62);
  const source: Point3 = portrait ? [128, -113, 38] : [234, -35, 44];
  const insertion: Project3 = ([x, y, z]) =>
    main([
      source[0] * (1 - arrival) + x,
      source[1] * (1 - arrival) + rowStart * arrival + y,
      source[2] * (1 - arrival) +
        11 * arrival +
        z +
        Math.sin(arrival * Math.PI) * 28,
    ]);
  s.label(
    "insert-role",
    "AGENT 1",
    portrait ? 305 : 678,
    portrait ? 163 : 128,
    {
      kind: "heading",
      anchor: "middle",
      tone: "pass",
      opacity: sourceCaption,
    },
  );
  s.label(
    "insert-size",
    "INSERT · 12 BYTES",
    portrait ? 305 : 678,
    portrait ? 189 : 150,
    {
      kind: "heading",
      anchor: "middle",
      tone: "pass",
      opacity: sourceCaption,
    },
  );
  paper("insertion-row", insertion, [0, 0, 0], [247, rowHeight, 3], 1, "pass");
  glyph("insert-offset", "0", insertion, [11, 26, 4], "pass", 1, "small");
  line3(
    "insert-margin",
    insertion,
    [
      [29, 3, 4],
      [29, 38, 4],
    ],
    0.4,
    "pass",
  );
  line3(
    "insert-baseline",
    insertion,
    [
      [textX, 32, 4],
      [221, 32, 4],
    ],
    0.24,
    "pass",
  );
  code("inserted-byte", "format=webp", insertion, [textX, 26, 4], "pass");
  glyph(
    "inserted-newline",
    "↵",
    insertion,
    [textX + 11 * pitch + 4, 26, 4],
    "pass",
    0.65,
  );
  for (let tick = 0; tick <= 12; tick++)
    line3(
      "insert-byte-tick-" + tick,
      insertion,
      [
        [textX + tick * pitch, 3, 4],
        [textX + tick * pitch, 7, 4],
      ],
      0.38,
      "pass",
    );

  // The stale interval initially lands on eb. Mapping physically moves the
  // same two-byte bracket down to the quality row, preserving its identity.
  const mappedY = rowStart + rowHeight * state.mapped;
  const selectionBaseline =
    rowStart + 30 - 4 * state.typed + (rowHeight + 4) * state.mapped;
  const rangeTone: ProofTone =
    state.written > 0.8
      ? "pass"
      : state.typed >= 1 && state.mapped < 0.5
        ? "fail"
        : "pending";
  bracket(
    "mapped-selection",
    main,
    targetX,
    selectionBaseline,
    14.8,
    0.8,
    rangeTone,
  );
  bracket("stale-selection", main, targetX, rowStart + 26, 15, 0, "fail");
  glyph(
    "current-byte-range",
    state.mapped >= 0.98 ? "[20, 22)" : "[8, 10)",
    main,
    [178, mappedY + 27, 13],
    rangeTone,
    1,
    "small",
  );
  glyph(
    "stale-byte-range",
    "old [8,10)",
    main,
    [171, rowStart + 27, 13],
    "fail",
    state.oldRangeVisible * 0.65,
    "small",
  );
  line3(
    "mapping-guide",
    main,
    [
      [targetX + 32, rowStart + 38, 18],
      [targetX + 32, mappedY + 38, 18],
    ],
    Math.sin(state.mapped * Math.PI) * 0.62,
    "pending",
  );

  const noteY = portrait ? 643 : 427;
  s.label(
    "mapping-equation",
    state.mapped >= 0.98
      ? "[8, 10) + 12 = [20, 22)"
      : "Saved target: 80 at [8, 10)",
    28,
    noteY,
    { kind: "label", tone: "pending" },
  );
  s.label(
    "mapping-explanation",
    state.written >= 1
      ? "Owner replaces those two bytes with 90."
      : state.mapped >= 0.98
        ? "The same 80, now 12 bytes further on."
        : "The insertion includes its newline: 12 bytes.",
    28,
    noteY + 27,
    { kind: "small", opacity: state.typed },
  );
  s.label(
    "result",
    replacement >= 1 ? "format=webp · quality=90 · cache=off" : "",
    28,
    portrait ? 704 : 494,
    { kind: "small", tone: "pass", opacity: replacement },
  );
  // Activity is confined to the incoming record's caret, never a drifting view.
  line3(
    "request-caret",
    record,
    [
      [originalTargetX, 25, 8],
      [originalTargetX, 51, 8],
    ],
    (0.65 + Math.sin(time * 4) * 0.12) * (1 - replacement),
    "pending",
  );
  return { paths: s.paths, labels: s.labels };
};
