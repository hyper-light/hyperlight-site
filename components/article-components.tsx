import type { MDXComponents } from "mdx/types";
import { VorpalArchitecture } from "@/components/vorpal-architecture";
import { VorpalBenchmarks } from "@/components/vorpal-benchmarks";
import { VorpalEmbeddings } from "@/components/vorpal-embeddings";
import { VorpalRanking } from "@/components/vorpal-ranking";
import { VorpalComparisons } from "@/components/vorpal-comparisons";
import { VorpalFootprint } from "@/components/vorpal-footprint";
import { VorpalTgrep } from "@/components/vorpal-tgrep";

/** Repository-owned components available directly in every .mdx article. */
export const articleComponents = {
  VorpalArchitecture,
  VorpalBenchmarks,
  VorpalEmbeddings,
  VorpalRanking,
  VorpalComparisons,
  VorpalFootprint,
  VorpalTgrep,
} satisfies MDXComponents;
