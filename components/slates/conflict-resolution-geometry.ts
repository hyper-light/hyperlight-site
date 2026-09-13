import type {
  ProofFrameFunction,
  ProofTone,
} from "../proof-work/proof-geometry";
import { easeLifecycle } from "../proof-work/lifecycle-drawing";
import { runtimeAlong } from "./runtime-drawing";
import {
  drawDesktopTower,
  type TowerActivityMode,
} from "./desktop-tower-drawing";
import {
  spatialDrawing,
  type Point2,
  type Point3,
  type Project3,
} from "./spatial-drawing";
import {
  conflictResolutionState,
  type ResolutionAuthor,
  type ResolutionRecheck,
} from "./conflict-resolution-data";

/** Two agent workers submit to one owner. Hardware stays fixed while edits,
 * operations, conflict windows and accepted snapshots travel between nodes. */
function resolutionFrame(
  author: ResolutionAuthor,
  recheck: ResolutionRecheck,
): ProofFrameFunction {
  return (time, selection, portrait) => {
    const d = spatialDrawing();
    // The study clock stops when paused, hidden or reduced-motion is enabled.
    // Cooling and power indicators use this clock; edits and packets do not.
    const elapsed = Number.isFinite(time) ? Math.max(0, time) : 0;
    const state = conflictResolutionState(selection, author, recheck);
    const phase = (a: number, b: number) =>
      easeLifecycle((state.position - a) / (b - a));
    const edit1 = phase(0.08, 0.9),
      edit2 = phase(0.15, 0.98),
      revision = phase(4.12, 4.7),
      competingEdit = recheck === "changed" ? phase(5.42, 5.64) : 0;
    const project =
      (origin: Point2): Project3 =>
      ([x, y, z]) => [origin[0] + x + y * 0.32, origin[1] - y * 0.42 - z];
    const owner = project(portrait ? [46, 720] : [502, 374]);
    const ow = portrait ? 307 : 244;
    const tower1 = project(portrait ? [62, 295] : [58, 276]);
    const tower2 = project(portrait ? [62, 535] : [58, 514]);
    // These are inscription coordinates on the case's integrated vertical
    // display, not standalone screens or human-operated terminals.
    const worker: Project3 = ([x, y, z]) => tower1([84 + x, y, z]);
    const second: Project3 = ([x, y, z]) => tower2([84 + x, y, z]);
    const liveOwner = 1;
    const frontAxes = [
      [1, 0, 0],
      [0, 0, -1],
    ] as const;
    const line = (
      id: string,
      q: Project3,
      points: Point3[],
      opacity = 0.6,
      tone?: ProofTone,
    ) => d.line(id, points.map(q), { opacity, tone });
    const front = (
      id: string,
      q: Project3,
      x: number,
      y: number,
      z: number,
      w: number,
      h: number,
      material: "metal" | "silicon" | "circuit" | "emissive" = "silicon",
      opacity = 1,
      tone?: ProofTone,
    ) => {
      d.face(
        id,
        [
          [x, y, z],
          [x + w, y, z],
          [x + w, y, z + h],
          [x, y, z + h],
        ].map(([a, b, c]) => q([a, b, c])),
        material,
        opacity,
        tone,
      );
    };
    const ink = (
      id: string,
      text: string,
      q: Project3,
      x: number,
      z: number,
      surface: string,
      kind: "small" | "label" | "name" = "small",
      tone: ProofTone = "neutral",
      opacity = 1,
      y = -0.8,
      anchor: "start" | "end" = "start",
    ) => {
      d.surfaceLabel(
        id,
        text,
        q,
        [x, y, z],
        { surface, kind, tone, opacity, anchor },
        frontAxes,
      );
    };

    function packet(
      id: string,
      route: Point2[],
      progress: number,
      opacity: number,
      tone: ProofTone = "pending",
    ) {
      const q = project(runtimeAlong(route, progress));
      d.solid(id, q, [-5, 0, -3], [10, 5, 6], {
        material: "emissive",
        tone,
        opacity,
      });
      line(
        id + "-payload",
        q,
        [
          [-2, -0.1, -1],
          [2, -0.1, -1],
          [-2, -0.1, 1],
          [2, -0.1, 1],
        ],
        opacity,
        tone,
      );
    }
    const travelling = (p: number) => Math.min(1, p * 12, (1 - p) * 12);
    const typing = (from: string, to: string, p: number) =>
      p <= 0
        ? from
        : p >= 1
          ? to
          : p < 0.45
            ? from.slice(0, Math.ceil(from.length * (1 - p / 0.45)))
            : p > 0.55
              ? to.slice(0, Math.floor((to.length * (p - 0.55)) / 0.45))
              : "";
    const initialSubmit = phase(1.08, 1.47),
      initialCommit = phase(1.5, 1.6),
      initialReply = phase(1.62, 1.98);
    const staleSubmit = phase(2.08, 2.4),
      conflictReply = phase(2.66, 2.98);
    const readRequest = phase(3.08, 3.38),
      readReply = phase(3.46, 3.9);
    const freshCopy = phase(3.9, 4),
      reviseSubmit = phase(5.1, 5.96);
    const finalCheck = phase(6.36, 6.68),
      finalReply = phase(6.72, 6.98);
    const competingSubmit = recheck === "changed" ? phase(5.68, 6.28) : 0,
      competingReply = recheck === "changed" ? phase(6.31, 6.65) : 0;
    const worker1Mode: TowerActivityMode =
      recheck === "changed" && state.position >= 5.4
        ? state.position < 5.68
          ? "edit"
          : state.position < 6.65
            ? "send"
            : "accepted"
        : state.position < 0.08
          ? "idle"
          : state.position < 1.08
            ? "edit"
            : state.firstNotified
              ? "accepted"
              : "send";
    const worker2Mode: TowerActivityMode = state.finalNotified
      ? state.refusedAgain
        ? "conflict"
        : "accepted"
      : state.position < 0.15
        ? "idle"
        : state.position < 2.08
          ? "edit"
          : state.position < 2.98
            ? "send"
            : state.position < 3.08
              ? "conflict"
              : state.position < 4.12
                ? "read"
                : state.position < 4.7
                  ? "edit"
                  : state.position < 5.1
                    ? "verify"
                    : "send";
    const ownerMode: TowerActivityMode =
      state.position < 1.08
        ? "idle"
        : state.position < 1.6
          ? "verify"
          : state.position < 2.08
            ? "accepted"
            : state.position < 2.64
              ? "verify"
              : state.position < 3.08
                ? "conflict"
                : state.position < 4.12
                  ? "read"
                  : state.position < 5.1
                    ? "idle"
                    : state.position < 6.7
                      ? "verify"
                      : state.refusedAgain
                        ? "conflict"
                        : "accepted";
    const action =
      state.position < 0.08
        ? "Two agents clone the same version: r0."
        : state.position < 1.08
          ? "Both agents replace the same 80."
          : state.position < 2.08
            ? "Agent 1 submits 90; owner accepts r1."
            : state.position < 2.66
              ? "Agent 2 submits 60 against the old r0."
              : state.position < 3.08
                ? "Owner returns 80 / 90 / 60 to Agent 2."
                : state.position < 4.12
                  ? "Agent 2 reads r1 and starts fresh work."
                  : state.position < 5.1
                    ? author === "human"
                      ? "A human reviews Agent 2’s new edit."
                      : "Agent 2 chooses 85 and runs checks."
                    : state.position < 6.3
                      ? "Agent 2 resubmits its edit against r1."
                      : state.position < 7
                        ? state.headChanged
                          ? "Agent 1 changed head; compare again."
                          : "Owner checks the new edit against r1."
                        : state.refusedAgain
                          ? "Conflict again: keep the accepted 70."
                          : "Accepted: shared r2 contains quality=85.";
    d.label("resolution-heading", "TWO AGENTS · ONE OVERLAPPING EDIT", 24, 25, {
      kind: "heading",
    });
    d.label("resolution-action", action, 24, 49, {
      kind: "small",
      tone: state.refusedAgain ? "fail" : "neutral",
    });
    d.label(
      "agent1-title",
      "AGENT 1 · WORKER NODE",
      portrait ? 62 : 58,
      portrait ? 80 : 66,
      { kind: "heading", tone: "pass" },
    );
    d.label(
      "agent2-title",
      "AGENT 2 · WORKER NODE",
      portrait ? 62 : 58,
      portrait ? 320 : 304,
      { kind: "heading", tone: "pending" },
    );
    d.label(
      "owner-title",
      "SHARED VOLUME OWNER",
      portrait ? 46 : 502,
      portrait ? 592 : 248,
      { kind: "heading" },
    );

    // Small-screen lettering is larger, so preserve its readable measure.
    // Desktop needs only a compact gutter beyond the shared value column.
    const caseDisplayWidth = portrait ? 100 : 90;
    const port1 = drawDesktopTower(d, tower1, {
      id: "agent1-tower",
      tone: "pass",
      activity: state.position < 5.4 ? edit1 : competingEdit,
      phase: state.position + elapsed * 1.7,
      displayWidth: caseDisplayWidth,
      depth: 90,
      response: { mode: worker1Mode, time: elapsed },
    });
    const port2 = drawDesktopTower(d, tower2, {
      id: "agent2-tower",
      tone: "pending",
      activity: state.position < 1.1 ? edit2 : revision,
      phase: state.position + elapsed * 1.7 + 0.7,
      displayWidth: caseDisplayWidth,
      depth: 90,
      response: { mode: worker2Mode, time: elapsed },
    });
    const screen1 = "agent1-tower-integrated-display";
    for (const [id, tower, offset, io] of [
      [
        "agent1",
        tower1,
        0,
        Math.max(
          travelling(initialSubmit),
          travelling(initialReply),
          travelling(competingSubmit),
          travelling(competingReply),
        ),
      ],
      [
        "agent2",
        tower2,
        1.2,
        Math.max(
          travelling(staleSubmit),
          travelling(conflictReply),
          travelling(readRequest),
          travelling(readReply),
          travelling(reviseSubmit),
          travelling(finalReply),
        ),
      ],
    ] as const) {
      const pulse = (Math.sin(elapsed * 2.4 + offset) + 1) / 2;
      front(
        id + "-power-led",
        tower,
        10,
        -0.4,
        8,
        5,
        2,
        "emissive",
        0.3 + pulse * 0.35,
        id === "agent1" ? "pass" : "pending",
      );
      line(
        id + "-network-activity",
        tower,
        [
          [110 + caseDisplayWidth, 90, 72],
          [112 + caseDisplayWidth, 90, 72],
          [112 + caseDisplayWidth, 90, 77],
        ],
        io,
        id === "agent1" ? "pass" : "pending",
      );
    }
    const screen2 = "agent2-tower-integrated-display";
    const displayInset = 10;
    // One value column for versions, bytes and changing statuses. Leave one
    // character after the longest field name (ACCEPT / TESTED), not a full
    // screen-width gap after the shorter BASE / HEAD / EDIT labels.
    const valueColumn = portrait ? 62 : 58;
    function fieldRow(
      id: string,
      valueId: string,
      name: string,
      value: string,
      q: Project3,
      z: number,
      surface: string,
      tone: ProofTone = "neutral",
      nameTone: ProofTone = "neutral",
    ) {
      ink(id, name, q, displayInset, z, surface, "small", nameTone);
      ink(valueId, value, q, valueColumn, z, surface, "small", tone);
    }
    function statusRow(
      id: string,
      text: string,
      q: Project3,
      surface: string,
      tone: ProofTone,
    ) {
      const [name, version = ""] = text.split(" ");
      fieldRow(id, id + "-value", name, version, q, 33, surface, tone, tone);
    }
    ink("agent1-file", "image.conf", worker, displayInset, 133, screen1);
    fieldRow(
      "agent1-work",
      "agent1-work-value",
      "work",
      recheck === "changed" && state.position >= 5.4 ? "r1" : "r0",
      worker,
      113,
      screen1,
    );
    // Both case displays use the same field grid; updates change text only.
    function readout(
      id: "agent1" | "agent2",
      q: Project3,
      surface: string,
      values: string[],
      tones: ProofTone[],
    ) {
      ["BASE", "HEAD", "EDIT"].forEach((name, i) => {
        const z = 93 - i * 20;
        const labelId =
          id === "agent1"
            ? ["agent1-base", "agent1-head", "agent1-key"][i]
            : "agent2-evidence-name-" + i;
        const valueId =
          id === "agent1"
            ? ["agent1-base-value", "agent1-head-value", "agent1-value"][i]
            : "agent2-evidence-value-" + i;
        fieldRow(labelId, valueId, name, values[i], q, z, surface, tones[i]);
      });
    }
    readout(
      "agent1",
      worker,
      screen1,
      [
        recheck === "changed" && state.position >= 5.4 ? "90" : "80",
        recheck === "changed" && state.position >= 6.65
          ? "70"
          : state.firstNotified
            ? "90"
            : "80",
        recheck === "changed" && state.position >= 5.4
          ? typing("90", "70", competingEdit)
          : typing("80", "90", edit1),
      ],
      [
        "neutral",
        state.firstNotified ? "pass" : "neutral",
        edit1 > 0 ? "pass" : "neutral",
      ],
    );
    statusRow(
      "agent1-status",
      recheck === "changed" && state.position >= 6.65
        ? "ACCEPT r2"
        : recheck === "changed" && state.position >= 5.68
          ? "SEND r1"
          : recheck === "changed" && state.position >= 5.4
            ? "EDIT r1"
            : state.firstNotified
              ? "ACCEPT r1"
              : state.position > 1.08
                ? "SEND r0"
                : "WORK r0",
      worker,
      screen1,
      state.firstNotified ? "pass" : "neutral",
    );
    line(
      "agent1-selection",
      worker,
      [
        [valueColumn - 1, -1, 49],
        [valueColumn + 16, -1, 49],
      ],
      Math.max(travelling(edit1), travelling(competingEdit)),
      "pass",
    );

    const returned = state.conflictReturned;
    const local2 =
      state.position < 3.9
        ? typing("80", "60", edit2)
        : state.position < 4.12
          ? typing("60", "90", freshCopy)
          : typing("90", "85", revision);
    ink("agent2-file", "image.conf", second, displayInset, 133, screen2);
    fieldRow(
      "agent2-work",
      "agent2-work-value",
      "work",
      state.agent2BaseVersion,
      second,
      113,
      screen2,
    );
    readout(
      "agent2",
      second,
      screen2,
      [
        state.agent2Base,
        state.finalNotified ? state.head : returned ? "90" : "80",
        local2,
      ],
      [
        "neutral",
        returned ? "pass" : "neutral",
        returned && !state.freshWork
          ? "fail"
          : state.freshWork
            ? "pass"
            : "neutral",
      ],
    );
    const status =
      state.refusedAgain && state.finalNotified
        ? "CONFLICT"
        : state.resolved && state.finalNotified
          ? "ACCEPT r2"
          : state.resubmitted
            ? "SENT r1"
            : state.revised
              ? "TESTED r1"
              : state.freshWork
                ? "WORK r1"
                : returned
                  ? "CONFLICT"
                  : state.position >= 2.08
                    ? "SEND r0"
                    : "WORK r0";
    statusRow(
      "agent2-status",
      status,
      second,
      screen2,
      state.refusedAgain || (returned && !state.freshWork)
        ? "fail"
        : state.revised
          ? "pass"
          : "neutral",
    );
    line(
      "agent2-selection",
      second,
      [
        [valueColumn - 1, -1, 49],
        [valueColumn + 16, -1, 49],
      ],
      Math.max(travelling(edit2), travelling(revision)),
      state.position < 4 ? "pending" : "pass",
    );
    // Optional human review is acknowledged on the case; it does not add a
    // human workstation or change which autonomous node submits the revision.
    line(
      "review-pointer",
      second,
      [
        [72, -1, 23],
        [76, -1, 19],
        [83, -1, 27],
      ],
      author === "human" ? travelling(revision) : 0,
      "pass",
    );
    line(
      "agent2-check-sweep",
      second,
      [
        [6, -1, 17],
        [6 + phase(4.72, 4.98) * 78, -1, 17],
      ],
      travelling(phase(4.72, 4.98)),
      "pass",
    );
    // A thin circuit raft carries open storage blades and upright status glass.
    // Neither pane is a drive enclosure: the exposed layers remain visible
    // around their edges. Existing lettering and message ports stay fixed.
    const dx = 145,
      dw = ow - 159;
    const raft: Point3[] = [
      [0, 9, 6],
      [9, 0, 6],
      [ow - 10, 0, 6],
      [ow, 10, 6],
      [ow, 37, 6],
      [ow - 9, 46, 6],
      [9, 46, 6],
      [0, 37, 6],
    ];
    d.face(
      "owner-raft-shadow",
      raft.map(([x, y]) => owner([x + 2, y + 2, -1])),
      "shadow",
      0.35,
    );
    d.face(
      "owner-raft-near-edge",
      [
        owner([9, 0, 6]),
        owner([ow - 10, 0, 6]),
        owner([ow - 10, 0, 1]),
        owner([9, 0, 1]),
      ],
      "metal",
      liveOwner * 0.7,
    );
    d.face(
      "owner-raft-right-edge",
      [
        owner([ow - 10, 0, 6]),
        owner([ow, 10, 6]),
        owner([ow, 37, 6]),
        owner([ow, 37, 1]),
        owner([ow, 10, 1]),
        owner([ow - 10, 0, 1]),
      ],
      "metal",
      liveOwner * 0.5,
    );
    d.face("owner-raft", raft.map(owner), "metal", liveOwner * 0.78);
    // A milled lip has an actual sloping face and a dark gasket underneath it.
    d.face(
      "owner-raft-machined-bevel",
      [
        owner([9, 0, 6]),
        owner([ow - 10, 0, 6]),
        owner([ow - 14, 3, 8]),
        owner([13, 3, 8]),
      ],
      "metal",
      liveOwner * 0.95,
    );
    d.face(
      "owner-raft-gasket",
      [
        owner([10, 0, 1]),
        owner([ow - 11, 0, 1]),
        owner([ow - 11, 0, 2.4]),
        owner([10, 0, 2.4]),
      ],
      "silicon",
      liveOwner * 0.85,
    );
    line(
      "owner-raft-tooling-seam",
      owner,
      [
        [9, 1, 4.4],
        [ow - 12, 1, 4.4],
      ],
      liveOwner * 0.48,
    );
    d.face(
      "owner-circuit-bed",
      [
        owner([10, 10, 7]),
        owner([16, 4, 7]),
        owner([ow - 17, 4, 7]),
        owner([ow - 9, 12, 7]),
        owner([ow - 9, 35, 7]),
        owner([ow - 16, 41, 7]),
        owner([16, 41, 7]),
        owner([10, 35, 7]),
      ],
      "circuit",
      liveOwner * 0.88,
    );
    for (let hole = 0; hole < 4; hole++) {
      const x = hole % 2 ? ow - 15 : 16,
        y = hole < 2 ? 9 : 35;
      d.face(
        "owner-board-through-hole-" + hole,
        Array.from({ length: 17 }, (_, i) =>
          owner([
            x + 2.1 * Math.cos((i * Math.PI) / 8),
            y + 2.1 * Math.sin((i * Math.PI) / 8),
            7.5,
          ]),
        ),
        "metal",
        liveOwner * 0.72,
      );
      d.face(
        "owner-board-through-hole-core-" + hole,
        Array.from({ length: 13 }, (_, i) =>
          owner([
            x + 0.95 * Math.cos((i * Math.PI) / 6),
            y + 0.95 * Math.sin((i * Math.PI) / 6),
            7.7,
          ]),
        ),
        "silicon",
        liveOwner * 0.92,
      );
    }
    line(
      "owner-raft-edge-light",
      owner,
      [
        [12, 0, 6.3],
        [74, 0, 6.3],
        [83, 5, 6.3],
        [119, 5, 6.3],
      ],
      0.48 * liveOwner,
      "pass",
    );
    line(
      "owner-raft-right-light",
      owner,
      [
        [ow - 74, 0, 6.3],
        [ow - 12, 0, 6.3],
        [ow - 2, 10, 6.3],
      ],
      0.4 * liveOwner,
      "pending",
    );
    for (let i = 0; i < 7; i++) {
      const x = 18 + i * 14;
      line(
        "owner-board-trace-" + i,
        owner,
        [
          [x, 5, 7.3],
          [x, 12, 7.3],
          [x + 6, 18, 7.3],
          [x + 6, 35, 7.3],
          [134 + i * 3, 35, 7.3],
          [143 + i * 3, 27, 7.3],
        ],
        0.22 * liveOwner,
        i < 3 ? "pass" : "neutral",
      );
      front(
        "owner-edge-contact-" + i,
        owner,
        19 + i * 14,
        -0.15,
        2,
        7,
        2,
        "metal",
        0.45,
      );
    }
    d.solid("owner-compute-substrate", owner, [30, 15, 8], [51, 21, 3], {
      material: "circuit",
      opacity: liveOwner * 0.8,
    });
    d.solid("owner-compute-die", owner, [39, 18, 11], [30, 14, 4], {
      material: "silicon",
      opacity: liveOwner * 0.9,
    });
    for (let i = 0; i < 9; i++) {
      line(
        "owner-compute-pin-" + i,
        owner,
        [
          [35 + i * 4, 13, 10.5],
          [35 + i * 4, 18, 10.5],
        ],
        0.45,
      );
      line(
        "owner-compute-etch-" + i,
        owner,
        [
          [41 + i * 3, 20, 15.3],
          [41 + i * 3, 29, 15.3],
        ],
        0.3,
      );
    }
    for (let i = 0; i < 3; i++)
      d.solid(
        "owner-memory-package-" + i,
        owner,
        [91 + i * 13, 17, 8],
        [8, 17, 4],
        { material: "silicon", opacity: liveOwner * 0.75 },
      );
    // The near daughterboard stays in front of the status panes rather than
    // concealing every circuit behind their glass. Its cooling fins, DRAM and
    // connector pads fit in the existing 24-unit band below the lettering.
    d.solid("owner-near-daughterboard", owner, [30, -12, 7], [103, 17, 2.5], {
      material: "circuit",
      opacity: liveOwner * 0.94,
    });
    d.solid("owner-near-chip-carrier", owner, [39, -9, 9.5], [39, 12, 3], {
      material: "silicon",
      opacity: liveOwner * 0.96,
    });
    d.solid("owner-near-heat-spreader", owner, [44, -8, 12.5], [29, 11, 2.5], {
      material: "metal",
      opacity: liveOwner * 0.87,
    });
    for (let fin = 0; fin < 8; fin++)
      d.solid(
        "owner-near-cooling-fin-" + fin,
        owner,
        [45 + fin * 3.4, -8, 15],
        [1.4, 11, 4.5],
        { material: "metal", opacity: liveOwner * 0.75 },
      );
    for (let chip = 0; chip < 3; chip++) {
      const x = 87 + chip * 14;
      d.solid("owner-near-memory-" + chip, owner, [x, -10, 9.5], [9, 13, 5], {
        material: "silicon",
        opacity: liveOwner * 0.95,
      });
      line(
        "owner-near-memory-mark-" + chip,
        owner,
        [
          [x + 2, -6, 14.8],
          [x + 7, -6, 14.8],
        ],
        liveOwner * 0.6,
      );
      for (let pin = 0; pin < 4; pin++)
        line(
          "owner-near-memory-pin-" + chip + "-" + pin,
          owner,
          [
            [x + 1 + pin * 2, -12, 10.2],
            [x + 1 + pin * 2, -9, 10.2],
          ],
          liveOwner * 0.7,
        );
    }
    for (let via = 0; via < 8; via++) {
      const x = 35 + via * 13;
      d.face(
        "owner-near-via-" + via,
        Array.from({ length: 13 }, (_, i) =>
          owner([
            x + 1.05 * Math.cos((i * Math.PI) / 6),
            -10 + 1.05 * Math.sin((i * Math.PI) / 6),
            9.8,
          ]),
        ),
        "metal",
        liveOwner * 0.7,
      );
      line(
        "owner-near-trace-" + via,
        owner,
        [
          [x, -8, 9.9],
          [x, -3, 9.9],
          [x + 3, 0, 9.9],
          [x + 3, 4, 9.9],
        ],
        liveOwner * 0.48,
        via % 3 === 0 ? "pass" : "neutral",
      );
    }
    // Seven individually vented blades make the media stack legible from its
    // stepped far edge, with no enclosing wall or full-height opaque chassis.
    for (let layer = 0; layer < 7; layer++) {
      const z = 12 + layer * 12,
        offset = layer % 2 ? 1.5 : 0;
      const outline: Point3[] = [
        [dx + 2 + offset, 12, z + 2],
        [dx + 7 + offset, 7, z + 2],
        [dx + dw - 7, 7, z + 2],
        [dx + dw - 1, 13, z + 2],
        [dx + dw - 1, 36, z + 2],
        [dx + dw - 7, 42, z + 2],
        [dx + 7 + offset, 42, z + 2],
        [dx + 2 + offset, 37, z + 2],
      ];
      d.face(
        "owner-storage-blade-" + layer,
        outline.map(owner),
        "metal",
        liveOwner * (layer === 6 ? 0.83 : 0.62),
      );
      d.face(
        "owner-storage-edge-" + layer,
        [
          owner([dx + dw - 1, 13, z + 2]),
          owner([dx + dw - 1, 36, z + 2]),
          owner([dx + dw - 1, 36, z - 2]),
          owner([dx + dw - 1, 13, z - 2]),
        ],
        "silicon",
        liveOwner * 0.85,
      );
      d.face(
        "owner-storage-front-face-" + layer,
        [
          owner([dx + 7 + offset, 7, z + 2]),
          owner([dx + dw - 7, 7, z + 2]),
          owner([dx + dw - 7, 7, z - 2]),
          owner([dx + 7 + offset, 7, z - 2]),
        ],
        "metal",
        liveOwner * 0.72,
      );
      d.face(
        "owner-storage-front-bevel-" + layer,
        [
          owner([dx + 7 + offset, 7, z + 2]),
          owner([dx + dw - 7, 7, z + 2]),
          owner([dx + dw - 9, 9, z + 2.7]),
          owner([dx + 9 + offset, 9, z + 2.7]),
        ],
        "metal",
        liveOwner * 0.88,
      );
      d.face(
        "owner-storage-underlay-" + layer,
        [
          owner([dx + dw - 1, 13, z - 2]),
          owner([dx + dw - 1, 36, z - 2]),
          owner([dx + dw - 3, 38, z - 3]),
          owner([dx + dw - 3, 14, z - 3]),
        ],
        "circuit",
        liveOwner * 0.83,
      );
      d.solid(
        "owner-storage-controller-" + layer,
        owner,
        [dx + dw - 14, 19, z + 2.8],
        [8, 13, 2.2],
        { material: "silicon", opacity: liveOwner * 0.9 },
      );
      for (let contact = 0; contact < 4; contact++)
        line(
          "owner-storage-controller-pin-" + layer + "-" + contact,
          owner,
          [
            [dx + dw - 15, 21 + contact * 3, z + 3],
            [dx + dw - 12, 21 + contact * 3, z + 3],
          ],
          liveOwner * 0.6,
        );
      line(
        "owner-storage-rim-" + layer,
        owner,
        [
          [dx + dw - 7, 7, z + 2.2],
          [dx + dw - 1, 13, z + 2.2],
          [dx + dw - 1, 33, z + 2.2],
        ],
        liveOwner * 0.37,
        "pending",
      );
      for (let vent = 0; vent < 5; vent++)
        line(
          "owner-storage-vent-" + layer + "-" + vent,
          owner,
          [
            [dx + 15 + (vent * (dw - 31)) / 5, 29, z + 2.3],
            [dx + 15 + (vent * (dw - 31)) / 5, 37, z + 2.3],
          ],
          0.28 * liveOwner,
        );
      if (layer === 6) {
        for (let packageIndex = 0; packageIndex < 3; packageIndex++) {
          const x = dx + 13 + (packageIndex * (dw - 39)) / 3;
          d.solid(
            "owner-ram-chip-" + packageIndex,
            owner,
            [x, 14, z + 2.8],
            [(dw - 49) / 3, 10, 3],
            { material: "silicon", opacity: liveOwner * 0.96 },
          );
          line(
            "owner-ram-chip-mark-" + packageIndex,
            owner,
            [
              [x + 3, 18, z + 6],
              [x + (dw - 49) / 3 - 3, 18, z + 6],
            ],
            liveOwner * 0.58,
          );
        }
      }
    }
    line(
      "owner-storage-spine",
      owner,
      [
        [dx + dw - 6, 38, 8],
        [dx + dw - 6, 38, 87],
      ],
      0.45,
      "pending",
    );
    // Thin glass is held at two small coupling points, not a monitor stand.
    for (const [id, x] of [
      ["controller", 19],
      ["media", dx + 12],
    ] as const) {
      d.solid("owner-" + id + "-coupler", owner, [x, 0, 7], [7, 6, 11], {
        material: "metal",
        opacity: liveOwner * 0.6,
      });
      line(
        "owner-" + id + "-optical-link",
        owner,
        [
          [x + 3, 2, 16],
          [x + 3, 2, 24],
        ],
        liveOwner * 0.45,
        "pass",
      );
    }
    d.face(
      "owner-controller-glass-rim",
      [
        owner([15, 0, 28]),
        owner([20, 0, 23]),
        owner([125, 0, 23]),
        owner([130, 0, 28]),
        owner([130, 0, 99]),
        owner([125, 0, 104]),
        owner([20, 0, 104]),
        owner([15, 0, 99]),
      ],
      "silicon",
      liveOwner * 0.63,
    );
    front(
      "owner-controller-display",
      owner,
      18,
      -0.5,
      27,
      107,
      72,
      "silicon",
      liveOwner * 0.95,
    );
    line(
      "owner-controller-glass-highlight",
      owner,
      [
        [18, -0.7, 76],
        [18, -0.7, 98],
        [23, -0.7, 102],
        [62, -0.7, 102],
      ],
      liveOwner * 0.55,
      "pass",
    );
    line(
      "owner-controller-glass-lower-edge",
      owner,
      [
        [82, -0.7, 25],
        [122, -0.7, 25],
        [127, -0.7, 30],
      ],
      liveOwner * 0.32,
      "pass",
    );
    ink(
      "owner-task",
      "MERGE OWNER",
      owner,
      30,
      78,
      "owner-controller-display",
      "small",
      "pending",
    );
    ink(
      "owner-comparison",
      state.position < 2
        ? "80 → 90"
        : state.position < 3
          ? "90 ≠ 60"
          : state.position < 6
            ? "HEAD · r1"
            : state.headChanged
              ? "70 ≠ 85"
              : "90 → 85",
      owner,
      30,
      60,
      "owner-controller-display",
      "small",
      state.refusedAgain || (state.conflictReturned && !state.freshWork)
        ? "fail"
        : "neutral",
    );
    ink(
      "owner-verdict",
      state.refusedAgain
        ? "KEEP r2"
        : state.resolved
          ? "ACCEPT r2"
          : state.resubmitted
            ? `CHECK ${state.headVersion}`
            : state.conflictReturned
              ? "KEEP r1"
              : state.firstAccepted
                ? "ACCEPT r1"
                : "HEAD r0",
      owner,
      30,
      40,
      "owner-controller-display",
      "small",
      state.refusedAgain || (state.conflictReturned && !state.freshWork)
        ? "fail"
        : state.firstAccepted
          ? "pass"
          : "neutral",
    );
    d.face(
      "owner-drive-glass-rim",
      [
        owner([dx - 3, 4.7, 26]),
        owner([dx + 2, 4.7, 21]),
        owner([dx + dw - 2, 4.7, 21]),
        owner([dx + dw + 3, 4.7, 26]),
        owner([dx + dw + 3, 4.7, 91]),
        owner([dx + dw - 2, 4.7, 96]),
        owner([dx + 2, 4.7, 96]),
        owner([dx - 3, 4.7, 91]),
      ],
      "silicon",
      liveOwner * 0.66,
    );
    front(
      "owner-drive-display",
      owner,
      dx,
      4.4,
      24,
      dw,
      69,
      "silicon",
      liveOwner * 0.95,
    );
    line(
      "owner-drive-glass-highlight",
      owner,
      [
        [dx, 4.1, 77],
        [dx, 4.1, 91],
        [dx + 5, 4.1, 95],
        [dx + dw - 11, 4.1, 95],
      ],
      liveOwner * 0.44,
      "pending",
    );
    line(
      "owner-drive-glass-lower-edge",
      owner,
      [
        [dx + dw - 34, 4.1, 23],
        [dx + dw - 9, 4.1, 23],
        [dx + dw - 5, 4.1, 27],
      ],
      liveOwner * 0.3,
      "pending",
    );
    ink(
      "target-file-name",
      "image.conf",
      owner,
      dx + 10,
      73,
      "owner-drive-display",
      "small",
      "neutral",
      1,
      4.2,
    );
    ink(
      "target-file-byte",
      state.head,
      owner,
      dx + 10,
      54,
      "owner-drive-display",
      "small",
      state.refusedAgain ? "fail" : state.firstAccepted ? "pass" : "neutral",
      1,
      4.2,
    );
    ink(
      "target-file-kind",
      "HEAD " + state.headVersion,
      owner,
      dx + 10,
      36,
      "owner-drive-display",
      "small",
      "neutral",
      0.7,
      4.2,
    );
    // The two lane routes never cross a display. Return packets use the same
    // lane in reverse, making the recipient of a conflict or snapshot explicit.
    const lane1: Point2[] = portrait
      ? [port1, [404, port1[1]], [404, 640], owner([ow + 2, 0, 80])]
      : [port1, [390, port1[1]], [390, 296], owner([18, 0, 78])];
    const lane2: Point2[] = portrait
      ? [port2, [392, port2[1]], [392, 673], owner([ow + 2, 0, 47])]
      : [port2, [414, port2[1]], [414, 322], owner([18, 0, 52])];
    const a1 = Math.max(
      travelling(initialSubmit),
      travelling(initialReply),
      travelling(competingSubmit),
      travelling(competingReply),
    );
    const outbound = Math.max(
      travelling(staleSubmit),
      travelling(readRequest),
      travelling(reviseSubmit),
    );
    const inbound = Math.max(
      travelling(conflictReply),
      travelling(readReply),
      travelling(finalReply),
    );
    d.line("agent1-owner-lane", lane1, {
      opacity: 0.14 + 0.7 * a1,
      tone: "pass",
    });
    d.line("agent2-owner-lane", lane2, {
      opacity: 0.14 + 0.7 * Math.max(outbound, inbound),
      tone:
        travelling(conflictReply) > 0 || state.refusedAgain
          ? "fail"
          : "pending",
    });
    packet(
      "agent1-submission",
      lane1,
      initialSubmit,
      travelling(initialSubmit),
      "pass",
    );
    packet(
      "agent1-acceptance",
      [...lane1].reverse(),
      initialReply,
      travelling(initialReply),
      "pass",
    );
    packet(
      "agent1-next-submission",
      lane1,
      competingSubmit,
      travelling(competingSubmit),
      "pass",
    );
    packet(
      "agent1-next-acceptance",
      [...lane1].reverse(),
      competingReply,
      travelling(competingReply),
      "pass",
    );
    packet(
      "agent2-stale-submission",
      lane2,
      staleSubmit,
      travelling(staleSubmit),
      "pending",
    );
    packet(
      "conflict-report",
      [...lane2].reverse(),
      conflictReply,
      travelling(conflictReply),
      "fail",
    );
    packet(
      "head-read-request",
      lane2,
      readRequest,
      travelling(readRequest),
      "pending",
    );
    packet(
      "accepted-head-snapshot",
      [...lane2].reverse(),
      readReply,
      travelling(readReply),
      "pass",
    );
    packet(
      "revised-submission",
      lane2,
      reviseSubmit,
      travelling(reviseSubmit),
      "pending",
    );
    packet(
      "owner-final-reply",
      [...lane2].reverse(),
      finalReply,
      travelling(finalReply),
      state.headChanged ? "fail" : "pass",
    );
    d.label(
      "agent1-message",
      state.position >= 5.68 ? "70 · base r1" : "90 · base r0",
      portrait ? 24 : 350,
      portrait ? 302 : port1[1] - 24,
      { kind: "small", tone: "pass", opacity: portrait ? 0 : a1 },
    );
    d.label(
      "agent2-message",
      travelling(conflictReply) > 0
        ? "80 / 90 / 60"
        : travelling(readReply) > 0
          ? "r1 · quality=90"
          : travelling(reviseSubmit) > 0
            ? "85 · base r1"
            : travelling(finalReply) > 0
              ? state.headChanged
                ? "CONFLICT · r2"
                : "ACCEPTED · r2"
              : "60 · base r0",
      portrait ? 24 : 350,
      portrait ? 561 : 470,
      {
        kind: "small",
        tone:
          travelling(conflictReply) > 0 || state.headChanged
            ? "fail"
            : "pending",
        opacity: portrait ? 0 : Math.max(outbound, inbound),
      },
    );
    const comparing = Math.max(
      travelling(phase(2.42, 2.64)),
      travelling(finalCheck),
    );
    line(
      "owner-compare-signal",
      owner,
      [
        [128, -10, 10],
        [81, -10, 10],
        [76, -5, 10],
        [67, -5, 15.3],
      ],
      comparing,
      "pending",
    );
    const commit = state.headChanged
      ? travelling(initialCommit)
      : Math.max(travelling(initialCommit), travelling(phase(6.66, 6.71)));
    front(
      "owner-head-update-light",
      owner,
      dx + dw - 31,
      -0.3,
      2.4,
      17,
      2.4,
      "emissive",
      commit,
      "pass",
    );
    line(
      "owner-head-update-bus",
      owner,
      [
        [136, -3, 8.2],
        [146, -3, 8.2],
        [153, 3, 8.2],
        [dx + dw - 26, 3, 8.2],
      ],
      commit,
      "pass",
    );
    // This study ends at the shared version. It never represents a disk grant.
    front(
      "owner-power-led",
      owner,
      15,
      -0.3,
      2.2,
      8,
      1.8,
      "emissive",
      0.4 + (0.25 * (Math.sin(elapsed * 2.4 + 2.1) + 1)) / 2,
      "pass",
    );
    const corePulse = (Math.sin(elapsed * 3) + 1) / 2;
    d.face(
      "owner-service-light",
      [
        owner([41 + corePulse * 21, 19, 15.5]),
        owner([44 + corePulse * 21, 19, 15.5]),
        owner([44 + corePulse * 21, 27, 15.5]),
        owner([41 + corePulse * 21, 27, 15.5]),
      ],
      "emissive",
      0.28 + comparing * 0.5,
      "pending",
    );
    // Hardware telemetry continues during a held stage. It never commits a
    // version or sends another operation: those paths remain selection-driven.
    const responseTone: ProofTone =
      ownerMode === "conflict"
        ? "fail"
        : ownerMode === "accepted"
          ? "pass"
          : "pending";
    const breath = 0.5 + 0.5 * Math.sin(elapsed * 2.1);
    line(
      "owner-reactive-status-rail",
      owner,
      [
        [16, -0.8, 33],
        [16, -0.8, 94],
        [21, -0.8, 101],
        [64, -0.8, 101],
      ],
      ownerMode === "idle" ? 0.16 : 0.4 + breath * 0.5,
      responseTone,
    );
    for (let cell = 0; cell < 4; cell++) {
      const pulse = (1 + Math.sin(elapsed * 4.2 - cell * 0.85)) / 2;
      d.face(
        "owner-reactive-compute-cell-" + cell,
        [
          owner([46 + cell * 6, -8, 20]),
          owner([50 + cell * 6, -8, 20]),
          owner([50 + cell * 6, -2, 20]),
          owner([46 + cell * 6, -2, 20]),
        ],
        "emissive",
        ownerMode === "verify" ? 0.3 + pulse * 0.65 : 0.08,
        "pending",
      );
    }
    for (let layer = 0; layer < 7; layer++) {
      const pulse = (1 + Math.sin(elapsed * 3.3 - layer * 0.6)) / 2;
      line(
        "owner-reactive-storage-" + layer,
        owner,
        [
          [dx + dw, 14, 13 + layer * 12],
          [dx + dw, 33, 13 + layer * 12],
        ],
        ownerMode === "read"
          ? 0.25 + pulse * 0.65
          : ownerMode === "accepted"
            ? 0.18 + breath * 0.22
            : 0.06,
        ownerMode === "accepted" ? "pass" : "pending",
      );
    }
    d.label(
      "resolution-result",
      state.refusedAgain
        ? "CONFLICT · head r2 keeps 70"
        : state.resolved
          ? "SHARED r2 · quality=85 · disk unchanged"
          : state.conflictReturned && !state.freshWork
            ? "CONFLICT · r1 keeps 90; Agent 2 keeps 60"
            : state.freshWork
              ? "NEW BASE r1 · old proposal discarded"
              : state.firstAccepted
                ? "SHARED r1 · quality=90; Agent 2 still on r0"
                : "SHARED r0 · quality=80 · private edits only",
      24,
      portrait ? 775 : 551,
      {
        kind: "small",
        tone:
          state.refusedAgain || (state.conflictReturned && !state.freshWork)
            ? "fail"
            : state.firstAccepted
              ? "pass"
              : "neutral",
      },
    );
    return { paths: d.paths, labels: d.labels };
  };
}
export const conflictResolutionFrames = {
  agent: {
    unchanged: resolutionFrame("agent", "unchanged"),
    changed: resolutionFrame("agent", "changed"),
  },
  human: {
    unchanged: resolutionFrame("human", "unchanged"),
    changed: resolutionFrame("human", "changed"),
  },
} as const;
