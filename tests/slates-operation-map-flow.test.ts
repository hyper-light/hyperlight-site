import assert from "node:assert/strict";
import { test } from "node:test";
import type {
  ProofFrame,
  ProofLabel,
  ProofPath,
} from "../components/proof-work/proof-geometry";
import {
  operationMapExample,
  operationMapSnapshot,
  operationMapSteps,
} from "../components/slates/operation-map-data";
import { operationMapFrame } from "../components/slates/operation-map-geometry";

function label(frame: ProofFrame, id: string) {
  const found = frame.labels.find((item) => item.id === id);
  assert.ok(found, id);
  return found;
}
function path(frame: ProofFrame, id: string) {
  const found = frame.paths.find((item) => item.id === id);
  assert.ok(found, id);
  return found;
}
const numbers = (text: string) =>
  Array.from(text.matchAll(/-?\d+(?:\.\d+)?/g), ([n]) => Number(n));
function origin(value: ProofLabel) {
  if (!value.transform) return [value.x, value.y];
  const [a, b, c, d, e, f] = numbers(value.transform);
  return [a * value.x + c * value.y + e, b * value.x + d * value.y + f];
}
function glyphCorners(value: ProofLabel, portrait: boolean) {
  const size =
    value.kind === "heading"
      ? portrait
        ? 11
        : 9
      : value.kind === "small"
        ? portrait
          ? 12
          : 10
        : portrait
          ? 13
          : 11;
  const width =
    value.text.length *
    size *
    (value.kind === "heading" ? 0.71 : value.kind === "name" ? 0.68 : 0.6);
  const x =
    value.x -
    (value.anchor === "end"
      ? width
      : value.anchor === "middle"
        ? width / 2
        : 0);
  const matrix = value.transform
    ? numbers(value.transform)
    : [1, 0, 0, 1, 0, 0];
  const [a, b, c, d, e, f] = matrix;
  const corners = [
    [x, value.y - size * 0.9],
    [x + width, value.y - size * 0.9],
    [x + width, value.y + size * 0.2],
    [x, value.y + size * 0.2],
  ].map(([x, y]) => [a * x + c * y + e, b * x + d * y + f]);
  return corners;
}
function glyphBounds(value: ProofLabel, portrait: boolean) {
  const corners = glyphCorners(value, portrait);
  return {
    left: Math.min(...corners.map(([x]) => x)),
    right: Math.max(...corners.map(([x]) => x)),
    top: Math.min(...corners.map(([, y]) => y)),
    bottom: Math.max(...corners.map(([, y]) => y)),
  };
}
function overlaps(a: number[][], b: number[][]) {
  return ![a, b].some((polygon) =>
    polygon.some(([x, y], i) => {
      const [nx, ny] = polygon[(i + 1) % polygon.length],
        axis = [y - ny, nx - x];
      const aa = a.map(([x, y]) => x * axis[0] + y * axis[1]),
        bb = b.map(([x, y]) => x * axis[0] + y * axis[1]);
      return (
        Math.max(...aa) <= Math.min(...bb) + 0.001 ||
        Math.max(...bb) <= Math.min(...aa) + 0.001
      );
    }),
  );
}

function pathBounds(value: ProofPath) {
  const coordinates = numbers(value.d);
  const xs = coordinates.filter((_, index) => index % 2 === 0),
    ys = coordinates.filter((_, index) => index % 2 === 1);
  return {
    left: Math.min(...xs),
    right: Math.max(...xs),
    top: Math.min(...ys),
    bottom: Math.max(...ys),
  };
}
test("operation mapping preserves the intended ASCII bytes after a 12-byte insertion", () => {
  assert.deepEqual(
    operationMapSteps.map((step) => step.label),
    ["Select", "Insert", "Map", "Write"],
  );
  const selected = operationMapSnapshot(0),
    inserted = operationMapSnapshot(1),
    mapped = operationMapSnapshot(2),
    written = operationMapSnapshot(3);
  assert.equal(selected.file, "image.conf");
  assert.equal(Buffer.byteLength(selected.base), 21);
  assert.equal(Buffer.byteLength(operationMapExample.insertion), 12);
  assert.equal(
    selected.base.slice(selected.declared.start, selected.declared.end),
    "80",
  );
  assert.equal(inserted.head, "format=webp\nquality=80\ncache=off\n");
  assert.equal(
    inserted.head.slice(8, 10),
    "eb",
    "writing at the old coordinates would change the new setting",
  );
  assert.deepEqual(mapped.mapped, { start: 20, end: 22, bytes: "90" });
  assert.equal(
    mapped.head.slice(mapped.mapped!.start, mapped.mapped!.end),
    "80",
  );
  assert.equal(written.result, "format=webp\nquality=90\ncache=off\n");
  assert.equal(Buffer.byteLength(written.result!), 33);
  assert.equal(
    written.result,
    mapped.head.slice(0, 20) + mapped.declared.bytes + mapped.head.slice(22),
  );
  for (let sample = 0; sample <= 120; sample++) {
    const snapshot = operationMapSnapshot(sample / 40);
    assert.equal(snapshot.base, operationMapExample.base);
    assert.deepEqual(snapshot.declared, operationMapExample.declared);
  }
});

test("the owner moves actual rows, remaps the range, then applies Agent 2's replacement", () => {
  for (const portrait of [false, true]) {
    const before = operationMapFrame(0, 0, portrait),
      inserted = operationMapFrame(0, 1, portrait),
      mapped = operationMapFrame(0, 2, portrait),
      written = operationMapFrame(0, 3, portrait);
    assert.equal(label(before, "original-code").text, "quality=80");
    assert.equal(label(written, "original-code").text, "quality=80");
    assert.equal(label(written, "quality-code").text, "quality=");
    assert.equal(label(written, "cache-code").text, "cache=off");
    assert.equal(label(written, "replacement-byte").text, "90");
    assert.equal(label(written, "current-old-byte").opacity, 0);
    assert.equal(label(written, "inserted-byte").text, "format=webp");
    assert.equal(label(written, "inserted-newline").text, "↵");
    assert.equal(label(inserted, "current-byte-range").text, "[8, 10)");
    assert.equal(label(mapped, "current-byte-range").text, "[20, 22)");
    assert.equal(label(inserted, "current-byte-range").tone, "fail");
    assert.equal(label(mapped, "quality-row-offset").text, "12");
    assert.equal(label(mapped, "cache-row-offset").text, "23");
    assert.equal(label(mapped, "insert-offset").text, "0");
    assert.equal(label(mapped, "file-size").text, "33 bytes · 3 lines");
    const delta = (id: string) =>
      origin(label(inserted, id)).map(
        (v, i) => v - origin(label(before, id))[i],
      );
    for (const id of ["quality-code", "cache-code", "current-old-byte"]) {
      const shift = delta(id);
      assert.ok(
        Math.abs(shift[0] - 9.68) < 0.002 && Math.abs(shift[1] - 38.72) < 0.002,
        id + " moves by exactly one projected 44-unit row",
      );
    }
    const prior = numbers(path(inserted, "mapped-selection-left-top").d),
      after = numbers(path(mapped, "mapped-selection-left-top").d);
    assert.ok(
      Math.abs(after[0] - prior[0] - 10.56) < 0.002 &&
        Math.abs(after[1] - prior[1] - 42.24) < 0.002,
      "mapping moves the frame from inline eb to the raised 80 patch",
    );
    const target = origin(label(mapped, "current-old-byte")),
      landed = origin(label(written, "replacement-byte"));
    target.forEach((n, i) =>
      assert.ok(
        Math.abs(n - landed[i]) < 0.002,
        "90 lands exactly where the original80 was",
      ),
    );
    assert.match(
      label(written, "mapping-explanation").text,
      /replaces those two bytes with 90/,
    );
    assert.equal(label(written, "insert-role").opacity, 0);
    assert.equal(label(written, "insert-size").opacity, 0);
    assert.equal(path(before, "incoming-operation-top").opacity, 0);
    assert.ok(
      path(operationMapFrame(0, 1.5, portrait), "incoming-operation-top")
        .opacity > 0.5,
    );
    assert.ok(path(mapped, "incoming-operation-top").opacity < 1e-12);
    for (const item of before.paths.filter(({ id }) =>
      /^(operation-record|operation-fold|operation-rule|original-selection)/.test(
        id,
      ),
    ))
      assert.deepEqual(
        path(written, item.id),
        item,
        "Agent 2's original operation reference remains fixed",
      );
  }
});

test("the initial insertion strip has a clear desktop seam and its landing position stays fixed", () => {
  const initial = operationMapFrame(0, 0, false);
  const incoming = pathBounds(path(initial, "insertion-row-top")),
    owner = pathBounds(path(initial, "file-header-top"));
  assert.ok(
    owner.top - incoming.bottom >= 18,
    "incoming strip and owner file need at least18 projected units of starting clearance",
  );
  for (const portrait of [false, true]) {
    const landed = numbers(
      path(operationMapFrame(0, 1, portrait), "insertion-row-top").d,
    );
    assert.ok(Math.abs(landed[0] - (portrait ? 65.88 : 321.88)) < 0.002);
    assert.ok(Math.abs(landed[1] - (portrait ? 417.32 : 192.32)) < 0.002);
    const first = operationMapFrame(0, 0, portrait),
      mid = operationMapFrame(0, 0.65, portrait),
      last = operationMapFrame(0, 1, portrait);
    assert.notEqual(
      path(first, "insertion-row-top").d,
      path(mid, "insertion-row-top").d,
    );
    assert.notEqual(
      path(mid, "insertion-row-top").d,
      path(last, "insertion-row-top").d,
    );
  }
});

test("selection rails tightly enclose the actual bytes without leaving stale rails over the inserted row", () => {
  for (const portrait of [false, true]) {
    const size = portrait ? 13 : 11;
    for (const stage of [0, 1, 2, 3]) {
      const frame = operationMapFrame(0, stage, portrait);
      const selected =
        stage === 1
          ? { ...label(frame, "inserted-byte"), text: "eb", x: 8 * size * 0.6 }
          : label(frame, stage === 3 ? "replacement-byte" : "current-old-byte");
      const [a, b, c, d, e, f] = numbers(selected.transform!);
      const determinant = a * d - b * c;
      const rails = ["mapped-selection-back", "mapped-selection-front"].flatMap(
        (id) => {
          const coordinates = numbers(path(frame, id).d);
          return [0, 2].map((i) => {
            const x = coordinates[i] - e,
              y = coordinates[i + 1] - f;
            return [
              (d * x - c * y) / determinant - selected.x,
              (-b * x + a * y) / determinant - selected.y,
            ];
          });
        },
      );
      const xs = rails.map(([x]) => x),
        ys = rails.map(([, y]) => y);
      assert.ok(Math.min(...xs) < -1 && Math.min(...xs) > -5);
      assert.ok(
        Math.max(...xs) > size * 1.2 + 1 && Math.max(...xs) < size * 1.2 + 5,
      );
      assert.ok(
        Math.min(...ys) < -size * 0.9 - 1 && Math.min(...ys) > -size * 0.9 - 4,
      );
      assert.ok(
        Math.max(...ys) > size * 0.2 + 1 && Math.max(...ys) < size * 0.2 + 4,
      );
      for (const item of frame.paths.filter(({ id }) =>
        id.startsWith("stale-selection"),
      ))
        assert.equal(
          item.opacity,
          0,
          "an obsolete bracket must not cross format=webp",
        );
    }
  }
});

test("code uses ordinary contiguous mono runs on dimensional content, not expanded characters", () => {
  for (const portrait of [false, true]) {
    const current = operationMapFrame(0, 2, portrait);
    for (const [id, text] of [
      ["original-code", "quality=80"],
      ["quality-code", "quality="],
      ["cache-code", "cache=off"],
      ["inserted-byte", "format=webp"],
      ["replacement-byte", "90"],
    ]) {
      const value = label(current, id);
      assert.equal(value.text, text);
      assert.equal(value.kind, "label");
      const matrix = numbers(value.transform!);
      assert.ok(
        matrix[0] <= 1 && matrix[3] >= 0.8 && matrix[3] <= 1,
        "ordinary-size lettering on a gentle document plane",
      );
      assert.equal(
        current.labels.filter((item) => item.id.startsWith(id + "-")).length,
        0,
        "one contiguous text run",
      );
    }
    assert.equal(
      current.paths.filter((item) => /^file-layer-[0-2]-top$/.test(item.id))
        .length,
      3,
    );
    assert.ok(path(current, "removed-patch-side").material);
    assert.ok(path(current, "replacement-patch-side").material);
    assert.ok(path(current, "file-fold").material);
  }
});

test("fractional movement keeps stable topology, normal lettering bounds and a fixed viewpoint", () => {
  for (const portrait of [false, true]) {
    const first = operationMapFrame(0, 0, portrait),
      pathIds = first.paths.map((item) => item.id),
      labelIds = first.labels.map((item) => item.id);
    assert.equal(new Set(pathIds).size, pathIds.length);
    assert.equal(new Set(labelIds).size, labelIds.length);
    for (let sample = 0; sample <= 150; sample++) {
      const selection = sample / 50,
        current = operationMapFrame(0, selection, portrait),
        later = operationMapFrame(42, selection, portrait);
      assert.deepEqual(
        current.paths.map((item) => item.id),
        pathIds,
      );
      assert.deepEqual(
        current.labels.map((item) => item.id),
        labelIds,
      );
      assert.deepEqual(current.labels, later.labels);
      current.paths.forEach((item, index) => {
        assert.equal(
          numbers(item.d).length,
          numbers(first.paths[index].d).length,
          item.id,
        );
        assert.equal(
          item.d,
          later.paths[index].d,
          item.id + " has no ambient position shift",
        );
        assert.equal(item.material, first.paths[index].material);
        assert.ok(item.opacity >= 0 && item.opacity <= 1);
        if (item.id !== "request-caret")
          assert.deepEqual(item, later.paths[index]);
        const box = pathBounds(item);
        assert.ok(
          box.left >= 16 &&
            box.right <= (portrait ? 404 : 784) &&
            box.top >= 16 &&
            box.bottom <= (portrait ? 724 : 510),
          item.id,
        );
      });
      for (const item of current.labels) {
        const box = glyphBounds(item, portrait);
        assert.ok(
          box.left >= 16 &&
            box.right <= (portrait ? 404 : 784) &&
            box.top >= 16 &&
            box.bottom <= (portrait ? 724 : 512),
          item.id,
        );
      }
      const visible = current.labels.filter(
        (item) => (item.opacity ?? 1) > 0.08,
      );
      for (let a = 0; a < visible.length; a++)
        for (let b = a + 1; b < visible.length; b++)
          assert.ok(
            !overlaps(
              glyphCorners(visible[a], portrait),
              glyphCorners(visible[b], portrait),
            ),
            portrait +
              "/" +
              selection +
              ": " +
              visible[a].id +
              " overlaps " +
              visible[b].id,
          );
    }
    for (const boundary of [0.08, 0.34, 1, 1.08, 2, 2.12, 2.42, 2.5, 3]) {
      const before = operationMapFrame(0, boundary - 0.000001, portrait),
        after = operationMapFrame(0, boundary + 0.000001, portrait);
      before.paths.forEach((item, index) => {
        const previous = numbers(item.d);
        numbers(after.paths[index].d).forEach((coordinate, axis) =>
          assert.ok(
            Math.abs(coordinate - previous[axis]) < 0.005,
            item.id + " remains continuous",
          ),
        );
        assert.ok(
          Math.abs(item.opacity - after.paths[index].opacity) < 0.001,
          item.id,
        );
      });
    }
  }
});
