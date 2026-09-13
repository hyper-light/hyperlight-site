# Blog source-link audit

Checked 2026-09-12. Scope: all four posts in `content/posts` (`.md` and `.mdx`), their Slates/proof-of-work/Vorpal illustration sources, and post-to-project/post-to-post links. This is a reference-target audit, not a claim that every documented design feature is implemented or that a source's benchmarks generalize beyond its recorded environment.

## Result

- 83 distinct public URLs after removing fragments: 82 returned HTTP 200 directly. The Vorpal macOS release download returned HTTP 302; following its anonymous HEAD redirects reached HTTP 200. No unresolved HTTP targets remain.
- 73 GitHub source documents, with 20 distinct heading fragments and 64 distinct line fragments. All heading fragments resolve; all referenced line ranges are in bounds. Heading verification used the exact pinned Markdown and GitHub's slug rules. The Sapling `main` heading was checked on its rendered public page.
- The announcement's project links and both articles' internal blog links resolve to declared projects or existing posts. There are no internal fragment links in the current post bodies.
- The audit uses only explicitly scoped public URLs, without authentication, credentials, query-string endpoints, uploads or repository mutations. It does not crawl destinations discovered on remote pages.

The subsequent failure-detection copy review added two public source documents: `crates/cluster/src/detector.rs` and `crates/cluster/src/swim.rs` at the same Slates revision. Both returned HTTP 200 and their downloaded SHA-256 hashes matched the pinned repository contents. The detector source supports direct probes, indirect probes and suspicion; `swim.rs#L434-L460` separately supports keeping the session after a probe timeout and checking the next reply's nonce. Their reviewed metadata is included in the fixture. These are additional checks beyond the initial counts above.

## Corrections

### Slates: unpublished revision

The former revision `bf1503674c312219f09f1cfaeaa56e82989ede2b` exists locally but its public GitHub source links return 404. Every Slates article definition and illustration source now uses the verified public revision `3aa6b85c155ba4269614b5e5d3c053e28dd3c787`. The public [architecture document](https://github.com/hyper-light/slates/blob/3aa6b85c155ba4269614b5e5d3c053e28dd3c787/docs/wip/SLATES_DESIGN.md) returns 200.

The change was not a blind revision substitution. The complete local revision diff was checked. All cited source files are byte-identical between the two revisions except `crates/server/src/fleet.rs` and `crates/server/tests/fleet.rs`. Their citations were inspected and corrected individually:

| Citation                  | Correct public target                      | Reason                                                                                                                                                                                    |
| ------------------------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Holder fence installation | `crates/server/src/fleet.rs#L2345-L2357`   | This is the loop that raises each held object's owner fence before reconciling authority. The old numbers reach unrelated cross-shard configuration commentary in the public revision.    |
| Cross-region routing test | `crates/server/tests/fleet.rs#L1217-L1280` | The public test proves forwarding a read to a volume's owner. The later cross-region write/snapshot retry test is not in this revision.                                                   |
| Transport retry example   | `crates/client/tests/client.rs#L223-L255`  | This public test verifies that retrying a create after restart returns the original volume ID. The caption now describes this actual test, not an unavailable cross-region snapshot test. |

The article's forwarding-test label is correspondingly limited to read forwarding. Its request completion discussion references the completion mechanism and client restart tests separately. Sources for designed forwarding identity are not presented as the missing end-to-end write test.

### Focal: correct section, same public revision

The range-movement definition previously opened line 132, the start of the storage-layout section. It now opens [the movement state machine](https://github.com/hyper-light/focal/blob/626b1b59fa286ba4093e96f481afe38b8b061ede/docs/archictecutre/25-parallel-materialization-and-ranges.md#6-movement-r73-third-step-2026-09-09-the-state-machine-in-the-log), where the source describes transfer, barrier, readiness and activation. The immutable revision is unchanged.

All other checked Focal fragments resolve at `626b1b59fa286ba4093e96f481afe38b8b061ede`. The repository really uses the directory spelling `docs/archictecutre`; changing that spelling would break the URLs.

### Vorpal and EdenFS

Vorpal's `Performance`, `How fast is structural search?`, `Is search any good?`, and `How does it compare?` heading fragments resolve at `4dd203fa560bfd2c0c8f1857f7bbca983c23de63`. The reciprocal-rank-fusion line ranges point to the actual implementation. No replacement was necessary.

EdenFS's [Inode Materialization](https://github.com/facebook/sapling/blob/main/eden/fs/docs/Inodes.md#inode-materialization) heading exists and covers the immutable-object-to-overlay transition. These five existing Sapling links retain `main`, so their HTTP/heading checks are observations as of this audit, not immutable guarantees.

## Offline regression coverage

`tests/fixtures/blog-source-targets.json` records audited document identities, immutable-content SHA-256 digests, line counts, and the exact reviewed fragments. It contains metadata, not copied source documents. `tests/blog-source-targets.test.ts` checks every current article/caption source against that record, rejects the unpublished Slates revision, verifies line bounds and heading slugs, and checks internal project/blog routes. Routine tests make no network requests and do not require sibling repositories.

When changing a citation, verify the exact anonymous public URL, inspect the intended section at the named revision, and then update the fixture from that reviewed content. An HTTP 200 alone does not verify a fragment or establish that a test proves the claim beside the link. A fixture match is a regression guard for this audit, not a replacement for a later public availability check.
