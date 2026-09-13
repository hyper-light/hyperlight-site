import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import type {
  ProofFrame,
  ProofFrameFunction,
  ProofLabel,
  ProofPath,
} from "../components/proof-work/proof-geometry";
import {
  workspaceSnapshot,
  workspaceSteps,
} from "../components/slates/workspace-data";
import { workspaceFrame } from "../components/slates/workspace-geometry";
import {
  mergeSnapshot,
  mergeScenarios,
  mergeSteps,
} from "../components/slates/merge-data";
import { mergeFrames } from "../components/slates/merge-geometry";
import { operationMapFrame } from "../components/slates/operation-map-geometry";
import {
  operationMapSnapshot,
  operationMapSteps,
} from "../components/slates/operation-map-data";

test("all displayed participants are Agent 1 and Agent 2, including copy and controls", () => {
  const obsolete = /\b(?:Alice|Bob)\b/i;
  const copy = [
    workspaceSteps,
    operationMapSteps,
    ...mergeScenarios.map(({ id }) => mergeSteps(id)),
  ];
  assert.doesNotMatch(JSON.stringify(copy), obsolete);
  for (const file of [
    "slates-workspace.tsx",
    "slates-merge.tsx",
    "slates-operation-map.tsx",
  ]) {
    assert.doesNotMatch(
      readFileSync(
        new URL("../components/slates/" + file, import.meta.url),
        "utf8",
      ),
      obsolete,
      file,
    );
  }
  for (const portrait of [false, true]) {
    for (const [frame, last] of [
      [workspaceFrame, 3],
      [operationMapFrame, 3],
      ...Object.values(mergeFrames).map((frame) => [frame, 5] as const),
    ] as const) {
      for (let stage = 0; stage <= last; stage += 0.125) {
        assert.doesNotMatch(
          frame(0, stage, portrait)
            .labels.map((label) => label.text)
            .join("\n"),
          obsolete,
        );
      }
      const text = frame(0, 1, portrait)
        .labels.map((label) => label.text)
        .join("\n");
      assert.match(text, /Agent 1/i);
      assert.match(text, /Agent 2/i);
    }
  }
});

function path(frame: ProofFrame, id: string) {
  const value = frame.paths.find((candidate) => candidate.id === id);
  assert.ok(value, id);
  return value;
}
function points(value: ProofPath) {
  const coordinates = Array.from(
    value.d.matchAll(/-?\d+(?:\.\d+)?/g),
    ([entry]) => Number(entry),
  );
  return Array.from({ length: coordinates.length / 2 }, (_, i) => [
    coordinates[i * 2],
    coordinates[i * 2 + 1],
  ]);
}
function labelMatrix(value: ProofLabel) {
  if (!value.transform) return [1, 0, 0, 1, 0, 0];
  assert.match(value.transform, /^matrix\(/);
  const matrix = Array.from(
    value.transform.matchAll(/-?\d+(?:\.\d+)?/g),
    ([n]) => Number(n),
  );
  assert.equal(matrix.length, 6);
  return matrix;
}
function labelOrigin(value: ProofLabel) {
  const [a, b, c, d, e, f] = labelMatrix(value);
  return [a * value.x + c * value.y + e, b * value.x + d * value.y + f];
}
function labelCorners(value: ProofLabel, portrait = false) {
  const size =
    (value.kind === "small" ? 10 : value.kind === "heading" ? 9 : 11) +
    (portrait ? 2 : 0);
  // These separate physical patches form contiguous code runs. Their ordinary
  // Geist Mono advance is .6em; caption safety padding would invent overlaps
  // between adjacent runs that intentionally have no extra inter-word spacing.
  const codeRun =
    value.surface &&
    /^(?:quality-code|cache-code|inserted-byte|current-old-byte|replacement-byte|quality-newline|cache-newline|inserted-newline)$/.test(
      value.id,
    );
  const width =
    value.text.length *
    size *
    (value.kind === "heading" ? 0.73 : codeRun ? 0.6 : 0.64);
  const x =
    value.anchor === "middle"
      ? value.x - width / 2
      : value.anchor === "end"
        ? value.x - width
        : value.x;
  const [a, b, c, d, e, f] = labelMatrix(value);
  return [
    [x, value.y - size],
    [x + width, value.y - size],
    [x + width, value.y + 2],
    [x, value.y + 2],
  ].map(([x, y]) => [a * x + c * y + e, b * x + d * y + f]);
}
function labelBox(value: ProofLabel, portrait = false) {
  const corners = labelCorners(value, portrait);
  return {
    left: Math.min(...corners.map(([x]) => x)),
    right: Math.max(...corners.map(([x]) => x)),
    top: Math.min(...corners.map(([, y]) => y)),
    bottom: Math.max(...corners.map(([, y]) => y)),
  };
}
function labelsOverlap(a: ProofLabel, b: ProofLabel, portrait: boolean) {
  return polygonsOverlap(labelCorners(a, portrait), labelCorners(b, portrait));
}
function polygonsOverlap(aa: number[][], bb: number[][]) {
  // A tilted inscription's axis-aligned bounding box includes empty corners.
  // Test its actual projected rectangle against the other projected rectangle.
  return ![aa, bb].some((corners) =>
    corners.some((p, i) => {
      const q = corners[(i + 1) % corners.length],
        axis = [p[1] - q[1], q[0] - p[0]];
      const left = aa.map(([x, y]) => x * axis[0] + y * axis[1]);
      const right = bb.map(([x, y]) => x * axis[0] + y * axis[1]);
      return (
        Math.max(...left) <= Math.min(...right) ||
        Math.max(...right) <= Math.min(...left)
      );
    }),
  );
}

test("copy-on-write shares the untouched content and never mutates the base", () => {
  assert.equal(workspaceSnapshot(0).alice, null);
  assert.deepEqual(workspaceSnapshot(1).alice, workspaceSnapshot(1).source);
  assert.deepEqual(workspaceSnapshot(2).alice, ["A", "B", "C′", "D", "E"]);
  assert.equal(workspaceSnapshot(2).changedContent, "mutable");
  assert.equal(workspaceSnapshot(3).changedContent, "sealed");
  for (const stage of [0, 1, 2, 3]) {
    const state = workspaceSnapshot(stage);
    assert.deepEqual(state.source, ["A", "B", "C", "D", "E"]);
    if (stage >= 1) assert.deepEqual(state.bob, state.source);
    assert.equal(state.hostWritable, false);
    assert.equal(state.privateExtents, stage >= 2 ? 1 : 0);
  }
});

test("the merge examples retain exact bytes and refuse rather than overwrite a conflict", () => {
  assert.equal(mergeSnapshot("disjoint", 0).head, "quality=80\ncache=off\n");
  for (const { id } of mergeScenarios) {
    for (const stage of [0, 1, 2, 3])
      assert.equal(mergeSnapshot(id, stage).head, "quality=80\ncache=off\n");
    assert.equal(mergeSnapshot(id, 4).head, "quality=90\ncache=off\n");
    assert.equal(mergeSnapshot(id, 4).verdict, "pending");
  }
  assert.equal(mergeSnapshot("disjoint", 5).head, "quality=90\ncache=on\n");
  assert.equal(mergeSnapshot("disjoint", 5).verdict, "accepted");
  assert.equal(mergeSnapshot("identical", 5).head, "quality=90\ncache=off\n");
  assert.equal(mergeSnapshot("identical", 5).verdict, "accepted-no-op");
  assert.equal(mergeSnapshot("conflict", 5).head, "quality=90\ncache=off\n");
  assert.equal(mergeSnapshot("conflict", 5).verdict, "refused");
  assert.deepEqual(mergeSnapshot("conflict", 5).conflict, {
    start: 8,
    end: 10,
    current: "90",
    proposed: "60",
  });
});

const frames: [string, ProofFrameFunction, number][] = [
  ["workspace", workspaceFrame, 3],
  ["operation-map", operationMapFrame, 3],
  ...mergeScenarios.map(({ id }): [string, ProofFrameFunction, number] => [
    id,
    mergeFrames[id],
    5,
  ]),
];

test("mapping retains the original byte lineage after a length-changing insertion", () => {
  assert.equal(operationMapSnapshot(0).head, "quality=80\ncache=off\n");
  assert.equal(
    operationMapSnapshot(1).head,
    "format=webp\nquality=80\ncache=off\n",
  );
  assert.deepEqual(operationMapSnapshot(2).mapped, {
    start: 20,
    end: 22,
    bytes: "90",
  });
  const state = operationMapSnapshot(3);
  assert.equal(
    state.base.slice(state.declared.start, state.declared.end),
    "80",
  );
  assert.equal(state.head.slice(state.mapped!.start, state.mapped!.end), "80");
  assert.equal(state.result, "format=webp\nquality=90\ncache=off\n");
  for (const portrait of [false, true]) {
    const before = operationMapFrame(0, 0, portrait),
      after = operationMapFrame(0, 1, portrait);
    for (const id of ["quality-code", "cache-code"]) {
      const a = before.labels.find((label) => label.id === id)!;
      const b = after.labels.find((label) => label.id === id)!;
      assert.equal(a.text, b.text);
      const originA = labelOrigin(a),
        originB = labelOrigin(b);
      const [, , ux, uy] = labelMatrix(a);
      assert.ok(Math.abs(originB[0] - originA[0] - ux * 44) < 0.003);
      assert.ok(Math.abs(originB[1] - originA[1] - uy * 44) < 0.003);
    }
  }
});

test("all compositions keep stable IDs, path topology, finite coordinates and viewport bounds", () => {
  for (const [name, frame, lastStage] of frames)
    for (const portrait of [false, true]) {
      const initial = frame(0, 0, portrait);
      assert.equal(
        new Set(initial.paths.map(({ id }) => id)).size,
        initial.paths.length,
      );
      assert.equal(
        new Set(initial.labels.map(({ id }) => id)).size,
        initial.labels.length,
      );
      for (let i = 0; i <= lastStage * 50; i++) {
        const value = frame(1.7, i / 50, portrait);
        assert.deepEqual(
          value.paths.map(({ id }) => id),
          initial.paths.map(({ id }) => id),
        );
        assert.deepEqual(
          value.labels.map(({ id }) => id),
          initial.labels.map(({ id }) => id),
        );
        value.paths.forEach((entry, index) => {
          const coordinates = points(entry);
          assert.equal(
            coordinates.length,
            points(initial.paths[index]).length,
            entry.id,
          );
          for (const [x, y] of coordinates) {
            assert.ok(Number.isFinite(x) && Number.isFinite(y), entry.id);
            assert.ok(
              x >= 4 && x <= (portrait ? 416 : 796),
              `${name}/${entry.id} x=${x}`,
            );
            assert.ok(
              y >= 4 && y <= (portrait ? 736 : 516),
              `${name}/${entry.id} y=${y}`,
            );
          }
        });
        for (const label of value.labels) {
          const bounds = labelBox(label, portrait);
          assert.ok(
            bounds.left >= 4 && bounds.right <= (portrait ? 416 : 796),
            `${name}/${label.id} horizontal bounds ${JSON.stringify(bounds)}`,
          );
          assert.ok(
            bounds.top >= 4 && bounds.bottom <= (portrait ? 736 : 516),
            `${name}/${label.id} vertical bounds`,
          );
          if (label.transform)
            assert.ok(
              label.surface,
              "Projected type is explicitly attached to a physical surface",
            );
        }
      }
    }
});

test("captions and projected surface lettering never overlap in either layout", () => {
  for (const [name, frame, lastStage] of frames)
    for (const portrait of [false, true])
      for (let sample = 0; sample <= lastStage * 50; sample++) {
        const selection = sample / 50;
        const labels = frame(0, selection, portrait).labels.filter(
          (label) => (label.opacity ?? 1) > 0.1 && label.id !== "private-id",
        );
        for (let i = 0; i < labels.length; i++)
          for (let j = i + 1; j < labels.length; j++) {
            assert.ok(
              !labelsOverlap(labels[i], labels[j], portrait),
              `${name}/${portrait}/${selection}: ${labels[i].id} overlaps ${labels[j].id}`,
            );
          }
      }
});

test("the source and Agent 2 stay physically still while Agent 1 receives one private extent", () => {
  for (const portrait of [false, true]) {
    const initial = workspaceFrame(0, 1, portrait);
    for (let i = 0; i <= 100; i++) {
      const current = workspaceFrame(0, 1 + i / 50, portrait);
      for (const entry of initial.paths.filter(
        ({ id }) => id.startsWith("source-") || id.startsWith("bob-reference-"),
      ))
        assert.equal(path(current, entry.id).d, entry.d, entry.id);
    }
    assert.notEqual(
      path(workspaceFrame(0, 1.3, portrait), "private-copy-packet").d,
      path(workspaceFrame(0, 1.7, portrait), "private-copy-packet").d,
    );
    assert.equal(path(workspaceFrame(0, 1, portrait), "ram-page-5").opacity, 0);
    assert.equal(
      path(workspaceFrame(0, 2, portrait), "ram-page-5").opacity,
      0.7,
    );
    for (const selection of [0, 1, 2, 3]) {
      const frame = workspaceFrame(0, selection, portrait);
      const occupied = frame.paths.filter(
        ({ id, opacity }) => /^ram-page-\d+$/.test(id) && opacity > 0.5,
      );
      assert.equal(occupied.length, selection >= 2 ? 6 : 5);
      for (let i = 0; i < 5; i++)
        assert.equal(
          path(frame, `ram-page-${i}`).d,
          path(initial, `ram-page-${i}`).d,
        );
      assert.equal(
        frame.labels.find(({ id }) => id === "source-address-2")!.text,
        "a2",
      );
      assert.equal(
        frame.labels.find(({ id }) => id === "bob-address-2")!.text,
        "a2",
      );
      assert.equal(
        frame.labels.find(({ id }) => id === "alice-address-2")!.text,
        selection >= 2 ? "a5" : "a2",
      );
    }
  }
});

test("travelling extents, incoming operations and file patches stay clear of caption gutters", () => {
  for (const portrait of [false, true])
    for (let sample = 0; sample <= 300; sample++) {
      const selection = sample / 100;
      for (const [name, frame, families, captionPattern] of [
        [
          "workspace",
          workspaceFrame,
          ["private-copy-packet"],
          /(?:title|state|detail|kicker)$|^ram-(?:page-id|address)-/,
        ],
        [
          "operation-map",
          operationMapFrame,
          [
            "incoming-operation-",
            "replacement-patch",
            "insertion-row",
            "removed-patch",
            "mapped-selection",
          ],
          /^(?:map-kicker|action|bob-role|owner-role|insert-role|insert-size|mapping-equation|mapping-explanation|result)$/,
        ],
      ] as const) {
        const value = frame(0, selection, portrait);
        const labels = value.labels.filter(
          (label) =>
            captionPattern.test(label.id) && (label.opacity ?? 1) > 0.1,
        );
        const moving = value.paths.filter(
          (entry) =>
            families.some((family) => entry.id.startsWith(family)) &&
            entry.id !== "incoming-operation-route" &&
            entry.opacity > 0.1,
        );
        for (const entry of moving) {
          const coordinates = points(entry);
          // Keep the existing workspace packet's conservative rectangular
          // clearance; tilted file faces use their actual projected polygon.
          const xs = coordinates.map(([x]) => x),
            ys = coordinates.map(([, y]) => y);
          const silhouette =
            name === "workspace"
              ? [
                  [Math.min(...xs), Math.min(...ys)],
                  [Math.max(...xs), Math.min(...ys)],
                  [Math.max(...xs), Math.max(...ys)],
                  [Math.min(...xs), Math.max(...ys)],
                ]
              : coordinates;
          for (const label of labels) {
            assert.ok(
              !polygonsOverlap(silhouette, labelCorners(label, portrait)),
              `${name}/${portrait}/${selection}: ${entry.id} overlaps ${label.id}`,
            );
          }
        }
      }
    }
});

test("every geometric animation is continuous at commit and phase boundaries", () => {
  for (const [name, frame, lastStage] of frames)
    for (const portrait of [false, true])
      for (const boundary of [
        0.1, 1, 1.08, 1.16, 1.86, 2, 2.08, 2.2, 2.84, 3, 3.02, 3.09, 3.36, 3.43,
        3.45, 3.46, 3.5, 3.58, 3.92, 3.96, 4, 4.6, 4.65, 4.96, 5,
      ].filter((value) => value <= lastStage)) {
        const before = frame(0, boundary - 0.00001, portrait);
        const after = frame(0, boundary + 0.00001, portrait);
        before.paths.forEach((entry, index) => {
          const a = points(entry).flat(),
            b = points(after.paths[index]).flat();
          assert.ok(
            Math.max(...a.map((value, k) => Math.abs(value - b[k]))) < 0.06,
            `${name}/${entry.id} shifts at ${boundary}`,
          );
          assert.ok(
            Math.abs(entry.opacity - after.paths[index].opacity) < 0.01,
            `${name}/${entry.id} opacity jumps`,
          );
        });
      }
});

test("held stages keep a fixed camera with only named read scans, status lights and caret activity", () => {
  for (const [name, frame, lastStage] of frames)
    for (const portrait of [false, true])
      for (const selection of Array.from(
        { length: lastStage + 1 },
        (_, i) => i,
      )) {
        const before = frame(0.1, selection, portrait),
          after = frame(1.65, selection, portrait);
        assert.deepEqual(
          before.labels,
          after.labels,
          `${name}: label or camera drift`,
        );
        const moving = before.paths.filter(
          (entry, i) =>
            entry.d !== after.paths[i].d ||
            entry.opacity !== after.paths[i].opacity,
        );
        if (name !== "operation-map" || selection < lastStage)
          assert.ok(moving.length > 0, `${name}: held stage has no activity`);
        // Mapping's request caret stops when its replacement has landed. Other
        // scenes retain their documented read scan or hardware status lights.
        assert.ok(
          moving.every(({ id }) =>
            name === "workspace"
              ? /read-scan|rotation-mark|snapshot-live-address/.test(id)
              : name === "operation-map"
                ? id === "request-caret"
                : /^(?:alice|bob|head)-(?:activity-led|caret)$/.test(id),
          ),
          `${name}: activity moved a physical component`,
        );
        if (name !== "workspace")
          before.paths.forEach((entry, i) =>
            assert.equal(
              entry.d,
              after.paths[i].d,
              `${name}/${entry.id}: ambient time moves geometry`,
            ),
          );
      }
});

test("the same reply route returns acceptance or refusal without changing the transport geometry", () => {
  for (const portrait of [false, true]) {
    const accepted = mergeFrames.disjoint(0, 4.8, portrait),
      refused = mergeFrames.conflict(0, 4.8, portrait);
    assert.equal(
      path(refused, "bob-verdict").d,
      path(accepted, "bob-verdict").d,
    );
    assert.ok(path(refused, "bob-verdict").opacity > 0.1);
    assert.equal(path(refused, "bob-verdict").tone, "fail");
    assert.equal(path(accepted, "bob-verdict").tone, "pass");
  }
});

test("merge byte lettering preserves case instead of using the uppercase identity style", () => {
  for (const { id } of mergeScenarios)
    for (const portrait of [false, true]) {
      const final = mergeFrames[id](0, 5, portrait);
      const head = final.labels.filter(({ id }) =>
        id.startsWith("head-value-"),
      );
      assert.equal(
        head.map(({ text }) => text).join("\n") + "\n",
        mergeSnapshot(id, 5).head,
      );
      assert.ok(head.every(({ kind }) => kind === "label"));
    }
});
