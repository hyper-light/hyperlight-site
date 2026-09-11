import type { ProofFrame, ProofPath } from "./proof-geometry";
import { blend, processScene } from "./process-geometry";

const clamp = (value: number) => Math.max(0, Math.min(1, value));
const progress = (value: number, start: number, end: number) =>
  clamp((value - start) / (end - start));
type Scene = ReturnType<typeof processScene>;

/** A substantial request envelope follows the route as selection advances. */
function probe(paths: ProofPath[], id: string, phase: number) {
  const route = paths.find((path) => path.id === id + "-path")!;
  const p = Array.from(route.d.matchAll(/-?\d+(?:\.\d+)?/g), ([n]) =>
    Number(n),
  );
  const t = clamp(phase),
    u = 1 - t;
  const active = t > 0 && t < 1 ? Math.sin(t * Math.PI) : 0;
  paths.find((path) => path.id === id + "-flow")!.opacity = active * 0.9;
  const x =
    u ** 3 * p[0] + 3 * u * u * t * p[2] + 3 * u * t * t * p[4] + t ** 3 * p[6];
  const y =
    u ** 3 * p[1] + 3 * u * u * t * p[3] + 3 * u * t * t * p[5] + t ** 3 * p[7];
  const dx =
    3 * u * u * (p[2] - p[0]) +
    6 * u * t * (p[4] - p[2]) +
    3 * t * t * (p[6] - p[4]);
  const dy =
    3 * u * u * (p[3] - p[1]) +
    6 * u * t * (p[5] - p[3]) +
    3 * t * t * (p[7] - p[5]);
  const length = Math.hypot(dx, dy) || 1;
  const at = (along: number, across: number) => [
    x + (dx * along - dy * across) / length,
    y + (dy * along + dx * across) / length,
  ];
  const points = [at(-11, -5), at(11, -5), at(11, 5), at(-11, 5), at(-11, -5)];
  const opacity = 0.16 + active * 0.84;
  paths.push({
    id: id + "-probe",
    d: points
      .map(
        ([px, py], i) => (i ? "L" : "M") + px.toFixed(2) + " " + py.toFixed(2),
      )
      .join(" "),
    kind: "glass",
    opacity,
    tone: "pending",
  });
  for (let rib = 0; rib < 3; rib++) {
    const a = at(-5 + rib * 5, -3),
      b = at(-5 + rib * 5, 3);
    paths.push({
      id: `${id}-packet-rib-${rib}`,
      d: `M${a.map((n) => n.toFixed(2)).join(" ")} L${b.map((n) => n.toFixed(2)).join(" ")}`,
      kind: "edge",
      opacity,
      tone: "pending",
    });
  }
}

function band(
  scene: Scene,
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
  opacity: number,
) {
  scene.line(
    id,
    [
      [x, y],
      [x + width, y],
      [x + width, y + height],
      [x, y + height],
      [x, y],
    ],
    "glass",
    opacity,
    "pending",
  );
  scene.line(
    id + "-edge",
    [
      [x, y],
      [x + width, y],
    ],
    "edge",
    opacity,
    "pending",
  );
}

/** The ledger owns C17 in every state; participants exchange requests, not originals. */
export function workOrderFrame(
  time: number,
  selection: number,
  portrait: boolean,
): ProofFrame {
  const scene = processScene(time, portrait);
  const { workspace, card, box, label, arrow, line } = scene;
  // Milestones follow the work: publication after its write, receipt before ack.
  const stage = selection >= 1.74 ? 2 : selection >= 0.96 ? 1 : 0;
  const posted = blend(selection, [0, 1, 1]);
  const received = blend(selection, [0, 0, 1]);
  const maintainer = portrait
    ? { x: 20, y: 26, w: 180, h: 164 }
    : { x: 24, y: 106, w: 164, h: 210 };
  const parser = portrait
    ? { x: 220, y: 26, w: 180, h: 164 }
    : { x: 612, y: 106, w: 164, h: 210 };
  const ledger = portrait
    ? { x: 28, y: 266, w: 364, h: 442 }
    : { x: 236, y: 40, w: 328, h: 434 };
  workspace(
    "maintainer",
    maintainer.x,
    maintainer.y,
    maintainer.w,
    maintainer.h,
    "Maintainer",
    "Claimant",
  );
  workspace(
    "parser-agent",
    parser.x,
    parser.y,
    parser.w,
    parser.h,
    "Parser agent",
    "Respondent",
  );
  workspace(
    "ledger",
    ledger.x,
    ledger.y,
    ledger.w,
    ledger.h,
    "Ledger",
    "Authoritative record",
  );

  [
    [
      "maintainer-action",
      ["Defines C17", "C17 posted", "C17 unchanged"][stage],
    ],
    ["maintainer-requirements", "Requirements"],
    ["maintainer-fixed", "stay fixed"],
  ].forEach(([id, text], index) =>
    label(id, text, maintainer.x + 25, maintainer.y + 85 + index * 23, {
      kind: "small",
    }),
  );
  [
    [
      "parser-action",
      selection >= 1.99
        ? "Receipt ack"
        : selection >= 1.74
          ? "Awaiting ack"
          : selection > 1.02
            ? "Requests receipt"
            : ["Waits for post", "Reads C17"][stage],
    ],
    ["parser-receipt", stage === 2 ? "Generation 1" : "No receipt yet"],
    ["parser-responsibility", stage === 2 ? "Responsible" : "Via the ledger"],
  ].forEach(([id, text], index) =>
    label(id, text, parser.x + 25, parser.y + 85 + index * 23, {
      kind: "small",
      tone: "pending",
    }),
  );

  if (portrait) {
    arrow("post-direction", [110, 190], [110, 266], {
      axis: "vertical",
      tone: "pending",
      opacity: 0.48 + posted * 0.3,
    });
    label("post-label", "post C17", 55, 233, {
      kind: "small",
      anchor: "middle",
    });
    arrow("acquire-direction", [279, 190], [279, 266], {
      axis: "vertical",
      tone: "pending",
      opacity: 0.43 + posted * 0.32,
    });
    label("acquire-label", "acquire", 226, 233, {
      kind: "small",
      anchor: "middle",
    });
    label("acquire-detail", "", 226, 242, {
      kind: "small",
      anchor: "middle",
    });
    arrow("receipt-direction", [337, 266], [337, 190], {
      axis: "vertical",
      tone: "pending",
      opacity: 0.3 + received * 0.5,
    });
    label("ack-label", "ack", 377, 233, { kind: "small", anchor: "middle" });
  } else {
    arrow("post-direction", [188, 215], [236, 215], {
      axis: "horizontal",
      tone: "pending",
      opacity: 0.48 + posted * 0.3,
    });
    label("post-label", "post C17", 212, 197, {
      kind: "small",
      anchor: "middle",
    });
    arrow("acquire-direction", [612, 222], [564, 222], {
      axis: "horizontal",
      tone: "pending",
      opacity: 0.43 + posted * 0.32,
    });
    label("acquire-label", "acquire", 588, 184, {
      kind: "small",
      anchor: "middle",
    });
    label("acquire-detail", "", 588, 201, {
      kind: "small",
      anchor: "middle",
    });
    arrow("receipt-direction", [564, 276], [612, 276], {
      axis: "horizontal",
      tone: "pending",
      opacity: 0.3 + received * 0.5,
    });
    label("ack-label", "ack", 588, 258, { kind: "small", anchor: "middle" });
  }
  probe(scene.paths, "post-direction", progress(selection, 0.03, 0.47));
  probe(scene.paths, "acquire-direction", progress(selection, 1.02, 1.32));
  probe(scene.paths, "receipt-direction", progress(selection, 1.76, 1.99));

  const cx = ledger.x + 20,
    cy = ledger.y + 84,
    width = ledger.w - 40;
  card("claim-c17", cx, cy, width, 178, "C17", "Parser fix · required checks", {
    opacity: 1,
  });
  [
    ["claim-requirements", "Reject malformed escapes"],
    ["requirement-valid-input", "Preserve valid input"],
    ["requirement-review", "Review the exact patch"],
  ].forEach(([id, text], index) => {
    label(id, text, cx + 14, cy + 72 + index * 22, { kind: "small" });
    const x = cx + width - 24,
      y = cy + 65 + index * 22;
    line(
      "required-mark-" + index,
      [
        [x, y],
        [x + 7, y],
        [x + 7, y + 7],
        [x, y + 7],
        [x, y],
      ],
      "fine",
      0.5,
    );
  });
  label(
    "claim-state",
    ["Generated", "Posted", "Received"][stage],
    cx + 14,
    cy + 143,
    { kind: "status", tone: "pending" },
  );

  const postWrite = progress(selection, 0.48, 0.96);
  band(
    scene,
    "claim-post-write",
    cx + 14,
    cy + 160,
    (width - 28) * postWrite,
    6,
    0.22 + postWrite * 0.65,
  );
  band(
    scene,
    "claim-post-scan",
    cx + 14 + (width - 40) * postWrite,
    cy + 56,
    12,
    72,
    Math.sin(postWrite * Math.PI) * 0.62,
  );

  const ry = cy + 194;
  const receiptWrite = progress(selection, 1.34, 1.74);
  // The empty slot's lettering yields to the arriving sheet, then its issued
  // fields appear on the completed surface instead of floating over a moving edge.
  const receiptInk =
    1 - progress(receiptWrite, 0, 0.18) + progress(receiptWrite, 0.88, 1);
  const receiptWidth = 26 + (width - 26) * receiptWrite;
  box("receipt-slot", cx, ry, width, 86, { opacity: 0.19 });
  box("work-receipt", cx + width - receiptWidth, ry, receiptWidth, 86, {
    tone: "pending",
    opacity: 0.1 + receiptWrite * 0.82,
  });
  band(
    scene,
    "receipt-write-progress",
    cx + width - 16 - (width - 32) * receiptWrite,
    ry + 70,
    (width - 32) * receiptWrite,
    6,
    0.2 + receiptWrite * 0.7,
  );
  band(
    scene,
    "receipt-write-front",
    cx + width - receiptWidth + 5,
    ry + 11,
    7,
    50,
    Math.sin(receiptWrite * Math.PI) * 0.65,
  );
  band(
    scene,
    "parser-ack-ready",
    parser.x + 25,
    parser.y + parser.h - 18,
    (parser.w - 50) * progress(selection, 1.76, 1.99),
    5,
    0.65,
  );
  label("receipt-title", "Execution receipt", cx + 22, ry + 27, {
    kind: "label",
    opacity: receiptInk,
  });
  label(
    "receipt-value",
    stage === 2 ? "Generation 1 · Parser agent" : "Not acquired",
    cx + 22,
    ry + 53,
    { kind: "small", tone: "pending", opacity: receiptInk },
  );
  label(
    "source-after-post",
    "Requirements stay fixed",
    ledger.x + 28,
    ledger.y + 386,
    { kind: "small" },
  );
  label(
    "acceptance",
    "Acceptance: not evaluated",
    ledger.x + 28,
    ledger.y + 412,
    { kind: "status", tone: "pending" },
  );
  return scene.frame();
}
