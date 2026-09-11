export type LatencyCoordinate = {
  vector: readonly number[];
  height: number;
  adjustment: number;
  error: number;
  samples: number;
};

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

/** The implemented eight-axis estimate; the drawing is only a projection. */
export function coordinateDistance(a: LatencyCoordinate, b: LatencyCoordinate) {
  return Math.max(
    0,
    Math.hypot(...a.vector.map((value, index) => value - b.vector[index])) +
      a.height +
      b.height +
      a.adjustment +
      b.adjustment,
  );
}

/** One deterministic, source-equivalent Vivaldi update from an acknowledged probe. */
export function updateLatencyCoordinate(
  local: LatencyCoordinate,
  peer: LatencyCoordinate,
  measuredRtt: number,
): LatencyCoordinate {
  const predicted = coordinateDistance(local, peer);
  const difference = measuredRtt - predicted;
  const delta = local.vector.map((value, index) => value - peer.vector[index]);
  const norm = Math.hypot(...delta);
  const direction =
    norm > Number.EPSILON
      ? delta.map((value) => value / norm)
      : [1, 0, 0, 0, 0, 0, 0, 0];
  const step = (0.25 * local.error) / Math.max(local.error + peer.error, 0.05);
  const relative =
    predicted > Number.EPSILON
      ? Math.abs(difference / predicted)
      : Math.abs(difference);
  return {
    vector: local.vector.map((value, index) =>
      clamp(
        (value + step * difference * direction[index]) * 0.99,
        -10_000,
        10_000,
      ),
    ),
    height: clamp(local.height + 0.25 * step * difference, 0, 10_000),
    adjustment: clamp(local.adjustment + 0.05 * difference, -1, 1),
    error: clamp(local.error + 0.25 * (relative - local.error), 0.05, 10),
    samples: local.samples + 1,
  };
}

export function probeEstimate(
  local: LatencyCoordinate,
  peer: LatencyCoordinate,
  healthScore: number,
) {
  const fallback = local.samples < 3 || peer.samples < 3;
  const estimate = fallback ? 100 : coordinateDistance(local, peer);
  const sigma = fallback
    ? 50
    : clamp((local.error + peer.error) * Math.max(estimate, 1), 1, 500);
  const margin = 2 * sigma;
  const bound = clamp(estimate + margin, 1, 10_000);
  const health = 1 + clamp(healthScore, 0, 8) * 0.25;
  return {
    estimate,
    margin,
    bound,
    health,
    fallback,
    deadline: Math.round(clamp(3 * bound, 300, 2_000) * health),
  };
}

const established: LatencyCoordinate = {
  vector: [0, 0, 0, 0, 0, 0, 0, 0],
  height: 2,
  adjustment: 0,
  error: 0.08,
  samples: 12,
};

export const latencyExamples = [
  {
    label: "Nearby",
    title: "Nearby Peer",
    description:
      "An acknowledged probe supplies a measured round trip. The observer adjusts its eight-dimensional coordinate by the prediction error. For this nearby peer, the computed deadline stays at the 300 ms minimum.",
    local: established,
    peer: {
      vector: [12, 9, 4, 3, 1, 0, 2, 1],
      height: 2,
      adjustment: 0,
      error: 0.12,
      samples: 16,
    },
    observed: 24,
    healthScore: 0,
  },
  {
    label: "Distant",
    title: "Distant Peer",
    description:
      "A longer observed round trip moves the coordinate estimate. The prediction's error margin widens the bound, and the observer's health multiplier allows more time. Distance and local scheduling delays don't have to become false accusations.",
    local: established,
    peer: {
      vector: [96, 72, 0, 24, 18, 12, 0, 0],
      height: 6,
      adjustment: 0,
      error: 0.12,
      samples: 18,
    },
    observed: 180,
    healthScore: 2,
  },
  {
    label: "Uncertain",
    title: "Insufficient Samples",
    description:
      "The observer still learns from the acknowledgement, but neither coordinate has three samples. It uses the conservative 100 ms estimate and 50 ms uncertainty instead. With health score 4, the resulting probe deadline is 1,200 ms.",
    local: {
      vector: [0, 0, 0, 0, 0, 0, 0, 0],
      height: 0.1,
      adjustment: 0,
      error: 10,
      samples: 0,
    },
    peer: {
      vector: [-10, -45, 20, 12, 0, 4, 8, 2],
      height: 4,
      adjustment: 0,
      error: 8,
      samples: 1,
    },
    observed: 80,
    healthScore: 4,
  },
] satisfies readonly {
  label: string;
  title: string;
  description: string;
  local: LatencyCoordinate;
  peer: LatencyCoordinate;
  observed: number;
  healthScore: number;
}[];

export const latencyMeasurements = latencyExamples.map((example) => {
  const updated = updateLatencyCoordinate(
    example.local,
    example.peer,
    example.observed,
  );
  return {
    ...probeEstimate(updated, example.peer, example.healthScore),
    updated,
  };
});
