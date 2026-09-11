import type { ProofFrame, ProofTone } from "./proof-geometry";
import { processScene, blend } from "./process-geometry";
import { fixtureExamples, fixtureOutcome } from "./validation-fixture-data";

/** Participant-owned checks read and append through the authoritative ledger. */
export function validationFixtureFrame(
  time: number,
  selection: number,
  portrait: boolean,
): ProofFrame {
  const scene = processScene(time, portrait);
  const { workspace, box, line, label, arrow } = scene;
  const selected = Math.max(0, Math.min(4, Math.round(selection)));
  const example = fixtureExamples[selected];
  const outcome = fixtureOutcome(example);
  const missing = blend(selection, [0, 0, 0, 1, 0]);
  const reviewTarget = blend(selection, [0, 1, 0, 0, 0]);
  const toneFor = (value: string): ProofTone =>
    value === "Pass" || value === "Satisfied"
      ? "pass"
      : value === "Fail" || value === "Failed"
        ? "fail"
        : value === "Error" || value === "Errored"
          ? "error"
          : "pending";
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

  // Only ledger-mediated exchange crosses a workspace boundary. Checking stays local.
  arrow(
    "read-context",
    portrait ? [88, 266] : [236, 139],
    portrait ? [88, 190] : [188, 179],
    {
      axis: portrait ? "vertical" : "horizontal",
      opacity: 0.85 - missing * 0.73,
    },
  );
  arrow(
    "post-results",
    portrait ? [145, 190] : [188, 270],
    portrait ? [145, 266] : [236, 331],
    {
      axis: portrait ? "vertical" : "horizontal",
      tone: toneFor(outcome),
      opacity: 0.9,
    },
  );
  arrow(
    "publish-work",
    portrait ? [324, 190] : [612, 207],
    portrait ? [324, 266] : [564, 201],
    {
      axis: portrait ? "vertical" : "horizontal",
      opacity: 0.78 - missing * 0.65,
    },
  );

  label("local-evaluator", "Local evaluator", left.x + 17, left.y + 88);
  label("local-requirements", "tests + review", left.x + 17, left.y + 112, {
    kind: "small",
  });
  label(
    "parser-action",
    example.missingSlot ? "Slot absent" : "Publish A / B",
    right.x + 17,
    right.y + 88,
    {
      kind: "label",
      tone: example.missingSlot ? "pending" : "neutral",
    },
  );
  label("parser-role-detail", "No checks here", right.x + 17, right.y + 112, {
    kind: "small",
  });

  // Two independent read heads inspect local working copies, not the ledger's stored records.
  for (let index = 0; index < 2; index++) {
    const id = index ? "review" : "tests";
    const x = left.x + 20 + index * (portrait ? 77 : 65);
    const y = left.y + (portrait ? 135 : 158);
    const width = portrait ? 57 : 48;
    const opacity = 0.72 - missing * 0.65;
    for (let row = 0; row < 4; row++) {
      const rowY = y - 8 + row * 5;
      line(
        `${id}-local-content-${row}`,
        [
          [x, rowY],
          [x + width - (row % 3) * 5, rowY],
        ],
        "fine",
        opacity * 0.56,
      );
      line(
        `${id}-local-contact-${row}`,
        [
          [x - 5, rowY],
          [x - 2, rowY],
        ],
        "edge",
        opacity * 0.65,
      );
    }
    const scanY = y - 5 + Math.sin(time * 0.72 + index * 1.1) * 5;
    box(`${id}-scanner`, x + width - 5, scanY - 4, 7, 8, {
      opacity,
      tone: toneFor(example.checks[index].verdict),
    });
    line(
      `${id}-scan-line`,
      [
        [x, scanY],
        [x + width - 5, scanY],
      ],
      "light",
      opacity,
      toneFor(example.checks[index].verdict),
    );
    if (!portrait) {
      line(
        `${id}-readout`,
        [
          [x, y + 27],
          [x + 10, y + 27],
          [x + 14, y + 23],
          [x + width, y + 23],
        ],
        "fine",
        opacity,
      );
    }
  }
  for (let row = 0; row < (portrait ? 4 : 7); row++) {
    const y = right.y + (portrait ? 131 : 144) + row * 5;
    line(
      `authored-diff-${row}`,
      [
        [right.x + 21, y],
        [right.x + 29, y],
        [right.x + 29, y - 2],
        [right.x + 110 - (row % 3) * 18, y - 2],
      ],
      "fine",
      0.36 - missing * 0.26,
    );
  }

  const recordX = ledger.x + 20;
  const recordWidth = ledger.w - 40;
  const artifactY = portrait ? 342 : 112;
  const resultY = portrait ? 472 : 242;
  const recordHeight = 54;

  // Result records point back to exact artifact records inside the ledger, not to each other.
  for (let index = 0; index < 2; index++) {
    const id = index ? "review" : "tests";
    const destination = index ? reviewTarget : 0;
    const targetY = artifactY + (index ? 35 : 21) + destination * 62;
    const bus = ledger.x + 8 + index * 4;
    const route = [
      [recordX, resultY + index * 62 + 27],
      [bus, resultY + index * 62 + 27],
      [bus, targetY],
      [recordX, targetY],
    ] as const;
    const tone = toneFor(example.checks[index].verdict);
    const opacity = 0.84 - missing * 0.77;
    line(`${id}-binding-path`, route, "fine", opacity * 0.7, tone);
    line(`${id}-binding-flow`, route, "light", opacity, tone);
    line(
      `${id}-binding-arrow`,
      [
        [recordX - 4, targetY - 3],
        [recordX, targetY],
        [recordX - 4, targetY + 3],
      ],
      "edge",
      opacity,
      tone,
    );
  }

  for (let index = 0; index < 2; index++) {
    const artifact = index ? "B" : "A";
    const absent = !index && example.missingSlot;
    const y = artifactY + index * 62;
    box(`artifact-${artifact}`, recordX, y, recordWidth, recordHeight, {
      opacity: index ? 1 : 1 - missing * 0.55,
      tone: absent ? "pending" : "neutral",
    });
    label(
      `artifact-${artifact}-title`,
      absent ? "Required patch" : `Patch ${artifact}`,
      recordX + 19,
      y + 29,
    );
    label(
      `artifact-${artifact}-identity`,
      absent ? "Not supplied" : `${artifact} / h${artifact}`,
      recordX + recordWidth - 24,
      y + 29,
      {
        kind: "small",
        anchor: "end",
        tone: absent ? "pending" : "neutral",
      },
    );
    for (let row = 0; row < 4; row++) {
      const x = recordX + 21 + row * 27;
      const opacity = index ? 0.4 : 0.4 - missing * 0.32;
      line(
        `patch-${index}-content-${row}`,
        [
          [x, y + 42],
          [x + 7, y + 42],
          [x + 7, y + 39],
          [x + 20 - ((row + index) % 3), y + 39],
        ],
        "fine",
        opacity,
      );
    }
  }

  for (let index = 0; index < 2; index++) {
    const id = index ? "review" : "tests";
    const check = example.checks[index];
    const y = resultY + index * 62;
    const tone = toneFor(check.verdict);
    box(id + "-result", recordX, y, recordWidth, recordHeight, { tone });
    label(
      id + "-result-title",
      `${check.check} · ${check.verdict === "Pending" ? "Not run" : check.verdict}`,
      recordX + 19,
      y + 29,
      { tone },
    );
    label(
      id + "-result-target",
      check.artifact ? `${check.artifact} / h${check.artifact}` : "No target",
      recordX + recordWidth - 24,
      y + 29,
      {
        kind: "small",
        anchor: "end",
        tone,
      },
    );
    line(
      id + "-result-signature",
      [
        [recordX + 21, y + 42],
        [recordX + 37, y + 42],
        [recordX + 41, y + 39],
        [recordX + 55, y + 39],
        [recordX + 60, y + 42],
        [recordX + 83, y + 42],
      ],
      "fine",
      0.48,
      tone,
    );
  }

  const acceptanceY = portrait ? 602 : 372;
  const outcomeTone = toneFor(outcome);
  box("acceptance", recordX, acceptanceY, recordWidth, 84, {
    tone: outcomeTone,
  });
  label(
    "acceptance-caption",
    "CLAIM C17 / ACCEPTANCE",
    recordX + 19,
    acceptanceY + 21,
    {
      kind: "heading",
    },
  );
  label("acceptance-status", outcome, recordX + 19, acceptanceY + 45, {
    kind: "status",
    tone: outcomeTone,
  });
  label(
    "acceptance-reason",
    [
      "Tests A + review A",
      "A needs review; B needs tests",
      "A failed a required check",
      "Required patch slot absent",
      "Runner unavailable; no retries",
    ][selected],
    recordX + 19,
    acceptanceY + 66,
    { kind: "small", tone: outcomeTone },
  );

  return scene.frame();
}
