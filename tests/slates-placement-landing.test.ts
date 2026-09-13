import assert from "node:assert/strict";
import { test } from "node:test";
import type {
  ProofFrameFunction,
  ProofLabel,
} from "../components/proof-work/proof-geometry";
import { fleetPlacementState } from "../components/slates/fleet-data";
import { fleetPlacementFrame } from "../components/slates/fleet-geometry";
import { landingState } from "../components/slates/landing-data";
import { landingFrames } from "../components/slates/landing-geometry";

test("each region independently retains two verified holders before advancing its head", () => {
  const states = Array.from({ length: 5 }, (_, stage) =>
    fleetPlacementState(stage),
  );
  assert.deepEqual(
    states.map((s) => s.homeVerified),
    [0, 1, 2, 2, 2],
  );
  assert.deepEqual(
    states.map((s) => s.mirrorVerified),
    [0, 0, 0, 1, 2],
  );
  assert.deepEqual(
    states.map((s) => s.homeHead),
    ["v6", "v6", "v7", "v7", "v7"],
  );
  assert.deepEqual(
    states.map((s) => s.mirrorHead),
    ["v6", "v6", "v6", "v6", "v7"],
  );
  for (let n = 0; n < 400; n++)
    assert.equal(fleetPlacementState(n / 100).reply, "Mirror scope waiting");
  assert.equal(states[4].reply, "Mirror scope met");
  assert.equal(fleetPlacementState(Number.NaN).stage, 0);
});

test("a grant never bypasses the disk comparison or authorizes an outside edit", () => {
  for (let n = 0; n <= 300; n++) {
    const selection = n / 100;
    const clean = landingState(selection, "clean"),
      drift = landingState(selection, "drift");
    assert.equal(clean.granted, selection >= 1);
    assert.equal(clean.written, selection >= 3);
    assert.equal(clean.disk, selection < 3 ? "80" : "90");
    assert.equal(clean.checkedDisk, "80");
    assert.equal(clean.canWrite, selection >= 2);
    assert.equal(drift.granted, selection >= 1);
    assert.equal(drift.conflict, selection >= 2);
    assert.equal(drift.written, false);
    assert.equal(drift.disk, "60");
    assert.equal(drift.checkedDisk, "60");
    assert.equal(drift.canWrite, false);
    for (const portrait of [false, true]) {
      const frame = landingFrames.drift(0, selection, portrait);
      assert.equal(
        frame.paths.find((p) => p.id === "land-entry-write")?.opacity,
        0,
      );
      assert.equal(
        frame.labels.find((p) => p.id === "land-byte-1")?.text,
        "60",
      );
    }
  }
});

test("Check reads the witnessed and disk bytes in order and retains each comparison result", () => {
  for (const portrait of [false, true]) {
    const firstByte = landingFrames.clean(0, 1.275, portrait);
    const secondByte = landingFrames.clean(0, 1.615, portrait);
    const get = (frame: typeof firstByte, id: string) => {
      const found = frame.paths.find((path) => path.id === id);
      assert.ok(found, id);
      return found;
    };
    for (const sheet of [0, 1]) {
      assert.ok(get(firstByte, `land-check-read-${sheet}-0`).opacity > 0.8);
      assert.equal(get(firstByte, `land-check-read-${sheet}-1`).opacity, 0);
      assert.ok(get(secondByte, `land-check-read-${sheet}-0`).opacity < 1e-12);
      assert.ok(get(secondByte, `land-check-read-${sheet}-1`).opacity > 0.8);
      assert.notEqual(
        get(firstByte, `land-check-cursor-${sheet}`).d,
        get(secondByte, `land-check-cursor-${sheet}`).d,
        "the read cursor advances to the second byte",
      );
    }
    assert.equal(get(firstByte, "land-check-cursor-2").opacity, 0);
    for (const example of ["clean", "drift"] as const) {
      const checked = landingFrames[example](0, 2, portrait);
      assert.ok(get(checked, "land-check-focus-0").opacity > 0.15);
      assert.ok(get(checked, "land-check-focus-1").opacity > 0.15);
      assert.equal(
        get(checked, "land-check-focus-2").opacity,
        0,
        "the proposal never masquerades as a checked source",
      );
      assert.ok(get(checked, "land-check-match-1").opacity > 0.9);
      assert.equal(get(checked, "land-check-mismatch-1-a").opacity, 0);
      assert.equal(
        get(checked, "land-check-match-0").opacity > 0.9,
        example === "clean",
      );
      assert.equal(
        get(checked, "land-check-mismatch-0-a").opacity > 0.9,
        example === "drift",
      );
      assert.deepEqual(
        [0, 1, 2].map(
          (i) =>
            checked.labels.find((label) => label.id === `land-byte-${i}`)!.text,
        ),
        ["80", example === "clean" ? "80" : "60", "90"],
      );
      assert.deepEqual(
        [0, 1, 2].map(
          (i) =>
            checked.labels.find((label) => label.id === `land-byte-hex-${i}`)!
              .text,
        ),
        ["38 30", example === "clean" ? "38 30" : "36 30", "39 30"],
      );
      assert.match(
        checked.labels.find((label) => label.id === "land-validation")!.text,
        example === "clean" ? /80 = 80/ : /80 ≠ 60 ≠ 90/,
      );
      for (const path of checked.paths.filter((path) =>
        path.id.startsWith("land-check-read-"),
      ))
        assert.ok(
          path.opacity < 1e-12,
          "read evidence has arrived before the final verdict",
        );
      for (const sheet of [0, 1, 2])
        assert.equal(
          get(checked, `land-comparison-sheet-${sheet}`).d,
          get(firstByte, `land-comparison-sheet-${sheet}`).d,
          "only read indicators move, never the source documents",
        );
    }
    const written = landingFrames.clean(0, 3, portrait);
    assert.equal(
      written.labels.find((label) => label.id === "land-byte-1")!.text,
      "80",
      "the comparison retains the bytes it actually checked",
    );
    assert.equal(
      written.labels.find((label) => label.id === "land-disk-bytes")!.text,
      "DISK: 90",
      "the storage outcome is distinct from the earlier check",
    );
  }
});

test("the write gate remains shut through Grant and Check and opens before the first write", () => {
  for (const portrait of [false, true]) {
    const gate = (selection: number, example: "clean" | "drift") =>
      landingFrames[example](0, selection, portrait).paths.find(
        (path) => path.id === "land-write-gate",
      )!;
    const closed = gate(0, "clean").d;
    for (let sample = 0; sample <= 200; sample++) {
      assert.equal(gate(sample / 100, "clean").d, closed);
      assert.equal(gate(sample / 100, "drift").d, closed);
    }
    assert.notEqual(gate(2.02, "clean").d, closed);
    assert.notEqual(gate(2.045, "clean").d, closed);
    assert.equal(gate(3, "clean").d, gate(2.045, "clean").d);
    assert.equal(gate(3, "drift").d, closed);
    assert.equal(gate(3, "drift").tone, "fail");
    for (const selection of [1, 1.5, 2, 2.045])
      for (const example of ["clean", "drift"] as const) {
        const frame = landingFrames[example](91, selection, portrait);
        assert.ok(
          frame.paths
            .filter((path) =>
              /^(?:land-entry-write|land-nand-write-|land-nand-program-|land-controller-activity)/.test(
                path.id,
              ),
            )
            .every((path) => path.opacity === 0),
          "neither clock time, approval nor comparison programs the storage",
        );
      }
  }
});

test("landing depicts signed paper and a keyed NVMe board with controller and NAND anatomy", () => {
  for (const portrait of [false, true]) {
    const frame = landingFrames.clean(0, 3, portrait);
    const ids = frame.paths.map((path) => path.id);
    assert.ok(ids.includes("land-manifest-fold"));
    assert.ok(ids.includes("land-human-signature"));
    assert.ok(ids.includes("land-approval-stamp"));
    assert.ok(ids.includes("land-nvme-pcb-edge"));
    assert.ok(ids.includes("land-mount-plating"));
    assert.equal(
      ids.filter(
        (id) => id.startsWith("land-m-key-contact-") && id.endsWith("-top"),
      ).length,
      15,
    );
    assert.equal(
      ids.filter((id) => id.startsWith("land-qfn-") && id.endsWith("-top"))
        .length,
      24,
    );
    assert.equal(
      ids.filter(
        (id) => id.startsWith("land-nand-package-") && id.endsWith("-top"),
      ).length,
      2,
    );
    assert.equal(
      ids.filter((id) => id.startsWith("land-nand-cell-")).length,
      32,
    );
    assert.equal(
      ids.filter(
        (id) => id.startsWith("land-passive-body-") && id.endsWith("-top"),
      ).length,
      7,
    );
    assert.equal(
      ids.filter((id) => id.startsWith("land-pcb-via-trace-")).length,
      5,
    );
    assert.ok(
      !ids.some((id) => /^land-disk-\d+$/.test(id)),
      "the old platter glyph is gone",
    );
    assert.equal(
      frame.labels.find((label) => label.id === "land-entry")?.text,
      "/src/image.rs",
    );
  }
});

test("landing has solid projected components and a physical stamp without camera drift", () => {
  for (const portrait of [false, true]) {
    const waiting = landingFrames.clean(0, 0, portrait);
    const pressing = landingFrames.clean(0, 0.6, portrait);
    const granted = landingFrames.clean(0, 1, portrait);
    const written = landingFrames.clean(0, 3, portrait);
    for (const id of [
      "land-manifest",
      "land-nvme-pcb-edge",
      "land-controller-package-top",
      "land-controller-package-front",
      "land-nand-separated-layer-0-top",
      "land-nand-separated-layer-1-top",
      "land-nand-die-1-top",
      "land-write-route",
      "land-controller-to-nand-0",
      "land-controller-to-nand-1",
    ]) {
      const d = waiting.paths.find((path) => path.id === id)!.d;
      for (const frame of [pressing, granted, written])
        assert.equal(
          frame.paths.find((path) => path.id === id)!.d,
          d,
          `${id}: fixed camera and reference geometry`,
        );
    }
    for (const [base, material] of [
      ["land-controller-package", "silicon"],
      ["land-nand-package-0", "silicon"],
      ["land-nand-lifted-cap", "metal"],
      ["land-stamp-metal", "metal"],
    ]) {
      const top = waiting.paths.find((path) => path.id === base + "-top")!;
      const front = waiting.paths.find((path) => path.id === base + "-front")!;
      assert.equal(top.material, material);
      assert.equal(front.material, material);
      assert.notEqual(
        top.d,
        front.d,
        "height is drawn as a separate solid face",
      );
    }
    const stampPosition = (frame: typeof waiting) =>
      frame.paths.find((path) => path.id === "land-stamp-grip-top")!.d;
    assert.notEqual(
      stampPosition(waiting),
      stampPosition(pressing),
      "the stamp descends to the sheet",
    );
    assert.notEqual(
      stampPosition(pressing),
      stampPosition(granted),
      "the stamp lifts and clears its ink",
    );
    assert.equal(
      pressing.paths.find((path) => path.id === "land-approval-stamp")!.opacity,
      0,
    );
    assert.ok(
      granted.paths.find((path) => path.id === "land-approval-stamp")!.opacity >
        0.9,
    );
    for (const id of [
      "land-entry",
      "land-controller-name",
      "land-nand-name-0",
      "land-nand-name-1",
    ])
      assert.match(
        waiting.labels.find((label) => label.id === id)!.transform!,
        /^matrix\(/,
      );
    assert.notEqual(
      waiting.paths.find((path) => path.id === "land-board-power-led")!.opacity,
      landingFrames
        .clean(2.5, 0, portrait)
        .paths.find((path) => path.id === "land-board-power-led")!.opacity,
      "decorative board activity remains alive without changing file state",
    );
  }
});

test("landing writes reach the controller, then NAND, then synchronization; refusal never writes", () => {
  for (const portrait of [false, true]) {
    const programmed = (selection: number) =>
      landingFrames
        .clean(0, selection, portrait)
        .paths.filter((path) => path.id.startsWith("land-nand-program-"));
    const controllerOnly = landingFrames.clean(0, 2.4, portrait);
    assert.ok(
      controllerOnly.paths.find((path) => path.id === "land-entry-write")!
        .opacity > 0,
    );
    assert.ok(
      controllerOnly.paths
        .filter((path) => path.id.startsWith("land-nand-write-"))
        .every((path) => path.opacity === 0),
    );
    assert.ok(programmed(2.7).every((path) => path.opacity === 0));
    assert.ok(programmed(2.75).some((path) => path.opacity > 0));
    assert.ok(programmed(2.75).some((path) => path.opacity === 0));
    assert.ok(programmed(2.95).every((path) => path.opacity > 0.849));
    for (let sample = 0; sample <= 300; sample++) {
      const position = sample / 100;
      for (const example of ["clean", "drift"] as const) {
        const frame = landingFrames[example](0, position, portrait);
        const writes = frame.paths.filter(
          (path) =>
            path.id === "land-entry-write" ||
            path.id.startsWith("land-nand-write-") ||
            path.id.startsWith("land-nand-program-"),
        );
        if (example === "drift" || position <= 2.05)
          assert.ok(
            writes.every((path) => path.opacity === 0),
            "approval and a passed file check are both required",
          );
        if (example === "drift" || position <= 2.95)
          assert.equal(
            frame.paths.find((path) => path.id === "land-sync-confirmation")!
              .opacity,
            0,
          );
      }
    }
    const final = landingFrames.clean(0, 3, portrait);
    assert.equal(
      final.labels.find((label) => label.id === "land-disk-bytes")?.text,
      "DISK: 90",
    );
    assert.match(
      final.labels.find((label) => label.id === "land-result")!.text,
      /SYNCHRONIZED/,
    );
    assert.deepEqual(
      landingFrames.clean(0, Number.NaN, portrait),
      landingFrames.clean(0, 0, portrait),
    );
  }
});

test("landing labels have distinct gutters in every desktop and portrait stage", () => {
  for (const portrait of [false, true])
    for (const example of ["clean", "drift"] as const)
      for (let sample = 0; sample <= 60; sample++) {
        const labels = landingFrames[example](
          0,
          sample / 20,
          portrait,
        ).labels.filter((label) => (label.opacity ?? 1) > 0.05);
        for (let a = 0; a < labels.length; a++)
          for (let b = a + 1; b < labels.length; b++) {
            const left = labelBox(labels[a], portrait),
              right = labelBox(labels[b], portrait);
            assert.ok(
              !boxesOverlap(left, right),
              `${example}/${portrait}: ${labels[a].id} overlaps ${labels[b].id}`,
            );
          }
      }
});

const coordinates = (d: string) =>
  Array.from(d.matchAll(/-?\d+(?:\.\d+)?/g), ([v]) => Number(v));
const examples: [string, ProofFrameFunction, number][] = [
  ["fleet", fleetPlacementFrame, 4],
  ["land-clean", landingFrames.clean, 3],
  ["land-drift", landingFrames.drift, 3],
];

test("placement and landing retain fixed topology and continuous geometry in both layouts", () => {
  for (const [name, frame, end] of examples)
    for (const portrait of [false, true]) {
      const initial = frame(0, 0, portrait);
      assert.equal(
        new Set(initial.paths.map((p) => p.id)).size,
        initial.paths.length,
      );
      assert.equal(
        new Set(initial.labels.map((p) => p.id)).size,
        initial.labels.length,
      );
      for (let n = 0; n <= end * 50; n++) {
        const selection = n / 50;
        const current = frame(0, selection, portrait),
          next = frame(0, selection + 0.00001, portrait);
        const later = frame(2.5, selection, portrait);
        if (name === "fleet")
          assert.deepEqual(current, later, "fleet has no ambient animation");
        else {
          assert.deepEqual(
            current.labels,
            later.labels,
            "ambient activity cannot move inscriptions",
          );
          assert.deepEqual(
            current.paths.filter((p) => p.id !== "land-board-power-led"),
            later.paths.filter((p) => p.id !== "land-board-power-led"),
            "only the activity LED responds to ambient time; camera, packages and routes stay fixed",
          );
          assert.equal(
            current.paths.find((p) => p.id === "land-board-power-led")!.d,
            later.paths.find((p) => p.id === "land-board-power-led")!.d,
          );
        }
        assert.deepEqual(
          current.paths.map((p) => p.id),
          initial.paths.map((p) => p.id),
        );
        assert.deepEqual(
          current.labels.map((p) => p.id),
          initial.labels.map((p) => p.id),
        );
        current.paths.forEach((path, i) => {
          const numbers = coordinates(path.d),
            adjacent = coordinates(next.paths[i].d);
          assert.equal(numbers.length, coordinates(initial.paths[i].d).length);
          assert.ok(path.opacity >= 0 && path.opacity <= 1);
          assert.ok(
            Math.abs(path.opacity - next.paths[i].opacity) < 0.001,
            `${name}/${path.id}: opacity jump`,
          );
          numbers.forEach((value, axis) => {
            assert.ok(Number.isFinite(value));
            assert.ok(
              value >= 4 &&
                value <=
                  (axis % 2 ? (portrait ? 736 : 516) : portrait ? 416 : 796),
              `${name}/${portrait}/${path.id}: ${value}`,
            );
            assert.ok(
              Math.abs(value - adjacent[axis]) <=
                (path.id.startsWith("land-entry-write") ? 0.03 : 0.02),
              `${name}/${path.id}: position jump`,
            );
          });
        });
      }
    }
});

function labelBox(label: ProofLabel, portrait: boolean) {
  const font =
    label.kind === "heading"
      ? portrait
        ? 11
        : 9
      : label.kind === "small"
        ? portrait
          ? 12
          : 10
        : portrait
          ? 13
          : 11;
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
  const local = {
    left: x - 1,
    right: x + width + 1,
    top: label.y - font,
    bottom: label.y + 3,
  };
  const matrix = label.transform
    ? coordinates(label.transform)
    : [1, 0, 0, 1, 0, 0];
  assert.equal(matrix.length, 6, `${label.id}: six-component text matrix`);
  const [a, b, c, d, e, f] = matrix;
  const corners = [
    [local.left, local.top],
    [local.right, local.top],
    [local.right, local.bottom],
    [local.left, local.bottom],
  ].map(([px, py]) => [a * px + c * py + e, b * px + d * py + f]);
  assert.ok(corners.flat().every(Number.isFinite));
  return {
    left: Math.min(...corners.map((p) => p[0])),
    right: Math.max(...corners.map((p) => p[0])),
    top: Math.min(...corners.map((p) => p[1])),
    bottom: Math.max(...corners.map((p) => p[1])),
    local,
    matrix,
    corners,
  };
}
function boxesOverlap(
  left: ReturnType<typeof labelBox>,
  right: ReturnType<typeof labelBox>,
) {
  for (const polygon of [left.corners, right.corners])
    for (let i = 0; i < 4; i++) {
      const a = polygon[i],
        b = polygon[(i + 1) % 4];
      const axis = [a[1] - b[1], b[0] - a[0]];
      const project = (points: number[][]) =>
        points.map(([x, y]) => x * axis[0] + y * axis[1]);
      const l = project(left.corners),
        r = project(right.corners);
      if (Math.max(...l) <= Math.min(...r) || Math.max(...r) <= Math.min(...l))
        return false;
    }
  return true;
}
function intersects(a: number[], b: number[], r: ReturnType<typeof labelBox>) {
  const [ma, mb, mc, md, me, mf] = r.matrix;
  const determinant = ma * md - mb * mc;
  assert.ok(
    Math.abs(determinant) > 0.001,
    "projected inscriptions cannot collapse",
  );
  const inverse = ([x, y]: number[]) => [
    ((x - me) * md - (y - mf) * mc) / determinant,
    ((y - mf) * ma - (x - me) * mb) / determinant,
  ];
  a = inverse(a);
  b = inverse(b);
  let min = 0,
    max = 1;
  const dx = b[0] - a[0],
    dy = b[1] - a[1];
  for (const [p, q] of [
    [-dx, a[0] - r.local.left],
    [dx, r.local.right - a[0]],
    [-dy, a[1] - r.local.top],
    [dy, r.local.bottom - a[1]],
  ]) {
    if (p === 0) {
      if (q < 0) return false;
    } else if (p < 0) min = Math.max(min, q / p);
    else max = Math.min(max, q / p);
    if (min > max) return false;
  }
  return true;
}

function pointsOf(d: string) {
  const nums = coordinates(d);
  return Array.from({ length: nums.length / 2 }, (_, i) =>
    nums.slice(i * 2, i * 2 + 2),
  );
}
function containsPoint(polygon: number[][], [x, y]: number[]) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i],
      [xj, yj] = polygon[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)
      inside = !inside;
  }
  return inside;
}

test("routes and moving packets stay outside caption gutters throughout each sequence", () => {
  for (const [name, frame, end] of examples)
    for (const portrait of [false, true])
      for (let n = 0; n <= end * 50; n++) {
        const current = frame(0, n / 50, portrait);
        const drawn = current.paths.map((path, index) => ({
          path,
          index,
          points: pointsOf(path.d),
        }));
        const labels = current.labels
          .filter((label) => (label.opacity ?? 1) > 0.05)
          .map((label) => ({
            id: label.id,
            surface: label.surface,
            ...labelBox(label, portrait),
          }));
        for (const box of labels) {
          assert.ok(
            box.left >= 4 && box.right <= (portrait ? 416 : 796),
            `${name}/${portrait}/${box.id}: horizontal bounds`,
          );
          assert.ok(
            box.top >= 4 && box.bottom <= (portrait ? 736 : 516),
            `${name}/${portrait}/${box.id}: transformed vertical bounds`,
          );
          let supportIndex = -1;
          if (box.surface) {
            supportIndex = current.paths.findIndex((p) => p.id === box.surface);
            assert.ok(
              supportIndex >= 0,
              `${box.id}: a real material surface supports the inscription`,
            );
            const support = current.paths[supportIndex];
            assert.ok(
              support.material,
              `${box.id}: support is filled, not a wire outline`,
            );
            assert.ok(
              box.corners.every((corner) =>
                containsPoint(drawn[supportIndex].points, corner),
              ),
              `${name}/${portrait}/${n / 50}: ${box.id} escapes its ${box.surface} surface`,
            );
          }
          for (const { index, path, points: sourcePoints } of drawn) {
            if (path.opacity <= 0.05) continue;
            // An inscription is painted on this filled face. Earlier geometry is behind it,
            // but all later details and packets must still leave its actual rotated glyph box clear.
            if (supportIndex >= 0 && index <= supportIndex) continue;
            const points = path.d.endsWith("Z")
              ? [...sourcePoints, sourcePoints[0]]
              : sourcePoints;
            for (let i = 1; i < points.length; i++)
              assert.ok(
                !intersects(points[i - 1], points[i], box),
                `${name}/${portrait}/${n / 50}: ${path.id} crosses ${box.id}`,
              );
          }
        }
      }
});
