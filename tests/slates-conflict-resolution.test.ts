import assert from "node:assert/strict";
import { test } from "node:test";
import type {
  ProofFrame,
  ProofLabel,
} from "../components/proof-work/proof-geometry";
import {
  conflictResolutionState,
  conflictResolutionSteps,
} from "../components/slates/conflict-resolution-data";
import { conflictResolutionFrames } from "../components/slates/conflict-resolution-geometry";

const authors = ["agent", "human"] as const;
const rechecks = ["unchanged", "changed"] as const;
const towerResponseSuffixes = [
  "cpu-core",
  "cpu-sweep",
  ...[0, 1].flatMap((slot) =>
    [0, 1, 2, 3].map((bank) => `dimm-${slot}-${bank}`),
  ),
  "memory-link",
  "network-tx",
  "network-out",
  "network-rx",
  "network-in",
  "warning-frame",
  "warning-sill",
  "confirmation-frame",
  "confirmation-sill",
];
const responseIds = new Set([
  ...["agent1", "agent2"].flatMap((id) =>
    towerResponseSuffixes.map((suffix) => id + "-tower-reactive-" + suffix),
  ),
  "owner-reactive-status-rail",
  ...[0, 1, 2, 3].map((cell) => "owner-reactive-compute-cell-" + cell),
  ...[0, 1, 2, 3, 4, 5, 6].map((layer) => "owner-reactive-storage-" + layer),
]);
const movingResponseIds = new Set(
  ["agent1", "agent2"].flatMap((id) =>
    ["cpu-sweep", "network-out", "network-in"].map(
      (suffix) => id + "-tower-reactive-" + suffix,
    ),
  ),
);
function path(frame: ProofFrame, id: string) {
  const found = frame.paths.find((value) => value.id === id);
  assert.ok(found, id);
  return found;
}
function label(frame: ProofFrame, id: string) {
  const found = frame.labels.find((value) => value.id === id);
  assert.ok(found, id);
  return found;
}
function field(frame: ProofFrame, id: string) {
  const name = label(frame, id).text;
  const value = label(frame, id + "-value").text;
  return value ? name + " " + value : name;
}
const numbers = (d: string) =>
  Array.from(d.matchAll(/-?\d+(?:\.\d+)?/g), ([value]) => Number(value));
function corners(label: ProofLabel, portrait: boolean) {
  const font =
    (label.kind === "small" ? 10 : label.kind === "heading" ? 9 : 11) +
    (portrait ? 2 : 0);
  const width =
    label.text.length *
    font *
    (label.kind === "heading" ? 0.75 : label.kind === "name" ? 0.7 : 0.62);
  const x =
    label.x -
    (label.anchor === "end"
      ? width
      : label.anchor === "middle"
        ? width / 2
        : 0);
  const [a, b, c, d, e, f] = label.transform
    ? numbers(label.transform)
    : [1, 0, 0, 1, 0, 0];
  return [
    [x - 1, label.y - font],
    [x + width + 1, label.y - font],
    [x + width + 1, label.y + 3],
    [x - 1, label.y + 3],
  ].map(([u, v]) => [a * u + c * v + e, b * u + d * v + f]);
}
function overlap(a: number[][], b: number[][]) {
  return ![a, b].some((polygon) =>
    polygon.some((p, i) => {
      const q = polygon[(i + 1) % polygon.length];
      const axis = [p[1] - q[1], q[0] - p[0]];
      if (Math.abs(axis[0]) + Math.abs(axis[1]) < 1e-9) return false;
      const aa = a.map(([x, y]) => x * axis[0] + y * axis[1]);
      const bb = b.map(([x, y]) => x * axis[0] + y * axis[1]);
      return (
        Math.max(...aa) <= Math.min(...bb) || Math.max(...bb) <= Math.min(...aa)
      );
    }),
  );
}

function polygon(d: string) {
  const coordinates = numbers(d);
  return Array.from({ length: coordinates.length / 2 }, (_, i) => [
    coordinates[i * 2],
    coordinates[i * 2 + 1],
  ]);
}

function surfaceClearance(ink: number[][], surface: number[][]) {
  const winding = Math.sign(
    surface.reduce((area, [x, y], i) => {
      const [nextX, nextY] = surface[(i + 1) % surface.length];
      return area + x * nextY - nextX * y;
    }, 0),
  );
  assert.notEqual(winding, 0, "the inscription surface has an area");
  return Math.min(
    ...surface.flatMap(([x, y], i) => {
      const [nextX, nextY] = surface[(i + 1) % surface.length];
      const dx = nextX - x,
        dy = nextY - y;
      return ink.map(
        ([u, v]) =>
          (winding * (dx * (v - y) - dy * (u - x))) / Math.hypot(dx, dy),
      );
    }),
  );
}

test("autonomous towers use matching integrated readouts and animated cooling without peripherals", () => {
  for (const portrait of [false, true])
    for (const author of authors)
      for (const recheck of rechecks) {
        const initial = conflictResolutionFrames[author][recheck](
          0,
          0,
          portrait,
        );
        const fanEarly = conflictResolutionFrames[author][recheck](
          0,
          0,
          portrait,
        );
        const fanLate = conflictResolutionFrames[author][recheck](
          1,
          0,
          portrait,
        );
        for (let stage = 0; stage <= 7; stage++) {
          const frame = conflictResolutionFrames[author][recheck](
            0,
            stage,
            portrait,
          );
          assert.ok(
            frame.paths.every(
              (value) =>
                !/^agent[12]-(?:screen|pane-|rear-glass|monitor-|keyboard|keycap|display-cable|touch-|cantilever|terminal-)/.test(
                  value.id,
                ),
            ),
            "autonomous nodes have no separate monitor, keyboard, mouse workstation or display cable",
          );
          assert.ok(
            !frame.labels.some(
              (value) =>
                value.id === "agent2-value" || value.id === "agent2-key",
            ),
            "Agent 2 has one local edit readout rather than duplicate values",
          );
          for (const id of ["agent1", "agent2"]) {
            const tower = id + "-tower";
            const screen = path(frame, tower + "-integrated-display");
            const bezel = path(frame, tower + "-integrated-bezel");
            assert.equal(screen.material, "silicon");
            assert.ok(screen.opacity > 0.9 && screen.d.endsWith("Z"));
            assert.equal(bezel.material, "metal");
            assert.equal(
              path(frame, tower + "-integrated-bezel-crown").material,
              "metal",
            );
            assert.equal(
              screen.d,
              path(initial, screen.id).d,
              "the case display is fixed",
            );
            assert.ok(
              surfaceClearance(polygon(screen.d), polygon(bezel.d)) >= 3.5,
              "the vertical display is set into the case bezel",
            );
            const display = polygon(screen.d);
            const displayWidth =
              Math.max(...display.map(([x]) => x)) -
              Math.min(...display.map(([x]) => x));
            const displayHeight =
              Math.max(...display.map(([, y]) => y)) -
              Math.min(...display.map(([, y]) => y));
            assert.ok(
              displayHeight > displayWidth * 1.4,
              "a vertical chassis readout, not a separate wide monitor",
            );
            assert.ok(
              !overlap(
                display,
                polygon(path(frame, tower + "-glass-window").d),
              ),
            );
            assert.ok(
              !overlap(
                display,
                polygon(path(frame, tower + "-glass-corner").d),
              ),
            );
            const names = [
              id + "-work",
              ...(id === "agent1"
                ? ["agent1-base", "agent1-head", "agent1-key"]
                : [0, 1, 2].map((i) => "agent2-evidence-name-" + i)),
              id + "-status",
            ];
            const values = [
              id + "-work-value",
              ...(id === "agent1"
                ? ["agent1-base-value", "agent1-head-value", "agent1-value"]
                : [0, 1, 2].map((i) => "agent2-evidence-value-" + i)),
              id + "-status-value",
            ];
            const valueColumn = portrait ? 62 : 58;
            let previousBaseline: number | undefined;
            for (let row = 0; row < 5; row++) {
              const name = label(frame, names[row]),
                value = label(frame, values[row]);
              if (row < 4)
                assert.equal(name.text, ["work", "BASE", "HEAD", "EDIT"][row]);
              else
                assert.match(
                  name.text,
                  /^(WORK|EDIT|SEND|SENT|ACCEPT|TESTED|CONFLICT)$/,
                );
              assert.equal(name.kind, "small");
              assert.equal(value.kind, "small");
              assert.equal(name.anchor, "start");
              assert.equal(
                value.anchor,
                "start",
                "versions and byte values share a compact starting column",
              );
              assert.equal(name.surface, screen.id);
              assert.equal(value.surface, screen.id);
              assert.ok(name.transform && value.transform);
              const nameMatrix = numbers(name.transform),
                valueMatrix = numbers(value.transform);
              assert.deepEqual(
                nameMatrix.slice(0, 4),
                [1, 0, 0, 1],
                "readout lettering stays level",
              );
              assert.deepEqual(valueMatrix.slice(0, 4), nameMatrix.slice(0, 4));
              assert.equal(
                nameMatrix[5],
                valueMatrix[5],
                "each row label and value share a baseline",
              );
              assert.ok(
                Math.abs(valueMatrix[4] - nameMatrix[4] - (valueColumn - 10)) <
                  0.002,
                "work, BASE, HEAD, EDIT and status use the same compact value column on both nodes",
              );
              assert.ok(
                Math.abs(nameMatrix[4] - display[0][0] - 9.84) < 0.02,
                "a ten-unit inner inset keeps readouts clear of the case edge",
              );
              if (previousBaseline !== undefined)
                assert.ok(
                  Math.abs(nameMatrix[5] - previousBaseline - 20) < 0.002,
                  "all five field rows keep their physical gutters on both nodes",
                );
              assert.equal(
                value.transform,
                label(initial, values[row]).transform,
                "changing or empty status values cannot shift the shared column",
              );
              previousBaseline = nameMatrix[5];
            }
            for (const suffix of ["file", "work", "status"]) {
              const text = label(frame, id + "-" + suffix);
              assert.equal(
                text.surface,
                screen.id,
                "every worker annotation belongs to its built-in display",
              );
              assert.ok(text.transform);
              assert.ok(
                Math.abs(numbers(text.transform)[4] - display[0][0] - 9.84) <
                  0.02,
              );
            }
            const glass = path(frame, tower + "-glass-window");
            assert.equal(glass.kind, "glass");
            assert.ok(
              (glass.fillOpacity ?? 1) > 0 && (glass.fillOpacity ?? 1) <= 0.1,
              "the side window reveals the components instead of painting over them",
            );
            assert.ok(
              (path(frame, tower + "-glass-corner").fillOpacity ?? 1) <= 0.1,
            );
            for (const suffix of [
              "chamber-back",
              "chamber-side",
              "chamber-left",
              "floor",
              "floor-depth",
              "front-frame-front",
              "window-mullion-front",
              "top-frame",
              "top-frame-depth",
            ]) {
              const face = path(frame, tower + "-" + suffix);
              assert.ok(face.d.endsWith("Z") && face.opacity > 0.7, face.id);
              assert.equal(
                face.d,
                path(initial, face.id).d,
                "the tower chassis stays fixed",
              );
            }
            const side = polygon(path(frame, tower + "-chamber-left").d);
            const roof = polygon(path(frame, tower + "-top-frame").d);
            for (const [near, far] of [
              [side[0], side[1]],
              [roof[0], roof[4]],
            ]) {
              assert.ok(
                Math.abs(far[0] - near[0] - 90 * 0.32) < 0.002 &&
                  Math.abs(far[1] - near[1] + 90 * 0.42) < 0.002,
                "the side and roof share a real ninety-unit rear enclosure, not a flat panel",
              );
            }
            for (const suffix of [
              "rear-chamber-frame",
              ...[0, 1, 2, 3].map((i) => "rear-chamber-fastener-" + i),
              ...[0, 1, 2, 3, 4, 5, 6].map((i) => "rear-mesh-cross-" + i),
            ]) {
              const detail = path(frame, tower + "-" + suffix);
              assert.ok(
                detail.opacity > 0.2,
                "the rear chamber has visible machined details",
              );
              assert.equal(detail.d, path(initial, detail.id).d);
            }
            for (const [suffix, material] of [
              ["motherboard", "circuit"],
              ["motherboard-tray-top", "metal"],
              ["cpu-pump", "silicon"],
              ["cpu-pump-back", "metal"],
              ["dimm-0-top", "silicon"],
              ["dimm-1-top", "silicon"],
              ["gpu-top", "metal"],
              ["gpu-shroud", "silicon"],
              ["m2-drive-top", "silicon"],
              ["psu-shroud-top", "silicon"],
              ["network-socket-top", "metal"],
              ["network-inset", "silicon"],
            ] as const) {
              const face = path(frame, tower + "-" + suffix);
              assert.equal(face.material, material, face.id);
              assert.ok(face.opacity > 0.5, face.id);
              assert.equal(
                face.d,
                path(initial, face.id).d,
                "mounted components never move",
              );
            }
            for (const suffix of ["aio-tube-0", "aio-tube-1"])
              assert.ok(
                path(frame, tower + "-" + suffix).d.endsWith("Z"),
                "physical cooling hoses",
              );
            for (const fan of [
              "rear-fan",
              "radiator-fan-0",
              "radiator-fan-1",
              "radiator-fan-2",
              "roof-fan-0",
              "roof-fan-1",
              "roof-fan-2",
              "intake-0",
              "intake-1",
              "intake-2",
            ]) {
              assert.equal(
                path(frame, tower + "-" + fan + "-housing").material,
                "metal",
              );
              assert.equal(
                path(frame, tower + "-" + fan + "-recess").material,
                "silicon",
              );
              assert.equal(
                path(frame, tower + "-" + fan + "-ring").material,
                "emissive",
              );
              assert.equal(
                path(frame, tower + "-" + fan + "-hub").material,
                "silicon",
              );
              const blades = frame.paths.filter((value) =>
                new RegExp("^" + tower + "-" + fan + "-blade-\\d+$").test(
                  value.id,
                ),
              );
              assert.equal(
                blades.length,
                7,
                "each physical fan has seven separate blades",
              );
              assert.equal(new Set(blades.map((value) => value.d)).size, 7);
              if (
                stage === 0 &&
                (fan.startsWith("intake-") || fan.startsWith("roof-fan-"))
              ) {
                for (let blade = 0; blade < 7; blade++) {
                  const bladeId = tower + "-" + fan + "-blade-" + blade;
                  assert.notEqual(
                    path(fanEarly, bladeId).d,
                    path(fanLate, bladeId).d,
                    bladeId +
                      " rotates with elapsed time at the same selected stage",
                  );
                }
                for (const suffix of ["housing", "ring"]) {
                  const fixedId = tower + "-" + fan + "-" + suffix;
                  assert.equal(
                    path(fanEarly, fixedId).d,
                    path(fanLate, fixedId).d,
                    fixedId + " stays fixed around the rotating blades",
                  );
                }
              }
            }
            for (let foot = 0; foot < 4; foot++)
              assert.equal(
                path(frame, tower + "-foot-" + foot + "-top").material,
                "silicon",
              );
            assert.equal(
              frame.paths.filter((value) =>
                new RegExp("^" + tower + "-network-contact-\\d+$").test(
                  value.id,
                ),
              ).length,
              4,
            );
            const port = polygon(path(frame, tower + "-network-port").d);
            const lane = polygon(path(frame, id + "-owner-lane").d);
            assert.deepEqual(
              lane[0],
              port[port.length - 1],
              "the network route begins at the tower's actual socket",
            );
          }
        }
      }
});

test("the owner exposes its compute assembly and seven storage blades behind separate status faces", () => {
  for (const portrait of [false, true])
    for (const author of authors)
      for (const recheck of rechecks)
        for (let stage = 0; stage <= 7; stage++) {
          const frame = conflictResolutionFrames[author][recheck](
            0,
            stage,
            portrait,
          );
          assert.ok(
            frame.paths.every(
              (value) => !/^owner-(?:enclosure|chassis)(?:-|$)/.test(value.id),
            ),
          );
          assert.equal(path(frame, "owner-circuit-bed").material, "circuit");
          assert.equal(
            path(frame, "owner-compute-substrate-top").material,
            "circuit",
          );
          assert.equal(
            path(frame, "owner-compute-die-top").material,
            "silicon",
          );
          assert.ok(path(frame, "owner-compute-die-top").opacity > 0.5);
          assert.equal(
            frame.paths.filter((value) =>
              /^owner-compute-pin-\d+$/.test(value.id),
            ).length,
            9,
          );
          const blades = frame.paths.filter((value) =>
            /^owner-storage-blade-\d+$/.test(value.id),
          );
          assert.equal(blades.length, 7);
          assert.equal(new Set(blades.map((value) => value.d)).size, 7);
          for (const [i, blade] of blades.entries()) {
            assert.equal(blade.material, "metal");
            assert.ok(blade.opacity > 0.4);
            assert.equal(polygon(blade.d).length, 8);
            assert.ok(path(frame, "owner-storage-edge-" + i).opacity > 0.5);
            for (const suffix of ["front-face", "front-bevel", "underlay"])
              assert.ok(
                path(frame, "owner-storage-" + suffix + "-" + i).d.endsWith(
                  "Z",
                ),
                "each blade retains its separate physical layers",
              );
            assert.equal(
              path(frame, "owner-storage-controller-" + i + "-top").material,
              "silicon",
            );
            assert.equal(
              frame.paths.filter((value) =>
                value.id.startsWith("owner-storage-vent-" + i + "-"),
              ).length,
              5,
            );
            if (i > 0) {
              const separation =
                polygon(blades[i - 1].d)[0][1] - polygon(blade.d)[0][1];
              assert.ok(
                separation >= 10,
                "individually separated blade layers",
              );
            }
          }
          const controller = path(frame, "owner-controller-display"),
            media = path(frame, "owner-drive-display");
          assert.equal(controller.material, "silicon");
          assert.equal(media.material, "silicon");
          assert.ok(!overlap(polygon(controller.d), polygon(media.d)));
          for (const id of ["owner-task", "owner-comparison", "owner-verdict"])
            assert.equal(label(frame, id).surface, controller.id);
          for (const id of [
            "target-file-name",
            "target-file-byte",
            "target-file-kind",
          ])
            assert.equal(label(frame, id).surface, media.id);
        }
});

const packets = [
  ["agent1-submission", 1.08, 1.47, "agent1-owner-lane", false, false],
  ["agent1-acceptance", 1.62, 1.98, "agent1-owner-lane", true, false],
  ["agent1-next-submission", 5.68, 6.28, "agent1-owner-lane", false, true],
  ["agent1-next-acceptance", 6.31, 6.65, "agent1-owner-lane", true, true],
  ["agent2-stale-submission", 2.08, 2.4, "agent2-owner-lane", false, false],
  ["conflict-report", 2.66, 2.98, "agent2-owner-lane", true, false],
  ["head-read-request", 3.08, 3.38, "agent2-owner-lane", false, false],
  ["accepted-head-snapshot", 3.46, 3.9, "agent2-owner-lane", true, false],
  ["revised-submission", 5.1, 5.96, "agent2-owner-lane", false, false],
  ["owner-final-reply", 6.72, 6.98, "agent2-owner-lane", true, false],
] as const;

test("two private proposals advance the shared head only through accepted submissions", () => {
  for (const author of authors)
    for (const recheck of rechecks) {
      assert.deepEqual(
        conflictResolutionSteps(author, recheck).map((step) => step.label),
        [
          "Base",
          "Edit",
          "Accept 1",
          "Conflict",
          "Read head",
          "Revise",
          "Resubmit",
          recheck === "changed" ? "Conflict again" : "Accept 2",
        ],
      );
      for (let sample = 0; sample <= 700; sample++) {
        const at = sample / 100;
        const state = conflictResolutionState(at, author, recheck);
        const changed = recheck === "changed" && at >= 6.3;
        assert.equal(state.stage, Math.floor(at));
        assert.equal(state.author, author);
        assert.equal(state.firstAccepted, at >= 1.6);
        assert.equal(state.firstNotified, at >= 1.98);
        assert.equal(state.conflictReturned, at >= 2.98);
        assert.equal(state.freshWork, at >= 4);
        assert.equal(state.revised, at >= 5);
        assert.equal(state.resubmitted, at >= 5.96);
        assert.equal(state.headChanged, changed);
        assert.equal(state.resolved, at >= 6.7 && !changed);
        assert.equal(state.refusedAgain, at >= 6.7 && changed);
        assert.equal(state.finalNotified, at >= 6.98);
        assert.equal(
          state.agent1,
          recheck === "changed" && at >= 5.64 ? "70" : at >= 1 ? "90" : "80",
        );
        assert.equal(
          state.agent2,
          at >= 5 ? "85" : at >= 4 ? "90" : at >= 1 ? "60" : "80",
        );
        assert.equal(state.agent2Base, at >= 4 ? "90" : "80");
        assert.equal(state.agent2BaseVersion, at >= 4 ? "r1" : "r0");
        assert.equal(
          state.head,
          changed ? "70" : at >= 6.7 ? "85" : at >= 1.6 ? "90" : "80",
        );
        assert.equal(
          state.headVersion,
          changed || at >= 6.7 ? "r2" : at >= 1.6 ? "r1" : "r0",
        );
        assert.deepEqual(
          [state.conflictBase, state.conflictHead, state.conflictProposal],
          ["80", "90", "60"],
        );
        assert.ok(!("grant" in state) && !("disk" in state));
      }
      for (const invalid of [-1, Number.NaN, Infinity, -Infinity])
        assert.deepEqual(
          conflictResolutionState(invalid, author, recheck),
          conflictResolutionState(0, author, recheck),
        );
      assert.deepEqual(
        conflictResolutionState(99, author, recheck),
        conflictResolutionState(7, author, recheck),
      );
    }
});

test("the stale conflict returns all three versions before Agent 2 refreshes and revises its work", () => {
  for (const portrait of [false, true])
    for (const author of authors)
      for (const recheck of rechecks) {
        const frame = conflictResolutionFrames[author][recheck];
        const values = (at: number) =>
          [0, 1, 2].map(
            (i) =>
              label(frame(0, at, portrait), "agent2-evidence-value-" + i).text,
          );
        assert.deepEqual(values(3), ["80", "90", "60"]);
        assert.deepEqual(values(4), ["90", "90", "90"]);
        assert.deepEqual(values(5), ["90", "90", "85"]);
        assert.match(field(frame(0, 3, portrait), "agent2-status"), /CONFLICT/);
        assert.match(field(frame(0, 4, portrait), "agent2-work"), /work r1/);
        assert.match(
          field(frame(0, 4, portrait), "agent2-status"),
          /^WORK r1$/,
        );
        assert.match(
          field(frame(0, 5, portrait), "agent2-status"),
          /^TESTED r1$/,
        );
        assert.match(field(frame(0, 6, portrait), "agent2-status"), /SENT.*r1/);
        for (const [at, value] of [
          [0, "80"],
          [1, "60"],
          [2, "60"],
          [3, "60"],
          [4, "90"],
          [5, "85"],
          [6, "85"],
          [7, "85"],
        ] as const) {
          const current = frame(0, at, portrait);
          assert.equal(label(current, "agent2-evidence-value-2").text, value);
          assert.equal(
            label(current, "agent1-value").text,
            at === 0 ? "80" : recheck === "changed" && at >= 6 ? "70" : "90",
          );
          assert.equal(
            label(current, "target-file-byte").text,
            at === 7
              ? recheck === "changed"
                ? "70"
                : "85"
              : at >= 2
                ? "90"
                : "80",
          );
          assert.equal(
            label(current, "target-file-kind").text,
            at === 7 ? "HEAD r2" : at >= 2 ? "HEAD r1" : "HEAD r0",
          );
          assert.equal(
            label(current, "agent1-title").text,
            "AGENT 1 · WORKER NODE",
          );
          assert.equal(
            label(current, "agent2-title").text,
            "AGENT 2 · WORKER NODE",
          );
          assert.equal(
            label(current, "owner-title").text,
            "SHARED VOLUME OWNER",
          );
          assert.doesNotMatch(
            current.labels.map((value) => value.text).join(" "),
            /M7|M8|GRANT|HUMAN REVIEW TERMINAL|LANDING OWNER|DISK WRITES/i,
          );
        }
        assert.equal(
          path(frame(0, 4.4, portrait), "review-pointer").opacity > 0.5,
          author === "human",
        );
        assert.equal(path(frame(0, 3, portrait), "review-pointer").opacity, 0);
        assert.equal(path(frame(0, 5, portrait), "review-pointer").opacity, 0);
        const end = frame(0, 7, portrait);
        assert.equal(
          label(end, "owner-verdict").text,
          recheck === "changed" ? "KEEP r2" : "ACCEPT r2",
        );
        assert.match(
          label(end, "resolution-result").text,
          recheck === "changed"
            ? /head r2 keeps 70/
            : /quality=85.*disk unchanged/,
        );
        for (const at of [6.7, 6.85, 6.97])
          assert.deepEqual(
            values(at),
            ["90", "90", "85"],
            "Agent 2 keeps its last known head while the reply is in flight",
          );
        for (const at of [6.98, 7])
          assert.deepEqual(
            values(at),
            recheck === "changed" ? ["90", "70", "85"] : ["90", "85", "85"],
            "the reply updates the known head without changing the r1 base",
          );
      }
});

test("submissions, conflict windows and accepted snapshots travel to the correct participant", () => {
  for (const portrait of [false, true])
    for (const author of authors)
      for (const recheck of rechecks) {
        const frame = conflictResolutionFrames[author][recheck];
        const centre = (d: string) => {
          const points = polygon(d);
          return [0, 1].map(
            (axis) =>
              points.reduce((sum, point) => sum + point[axis], 0) /
              points.length,
          );
        };
        for (const [id, start, end, lane, returning, changedOnly] of packets) {
          for (const at of [start, end])
            assert.equal(
              path(frame(0, at, portrait), id + "-top").opacity,
              0,
              id,
            );
          const early = frame(0, start + (end - start) * 0.35, portrait);
          const late = frame(0, start + (end - start) * 0.65, portrait);
          if (changedOnly && recheck === "unchanged") {
            assert.equal(path(early, id + "-top").opacity, 0, id);
            assert.equal(path(late, id + "-top").opacity, 0, id);
            continue;
          }
          assert.ok(path(early, id + "-top").opacity > 0.5, id);
          assert.ok(path(late, id + "-top").opacity > 0.5, id);
          const route = polygon(path(early, lane).d);
          const target = returning ? route[0] : route[route.length - 1];
          const from = centre(path(early, id + "-top").d);
          const to = centre(path(late, id + "-top").d);
          assert.ok(
            Math.hypot(to[0] - target[0], to[1] - target[1]) <
              Math.hypot(from[0] - target[0], from[1] - target[1]),
            id + " reaches its recipient",
          );
        }
        assert.equal(
          label(frame(0, 1.5, portrait), "target-file-byte").text,
          "80",
        );
        assert.equal(
          label(frame(0, 2, portrait), "target-file-byte").text,
          "90",
        );
        assert.equal(
          label(frame(0, 2.8, portrait), "agent2-evidence-value-2").text,
          "60",
        );
        assert.equal(
          label(frame(0, 3.65, portrait), "agent2-evidence-value-2").text,
          "60",
        );
        assert.equal(
          label(frame(0, 4, portrait), "agent2-evidence-value-2").text,
          "90",
        );
        assert.equal(
          label(frame(0, 5.5, portrait), "target-file-byte").text,
          "90",
        );
        assert.equal(
          label(frame(0, 6, portrait), "target-file-byte").text,
          "90",
        );
        assert.equal(
          label(frame(0, 6.5, portrait), "target-file-byte").text,
          recheck === "changed" ? "70" : "90",
        );
        for (const [at, verdict] of [
          [6, "CHECK r1"],
          [6.4, recheck === "changed" ? "CHECK r2" : "CHECK r1"],
          [6.7, recheck === "changed" ? "KEEP r2" : "ACCEPT r2"],
        ] as const)
          assert.equal(
            label(frame(0, at, portrait), "owner-verdict").text,
            verdict,
            "the owner compares the current head before reporting its decision",
          );
        assert.equal(
          path(frame(0, 6.85, portrait), "owner-final-reply-top").tone,
          recheck === "changed" ? "fail" : "pass",
        );
        for (const at of [1.83, 1.9]) {
          const accepted = frame(0, at, portrait);
          assert.equal(label(accepted, "target-file-byte").text, "90");
          assert.match(field(accepted, "agent1-status"), /^SEND r[01]$/);
        }
        assert.match(
          field(frame(0, 1.98, portrait), "agent1-status"),
          /^ACCEPT r1$/,
        );
        for (const at of [6.7, 6.85, 6.97]) {
          const admitted = frame(0, at, portrait);
          assert.equal(
            label(admitted, "target-file-byte").text,
            recheck === "changed" ? "70" : "85",
          );
          assert.equal(
            label(admitted, "owner-verdict").text,
            recheck === "changed" ? "KEEP r2" : "ACCEPT r2",
          );
          assert.match(field(admitted, "agent2-status"), /^SENT r1$/);
        }
        assert.match(
          field(frame(0, 6.98, portrait), "agent2-status"),
          recheck === "changed" ? /^CONFLICT$/ : /^ACCEPT r2$/,
        );
        if (recheck === "changed") {
          assert.match(
            field(frame(0, 5.4, portrait), "agent1-work"),
            /work r1/,
          );
          assert.match(
            label(frame(0, 5.4, portrait), "agent1-base-value").text,
            /^90$/,
          );
          assert.equal(
            label(frame(0, 6.2, portrait), "agent1-value").text,
            "70",
          );
          assert.equal(
            label(frame(0, 6.29, portrait), "target-file-byte").text,
            "90",
          );
          assert.equal(
            label(frame(0, 6.3, portrait), "target-file-byte").text,
            "70",
          );
          assert.match(
            field(frame(0, 6.35, portrait), "agent1-status"),
            /^SEND r[01]$/,
          );
          assert.match(
            field(frame(0, 6.65, portrait), "agent1-status"),
            /^ACCEPT r2$/,
          );
        }
      }
});

test("hardware activity follows the two edits, the deliberate revision and owner admission", () => {
  for (const portrait of [false, true])
    for (const author of authors)
      for (const recheck of rechecks) {
        const frame = conflictResolutionFrames[author][recheck];
        for (let sample = 0; sample <= 700; sample++) {
          const at = sample / 100;
          const current = frame(0, at, portrait);
          const window = (start: number, end: number) => at > start && at < end;
          for (const [id, active] of [
            [
              "agent1",
              window(0.08, 0.9) ||
                (recheck === "changed" && window(5.42, 5.64)),
            ],
            ["agent2", window(0.15, 0.98) || window(4.12, 4.7)],
          ] as const)
            for (const suffix of ["tower-cpu-activity", "tower-circuit-signal"])
              assert.equal(
                path(current, id + "-" + suffix).opacity > 1e-8,
                active,
                id + "-" + suffix + " at " + at,
              );
          assert.equal(
            path(current, "agent2-check-sweep").opacity > 1e-8,
            window(4.72, 4.98),
            "checks follow the revision",
          );
          assert.equal(
            path(current, "review-pointer").opacity > 1e-8,
            author === "human" && window(4.12, 4.7),
            "human helps Agent 2 revise",
          );
          assert.equal(
            path(current, "owner-compare-signal").opacity > 1e-8,
            window(2.42, 2.64) || window(6.36, 6.68),
            "owner compares submissions",
          );
          const updating =
            window(1.5, 1.6) || (recheck === "unchanged" && window(6.66, 6.71));
          for (const id of ["owner-head-update-light", "owner-head-update-bus"])
            assert.equal(
              path(current, id).opacity > 1e-8,
              updating,
              recheck +
                "/" +
                at +
                ": " +
                id +
                " cannot overwrite a second conflict",
            );
        }
        // Held-state telemetry is distinct from the selection-driven edits and
        // messages above. It can show activity without repeating an operation.
        for (const [at, mode1, mode2, ownerMode] of [
          [0, "idle", "idle", "idle"],
          [1, "edit", "edit", "idle"],
          [1.5, "send", "edit", "verify"],
          [2, "accepted", "edit", "accepted"],
          [2.5, "accepted", "send", "verify"],
          [3, "accepted", "conflict", "conflict"],
          [3.5, "accepted", "read", "read"],
          [4, "accepted", "read", "read"],
          [4.5, "accepted", "edit", "idle"],
          [5, "accepted", "verify", "idle"],
          [5.5, recheck === "changed" ? "edit" : "accepted", "send", "verify"],
          [6, recheck === "changed" ? "send" : "accepted", "send", "verify"],
          [
            6.7,
            "accepted",
            "send",
            recheck === "changed" ? "conflict" : "accepted",
          ],
          [
            7,
            "accepted",
            recheck === "changed" ? "conflict" : "accepted",
            recheck === "changed" ? "conflict" : "accepted",
          ],
        ] as const) {
          const early = frame(0.25, at, portrait),
            later = frame(1.1, at, portrait);
          assert.deepEqual(
            early,
            frame(0.25, at, portrait),
            "an unchanged clock and selection reproduce the entire frame",
          );
          assert.deepEqual(
            early.labels,
            later.labels,
            "hardware telemetry cannot change file values, status, or captions",
          );
          for (const [id, mode] of [
            ["agent1", mode1],
            ["agent2", mode2],
          ] as const) {
            const active = towerResponseSuffixes.filter((suffix) => {
              if (suffix.startsWith("cpu-"))
                return mode === "edit" || mode === "verify";
              if (suffix.startsWith("dimm-") || suffix === "memory-link")
                return mode === "edit" || mode === "read" || mode === "verify";
              if (suffix === "network-tx" || suffix === "network-out")
                return mode === "send";
              if (suffix === "network-rx" || suffix === "network-in")
                return mode === "read";
              if (suffix.startsWith("warning-")) return mode === "conflict";
              return mode === "accepted";
            });
            for (const suffix of towerResponseSuffixes) {
              const indicator = id + "-tower-reactive-" + suffix;
              for (const current of [early, later])
                assert.equal(
                  path(current, indicator).opacity > 0.01,
                  active.includes(suffix),
                  `${id} ${mode} at ${at}: ${suffix} signals only its own operation`,
                );
            }
            if (mode !== "idle")
              assert.ok(
                active.some((suffix) => {
                  const indicator = id + "-tower-reactive-" + suffix;
                  return (
                    path(early, indicator).d !== path(later, indicator).d ||
                    path(early, indicator).opacity !==
                      path(later, indicator).opacity
                  );
                }),
                `${id} ${mode} stays visibly active when its stage is held`,
              );
          }
          assert.equal(
            path(early, "owner-reactive-status-rail").tone,
            ownerMode === "conflict"
              ? "fail"
              : ownerMode === "accepted"
                ? "pass"
                : "pending",
          );
          for (let cell = 0; cell < 4; cell++) {
            const id = "owner-reactive-compute-cell-" + cell;
            assert.equal(
              path(early, id).opacity > 0.08,
              ownerMode === "verify",
            );
            assert.equal(
              path(early, id).opacity !== path(later, id).opacity,
              ownerMode === "verify",
            );
          }
          for (let layer = 0; layer < 7; layer++) {
            const id = "owner-reactive-storage-" + layer;
            const active = ownerMode === "read" || ownerMode === "accepted";
            assert.equal(path(early, id).opacity > 0.06, active);
            assert.equal(
              path(early, id).opacity !== path(later, id).opacity,
              active,
            );
          }
        }
        const memoryPattern = (at: number) =>
          towerResponseSuffixes
            .filter((suffix) => suffix.startsWith("dimm-"))
            .map(
              (suffix) =>
                path(
                  frame(0.25, at, portrait),
                  "agent2-tower-reactive-" + suffix,
                ).opacity,
            );
        assert.notDeepEqual(
          memoryPattern(1),
          memoryPattern(4),
          "reading memory has a different scan from editing",
        );
        assert.notDeepEqual(
          memoryPattern(1),
          memoryPattern(5),
          "verification has its own alternating memory pattern",
        );
      }
});

test("action captions name the current agent operation and distinguish the final outcomes", () => {
  for (const portrait of [false, true])
    for (const author of authors)
      for (const recheck of rechecks) {
        const frame = conflictResolutionFrames[author][recheck];
        for (const [at, text] of [
          [0, "Two agents clone the same version: r0."],
          [0.5, "Both agents replace the same 80."],
          [1.5, "Agent 1 submits 90; owner accepts r1."],
          [2.2, "Agent 2 submits 60 against the old r0."],
          [2.8, "Owner returns 80 / 90 / 60 to Agent 2."],
          [3.6, "Agent 2 reads r1 and starts fresh work."],
          [
            4.4,
            author === "human"
              ? "A human reviews Agent 2’s new edit."
              : "Agent 2 chooses 85 and runs checks.",
          ],
          [5.5, "Agent 2 resubmits its edit against r1."],
          [
            6.5,
            recheck === "changed"
              ? "Agent 1 changed head; compare again."
              : "Owner checks the new edit against r1.",
          ],
          [
            7,
            recheck === "changed"
              ? "Conflict again: keep the accepted 70."
              : "Accepted: shared r2 contains quality=85.",
          ],
        ] as const)
          assert.equal(
            label(frame(0, at, portrait), "resolution-action").text,
            text,
          );
      }
});

test("visible projected lettering stays inside its declared inscription surface", () => {
  const violations = new Map<string, string>();
  for (const portrait of [false, true])
    for (const author of authors)
      for (const recheck of rechecks)
        for (let sample = 0; sample <= 140; sample++) {
          const at = sample / 20;
          const frame = conflictResolutionFrames[author][recheck](
            0,
            at,
            portrait,
          );
          for (const ink of frame.labels.filter(
            (value) =>
              value.surface && value.text && (value.opacity ?? 1) > 0.1,
          )) {
            assert.ok(ink.transform, ink.id + " has projected lettering");
            assert.ok(ink.surface);
            const surface = path(frame, ink.surface);
            assert.ok(surface.opacity > 0.1, ink.id + " has a visible surface");
            assert.ok(
              surface.d.endsWith("Z"),
              surface.id + " is a closed face",
            );
            const clearance = surfaceClearance(
              corners(ink, portrait),
              polygon(surface.d),
            );
            // Two nominal scene units, allowing the <0.2-unit ink depth offset.
            if (clearance < 1.75) {
              const key =
                author + "/" + recheck + "/" + portrait + "/" + ink.id;
              if (!violations.has(key))
                violations.set(
                  key,
                  key +
                    " at " +
                    at +
                    ": " +
                    clearance.toFixed(3) +
                    " units of clearance in " +
                    surface.id,
                );
            }
          }
        }
  assert.deepEqual([...violations.values()], []);
});

test("all eight stages keep stable topology, bounded geometry, clear captions and safe packet routes", () => {
  const issues = new Map<string, string>();
  const isPacket = (id: string) =>
    packets.some(([prefix]) => id.startsWith(prefix + "-"));
  for (const portrait of [false, true])
    for (const author of authors)
      for (const recheck of rechecks) {
        const frame = conflictResolutionFrames[author][recheck];
        const initial = frame(0, 0, portrait);
        assert.equal(
          new Set(initial.paths.map((value) => value.id)).size,
          initial.paths.length,
        );
        assert.equal(
          new Set(initial.labels.map((value) => value.id)).size,
          initial.labels.length,
        );
        assert.deepEqual(
          initial.paths
            .filter((value) => value.id.includes("-reactive-"))
            .map((value) => value.id)
            .sort(),
          [...responseIds].sort(),
          "the exact hardware telemetry allowlist cannot silently expand",
        );
        assert.equal(
          initial.paths.filter((value) =>
            /^owner-ram-chip-[0-2]-top$/.test(value.id),
          ).length,
          3,
        );
        for (let sample = 0; sample <= 280; sample++) {
          const at = sample / 40;
          const current = frame(0, at, portrait),
            next = frame(0, at + 0.00001, portrait);
          const check = (ok: boolean, message: string) => {
            const key = portrait + "/" + message;
            if (!ok && !issues.has(key))
              issues.set(
                key,
                author +
                  "/" +
                  recheck +
                  "/" +
                  portrait +
                  "/" +
                  at +
                  ": " +
                  message,
              );
          };
          assert.deepEqual(
            current.paths.map((value) => value.id),
            initial.paths.map((value) => value.id),
          );
          assert.deepEqual(
            current.labels.map((value) => value.id),
            initial.labels.map((value) => value.id),
          );
          const later = frame(18, at, portrait);
          assert.deepEqual(
            current.labels,
            later.labels,
            "holding a stage cannot change annotations, data, or protocol results",
          );
          assert.deepEqual(
            current.paths.map((value) => value.id),
            later.paths.map((value) => value.id),
          );
          current.paths.forEach((value, i) => {
            const cooling =
              /^agent[12]-tower-(?:intake-\d+|radiator-fan-\d+|roof-fan-\d+|rear-fan)-blade-\d+$/.test(
                value.id,
              );
            const idleLight = [
              "agent1-power-led",
              "agent2-power-led",
              "owner-power-led",
              "owner-service-light",
            ].includes(value.id);
            if (responseIds.has(value.id))
              assert.deepEqual(
                {
                  ...value,
                  opacity: later.paths[i].opacity,
                  ...(movingResponseIds.has(value.id)
                    ? { d: later.paths[i].d }
                    : {}),
                },
                later.paths[i],
                value.id +
                  ": only the declared hardware light or sweep may vary with elapsed time",
              );
            else if (cooling)
              assert.deepEqual(
                { ...value, d: later.paths[i].d },
                later.paths[i],
                "cooling may rotate only the fan blade geometry",
              );
            else if (value.id === "owner-service-light") {
              assert.deepEqual(
                { ...value, d: later.paths[i].d },
                later.paths[i],
                "the service light may move without changing its style or protocol meaning",
              );
              const before = polygon(value.d),
                after = polygon(later.paths[i].d);
              const shift = after[0][0] - before[0][0];
              assert.equal(before.length, after.length);
              assert.ok(
                Math.abs(shift) <= 21.001,
                "the service scan stays in its 21-unit track",
              );
              before.forEach(([x, y], point) => {
                assert.equal(
                  after[point][1],
                  y,
                  "the service scan never moves vertically",
                );
                assert.ok(
                  Math.abs(after[point][0] - x - shift) < 0.002,
                  "the service scan translates without changing its physical size",
                );
              });
            } else if (idleLight)
              assert.deepEqual(
                { ...value, opacity: later.paths[i].opacity },
                later.paths[i],
                "idle power/service lights may change only brightness",
              );
            else
              assert.deepEqual(
                value,
                later.paths[i],
                value.id +
                  ": held time cannot repeat submissions, edits, or camera motion",
              );
            const points = numbers(value.d),
              adjacent = numbers(next.paths[i].d);
            assert.equal(
              points.length,
              numbers(initial.paths[i].d).length,
              value.id,
            );
            assert.equal(value.material, initial.paths[i].material, value.id);
            assert.ok(value.opacity >= 0 && value.opacity <= 1, value.id);
            if (!responseIds.has(value.id))
              assert.ok(
                Math.abs(value.opacity - next.paths[i].opacity) < 0.003,
                value.id + " opacity continuity",
              );
            points.forEach((coordinate, axis) => {
              check(
                Number.isFinite(coordinate) &&
                  coordinate >= 4 &&
                  coordinate <=
                    (axis % 2 ? (portrait ? 796 : 576) : portrait ? 416 : 796),
                value.id + " is outside the scene",
              );
              check(
                Math.abs(coordinate - adjacent[axis]) < 0.04,
                value.id + " motion continuity",
              );
            });
          });
          const labels = current.labels
            .filter((value) => (value.opacity ?? 1) > 0.08 && value.text)
            .map((value) => ({
              id: value.id,
              corners: corners(value, portrait),
            }));
          for (let a = 0; a < labels.length; a++) {
            for (const [x, y] of labels[a].corners)
              check(
                x >= 4 &&
                  x <= (portrait ? 416 : 796) &&
                  y >= 4 &&
                  y <= (portrait ? 796 : 576),
                labels[a].id + " is outside the scene",
              );
            for (let b = a + 1; b < labels.length; b++)
              check(
                !overlap(labels[a].corners, labels[b].corners),
                labels[a].id + " overlaps " + labels[b].id,
              );
          }
          for (const value of current.paths.filter(
            (value) => isPacket(value.id) && value.opacity > 0.08,
          )) {
            const points = polygon(value.d);
            if (points.length < 3) continue;
            for (const ink of labels)
              check(
                !overlap(points, ink.corners),
                value.id + " covers " + ink.id,
              );
          }
          const captions = current.labels.filter(
            (value) => !value.transform && (value.opacity ?? 1) > 0.08,
          );
          for (const value of current.paths.filter(
            (value) =>
              value.d.endsWith("Z") &&
              value.material !== "shadow" &&
              value.opacity > 0.08,
          ))
            for (const caption of captions)
              check(
                !overlap(polygon(value.d), corners(caption, portrait)),
                value.id + " covers caption " + caption.id,
              );
        }
      }
  assert.deepEqual([...issues.values()], []);
});
