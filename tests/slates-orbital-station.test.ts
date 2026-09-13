import assert from "node:assert/strict";
import { test } from "node:test";
import { drawOrbitalStation } from "../components/slates/orbital-station-drawing";
import type { OrbitalChunkState } from "../components/slates/orbital-volume-drawing";
import {
  spatialDrawing,
  type Point2,
} from "../components/slates/spatial-drawing";

const families = [
  {
    name: "owner drydock",
    options: { role: "owner" },
    landmarks: [
      "launch-trench",
      "port-arm-top",
      "starboard-arm-top",
      "bridge-roof",
      "gantry-hook-top",
    ],
    moving: "sensor-dish-feed",
    door: "bay-gate-port",
    shadedBox: "gantry-column",
  },
  {
    name: "twin-outrigger worker",
    options: { role: "worker", variant: 0 },
    landmarks: [
      "outrigger--1-roof",
      "outrigger-1-roof",
      "aft-bridge-roof",
      "sensor-crossbeam-top",
    ],
    moving: "service-drive-1-rotor-0",
    door: "berth-shutter-1",
    shadedBox: "sensor-crossbeam",
  },
  {
    name: "research wedge worker",
    options: { role: "worker", variant: 1 },
    landmarks: [
      "research-wedge-roof",
      "research-dish-shell",
      "instrument-sled-roof",
      "sample-tray-1-well",
    ],
    moving: "research-dish-shell",
    door: "berth-shutter-1",
    shadedBox: "instrument-mast",
  },
  {
    name: "reactor drum worker",
    options: { role: "worker", variant: 2 },
    landmarks: [
      "reactor-drum-roof",
      "reactor-raised-cap-roof",
      "thermal-wing-1-roof",
      "reactor-crown-roof",
    ],
    moving: "reactor-scan-arm-top",
    door: "berth-shutter-1",
    shadedBox: "thermal-wing-1-hinge",
  },
  {
    name: "home archive",
    options: { role: "mirror", variant: "home" },
    landmarks: [
      "vault-upper-hatch",
      "vault-port-hatch",
      "vault-starboard-hatch",
      "gantry-crossbeam-top",
    ],
    moving: "gantry-service-carriage-top",
    door: null,
    shadedBox: "archive-backbone",
  },
  {
    name: "mirror relay",
    options: { role: "mirror", variant: "mirror" },
    landmarks: [
      "relay-dish-reflector-3-8",
      "relay-dish-outer-rim-0",
      "relay-storage-vault-hatch",
      "relay-antenna-lower-boom",
    ],
    moving: "relay-antenna-lower-boom",
    door: null,
    shadedBox: "relay-keel",
  },
] as const;
type Family = (typeof families)[number];
const frame = (
  family: Family,
  time = 0,
  activity = 0,
  bayOpen = 0,
  center: Point2 = [0, 0],
  scale = 1,
) => {
  const d = spatialDrawing();
  drawOrbitalStation(d, "station", center, scale, {
    ...family.options,
    time,
    activity,
    bayOpen,
  });
  return d;
};
const vertices = (d: string) =>
  [...d.matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)].map(([, x, y]) => [
    Number(x),
    Number(y),
  ]);
const topology = (d: string) => d.replace(/-?[\d.]+/g, "#");

test("six orbital hull families retain distinct machinery and bounded physical detail", () => {
  for (const family of families) {
    const d = frame(family, 13.2, 1, 1);
    assert.equal(d.labels.length, 0, "hardware does not add colliding text");
    assert.ok(
      d.paths.length >= 120,
      `${family.name}: meaningful machinery detail`,
    );
    assert.ok(d.paths.length <= 400, `${family.name}: bounded scene cost`);
    const ids = new Set(d.paths.map((path) => path.id));
    assert.equal(ids.size, d.paths.length);
    for (const landmark of family.landmarks)
      assert.ok(ids.has("station-" + landmark), `${family.name}: ${landmark}`);
    for (const other of families.filter((value) => value !== family))
      assert.ok(
        other.landmarks.every((landmark) => !ids.has("station-" + landmark)),
        `${family.name} does not reuse ${other.name}'s structural silhouette`,
      );
    assert.ok(
      !d.paths.some((path) => /^station-sector-/.test(path.id)),
      "no shared annular station template",
    );
    for (const time of [0, 0.01, 0.4, 1.7, 8.1, 51])
      for (const activity of [0, 0.8, 1])
        for (const bayOpen of [0, 0.7, 1])
          for (const path of frame(family, time, activity, bayOpen).paths) {
            assert.doesNotMatch(path.d, /NaN|Infinity/, path.id);
            assert.ok(path.opacity >= 0 && path.opacity <= 1, path.id);
            for (const [x, y] of vertices(path.d)) {
              assert.ok(
                x >= -112 && x <= 112,
                `${family.name}/${path.id}: x ${x}`,
              );
              assert.ok(
                y >= -90 && y <= 75,
                `${family.name}/${path.id}: y ${y}`,
              );
            }
          }
  }
});

test("every hull has opaque, directionally lit planes rather than uniform wireframe fills", () => {
  const luminance = (color: string) => {
    const [r, g, b] = color.match(/\d+/g)!.map(Number);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  for (const family of families) {
    const d = frame(family, 1.3, 0.8, 0.7);
    const surfaces = d.paths.filter(
      (path) => path.material && path.d.trimEnd().endsWith("Z"),
    );
    assert.ok(surfaces.length >= 40, `${family.name}: modeled solid faces`);
    for (const path of surfaces) {
      assert.match(path.fillColor ?? "", /^rgb\(\d+ \d+ \d+\)$/, path.id);
      assert.equal(path.fillOpacity, 1, path.id + " stays opaque");
      assert.ok(
        Number.isFinite(path.strokeOpacity) &&
          path.strokeOpacity! >= 0 &&
          path.strokeOpacity! <= 1,
        path.id,
      );
    }
    assert.ok(
      new Set(surfaces.map((path) => path.fillColor)).size >= 5,
      `${family.name}: distinct material and light values`,
    );
    const top = d.paths.find(
      (path) => path.id === `station-${family.shadedBox}-top`,
    );
    const front = d.paths.find(
      (path) => path.id === `station-${family.shadedBox}-front`,
    );
    assert.ok(
      top?.fillColor && front?.fillColor,
      `${family.name}: physical top and front planes`,
    );
    assert.ok(
      luminance(top.fillColor) > luminance(front.fillColor),
      `${family.name}: upper-left light separates roof from front wall`,
    );
  }
});

test("all six hulls retain topology while actual machinery moves on the stopped clock", () => {
  for (const family of families) {
    const resting = frame(family);
    for (const time of [0.01, 0.4, 1.7, 8.1, 51]) {
      const moving = frame(family, time, 0.8, 0.7);
      assert.deepEqual(
        moving.paths.map((path) => path.id),
        resting.paths.map((path) => path.id),
      );
      assert.deepEqual(
        moving.paths.map((path) => topology(path.d)),
        resting.paths.map((path) => topology(path.d)),
      );
      const sameState = frame(family, 0, 0.8, 0.7);
      const at = (d: ReturnType<typeof frame>, key: string) =>
        d.paths.find((path) => path.id === `station-${key}`);
      assert.ok(
        at(moving, family.moving) && at(sameState, family.moving),
        family.name + " moving assembly exists",
      );
      assert.notEqual(
        at(moving, family.moving)!.d,
        at(sameState, family.moving)!.d,
        family.name + " changes geometry, not just light opacity",
      );
      if (family.door) {
        assert.ok(at(moving, family.door) && at(resting, family.door));
        assert.notEqual(
          at(moving, family.door)!.d,
          at(resting, family.door)!.d,
          family.name + " opens its own berth",
        );
      }
    }
    assert.deepEqual(
      frame(family, 4, 1, 1).paths,
      frame(family, 4, 1, 1).paths,
      "a stopped clock is deterministic",
    );
  }
});

test("each hull scales all physical parts around its supplied center", () => {
  for (const family of families) {
    const original = frame(family, 4, 0.8, 1);
    const transformed = frame(family, 4, 0.8, 1, [260, 190], 0.5);
    for (let path = 0; path < original.paths.length; path++) {
      const a = vertices(original.paths[path].d),
        b = vertices(transformed.paths[path].d);
      assert.equal(a.length, b.length);
      for (let i = 0; i < a.length; i++) {
        assert.ok(
          Math.abs(b[i][0] - (260 + a[i][0] * 0.5)) <= 0.001,
          original.paths[path].id,
        );
        assert.ok(
          Math.abs(b[i][1] - (190 + a[i][1] * 0.5)) <= 0.001,
          original.paths[path].id,
        );
      }
    }
  }
});

test("an offline station stops every physical assembly and extinguishes activity without erasing its hull", () => {
  for (const family of families) {
    const disabledFrame = (time: number, disabled: number) => {
      const d = spatialDrawing();
      drawOrbitalStation(d, "station", [0, 0], 1, {
        ...family.options,
        time,
        activity: 1,
        bayOpen: 0.8,
        tone: "pass",
        disabled,
      });
      return d;
    };
    const online = disabledFrame(1.3, 0);
    const offline = disabledFrame(1.3, 1);
    assert.deepEqual(
      offline.paths,
      disabledFrame(17, 1).paths,
      family.name + " has no motion or blinking while offline",
    );
    assert.deepEqual(
      offline.paths.map(({ id }) => id),
      online.paths.map(({ id }) => id),
    );
    assert.deepEqual(
      offline.paths.map(({ d }) => topology(d)),
      online.paths.map(({ d }) => topology(d)),
    );
    const lightPaths = offline.paths.filter(
      ({ material, tone }) =>
        material === "emissive" || (tone && tone !== "neutral"),
    );
    assert.ok(lightPaths.length > 3, family.name + " has powered activity");
    assert.ok(
      lightPaths.every(({ opacity }) => opacity === 0),
      family.name + " fully extinguishes powered activity",
    );
    const hull = offline.paths.filter(
      ({ material, tone }) =>
        material !== "emissive" && (!tone || tone === "neutral"),
    );
    assert.ok(
      hull.filter(({ opacity }) => opacity >= 0.2).length > 60,
      family.name + " keeps its failed hull legible",
    );
    for (const disabled of [0.01, 0.35, 0.8, 0.99]) {
      const fading = disabledFrame(2.7, disabled);
      assert.deepEqual(
        fading.paths.map(({ id }) => id),
        online.paths.map(({ id }) => id),
      );
      assert.deepEqual(
        fading.paths.map(({ d }) => topology(d)),
        online.paths.map(({ d }) => topology(d)),
      );
      assert.ok(
        fading.paths.every(
          ({ d, opacity }) =>
            !/NaN|Infinity/.test(d) && opacity >= 0 && opacity <= 1,
        ),
      );
    }
    assert.deepEqual(
      disabledFrame(2.7, Number.NaN).paths,
      disabledFrame(2.7, 0).paths,
    );
  }
});

test("home archive exposes a missing B socket and seats received content before verification", () => {
  const chunkFrame = (chunkState?: OrbitalChunkState) => {
    const d = spatialDrawing();
    drawOrbitalStation(d, "archive", [0, 0], 1, {
      role: "mirror",
      variant: "home",
      time: 2.4,
      activity: 0.8,
      chunkState,
    });
    return d;
  };
  const original = chunkFrame();
  const states: OrbitalChunkState[] = [
    "complete",
    "missing",
    "received",
    "verified",
    "unavailable",
  ];
  const path = (state: ReturnType<typeof chunkFrame>, suffix: string) =>
    state.paths.find(({ id }) => id === "archive-" + suffix)!;
  for (const state of states) {
    const d = chunkFrame(state);
    assert.equal(d.labels.length, 0);
    assert.deepEqual(
      d.paths.map(({ id }) => id),
      original.paths.map(({ id }) => id),
    );
    assert.deepEqual(
      d.paths.map(({ d }) => topology(d)),
      original.paths.map(({ d }) => topology(d)),
    );
    for (const p of d.paths)
      for (const [x, y] of vertices(p.d))
        assert.ok(x >= -112 && x <= 112 && y >= -90 && y <= 75, p.id);
    for (const chunk of ["a", "c"]) {
      assert.equal(path(d, `chunk-${chunk}-module-face`).opacity, 1);
      assert.equal(path(d, `chunk-${chunk}-module-status`).tone, "pass");
    }
    if (state === "missing" || state === "unavailable") {
      assert.equal(path(d, "chunk-b-socket").opacity, 1);
      assert.equal(path(d, "chunk-b-module-face").opacity, 0);
      assert.equal(path(d, "chunk-b-module-status").opacity, 0);
    }
  }
  const received = chunkFrame("received"),
    verified = chunkFrame("verified");
  assert.equal(path(received, "chunk-b-module-status").tone, "pending");
  assert.equal(path(verified, "chunk-b-module-status").tone, "pass");
  assert.notEqual(
    path(received, "chunk-b-module-face").d,
    path(verified, "chunk-b-module-face").d,
    "received cartridge is physically seated during verification",
  );
  assert.ok(
    original.paths
      .filter(({ id }) => id.startsWith("archive-chunk-"))
      .every(({ opacity }) => opacity === 0),
    "default success keeps its existing closed hatches",
  );
});
