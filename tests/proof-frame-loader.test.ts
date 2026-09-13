import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import ts from "typescript";
import type { ProofFrameFunction } from "../components/proof-work/proof-geometry";
import type { ProofFrameLoader } from "../components/proof-work/proof-frame-loader";

const sampleFrame: ProofFrameFunction = () => ({ paths: [], labels: [] });

test("geometry imports wait for demand and share their pending and resolved promise", async () => {
  const { lazyProofFrame } =
    await import("../components/proof-work/proof-frame-loader");
  let calls = 0;
  let resolve!: (frame: ProofFrameFunction) => void;
  const loader = lazyProofFrame(() => {
    calls++;
    return new Promise<ProofFrameFunction>((done) => {
      resolve = done;
    });
  });
  assert.equal(calls, 0, "creating the figure shell must not fetch geometry");
  const first = loader();
  const second = loader();
  assert.equal(first, second);
  await Promise.resolve();
  assert.equal(calls, 1);
  resolve(sampleFrame);
  assert.equal(await first, sampleFrame);
  assert.equal(loader(), first);
  assert.equal(await loader(), sampleFrame);
  assert.equal(calls, 1);
});

test("failed imports can retry instead of caching a rejected promise forever", async () => {
  const { lazyProofFrame } =
    await import("../components/proof-work/proof-frame-loader");
  let attempts = 0;
  const loader = lazyProofFrame(async () => {
    if (++attempts === 1) throw new Error("offline");
    return sampleFrame;
  });
  const first = loader();
  await assert.rejects(first, /offline/);
  const second = loader();
  assert.notEqual(first, second);
  assert.equal(await second, sampleFrame);
  assert.equal(attempts, 2);
});

test("registered loaders return the original frame functions for every figure and scenario", async () => {
  const proof = await import("../components/proof-work/proof-frame-loaders");
  const slates = await import("../components/slates/slates-frame-loaders");
  const singles: [ProofFrameLoader, ProofFrameFunction][] = [
    [
      proof.loadEvidenceCassetteFrame,
      (await import("../components/proof-work/evidence-cassette-geometry"))
        .evidenceCassetteFrame,
    ],
    [
      proof.loadLatencyProbingFrame,
      (await import("../components/proof-work/latency-probing-geometry"))
        .latencyProbingFrame,
    ],
    [
      proof.loadLedgerPlacementFrame,
      (await import("../components/proof-work/ledger-placement-geometry"))
        .ledgerPlacementFrame,
    ],
    [
      proof.loadLedgerShardsFrame,
      (await import("../components/proof-work/ledger-shards-geometry"))
        .ledgerShardsFrame,
    ],
    [
      proof.loadLivenessGuardFrame,
      (await import("../components/proof-work/liveness-guard-geometry"))
        .livenessGuardFrame,
    ],
    [
      proof.loadRecordReaderFrame,
      (await import("../components/proof-work/record-reader-geometry"))
        .recordReaderFrame,
    ],
    [
      proof.loadReplicaFailoverFrame,
      (await import("../components/proof-work/replica-failover-geometry"))
        .replicaFailoverFrame,
    ],
    [
      proof.loadValidationFixtureFrame,
      (await import("../components/proof-work/validation-fixture-geometry"))
        .validationFixtureFrame,
    ],
    [
      proof.loadWorkOrderFrame,
      (await import("../components/proof-work/work-order-geometry"))
        .workOrderFrame,
    ],
    [
      slates.loadAuthorityFrame,
      (await import("../components/slates/authority-geometry")).authorityFrame,
    ],
    [
      slates.loadFleetPlacementFrame,
      (await import("../components/slates/fleet-geometry")).fleetPlacementFrame,
    ],
    [
      slates.loadNamespaceFrame,
      (await import("../components/slates/namespace-geometry")).namespaceFrame,
    ],
    [
      slates.loadOperationMapFrame,
      (await import("../components/slates/operation-map-geometry"))
        .operationMapFrame,
    ],
    [
      slates.loadOwnershipFrame,
      (await import("../components/slates/ownership-geometry")).ownershipFrame,
    ],
    [
      slates.loadRecoveryFrame,
      (await import("../components/slates/recovery-geometry")).recoveryFrame,
    ],
    [
      slates.loadTransportFrame,
      (await import("../components/slates/transport-geometry")).transportFrame,
    ],
    [
      slates.loadWorkspaceFrame,
      (await import("../components/slates/workspace-geometry")).workspaceFrame,
    ],
  ];
  for (const [load, expected] of singles) assert.equal(await load(), expected);
  const checkMap = async (
    loaders: Record<string, ProofFrameLoader>,
    frames: Record<string, ProofFrameFunction>,
  ) => {
    assert.deepEqual(Object.keys(loaders).sort(), Object.keys(frames).sort());
    for (const [name, load] of Object.entries(loaders))
      assert.equal(await load(), frames[name]);
  };
  await checkMap(
    proof.loadJourneyFrames,
    (await import("../components/proof-work/journey-lifecycle-geometry"))
      .journeyLifecycleFrames,
  );
  await checkMap(
    slates.loadMergeFrames,
    (await import("../components/slates/merge-geometry")).mergeFrames,
  );
  await checkMap(
    slates.loadLandingFrames,
    (await import("../components/slates/landing-geometry")).landingFrames,
  );
  await checkMap(
    slates.loadOrbitalFleetFrames,
    (await import("../components/slates/orbital-fleet-geometry"))
      .orbitalFleetFrames,
  );
  const resolution = (
    await import("../components/slates/conflict-resolution-geometry")
  ).conflictResolutionFrames;
  await checkMap(slates.loadConflictResolutionFrames.agent, resolution.agent);
  await checkMap(slates.loadConflictResolutionFrames.human, resolution.human);
});

test("SSR orbital dimensions match the lazily loaded frame layout", async () => {
  const { orbitalSceneHeights } =
    await import("../components/slates/orbital-scene-dimensions");
  const { orbitalFleetLayout } =
    await import("../components/slates/orbital-fleet-geometry");
  assert.equal(orbitalSceneHeights.landscape, orbitalFleetLayout(false).height);
  assert.equal(orbitalSceneHeights.portrait, orbitalFleetLayout(true).height);
});

test("all ProofFigure callers retain their shell without eagerly importing geometry", () => {
  const folders = ["components/proof-work", "components/slates"];
  const callers = folders.flatMap((folder) =>
    readdirSync(folder)
      .filter((file) => file.endsWith(".tsx"))
      .map((file) => join(folder, file))
      .filter((file) => readFileSync(file, "utf8").includes("<ProofFigure")),
  );
  assert.equal(
    callers.length,
    22,
    "cover both Slates and proof-of-work callers",
  );
  for (const file of callers) {
    const source = readFileSync(file, "utf8");
    const tree = ts.createSourceFile(
      file,
      source,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );
    for (const statement of tree.statements) {
      if (
        !ts.isImportDeclaration(statement) ||
        statement.importClause?.isTypeOnly
      )
        continue;
      const target = statement.moduleSpecifier;
      if (ts.isStringLiteral(target))
        assert.doesNotMatch(
          target.text,
          /(?:geometry|drawing)$/,
          `${file}: eager geometry import`,
        );
    }
    assert.match(source, /loadFrame=\{/, `${file}: missing lazy frame loader`);
    assert.doesNotMatch(source, /\bframe=\{/, `${file}: eager frame prop`);
    assert.match(
      source,
      /(?:steps=\{|caption=)/,
      `${file}: preserve SSR explanation`,
    );
  }
});
