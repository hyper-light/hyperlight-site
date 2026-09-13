import type {
  ProofFrameFunction,
  ProofTone,
} from "../proof-work/proof-geometry";
import { easeLifecycle } from "../proof-work/lifecycle-drawing";
import {
  spatialCamera,
  spatialDrawing,
  spatialPulse,
  type Point2,
  type Project3,
} from "./spatial-drawing";
import { runtimeAlong } from "./runtime-drawing";
import {
  aliceEdit,
  bobEdits,
  mergeSnapshot,
  type MergeScenario,
} from "./merge-data";

/** Independent working copies attach to worker compute blades. Only the volume
 * owner updates the accepted head; immutable source, chassis and routes stay fixed. */
export function createMergeFrame(scenario: MergeScenario): ProofFrameFunction {
  return (time, selection, portrait) => {
    const d = spatialDrawing(),
      state = mergeSnapshot(scenario, selection),
      position = state.position;
    const phase = (a: number, b: number) =>
      easeLifecycle((position - a) / (b - a));
    const active = spatialPulse(time, 0.48, 0.2);
    const qA = spatialCamera(portrait ? [42, 211] : [44, 234], {
      yaw: -0.1,
      pitch: 0.83,
    });
    const qB = spatialCamera(portrait ? [42, 402] : [463, 234], {
      yaw: -0.1,
      pitch: 0.83,
    });
    const qO = spatialCamera(portrait ? [42, 592] : [255, 399], {
      yaw: -0.1,
      pitch: 0.83,
    });
    const port = (q: Project3) => q([284, 40, 12]);
    const aPort = port(qA),
      bPort = port(qB),
      ownerPort = port(qO);
    const baseX = portrait ? 170 : 310,
      baseY = portrait ? 42 : 45,
      baseW = portrait ? 222 : 190;
    const baseEnd: Point2 = [baseX + baseW / 2, baseY + 77];
    const forkA: Point2[] = portrait
      ? [baseEnd, [404, 119], [404, aPort[1]], aPort]
      : [baseEnd, [380, 144], [380, aPort[1]], aPort];
    const forkB: Point2[] = portrait
      ? [baseEnd, [404, 119], [404, bPort[1]], bPort]
      : [baseEnd, [baseEnd[0], 125], [746, 125], [746, bPort[1]], bPort];
    const submitA: Point2[] = portrait
      ? [aPort, [371, aPort[1]], [371, ownerPort[1]], ownerPort]
      : [
          aPort,
          [376, aPort[1]],
          [376, 314],
          [568, 314],
          [568, ownerPort[1]],
          ownerPort,
        ];
    const submitB: Point2[] = portrait
      ? [bPort, [385, bPort[1]], [385, ownerPort[1]], ownerPort]
      : [
          bPort,
          [773, bPort[1]],
          [773, 433],
          [568, 433],
          [568, ownerPort[1]],
          ownerPort,
        ];
    const replyA: Point2[] = portrait
      ? [qO([0, 40, 8]), [18, 620], [18, 233], qA([0, 40, 8])]
      : [qO([0, 40, 8]), [220, 433], [220, 322], [365, 322], [365, 257], aPort];
    const replyB: Point2[] = portrait
      ? [qO([0, 40, 8]), [12, 620], [12, 424], qB([0, 40, 8])]
      : [
          ownerPort,
          [597, ownerPort[1]],
          [597, 340],
          [755, 340],
          [755, 256],
          bPort,
        ];

    function line(
      id: string,
      points: Point2[],
      opacity = 0.4,
      tone?: ProofTone,
    ) {
      d.line(id, points, { opacity, tone });
    }
    function rect(
      id: string,
      q: Project3,
      x: number,
      y: number,
      z: number,
      w: number,
      h: number,
      opacity: number,
      material: "paper" | "metal" | "silicon" | "circuit" | "emissive",
      tone?: ProofTone,
    ) {
      d.face(
        id,
        [
          q([x, y, z]),
          q([x + w, y, z]),
          q([x + w, y + h, z]),
          q([x, y + h, z]),
        ],
        material,
        opacity,
        tone,
      );
    }
    function caption(
      id: string,
      text: string,
      x: number,
      y: number,
      options: Parameters<typeof d.label>[4] = {},
    ) {
      d.label(id, text, x, y, { kind: "small", ...options });
    }
    function packet(
      id: string,
      route: Point2[],
      start: number,
      end: number,
      kind: "snapshot" | "journal",
      tone: ProofTone = "pending",
    ) {
      const t = phase(start, end),
        [x, y] = runtimeAlong(route, t);
      const opacity = t > 0 && t < 1 ? Math.sin(Math.PI * t) * 0.95 : 0;
      const q: Project3 = ([a, b, c]) => [
        x + a + b * 0.36,
        y + b * 0.67 - c * 0.64,
      ];
      if (kind === "snapshot") {
        d.solid(id, q, [-4, -4, 0], [8, 8, 5], {
          material: "circuit",
          opacity,
          tone,
        });
        for (let i = 0; i < 3; i++)
          line(
            id + "-cell-" + i,
            [q([-2 + i * 2, -2, 5.2]), q([-2 + i * 2, 2, 5.2])],
            opacity,
            tone,
          );
      } else {
        d.face(
          id,
          [
            q([-5, -7, 1]),
            q([2, -7, 1]),
            q([5, -4, 1]),
            q([5, 7, 1]),
            q([-5, 7, 1]),
          ],
          "paper",
          opacity,
          tone,
        );
        for (let i = 0; i < 3; i++)
          line(
            id + "-ink-" + i,
            [q([-3, -2 + i * 3, 1.2]), q([3, -2 + i * 3, 1.2])],
            opacity * 0.8,
            tone,
          );
      }
    }

    // Ports and immutable routes are established before packets or physical nodes.
    for (const [id, route, tone] of [
      ["fork-to-alice", forkA, "neutral"],
      ["fork-to-bob", forkB, "neutral"],
      ["alice-to-owner", submitA, "pass"],
      ["bob-to-owner", submitB, "pending"],
      ["owner-to-alice", replyA, "pass"],
      ["owner-to-bob", replyB, scenario === "conflict" ? "fail" : "pass"],
    ] as const)
      d.line(id, route, {
        opacity: id.startsWith("fork") ? 0.22 : 0.29,
        tone,
        dashArray: id.startsWith("owner") ? "3 5" : undefined,
      });

    // The unchanged source is a layered file, not another mutable worker.
    const plain: Project3 = ([x, y, z]) => [
      baseX + x + z * 0.2,
      baseY + y - z * 0.3,
    ];
    rect("base-shadow", plain, 4, 5, -2, baseW, 77, 0.38, "silicon");
    rect("base-sheet-back", plain, 2, 3, 0, baseW, 74, 0.65, "paper");
    d.face(
      "base-sheet",
      [
        plain([0, 0, 1]),
        plain([baseW - 14, 0, 1]),
        plain([baseW, 14, 1]),
        plain([baseW, 74, 1]),
        plain([0, 74, 1]),
      ],
      "paper",
      0.96,
    );
    d.face(
      "base-fold",
      [
        plain([baseW - 14, 0, 1]),
        plain([baseW - 14, 14, 3]),
        plain([baseW, 14, 1]),
      ],
      "metal",
      0.7,
    );
    caption("base-title", "BASE S0 · image.conf", baseX + 12, baseY + 19, {
      kind: "small",
    });
    caption("base-line-0", "quality=80", baseX + 12, baseY + 42, {
      kind: "label",
    });
    caption("base-line-1", "cache=off", baseX + 12, baseY + 62, {
      kind: "label",
    });

    function node(id: "alice" | "bob" | "head", q: Project3) {
      const owner = id === "head",
        alice = id === "alice";
      const ready = owner ? 1 : alice ? phase(0.3, 0.65) : phase(0.65, 1);
      const edit = alice ? aliceEdit : bobEdits[scenario],
        editRow = edit.start === 8 ? 0 : 1;
      const start = alice ? 1 : 2;
      const editPhase = phase(start + 0.05, start + 0.88);
      const typing = phase(start + 0.43, start + 0.86);
      const typed = edit.bytes.slice(0, Math.floor(edit.bytes.length * typing));
      const localLines = ["quality=80", "cache=off"];
      if (!owner && position >= start + 0.3)
        localLines[editRow] = (editRow === 0 ? "quality=" : "cache=") + typed;
      const lines = owner ? state.head.trimEnd().split("\n") : localLines;
      const tone: ProofTone = owner ? "neutral" : alice ? "pass" : "pending";
      // Steel carrier, exposed circuit board, fastening holes and edge connector.
      d.solid(id + "-carrier", q, [-4, -4, -8], [290, 91, 8], {
        material: "metal",
        opacity: 0.87,
      });
      d.solid(id + "-pcb", q, [0, 0, 0], [282, 81, 3], {
        material: "circuit",
        opacity: 0.97,
      });
      for (const [n, x, y] of [
        [0, 5, 5],
        [1, 276, 5],
        [2, 5, 75],
        [3, 276, 75],
      ]) {
        d.face(
          id + "-mount-" + n,
          Array.from({ length: 17 }, (_, i) =>
            q([
              x + 2.5 * Math.cos((i * Math.PI) / 8),
              y + 2.5 * Math.sin((i * Math.PI) / 8),
              3.2,
            ]),
          ),
          "metal",
          0.8,
        );
        line(
          id + "-mount-slot-" + n,
          [q([x - 1.2, y, 3.3]), q([x + 1.2, y, 3.3])],
          0.65,
        );
      }
      for (let i = 0; i < 14; i++)
        d.solid(
          id + "-edge-contact-" + i,
          q,
          [15 + i * 9, 80, 1],
          [6, 5, 1.5],
          { material: "metal", opacity: 0.8 },
        );
      for (let lane = 0; lane < 5; lane++)
        line(
          id + "-signal-" + lane,
          [
            q([188, 18 + lane * 3, 3.2]),
            q([199 + lane * 2, 18 + lane * 3, 3.2]),
            q([199 + lane * 2, 54 + lane * 3, 3.2]),
            q([252, 54 + lane * 3, 3.2]),
          ],
          0.34,
        );
      d.solid(id + "-cpu", q, [205, 22, 4], [45, 43, 8], {
        material: "silicon",
        opacity: 0.95,
      });
      d.solid(id + "-heat-spreader", q, [208, 25, 12], [39, 36, 4], {
        material: "metal",
        opacity: 0.91,
      });
      for (let fin = 0; fin < 9; fin++)
        d.solid(
          id + "-heatsink-fin-" + fin,
          q,
          [208 + fin * 4.3, 25, 16],
          [1.7, 36, 11],
          { material: "metal", opacity: 0.83 },
        );
      for (let ram = 0; ram < 3; ram++) {
        d.solid(id + "-ram-" + ram, q, [207 + ram * 17, 67, 4], [12, 8, 5], {
          material: "silicon",
          opacity: 0.92,
        });
        for (let pin = 0; pin < 4; pin++)
          d.solid(
            id + "-ram-pin-" + ram + "-" + pin,
            q,
            [207 + ram * 17 + pin * 3, 75, 3],
            [1.6, 3, 1.5],
            { material: "metal", opacity: 0.7 },
          );
      }
      d.solid(id + "-nic", q, [260, 12, 4], [22, 43, 18], {
        material: "metal",
        opacity: 0.87,
      });
      for (let slot = 0; slot < 2; slot++) {
        const y = 16 + slot * 19;
        d.face(
          id + "-nic-port-" + slot,
          [
            q([282.2, y, 8]),
            q([282.2, y + 13, 8]),
            q([282.2, y + 13, 18]),
            q([282.2, y, 18]),
          ],
          "silicon",
          0.98,
        );
        for (let pin = 0; pin < 5; pin++)
          line(
            id + "-nic-pin-" + slot + "-" + pin,
            [q([282.3, y + 2 + pin * 2, 8]), q([282.3, y + 2 + pin * 2, 11])],
            0.75,
          );
      }
      rect(
        id + "-activity-led",
        q,
        266,
        63,
        4,
        7,
        4,
        0.2 + active.opacity * 0.38,
        "emissive",
        tone,
      );
      // A local file sheet mounts above the blade. Ordinary monospace ink follows its face.
      const file: Project3 = ([x, y, z]) => q([x, 9 + z, 113 - y * 1.48]);
      d.face(
        id + "-file-back",
        [
          q([10, 11, 23]),
          q([197, 11, 23]),
          q([197, 11, 114]),
          q([10, 11, 114]),
        ],
        "metal",
        0.28 + ready * 0.3,
      );
      d.face(
        id + "-file-sheet",
        [
          file([12, 0, 0]),
          file([182, 0, 0]),
          file([196, 9, 0]),
          file([196, 60, 0]),
          file([12, 60, 0]),
        ],
        "paper",
        0.15 + ready * 0.8,
      );
      d.face(
        id + "-file-fold",
        [file([182, 0, 0]), file([182, 9, 1]), file([196, 9, 0])],
        "metal",
        0.2 + ready * 0.45,
      );
      d.surfaceLabel(
        id + "-file-name",
        owner ? "HEAD · image.conf" : "image.conf",
        file,
        [23, 16, 0.2],
        {
          kind: "small",
          opacity: ready,
        },
      );
      line(
        id + "-file-rule",
        [file([22, 21, 0.2]), file([184, 21, 0.2])],
        ready * 0.3,
      );
      for (let row = 0; row < 2; row++) {
        d.surfaceLabel(
          id + "-value-" + row,
          lines[row],
          file,
          [23, 36 + row * 20, 0.3],
          {
            kind: "label",
            opacity: ready,
            tone: owner
              ? (row === 0 && state.aliceAccepted) ||
                (row === 1 && state.verdict === "accepted")
                ? "pass"
                : "neutral"
              : row === editRow && position >= start + 0.43
                ? tone
                : "neutral",
          },
        );
      }
      const row = editRow,
        y = 36 + row * 20,
        font = portrait ? 13 : 11,
        character = font * 0.6;
      const prefix = (row === 0 ? "quality=" : "cache=").length;
      const old = row === 0 ? "80" : "off";
      const selectOpacity = owner
        ? 0
        : ready *
          phase(start + 0.02, start + 0.08) *
          (1 - phase(start + 0.24, start + 0.34));
      rect(
        id + "-selection",
        file,
        23 + prefix * character - 1,
        y - font,
        0.15,
        old.length * character + 2,
        font + 3,
        selectOpacity * 0.29,
        "emissive",
        tone,
      );
      const caretX =
        23 +
        prefix * character +
        (old.length * (1 - phase(start + 0.24, start + 0.32)) +
          edit.bytes.length * typing) *
          character;
      const caretOpacity = owner
        ? 0
        : ready *
          phase(start + 0.02, start + 0.08) *
          (1 - phase(start + 0.9, start + 1)) *
          (0.45 + active.opacity * 0.45);
      line(
        id + "-caret",
        [file([caretX, y - font, 0.4]), file([caretX, y + 2, 0.4])],
        caretOpacity,
        tone,
      );
      // The attached operation journal retains both the removed line and the replacement.
      rect(
        id + "-journal-shadow",
        q,
        15,
        45,
        18,
        184,
        portrait ? 60 : 48,
        0.24,
        "silicon",
      );
      rect(
        id + "-journal",
        q,
        12,
        42,
        22,
        183,
        portrait ? 59 : 47,
        0.3 + (owner ? 1 : editPhase) * 0.62,
        "paper",
      );
      const beforeLine = "− " + (editRow === 0 ? "quality=" : "cache=") + old;
      const afterLine =
        "+ " + (editRow === 0 ? "quality=" : "cache=") + edit.bytes;
      const ownerJournal =
        position < 3.45
          ? ["canonical head", "no accepted edits"]
          : position < 4
            ? ["Agent 1: quality=90", "Agent 2: waiting"]
            : position < 4.6
              ? [
                  "head " +
                    (scenario === "disjoint" ? "off" : "90") +
                    " · Agent 2 " +
                    edit.bytes,
                  "compare [" + edit.start + ", " + edit.end + ")",
                ]
              : scenario === "conflict"
                ? ["90 ≠ 60 · REFUSED", "Agent 1’s head retained"]
                : scenario === "identical"
                  ? ["90 = 90 · NO NEW EDIT", "same head retained"]
                  : ["ranges separate", "both changes accepted"];
      for (let row = 0; row < 2; row++)
        d.surfaceLabel(
          id + "-journal-line-" + row,
          owner ? ownerJournal[row] : row === 0 ? beforeLine : afterLine,
          q,
          [21, 60 + row * (portrait ? 32 : 23), 22.4],
          {
            kind: "small",
            opacity: owner
              ? 1
              : row === 0
                ? phase(start + 0.3, start + 0.45)
                : phase(start + 0.86, start + 1),
            tone: owner
              ? state.verdict === "refused"
                ? "fail"
                : "neutral"
              : row === 0
                ? "fail"
                : tone,
          },
          [
            [1, 0, 0],
            [0, 1.36, 0],
          ],
        );
      // Owner compares the exact proposed range at the accepted file; workers never write this sheet.
      const compare = owner ? phase(4.02, 4.18) * (1 - phase(4.5, 4.6)) : 0;
      const compareRow = scenario === "disjoint" ? 1 : 0,
        comparePrefix = (compareRow ? "cache=" : "quality=").length;
      line(
        id + "-comparison-bracket",
        [
          file([
            23 + comparePrefix * character - 2,
            36 + compareRow * 20 + 4,
            0.4,
          ]),
          file([
            23 + (comparePrefix + (compareRow ? 3 : 2)) * character + 2,
            36 + compareRow * 20 + 4,
            0.4,
          ]),
        ],
        compare * 0.95,
        "pending",
      );
    }

    node("alice", qA);
    node("bob", qB);
    node("head", qO);
    const titles: [string, string, number, number][] = [
      [
        "alice-title",
        "WORKER · AGENT 1",
        portrait ? 28 : 44,
        portrait ? 112 : 143,
      ],
      [
        "bob-title",
        "WORKER · AGENT 2",
        portrait ? 28 : 463,
        portrait ? 302 : 143,
      ],
      ["head-title", "VOLUME OWNER", portrait ? 28 : 255, portrait ? 492 : 303],
    ];
    for (const [id, text, x, y] of titles)
      caption(id, text, x, y, {
        kind: "name",
        tone:
          id === "alice-title"
            ? "pass"
            : id === "bob-title"
              ? "pending"
              : "neutral",
      });
    caption(
      "head-owner-note",
      "Only this node advances the head",
      portrait ? 28 : 255,
      portrait ? 690 : 487,
      { opacity: 0.68 },
    );
    const verdict =
      state.verdict === "pending"
        ? "AWAITING OWNER’S VERDICT"
        : state.verdict === "refused"
          ? "CONFLICT · AGENT 1’S HEAD KEPT"
          : state.verdict === "accepted-no-op"
            ? "ACCEPTED · NO SECOND EFFECT"
            : "ACCEPTED · BOTH EDITS COMBINED";
    caption("merge-verdict", verdict, 28, portrait ? 719 : 510, {
      kind: "small",
      tone:
        state.verdict === "refused"
          ? "fail"
          : state.verdict === "pending"
            ? "neutral"
            : "pass",
    });
    const heading =
      position === 0
        ? "OWNER HOLDS AN IMMUTABLE BASE"
        : position <= 1
          ? "WORKERS FORK THE SAME BASE"
          : position <= 2
            ? "AGENT 1 EDITS ITS LOCAL COPY"
            : position <= 3
              ? "AGENT 2 EDITS ITS LOCAL COPY"
              : position < 3.45
                ? "WORKERS SUBMIT BYTES + JOURNALS"
                : position <= 4
                  ? "OWNER ACCEPTS AGENT 1; QUEUES AGENT 2"
                  : position < 4.6
                    ? "OWNER COMPARES AGENT 2 WITH THE HEAD"
                    : "OWNER DECIDES, THEN REPLIES";
    caption("merge-kicker", heading, 28, 29, { kind: "heading" });
    caption(
      "bob-owner-reply",
      scenario === "conflict" ? "Reply: refused" : "Reply: accepted",
      portrait ? 350 : 752,
      portrait ? 302 : 143,
      {
        anchor: "end",
        opacity: phase(4.96, 5),
        tone: scenario === "conflict" ? "fail" : "pass",
      },
    );
    // Separate snapshots and operation journals travel together, not whole working directories.
    packet("fork-alice-snapshot", forkA, 0.12, 0.63, "snapshot");
    packet("fork-bob-snapshot", forkB, 0.55, 1, "snapshot");
    packet("alice-submit-snapshot", submitA, 3.02, 3.36, "snapshot", "pass");
    packet("alice-submit-journal", submitA, 3.09, 3.43, "journal", "pass");
    packet("bob-submit-snapshot", submitB, 3.5, 3.92, "snapshot");
    packet("bob-submit-journal", submitB, 3.58, 4, "journal");
    packet("alice-acceptance", replyA, 3.46, 3.96, "journal", "pass");
    packet(
      "bob-verdict",
      replyB,
      4.65,
      5,
      "journal",
      scenario === "conflict" ? "fail" : "pass",
    );
    return { paths: d.paths, labels: d.labels };
  };
}
export const mergeFrames = {
  disjoint: createMergeFrame("disjoint"),
  identical: createMergeFrame("identical"),
  conflict: createMergeFrame("conflict"),
};
