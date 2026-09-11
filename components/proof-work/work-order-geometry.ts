import type { ProofFrame, ProofPath } from "./proof-geometry";
import { blend, processScene } from "./process-geometry";

/** A persistent probe follows a request route; it never creates another record. */
function probe(paths: ProofPath[], id: string, time: number, phase: number) {
  const route = paths.find((path) => path.id === id + "-path")!;
  const p = Array.from(route.d.matchAll(/-?\d+(?:\.\d+)?/g), ([n]) =>
    Number(n),
  );
  const t = 0.5 + Math.sin(time * 0.8 + phase) * 0.36,
    u = 1 - t;
  const x =
    u ** 3 * p[0] + 3 * u * u * t * p[2] + 3 * u * t * t * p[4] + t ** 3 * p[6];
  const y =
    u ** 3 * p[1] + 3 * u * u * t * p[3] + 3 * u * t * t * p[5] + t ** 3 * p[7];
  const points = [
    [x - 3, y],
    [x, y - 3],
    [x + 3, y],
    [x, y + 3],
    [x - 3, y],
  ];
  paths.push({
    id: id + "-probe",
    d: points
      .map(
        ([px, py], i) => (i ? "L" : "M") + px.toFixed(2) + " " + py.toFixed(2),
      )
      .join(" "),
    kind: "light",
    opacity: route.opacity,
    tone: "pending",
  });
}

/** The ledger owns C17 in every state; participants exchange requests, not originals. */
export function workOrderFrame(
  time: number,
  selection: number,
  portrait: boolean,
): ProofFrame {
  const scene = processScene(time, portrait);
  const { workspace, card, box, label, arrow, line } = scene;
  const stage = Math.max(0, Math.min(2, Math.round(selection)));
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
    ["parser-action", ["Waits for post", "Reads C17", "Receipt ack"][stage]],
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
  probe(scene.paths, "post-direction", time, 0);
  probe(scene.paths, "acquire-direction", time, 1.8);
  probe(scene.paths, "receipt-direction", time, 3.6);

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

  const ry = cy + 194;
  box("work-receipt", cx, ry, width, 86, {
    tone: "pending",
    opacity: 0.28 + received * 0.39,
  });
  label("receipt-title", "Execution receipt", cx + 22, ry + 27, {
    kind: "label",
  });
  label(
    "receipt-value",
    stage === 2 ? "Generation 1 · Parser agent" : "Not acquired",
    cx + 22,
    ry + 53,
    { kind: "small", tone: "pending" },
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
