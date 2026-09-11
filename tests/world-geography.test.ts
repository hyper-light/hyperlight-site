import assert from "node:assert/strict";
import { test } from "node:test";
import {
  WORLD_BORDERS,
  WORLD_COASTLINES,
  WORLD_GEOGRAPHY_METADATA,
  type GeographicPoint,
} from "../components/proof-work/world-geography";

const chunks = [...WORLD_COASTLINES, ...WORLD_BORDERS];
const coastalPoints = WORLD_COASTLINES.flatMap(({ lines }) => lines.flat());
type Coastline = readonly GeographicPoint[];
function connectedCoasts(): Coastline[][] {
  const lines = WORLD_COASTLINES.flatMap(({ lines }) => lines);
  const parents = lines.map((_, index) => index);
  const root = (index: number): number =>
    parents[index] === index ? index : (parents[index] = root(parents[index]));
  const endpoints = new Map<string, number>();
  lines.forEach((line, index) => {
    for (const point of [line[0], line.at(-1)!]) {
      const key = point.join(",");
      const adjacent = endpoints.get(key);
      if (adjacent !== undefined) parents[root(index)] = root(adjacent);
      else endpoints.set(key, index);
    }
  });
  const groups = new Map<number, Coastline[]>();
  lines.forEach((line, index) => {
    const key = root(index);
    const group = groups.get(key) ?? [];
    group.push(line);
    groups.set(key, group);
  });
  return [...groups.values()];
}
const coastComponents = connectedCoasts();
function encloses(lines: Coastline[], [x, y]: GeographicPoint) {
  let inside = false;
  for (const line of lines)
    for (let index = 1; index < line.length; index++) {
      const a = line[index - 1],
        b = line[index];
      if (
        a[1] > y !== b[1] > y &&
        x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]
      )
        inside = !inside;
    }
  return inside;
}
function coastDistance(lines: Coastline[], [x, y]: GeographicPoint) {
  let closest = Infinity;
  for (const line of lines)
    for (let index = 1; index < line.length; index++) {
      const a = line[index - 1],
        b = line[index];
      const dx = b[0] - a[0],
        dy = b[1] - a[1];
      const t = Math.max(
        0,
        Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy)),
      );
      closest = Math.min(
        closest,
        Math.hypot(x - a[0] - t * dx, y - a[1] - t * dy),
      );
    }
  return closest;
}

test("offline geography is finite, bounded, uniquely identified and within the rendering budget", () => {
  assert.equal(new Set(chunks.map(({ id }) => id)).size, chunks.length);
  assert.equal(WORLD_COASTLINES.length, WORLD_GEOGRAPHY_METADATA.coastChunks);
  assert.equal(WORLD_BORDERS.length, WORLD_GEOGRAPHY_METADATA.borderChunks);
  assert.equal(WORLD_GEOGRAPHY_METADATA.coastFeatures50m, 1428);
  assert.equal(WORLD_GEOGRAPHY_METADATA.borderFeatures50m, 390);
  assert.equal(WORLD_GEOGRAPHY_METADATA.supplementalIslandLines10m, 180);
  assert.ok(chunks.length <= 650);
  let vertices = 0;
  for (const { id, lines } of chunks) {
    assert.ok(lines.length > 0, id);
    const points = lines.flat();
    assert.ok(points.length <= 24, `${id}: per-path work remains bounded`);
    vertices += points.length;
    for (const [longitude, latitude] of points) {
      assert.ok(
        Number.isFinite(longitude) && longitude >= -180 && longitude <= 180,
      );
      assert.ok(Number.isFinite(latitude) && latitude >= -90 && latitude <= 90);
    }
  }
  assert.equal(vertices, WORLD_GEOGRAPHY_METADATA.vertices);
  assert.ok(
    vertices > 9000 && vertices <= 11000,
    "retain detailed island outlines within the agreed approximately 10k-vertex budget",
  );
});

test("geographic chunks stay local and disconnected subpaths cannot bridge islands or the antimeridian", () => {
  assert.ok(
    WORLD_COASTLINES.some(({ lines }) => lines.length > 1),
    "nearby islands are batched as separate subpaths, never a connecting line",
  );
  let closedOutlines = 0;
  let datelineEndpoints = 0;
  for (const { id, lines } of chunks) {
    const all = lines.flat();
    assert.ok(
      Math.max(...all.map(([x]) => x)) - Math.min(...all.map(([x]) => x)) <= 20,
      id,
    );
    assert.ok(
      Math.max(...all.map(([, y]) => y)) - Math.min(...all.map(([, y]) => y)) <=
        20,
      id,
    );
    for (const line of lines) {
      assert.ok(line.length >= 2);
      line.slice(1).forEach((point, index) => {
        assert.ok(
          Math.abs(point[0] - line[index][0]) <= 20,
          `${id}: no dateline-spanning interpolation`,
        );
        assert.notDeepEqual(
          point,
          line[index],
          `${id}: no zero-length segment`,
        );
      });
      for (const point of [line[0], line.at(-1)!])
        if (Math.abs(point[0]) === 180) datelineEndpoints++;
      if (JSON.stringify(line[0]) === JSON.stringify(line.at(-1))) {
        assert.ok(
          new Set(line.map((point) => JSON.stringify(point))).size >= 3,
          `${id}: a retained island outline cannot collapse to a point or line`,
        );
        closedOutlines++;
      }
    }
  }
  assert.ok(
    closedOutlines > 1200,
    "small-island outlines survive simplification",
  );
  assert.ok(
    datelineEndpoints > 4,
    "dateline crossings terminate explicitly at the seam",
  );
});

test("requested island regions remain represented after simplification and packing", () => {
  const cases: [string, readonly [number, number, number, number], number][] = [
    ["Great Britain", [-6.5, 49.8, 2, 59], 60],
    ["Ireland", [-11, 51, -5.5, 55.5], 15],
    ["New Zealand North Island", [172.5, -41.7, 178.7, -34.2], 20],
    ["New Zealand South Island", [166, -47.5, 174.6, -40.5], 20],
    ["Japan", [129, 30, 146, 46], 100],
    ["Indonesia", [95, -11, 141, 6], 400],
    ["Philippines", [117, 5, 127, 20], 150],
    ["Sri Lanka", [79.5, 5.5, 82, 10], 10],
    ["Caribbean", [-85, 10, -59, 28], 200],
    ["Tuvalu", [176, -11, 180, -5], 30],
    ["Marshall Islands", [160, 4, 173, 15], 100],
    ["Palau", [130, 2, 135, 9], 20],
    ["Tonga", [-176, -23, -173, -15], 30],
    ["Samoa", [-173, -15, -171, -13], 8],
    ["Nauru", [166, -1, 167, 0], 4],
    ["Fiji", [176, -21, 180, -15], 60],
  ];
  for (const [name, [west, south, east, north], minimum] of cases) {
    const inside = ([longitude, latitude]: GeographicPoint) =>
      longitude >= west &&
      longitude <= east &&
      latitude >= south &&
      latitude <= north;
    assert.ok(
      coastalPoints.filter(inside).length >= minimum,
      `${name} is not dropped from the globe`,
    );
  }
});

test("physical coasts and political borders remain separate, including uncertain boundary classes", () => {
  assert.ok(
    WORLD_COASTLINES.every(
      ({ id, disputed }) => id.startsWith("coast-") && !disputed,
    ),
  );
  assert.ok(WORLD_BORDERS.every(({ id }) => id.startsWith("border-")));
  assert.ok(WORLD_BORDERS.some(({ disputed }) => disputed));
  assert.ok(WORLD_BORDERS.some(({ disputed }) => !disputed));
  assert.match(WORLD_GEOGRAPHY_METADATA.sourceCommit, /^[0-9a-f]{40}$/);
});

test("all eight main Hawaiian islands have their own closed, recognizable land outlines", () => {
  // Names checked against USGS's eight-main-island list. Each fixture requires
  // an enclosing contour, not unrelated points inside one Hawaii-wide box.
  const islands: [string, GeographicPoint, number][] = [
    ["Niʻihau", [-160.15, 21.9], 5],
    ["Kauaʻi", [-159.5, 22.05], 8],
    ["Oʻahu", [-157.96, 21.48], 12],
    ["Molokaʻi", [-157.0, 21.14], 6],
    ["Lānaʻi", [-156.92, 20.83], 6],
    ["Maui", [-156.31, 20.8], 12],
    ["Kahoʻolawe", [-156.6, 20.55], 4],
    ["Hawaiʻi", [-155.5, 19.65], 15],
  ];
  const selected = new Set<Coastline[]>();
  for (const [name, interior, minimumVertices] of islands) {
    const contour = coastComponents.find(
      (lines) =>
        lines
          .flat()
          .every(([x, y]) => x >= -161 && x <= -154 && y >= 18 && y <= 23) &&
        encloses(lines, interior),
    );
    assert.ok(contour, `${name} has a real enclosing coastline`);
    assert.ok(
      contour.flat().length >= minimumVertices,
      `${name} retains its outline detail`,
    );
    assert.equal(
      contour.length,
      1,
      "each main Hawaiian island is a separate short closed subpath",
    );
    assert.deepEqual(contour[0][0], contour[0].at(-1));
    selected.add(contour);
  }
  assert.equal(
    selected.size,
    8,
    "no pair of Hawaiian islands shares a merged outline",
  );
  assert.equal(WORLD_GEOGRAPHY_METADATA.hawaiianSimplificationDegrees, 0.035);
});

test("Japan retains four separate principal islands rather than only nearby regional points", () => {
  const islands: [string, GeographicPoint][] = [
    ["Hokkaido", [142.6, 43.4]],
    ["Honshu", [138.2, 36.3]],
    ["Shikoku", [133.7, 33.8]],
    ["Kyushu", [130.8, 32.8]],
  ];
  const selected = new Set<Coastline[]>();
  for (const [name, interior] of islands) {
    const contour = coastComponents.find(
      (lines) =>
        lines
          .flat()
          .every(([x, y]) => x >= 129 && x <= 146 && y >= 30 && y <= 46) &&
        encloses(lines, interior),
    );
    assert.ok(contour, `${name} has its own enclosing coast`);
    selected.add(contour);
  }
  assert.equal(selected.size, 4);
});

test("North and South America share a continuous mainland coast with Pacific and Atlantic detail", () => {
  const mainland = coastComponents.find((lines) => {
    const points = lines.flat();
    return (
      points.every(([x]) => x >= -170 && x <= -30) &&
      encloses(lines, [-100, 40]) &&
      encloses(lines, [-60, -15])
    );
  });
  assert.ok(
    mainland,
    "both American mainland interiors belong to the same connected coastal outline",
  );
  assert.ok(mainland.flat().length > 600);
  const landmarks: [string, GeographicPoint][] = [
    ["California Pacific coast", [-124.4, 40.4]],
    ["Florida Atlantic coast", [-80.1, 25.8]],
    ["Louisiana Gulf coast", [-90, 29.2]],
    ["Central American Pacific coast", [-79.6, 8.9]],
    ["Peruvian Pacific coast", [-77.15, -12.1]],
    ["Chilean Pacific coast", [-71.6, -33.05]],
    ["Brazilian Atlantic coast", [-34.9, -8.1]],
    ["Argentine Atlantic coast", [-57.55, -38]],
  ];
  for (const [name, location] of landmarks)
    assert.ok(
      coastDistance(mainland, location) < 0.55,
      `${name} remains on the mainland outline`,
    );
});
