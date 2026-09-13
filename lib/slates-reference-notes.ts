import type { ReferenceNote } from "./reference-notes";

/** Source-specific notes; keys preserve the article's authored reference IDs. */
export const slatesReferenceNotes: Record<string, ReferenceNote> = {
  "introducing-slates:architecture": {
    title: "Private work and accepted versions",
    explanation:
      "A work volume is an agent's writable branch of a filesystem view. A green volume retains accepted versions and advances through its owner's merge task, keeping private edits separate from shared results.",
    example: "green version → private work → submit → next green version",
  },
  "introducing-slates:eden-overview": {
    title: "Fetching the working set of a large repository",
    explanation:
      "EdenFS exposes a source-control repository as a filesystem and fetches information as tools use it. A developer can work on a small part of a large tree without first downloading every file; change notifications also help build tools and editors avoid rescanning it.",
  },
  "introducing-slates:eden-journal": {
    title: "Remembering which paths changed",
    explanation:
      "EdenFS's journal records file changes and source-control root transitions so subscribers can ask what changed since a sequence number. It retains metadata, not a complete filesystem snapshot or the byte-range operations Slates uses for merging; a request older than retained history reports truncation.",
    example: "since sequence 42 → changed paths + root transitions",
  },
  "introducing-slates:eden-model": {
    title: "Immutable source objects and mutable checkout state",
    explanation:
      "EdenFS keeps two representations: source-control trees and blobs identify original content, while directory and file inodes represent the current checkout. An unchanged inode can refer back to a source object instead of owning a private copy of its contents.",
    example:
      "Tree / Blob → source state\nTreeInode / FileInode → checkout state",
  },
  "introducing-slates:eden-inodes": {
    title: "Loading is different from materializing",
    explanation:
      "Loading an EdenFS inode brings its state into memory; materializing it means its current contents can no longer be fetched through the original source-object reference. A changed child also materializes its parent path, while a read alone need not make the file private.",
    example:
      "read → load original content\nwrite → private content + changed parent path",
  },
  "introducing-slates:eden-storage": {
    title: "Preserving inode state across a process crash",
    explanation:
      "EdenFS's storage design retains inode numbers, metadata and materialized contents in an on-disk overlay. It writes a child's overlay data before the parent starts depending on it, so a crash between those steps does not leave the parent naming missing private content.",
    example: "store child → mark parent materialized",
  },
  "introducing-slates:eden-decision": {
    title: "Adapting materialization to a live host directory",
    explanation:
      "Slates applies the private-overlay idea to an existing host directory: untouched entries read through to that source, while a first change records the base version it relied on. Whiteouts, redirects and drift checks preserve that relationship without copying the whole tree or silently absorbing outside edits.",
  },
  "introducing-slates:cli": {
    title: "Creating and mounting a volume",
    explanation:
      "The CLI separates creating a bounded or dynamic volume from attaching a filesystem mount. An overlay creation names its host-directory base; mounting then exposes that volume's VFS through an existing user-owned directory.",
    example:
      "slates volume create work --bounded 4GiB --base /path/to/project\nslates mount ID /path/to/mount",
  },
  "introducing-slates:bridges": {
    title: "Translating operating-system file calls",
    explanation:
      "A bridge converts the host's filesystem requests into operations on the owning VFS shard. Its cache negotiation and flush behavior determine when a tool's writes become server-visible; the mount is an access path, not a second authority over file state.",
  },
  "introducing-slates:base": {
    title: "Live overlays versus complete captures",
    explanation:
      "A live overlay retains the identity of its underlying directory and reads untouched content on demand. A complete immutable capture needs an immutable source view or actual exclusion of writers; checking timestamps repeatedly cannot make a multi-file scan atomic.",
  },
  "introducing-slates:vfs": {
    title: "Directory entries, inodes and content",
    explanation:
      "Directory entries bind names to inode numbers; inodes carry attributes and the file's content representation. The owner's lookup, rename, copy-up and read algorithms enforce those relationships for mounts and SDK callers alike.",
  },
  "introducing-slates:handles": {
    title: "Rejecting a reused storage slot",
    explanation:
      "An internal handle contains a slot index and its generation, checked by the owning slab on access. Reusing the slot changes its generation, so an old handle cannot silently address the replacement object; cross-shard encoding also identifies the owner.",
    example: "slot 7 / generation 2 ≠ slot 7 / generation 3",
  },
  "introducing-slates:snapshots": {
    title: "Sharing roots with copy-on-write epochs",
    explanation:
      "A snapshot retains a volume's roots and an epoch; a clone pins that origin instead of copying the tree. Nodes from an earlier epoch are copied before mutation, while nodes already owned by the current epoch can change in place.",
  },
  "introducing-slates:attachment-barrier": {
    title: "Closing a client write generation",
    explanation:
      "The snapshot barrier identifies contributing writable attachments, stops writes entering the closing generation, requests supported cache flushes and drains accepted writes before publishing roots. A failed participant makes the barrier incomplete; application bytes never submitted remain outside it.",
    example:
      "close generation → flush attachments → drain writes → publish roots",
  },
  "introducing-slates:vfs-bench": {
    title: "Measuring in-process snapshot and clone costs",
    explanation:
      "Recorded 2026-09-05: the volume-core benchmark measures snapshot creation followed by snapshot destruction, and cloning followed by destruction of the untouched clone, on existing trees. It batches operations within a 500 ms budget per row and reports 95% bootstrap intervals. The release build uses Rust 1.98.0 on an 18-core Apple M5 Max with 128 GiB RAM and macOS 26.4.1; macOS does not pin these threads. The nearly flat timings measure retaining and releasing roots, not an attachment-barrier cache flush, a complete host-directory capture, a mount, or an agent launch. The recorded command is cargo run --release -p slates-vfs --example vfs_bench.",
    example:
      "Files: 1,000 / 100,000 / 1,000,000\nSnapshot + destroy: 45 / 44 / 45 ns\nUntouched clone + destroy: 265 / 260 / 244 ns",
  },
  "introducing-slates:content": {
    title: "Identifying and sharing sealed content",
    explanation:
      "Sealing makes mutable content immutable, allowing Slates to compute its BLAKE3 identity and reuse verified duplicates. Hashing can finish after the chunk becomes immutable, with deduplication waiting for that result. A remote holder verifies received bytes against their identity before accepting them; individual writes do not hash the complete file.",
    example: "mutable extent → seal → hash → verified shared chunk",
  },
  "introducing-slates:splice": {
    title: "Building a result from existing content ranges",
    explanation:
      "After an edit is accepted, the splice walks the old extents and declared operations to build a new extent list. Unchanged ranges keep their source references, and replacement ranges point into the submitted post-state; the splice moves references rather than copying file bytes.",
    example: "retained prefix + replacement range + retained suffix",
  },
  "introducing-slates:memory": {
    title: "Reserving the physical cost of admitted work",
    explanation:
      "A holder admits work only when prepared capacity covers current allocations, promised future growth, temporary operation space and a control reserve. Shared chunks reduce physical use, but do not erase the capacity obligation if entitled clones later write different bytes.",
  },
  "introducing-slates:accounting": {
    title: "Referenced bytes and bytes unique to a head",
    explanation:
      "The per-volume counters measure content reachable from the head and the portion born after its newest shared epoch. A fresh clone can reference a large tree while reporting zero unique bytes; those counters are not the host's physical-memory admission budget.",
    example: "fresh clone: referenced = 1 MiB; unique = 0",
  },
  "introducing-slates:operations": {
    title: "Recording edits as they happen",
    explanation:
      "The journal names the operation, path, byte position, length and prior file version instead of storing only a final file comparison. Added bytes live in the sealed post-state and are referenced by the operation document.",
    example: "image.conf: replace [8, 10) with bytes from the post-state",
  },
  "introducing-slates:derive": {
    title: "Composing one volume's operation history",
    explanation:
      "The deriver follows file entities through creation, renaming, deletion and content edits to produce the increment's net operations. Creating and then deleting a new file cancels, but a whole-file rewrite remains a whole-file replacement rather than an invented fine-grained diff.",
  },
  "introducing-slates:derive-tests": {
    title: "Checking composed edits against the original execution",
    explanation:
      "The reconstruction oracle executes the raw edits, independently applies the composed operations to the base and compares the resulting bytes. Its cases include overlapping overwrites, truncate, insert/delete cancellation and whole-file rewrites, checking that composition preserves the actual effect.",
    example: "execute raw edits = apply net operations to base",
  },
  "introducing-slates:position-map": {
    title: "Moving a saved range through accepted edits",
    explanation:
      "The position map carries a range forward through each accepted delta since its base. Insertions and deletions before the range shift it by their size change; an operation touching the range is passed to the verdict as a possible conflict, not resolved by searching for matching text.",
    animation: "mapping",
  },
  "introducing-slates:verdict": {
    title: "Separating disjoint edits from conflicting overlap",
    explanation:
      "The first verdict pass compares sorted ranges: disjoint edits accept, matching spans become candidates for a byte comparison, and incompatible overlap conflicts. The second pass can accept identical bytes; structural conflicts such as competing renames have explicit classes.",
  },
  "introducing-slates:merge-engine": {
    title: "Advancing the accepted version",
    explanation:
      "The green's merge task resolves a submitted operation document, maps edits through intervening versions, decides the verdict and applies accepted content and namespace changes. A successful increment advances the version; a conflict returns precise windows without blocking later submissions.",
  },
  "introducing-slates:runtime": {
    title: "Running work on its owning core",
    explanation:
      "Each shard owns its tasks, ready queue and mutable state; another core sends work through bounded rings rather than mutating that state directly. The executor drains completions and inbound messages, runs ready tasks to their next await and parks when no work is ready.",
  },
  "introducing-slates:provision-bench": {
    title: "Timing the real provisioning round trip",
    explanation:
      "Recorded 2026-09-05: one spinning Rust client provisions volumes through real rendezvous and shared-memory rings against an in-process daemon, measuring about 9 µs median, 25 µs p99 and 31 µs p999. Eight spinning clients record 34–45 µs p99; oversubscribing the machine changes latency substantially. The release build uses Rust 1.98.0 on an 18-core Apple M5 Max with 128 GiB RAM and macOS 26.4.1. Provisioning runs separately on a quiescent machine: its single-client p99 rose from 25 µs to 1.5 ms under the mixed benchmark runner's contention. These measurements do not include mounting, populating a workspace or launching an agent, and are not an all-load latency guarantee.",
    example:
      "cargo run --release -q -p slates-client --example provision_bench",
  },
  "introducing-slates:recovery": {
    title: "Rebuilding a volume from retained RAM",
    explanation:
      "The daemon publishes a canonical image of the volume's logical state into memory retained by the anchor process. A replacement daemon reconstructs inodes, contents and references from that image; this protects against the daemon's loss, not a host reboot or loss of all RAM holders.",
  },
  "introducing-slates:completion": {
    title: "Replaying committed state and completion records",
    explanation:
      "Database recovery loads the newest valid snapshot and replays later records, rejecting a torn tail. Keeping an operation's effect and completion in the same recoverable publication lets a retry recover its recorded result rather than perform a second mutation.",
  },
  "introducing-slates:client-tests": {
    title: "Retrying through a real daemon restart",
    explanation:
      "The client tests stop and restart the daemon while the anchor survives, then reuse the client's session and retry identity. They check that the retry meets the retained completion record and that existing volume and green-version state remains available.",
  },
  "introducing-slates:routing": {
    title: "Forwarding to the shard that owns the volume",
    explanation:
      "The fleet server combines current configuration with the volume's identity to find its owner, then relays remote work to that owner's shard. Peer session repair, content placement and ownership recovery run separately so the machine accepting a connection need not execute its mutation.",
  },
  "introducing-slates:forwarding-tests": {
    title: "Serving a request from another region",
    explanation:
      "The fleet regression creates a volume on one node and reads it through a node in another region. The receiving node forwards the read to the volume owner and relays the result. This checks read forwarding, not cross-region write retries or geographic network latency.",
  },
  "introducing-slates:register-design": {
    title: "Object commits and configuration decisions",
    explanation:
      "Object holders commit records under authority already assigned to the owner, while a regional consensus group changes membership, ownership epochs and placement configuration. These are separate decisions: replicated writes need their holder acknowledgements without a fresh configuration election on every write.",
  },
  "introducing-slates:membership": {
    title: "Direct probes, indirect probes and suspicion",
    explanation:
      "A direct-probe timeout triggers requests for other peers to probe the target. Without an acknowledgement, the detector marks the target Suspect. It marks the target Dead only after the suspicion window expires. A live peer can refute suspicion with a newer incarnation; that does not restore an obsolete ownership epoch.",
  },
  "introducing-slates:probe-session": {
    title: "Reusing a session after a probe timeout",
    explanation:
      "A timed-out probe leaves the existing endpoint available for the next attempt. Each acknowledgement must echo the current probe's nonce. A delayed reply to an older probe cannot confirm that the peer answered the new one.",
    example:
      "probe 41 times out → keep session\nprobe 42 → only ACK 42 confirms it",
  },
  "introducing-slates:council": {
    title: "Committing regional configuration changes",
    explanation:
      "A small regional Raft council commits admission, retirement and takeover decisions; other nodes learn the resulting configuration. A takeover advances the failed host's fencing epoch, while requests read the locally installed configuration instead of calling the council for every file write.",
  },
  "introducing-slates:root-group": {
    title: "Deciding region membership and promotions",
    explanation:
      "The root Raft group controls which regions exist, where moved volumes are homed and which mirror replaces a lost region. It handles cross-region authority changes, not ordinary content transfers or a consensus round for each write.",
  },
  "introducing-slates:progress": {
    title: "Giving advancing work bounded extra time",
    explanation:
      "A progress witness records an operation's highest progress counter and when it last advanced. Near the deadline, the runtime can extend an operation that has made recent progress. It stops extending when progress stalls or the extension budget runs out. The required quorum does not change.",
    example:
      "verified chunks increasing → bounded extension\nno advance → deadline remains",
  },
  "introducing-slates:mirror": {
    title: "Tracking the mirror's acknowledged prefix",
    explanation:
      "Home-committed records and their content reach the mirror in epoch and sequence order and need a separate mirror-region quorum. Mirror age measures the oldest home commit still awaiting that acknowledgement; missing timing knowledge is unknown lag, not zero.",
  },
  "introducing-slates:migration": {
    title: "Retaining live edits before acknowledging them",
    explanation:
      "The opt-in live-shipped policy places the operation log on f+1 eligible holders and waits for those acknowledgements. Backups apply entries in order; replica lag applies bounded credit backpressure to that volume's writers. This differs from ordinary owner-local edits between seals. Moving the writer itself requires a separate seal, transfer, committed ownership generation and recovery before the destination serves.",
  },
  "introducing-slates:reconfiguration": {
    title: "Replacing holders without losing committed records",
    explanation:
      "A holder-set change passes through an intermediate configuration where writes need a majority of both old and new sets. The old set retires only after the owner acknowledges the change and a new-set majority holds the newest committed record.",
    example: "old majority → both majorities → new majority",
  },
  "introducing-slates:enrollment": {
    title: "Giving an admitted node its fleet identity",
    explanation:
      "Trusted enrollment connects membership admission to a node's pinned session identity, control-key context and current epoch. Merely reaching a socket or presenting an arbitrary identifier does not place a process in the fleet's trusted membership.",
  },
  "introducing-slates:security": {
    title: "Checking the consumer, rights and lease",
    explanation:
      "An authenticated account and enrolled consumer scope establish who is asking; the volume's access list and mutation lease determine what that consumer may do. A volume identifier or shared operating-system user is not sufficient authority, and process isolation remains the harness's responsibility.",
  },
  "introducing-slates:placement": {
    title: "Offering, transferring and verifying content",
    explanation:
      "The owner offers a manifest and chunk identities; each holder returns its missing set, receives the needed content and verifies the complete reference graph. The acknowledgement binds the object, sequence and manifest, so receiving a packet alone cannot count as placing the version.",
    example: "offer → missing set → transfer → verify → acknowledge",
  },
  "introducing-slates:placement-domains": {
    title: "Choosing copies across failure domains",
    explanation:
      "Placement selects an owner's bounded neighborhood from the declared failure-domain tree, then chooses an object's candidates by rendezvous hashing. A neighborhood change adds needed copies before removing old ones; candidate diversity, not just copy count, determines the failures those copies can survive.",
  },
  "introducing-slates:submission-barrier": {
    title: "Retaining every input before committing a merge",
    explanation:
      "Submission first completes the contributing attachments' write barrier and retains the operation document and sealed post-state. A distributed merge must place those inputs before its version record can reference them, so another holder can reconstruct and verify the result.",
  },
  "introducing-slates:auto-seal": {
    title: "Sealing the writes the server has received",
    explanation:
      "Periodic or explicit sealing produces a stable snapshot and drives later hashing and placement. Without an attachment flush barrier, auto-seal covers only server-visible writes; publishing a root quickly does not mean every dirty client page has arrived or every replica has acknowledged it.",
  },
  "introducing-slates:green-placement": {
    title: "Committing and checking a distributed merge version",
    explanation:
      "The work owner places the submitted post-state before green's owner proposes the next ledger version. Green holders recompute the verdict and manifest from retained inputs, and the version commits only with its required content placed and enough eligible record acknowledgements.",
  },
  "introducing-slates:register": {
    title: "Fenced values and distinct holder acknowledgements",
    explanation:
      "A register stores a head, lease or version record under one owner's epoch and the current configuration. With fault tolerance f, a proposal needs f+1 distinct acknowledgements among 2f+1 candidates; stale epochs and stale configurations are refused.",
    example: "f = 1: 2 acknowledgements from 3 candidates",
  },
  "introducing-slates:safe-adoption": {
    title: "Recovering the accepted value under a new epoch",
    explanation:
      "A successor obtains promises from an authorized quorum and adopts the highest accepted proposal consistent with the committed prefix. It must record acceptance under the new epoch even when the bytes match an older value; matching content alone does not establish the new authority.",
    animation: "quorum",
  },
  "introducing-slates:durability": {
    title: "Naming the failure boundary of an acknowledgement",
    explanation:
      "Client flush, daemon recovery, host-copy placement and mirror placement establish different boundaries. A replicated delta does not preserve an unfetched live directory, and RAM copies cannot survive the loss of every holder; persistence beyond that requires explicit export or granted landing.",
  },
  "introducing-slates:distribution": {
    title: "Attaching remotely without copying the whole view",
    explanation:
      "A remote attachment reads the owner's head and verified manifest, then fetches content by identity from recorded holders as it is read. A local clone can retain those shared references while making its own edits, subject to its own budget and any retained live-base dependency.",
  },
  "introducing-slates:rejoin": {
    title: "Refuting a false death versus restarting a host",
    explanation:
      "A still-live peer with intact RAM can refute a false retirement with a higher SWIM incarnation and adopt current configuration. A restarted RAM-only member instead rejoins with a fresh identity; it cannot reset its old fences and resume as if retained records still existed.",
  },
  "introducing-slates:transport": {
    title: "Control datagrams and reliable session streams",
    explanation:
      "The fleet transport separates replaceable control messages from reliable requests and content carried on multiplexed session streams. TLS-authenticated peers and connection identities bind and distinguish sessions; stream identity separates exchanges inside one connection.",
  },
  "introducing-slates:flow-control": {
    title: "Keeping credit ahead of consumption, not the whole object",
    explanation:
      "The receiver advertises absolute stream and connection limits a bounded window beyond what the application consumed. As consumption advances the limits rise; duplicate or reordered lower limits cannot grant extra space or make the sender buffer an entire large object.",
    example: "allowed offset = consumed offset + bounded window",
  },
  "introducing-slates:transport-tests": {
    title: "Keeping concurrent and replacement sessions separate",
    explanation:
      "The session regressions exercise handshake, protected request/reply streams, multiple clients on one accepting socket and a peer that redials after losing its session. Unknown connection identities are dropped while live sessions keep serving, and the redial replaces the old session.",
  },
  "introducing-slates:landing": {
    title: "Planning, approving and validating a disk change",
    explanation:
      "Landing builds a canonical manifest from diverged entries, presents it for approval and compares the witnessed base, current disk state and proposed result before writing. A grant authorizes that plan; it does not override a conflicting outside edit or make a multi-file host-tree update atomic.",
  },
  "introducing-slates:grant": {
    title: "Binding approval to the exact manifest",
    explanation:
      "A grant record identifies the approved manifest hash, scope, expiry and state. A landing cannot consume a mismatched, expired or revoked grant, and a single-use grant becomes consumed after its landing rather than remaining reusable approval for arbitrary changes.",
    example: "approved hash A ≠ changed plan hash B → refuse",
  },
  "introducing-slates:landing-tests": {
    title: "Injecting outside edits and crashes into landing",
    explanation:
      "The landing oracle changes host files between validation and writing and injects a crash at each write step. It checks refusal, idempotent retry and per-entry old-or-new outcomes, including partial results, rather than assuming the landing lease excludes unrelated writers.",
  },
  "introducing-slates:python": {
    title: "Submitting work and querying accepted changes",
    explanation:
      "The async SDK test creates a green and work volume, edits the work and inspects submit's success, conflicts and returned version. It then queries the current version and paths changed since the base, showing how a caller observes the accepted result without confusing it with disk landing.",
    example:
      "await client.submit(work_id)\nawait client.changed_since(green_id, base_version)",
  },
};

/** A repeated source can support different mechanisms at different link labels. */
export const slatesReferenceVariants: Record<string, ReferenceNote> = {
  "introducing-slates:snapshots:copy-on-write": {
    title: "Sharing nodes until a write changes them",
    explanation:
      "A clone pins its snapshot's roots. Before changing a node born in an older shared epoch, the writer copies the affected structure into its current epoch; a node already private to that epoch can change in place. Retained snapshots keep the older nodes reachable, so discarding one attempt cannot reclaim content another version still needs.",
  },
  "introducing-slates:merge-engine:rebase its private work against the current head":
    {
      title: "Updating private work without publishing it",
      explanation:
        "Rebase maps the work volume's operations through changes accepted since its base and applies the same conflict rules as submission. A successful rebase updates private work against the newer head; it does not advance green. Publishing that result still requires a separate accepted submission.",
    },
  "introducing-slates:distribution:keeps that same version through the owner change":
    {
      title: "Keeping a sealed reader on its chosen version",
      explanation:
        "An open sealed attachment pins the immutable version it was opened against. Replacing or moving the writable owner does not switch that reader to a later head. The reader continues using the same verified content; seeing a newer version requires opening it explicitly under the required rights and serving authority.",
    },
  "introducing-slates:durability:Waiting for mirror scope": {
    title: "Waiting for the requested version in the mirror",
    explanation:
      "Mirror-scoped completion waits for the named committed prefix and its referenced content to be verified and acknowledged by the mirror region's quorum. The wait can include an existing backlog and several transfers, not just one network round trip. A later home-only commit is not covered by an earlier version's completed mirror barrier.",
  },
  "introducing-slates:security:processes, network access and paths outside the mount remain separate security concerns":
    {
      title: "A private filesystem is not a process sandbox",
      explanation:
        "Private volumes keep edits separate, but they do not restrict every action of the agent's process. The harness must separately control process execution, network connections and access outside the mount. Fleet authentication, volume rights and protected human grant issuance remain distinct checks; an object ID alone grants none of them.",
    },
  "introducing-slates:merge-engine:Resolving overlapping agent edits.": {
    title: "Submitting a revised edit from the accepted version",
    explanation:
      "A refused merge preserves the accepted head and the agent's private work. The agent can create fresh work from the accepted version, apply a deliberately chosen replacement and submit a new increment; the owner still checks for intervening conflicting changes.",
    example:
      "Agent 1: quality=90 accepted\nAgent 2: quality=60 refused\nAgent 2: fresh work at accepted head → quality=85 → test and submit",
  },
  "introducing-slates:landing-tests:Read, rewrite, re-witness and retry.": {
    title: "Resolving an outside edit before trying again",
    explanation:
      "The landing oracle first refuses a conflicting host edit, then reads the actual disk state and rewrites the private result to incorporate it. Re-witnessing records the new base; replanning and approving the revised result precede the successful retry, rather than forcing the original conflict through.",
  },
  "introducing-slates:grant:Approval for a revised manifest.": {
    title: "A revised plan needs matching approval",
    explanation:
      "A single-use grant for one manifest cannot authorize a different manifest produced by conflict resolution. The revised plan must receive approval matching its new hash; a session grant has its own declared scope and still does not bypass conflict validation.",
    example: "grant for M7 + revised manifest M8 → mismatch",
  },
  "introducing-slates:vfs:Namespace and inode model.": {
    title: "Keeping file identity through rename and unlink",
    explanation:
      "A directory entry maps a name to an inode, while open references identify that inode independently of its path. Renaming changes the directory entry without changing the file's inode number; unlinking removes a name rather than immediately invalidating an open reference.",
    animation: "rename",
  },
  "introducing-slates:vfs:Inode numbering": {
    title: "Allocating stable inode numbers on demand",
    explanation:
      "A Slates inode number combines a volume prefix with a monotonically increasing counter. A base-backed entry receives its number at first lookup and keeps it for the volume's lifetime; storage-slot generations separately detect stale internal handles.",
  },
  "introducing-slates:vfs:Directory structures and algorithms.": {
    title: "Compact small directories and indexed large directories",
    explanation:
      "Small directories keep sorted compact entries, while larger directories use copy-on-write indexed blocks. Lookup compares names under the volume's equivalence policy, and merged directory listings combine base and overlay entries while suppressing whiteouts and shadowed names.",
  },
  "introducing-slates:vfs:Content and read paths.": {
    title: "Resolving a read through content extents",
    explanation:
      "A read finds the extents covering its requested offsets and returns their referenced chunk ranges; holes use a shared zero representation. A witnessed live-base range that is not pinned must pass a drift check before its bytes can be served.",
    example: "read offset → extent → chunk slice or validated base bytes",
  },
  "introducing-slates:vfs:Overlay lookup, copy-up and drift.": {
    title: "Hiding a base name without deleting the source",
    explanation:
      "Overlay lookup wins over the base: a whiteout hides a deleted name, while a directory redirect retains the origin of a renamed subtree. First change records a witness, and later mismatches on unpinned source content report BaseDrift instead of silently replacing the edit's base.",
  },
  "introducing-slates:snapshots:Snapshots": {
    title: "Retaining a version without copying its tree",
    explanation:
      "A snapshot records roots and an epoch, and a clone pins those roots as its origin. Shared nodes remain shared until a writer needs to change an older-epoch object, so making a new workspace does not require copying every file.",
  },
  "introducing-slates:snapshots:Epochs, copy-on-write and reclamation.": {
    title: "Reclaiming objects without breaking retained versions",
    explanation:
      "Birth epochs distinguish objects private to the current head from objects an older snapshot can still reach. Replaced shared objects go on the snapshot's deadlist, allowing destruction to reclaim the appropriate objects without treating every current write as a full-tree copy.",
  },
  "introducing-slates:splice:extent splicing.": {
    title: "Reusing unchanged ranges in a new file version",
    explanation:
      "An accepted file result is assembled as references to retained ranges and submitted replacement ranges. Splitting an extent at an edit boundary changes the list of references, not the bytes of the shared chunk it came from.",
  },
  "introducing-slates:splice:Splice": {
    title: "Applying already-accepted operations",
    explanation:
      "Splicing happens after mapping and the verdict; it does not decide whether an overlap is safe. The pass walks extents and operations in order, keeps unaffected ranges and substitutes the accepted post-state ranges to form the next version.",
  },
  "introducing-slates:memory:Shared content and physical admission.": {
    title: "Sharing storage while preserving every writer's entitlement",
    explanation:
      "Several clones may reference one physical chunk, reducing present allocation. Admission still reserves the permitted cost of their future independent writes, so deduplication cannot promise the same remaining capacity to several writers at once.",
    example:
      "3 references → 1 present copy\n3 divergent writes → capacity still required",
  },
  "introducing-slates:memory:Memory admission and accounting.": {
    title: "Accounting for more than file-content bytes",
    explanation:
      "A bounded claim reserves its full entitlement; a dynamic volume grows only within its maximum and unpromised capacity. Metadata, handles, retained snapshots and temporary copy-up or transfer buffers also consume the prepared budget, even when a file contains no bytes.",
  },
  "introducing-slates:memory:Admission invariant and resource dimensions.": {
    title: "Admitting all required resource credits or none",
    explanation:
      "Physical use, outstanding entitlement, temporary headroom and control reserve must fit effective capacity before work is published. Content, inode, handle and retention allowances are separate bounds, preventing a small byte count from hiding an unbounded number of empty files or open handles.",
  },
  "introducing-slates:operations:declared operations": {
    title: "Using the operation record instead of inferring intent",
    explanation:
      "A declared operation records the edit kind and its byte positions when it runs. The merge engine combines those records; it does not reconstruct the edits from two final files.",
  },
  "introducing-slates:operations:Declared operations.": {
    title: "Distinguishing overwrite, insert and delete",
    explanation:
      "The operation kind determines how an edit affects file coordinates: an overwrite replaces a range, an insertion shifts later bytes and a deletion removes them. Namespace operations such as rename retain their own identity instead of being reduced to unrelated final-file differences.",
  },
  "introducing-slates:operations:Slates' operation model.": {
    title: "Keeping byte edits beyond a changed-path notification",
    explanation:
      "Knowing that image.conf changed does not identify the ranges another edit must avoid. Slates records offsets, lengths and operation kinds, with replacement content referenced from sealed state, so mapping and conflict checks can operate on the actual edits.",
  },
  "introducing-slates:operations:Increment format and composition.": {
    title: "Packaging a submitted increment",
    explanation:
      "An increment combines its green base version, canonical declared operations and sealed post-state. Composition reduces the journal to its net effect, while source offsets identify the added bytes; the resulting identity binds the declared work rather than an invented patch history.",
  },
  "introducing-slates:completion:Atomic completion records": {
    title: "Publishing an effect together with its result",
    explanation:
      "The operation's state change and completion record are part of one recoverable transaction. A crash after commit but before reply delivery can therefore leave a result to replay, rather than an ambiguous change that must be performed again.",
  },
  "introducing-slates:completion:Completion records": {
    title: "Keeping operation identity above connection identity",
    explanation:
      "Reconnection changes the path carrying a request, not which logical mutation it names. The retained completion record supplies the original result when that request is retried, including after a forwarded route or session has been replaced.",
    example: "session A: R17 → snapshot S7\nsession B: R17 → same S7",
  },
  "introducing-slates:client-tests:restart/retry tests.": {
    title: "Recovering a retained result after daemon loss",
    explanation:
      "The restart test keeps the anchor and client session alive while replacing the daemon. The client retries a previous request and checks that recovered completion state supplies its original result, alongside the restored volume state.",
  },
  "introducing-slates:client-tests:client retry tests.": {
    title: "Checking that retry does not repeat the effect",
    explanation:
      "The client's retry assertion checks that repeating its create request returns the original volume ID instead of creating another volume. Successful reconnection alone is not the property: the recovered completion must identify the same effect.",
  },
  "introducing-slates:register-design:Configuration and register architecture.":
    {
      title: "Separating owner assignment from object replication",
      explanation:
        "Configuration consensus assigns membership and epochs, while the already-authorized owner proposes object records to their candidate holders. A replicated acknowledgement can require a quorum without requiring another configuration-consensus round to choose the writer.",
    },
  "introducing-slates:register-design:Membership, promotion and fencing.": {
    title: "A liveness recovery does not restore stale write authority",
    explanation:
      "Membership reports can change when a peer refutes suspicion, but holders still enforce the highest authorized ownership epoch they have seen. A successor must recover accepted records under the new authority; the returning old owner cannot bypass those fences by appearing healthy again.",
  },
  "introducing-slates:mirror:Mirror ordering and retained content.": {
    title: "Acknowledging records and content in the mirror region",
    explanation:
      "The mirror receives the home region's committed records in epoch and sequence order together with their referenced content. Home acknowledgement and mirror acknowledgement are distinct; a lagging mirror has not established the same retained prefix as home.",
  },
  "introducing-slates:mirror:Mirror ordering and region promotion.": {
    title: "Promoting only the state the mirror retained",
    explanation:
      "The root group authorizes promotion after region loss, but that decision cannot recreate home commits the mirror never acknowledged. Waiting for placement of a named snapshot in the mirror removes that snapshot's asynchronous replication gap, not the need for promotion authority.",
  },
  "introducing-slates:distribution:distributed volumes.": {
    title: "Keeping volume semantics across hosts",
    explanation:
      "Distributed volumes retain one writable owner, share immutable snapshot content through holders and route remote callers to current authority. A live-base dependency stays attached to its source identity; moving the writable delta does not manufacture a complete copy of that base.",
  },
  "introducing-slates:distribution:Remote attachment, replication and repair.":
    {
      title: "Fetching and repairing only needed content",
      explanation:
        "Remote attachments fetch the manifest first and fault content from recorded holders by identity. Replication skips chunks a receiver already has, while repair compares manifests and replaces missing or differing retained content rather than copying every file on each attach.",
    },
  "introducing-slates:distribution:Migration and ownership transfer.": {
    title: "Moving the writable delta without changing its base",
    explanation:
      "Ownership transfer seals and places the current work before the destination receives a new generation and recovers it. An overlay keeps its original live-base reference across that move; the same pathname on the destination is not an equivalent source directory.",
  },
};

// Keep older link contexts working while binding the sentence-integrated labels
// to their specific mechanisms. Inline code and emphasis are stripped by MDX;
// spelling, punctuation and case otherwise remain part of the context key.
for (const [source, context, previous] of [
  [
    "vfs",
    "changes the directory entry, not the file's inode",
    "Namespace and inode model.",
  ],
  [
    "vfs",
    "case folding and name lookup belong to the volume",
    "Directory structures and algorithms.",
  ],
  ["vfs", "Slates reports BaseDrift", "Overlay lookup, copy-up and drift."],
  ["vfs", "extents", "Content and read paths."],
  [
    "splice",
    "splices references to the original and submitted extents",
    "extent splicing.",
  ],
  [
    "memory",
    "reserve for those independent writes",
    "Shared content and physical admission.",
  ],
  [
    "memory",
    "accounts for the cost of operating the filesystem",
    "Memory admission and accounting.",
  ],
  [
    "memory",
    "refuses the operation before publishing its effect",
    "Admission invariant and resource dimensions.",
  ],
  [
    "operations",
    "records the byte operation as it happens",
    "Declared operations.",
  ],
  [
    "operations",
    "binds the operations to their base and sealed result",
    "Increment format and composition.",
  ],
  [
    "merge-engine",
    "submits a new increment",
    "Resolving overlapping agent edits.",
  ],
  [
    "completion",
    "records the operation's effect and its completion together",
    "Atomic completion records",
  ],
  [
    "completion",
    "Request identity stays independent of the connection",
    "Completion records",
  ],
  ["client-tests", "restart tests", "restart/retry tests."],
  ["client-tests", "client retry tests", "client retry tests."],
  [
    "client-tests",
    "keeps its volume after the daemon restarts",
    "restart/retry tests.",
  ],
  ["client-tests", "reuses the original request ID", "client retry tests."],
  [
    "register-design",
    "fleet configuration",
    "Configuration and register architecture.",
  ],
  [
    "register-design",
    "it cannot regain write authority just by announcing that it is alive",
    "Membership, promotion and fencing.",
  ],
  [
    "mirror",
    "the content that history references",
    "Mirror ordering and retained content.",
  ],
  [
    "mirror",
    "the root configuration can promote Frankfurt",
    "Mirror ordering and region promotion.",
  ],
  [
    "distribution",
    "fetches the chunks it needs from recorded holders",
    "Remote attachment, replication and repair.",
  ],
  ["landing-tests", "checks each entry again during replacement", null],
  [
    "landing-tests",
    "use rewitness to record the new comparison base",
    "Read, rewrite, re-witness and retry.",
  ],
  ["grant", "grant bound to that manifest", null],
  ["grant", "cannot approve M8", "Approval for a revised manifest."],
] as const) {
  const id = "introducing-slates:" + source;
  slatesReferenceVariants[id + ":" + context] = previous
    ? slatesReferenceVariants[id + ":" + previous]
    : slatesReferenceNotes[id];
}
