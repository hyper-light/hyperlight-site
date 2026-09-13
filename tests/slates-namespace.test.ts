import assert from "node:assert/strict";
import { test } from "node:test";
import { namespaceSnapshot } from "../components/slates/namespace-data";
import { namespaceFrame } from "../components/slates/namespace-geometry";

test("namespace changes preserve inode identity and exclude open handles from nlink", () => {
  const names = [
    ["/src/image.rs"],
    ["/src/image.rs"],
    ["/src/codec.rs"],
    ["/src/codec.rs", "/saved.rs"],
    ["/saved.rs"],
  ];
  for (let stage = 0; stage <= 4; stage++) {
    const state = namespaceSnapshot(stage);
    assert.deepEqual(state.names, names[stage]);
    assert.equal(state.nlink, names[stage].length);
    assert.equal(state.inode, 41);
    assert.equal(state.handleTarget, stage === 0 ? null : 41);
    assert.equal(state.handleAlive, stage > 0);
    assert.equal(state.content, "format=webp\nquality=80\n");
  }
});

function coordinates(d: string) {
  return Array.from(d.matchAll(/-?\d+(?:\.\d+)?/g), ([value]) => Number(value));
}

test("the inode, bytes and open-handle tether never move during namespace mutation", () => {
  for (const portrait of [false, true]) {
    const baseline = namespaceFrame(0, 1, portrait);
    for (let sample = 100; sample <= 400; sample++) {
      const current = namespaceFrame(1.4, sample / 100, portrait);
      for (const fixed of baseline.paths.filter(({ id }) =>
        /^(?:inode-|open-handle-|handle-)/.test(id),
      ))
        assert.deepEqual(
          current.paths.find(({ id }) => id === fixed.id),
          fixed,
        );
      for (const fixed of baseline.labels.filter(({ id }) =>
        /^(?:inode-|handle-(?!count-note))/.test(id),
      ))
        assert.deepEqual(
          current.labels.find(({ id }) => id === fixed.id),
          fixed,
        );
    }
  }
});

test("the renamed association and second hard link have the intended visibility", () => {
  for (const portrait of [false, true]) {
    const closed = namespaceFrame(0, 0, portrait),
      open = namespaceFrame(0, 1, portrait),
      rename = namespaceFrame(0, 2, portrait),
      link = namespaceFrame(0, 3, portrait),
      unlink = namespaceFrame(0, 4, portrait);
    const opacity = (frame: typeof open, id: string) =>
      frame.paths.find((path) => path.id === id)!.opacity;
    assert.equal(opacity(open, "saved-inode-reference"), 0);
    assert.equal(opacity(closed, "open-handle-reference"), 0);
    assert.ok(opacity(open, "open-handle-reference") > 0.8);
    assert.equal(closed.labels.find(({ id }) => id === "handle-id")!.text, "no handle");
    assert.equal(open.labels.find(({ id }) => id === "handle-id")!.text, "handle 7");
    assert.equal(opacity(open, "active-entry-previous-strike"), 0);
    assert.ok(opacity(rename, "active-entry-previous-strike") > 0.8);
    assert.equal(rename.labels.find(({ id }) => id === "active-entry-previous-name")!.text, "image.rs");
    assert.equal(
      open.labels.find(({ id }) => id === "active-entry-name")!.text,
      "image.rs",
    );
    assert.equal(
      rename.labels.find(({ id }) => id === "active-entry-name")!.text,
      "codec.rs",
    );
    assert.ok(opacity(link, "saved-inode-reference") > 0.5);
    assert.ok(opacity(link, "active-inode-reference") > 0.5);
    assert.equal(opacity(unlink, "active-inode-reference"), 0);
    assert.ok(opacity(unlink, "saved-inode-reference") > 0.5);
    assert.ok(opacity(unlink, "open-handle-reference") > 0.5);
  }
});

test("namespace uses solid layered surfaces and a live reader without drifting the composition", () => {
  for (const portrait of [false, true]) {
    const before = namespaceFrame(0.3, 1, portrait);
    const after = namespaceFrame(1.7, 1, portrait);
    for (const material of ["paper", "metal", "silicon", "shadow"])
      assert.ok(
        before.paths.some((path) => path.material === material),
        material,
      );
    const scan = (frame: typeof before) =>
      frame.paths.find(({ id }) => id === "reader-read-scan");
    assert.notEqual(scan(before)?.d, scan(after)?.d);
    assert.deepEqual(before.labels, after.labels);
    for (const path of before.paths.filter(
      ({ id }) => !/^reader-(?:read-scan|live-indicator)$/.test(id),
    ))
      assert.deepEqual(
        path,
        after.paths.find(({ id }) => id === path.id),
      );
  }
});

test("namespace paths retain fixed topology, stay in bounds and move continuously", () => {
  for (const portrait of [false, true]) {
    const initial = namespaceFrame(0, 0, portrait);
    for (let sample = 0; sample <= 200; sample++) {
      const selection = sample / 50;
      const frame = namespaceFrame(1, selection, portrait),
        next = namespaceFrame(1, selection + 0.00001, portrait);
      assert.deepEqual(
        frame.paths.map(({ id }) => id),
        initial.paths.map(({ id }) => id),
      );
      assert.deepEqual(
        frame.labels.map(({ id }) => id),
        initial.labels.map(({ id }) => id),
      );
      for (let i = 0; i < frame.paths.length; i++) {
        const points = coordinates(frame.paths[i].d),
          adjacent = coordinates(next.paths[i].d);
        assert.equal(points.length, coordinates(initial.paths[i].d).length);
        for (let n = 0; n < points.length; n++) {
          assert.ok(Number.isFinite(points[n]));
          assert.ok(
            points[n] >= 20 &&
              points[n] <=
                (n % 2 ? (portrait ? 720 : 500) : portrait ? 400 : 780),
            `${frame.paths[i].id}: ${points[n]}`,
          );
          assert.ok(
            Math.abs(points[n] - adjacent[n]) < 0.03,
            frame.paths[i].id,
          );
        }
      }
      const labels = frame.labels.filter(
        (label) => (label.opacity ?? 1) > 0.12,
      );
      const boxes = labels.map((label) => {
        const size =
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
          label.text.length * size * (label.kind === "heading" ? 0.73 : 0.64);
        const left =
          label.anchor === "middle"
            ? label.x - width / 2
            : label.anchor === "end"
              ? label.x - width
              : label.x;
        const matrix = label.transform
          ?.match(/-?\d+(?:\.\d+)?/g)
          ?.map(Number) ?? [1, 0, 0, 1, 0, 0];
        const corners = [
          [left, label.y - size],
          [left + width, label.y - size],
          [left, label.y + 2],
          [left + width, label.y + 2],
        ].map(([x, y]) => [
          matrix[0] * x + matrix[2] * y + matrix[4],
          matrix[1] * x + matrix[3] * y + matrix[5],
        ]);
        return {
          id: label.id,
          left: Math.min(...corners.map((p) => p[0])),
          right: Math.max(...corners.map((p) => p[0])),
          top: Math.min(...corners.map((p) => p[1])),
          bottom: Math.max(...corners.map((p) => p[1])),
        };
      });
      for (let i = 0; i < boxes.length; i++) {
        const a = boxes[i];
        assert.ok(a.left >= 20 && a.right <= (portrait ? 400 : 780), a.id);
        for (let j = i + 1; j < boxes.length; j++) {
          const b = boxes[j];
          assert.ok(
            a.left >= b.right ||
              a.right <= b.left ||
              a.top >= b.bottom ||
              a.bottom <= b.top,
            `${portrait}/${selection}: ${a.id} overlaps ${b.id}`,
          );
        }
      }
      for (const path of frame.paths.filter(
        ({ id, opacity }) => opacity > 0.12 && /(?:branch|reference)$/.test(id),
      )) {
        const points = coordinates(path.d);
        for (let i = 0; i < points.length - 2; i += 2) {
          const a = {
            left: Math.min(points[i], points[i + 2]),
            right: Math.max(points[i], points[i + 2]),
            top: Math.min(points[i + 1], points[i + 3]),
            bottom: Math.max(points[i + 1], points[i + 3]),
          };
          for (const b of boxes)
            assert.ok(
              a.left >= b.right ||
                a.right <= b.left ||
                a.top >= b.bottom ||
                a.bottom <= b.top,
              `${portrait}/${selection}: ${path.id} crosses ${b.id}`,
            );
        }
      }
    }
  }
});
