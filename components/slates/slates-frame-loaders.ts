import { lazyProofFrame } from "../proof-work/proof-frame-loader";
import type {
  ResolutionAuthor,
  ResolutionRecheck,
} from "./conflict-resolution-data";
import type { LandingExample } from "./landing-data";
import type { MergeScenario } from "./merge-data";
import type { OrbitalScenario } from "./orbital-fleet-scenarios";

export const loadAuthorityFrame = lazyProofFrame(() =>
  import("./authority-geometry").then((m) => m.authorityFrame),
);
export const loadFleetPlacementFrame = lazyProofFrame(() =>
  import("./fleet-geometry").then((m) => m.fleetPlacementFrame),
);
export const loadNamespaceFrame = lazyProofFrame(() =>
  import("./namespace-geometry").then((m) => m.namespaceFrame),
);
export const loadOperationMapFrame = lazyProofFrame(() =>
  import("./operation-map-geometry").then((m) => m.operationMapFrame),
);
export const loadOwnershipFrame = lazyProofFrame(() =>
  import("./ownership-geometry").then((m) => m.ownershipFrame),
);
export const loadRecoveryFrame = lazyProofFrame(() =>
  import("./recovery-geometry").then((m) => m.recoveryFrame),
);
export const loadTransportFrame = lazyProofFrame(() =>
  import("./transport-geometry").then((m) => m.transportFrame),
);
export const loadWorkspaceFrame = lazyProofFrame(() =>
  import("./workspace-geometry").then((m) => m.workspaceFrame),
);

const merge = (scenario: MergeScenario) =>
  lazyProofFrame(() =>
    import("./merge-geometry").then((m) => m.mergeFrames[scenario]),
  );
export const loadMergeFrames = {
  disjoint: merge("disjoint"),
  identical: merge("identical"),
  conflict: merge("conflict"),
};

const landing = (example: LandingExample) =>
  lazyProofFrame(() =>
    import("./landing-geometry").then((m) => m.landingFrames[example]),
  );
export const loadLandingFrames = {
  clean: landing("clean"),
  drift: landing("drift"),
};

const resolution = (author: ResolutionAuthor, recheck: ResolutionRecheck) =>
  lazyProofFrame(() =>
    import("./conflict-resolution-geometry").then(
      (m) => m.conflictResolutionFrames[author][recheck],
    ),
  );
export const loadConflictResolutionFrames = {
  agent: {
    unchanged: resolution("agent", "unchanged"),
    changed: resolution("agent", "changed"),
  },
  human: {
    unchanged: resolution("human", "unchanged"),
    changed: resolution("human", "changed"),
  },
};

const orbital = (scenario: OrbitalScenario) =>
  lazyProofFrame(() =>
    import("./orbital-fleet-geometry").then(
      (m) => m.orbitalFleetFrames[scenario],
    ),
  );
export const loadOrbitalFleetFrames = {
  success: orbital("success"),
  conflict: orbital("conflict"),
  missing: orbital("missing"),
  unavailable: orbital("unavailable"),
  "reply-loss": orbital("reply-loss"),
  "owner-loss": orbital("owner-loss"),
};
