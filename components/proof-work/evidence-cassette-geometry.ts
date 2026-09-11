import type { ProofFrame } from "./proof-geometry";
import { processScene, blend } from "./process-geometry";
import { cassetteArtifacts } from "./evidence-cassette-data";

/** One authoritative record: actors submit, read and acknowledge without moving its contents. */
export function evidenceCassetteFrame(
  time: number,
  selection: number,
  portrait: boolean,
): ProofFrame {
  const scene = processScene(time, portrait);
  const { workspace, box, line, label, arrow } = scene;
  const selected = Math.max(0, Math.min(3, Math.round(selection)));
  const recordOpacity = blend(selection, [0.2, 1, 1, 1]);
  const bindingOpacity = blend(selection, [0.15, 0.85, 0.85, 0.85]);
  const ledger = portrait
    ? { x: 28, y: 266, w: 364, h: 442 }
    : { x: 236, y: 40, w: 328, h: 434 };
  const left = portrait
    ? { x: 20, y: 26, w: 180, h: 164 }
    : { x: 24, y: 106, w: 164, h: 210 };
  const right = portrait
    ? { x: 220, y: 26, w: 180, h: 164 }
    : { x: 612, y: 106, w: 164, h: 210 };
  workspace(
    "maintainer",
    left.x,
    left.y,
    left.w,
    left.h,
    "Maintainer",
    "CLAIMANT",
  );
  workspace(
    "parser",
    right.x,
    right.y,
    right.w,
    right.h,
    "Parser agent",
    "RESPONDENT",
  );
  workspace(
    "ledger",
    ledger.x,
    ledger.y,
    ledger.w,
    ledger.h,
    "Ledger",
    "AUTHORITATIVE RECORD",
  );

  const postPorts = portrait
    ? ([
        [
          [284, 190],
          [288, 266],
        ],
        [
          [316, 190],
          [322, 266],
        ],
        [
          [348, 190],
          [356, 266],
        ],
      ] as const)
    : ([
        [
          [612, 183],
          [564, 142],
        ],
        [
          [612, 231],
          [564, 338],
        ],
        [
          [612, 278],
          [564, 396],
        ],
      ] as const);
  for (let index = 0; index < 3; index++) {
    const opacity = blend(
      selection,
      index === 0
        ? [0.95, 0.3, 0.2, 0.2]
        : index === 1
          ? [0.08, 0.95, 0.3, 0.2]
          : [0.08, 0.15, 0.95, 0.3],
    );
    arrow(
      ["submit-artifacts", "close-testament", "post-testament"][index],
      postPorts[index][0],
      postPorts[index][1],
      { axis: portrait ? "vertical" : "horizontal", opacity },
    );
  }
  arrow(
    "read-testament",
    portrait ? [91, 266] : [236, 337],
    portrait ? [91, 190] : [188, 204],
    {
      axis: portrait ? "vertical" : "horizontal",
      opacity: blend(selection, [0.06, 0.06, 0.35, 0.92]),
    },
  );
  arrow(
    "record-receipt",
    portrait ? [148, 190] : [188, 267],
    portrait ? [148, 266] : [236, 417],
    {
      axis: portrait ? "vertical" : "horizontal",
      opacity: blend(selection, [0.06, 0.06, 0.12, 0.92]),
    },
  );

  label(
    "maintainer-action",
    ["Await report", "Await posting", "Read posted T8", "Record receipt"][
      selected
    ],
    left.x + 17,
    left.y + 89,
  );
  label("maintainer-note", "Checks pending", left.x + 17, left.y + 117, {
    kind: "small",
    tone: "pending",
  });
  label(
    "parser-action",
    ["Submit artifacts", "Close account", "Post T8", "T8 is recorded"][
      selected
    ],
    right.x + 17,
    right.y + 89,
  );
  label("parser-note", "Patch, log, input", right.x + 17, right.y + 117, {
    kind: "small",
  });
  label(
    "work-reference",
    "Work for C17",
    right.x + 17,
    right.y + (portrait ? 140 : 145),
    { kind: "small" },
  );

  // Local authored work is shown as a diff, run log and reproducible input.
  for (let index = 0; index < 3; index++) {
    const startX = right.x + 20 + index * (portrait ? 48 : 42);
    const startY = right.y + (portrait ? 150 : 163);
    for (let row = 0; row < (portrait ? 2 : 4); row++) {
      const y = startY + row * 5;
      line(
        `author-${index}-row-${row}`,
        [
          [startX, y],
          [startX + 23 - (row % 2) * 6, y],
        ],
        "fine",
        0.32,
      );
    }
    line(
      `author-${index}-scan`,
      [
        [startX - 2, startY + 3 + Math.sin(time * 0.65 + index) * 2],
        [startX + 26, startY + 3 + Math.sin(time * 0.65 + index) * 2],
      ],
      "light",
      0.5,
    );
  }

  const artifactX = ledger.x + 20;
  const artifactY = portrait ? 344 : 114;
  const artifactWidth = ledger.w - 40;
  const artifactPitch = portrait ? 62 : 62;
  const manifestY = portrait ? 540 : 314;
  for (let index = 0; index < 3; index++) {
    const y = artifactY + index * artifactPitch;
    const bus = ledger.x + 8 + index * 3;
    const route = [
      [artifactX, y + 28],
      [bus, y + 28],
      [bus, manifestY - 7 - index * 3],
      [
        artifactX + artifactWidth * (0.25 + index * 0.25),
        manifestY - 7 - index * 3,
      ],
      [artifactX + artifactWidth * (0.25 + index * 0.25), manifestY],
    ] as const;
    line(`binding-${index}`, route, "fine", bindingOpacity * 0.68);
    line(`binding-light-${index}`, route, "light", bindingOpacity);
  }
  for (let index = 0; index < 3; index++) {
    const artifact = cassetteArtifacts[index];
    const y = artifactY + index * artifactPitch;
    box(`artifact-${index}`, artifactX, y, artifactWidth, 54);
    label(
      `artifact-${index}-title`,
      ["Patch A", "Test log L", "Reproduction R"][index],
      artifactX + 19,
      y + 29,
    );
    label(
      `artifact-${index}-identity`,
      artifact.reference,
      artifactX + artifactWidth - 24,
      y + 29,
      { kind: "small", anchor: "end" },
    );
    const contentX = artifactX + 21;
    for (let row = 0; row < 3; row++) {
      const x = contentX + row * 25;
      const rowY = y + 41;
      line(
        `artifact-${index}-content-${row}`,
        index === 0
          ? [
              [x, rowY],
              [x + 6, rowY],
              [x + 6, rowY - 2],
              [x + 19, rowY - 2],
            ]
          : index === 1
            ? [
                [x, rowY - 2],
                [x + 3, rowY + 1],
                [x + 7, rowY - 3],
                [x + 18, rowY - 3],
              ]
            : [
                [x + 4, rowY - 3],
                [x, rowY - 3],
                [x, rowY + 1],
                [x + 4, rowY + 1],
                [x + 17, rowY + 1],
              ],
        "fine",
        0.4,
      );
    }
    const scan = (Math.sin(time * 0.62 + index * 0.6) + 1) * 25;
    line(
      `artifact-${index}-read-head`,
      [
        [contentX + scan, y + 37],
        [contentX + scan, y + 45],
      ],
      "light",
      0.5,
    );
  }

  box("testament", artifactX, manifestY, artifactWidth, 104, {
    opacity: recordOpacity,
  });
  label(
    "testament-title",
    "Testament T8 · C17",
    artifactX + 19,
    manifestY + 27,
    { opacity: recordOpacity },
  );
  label(
    "testament-bindings",
    "A / hA · L / hL · R / hR",
    artifactX + 19,
    manifestY + 53,
    { kind: "small", opacity: recordOpacity },
  );
  label(
    "testament-stage",
    [
      "Not yet closed",
      "Closed · bindings fixed",
      "Posted · ready to read",
      "Received · receipt kept",
    ][selected],
    artifactX + 19,
    manifestY + 79,
    { kind: "small", opacity: recordOpacity, tone: "pending" },
  );
  label(
    "acceptance",
    "Acceptance: Pending",
    ledger.x + ledger.w / 2,
    portrait ? 675 : 444,
    { kind: "status", anchor: "middle", tone: "pending" },
  );
  return scene.frame();
}
