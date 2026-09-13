# Slates article: source notes

Research date: 2026-09-12. Source checkout: `../slates`, read-only. Inspected HEAD:
`bf1503674c312219f09f1cfaeaa56e82989ede2b` (`bf15036`, “docs: record cross-region write forwarding (#29) in the gap ledger”).
Origin: `git@github.com:hyper-light/slates.git`. Links below are commit-pinned GitHub source links,
constructed from that origin; network availability was not checked. No Slates build, test, server,
installation, or file mutation was performed for this research.

## Editorial direction

The requested post describes the completed product and its architecture, not an implementation
status report. Use the normative design for that perspective. Do not import the README's
development warnings into the article, and do not turn architectural mechanisms into claims that
a particular production workload or benchmark has already proved them. The measurement section
below is deliberately separate: those figures are dated observations, with the operation and
test environment kept attached.

The clearest conceptual sequence is:

1. A filesystem view is cheap to fork because the untouched base is shared and changed state is
   private. Forking work is not copying a repository.
2. Each agent records what it did, rather than leaving the system to infer intent from two final
   files. A shared green volume advances only through a deterministic merge verdict.
3. Accepting a merge is not permission to modify the human's disk. Landing is a separate,
   manifest-bound authorization and comparison boundary.
4. Ownership, immutable content and fenced records preserve those same meanings across a fleet.

Do not conflate **green** with a test pass, **merge** with disk landing, **snapshot** with complete
capture of a mutable host tree, **replication** with persistence after all RAM holders die, or
filesystem isolation with a process sandbox. These distinctions are part of the product's
specified semantics, not development caveats.

Sources: [roles and merge](https://github.com/hyper-light/slates/blob/bf1503674c312219f09f1cfaeaa56e82989ede2b/docs/wip/SLATES_DESIGN.md#L2619-L2665),
[base and landing](https://github.com/hyper-light/slates/blob/bf1503674c312219f09f1cfaeaa56e82989ede2b/docs/wip/SLATES_DESIGN.md#L2313-L2347),
[durability boundaries](https://github.com/hyper-light/slates/blob/bf1503674c312219f09f1cfaeaa56e82989ede2b/docs/wip/SLATES_DESIGN.md#L666-L678),
[process isolation boundary](https://github.com/hyper-light/slates/blob/bf1503674c312219f09f1cfaeaa56e82989ede2b/docs/wip/SLATES_DESIGN.md#L2189-L2202).

## Article-facing architectural claims and their sources

### A private view, not another checkout

Creating a live overlay opens and identifies the source directory without walking the whole
tree. Untouched paths resolve through validated base reads. Copied-up or pinned entries retain
the version witnessed when they diverged, and report outside drift. A live overlay therefore
does not imply a single atomic instant across unrelated source reads. A complete immutable
capture requires a source whose writers can actually be excluded, or a supported immutable
read facility; otherwise it refuses `ConsistentBaseUnavailable`. Pinning named files is not a
whole-tree capture.

Source: [`SLATES_DESIGN.md:2313–2333`](https://github.com/hyper-light/slates/blob/bf1503674c312219f09f1cfaeaa56e82989ede2b/docs/wip/SLATES_DESIGN.md#L2313-L2333).

Snapshots and clones use birth epochs and copy-on-write; writes keep mutable extents until seal,
and hashing/deduplication happen at seal rather than per write. Each volume has an owning shard;
cross-shard work moves over bounded queues. This is the mechanism behind cheap forks and the
absence of a shared mutable volume across cores—not a guarantee that scheduler or memory
contention can never affect another workload.

Sources: [D-5 through D-10](https://github.com/hyper-light/slates/blob/bf1503674c312219f09f1cfaeaa56e82989ede2b/docs/wip/SLATES_DESIGN.md#L596-L624),
[provisioning path](https://github.com/hyper-light/slates/blob/bf1503674c312219f09f1cfaeaa56e82989ede2b/docs/wip/SLATES_DESIGN.md#L406-L424).

### Operations are the merge input

A work volume carries its green base version, declared operations, and sealed post-state. The
operation document names paths, byte positions, lengths and source offsets; file bytes are not
embedded in its journal records. Composition reduces the history to its net effect: create then
unlink cancels; insert then delete may cancel; a truncate removes later operations; a rename
changes where subsequent operations apply. A whole-file rewrite remains a whole-file rewrite;
the engine does not reconstruct a more convenient intent by diffing final files.

Sources: [`SLATES_DESIGN.md:2628–2665`](https://github.com/hyper-light/slates/blob/bf1503674c312219f09f1cfaeaa56e82989ede2b/docs/wip/SLATES_DESIGN.md#L2628-L2665),
[operation composition and byte oracle](https://github.com/hyper-light/slates/blob/bf1503674c312219f09f1cfaeaa56e82989ede2b/crates/merge/tests/derive.rs),
[whole-volume composition](https://github.com/hyper-light/slates/blob/bf1503674c312219f09f1cfaeaa56e82989ede2b/crates/merge/src/increment.rs).

The merge task maps ranges through intervening accepted changes before deciding. A disjoint
range accepts. Equal bytes on the same changed range can be accepted as identical. A different
overlap returns explicit conflict windows, rather than conflict markers inserted into a file.
Accepted content is spliced by referencing base and post-state extents. “Identical” is not a
claim that two entire files must match when only one range overlaps.

Sources: [pure verdict](https://github.com/hyper-light/slates/blob/bf1503674c312219f09f1cfaeaa56e82989ede2b/crates/merge/src/verdict.rs),
[position mapping](https://github.com/hyper-light/slates/blob/bf1503674c312219f09f1cfaeaa56e82989ede2b/crates/merge/src/map.rs),
[extent splice](https://github.com/hyper-light/slates/blob/bf1503674c312219f09f1cfaeaa56e82989ede2b/crates/merge/src/splice.rs),
[range identity tests](https://github.com/hyper-light/slates/blob/bf1503674c312219f09f1cfaeaa56e82989ede2b/crates/merge/tests/engine.rs).

A useful animation example is one ASCII file with two explicitly numbered, non-overlapping
byte intervals. Agent A changes the earlier interval; Agent B changes the later interval from
the same base. Show the second interval shift when an earlier insertion changes its offset.
Then contrast a different edit to the same interval, returned as a conflict. Use byte counts,
not JavaScript character counts over arbitrary Unicode. The model should show the operation
and its old/new coordinates, not imply an inferred semantic merge.

### Landing is a separate authority

The landing plan walks diverged entries, applies explicit include/exclude filters and hashes the
canonical manifest. The preview exposes that exact entry list. A grant binds the snapshot,
target, intended consumer, scope, validity and manifest hash. Changing the filter or plan changes
the hash and therefore the approval. MCP and SDK workloads can request a landing plan but do
not possess grant-issuer authority.

Sources: [grant data model and landing state machine](https://github.com/hyper-light/slates/blob/bf1503674c312219f09f1cfaeaa56e82989ede2b/docs/wip/SLATES_DESIGN.md#L2349-L2400),
[protected issuer contract](https://github.com/hyper-light/slates/blob/bf1503674c312219f09f1cfaeaa56e82989ede2b/docs/wip/SLATES_DESIGN.md#L2208-L2216),
[landing engine](https://github.com/hyper-light/slates/blob/bf1503674c312219f09f1cfaeaa56e82989ede2b/crates/land/src/engine.rs),
[grant bindings](https://github.com/hyper-light/slates/blob/bf1503674c312219f09f1cfaeaa56e82989ede2b/crates/land/src/grant.rs).

The landing verdict compares three facts: witnessed base, disk now, and overlay now. If disk
still matches the witness, a changed overlay applies. If disk already contains the same new
bytes, the result is identical. If both diverged differently, the entry conflicts. A target
lease does not exclude unrelated filesystem writers; per-entry validation and compare/swap
protect against those outsiders. The design allows partial outcomes if a later per-file
comparison fails: do not animate an entire tree as one atomic filesystem transaction.

Sources: [verdict table and write ordering](https://github.com/hyper-light/slates/blob/bf1503674c312219f09f1cfaeaa56e82989ede2b/docs/wip/SLATES_DESIGN.md#L2401-L2448),
[crash/outsider oracle](https://github.com/hyper-light/slates/blob/bf1503674c312219f09f1cfaeaa56e82989ede2b/crates/land/tests/oracle.rs).

A compact illustration should keep merge acceptance in RAM distinct from the approval boundary
to disk. Three stationary comparison columns (“Witnessed”, “Disk now”, “Proposed”) can precede
the manifest, approval and per-file application; no approval should visibly bypass the
comparison after an outside edit.

### A fleet keeps the same ownership rule

An owning shard performs the work. Sealed content is archived in bounded slices; placement
offers its manifest, receives the missing set, transfers needed chunks, and waits for holders
to verify reference closure. Only after content is placed does the owner publish the head that
names it. At `f = 1`, two verified holders satisfy the placement quorum; a full candidate set
has three members. General rule: `f + 1` acknowledgements from `2f + 1` eligible candidates.
Distinguish eligible candidates from the actual recorded holders of a particular value.

Sources: [fleet owner and placement implementation](https://github.com/hyper-light/slates/blob/bf1503674c312219f09f1cfaeaa56e82989ede2b/crates/server/src/fleet.rs#L18-L72),
[content protocol](https://github.com/hyper-light/slates/blob/bf1503674c312219f09f1cfaeaa56e82989ede2b/crates/cluster/src/content.rs),
[content before head amendment](https://github.com/hyper-light/slates/blob/bf1503674c312219f09f1cfaeaa56e82989ede2b/docs/wip/SLATES_DESIGN.md#L4483-L4492).

Configuration agreement handles ownership and membership changes; it is not a consensus round
for every filesystem write. A successor gathers promises from authorized holders, adopts the
accepted value/prefix, and advances the epoch. A stale old owner is refused by the newer fence.
A timeout is suspicion, not independent authority to serve. Placement and authority must remain
distinct visual states.

Sources: [register and promotion](https://github.com/hyper-light/slates/blob/bf1503674c312219f09f1cfaeaa56e82989ede2b/crates/db/src/register.rs),
[ledger prefix adoption](https://github.com/hyper-light/slates/blob/bf1503674c312219f09f1cfaeaa56e82989ede2b/crates/db/src/ledger.rs),
[live council agreement](https://github.com/hyper-light/slates/blob/bf1503674c312219f09f1cfaeaa56e82989ede2b/crates/server/tests/fleet.rs#L710-L857),
[successor serves content](https://github.com/hyper-light/slates/blob/bf1503674c312219f09f1cfaeaa56e82989ede2b/crates/server/tests/fleet.rs#L2265-L2376).

Cross-region requests route to the owner and preserve the authenticated origin in their
completion identity. The concrete regression sends a snapshot operation from another region,
retries the same request id, and receives the same snapshot id rather than creating a second
snapshot. This is a strong explanatory example of retry identity; it is not a measured WAN
latency result or a file-byte-write benchmark.

Source: [cross-region read/write regressions](https://github.com/hyper-light/slates/blob/bf1503674c312219f09f1cfaeaa56e82989ede2b/crates/server/tests/fleet.rs#L1217-L1366).

## Concrete CLI and SDK examples

### CLI: overlay, inspect drift, plan a landing

After `slates anchor` is running, these are actual command forms. `ID` stands for the id returned
by the first command; the directories must be chosen by the reader. Do not fabricate captured
console output or turn placeholders into commands with hardcoded historical ids.

```sh
slates volume create work --bounded 4GiB --base /Users/you/project
slates base read ID /Cargo.toml
slates status ID --drift
slates land ID /Users/you/project
```

Sources: [CLI grammar](https://github.com/hyper-light/slates/blob/bf1503674c312219f09f1cfaeaa56e82989ede2b/docs/cli.md#L96-L153),
[base example](https://github.com/hyper-light/slates/blob/bf1503674c312219f09f1cfaeaa56e82989ede2b/README.md#L145-L153).

For a mount example, the command is `slates mount ID /existing/user-owned/directory`; provisioning
and mounting are different operations and should not share the microsecond benchmark caption.
The README's `mktemp` demonstration creates a host directory as user setup; avoid presenting
that as part of Slates' RAM-only provisioning path.

Source: [`docs/cli.md:151–153`](https://github.com/hyper-light/slates/blob/bf1503674c312219f09f1cfaeaa56e82989ede2b/docs/cli.md#L151-L153).

### Python: two independent agents, one green

This example uses the published source API shape. It assumes a connected `slates.AsyncClient`
named `client`, avoiding unrelated connection-policy constants in a merge explanation. Both
works are based on the same initial green. Their different paths demonstrate disjoint merging.

```python
green = await client.create_green("main")
alice = await client.create_work(green, "alice")
bob = await client.create_work(green, "bob")

await client.edit(alice["id"], "/parser.txt", 0, 0, b"parser change\n")
await client.edit(bob["id"], "/tests.txt", 0, 0, b"test change\n")

alice_result = await client.submit(alice["id"])
bob_result = await client.submit(bob["id"])
```

To demonstrate a conflict instead, give both agents different inserts at the same path and
offset, then inspect `result["conflicts"]`, whose windows expose `path`, `at` and `len`.
Label successful results “merged as version”, not “landed”: SDK README examples casually use
“landed” for a green version, which would blur the post's main distinction.

Sources: [async Python integration](https://github.com/hyper-light/slates/blob/bf1503674c312219f09f1cfaeaa56e82989ede2b/crates/sdk-python/tests/test_sdk_async.py#L142-L161),
[CLI conflict transcript](https://github.com/hyper-light/slates/blob/bf1503674c312219f09f1cfaeaa56e82989ede2b/README.md#L170-L215).

Node equivalents are `createGreen`, `createWork`, `edit`, and `submit`; the current source package
is named `slates`, not the README's conflicting `@hyper-light/slates`. Using Python avoids this
package-name discrepancy. Do not claim a package installation was checked.

Sources: [Node package](https://github.com/hyper-light/slates/blob/bf1503674c312219f09f1cfaeaa56e82989ede2b/crates/sdk-node/package.json#L2),
[async type definitions](https://github.com/hyper-light/slates/blob/bf1503674c312219f09f1cfaeaa56e82989ede2b/crates/sdk-node/index.d.ts#L99-L122),
[async Node integration](https://github.com/hyper-light/slates/blob/bf1503674c312219f09f1cfaeaa56e82989ede2b/crates/sdk-node/tests/sdk_async.test.mjs#L133-L157).

## Fleet and cross-region architecture — equal-depth treatment

This is a first-class half of the article, not a scaling epilogue. The single-host account
explains private work and deterministic reconciliation; the fleet account must explain who
may reconcile, where its inputs live, how a caller finds that authority, and which failures an
acknowledgement covers. The completed-contract framing applies throughout this section.

### Mechanism map: three distinct kinds of agreement

| Layer                          | What it decides                                                               | Who participates                                                                          | When it runs                                                                                     |
| ------------------------------ | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Owning shard                   | Local volume mutations, operation journal, local completion records           | One owner; other cores reach it by bounded messages                                       | Every local operation                                                                            |
| Object register / green ledger | The object's head or next accepted green version under the authorized epoch   | The object's eligible candidate holders, `2f + 1`, with `f + 1` distinct acknowledgements | Placed heads and accepted green versions; live-shipped writes use their selected durability path |
| Regional council               | Host membership, bounded neighborhoods, fencing epochs and takeover authority | A small Raft voter set; other regional nodes learn its committed configuration            | Membership, takeover and placement-configuration changes                                         |
| Root group                     | Region membership, moved volume homes and region-loss promotions              | A small cross-region Raft voter set                                                       | Region changes and explicit cross-region authority changes                                       |

The first two rows are not “no protocol”: they enforce ownership, epoch and generation checks,
and placed registers require quorum acknowledgements. The claim is specifically **no separate
configuration-consensus round on every write**. A green's merge task is its distinguished
proposer, not a new independently elected Raft group for each green. Its ledger commits the
deterministic verdict and resulting manifest under the already-established authority.

Sources: [three mechanisms](https://github.com/hyper-light/slates/blob/bf1503674c312219f09f1cfaeaa56e82989ede2b/docs/wip/SLATES_DESIGN.md#L1673-L1697),
[regional council](https://github.com/hyper-light/slates/blob/bf1503674c312219f09f1cfaeaa56e82989ede2b/crates/cluster/src/config_group.rs#L1-L24),
[root group](https://github.com/hyper-light/slates/blob/bf1503674c312219f09f1cfaeaa56e82989ede2b/crates/cluster/src/root_group.rs#L1-L20),
[fleet greens](https://github.com/hyper-light/slates/blob/bf1503674c312219f09f1cfaeaa56e82989ede2b/docs/wip/SLATES_DESIGN.md#L1974-L1986).

### Routing is an ownership calculation, not a global catalog

1. A volume id contains its creator host. The locally held configuration adds takeover,
   moved-owner and moved-home exceptions; it does not list every ordinary object globally.
2. On the correct host, the id names the owning partition; the runtime maps that partition to
   its current process-local shard. A shard id itself is not a durable routing identity.
3. A remote caller routes or forwards the operation to the current owner, preserving its
   authenticated principal and retry identity. That owner performs the rights check and effect.
4. A stale route returns current owner/epoch/configuration information. Refresh and retry spend
   the operation's existing bounded budget; they do not create a new unbounded loop.
5. A regional node tracks the objects it actually holds, not the entire fleet catalog. A
   takeover winner is selected from an object's surviving copyset, not an arbitrary host in the
   wider neighborhood that may never have held its bytes.

Sources: [routing and authority scopes](https://github.com/hyper-light/slates/blob/bf1503674c312219f09f1cfaeaa56e82989ede2b/docs/wip/SLATES_DESIGN.md#L1730-L1745),
[held-object routing](https://github.com/hyper-light/slates/blob/bf1503674c312219f09f1cfaeaa56e82989ede2b/crates/cluster/src/routing.rs#L1-L24),
[authenticated forward](https://github.com/hyper-light/slates/blob/bf1503674c312219f09f1cfaeaa56e82989ede2b/crates/server/src/verbs.rs#L351-L462),
[partition versus shard identity](https://github.com/hyper-light/slates/blob/bf1503674c312219f09f1cfaeaa56e82989ede2b/crates/server/src/state.rs#L77-L83).

Useful prose: “The id gives the starting address. The committed configuration records the
exceptions. The owner gives the answer.” An animation can let the same id travel from a remote
client to its original owner, then follow a takeover exception to the successor without changing
the object's identity. Keep the ownership exception distinct from its immutable content hash.

### Failure detection is evidence, not permission

SWIM progresses from a direct probe to indirect probes, suspicion and a dead observation.
Lifeguard accounts for the observer's own health: a locally delayed node should not rapidly
condemn healthy peers. Independent confirmations shorten a suspicion window; the originator
does not count as its own independent confirmation. Vivaldi coordinates are learned from measured
round-trip samples and help select indirect relays near the target. Their role is better
failure-detection placement and timing, not source-of-truth authority or globally identical
floating-point coordinates.

The regional council turns those observations into committed membership and takeover decisions.
Owners and holders install that committed configuration; learners fetch a newer version rather
than casting votes merely because they serve volumes. The root group makes the corresponding
cross-region decisions. Its voters are hosts carrying the root group; the entries it governs
are regions and moved homes. Losing contact with a region is not by itself permission to promote
a second writable home.

Sources: [SWIM, Lifeguard and Vivaldi](https://github.com/hyper-light/slates/blob/bf1503674c312219f09f1cfaeaa56e82989ede2b/docs/wip/SLATES_DESIGN.md#L1747-L1756),
[detector](https://github.com/hyper-light/slates/blob/bf1503674c312219f09f1cfaeaa56e82989ede2b/crates/cluster/src/detector.rs),
[coordinates](https://github.com/hyper-light/slates/blob/bf1503674c312219f09f1cfaeaa56e82989ede2b/crates/cluster/src/coordinates.rs),
[learners fetch committed configurations](https://github.com/hyper-light/slates/blob/bf1503674c312219f09f1cfaeaa56e82989ede2b/crates/server/src/fleet.rs#L1695-L1725),
[operator region promotion](https://github.com/hyper-light/slates/blob/bf1503674c312219f09f1cfaeaa56e82989ede2b/crates/server/tests/fleet.rs#L1033-L1132).

Progress-based extension handles a different question: is this operation still advancing?
Acknowledged chunks, received promises or other monotonic progress can earn a bounded extension
near a deadline. A flatlined operation, or one that exhausted its extension budget, times out.
That extension changes how long the caller waits, not who may write or which quorum is valid.
A dead voter must not hold a consensus broadcast open until its maximum deadline every round:
collect concurrent replies, stop when progress stalls, and let the reachable quorum advance.

Sources: [progress witness and bounded extender](https://github.com/hyper-light/slates/blob/bf1503674c312219f09f1cfaeaa56e82989ede2b/crates/cluster/src/progress.rs#L1-L23),
[progress-aware broadcast](https://github.com/hyper-light/slates/blob/bf1503674c312219f09f1cfaeaa56e82989ede2b/crates/server/src/fleet.rs#L1728-L1793).

### Placement, adoption and fencing are different thresholds

- **Record fan-out:** send a head or green-ledger record to all `2f + 1` candidates; commit after
  `f + 1` distinct, eligible, correctly bound acknowledgements. A late reply is not a second vote.
- **Content placement:** offer to `f + 1` first, transfer the missing set, and hedge toward other
  candidates if needed. Acknowledgement requires reserved capacity and a verified complete
  reference graph. Only then may the head name that content as placed.
- **Takeover adoption:** obtain `f + 1` distinct, authorized promises for the new epoch and
  generation, adopt the highest accepted value at each position consistent with the committed
  prefix, and recommit under the new epoch before serving. An identical value still records its
  newer acceptance epoch; comparing bytes alone does not preserve ballot history.
- **Fence propagation:** the committed host-epoch advance applies to **every affected object at
  every holder**, including holders not used in the first completed promotion quorum. It is not
  only a mark on the new owner, the newest head, or whichever two nodes lit up first. Each holder
  installing the committed configuration raises its departed-owner fences before changing the
  recorded owner. Every later request checks both configuration authority and that epoch fence.
- **Availability is not unanimity:** “fence every holder” is the scope of the state rule and
  configuration propagation, not a requirement to contact a powered-off old owner before recovery
  can proceed. Phase-one/quorum intersection prevents an old legal commit quorum; a stale or
  recovering node cannot resume legal service without the relevant confirmed authority.

Sources: [quorum and acceptance invariants](https://github.com/hyper-light/slates/blob/bf1503674c312219f09f1cfaeaa56e82989ede2b/docs/wip/SLATES_DESIGN.md#L1635-L1656),
[fan-out and promotion](https://github.com/hyper-light/slates/blob/bf1503674c312219f09f1cfaeaa56e82989ede2b/docs/wip/SLATES_DESIGN.md#L1673-L1710),
[all affected holds fenced at configuration install](https://github.com/hyper-light/slates/blob/bf1503674c312219f09f1cfaeaa56e82989ede2b/crates/server/src/fleet.rs#L2363-L2375),
[holder fence method](https://github.com/hyper-light/slates/blob/bf1503674c312219f09f1cfaeaa56e82989ede2b/crates/db/src/register.rs#L1029-L1037).

A latest-head read also needs confirmed lease authority; possession of an epoch number does not
make a stale owner's local memory a linearizable answer. Immutable snapshot reads instead need
the named verified content and read rights. During a neighborhood change, writes satisfy both
old and new quorums until the new set holds the committed state and the old set may be retired.

Sources: [joint writes, read leases and authority scopes](https://github.com/hyper-light/slates/blob/bf1503674c312219f09f1cfaeaa56e82989ede2b/docs/wip/SLATES_DESIGN.md#L1714-L1735),
[reconfiguration core](https://github.com/hyper-light/slates/blob/bf1503674c312219f09f1cfaeaa56e82989ede2b/crates/db/src/reconfig.rs#L1-L22).

### Local, regional and mirrored durability

| Scope                             | What must be covered                                                                                  | What it does not imply                                                              |
| --------------------------------- | ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Server-visible state              | Writes already flushed from the client's cache into the volume                                        | Unflushed editor/kernel buffers                                                     |
| Local acknowledgement             | Recoverable bytes, roots, witnesses, accounting and completion record in anchor-owned RAM             | Survival of losing that host and all its RAM                                        |
| Region-placed seal                | The named snapshot's complete reference graph and record verified and retained by its regional quorum | Later unsealed owner-local edits or content still dependent on a live external base |
| Mirror-placed seal                | That named prefix and its content verified and acknowledged by a quorum in the mirror region          | All future writes automatically awaiting the mirror                                 |
| Granted landing / explicit export | Materialization into the authorized caller-owned persistence boundary                                 | Permission for subsequent unrelated writes                                          |

Mirroring ships committed records and content in epoch/sequence order. `mirror_age` is elapsed
time, measured on the home clock from the oldest home commit still lacking mirror acknowledgement;
unknown observations are unknown, not zero lag. Awaiting the mirror includes backlog, transfer
and quorum acknowledgement, not a promise of one WAN round trip. Promotion after region loss
passes through the root group at operator cadence. An operation that awaited the mirror is
within its acknowledged prefix; other changes have the reported lag window.

Sources: [D-18](https://github.com/hyper-light/slates/blob/bf1503674c312219f09f1cfaeaa56e82989ede2b/docs/wip/SLATES_DESIGN.md#L666-L678),
[mirroring semantics](https://github.com/hyper-light/slates/blob/bf1503674c312219f09f1cfaeaa56e82989ede2b/docs/wip/SLATES_DESIGN.md#L1794-L1809),
[auto-seal and barrier](https://github.com/hyper-light/slates/blob/bf1503674c312219f09f1cfaeaa56e82989ede2b/docs/wip/SLATES_DESIGN.md#L1940-L1944),
[live-base coverage](https://github.com/hyper-light/slates/blob/bf1503674c312219f09f1cfaeaa56e82989ede2b/docs/wip/SLATES_DESIGN.md#L1988-L2006).

### Shipping and ownership migration

Remote read attachment obtains the manifest, then faults needed chunks from recorded holders;
hash verification and the attaching host's own budget govern admission. A remote clone acquires a
local writable delta, not an eager copy of all base bytes. Observed early-read sets can prefetch
within that same budget. Merkle anti-entropy repairs differing subtrees, and the healer replays
puts that never reached quorum; neither can change content identity to make a missing byte pass.

Ordinary live edits remain owner-local between seals. The opt-in live-shipped policy places
the operation log at `f + 1` and acknowledges accordingly; lag applies backpressure to that
volume's writers. Persistent write intent from a different host can justify moving ownership:
seal, ship the delta by identity, commit the object's new owner/generation, run phase one, then
serve there. A single-volume move does not bump the failed-host epoch for unrelated volumes.
Load alone does not move ownership, and moving the writable delta does not magically relocate a
live external base directory.

Sources: [replication, remote attach and prefetch](https://github.com/hyper-light/slates/blob/bf1503674c312219f09f1cfaeaa56e82989ede2b/docs/wip/SLATES_DESIGN.md#L1929-L1957),
[live shipping and writer-following ownership](https://github.com/hyper-light/slates/blob/bf1503674c312219f09f1cfaeaa56e82989ede2b/docs/wip/SLATES_DESIGN.md#L1959-L1972),
[host versus object authority generation](https://github.com/hyper-light/slates/blob/bf1503674c312219f09f1cfaeaa56e82989ede2b/docs/wip/SLATES_DESIGN.md#L1730-L1735).

### Transport, enrollment and retry identity

The normative transport separates superseding control datagrams from reliable session traffic;
MCP is the agent-facing edge, not the daemon mesh. Reliable streams carry ordered records and
content over the owned QUIC-shaped UDP dialect. TLS 1.3 through `rustls::quic` authenticates
pinned enrolled peer certificates and supplies session protection. This is not a claim of
interoperability with arbitrary public QUIC implementations.

Connection ids route packets from many sessions on a shared socket. The current mechanism derives
an eight-byte id from the TLS exporter, routes established packets by that id, and replaces an
old session when the same authenticated peer redials. Keep connection-id multiplexing distinct
from logical ordered streams: one identifies the connection, the other separates subjects inside
it. Stream and connection credits are absolute offsets, advancing only as the application consumes
data; retransmitted old credit is idempotent. A large object flows through a bounded window rather
than receiving credit for its whole length. Packet loss, transport retransmission and operation
retry are separate layers.

Sources: [transport planes and crypto](https://github.com/hyper-light/slates/blob/bf1503674c312219f09f1cfaeaa56e82989ede2b/docs/wip/fleet-transport.md#L37-L75),
[session multiplexing and credit contract](https://github.com/hyper-light/slates/blob/bf1503674c312219f09f1cfaeaa56e82989ede2b/docs/wip/fleet-transport.md#L303-L339),
[connection demultiplexer](https://github.com/hyper-light/slates/blob/bf1503674c312219f09f1cfaeaa56e82989ede2b/crates/transport/src/demux.rs#L1-L35),
[credit accounting](https://github.com/hyper-light/slates/blob/bf1503674c312219f09f1cfaeaa56e82989ede2b/crates/transport/src/flow.rs#L1-L14).

Enrollment is admission by the configuration authority under a trusted human/harness boundary.
It supplies the peer identity and the admitted membership/key context. A node id or content hash
is not a bearer authorization. The control-key derivation uses sender, key epoch and direction;
unknown senders are rejected before cryptographic work. Do not present the enrollment draft's
unsettled fleet-wide versus per-region shared-secret policy as a measured or finalized advantage;
the article can explain the invariant without choosing that open policy.

Sources: [enrollment model](https://github.com/hyper-light/slates/blob/bf1503674c312219f09f1cfaeaa56e82989ede2b/docs/wip/enrollment.md#L11-L50),
[acceptance order](https://github.com/hyper-light/slates/blob/bf1503674c312219f09f1cfaeaa56e82989ede2b/docs/wip/fleet-transport.md#L252-L274).

An application retry carries the same `(authenticated origin host, client, sequence)` identity.
The owner records the effect and completion together, so reconnecting or forwarding cannot turn
one accepted request into two operations. The origin is resolved from the authenticated peer,
not trusted from an arbitrary payload field. Acknowledgement watermarks retire completed entries,
bounding that memory. This is particularly important when identical client/sequence numbers can
exist on different hosts.

Source: [forwarded identity, execution and reclamation](https://github.com/hyper-light/slates/blob/bf1503674c312219f09f1cfaeaa56e82989ede2b/crates/server/src/verbs.rs#L351-L477),
[effect plus completion](https://github.com/hyper-light/slates/blob/bf1503674c312219f09f1cfaeaa56e82989ede2b/crates/server/src/verbs.rs#L721-L743),
[same-request snapshot regression](https://github.com/hyper-light/slates/blob/bf1503674c312219f09f1cfaeaa56e82989ede2b/crates/server/tests/fleet.rs#L1283-L1366).

### Worked sequence: one green, three regions, `f = 1`

These names, epochs and versions are illustrative, not benchmark observations. **Three regions
are not the three members of a regional object quorum.** Use distinct enclosing region boxes:

- **Home region H:** green G's owner A and candidates B/C; `2f + 1 = 3`, commit threshold 2.
- **Mirror region M:** corresponding candidates M1/M2/M3; its independent commit threshold is 2.
- **Remote region R:** the submitting agent and its work owner, plus R's participation in the
  cross-region control topology. Its work snapshot is placed under its own regional policy.

1. R's agent edits a work volume based on `G:v7`. Its local owner seals and places the work
   post-state and operation document before submission names them.
2. The increment identifies G and v7. Routing sends it to A in H; it does not run an independent
   merge against whichever replica happens to be nearest R.
3. A maps the declared operations over any intervening accepted versions, computes the pure
   verdict, and constructs v8's manifest. A conflict returns windows and produces no v8 commit.
4. On acceptance, referenced content reaches verified placement first. A sends the v8 ledger
   record under epoch 4 to all A/B/C. A and B acknowledge; v8 is region-committed. C may lag.
   The response names the accepted version and scope; the diagram must not light up M yet.
5. The ordered mirror stream sends v8 and its content to M. M1 and M2 verify/retain and
   acknowledge. An `await placed(mirror)` for this version now completes; a region-only waiter
   did not have to wait for this step.
6. A fails after v8 is committed. SWIM supplies evidence; H's council commits A's takeover and
   epoch 5. Every surviving holder installs the epoch-5 fence for A's affected objects. The
   example assumes the placement policy picks B from the surviving eligible candidates.
7. B obtains promises from B and C (`f + 1 = 2`). Their quorum intersects the old commit set
   `{A, B}`, so B's accepted v8 is present even if C never accepted it. B adopts the committed
   prefix, recommits with acceptance epoch 5, ensures referenced bytes are available, and serves
   only under confirmed authority. This is not “choose the longest log” without value checks.
8. The original A resumes and sends epoch 4. Holders with epoch 5 reject it; A cannot form a
   legal commit quorum and must abandon the role. The old process is not a second writer.
   A caller whose acknowledgement was lost retries the same increment/request identity and
   receives the recorded result rather than duplicating v8.
9. If H as a whole is lost, that is a different failure: the root group, not H's local detector
   alone, authorizes promotion to M at operator cadence. M can serve only its verified mirrored
   prefix; v8 is inside that prefix because step 5 completed. Merely having a region-mapping
   change is not evidence that v9's bytes exist there.

Source anchors for the sequence: [green placement and retry](https://github.com/hyper-light/slates/blob/bf1503674c312219f09f1cfaeaa56e82989ede2b/docs/wip/SLATES_DESIGN.md#L1974-L1986),
[adoption invariants](https://github.com/hyper-light/slates/blob/bf1503674c312219f09f1cfaeaa56e82989ede2b/docs/wip/SLATES_DESIGN.md#L1635-L1656),
[takeover](https://github.com/hyper-light/slates/blob/bf1503674c312219f09f1cfaeaa56e82989ede2b/docs/wip/SLATES_DESIGN.md#L1699-L1710),
[mirror scope and promotion](https://github.com/hyper-light/slates/blob/bf1503674c312219f09f1cfaeaa56e82989ede2b/docs/wip/SLATES_DESIGN.md#L1794-L1802).

For mobile, preserve these region boundaries as vertically stacked bands and move events between
them; do not collapse H's candidates into H/M/R or place labels on moving arrows. A fixed status
row can separately report `owner`, `epoch`, `version`, `home 2/3`, and `mirror 0/3 → 2/3`.
Takeover deserves its own clear state sequence if fitting it into the placement sequence makes
all-candidate fences or regional authority unreadable.

## Historical measurements suitable for the post

Environment for these records: Apple M5 Max, 18 cores (6 Super, 12 Performance), 128 GiB,
macOS 26.4.1 (25E253), Rust 1.98.0, release builds. The host declines thread affinity on Apple
silicon. Measurements are dated 2026-09-05, not a new measurement of the article-date HEAD.

| Observation                                                | Exact scope                                                                                                                                                                                               | Recorded command / source                                                                                                                                                                           |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Approximately 9 µs p50, 25 µs p99, 31 µs p999              | One spinning Rust client; real rendezvous and rings against an **in-process** daemon. Provisioning only.                                                                                                  | `cargo run --release -q -p slates-client --example provision_bench`; [record](https://github.com/hyper-light/slates/blob/bf1503674c312219f09f1cfaeaa56e82989ede2b/docs/wip/BENCHMARKS.md#L381-L409) |
| 34–45 µs p99                                               | Eight spinning clients; historical recorded range. 64 clients oversubscribe the 13 runnable cores past five shards and give about 2 ms p99; parked form about 250 µs p99.                                 | [load conditions](https://github.com/hyper-light/slates/blob/bf1503674c312219f09f1cfaeaa56e82989ede2b/docs/wip/BENCHMARKS.md#L390-L398)                                                             |
| 45 ns at 1,000 files; 44 ns at 100,000; 45 ns at 1,000,000 | **Snapshot and destroy the snapshot**, volume-core microbenchmark, not RPC/mount/tree capture. 500 ms budget per row, batched operations, 95% bootstrap intervals.                                        | `cargo run --release -p slates-vfs --example vfs_bench`; [dataset and rows](https://github.com/hyper-light/slates/blob/bf1503674c312219f09f1cfaeaa56e82989ede2b/docs/wip/BENCHMARKS.md#L148-L175)   |
| 265 / 260 / 244 ns at the same tree sizes                  | Clone and destroy the **untouched** clone; origin-epoch pruning.                                                                                                                                          | Same [volume-core record](https://github.com/hyper-light/slates/blob/bf1503674c312219f09f1cfaeaa56e82989ede2b/docs/wip/BENCHMARKS.md#L169-L170)                                                     |
| 96 ms median; runs 76, 86, 96, 97, 104 ms                  | Metadata database recovery: 10,000 volumes, 1,000,000 accounting records, 69.5 MB log, 128 MiB shared object, snapshots **off**. Not complete recovery of a million-file filesystem or all file contents. | `cargo run --release -p slates-db --example db_bench`; [record](https://github.com/hyper-light/slates/blob/bf1503674c312219f09f1cfaeaa56e82989ede2b/docs/wip/BENCHMARKS.md#L269-L287)               |

The single-spinning-client p99 has the 50 µs gate. The benchmark was removed from the mixed
microbenchmark ratchet because contention changed an isolated 25 µs p99 to 1.5 ms. It must run
as its own quiescent-machine lane. “Under 50 µs” is not an all-load, all-platform, mount-ready,
base-captured or full-agent-startup promise derived from this record.

Source: [`BENCHMARKS.md:400–416`](https://github.com/hyper-light/slates/blob/bf1503674c312219f09f1cfaeaa56e82989ede2b/docs/wip/BENCHMARKS.md#L400-L416).

For a visually compact article, the best comparison is the snapshot-cost row across tree sizes,
because it supports the structural point without a misleading comparison to Git worktrees or
containers. No such competitor measurement was found here. No WAN or fleet throughput/latency
benchmark was established by this research.

## Editorial verification notes — not article prose

These prevent accidental claims about what was executed or proved. They are not a requested
status section in the completed-product article.

- `README.md:79–85` and `499–504` say real fleet wiring is pending. Current source contradicts
  that: multi-node placement, council/root consensus, takeover and cross-region forwarding have
  concrete daemon-level tests. The current [fleet suite](https://github.com/hyper-light/slates/blob/bf1503674c312219f09f1cfaeaa56e82989ede2b/crates/server/tests/fleet.rs)
  is the source for demonstrated mechanisms; its labeled regions run on loopback, not separate
  geographical regions.
- The Sep 5 blanket “all rows open” ledger and some code comments are also stale. Recovery now
  captures content/snapshots into anchor-owned images. The specific remaining durability
  boundary is documented by the [recovery milestone](https://github.com/hyper-light/slates/blob/bf1503674c312219f09f1cfaeaa56e82989ede2b/docs/wip/recovery.md):
  mounted write publication and the process bytes-after-crash proof are separate from the
  control-path checkpoint tests. [`verbs.rs:1342–1376`](https://github.com/hyper-light/slates/blob/bf1503674c312219f09f1cfaeaa56e82989ede2b/crates/server/src/verbs.rs#L1342-L1376)
  publishes on control mutations; [`publish_shard`](https://github.com/hyper-light/slates/blob/bf1503674c312219f09f1cfaeaa56e82989ede2b/crates/server/src/verbs.rs#L3965-L4004)
  skips unsupported base-backed images and reports publication failures. Do not claim the old
  metadata replay benchmark proves acknowledged mounted bytes survive every crash.
- [A-15](https://github.com/hyper-light/slates/blob/bf1503674c312219f09f1cfaeaa56e82989ede2b/docs/wip/SLATES_DESIGN.md#L4529-L4537)
  explicitly distinguishes a live node refuting false suspicion from a RAM-empty restarted
  node. The latter needs a new ephemeral membership identity, while current
  [`deploy.rs:181–190`](https://github.com/hyper-light/slates/blob/bf1503674c312219f09f1cfaeaa56e82989ede2b/crates/server/src/deploy.rs#L181-L190)
  still derives the host id from its stable certificate. Describe fenced takeover from the
  normative protocol; do not claim the false-suspicion test establishes fresh-boot rejoin safety.
- The CLI still has no grant-issuance verb, although the core has grant records and a control
  handler. `--grant N` consumes an existing grant; it does not issue one. The post can explain
  manifest-bound human authority from the design without presenting an invented, verified
  `slates grant` console session. Sources: [`main.rs:16–17`](https://github.com/hyper-light/slates/blob/bf1503674c312219f09f1cfaeaa56e82989ede2b/crates/cli/src/main.rs#L16-L17),
  [`docs/cli.md:158–161`](https://github.com/hyper-light/slates/blob/bf1503674c312219f09f1cfaeaa56e82989ede2b/docs/cli.md#L158-L161).
- Region promotion is a control-plane remapping operation; it does not alone prove mirrored
  content exists. The mirror status path still has no measured time lag. Sources:
  [`await_placed`](https://github.com/hyper-light/slates/blob/bf1503674c312219f09f1cfaeaa56e82989ede2b/crates/server/src/verbs.rs#L3082-L3138),
  [D-18's explicit mirror requirement](https://github.com/hyper-light/slates/blob/bf1503674c312219f09f1cfaeaa56e82989ede2b/docs/wip/SLATES_DESIGN.md#L666-L678).
- Current fleet source explicitly names content-defined chunking, compression cost-model
  integration, measured p95 hedging, anti-entropy and healing as separate remaining work
  ([`fleet.rs:65–67`](https://github.com/hyper-light/slates/blob/bf1503674c312219f09f1cfaeaa56e82989ede2b/crates/server/src/fleet.rs#L65-L67)).
  They may be explained as parts of the completed architecture, but should not be assigned
  invented measured speedups, scale results or failure-test outcomes.

## EdenFS lineage (article follow-up)

The article explicitly credits EdenFS's lazy base and private materialization model.
This is design lineage, not a claim that Slates is a fork or shares EdenFS's runtime.

- [EdenFS overview](https://github.com/facebook/sapling/blob/main/eden/fs/docs/Overview.md)
  explains fetching only the working set and supporting filesystem callers and change watchers.
- [Data model](https://github.com/facebook/sapling/blob/main/eden/fs/docs/Data_Model.md)
  separates immutable trees/blobs from the checkout's mutable inodes.
- [Inodes](https://github.com/facebook/sapling/blob/main/eden/fs/docs/Inodes.md)
  distinguishes loading from materialization and explains parent materialization after a
  child diverges. Fetching bytes does not alone mean the file was privately edited.
- [Inode storage](https://github.com/facebook/sapling/blob/main/eden/fs/docs/InodeStorage.md)
  documents on-disk overlay storage; Slates makes a different RAM/recovery choice.
- Slates explicitly adopts this materialization contract in
  [D-25](https://github.com/hyper-light/slates/blob/bf1503674c312219f09f1cfaeaa56e82989ede2b/docs/wip/SLATES_DESIGN.md#L707-L712).
- [EdenFS's journal](https://github.com/facebook/sapling/blob/main/eden/fs/journal/Journal.h)
  records changed-path metadata. Do not equate it with Slates's declared byte-operation
  inputs for deterministic merging. The article makes the different purposes explicit.

Upstream sources were checked on September 12, 2026. These are architecture references,
not comparative performance measurements. The worked example uses an image-processing
service (WebP support and cache changes); the small ASCII examples remain separate,
explicit illustrations of byte-coordinate mapping.
