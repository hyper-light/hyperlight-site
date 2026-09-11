import type { MDXComponents } from "mdx/types";
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

/** Repository-owned components available directly in every .mdx article. */
export const articleComponents = {
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
} satisfies MDXComponents;
