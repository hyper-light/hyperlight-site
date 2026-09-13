import type { ReferenceNote } from "./reference-notes";

/** Each entry explains its cited source, not a broad category of related links. */
export const vorpalReferenceNotes: Record<string, ReferenceNote> = {
  "introducing-vorpal:readme": {
    title: "Benchmark machine and source revisions",
    explanation:
      "The README records the machine, compiler, tested checkouts and measurement dates behind the reported numbers. Keeping those conditions with a result makes the experiment reproducible and prevents comparing different workloads as though they were identical.",
  },
  "introducing-vorpal:getting-started": {
    title: "Using the command-line index",
    explanation:
      "The getting-started guide walks through installing the binary, indexing a checkout and asking for symbols and their relationships. A caller result identifies an indexed edge; inspect the source behind it when deciding whether it answers your question.",
    example: "definition → recorded callers\ncaller → source location",
  },
  "introducing-vorpal:tree-sitter": {
    title: "Parsing source into syntax nodes",
    explanation:
      "Tree-sitter builds a concrete syntax tree with source positions for constructs such as calls, arguments and comments. It can update that tree after an edit and retain useful structure around incomplete syntax. Parsing a file does not by itself resolve names in other files.",
    example: "allocate(size)\ncall: allocate · argument: size",
  },
  "introducing-vorpal:ast-grep": {
    title: "Matching and rewriting syntax",
    explanation:
      "ast-grep matches patterns against syntax nodes rather than arbitrary character sequences. Captured nodes can be reused in a replacement, allowing an expression to be changed without confusing a similar string or comment with executable code.",
    example: "kmalloc($SIZE, $FLAGS)\n$SIZE and $FLAGS capture argument nodes",
  },
  "introducing-vorpal:ingest": {
    title: "Building the index from files",
    explanation:
      "The ingestion pipeline reads files, extracts language structure and assembles the data used by resolution and indexing. Queued parsing work and temporary memory are bounded; the retained graph still grows with the amount of code and the relationships extracted.",
    example: "file → parse → extract → resolve → index",
  },
  "introducing-vorpal:resolver": {
    title: "Connecting a reference to a definition",
    explanation:
      "The resolver uses the language's available binding information to connect names across files. Results distinguish exact, constrained, heuristic and unresolved bindings, so a candidate target is not presented as a proven call edge.",
    example: "known binding → exact\npossible target → heuristic",
  },
  "introducing-vorpal:languages": {
    title: "Grammar support versus resolution support",
    explanation:
      "The language matrix separates the ability to parse a language from the extraction and resolution available for it. A compiled grammar can recognize syntax even when some imports, dynamic calls or language-specific relationships remain unresolved.",
  },
  "introducing-vorpal:graph-storage": {
    title: "Reading a node's adjacent edges",
    explanation:
      "Compressed sparse row storage packs edge lists into arrays. Two neighboring offsets delimit a node's outgoing range, so following three recorded edges reads that range rather than scanning every edge in the repository.",
    example: "offsets[n] = 12; offsets[n+1] = 15\nnode n owns edges[12..15]",
  },
  "introducing-vorpal:index-format": {
    title: "Keeping index generations consistent",
    explanation:
      "A build publishes a complete immutable generation by swapping the CURRENT pointer. Optional indexes carry freshness information; an incompatible or stale sidecar falls back or becomes unavailable instead of being mixed silently with a newer graph.",
    example: "CURRENT → generation B\nstale search sidecar → fallback",
  },
  "introducing-vorpal:performance": {
    title: "Index build and refresh timings",
    explanation:
      "These measurements distinguish an initial build, an unchanged check and rebuilding after an edit. Save-to-answer includes detection and refresh as well as indexing, so it measures a different delay from executing a query against an already-current index.",
  },
  "introducing-vorpal:structural-performance": {
    title: "Reducing structural-search work",
    explanation:
      "The structural-search benchmarks separate cold and reused work across patterns. Literal text can rule out files through trigrams, stored boundaries can narrow parsing, and unchanged results can be reused. Broad patterns with little literal text leave more syntax to inspect.",
    example:
      "literal filter → candidate files\nsyntax match → actual expressions",
  },
  "introducing-vorpal:search-source": {
    title: "Retrieving candidates from several indexes",
    explanation:
      "The search implementation assembles candidates from name matching, lexical vectors and reference-based ranking, with body-text fallback when the earlier paths find nothing. Candidate retrieval precedes fusion; an item can receive support from several lists.",
  },
  "introducing-vorpal:embedder": {
    title: "Deterministic lexical vectors",
    explanation:
      "The lexical embedder splits punctuation and camel-case boundaries, lowercases tokens, hashes them into signed buckets and normalizes the vector. It connects shared identifier words without a neural model; repeated words do not simply make the vector longer.",
    example:
      "resolve_import_path\n→ resolve · import · path\n→ 256-dimensional unit vector",
  },
  "introducing-vorpal:learned-embedder": {
    title: "Learning word relationships from the repository",
    explanation:
      "This model derives vectors from token co-occurrence in the indexed corpus. Factorization, removal of dominant directions and weighted pooling shape the result, with dimension selected from the corpus up to its limit. It is separate from the pretrained neural encoder.",
  },
  "introducing-vorpal:neural-embedder": {
    title: "Encoding a query with CodeRankEmbed",
    explanation:
      "The neural encoder processes the query in context, takes the CLS output and normalizes its 768-dimensional vector. A search-specific query prefix distinguishes query input from document input. Loading this model adds memory and execution cost beyond lexical hashing.",
  },
  "introducing-vorpal:fusion": {
    title: "Adding reciprocal-rank contributions",
    explanation:
      "Fusion sums each candidate's contributions from the lists that returned it. The implementation uses zero-based ranks and retains per-list provenance; a missing candidate contributes nothing, and ties break by identifier.",
    example: "ranks 0 and 5:\n1/60 + 1/65 ≈ 0.03205",
  },
  "introducing-vorpal:search-quality": {
    title: "Measured retrieval quality by corpus",
    explanation:
      "The retrieval results compare ranking tiers on labeled queries, not just query speed. A neural tier can improve one repository and worsen another; the reported corpus-specific outcomes are the evidence for choosing it, not the model's size alone.",
  },
  "introducing-vorpal:comparisons": {
    title: "Comparing indexers on the same workload",
    explanation:
      "The comparison records tool revisions, index modes and shared checkouts alongside build time, memory and index size. A text-search server and a resolved code graph do different work, so their timings need the operation being measured attached to them.",
  },
  "introducing-vorpal:cbm": {
    title: "codebase-memory-mcp",
    explanation:
      "This is the other local code-graph and MCP tool used in the comparison. The article measures its full indexing mode, including semantic edges, on the same machine and checkouts; its broader grammar coverage is a separate consideration from build time.",
  },
  "introducing-vorpal:tgrep": {
    title: "Trigram-indexed text search",
    explanation:
      "tgrep is the text-search server in the comparison. Trigrams narrow candidate text before matching; that workload does not include constructing Vorpal's syntax and resolved relationships. Use the line-search numbers to compare line search, not caller analysis.",
  },
  "introducing-vorpal:evaluation": {
    title: "Checking ranked results against graded answers",
    explanation:
      "The evaluation harness checks that labeled symbols exist, then scores results with NDCG@10, reciprocal rank and recall@5. It also checks repeat-run determinism and can compare approximate results with exact retrieval. The labels cite source evidence for expected answers.",
    example: "ranked results + graded answers\n→ relevance metrics per query",
  },
  "introducing-vorpal:mcp": {
    title: "Serving repository tools over MCP",
    explanation:
      "The MCP guide connects a local client to Vorpal over standard input and output. Tools expose search, graph navigation and source evidence from the index. An absolute index path avoids depending on the working directory chosen by the launching client.",
  },
};

/** Repeated sources can support different claims within the same article. */
export const vorpalReferenceVariants: Record<string, ReferenceNote> = {
  "introducing-vorpal:mcp:MCP tools.": {
    title: "Reading tool results and fetching remaining records",
    explanation:
      "Record-bearing MCP tools report the index generation used and whether results were truncated. A nextCursor requests the remaining page; source and confidence information let the caller verify why a returned relationship exists.",
    example:
      "generation → which index answered\nnextCursor → remaining records",
  },
  "introducing-vorpal:mcp:MCP client": {
    title: "Connecting an agent to a verified index",
    explanation:
      "An MCP client launches Vorpal's local server and calls its repository tools. Check known relationships and their evidence first: connecting a client does not fill gaps in extraction or turn a heuristic edge into a certain one.",
  },
  "introducing-vorpal:search-quality:Serving and storage results.": {
    title: "Sharing model memory across repository indexes",
    explanation:
      "The serving measurements separate per-repository index storage from the model used to encode and rerank results. Adding a checkout needs its own index, but does not require a separate copy of the same model for every checkout.",
    example: "repository A index ─┐\nrepository B index ─┴─ shared model",
  },
  "introducing-vorpal:search-quality:Retrieval results and labels.": {
    title: "Candidate coverage limits reranking",
    explanation:
      "The labeled-query results distinguish candidate retrieval from reranking. A reranker cannot promote a relevant definition that was never retrieved. These runs also have different dates and embedding-fill conditions, which limit what the tier comparison establishes.",
  },
  "introducing-vorpal:comparisons:Agent experiments and transcripts.": {
    title: "Inspecting mistakes in agent navigation tasks",
    explanation:
      "The agent experiments preserve transcripts rather than only aggregate timings. They expose missing graph edges, uncertain candidates and grep-based attribution mistakes, making it possible to check how each route reached—or missed—its answer.",
  },
  "introducing-vorpal:structural-performance:Structural search results.": {
    title: "Cold and cached broad-pattern searches",
    explanation:
      "A broad pattern such as an if statement has little literal text to filter on and can match hundreds of thousands of expressions. The reported medians compare first-use work with cached parsing in one daemon; they do not describe the same path as a selective literal call pattern.",
  },
  "introducing-vorpal:readme:Build checks.": {
    title: "Checking rebuild and incremental equivalence",
    explanation:
      "Release checks compare an incrementally updated index with a fresh build from the same source. Independent builds are also compared byte-for-byte. These checks address correctness and reproducibility, not how quickly a query returns.",
    example:
      "incremental(source B) = fresh(source B)\nbuild 1(source B) = build 2(source B)",
  },
  "introducing-vorpal:performance:Incremental parsing benchmarks.": {
    title: "Reusing extraction after a source edit",
    explanation:
      "This benchmark checks reuse of cached source and extraction snapshots against full re-extraction. The documented cache budget does not include all retained syntax-tree memory. An edit that fails the reuse checks falls back to a full walk.",
  },
  "introducing-vorpal:performance:Repository revisions and test dates.": {
    title: "Why file count does not predict build time",
    explanation:
      "The repository measurements include exact revisions and test dates. A single large generated parser can dominate the remaining parallel work, so fewer files can still take longer than a larger checkout whose work is spread across many files.",
  },
  "introducing-vorpal:search-source:document input construction.": {
    title: "Text supplied to the neural search index",
    explanation:
      "Document construction chooses the text the encoder actually sees. The background index can include a leading comment and the first source paragraph, whereas reranking uses a shorter name, signature and basename description. These inputs can produce different evidence for the same definition.",
  },
  "introducing-vorpal:embedder:vector generation.": {
    title: "Representing definition words for retrieval",
    explanation:
      "Vorpal forms lexical search vectors from words in definition names, signatures and file basenames. The deterministic embedder puts query and document words in the same vector space; similarity here reflects shared lexical features, not a proven code relationship.",
  },
  "introducing-vorpal:search-quality:Ranking tiers and evaluation.": {
    title: "Choosing a ranking tier using expected answers",
    explanation:
      "With expected answers, tuning can compare a candidate tier's retrieval quality before enabling it. Without those labels, it reports comparisons and leaves settings unchanged. The choice is based on measured results for the repository rather than assuming the most expensive tier wins.",
  },
  "introducing-vorpal:comparisons:tgrep comparison.": {
    title: "Measuring the delay from save to searchable text",
    explanation:
      "The tgrep comparison includes the time for an edit to be detected and reflected in answers. Filesystem-event load affects this measurement; it is distinct from timing a query after both indexes have already caught up.",
  },
  "introducing-vorpal:comparisons:Scan comparison.": {
    title: "Expression scans and line matches differ",
    explanation:
      "The structural scan returns matched call expressions, including related allocator names and enclosing calls. The grep command returns lines matching its literal pattern. Match counts and elapsed times are not interchangeable when the commands request different objects.",
  },
  "introducing-vorpal:getting-started:CLI": {
    title: "Checking a graph answer against familiar code",
    explanation:
      "Use the command-line guide to locate a known function, follow a recorded relationship and inspect its source. Starting with code you recognize exposes missing or uncertain edges before you depend on the graph for unfamiliar work.",
  },
};
