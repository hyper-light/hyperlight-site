import assert from "node:assert/strict";
import { test } from "node:test";
import {
  cassetteArtifacts,
  cassetteStates,
} from "../components/proof-work/evidence-cassette-data";
import { evidenceCassetteFrame } from "../components/proof-work/evidence-cassette-geometry";
import {
  fixtureExamples,
  fixtureOutcome,
} from "../components/proof-work/validation-fixture-data";
import { validationFixtureFrame } from "../components/proof-work/validation-fixture-geometry";
import type {
  ProofFrame,
  ProofPath,
} from "../components/proof-work/proof-geometry";

function numbers(path: ProofPath) {
  return path.d.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
}
function points(path: ProofPath) {
  const values = numbers(path);
  return Array.from({ length: values.length / 2 }, (_, index) => [
    values[index * 2],
    values[index * 2 + 1],
  ]);
}
function shape(frame: ProofFrame, id: string) {
  const path = frame.paths.find((entry) => entry.id === id);
  assert.ok(path, `${id} is part of the rendered frame`);
  return path;
}
function text(frame: ProofFrame, id: string) {
  const label = frame.labels.find((entry) => entry.id === id);
  assert.ok(label, `${id} is visible in the scene`);
  return label.text;
}
function edgeDistance(point: number[], polygon: number[][]) {
  return Math.min(
    ...polygon.slice(1).map((end, index) => {
      const start = polygon[index];
      const dx = end[0] - start[0],
        dy = end[1] - start[1];
      const progress = Math.max(
        0,
        Math.min(
          1,
          ((point[0] - start[0]) * dx + (point[1] - start[1]) * dy) /
            (dx * dx + dy * dy),
        ),
      );
      return Math.hypot(
        point[0] - start[0] - progress * dx,
        point[1] - start[1] - progress * dy,
      );
    }),
  );
}
function onEdge(point: number[], polygon: number[][]) {
  const distance = edgeDistance(point, polygon);
  assert.ok(
    distance < 0.025,
    `projected attachment misses its edge by ${distance}`,
  );
}
function within(point: number[], polygon: number[][]) {
  // Front skins are convex; checking edge signs works after the shared 3D projection.
  const signs = polygon.slice(1).map((end, index) => {
    const start = polygon[index];
    return (
      (end[0] - start[0]) * (point[1] - start[1]) -
      (end[1] - start[1]) * (point[0] - start[0])
    );
  });
  assert.ok(
    signs.every((value) => value >= -0.03) ||
      signs.every((value) => value <= 0.03),
    `point ${point} must remain in its workspace`,
  );
}

test("evidence separates close, post and receipt while retaining exact identities", () => {
  assert.deepEqual(
    cassetteArtifacts.map(({ id, slot, reference }) => [id, slot, reference]),
    [
      ["patch-a", "01", "A / hA"],
      ["tests-a", "02", "L / hL"],
      ["repro-a", "03", "R / hR"],
    ],
  );
  assert.deepEqual(
    cassetteStates.map(({ label }) => label),
    ["Artifacts", "Close", "Post", "Receive"],
  );
  for (const portrait of [false, true])
    for (const selection of [0, 0.4, 1, 1.7, 2, 2.5, 3]) {
      const frame = evidenceCassetteFrame(4, selection, portrait);
      assert.equal(text(frame, "maintainer-name"), "Maintainer");
      assert.equal(text(frame, "parser-name"), "Parser agent");
      assert.equal(text(frame, "ledger-name"), "Ledger");
      assert.equal(text(frame, "ledger-role"), "AUTHORITATIVE RECORD");
      assert.equal(text(frame, "testament-title"), "Testament T8 · C17");
      assert.equal(
        text(frame, "testament-bindings"),
        "A / hA · L / hL · R / hR",
      );
      assert.equal(text(frame, "acceptance"), "Acceptance: Pending");
      for (let index = 0; index < 3; index++)
        assert.equal(
          text(frame, `artifact-${index}-identity`),
          cassetteArtifacts[index].reference,
        );
    }
  assert.equal(
    text(evidenceCassetteFrame(0, 1, false), "testament-stage"),
    "Closed · bindings fixed",
  );
  assert.equal(
    text(evidenceCassetteFrame(0, 2, false), "testament-stage"),
    "Posted · ready to read",
  );
  assert.equal(
    text(evidenceCassetteFrame(0, 3, false), "testament-stage"),
    "Received · receipt kept",
  );
});

test("fixture acceptance cannot combine test A with review B", () => {
  assert.deepEqual(fixtureExamples.map(fixtureOutcome), [
    "Satisfied",
    "Not satisfied",
    "Failed",
    "Incomplete",
    "Errored",
  ]);
  assert.deepEqual(
    fixtureExamples[1].checks.map(({ artifact, verdict }) => [
      artifact,
      verdict,
    ]),
    [
      ["A", "Pass"],
      ["B", "Pass"],
    ],
  );
  const sameB = {
    ...fixtureExamples[0],
    checks: fixtureExamples[0].checks.map((check) => ({
      ...check,
      artifact: "B" as const,
    })),
  };
  assert.equal(fixtureOutcome(sameB), "Satisfied");
  for (const portrait of [false, true])
    for (let selection = 0; selection < 5; selection++) {
      const frame = validationFixtureFrame(2, selection, portrait);
      assert.equal(
        text(frame, "acceptance-status"),
        fixtureOutcome(fixtureExamples[selection]),
      );
      assert.equal(text(frame, "local-evaluator"), "Local evaluator");
      assert.equal(text(frame, "ledger-role"), "AUTHORITATIVE RECORD");
      assert.equal(text(frame, "artifact-B-identity"), "B / hB");
      if (selection === 3) {
        assert.equal(text(frame, "artifact-A-identity"), "Not supplied");
        assert.equal(text(frame, "tests-result-target"), "No target");
        assert.equal(text(frame, "tests-result-title"), "Tests · Not run");
        assert.ok(shape(frame, "tests-binding-flow").opacity < 0.11);
      } else {
        assert.equal(text(frame, "artifact-A-identity"), "A / hA");
      }
    }
});

test("manifest bindings remain attached to their exact retained records", () => {
  for (const portrait of [false, true])
    for (const time of [0, 1, 5, 12, 28, 48])
      for (const selection of [0, 0.4, 1, 1.25, 2, 2.6, 3]) {
        const frame = evidenceCassetteFrame(time, selection, portrait);
        for (let index = 0; index < 3; index++) {
          const binding = shape(frame, `binding-${index}`);
          assert.equal(binding.d, shape(frame, `binding-light-${index}`).d);
          const vertices = points(binding);
          onEdge(vertices[0], points(shape(frame, `artifact-${index}-skin`)));
          onEdge(vertices.at(-1)!, points(shape(frame, "testament-skin")));
        }
      }
});

test("validation results bind to the exact named artifact inside the ledger", () => {
  for (const portrait of [false, true])
    for (const time of [0, 2, 15, 42])
      for (const selection of [0, 1, 2, 4]) {
        const frame = validationFixtureFrame(time, selection, portrait);
        const ledger = points(shape(frame, "ledger-skin"));
        for (let index = 0; index < 2; index++) {
          const name = index ? "review" : "tests";
          const binding = shape(frame, name + "-binding-path");
          assert.equal(binding.d, shape(frame, name + "-binding-flow").d);
          const vertices = points(binding);
          const target = fixtureExamples[selection].checks[index].artifact!;
          onEdge(vertices[0], points(shape(frame, name + "-result-skin")));
          onEdge(
            vertices.at(-1)!,
            points(shape(frame, "artifact-" + target + "-skin")),
          );
          for (const point of vertices) within(point, ledger);
        }
      }
});

test("all external exchanges connect an actor and the authoritative ledger, never two peers", () => {
  const exchanges = [
    [
      evidenceCassetteFrame,
      [
        ["submit-artifacts", "parser", "ledger"],
        ["close-testament", "parser", "ledger"],
        ["post-testament", "parser", "ledger"],
        ["read-testament", "ledger", "maintainer"],
        ["record-receipt", "maintainer", "ledger"],
      ],
    ],
    [
      validationFixtureFrame,
      [
        ["read-context", "ledger", "maintainer"],
        ["post-results", "maintainer", "ledger"],
        ["publish-work", "parser", "ledger"],
      ],
    ],
  ] as const;
  for (const [frame, routes] of exchanges)
    for (const portrait of [false, true])
      for (const time of [0, 5, 18, 37]) {
        const current = frame(time, 1, portrait);
        for (const [id, from, to] of routes) {
          const route = shape(current, id + "-path");
          assert.equal(route.d, shape(current, id + "-flow").d);
          const vertices = points(route);
          onEdge(vertices[0], points(shape(current, from + "-skin")));
          onEdge(vertices.at(-1)!, points(shape(current, to + "-skin")));
          assert.ok(from === "ledger" || to === "ledger");
        }
      }
});

test("authoritative records stay in the ledger and are never handed to another workspace", () => {
  for (const [frame, max, records] of [
    [
      evidenceCassetteFrame,
      3,
      ["artifact-0", "artifact-1", "artifact-2", "testament"],
    ],
    [
      validationFixtureFrame,
      4,
      [
        "artifact-A",
        "artifact-B",
        "tests-result",
        "review-result",
        "acceptance",
      ],
    ],
  ] as const)
    for (const portrait of [false, true])
      for (const time of [0, 10, 30]) {
        const initial = frame(time, 0, portrait);
        for (let selection = 0; selection <= max; selection += 0.5) {
          const current = frame(time, selection, portrait);
          const ledger = points(shape(current, "ledger-skin"));
          for (const id of records) {
            assert.equal(
              shape(current, id + "-skin").d,
              shape(initial, id + "-skin").d,
            );
            for (const point of points(shape(current, id + "-skin")))
              within(point, ledger);
          }
          if (frame === validationFixtureFrame)
            for (const id of ["tests", "review"])
              for (const point of points(shape(current, id + "-scanner-skin")))
                within(point, points(shape(current, "maintainer-skin")));
        }
      }
});

test("ledger processes retain fixed topology and bounded geometry in both layouts", () => {
  for (const [frame, max] of [
    [evidenceCassetteFrame, 3],
    [validationFixtureFrame, 4],
  ] as const)
    for (const portrait of [false, true]) {
      const initial = frame(0, 0, portrait);
      const topology = initial.paths.map(({ id, kind, d }) => [
        id,
        kind,
        d.replace(/[^MLCZ]/g, ""),
      ]);
      assert.equal(
        new Set(initial.paths.map(({ id }) => id)).size,
        initial.paths.length,
      );
      assert.ok(
        initial.paths.length < 1000,
        "bound the detailed scene's retained geometry",
      );
      for (let time = 0; time <= 48; time += 6)
        for (let selection = 0; selection <= max; selection += 0.5) {
          const current = frame(time, selection, portrait);
          assert.deepEqual(
            current.paths.map(({ id, kind, d }) => [
              id,
              kind,
              d.replace(/[^MLCZ]/g, ""),
            ]),
            topology,
          );
          assert.deepEqual(
            current.labels.map(({ id }) => id),
            initial.labels.map(({ id }) => id),
          );
          for (const path of current.paths) {
            assert.ok(
              Number.isFinite(path.opacity) &&
                path.opacity >= 0 &&
                path.opacity <= 1,
            );
            for (const [x, y] of points(path)) {
              assert.ok(
                x >= 4 && x <= (portrait ? 416 : 796),
                `${path.id} x=${x}`,
              );
              assert.ok(
                y >= 4 && y <= (portrait ? 736 : 516),
                `${path.id} y=${y}`,
              );
            }
          }
          for (const label of current.labels) {
            assert.ok(label.x >= 20 && label.x <= (portrait ? 400 : 780));
            assert.ok(label.y >= 20 && label.y <= (portrait ? 720 : 500));
          }
        }
    }
});

test("read heads move continuously while participant-local checks and ledger records stay attached", () => {
  for (const [frame, id] of [
    [evidenceCassetteFrame, "artifact-0-read-head"],
    [validationFixtureFrame, "tests-scanner-skin"],
  ] as const)
    for (const portrait of [false, true]) {
      const a = numbers(shape(frame(0, 1, portrait), id));
      const b = numbers(shape(frame(2, 1, portrait), id));
      assert.ok(
        Math.max(...a.map((value, index) => Math.abs(value - b[index]))) > 2,
      );
      for (const time of [0, 1, 5, 12, 28, 48]) {
        const before = frame(time, 0.7, portrait);
        const after = frame(time + 1 / 60, 0.7, portrait);
        for (let index = 0; index < before.paths.length; index++) {
          const x = numbers(before.paths[index]),
            y = numbers(after.paths[index]);
          assert.equal(x.length, y.length);
          for (let point = 0; point < x.length; point++)
            assert.ok(
              Math.abs(x[point] - y[point]) < 0.5,
              `${before.paths[index].id} jumps at ${time}`,
            );
        }
      }
    }
});
