import { lazyProofFrame } from "./proof-frame-loader";
import type { ValidatorExample } from "./validator-lifecycle-data";

// Explicit import paths keep each geometry family out of the initial article
// bundle. Creating these loaders does not invoke import() or render a frame.
export const loadEvidenceCassetteFrame = lazyProofFrame(() =>
  import("./evidence-cassette-geometry").then((m) => m.evidenceCassetteFrame),
);
export const loadLatencyProbingFrame = lazyProofFrame(() =>
  import("./latency-probing-geometry").then((m) => m.latencyProbingFrame),
);
export const loadLedgerPlacementFrame = lazyProofFrame(() =>
  import("./ledger-placement-geometry").then((m) => m.ledgerPlacementFrame),
);
export const loadLedgerShardsFrame = lazyProofFrame(() =>
  import("./ledger-shards-geometry").then((m) => m.ledgerShardsFrame),
);
export const loadLivenessGuardFrame = lazyProofFrame(() =>
  import("./liveness-guard-geometry").then((m) => m.livenessGuardFrame),
);
export const loadRecordReaderFrame = lazyProofFrame(() =>
  import("./record-reader-geometry").then((m) => m.recordReaderFrame),
);
export const loadReplicaFailoverFrame = lazyProofFrame(() =>
  import("./replica-failover-geometry").then((m) => m.replicaFailoverFrame),
);
export const loadValidationFixtureFrame = lazyProofFrame(() =>
  import("./validation-fixture-geometry").then((m) => m.validationFixtureFrame),
);
export const loadWorkOrderFrame = lazyProofFrame(() =>
  import("./work-order-geometry").then((m) => m.workOrderFrame),
);

const journey = (example: ValidatorExample) =>
  lazyProofFrame(() =>
    import("./journey-lifecycle-geometry").then(
      (m) => m.journeyLifecycleFrames[example],
    ),
  );
export const loadJourneyFrames = {
  pass: journey("pass"),
  fail: journey("fail"),
  error: journey("error"),
  missing: journey("missing"),
};
