import type { ProofFrame, ProofPath } from "./proof-geometry";
import { blend, processScene } from "./process-geometry";
import { recordReaderReplayEvents } from "./record-reader-data";

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
  });
}

/** Tabs inspect one ledger: the original failure and linked successor never disappear. */
export function recordReaderFrame(
  time: number,
  selection: number,
  portrait: boolean,
): ProofFrame {
  const scene = processScene(time, portrait);
  const { workspace, card, box, label, line, arrow } = scene;
  const correct = blend(selection, [0, 0, 1]);
  const replay = blend(selection, [0, 1, 0]);
  const cursor = blend(selection, [0, 1.5 - Math.cos(time * 0.65) * 1.5, 3]);
  const readIndex = Math.max(0, Math.min(3, Math.round(cursor)));
  const reading = Math.round(selection) === 1;
  const returning = Math.sin(time * 0.65) < 0;
  const applied = reading && !returning ? readIndex + 1 : 4;
  const ready = applied === 4;
  const successor = applied >= 2;
  const workReceived = applied >= 3;
  const patchRecorded = applied >= 4;
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
  const readout = reading
    ? ready
      ? ["Reads ready view", "C17 stays failed", "C18 needs checks"]
      : ["Await recovery", "Read-only access", "View not ready"]
    : ["Reads C17 + C18", "Recorded outcomes", "Through ledger"];
  readout.forEach((text, index) =>
    label(
      "maintainer-action-" + index,
      text,
      maintainer.x + 25,
      maintainer.y + 85 + index * 23,
      { kind: "small" },
    ),
  );
  ["Published patch-b", "C18 evidence", "Checks pending"].forEach(
    (text, index) =>
      label(
        "parser-action-" + index,
        text,
        parser.x + 25,
        parser.y + 85 + index * 23,
        { kind: "small", tone: "pending" },
      ),
  );

  if (portrait) {
    arrow("issue-direction", [87, 190], [87, 266], {
      axis: "vertical",
      tone: "pending",
      opacity: 0.12 + correct * 0.68,
    });
    label("issue-label", "issue C18", 44, 233, {
      kind: "small",
      anchor: "middle",
    });
    arrow("read-direction", [156, 266], [156, 190], {
      axis: "vertical",
      opacity: reading && !ready ? 0.1 : 0.8,
    });
    label("read-label", "read", 198, 233, { kind: "small", anchor: "middle" });
    arrow("evidence-direction", [310, 190], [310, 266], {
      axis: "vertical",
      tone: "pending",
      opacity: 0.12 + correct * 0.68,
    });
    label("evidence-label", "patch-b", 361, 233, {
      kind: "small",
      anchor: "middle",
    });
  } else {
    arrow("issue-direction", [188, 215], [236, 215], {
      axis: "horizontal",
      tone: "pending",
      opacity: 0.12 + correct * 0.68,
    });
    label("issue-label", "issue C18", 212, 196, {
      kind: "small",
      anchor: "middle",
    });
    arrow("read-direction", [236, 278], [188, 278], {
      axis: "horizontal",
      opacity: reading && !ready ? 0.1 : 0.8,
    });
    label("read-label", "read", 212, 260, { kind: "small", anchor: "middle" });
    arrow("evidence-direction", [612, 237], [564, 237], {
      axis: "horizontal",
      tone: "pending",
      opacity: 0.12 + correct * 0.68,
    });
    label("evidence-label", "patch-b", 588, 218, {
      kind: "small",
      anchor: "middle",
    });
  }
  probe(scene.paths, "issue-direction", time, 0);
  probe(scene.paths, "read-direction", time, 1.8);
  probe(scene.paths, "evidence-direction", time, 3.6);

  const oldX = ledger.x + 20,
    cardY = ledger.y + 98;
  const width = (ledger.w - 56) / 2,
    newX = oldX + width + 16;
  label(
    "replay-state",
    ready ? "Rebuilt view" : "Recovery buffer",
    ledger.x + 25,
    ledger.y + 82,
    { kind: "heading" },
  );
  label(
    "replay-prefix",
    `0${applied} / 04`,
    ledger.x + ledger.w - 25,
    ledger.y + 82,
    { kind: "small", anchor: "end", tone: ready ? "neutral" : "pending" },
  );
  card("failed-c17", oldX, cardY, width, 132, "C17", "patch-a / hA", {
    tone: "fail",
    opacity: 1,
  });
  label("failed-review", "Review: Fail", oldX + 14, cardY + 71, {
    kind: "small",
    tone: "fail",
  });
  label("failed-state-prefix", "Validation", oldX + 14, cardY + 94, {
    kind: "status",
    tone: "fail",
  });
  label("failed-state", "Failed", oldX + 14, cardY + 117, {
    kind: "status",
    tone: "fail",
  });
  card(
    "successor-c18",
    newX,
    cardY,
    width,
    132,
    "C18",
    patchRecorded ? "patch-b / hB" : "Patch pending",
    {
      tone: "pending",
      opacity: 0.58 + correct * 0.42,
    },
  );
  label(
    "new-requirements",
    successor ? "Corrects C17" : "Record pending",
    newX + 14,
    cardY + 71,
    {
      kind: "small",
      tone: "pending",
    },
  );
  label(
    "new-review",
    workReceived ? "Work received" : successor ? "Work posted" : "",
    newX + 14,
    cardY + 93,
    {
      kind: "small",
      tone: "pending",
    },
  );
  label(
    "new-state",
    patchRecorded ? "Not evaluated" : "Await evidence",
    newX + 14,
    cardY + 117,
    {
      kind: "status",
      tone: "pending",
    },
  );

  // The successor points to its predecessor inside the same authoritative store.
  const oldCenter = oldX + width / 2,
    newCenter = newX + width / 2;
  const connectionY = ledger.y + 250;
  line(
    "successor-link",
    [
      [newCenter, cardY + 132],
      [newCenter, connectionY],
    ],
    "fine",
    0.55,
    "pending",
  );
  line(
    "predecessor-link",
    [
      [oldCenter, connectionY],
      [oldCenter, cardY + 132],
    ],
    "fine",
    0.55,
    "pending",
  );
  arrow("corrects", [newCenter, connectionY], [oldCenter, connectionY], {
    axis: "horizontal",
    tone: "pending",
    opacity: 0.4 + correct * 0.45,
  });
  label(
    "correction-label",
    successor ? "C18 corrects C17" : "C18 record pending",
    ledger.x + ledger.w / 2,
    ledger.y + 270,
    { kind: "small", tone: "pending", anchor: "middle" },
  );

  const history = {
    x: ledger.x + 20,
    y: ledger.y + 284,
    w: ledger.w - 40,
    h: 137,
  };
  box("history", history.x, history.y, history.w, history.h, { opacity: 0.55 });
  label(
    "history-title",
    "Append-only history",
    history.x + 20,
    history.y + 23,
    { kind: "heading" },
  );
  const entries = recordReaderReplayEvents;
  entries.forEach((text, index) =>
    label(
      "ledger-entry-" + index,
      text,
      history.x + 20,
      history.y + 46 + index * 20,
      { kind: "small", tone: index === 0 ? "fail" : "pending" },
    ),
  );
  const cursorY = history.y + 38 + cursor * 20;
  line(
    "read-cursor",
    [
      [history.x + 10, cursorY - 5],
      [history.x + 10, cursorY + 12],
      [history.x + 15, cursorY + 12],
    ],
    "light",
    0.85,
  );
  line(
    "read-window",
    [
      [history.x + 8, cursorY - 8],
      [history.x + history.w - 9, cursorY - 8],
      [history.x + history.w - 9, cursorY + 13],
      [history.x + 8, cursorY + 13],
      [history.x + 8, cursorY - 8],
    ],
    "glass",
    0.1 + replay * 0.3,
  );
  // The archive is read into an internal recovery buffer. Only a complete
  // prefix is exposed to the participant's read route.
  const applyX = ledger.x + ledger.w - 11;
  line(
    "replay-to-buffer",
    [
      [history.x + history.w - 8, cursorY + 2],
      [applyX, cursorY + 2],
      [applyX, cardY + 16],
      [newX + width, cardY + 16],
    ],
    "light",
    0.15 + replay * 0.65,
    "pending",
  );
  line(
    "replay-to-buffer-arrow",
    [
      [newX + width + 5, cardY + 12],
      [newX + width, cardY + 16],
      [newX + width + 5, cardY + 20],
    ],
    "edge",
    0.15 + replay * 0.65,
    "pending",
  );
  entries.forEach((_, index) => {
    const rowY = history.y + 51 + index * 20;
    line(
      "read-event-" + index,
      [
        [history.x + 20, rowY],
        [history.x + history.w - 20, rowY],
      ],
      "light",
      0.1 + replay * 0.7 * Math.exp(-((index - cursor) ** 2) * 3.5),
    );
  });
  line(
    "history-rule",
    [
      [history.x + 20, history.y + 30],
      [history.x + history.w - 20, history.y + 30],
    ],
    "fine",
    0.24,
  );
  return scene.frame();
}
