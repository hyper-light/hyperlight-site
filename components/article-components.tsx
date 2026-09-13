import type { MDXComponents } from "mdx/types";
import { ArticleReference } from "./article-reference";
import { VorpalArchitecture } from "@/components/vorpal-architecture";
import { VorpalBenchmarks } from "@/components/vorpal-benchmarks";
import { VorpalEmbeddings } from "@/components/vorpal-embeddings";
import { VorpalRanking } from "@/components/vorpal-ranking";
import { VorpalComparisons } from "@/components/vorpal-comparisons";
import { VorpalFootprint } from "@/components/vorpal-footprint";
import { VorpalTgrep } from "@/components/vorpal-tgrep";
import { WorkOrder } from "@/components/proof-work/work-order";
import { EvidenceCassette } from "@/components/proof-work/evidence-cassette";
import { ValidationFixture } from "@/components/proof-work/validation-fixture";
import { RecordReader } from "@/components/proof-work/record-reader";
import { LedgerPlacement } from "@/components/proof-work/ledger-placement";
import { LedgerShards } from "@/components/proof-work/ledger-shards";
import { ReplicaFailover } from "@/components/proof-work/replica-failover";
import { LatencyProbing } from "@/components/proof-work/latency-probing";
import { LivenessGuard } from "@/components/proof-work/liveness-guard";
import { ObjectLifecycles } from "@/components/proof-work/object-lifecycles";
import { SlatesWorkspace } from "@/components/slates/slates-workspace";
import { SlatesMerge } from "@/components/slates/slates-merge";
import { SlatesOwnership } from "@/components/slates/ownership";
import { SlatesRecovery } from "@/components/slates/recovery";
import { SlatesOperationMap } from "@/components/slates/slates-operation-map";
import { SlatesFleet } from "@/components/slates/slates-fleet";
import { SlatesLanding } from "@/components/slates/slates-landing";
import { SlatesConflictResolution } from "@/components/slates/slates-conflict-resolution";
import { SlatesAuthority } from "@/components/slates/slates-authority";
import { SlatesTransport } from "@/components/slates/slates-transport";
import { SlatesNamespace } from "@/components/slates/slates-namespace";
import { SlatesOrbitalFleet } from "@/components/slates/slates-orbital-fleet";

/** Repository-owned components available directly in every .mdx article. */
export const articleComponents = {
  a: ArticleReference,
  VorpalArchitecture,
  VorpalBenchmarks,
  VorpalEmbeddings,
  VorpalRanking,
  VorpalComparisons,
  VorpalFootprint,
  VorpalTgrep,
  WorkOrder,
  EvidenceCassette,
  ValidationFixture,
  RecordReader,
  LedgerPlacement,
  LedgerShards,
  ReplicaFailover,
  LatencyProbing,
  LivenessGuard,
  ObjectLifecycles,
  SlatesWorkspace,
  SlatesMerge,
  SlatesOwnership,
  SlatesRecovery,
  SlatesOperationMap,
  SlatesFleet,
  SlatesLanding,
  SlatesConflictResolution,
  SlatesAuthority,
  SlatesTransport,
  SlatesNamespace,
  SlatesOrbitalFleet,
} satisfies MDXComponents;
