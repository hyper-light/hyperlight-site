export type FootprintKind = "ram" | "storage";
export type FootprintMeasurement = {
  name: string;
  mb: number;
  /** Preserve the precision and units of the published measurement. */
  label: string;
};
export type FootprintSample = {
  id: "kernel" | "cpython" | "vorpal";
  name: string;
  ram: readonly FootprintMeasurement[];
  storage: readonly FootprintMeasurement[];
};

export const footprintSource =
  "https://github.com/hyper-light/vorpal/blob/4dd203fa560bfd2c0c8f1857f7bbca983c23de63/README.md#is-search-any-good";

export const CELL_MB = 25;

// Chart limits, not the benchmark machine's installed RAM or disk capacity.
// A GB is represented as 1,000 MB; labels retain the README's rounded values.
export const footprintKinds = {
  ram: {
    label: "RAM",
    metric: "Peak resident memory",
    capacityMB: 4000,
    cells: 160,
  },
  storage: {
    label: "Disk",
    metric: "Index + warmed search",
    capacityMB: 10000,
    cells: 400,
  },
} as const;

export const footprintSamples: readonly FootprintSample[] = [
  {
    id: "kernel",
    name: "Linux kernel",
    ram: [
      { name: "Default", mb: 2100, label: "2.1 GB" },
      { name: "Learned", mb: 2400, label: "2.4 GB" },
      { name: "Learned + f16", mb: 3000, label: "3.0 GB" },
      { name: "Learned + f32", mb: 2900, label: "2.9 GB" },
    ],
    storage: [
      { name: "Default", mb: 8100, label: "8.1 GB" },
      { name: "Learned", mb: 8500, label: "8.5 GB" },
    ],
  },
  {
    id: "cpython",
    name: "CPython",
    ram: [
      { name: "Default", mb: 110, label: "110 MB" },
      { name: "Learned", mb: 154, label: "154 MB" },
      { name: "Learned + f16", mb: 748, label: "748 MB" },
      { name: "Learned + f32", mb: 658, label: "658 MB" },
    ],
    storage: [
      { name: "Default", mb: 210, label: "210 MB" },
      { name: "Learned", mb: 280, label: "280 MB" },
    ],
  },
  {
    id: "vorpal",
    name: "Vorpal",
    ram: [
      { name: "Default", mb: 65, label: "65 MB" },
      { name: "Learned", mb: 79, label: "79 MB" },
      { name: "Learned + f16", mb: 652, label: "652 MB" },
      { name: "Learned + f32", mb: 561, label: "561 MB" },
    ],
    storage: [
      { name: "Default", mb: 880, label: "880 MB" },
      { name: "Learned", mb: 910, label: "910 MB" },
    ],
  },
];

/** Fraction of one equal-area cell occupied, including the final partial cell. */
export function cellOccupancy(mb: number, index: number): number {
  return Math.max(0, Math.min(1, mb / CELL_MB - index));
}
