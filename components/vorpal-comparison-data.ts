export type ComparisonKind = "agents" | "retrieval";
type Result = { name: string; values: readonly number[] };
type Sample = { name: string; detail: string; rows: readonly Result[] };
type Metric = { name: string; description: string };

// Published README measurements, pinned to the article's source revision.
// Tokens retain the README's rounded K precision when displayed.
export const comparisonSource =
  "https://github.com/hyper-light/vorpal/blob/4dd203fa560bfd2c0c8f1857f7bbca983c23de63/README.md";

export const agentSamples: readonly Sample[] = [
  {
    name: "Callers of tool_result",
    detail: "Vorpal repository",
    rows: [
      { name: "Grep + Read", values: [9.4, 73000, 0.081, 5] },
      { name: "Vorpal MCP", values: [5.9, 63000, 0.054, 3] },
      { name: "Vorpal CLI", values: [5.3, 43000, 0.028, 2] },
    ],
  },
  {
    name: "What run_install reaches",
    detail: "Vorpal repository",
    rows: [
      { name: "Grep + Read", values: [11.8, 77000, 0.136, 4] },
      { name: "Vorpal MCP", values: [7.0, 64000, 0.045, 3] },
      { name: "Vorpal CLI", values: [7.9, 44000, 0.04, 2] },
    ],
  },
  {
    name: "Callers of vfs_read",
    detail: "Linux kernel",
    rows: [
      { name: "Grep + Read", values: [16.6, 104000, 0.2, 5] },
      { name: "Vorpal MCP", values: [6.9, 51000, 0.042, 3] },
      { name: "Vorpal CLI", values: [6.1, 36000, 0.029, 2] },
    ],
  },
  {
    name: "Callees of vfs_read",
    detail: "Linux kernel",
    rows: [
      { name: "Grep + Read", values: [8.2, 59000, 0.053, 3] },
      { name: "Vorpal MCP", values: [5.7, 51000, 0.046, 3] },
      { name: "Vorpal CLI", values: [5.8, 36000, 0.026, 2] },
    ],
  },
];

export const retrievalSamples: readonly Sample[] = [
  {
    name: "Linux kernel",
    detail: "54 labeled queries",
    rows: [
      { name: "Default", values: [0.329, 0.327, 0.358] },
      { name: "Learned", values: [0.315, 0.304, 0.361] },
      { name: "Learned + encoder, f32", values: [0.295, 0.29, 0.302] },
    ],
  },
  {
    name: "CPython",
    detail: "54 labeled queries",
    rows: [
      { name: "Default", values: [0.306, 0.291, 0.333] },
      { name: "Learned", values: [0.341, 0.322, 0.389] },
      { name: "Learned + encoder, f32", values: [0.351, 0.331, 0.426] },
    ],
  },
  {
    name: "Vorpal",
    detail: "55 labeled queries",
    rows: [
      { name: "Default", values: [0.402, 0.395, 0.445] },
      { name: "Learned", values: [0.43, 0.427, 0.455] },
      { name: "Learned + encoder, f32", values: [0.455, 0.448, 0.5] },
    ],
  },
];

export const comparisonMetrics: Record<ComparisonKind, readonly Metric[]> = {
  agents: [
    {
      name: "Time",
      description: "Wall-clock time for the agent to finish the question.",
    },
    {
      name: "Tokens",
      description:
        "Tokens processed, including prompt-cache reads and writes; output excluded.",
    },
    {
      name: "Cost",
      description: "Billed API cost with a warm prompt cache, in US dollars.",
    },
    {
      name: "Turns",
      description: "Model turns, including any tool-schema loading turn.",
    },
  ],
  retrieval: [
    {
      name: "NDCG@10",
      description:
        "Rewards relevant results near the top, relative to the best possible ordering.",
    },
    {
      name: "MRR",
      description: "Measures how high the first relevant result appears.",
    },
    {
      name: "Recall@5",
      description:
        "Measures how much of the labeled relevant set appears in the first five results.",
    },
  ],
};

export function comparisonMaximum(
  kind: ComparisonKind,
  metric: number,
): number {
  return kind === "retrieval"
    ? 1
    : Math.max(
        ...agentSamples.flatMap((sample) =>
          sample.rows.map((row) => row.values[metric]),
        ),
      );
}

export function comparisonValue(
  kind: ComparisonKind,
  metric: number,
  value: number,
): string {
  if (kind === "retrieval") return value.toFixed(3);
  if (metric === 0) return `${value.toFixed(1)} s`;
  if (metric === 1) return `${value / 1000} K`;
  if (metric === 2) return `$${value.toFixed(3)}`;
  return String(value);
}

export function comparisonWidth(
  value: number,
  maximum: number,
  width = 600,
): number {
  return Number(((value / maximum) * width).toFixed(2));
}
