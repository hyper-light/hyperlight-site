# Vorpal benchmark audit for “Introducing Vorpal”

Checked 2026-09-10. This note centers the **user-requested README benchmarks**. These are published maintainer measurements, not fresh or independent results. No benchmarks, corpus indexing, competitor binaries, or paid agent runs were executed. Only this research note was written.

## Source snapshot and measurement conditions

The clean local Vorpal checkout was `4dd203fa560bfd2c0c8f1857f7bbca983c23de63` (2026-09-10); Cargo reports 0.9.0. All README numbers below refer to this snapshot. The README dates the three principal index rows, structural queries, and tool comparisons to 2026-09-07. Hardware: Apple M5 Max, 18 cores, 128 GB RAM, macOS 26.4.1, rustc 1.98.0. This is a high-memory workstation, not a cross-platform or low-memory result. [README Performance](../../../vorpal/README.md#performance), [Cargo version](../../../vorpal/Cargo.toml), [toolchain](../../../vorpal/rust-toolchain.toml).

Linux is pinned to `1590cf032971`: 75,954 grammar-handled files of 94,843 tracked, approximately 30 M LOC, producing 8,891,771 **nodes**, not 8.9 million functions. CPython is pinned to `b86a41cbf63`: 3,841 parsed files and 162,945 nodes. The self-index includes 49 vendored grammars and produces 80,611 nodes in the comparison; generated parser files make this an unusual small-repository workload. The current documentation revision is identifiable, but the self-index's exact per-run source revision is not recorded alongside every table. [README indexing](../../../vorpal/README.md#how-long-does-indexing-take), [refresh history](../../../vorpal/docs/wip/BENCHMARKS.md#the-readme-refresh-for-090-one-index-number-tgrep-and-cbm-re-run-2026-09-07-last).

“Cold index” means an absent index, **not** a rebooted machine or flushed OS page cache. Vorpal cold figures are best of three full CLI invocations; unchanged/edit timings have their own stated aggregation. The README quiet gate requires consecutive samples at least 88% idle, excluding WindowServer and fseventsd from the external-process limit. File-event service load still affects results. Do not present 8.1 s as guaranteed latency. The history records same-day 10.6 s runs under background git load and the accepted interleaved Vorpal sequence 9.01 / 8.09 / 8.29 s. [README conditions](../../../vorpal/README.md#performance), [benchmark definitions and history](../../../vorpal/docs/wip/BENCHMARKS.md).

The benchmark drivers and label/evidence sets are committed. Their detailed JSON/transcript outputs are written to session scratch; the history explicitly says several indexes/clones were deleted and tgrep JSON retained in scratch. No matching raw run bundle was found among the tracked evaluation/documentation files inspected. The tables are auditable maintainer records, not a fully archived independently regraded dataset. [Drivers](../../../vorpal/evals), [artifact notes](../../../vorpal/docs/wip/BENCHMARKS.md#artifacts).

## Exact README comparisons worth using

### Graph peer: codebase-memory-mcp

Measured cbm source is the clean local checkout `997d087b211124a904af58ae9545356de97daf2f`, tested in **full mode** through its CLI. Do not claim full is the only mode with semantic edges; that is false at the measured revision (details below). Both ran on the same machine and checkouts. [README comparison](../../../vorpal/README.md#how-does-it-compare), [cbm harness](../../../vorpal/evals/cbm_bench.py).

| Workload                   |           Vorpal | codebase-memory-mcp | Important qualification                                                   |
| -------------------------- | ---------------: | ------------------: | ------------------------------------------------------------------------- |
| Linux cold index           |            8.1 s |               296 s | Vorpal best of three; cbm driver records one cold invocation per corpus   |
| Linux peak indexing RSS    |           6.1 GB |             30.8 GB | cbm sums the process tree every 50 ms; Vorpal uses process high-water RSS |
| Linux index on disk        |           4.8 GB |      15.8 GB SQLite | Different representations and node/edge coverage                          |
| Linux unchanged            |           0.13 s |              14.2 s | Existing index, unchanged source                                          |
| CPython cold index         |            0.9 s |              38.5 s | Same aggregation caveat as Linux                                          |
| CPython peak RSS / disk    |  0.7 GB / 160 MB |     6.5 GB / 632 MB | Indexing resource cost, not query RSS                                     |
| CPython unchanged          |           0.02 s |               5.2 s | Existing index                                                            |
| Self-index cold            |            6.9 s |              43.1 s | Includes generated vendored grammars                                      |
| Self-index peak RSS / disk | 11.6 GB / 860 MB |    31.8 GB / 297 MB | cbm uses **less disk** on this corpus                                     |
| Self-index unchanged       |           0.02 s |               5.4 s | Existing index                                                            |
| Kernel one-shot search     |           0.15 s |               5.6 s | README exact value; refresh history says 5.9 s for cbm                    |
| Kernel one-shot callers    |           0.01 s |           3.6–4.1 s | Do not substitute Vorpal daemon latency in a CLI comparison               |

Source for every table cell: [README, “Against the nearest tool”](../../../vorpal/README.md#how-does-it-compare). The underlying refresh records cbm kernel 295.6 s, 8,529,631 nodes / 15,982,096 edges; it is rounded to 296 s in the README. Vorpal and cbm do not construct identical graphs. Timing ratios can be calculated from these published numbers, but they do not establish a universal “N× faster” claim or matched statistical confidence. [Refresh detail](../../../vorpal/docs/wip/BENCHMARKS.md#the-readme-refresh-for-090-one-index-number-tgrep-and-cbm-re-run-2026-09-07-last).

### Indexed text search: tgrep

The measured tgrep source is the clean local checkout `e2007b52d2b8fe4176159d0da20c9ba4a46d5aab`, reporting 1.0.4. The history identifies ripgrep 15.2.0. tgrep cold times are medians of three, unlike Vorpal's best of three. tgrep queries include a fresh CLI client connecting to its server; Vorpal rows are MCP requests to a warm daemon. [README comparison](../../../vorpal/README.md#how-does-it-compare), [tgrep campaign](../../../vorpal/docs/wip/BENCHMARKS.md#vorpal-versus-microsofttgrep-on-the-readme-corpora-2026-09-07).

| Workload                       |                           tgrep |                                                      Vorpal |
| ------------------------------ | ------------------------------: | ----------------------------------------------------------: |
| Kernel cold index              | 8.2 s; 0.31 GB RSS; 1.0 GB disk |                              8.1 s; 6.1 GB RSS; 4.8 GB disk |
| Kernel indexed files           |                          94,719 |                                         75,954 parsed files |
| CPython cold / RSS / disk      |        0.54 s / 0.14 GB / 74 MB |                                     0.9 s / 0.7 GB / 160 MB |
| Self-index cold / RSS / disk   |        0.69 s / 0.26 GB / 28 MB |                                    6.9 s / 11.6 GB / 860 MB |
| 102-query kernel suite, median |                           21 ms |                                        text_search: 12.8 ms |
| kmalloc query                  |         18 ms; 3,387 text lines | code_search: 35 ms; 2,715 two-argument calls with functions |
| vfs_read callers query         |                7.7 ms; 13 lines |               graph callers: 0.10 ms; 3 resolved call edges |
| Save → visible, kernel clone   |                           4.4 s |                       4.3 s; 2.0–2.2 s with quiet fseventsd |

Source for every table cell: [README, “Against tgrep”](../../../vorpal/README.md#how-does-it-compare).

**Do not turn median latency into throughput or output-equivalence claims.** The history's 102-query totals are tgrep **2.6 s** versus Vorpal text_search **2.63 s**, with Vorpal p95 **116 ms**. Only **20 of 102** Vorpal/rg line counts match because Vorpal searches its indexed file set. Its “0 mismatches” check compares the trigram tier with Vorpal's own exhaustive indexed-file scan, not unrestricted rg. The older tgrep/rg suite found 101/102 byte-equal, with tgrep excluding scripts/Makefile.lib as a binary extension. [Text-tier results](../../../vorpal/docs/wip/BENCHMARKS.md#text_search-the-102-query-kernel-suite-recorded-before-the-chunk-work-same-tier), [parity driver](../../../vorpal/evals/tgrep_bench.py).

Vorpal's **0.65 ms** median ranked `search` on the same strings returns definitions, not every matching text line. It is not a like-for-like regex speedup. Likewise, callers and arity-constrained AST calls are different answers, not faster implementations of the same text predicate. tgrep's lower indexing memory/disk is an important trade-off, not a footnote to hide. [README](../../../vorpal/README.md#how-does-it-compare).

### Standalone AST scan versus ripgrep

README reports `vorpal scan` **1.5 s** after parsed products are banked, **2.5 s** first time, versus ripgrep **0.8 s** on 63,775 C files. The AST rule returns 6,819 call-expression nodes containing “kmalloc”; the rg pattern returns 3,387 lines containing `kmalloc(`. The AST rule includes allocator-name variants and outer calls wrapping them. This table supports richer structural answers at additional cost—not higher recall or a speed win. The old 42.6 K node count came from a broader rule and must not be revived. [README standalone scan](../../../vorpal/README.md#how-does-it-compare), [scan driver](../../../vorpal/evals/readme_bench.py), [ast-grep rule semantics](https://ast-grep.github.io/reference/rule.html).

## Retrieval quality: report the labels, not “accuracy”

The bundled sets contain 54 kernel, 54 CPython, and 55 self-index queries across exact, subset, short-keyword, descriptive, paraphrase, and conjunctive classes. Grades are source-backed, but hand-authored by the project. The kernel evidence explicitly lists source definitions excluded because Vorpal did not index them. These scores therefore do **not** measure total extraction coverage or general code-understanding accuracy. [Label data](../../../vorpal/xtask/labels), [kernel evidence](../../../vorpal/xtask/labels/kernel.evidence.md).

| README corpus   | Vorpal default NDCG@10 / MRR / recall@5 | cbm BM25 NDCG@10 / MRR / recall@5 | Publication status                                                            |
| --------------- | --------------------------------------- | --------------------------------- | ----------------------------------------------------------------------------- |
| Kernel (54)     | 0.329 / 0.327 / 0.358                   | 0.218 / 0.188 / 0.293             | **Published values only; confirmed cbm path-scoring defect requires regrade** |
| CPython (54)    | 0.306 / 0.291 / 0.333                   | 0.200 / 0.205 / 0.222             | This specific anchored-path defect does not apply                             |
| Self-index (55) | 0.402 / 0.395 / 0.445                   | 0.462 / 0.466 / 0.473             | cbm wins all three published metrics                                          |

Source for numeric cells: [README comparison](../../../vorpal/README.md#how-does-it-compare). Do not omit cbm's self-index win or convert these scores into accuracy percentages.

### Confirmed scorer defect: kernel cbm paths

At pinned cbm `997d087`, `cbm_node_t.file_path` is explicitly tree-relative. BM25 search reads the stored file_path and writes it unchanged into the third result-table cell. Vorpal's `hits_of` keeps that cell, yet its `grade` requires an **absolute root-prefixed path** whenever a label begins with “/”. Thus otherwise-correct relative-path hits cannot score for three kernel labels: `rb_insert_color` at /lib/rbtree.c, `kzalloc` at /include/linux/slab.h, and `rb_erase` at /lib/rbtree.c. [cbm store contract](../../../codebase-memory-mcp/src/store/store.h), [cbm BM25 formatting](../../../codebase-memory-mcp/src/mcp/mcp.c), [comparison grader, lines 47–83](../../../vorpal/evals/cbm_bench.py), [kernel labels](../../../vorpal/xtask/labels/kernel.json).

The published numerical impact cannot be calculated without the saved hits or a corrected regrade. No corrected score is asserted here. Safest article treatment: omit the kernel comparative-quality claim or explicitly disclose it as a README-reported value pending scorer correction. CPython and self-index contain no slash-anchored labels. This is a defect in the comparison harness, **not a defect in cbm search**.

### Exact scoring and fusion math

For zero-based result rank r and grade g:

- Gain(g) = 2^g − 1.
- DCG@10 = sum over matched labels at r < 10 of Gain(g) / log2(r + 2).
- NDCG@10 = DCG@10 / the ideal DCG from that query's label grades sorted descending; a total miss is 0.
- MRR per query = 1 / (r + 1) for the first hit with grade ≥ 2; otherwise 0.
- Recall@5 per query = unique grade ≥ 2 labels matched among the first five / all grade ≥ 2 labels.
- Each label scores once, greedily at its first matching rank. Overall results are means across queries. The harness requests top 25; NDCG and recall use their smaller cutoffs.

The formulas match in the two scoring implementations; the confirmed defect is path matching. [Vorpal scorer](../../../vorpal/xtask/src/searcheval.rs), [cbm comparison scorer](../../../vorpal/evals/cbm_bench.py).

Vorpal's plain reciprocal-rank fusion is **RRF(d) = Σc 1 / (60 + r_c(d))**, with **zero-based** rank and no contribution for a channel that omits d; ties use node ID ascending. Do not silently print a one-based formula with the same constant. The optional channels and later reranking have additional behavior; RRF is a retrieval mechanism, not the NDCG evaluation metric. [RRF implementation, lines 4102–4104 and 4328–4381](../../../vorpal/crates/index/src/lib.rs).

### Tier and latency footnotes matter

README default scores were remeasured 2026-09-07; learned/encoder scores date to 2026-09-06. On kernel, the published default NDCG **0.329** is above learned **0.315** and encoder **0.295**; the broad prose claim that learned improves every corpus should not replace this table. Optional tiers improve different corpora differently. Quality tables disable the dense sidecar channel/pre-fill, whereas the daemon resource/latency rows include background embedding fill. [README quality and tier latency](../../../vorpal/README.md#is-search-any-good), [tier harness](../../../vorpal/evals/readme_bench.py).

Kernel default daemon search is **0.8 ms median**, **2.1 ms p95**, **0.19 s first query**, **2.1 GB peak query RSS**. Encoder rows' roughly **35–36 ms medians** predominantly benefit from a small repeated query set and 4,096-entry embedding cache; uncached new-query p95 is roughly **0.2–0.3 s**. First-query rows have weights/index in the page cache; historical reboot page-in was about **4.8 s** at v0.7.1. f16 halves download size, not runtime memory, because it decodes to f32. Do not mix query RSS with indexing RSS or warmed-tier disk sizes with base-generation disk sizes. [README latency footnotes](../../../vorpal/README.md#how-fast-are-queries-and-what-do-they-cost-in-memory).

## Agent workflow: useful but tightly bounded

README's end-to-end campaign is four questions, Claude Code **2.1.261**, model reported as **Opus 5**, effort high, measured 2026-09-06 with the dedicated section identifying Vorpal **v0.8.3**. The general Performance introduction instead groups agent/tier tables under v0.8.4; retain the specific campaign stamp and note the inconsistency rather than claiming the entire README is one binary/run. These are historical billed amounts, not verified current API prices. [README end-to-end section](../../../vorpal/README.md#how-does-it-compare), [campaign method](../../../vorpal/docs/wip/BENCHMARKS.md#e2e-table-re-measured-cold-and-warm-prompt-cache-effort-pinned-2026-09-06).

Each cell ran four times; results are medians of three valid warm repeats, with a repeat rejected/replaced when its prefix was rewritten. Tokens include input plus cache-write and cache-read tokens; the actual harness's displayed token sum **excludes output tokens**, which it records separately. Costs include the API's billed total. Schemas were deferred in the measured MCP arm; a first ToolSearch contributes a turn. The shell arm could use either MCP or CLI and chose the CLI fast path. [End-to-end driver](../../../vorpal/evals/mcp_agent_e2e.py).

| Question                         | grep/read: turns / input tokens / cost / wall | Vorpal MCP                | Vorpal CLI through shell  |
| -------------------------------- | --------------------------------------------- | ------------------------- | ------------------------- |
| Repo callers of tool_result      | 5 / 73 K / $0.081 / 9.4 s                     | 3 / 63 K / $0.054 / 5.9 s | 2 / 43 K / $0.028 / 5.3 s |
| Repo reachability of run_install | 4 / 77 K / $0.136 / 11.8 s                    | 3 / 64 K / $0.045 / 7.0 s | 2 / 44 K / $0.040 / 7.9 s |
| Kernel callers of vfs_read       | 5 / 104 K / $0.200 / 16.6 s                   | 3 / 51 K / $0.042 / 6.9 s | 2 / 36 K / $0.029 / 6.1 s |
| Kernel callees of vfs_read       | 3 / 59 K / $0.053 / 8.2 s                     | 3 / 51 K / $0.046 / 5.7 s | 2 / 36 K / $0.026 / 5.8 s |

Source for every cell: [README agent table](../../../vorpal/README.md#how-does-it-compare). Its following prose understates the grep range by saying $0.05–$0.14 despite the $0.200 cell; prefer exact table values.

Cold prompt-cache writes add distinct costs and can reverse which arm is cheapest on a first question. Four selected tasks are not a broad agent benchmark. The README also documents graph misses: inline helpers on the kernel callees task and a transitive call inside a struct literal on the self-index task. The graph's constrained matches are evidence grades, not proof all targets are correct. Preserve these correctness caveats; do not claim perfect graph completeness. [README correctness notes](../../../vorpal/README.md#how-does-it-compare).

## Competitor semantics and historical corrections

- **ripgrep:** primary documentation describes line-oriented recursive regex. File-type filtering is not AST parsing; the measured substring pattern can match comments, declarations, and similarly named functions and miss alternate whitespace. Those are properties of that pattern, not a general inability of rg. [ripgrep 15.2.0 README](https://raw.githubusercontent.com/BurntSushi/ripgrep/15.2.0/README.md).
- **tgrep:** indexed regex verification and client/server behavior make text_search the closest baseline. Different file filters prevent assuming identical corpus coverage. The benchmark source SHA differs from the public v1.0.4 release tag; do not silently replace the measured SHA with a tag. [Pinned local source](../../../tgrep/README.md), [official release](https://github.com/microsoft/tgrep/releases/tag/v1.0.4).
- **cbm:** pinned pipeline code runs semantic/similarity passes in FULL, MODERATE, and ADVANCED, skipping FAST. “Only full has semantic edges” is false. Its semantic implementation does use stored per-token Nomic vectors; this is confirmed in source rather than inferred from current marketing. Official pages contain differing grammar counts, so describe the README's historical 162-versus-49 count as version-stamped, if used at all. “Determinism not claimed” is not evidence cbm is nondeterministic. [Pinned pipeline](../../../codebase-memory-mcp/src/pipeline/pipeline.c), [pinned semantic implementation](../../../codebase-memory-mcp/src/semantic/semantic.c), [official project](https://github.com/DeusData/codebase-memory-mcp).
- **Claude Code:** deferred loading is a configurable host behavior, not an unavoidable MCP tax. Official docs describe upfront-loading overrides and host/model exceptions. Do not infer today's model prices or exact transcript behavior from those docs. [Anthropic MCP documentation](https://code.claude.com/docs/en/mcp#scale-with-mcp-tool-search).

## Reproduction route and publication recommendation

The committed evaluation entry points are:

1. `evals/readme_bench.py`: indexing, edit classes, tier quality/latency, memory/disk, standalone scan.
2. `evals/tgrep_bench.py`: interleaved builds, query suite, text parity, structural parity, save-visible time.
3. `evals/cbm_bench.py`: full-mode CLI indexing, process-tree RSS, BM25 grading, CLI latency.
4. `evals/mcp_percall.py` and `evals/mcp_agent_e2e.py`: tool-only and paid agent workflow measurements.
5. `xtask/src/searcheval.rs`, `xtask/labels/*.json`, and evidence Markdown: the retrieval scoring contract.

These scripts contain machine-specific paths; indexing/edit harnesses write to configured indexes or scratch trees. Read and adapt them before use, keep separate output/cache directories per corpus, and capture full tool/corpus SHAs and raw outputs. The cbm script's disk sampler measures its entire configured cache, so a reused multi-project cache is not a per-project size measurement. No such commands were run here.

On an already-built appropriate index, the quality harness's documented release-mode route is:

```sh
VORPAL_DENSE_CHANNEL=off cargo run --release -q -p xtask -- \
  searcheval /absolute/index xtask/labels/kernel.json --root /absolute/linux
```

The short `cargo xtask` alias is a debug build; the campaign deliberately uses release mode to avoid an unoptimized encoder GEMM. The harness reports missing/stale tiers rather than silently warming them. [Harness contract](../../../vorpal/xtask/src/searcheval.rs), [release invocation](../../../vorpal/evals/readme_bench.py).

**Recommended article framing:** “In the project's published September 2026 measurements on an M5 Max workstation…” Use exact README tables, include tgrep's resource advantage and cbm's self-index retrieval win, separate warmed daemon queries from CLI/first-use costs, and disclose the kernel cbm scorer defect before using that quality comparison. No universal superiority, independent-validation, or general accuracy claim is supported by this audit.

Public web verification found the [Vorpal project README](https://github.com/hyper-light/vorpal) readable and consistent with the benchmark section inspected locally. Pinned GitHub URLs were not retrievable through the web tool; local clean Git revisions are the exact-source evidence used above.

## README-only expansion checklist (2026-09-10)

This addendum answers the later request to expand the public article with the README's published results. It does not repeat or extend the earlier harness audit. All figures below were transcribed from the same clean local revision, `4dd203fa560bfd2c0c8f1857f7bbca983c23de63`; no measurements were run. Prior research above is preserved.

### 1. Keep the full cbm comparison, including resource and unchanged rows

All cells below: [README lines 588–617](https://github.com/hyper-light/vorpal/blob/4dd203fa560bfd2c0c8f1857f7bbca983c23de63/README.md#L588-L617). September 7, same machine/checkouts; cbm `997d087`, `full` mode, its scriptable CLI. The memory column is peak **indexing** RSS; disk is the base index, not Vorpal's fully warmed search footprint.

| Corpus / operation          |  Vorpal |                   cbm |
| --------------------------- | ------: | --------------------: |
| Kernel cold index           |   8.1 s |                 296 s |
| Kernel nodes                |  8.89 M | 8.53 M (16.0 M edges) |
| Kernel peak RSS             |  6.1 GB |               30.8 GB |
| Kernel disk                 |  4.8 GB |        15.8 GB SQLite |
| Kernel unchanged            |  0.13 s |                14.2 s |
| CPython cold index          |   0.9 s |                38.5 s |
| CPython nodes               | 162,945 |               136,118 |
| CPython peak RSS            |  0.7 GB |                6.5 GB |
| CPython disk                |  160 MB |                632 MB |
| CPython unchanged           |  0.02 s |                 5.2 s |
| Vorpal self-index cold      |   6.9 s |                43.1 s |
| Vorpal self-index nodes     |  80,611 |                67,797 |
| Vorpal self-index peak RSS  | 11.6 GB |               31.8 GB |
| Vorpal self-index disk      |  860 MB |                297 MB |
| Vorpal self-index unchanged |  0.02 s |                 5.4 s |
| Kernel one-shot search      |  0.15 s |                 5.6 s |
| Kernel one-shot callers     |  0.01 s |             3.6–4.1 s |

The same comparison supplies Vorpal daemon search/callers figures of **0.7 ms / 0.1 ms** in parentheses; do not substitute those for its CLI column. Computed from the published cold times: approximately **36.5× / 42.8× / 6.2×** faster indexing, respectively. Rounded 37× / 43× / 6× is correct. cbm's smaller self-index disk belongs beside Vorpal's time/RSS results. The README comparison also lists 49 versus 162 grammars; avoid turning “determinism not claimed” into a measured cbm nondeterminism result.

### 2. Keep tgrep's query meanings attached to its numbers

All cells: [README lines 563–584](https://github.com/hyper-light/vorpal/blob/4dd203fa560bfd2c0c8f1857f7bbca983c23de63/README.md#L563-L584). tgrep 1.0.4, September 7; tgrep builds are medians of three, Vorpal uses its indexing-table measurements.

| Workload                             | tgrep                                   | Vorpal                                                        |
| ------------------------------------ | --------------------------------------- | ------------------------------------------------------------- |
| Kernel cold / peak RSS / disk        | 8.2 s / 0.31 GB / 1.0 GB                | 8.1 s / 6.1 GB / 4.8 GB                                       |
| Kernel file count                    | 94,719 indexed files                    | 75,954 parsed files                                           |
| CPython cold / peak RSS / disk       | 0.54 s / 0.14 GB / 74 MB                | 0.9 s / 0.7 GB / 160 MB                                       |
| Self-index cold / peak RSS / disk    | 0.69 s / 0.26 GB / 28 MB                | 6.9 s / 11.6 GB / 860 MB                                      |
| 102-query kernel suite, median       | 21 ms, text lines                       | `text_search`: 12.8 ms, lines with enclosing symbol           |
| Same query strings, different answer | —                                       | `search`: 0.65 ms, ranked definitions                         |
| `kmalloc` lookup                     | 18 ms, 3,387 lines matching `kmalloc\(` | `code_search`: 35 ms, 2,715 two-argument calls with functions |
| `vfs_read` callers lookup            | 7.7 ms, 13 text lines                   | `graph callers`: 0.10 ms, 3 call edges with sites             |
| Save → next answer, kernel clone     | 4.4 s                                   | 4.3 s; 2.0–2.2 s with quiet `fseventsd`                       |

Editorial point: text-to-text comparison is **21 ms versus 12.8 ms**. Ranked definitions, arity-specific calls, and resolved callers are different outputs; show their utility, not a fictitious equivalent-text-query speedup. tgrep's lighter memory/disk profile is a clear trade-off. The README's separate structural optimization table also offers compelling before/after rows: `kmalloc` code search **4.3 s → 35 ms**; structural `kmalloc` **4.1 s/stopped at 100 → 51 ms/all 2,715**; assignment to `schedule_timeout` **4.4 s → 45 ms**. [Structural table](https://github.com/hyper-light/vorpal/blob/4dd203fa560bfd2c0c8f1857f7bbca983c23de63/README.md#L311-L327).

### 3. Publish all three retrieval metrics for every tier

Cells are **NDCG@10 / MRR / recall@5**, not percentages of correct questions. Sets contain 54 kernel, 54 CPython, 55 self-index queries. [README lines 361–394](https://github.com/hyper-light/vorpal/blob/4dd203fa560bfd2c0c8f1857f7bbca983c23de63/README.md#L361-L394).

| Corpus            | Default               | Learned               | Learned + encoder f32 |
| ----------------- | --------------------- | --------------------- | --------------------- |
| Kernel            | 0.329 / 0.327 / 0.358 | 0.315 / 0.304 / 0.361 | 0.295 / 0.290 / 0.302 |
| CPython           | 0.306 / 0.291 / 0.333 | 0.341 / 0.322 / 0.389 | 0.351 / 0.331 / 0.426 |
| Vorpal self-index | 0.402 / 0.395 / 0.445 | 0.430 / 0.427 / 0.455 | 0.455 / 0.448 / 0.500 |

Kernel f16 encoder is **0.296 / 0.290 / 0.302**; CPython/self-index rank identically between f16/f32. The learned tier has no model download; f16/f32 encoder weights are 274/547 MB. Default scores were refreshed September 7 with the body channel; learned/encoder columns date to September 6 and precede background embedding fill. Preserve those dates; do not write that learned wins every metric on all corpora when the table says otherwise. [Tier descriptions](https://github.com/hyper-light/vorpal/blob/4dd203fa560bfd2c0c8f1857f7bbca983c23de63/README.md#L344-L359).

The full published cbm quality comparison, again **NDCG@10 / MRR / recall@5**:

| Corpus            | Vorpal default        | cbm BM25              |
| ----------------- | --------------------- | --------------------- |
| Kernel            | 0.329 / 0.327 / 0.358 | 0.218 / 0.188 / 0.293 |
| CPython           | 0.306 / 0.291 / 0.333 | 0.200 / 0.205 / 0.222 |
| Vorpal self-index | 0.402 / 0.395 / 0.445 | 0.462 / 0.466 / 0.473 |

Source: [README lines 605–607](https://github.com/hyper-light/vorpal/blob/4dd203fa560bfd2c0c8f1857f7bbca983c23de63/README.md#L605-L607). The user-requested presentation is the published table, identified as such; this addendum does not re-audit scoring. cbm wins all three self-index default metrics. The self-index **0.455 / 0.448 / 0.500** result belongs to learned **plus encoder**, not learned alone.

If pairing quality with operational cost, retain the distinction between **kernel base disk 4.8 GB** and **warmed default/learned totals 8.1/8.5 GB**. CPython warmed disk is 210/280 MB; self-index 880/910 MB. Encoder weights are stored once, separately. Encoder medians (35–36 ms) benefit from repeated queries and the 4,096-entry cache; their p95s are 218–324 ms. f16 decodes to f32 in RAM, so half the download does not imply half the runtime RSS. [Latency, memory, disk and footnotes](https://github.com/hyper-light/vorpal/blob/4dd203fa560bfd2c0c8f1857f7bbca983c23de63/README.md#L396-L432).

### 4. Show the complete four-question agent experiment, including cost

All cells: [README lines 495–523](https://github.com/hyper-light/vorpal/blob/4dd203fa560bfd2c0c8f1857f7bbca983c23de63/README.md#L495-L523). Claude Code 2.1.261, Opus 5, high effort; measured September 6 with Vorpal **v0.8.3**. Each cell ran four times; values are medians of the final three with the prompt cache warm. Dollar figures are recorded API bills, not current price guidance.

| Question                               | Arm                | Turns | Tokens |   Cost |   Wall |
| -------------------------------------- | ------------------ | ----: | -----: | -----: | -----: |
| Self-index: callers of `tool_result`   | Grep + Read        |     5 |   73 K | $0.081 |  9.4 s |
|                                        | Vorpal MCP         |     3 |   63 K | $0.054 |  5.9 s |
|                                        | Vorpal CLI / shell |     2 |   43 K | $0.028 |  5.3 s |
| Self-index: what `run_install` reaches | Grep + Read        |     4 |   77 K | $0.136 | 11.8 s |
|                                        | Vorpal MCP         |     3 |   64 K | $0.045 |  7.0 s |
|                                        | Vorpal CLI / shell |     2 |   44 K | $0.040 |  7.9 s |
| Kernel: callers of `vfs_read`          | Grep + Read        |     5 |  104 K | $0.200 | 16.6 s |
|                                        | Vorpal MCP         |     3 |   51 K | $0.042 |  6.9 s |
|                                        | Vorpal CLI / shell |     2 |   36 K | $0.029 |  6.1 s |
| Kernel: what `vfs_read` calls          | Grep + Read        |     3 |   59 K | $0.053 |  8.2 s |
|                                        | Vorpal MCP         |     3 |   51 K | $0.046 |  5.7 s |
|                                        | Vorpal CLI / shell |     2 |   36 K | $0.026 |  5.8 s |

The grep arm had Grep/Glob/Read; the MCP arm used the client's deferred schemas; shell could invoke the command provided in the server instructions. This explains the measured **two shell turns versus three MCP turns**. Do not claim shell has lowest wall time in every row: MCP is faster on `run_install` and marginally on kernel callees. First-ask prompt-cache surcharges were measured separately: Grep **+$0.09–0.14**, MCP **+$0.10–0.13**, shell **+$0.17–0.22**. Preserve a short note rather than silently treating warm prices as first-use prices. The following README prose understates its own grep price range: the table's maximum is **$0.200**, not $0.14. [Method and cache costs](https://github.com/hyper-light/vorpal/blob/4dd203fa560bfd2c0c8f1857f7bbca983c23de63/README.md#L525-L545).

### 5. Add a compact cross-language indexing table

Suggested public selection: LLVM, Kubernetes, Rust, Next.js, Rails, and Vue. It broadens the story beyond three C-heavy corpora while fitting one readable table. Each row is cold / unchanged, with the README's “files parsed” definition retained; these are **not** files tracked or lines of code. [Full source table and pins](https://github.com/hyper-light/vorpal/blob/4dd203fa560bfd2c0c8f1857f7bbca983c23de63/README.md#L228-L247).

| Repository / pin      | Language | Parsed files |     Nodes |  Cold | Unchanged |
| --------------------- | -------- | -----------: | --------: | ----: | --------: |
| LLVM `d37814473`      | C++      |       86,124 | 1,444,028 | 7.3 s |    0.34 s |
| Kubernetes `bce953e8` | Go       |       26,641 |   692,828 | 1.9 s |    0.09 s |
| Rust `5db7f4be8`      | Rust     |       41,607 |   464,064 | 2.5 s |    0.09 s |
| Next.js `483f8420`    | TS/JS    |       27,216 |   204,754 | 0.9 s |    0.25 s |
| Rails `4130768`       | Ruby     |        3,952 |    49,635 | 0.3 s |    0.03 s |
| Vue `d63616c`         | Vue/TS   |          626 |    11,191 | 0.1 s |    0.01 s |

### 6. One short methods paragraph, plus local footnotes

- **Machine:** M5 Max, 18 cores, 128 GB RAM, macOS 26.4.1, rustc 1.98.0. Release builds. Vorpal cold values are best of three whole CLI invocations after the documented idle gate. [README 185–198](https://github.com/hyper-light/vorpal/blob/4dd203fa560bfd2c0c8f1857f7bbca983c23de63/README.md#L185-L198).
- **Version/date split:** principal kernel/CPython/self index rows, structural table, tgrep/cbm comparison: September 7, v0.9.0. Other cross-corpus rows and older tier measurements: September 5–6, v0.8.4 per the overview. Default quality column alone refreshed September 7. The agent subsection specifically stamps v0.8.3; use that more specific stamp instead of labelling every table v0.9.0.
- **Different clocks:** unchanged/body-edit CLI rows are not save-to-visible latency; the kernel **0.4 s** body re-index is distinct from **2.0 s** median save-to-daemon answer (seven saves, range 1.9–4.9 s). Warm query rows are medians of 30 stdio round trips. Structural rows are medians of three calls. [Freshness methods](https://github.com/hyper-light/vorpal/blob/4dd203fa560bfd2c0c8f1857f7bbca983c23de63/README.md#L262-L277), [structural methods](https://github.com/hyper-light/vorpal/blob/4dd203fa560bfd2c0c8f1857f7bbca983c23de63/README.md#L311-L321).
- **Do not silently merge different published samples:** the general query section gives kernel one-shot search **0.20 s**, while the cbm comparison gives **0.15 s**. Keep the latter in that comparison and cite its table. Likewise daemon **0.8 ms** general versus **0.7 ms** comparison is not a transcription mistake.

Article order suggestion: cross-corpus indexing → full cbm time/resource/unchanged comparison → tgrep outputs → complete retrieval metrics → four-question agent turns/tokens/cost/wall. This lets each table answer one question without a long methods digression.
