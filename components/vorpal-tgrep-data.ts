export type TgrepMetric = "build" | "ram" | "disk";
export type TgrepTool = "vorpal" | "tgrep";
export const tgrepPlotWidth = 560;

export const tgrepSource =
  "https://github.com/hyper-light/vorpal/blob/4dd203fa560bfd2c0c8f1857f7bbca983c23de63/README.md#how-does-it-compare";

export const tgrepMetrics = [
  {
    id: "build",
    label: "Build time",
    measurement: "Cold build",
    maximum: 10,
    maximumLabel: "10 s",
    description: "Wall time for a new index, including process startup.",
  },
  {
    id: "ram",
    label: "Peak RAM",
    measurement: "Peak RSS",
    maximum: 12000,
    maximumLabel: "12 GB",
    description:
      "Peak resident memory during indexing, not the warmed query daemon.",
  },
  {
    id: "disk",
    label: "Disk",
    measurement: "Disk",
    maximum: 5000,
    maximumLabel: "5 GB",
    description:
      "The built index on disk, before Vorpal warms its additional search tiers.",
  },
] as const;

type Measurement = {
  /** Seconds for build time; MB for RAM and disk. One GB is 1,000 MB. */
  values: readonly [number, number, number];
  /** Keep the published units and precision instead of reformatting the data. */
  labels: readonly [string, string, string];
};

export const tgrepSamples: readonly {
  id: "kernel" | "cpython" | "vorpal";
  name: string;
  vorpal: Measurement;
  tgrep: Measurement;
}[] = [
  {
    id: "kernel",
    name: "Linux kernel",
    vorpal: {
      values: [8.1, 6100, 4800],
      labels: ["8.1 s", "6.1 GB", "4.8 GB"],
    },
    tgrep: { values: [8.2, 310, 1000], labels: ["8.2 s", "0.31 GB", "1.0 GB"] },
  },
  {
    id: "cpython",
    name: "CPython",
    vorpal: { values: [0.9, 700, 160], labels: ["0.9 s", "0.7 GB", "160 MB"] },
    tgrep: { values: [0.54, 140, 74], labels: ["0.54 s", "0.14 GB", "74 MB"] },
  },
  {
    id: "vorpal",
    name: "Vorpal",
    vorpal: {
      values: [6.9, 11600, 860],
      labels: ["6.9 s", "11.6 GB", "860 MB"],
    },
    tgrep: { values: [0.69, 260, 28], labels: ["0.69 s", "0.26 GB", "28 MB"] },
  },
];

/** Shared linear zero-based axis, with no minimum-width exaggeration. */
export function tgrepWidth(value: number, metric: TgrepMetric): number {
  const maximum = tgrepMetrics.find((item) => item.id === metric)!.maximum;
  return Number(((value / maximum) * tgrepPlotWidth).toFixed(4));
}
