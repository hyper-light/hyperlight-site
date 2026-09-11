import assert from "node:assert/strict";
import { test } from "node:test";
import {
  CELL_MB,
  cellOccupancy,
  footprintKinds,
  footprintSamples,
  type FootprintKind,
} from "../components/vorpal-footprint-data";

test("memory and disk figures retain all eighteen README measurements separately", () => {
  assert.deepEqual(
    footprintSamples.map((sample) => sample.ram.map(({ label }) => label)),
    [
      ["2.1 GB", "2.4 GB", "3.0 GB", "2.9 GB"],
      ["110 MB", "154 MB", "748 MB", "658 MB"],
      ["65 MB", "79 MB", "652 MB", "561 MB"],
    ],
  );
  assert.deepEqual(
    footprintSamples.map((sample) => sample.storage.map(({ label }) => label)),
    [
      ["8.1 GB", "8.5 GB"],
      ["210 MB", "280 MB"],
      ["880 MB", "910 MB"],
    ],
  );
  for (const sample of footprintSamples) {
    assert.deepEqual(
      sample.ram.map(({ name }) => name),
      ["Default", "Learned", "Learned + f16", "Learned + f32"],
    );
    assert.deepEqual(
      sample.storage.map(({ name }) => name),
      ["Default", "Learned"],
    );
    for (const measurement of [...sample.ram, ...sample.storage]) {
      const [value, unit] = measurement.label.split(" ");
      assert.equal(measurement.mb, Number(value) * (unit === "GB" ? 1000 : 1));
    }
  }
});

test("equal-area cells use fixed scales and preserve every value without rounding to whole cells", () => {
  assert.equal(CELL_MB, 25);
  assert.equal(footprintKinds.ram.capacityMB, 4000);
  assert.equal(footprintKinds.storage.capacityMB, 10000);
  for (const kind of ["ram", "storage"] satisfies FootprintKind[]) {
    const { cells, capacityMB } = footprintKinds[kind];
    assert.equal(cells * CELL_MB, capacityMB);
    for (const sample of footprintSamples) {
      for (const { mb } of sample[kind]) {
        assert.ok(mb <= capacityMB);
        const occupied = Array.from({ length: cells }, (_, index) =>
          cellOccupancy(mb, index),
        );
        assert.ok(occupied.every((value) => value >= 0 && value <= 1));
        assert.ok(
          Math.abs(
            occupied.reduce((sum, fraction) => sum + fraction, 0) * CELL_MB -
              mb,
          ) < 1e-8,
        );
        assert.ok(
          occupied.filter((value) => value > 0 && value < 1).length <= 1,
        );
      }
    }
  }
});

test("small measurements remain visible and transitions conserve represented memory", () => {
  assert.equal(cellOccupancy(65, 0), 1);
  assert.equal(cellOccupancy(65, 1), 1);
  assert.ok(Math.abs(cellOccupancy(65, 2) - 0.6) < 1e-10);
  assert.equal(cellOccupancy(65, 3), 0);
  assert.equal(cellOccupancy(2100, 83), 1);
  assert.equal(cellOccupancy(2100, 84), 0);
  assert.equal(cellOccupancy(0, 0), 0);
  assert.equal(cellOccupancy(-1, 0), 0);
  for (let step = 0; step <= 100; step++) {
    const mb = 2100 + ((65 - 2100) * step) / 100;
    const represented =
      Array.from({ length: 160 }, (_, index) => cellOccupancy(mb, index)).reduce(
        (sum, fraction) => sum + fraction,
        0,
      ) * CELL_MB;
    assert.ok(Math.abs(represented - mb) < 1e-8);
  }
});
