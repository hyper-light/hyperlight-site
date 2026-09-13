import assert from "node:assert/strict";
import { test } from "node:test";
import {
  orbitalFleetFrame,
  orbitalFleetFrames,
  orbitalFleetLayout,
} from "../components/slates/orbital-fleet-geometry";
import {
  orbitalScenarios,
  orbitalScenarioSteps,
} from "../components/slates/orbital-fleet-scenarios";

const vertices = (d: string) =>
  Array.from(d.matchAll(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g), ([, x, y]) => [
    Number(x),
    Number(y),
  ]);

test("the compact phone scene keeps staggered copies above the base and agents below it", () => {
  const layout = orbitalFleetLayout(true);
  assert.ok(
    layout.height <= 800,
    "the scene must not become a scrolling column",
  );
  assert.ok(layout.home[0] < layout.owner[0]);
  assert.ok(layout.mirror[0] > layout.owner[0]);
  assert.ok(
    layout.mirror[1] - layout.home[1] >= 12,
    "the distant copies retain their slight vertical stagger",
  );
  assert.ok(layout.owner[1] - layout.mirror[1] >= 24);
  assert.ok(
    layout.workers[0][1] > layout.workers[1][1] &&
      layout.workers[1][1] > layout.workers[2][1],
    "nearer agents advance into the foreground instead of forming a flat row",
  );
  layout.workers.forEach(([x], index) => {
    assert.equal(
      layout.workerLabelXs[index],
      x,
      `Agent ${index + 1}'s name and status center directly over its own station`,
    );
  });
  for (const { value } of orbitalScenarios) {
    for (let stage = 0; stage < orbitalScenarioSteps(value).length; stage++) {
      const frame = orbitalFleetFrames[value](1.37, stage, true);
      const verticalBounds = (prefix: string) => {
        const ys = frame.paths
          .filter((path) => path.id.startsWith(prefix) && path.opacity > 0.05)
          .flatMap((path) => vertices(path.d).map(([, y]) => y));
        assert.ok(ys.length > 0, `${value}/${stage}/${prefix} stays visible`);
        return [Math.min(...ys), Math.max(...ys)];
      };
      const [, baseBottom] = verticalBounds("owner-station-");
      for (const prefix of [
        "worker-station-1-",
        "worker-station-2-",
        "worker-station-3-",
      ]) {
        const [satelliteTop] = verticalBounds(prefix);
        assert.ok(
          satelliteTop >= baseBottom + 8,
          `${value}/${stage}: ${prefix} must sit below the base with clearance`,
        );
        const index = Number(prefix.match(/worker-station-(\d)/)![1]) - 1;
        const gap = satelliteTop - layout.workerReadouts[index];
        assert.ok(
          gap >= 12 && gap <= 22,
          `${value}/${stage}: Agent ${index + 1}'s status-to-hardware gap is ${gap.toFixed(2)}`,
        );
      }
    }
  }
});

test("mobile ships retain one size from their launch bays through travel and docking", () => {
  const panelArea = (selection: number, index: number) => {
    const frame = orbitalFleetFrame(0, selection, true);
    const keel = frame.paths.find(
      (path) => path.id === `vfs-craft-${index}-hull-keel`,
    )!;
    const points = vertices(keel.d);
    // These four keel vertices share z=0. Their projected area stays constant
    // when a rigid ship turns; unlike its bounding box, it isolates resizing.
    const panel = [1, 2, 4, 5].map((i) => points[i]);
    return (
      Math.abs(
        panel.reduce((area, [x, y], i) => {
          const [nextX, nextY] = panel[(i + 1) % panel.length];
          return area + x * nextY - nextX * y;
        }, 0),
      ) / 2
    );
  };
  const reference = panelArea(1, 1);
  assert.ok(reference > 10, "ships remain visible, not zero-sized");
  for (let index = 1; index <= 3; index++) {
    for (let sample = 50; sample <= 350; sample++) {
      const selection = sample / 50;
      assert.ok(
        Math.abs(panelArea(selection, index) - reference) < 0.08,
        `ship ${index} changes size at lifecycle position ${selection.toFixed(2)}`,
      );
    }
  }
});

test("the camera scales near and distant objects from their world depth", () => {
  for (const portrait of [false, true]) {
    const layout = orbitalFleetLayout(portrait);
    const worlds = [
      layout.ownerWorld,
      ...layout.workerWorlds,
      layout.homeWorld,
      layout.mirrorWorld,
    ];
    const scales = worlds.map(([, , z]) => layout.depthScale(z));
    for (let i = 1; i < scales.length; i++)
      assert.ok(scales[i] < scales[i - 1], "stations must recede in depth");
    assert.ok(scales[0] / scales.at(-1)! > 3);

    for (const world of worlds) {
      const projected = layout.project(world);
      const restored = layout.atDepth(projected, world[2]);
      for (let axis = 0; axis < 3; axis++)
        assert.ok(Math.abs(restored[axis] - world[axis]) < 1e-9);
      const edge = layout.project([world[0] + 100, world[1], world[2]]);
      assert.ok(
        Math.abs(edge[0] - projected[0] - 100 * layout.depthScale(world[2])) <
          1e-9,
      );
    }

    const ids = orbitalFleetFrame(0, 3, portrait).paths.map((path) => path.id);
    const paintOrder = [
      "mirror-station-",
      "home-station-",
      "worker-station-3-",
      "worker-station-2-",
      "worker-station-1-",
      "owner-station-",
    ].map((prefix) => ids.findIndex((id) => id.startsWith(prefix)));
    for (let i = 1; i < paintOrder.length; i++)
      assert.ok(paintOrder[i] > paintOrder[i - 1], "far hulls paint first");
  }
});

test("status stays in captions and embedded machinery, without floating bar overlays", () => {
  for (const portrait of [false, true]) {
    for (let stage = 0; stage < 8; stage++) {
      const frame = orbitalFleetFrame(0, stage, portrait);
      assert.ok(
        !frame.paths.some((path) =>
          /^(verified-copy-|owner-edit-(slot|scan)-|worker-\d+-private-byte-)/.test(
            path.id,
          ),
        ),
      );
      assert.ok(frame.labels.some((label) => label.id === "orbital-stage"));
      assert.match(
        frame.labels.find((label) => label.id === "orbital-result")!.text,
        /v\d/,
      );
    }
  }
});

test("the orbital overview retains all detailed stations and carriers through every lifecycle", () => {
  for (const portrait of [false, true]) {
    const first = orbitalFleetFrame(0, 0, portrait);
    const ids = first.paths.map((p) => p.id);
    const topology = first.paths.map((p) =>
      p.d.replace(/-?\d+(?:\.\d+)?/g, "#"),
    );
    assert.equal(new Set(ids).size, ids.length);
    // Six modeled hulls, three detailed carriers and their transfer packets.
    // Count is a cost guard; family landmarks below establish visual variety.
    assert.ok(ids.length >= 1200 && ids.length <= 2700, String(ids.length));
    for (const prefix of [
      "owner-station-",
      "worker-station-1-",
      "worker-station-2-",
      "worker-station-3-",
      "home-station-",
      "mirror-station-",
    ])
      assert.ok(
        ids.filter((id) => id.startsWith(prefix)).length >= 120,
        prefix,
      );
    for (const landmark of [
      "owner-station-launch-trench",
      "owner-station-port-arm-top",
      "worker-station-1-outrigger-1-roof",
      "worker-station-2-research-wedge-roof",
      "worker-station-3-reactor-drum-roof",
      "home-station-vault-upper-hatch",
      "mirror-station-relay-dish-reflector-3-8",
    ])
      assert.ok(ids.includes(landmark), landmark);
    for (const index of [1, 2, 3])
      assert.ok(
        ids.filter((id) => id.startsWith(`vfs-craft-${index}-`)).length > 100,
      );
    for (let selection = 0; selection <= 7; selection += 0.125) {
      const frame = orbitalFleetFrame(12.31, selection, portrait);
      assert.deepEqual(
        frame.paths.map((p) => p.id),
        ids,
      );
      assert.deepEqual(
        frame.paths.map((p) => p.d.replace(/-?\d+(?:\.\d+)?/g, "#")),
        topology,
      );
      assert.deepEqual(
        frame.labels.map((p) => p.id),
        first.labels.map((p) => p.id),
      );
      assert.ok(
        frame.paths.every(
          (p) => Number.isFinite(p.opacity) && p.opacity >= 0 && p.opacity <= 1,
        ),
      );
    }
  }
});

test("desktop and portrait flight envelopes stay within their own canvases", () => {
  for (const portrait of [false, true]) {
    const { width, height } = orbitalFleetLayout(portrait);
    for (let selection = 0; selection <= 7; selection += 0.04) {
      const frame = orbitalFleetFrame(3.7, selection, portrait);
      for (const path of frame.paths.filter((p) => p.opacity > 0.1)) {
        for (const [x, y] of vertices(path.d))
          assert.ok(
            x >= 4 && x <= width - 4 && y >= 4 && y <= height - 4,
            `${portrait}/${selection.toFixed(2)}/${path.id}: ${x},${y}`,
          );
      }
      for (const label of frame.labels)
        assert.ok(
          label.x >= 12 &&
            label.x <= width - 12 &&
            label.y >= 12 &&
            label.y <= height - 4,
          label.id,
        );
    }
  }
});

test("hardware stays alive while the held stage keeps the same work and version", () => {
  for (const portrait of [false, true]) {
    for (let stage = 0; stage < 8; stage++) {
      const a = orbitalFleetFrame(0.6, stage, portrait),
        b = orbitalFleetFrame(1.5, stage, portrait);
      assert.deepEqual(a.labels, b.labels);
      for (const prefix of [
        "owner-station-",
        "worker-station-1-",
        "worker-station-2-",
        "worker-station-3-",
        "home-station-",
        "mirror-station-",
      ]) {
        const changed = a.paths.filter(
          (p, i) =>
            p.id.startsWith(prefix) &&
            (p.d !== b.paths[i].d || p.opacity !== b.paths[i].opacity),
        );
        assert.ok(changed.length >= 8, `${prefix}/${stage}: ${changed.length}`);
      }
      assert.deepEqual(orbitalFleetFrame(0.6, stage, portrait), a);
    }
  }
});

test("edits, home commit, mirror confirmation and source-disk boundary remain distinct", () => {
  const labels = (stage: number) =>
    orbitalFleetFrame(0, stage, false)
      .labels.map((l) => l.text)
      .join("\n");
  assert.match(labels(2), /format=jpeg/);
  assert.match(labels(3), /format=webp/);
  assert.match(labels(3), /cache=on/);
  assert.match(labels(5), /CHECKED v3 · not committed/);
  assert.match(labels(6), /WAITING FOR MIRROR/);
  assert.match(labels(7), /READY TO TEST v3 · SOURCE DISK UNCHANGED/);
});

test("verified mirrors show the acknowledgement returning rather than waiting for verification", () => {
  for (const portrait of [false, true]) {
    const result = (selection: number) =>
      orbitalFleetFrame(0, selection, portrait).labels.find(
        (label) => label.id === "orbital-result",
      )!.text;
    assert.match(result(6.5), /WAITING FOR MIRROR/);
    assert.match(result(6.8), /VERIFIED · RETURNING TO AGENTS/);
    assert.match(result(7), /READY TO TEST/);
  }
});

test("the owner's embedded compute blades react to checks in agent order", () => {
  const blade = (selection: number, index: number) => {
    const paths = orbitalFleetFrame(0, selection, false).paths;
    const id = `owner-station-starboard-service-${index}`;
    return {
      top: paths.find((path) => path.id === id + "-top")!,
      light: paths.find((path) => path.id === id + "-compute-face")!,
    };
  };
  for (let index = 0; index < 3; index++) {
    const queued = blade(4, index);
    const checked = blade(4.31 + index * 0.32, index);
    assert.equal(queued.light.opacity, 0);
    assert.ok(checked.light.opacity > 0.3);
    assert.notEqual(checked.top.d, queued.top.d);
    if (index < 2)
      assert.equal(blade(4.31 + index * 0.32, index + 1).light.opacity, 0);
  }
});

test("the running caption names the action on screen rather than the previous completed stage", () => {
  const caption = (selection: number) =>
    orbitalFleetFrame(0, selection, true).labels.find(
      (label) => label.id === "orbital-stage",
    )?.text;
  assert.match(caption(0.5)!, /ASSEMBLE/);
  assert.match(caption(1)!, /THREE PRIVATE/);
  assert.match(caption(1.5)!, /DISPATCH/);
  assert.match(caption(2.5)!, /EDIT PRIVATE/);
  assert.match(caption(3.5)!, /RETURN EDITS/);
  assert.match(caption(4.5)!, /CHECKS EACH/);
  assert.match(caption(5.5)!, /VERIFY HOME/);
  assert.match(caption(6)!, /v3 COMMITTED/);
  assert.match(caption(6.5)!, /VERIFY THE REGIONAL MIRROR/);
  assert.match(caption(7)!, /MIRROR VERIFIED/);
});
