# Hyperlight project inventory

Reviewed September 10, 2026 against the organization’s current GitHub repository metadata, READMEs, and complete default-branch file trees. This note uses first-party sources; the wording and animation proposals are editorial interpretations, identified separately from implemented capabilities.

## Scope

The requested cutoff is **Hecate’s creation time: `2026-07-31T21:07:34Z`**, inclusive. Compare `created_at`, not the most recent push or update. The organization inventory was fetched with pagination, ordered by creation time. [Organization repositories API](https://api.github.com/orgs/hyper-light/repos?per_page=100&sort=created&direction=desc), [Hecate repository metadata](https://api.github.com/repos/hyper-light/hecate).

Exclude every Sylk project, including case-insensitive name matches and repositories whose purpose is part of Sylk even if their names differ. The inventory identifies `sylk`, `sylk-ai`, and `sylk-sh`; no additional Sylk product is identified among the newly eligible public repositories. Also exclude `cocoa`, `mkfst-py`, and this site’s implementation repository. Existing Vorpal and Hyperscale entries remain: the creation cutoff determines which missing projects to add, rather than removing older projects already on the site. [Organization repository inventory](https://api.github.com/orgs/hyper-light/repos?per_page=100&sort=created&direction=desc).

Hoard and Hecate were private during the initial inspection. The repository owner confirmed that Hoard’s visibility was a mistake and explicitly approved including its purpose and details on the site. A final read-only GitHub API check confirmed that all eligible repositories, including Hoard and Hecate, are now public. No GitHub visibility setting was changed by the implementation agents. [Hoard metadata](https://api.github.com/repos/hyper-light/hoard), [Hecate metadata](https://api.github.com/repos/hyper-light/hecate).

## Inclusion inventory

All creation timestamps are UTC, from the repository metadata linked in the first column.

| Repository                                                                  | Created             | Decision                       | Source evidence                                                    |
| --------------------------------------------------------------------------- | ------------------- | ------------------------------ | ------------------------------------------------------------------ |
| [Clarion](https://api.github.com/repos/hyper-light/clarion)                 | 2026-09-10 18:33:10 | Add                            | Repository description; no README or implementation                |
| [Quiver](https://api.github.com/repos/hyper-light/quiver)                   | 2026-09-10 18:32:26 | Add                            | Short README; no implementation                                    |
| [Hoard](https://api.github.com/repos/hyper-light/hoard)                     | 2026-09-10 18:28:55 | Add; owner approved            | Short README; no implementation; public at final check             |
| [Reliquary](https://api.github.com/repos/hyper-light/reliquary)             | 2026-09-10 18:26:40 | Add                            | Short README; no implementation                                    |
| [Athame](https://api.github.com/repos/hyper-light/athame)                   | 2026-09-10 18:25:24 | Add                            | Short README; no implementation                                    |
| [Shards](https://api.github.com/repos/hyper-light/shards)                   | 2026-09-10 18:24:30 | Add                            | Short README; no implementation                                    |
| [Hex](https://api.github.com/repos/hyper-light/hex)                         | 2026-09-10 18:22:46 | Add                            | Short README; no implementation                                    |
| [hyperlight-site](https://api.github.com/repos/hyper-light/hyperlight-site) | 2026-09-10 17:20:01 | Exclude                        | This site, not another product                                     |
| [Mantle](https://api.github.com/repos/hyper-light/mantle)                   | 2026-09-09 17:33:46 | Already listed; update purpose | Public description names a distributed filesystem and object store |
| [Veil](https://api.github.com/repos/hyper-light/veil)                       | 2026-09-05 18:47:52 | Already listed                 | Just-in-time secrets; short README and no implementation           |
| [Focal](https://api.github.com/repos/hyper-light/focal)                     | 2026-09-05 18:44:53 | Already listed                 | Agent coordination ledger                                          |
| [Slates](https://api.github.com/repos/hyper-light/slates)                   | 2026-09-03 20:29:23 | Already listed                 | Concurrent agent workspaces                                        |
| [Hecate](https://github.com/hyper-light/hecate)                             | 2026-07-31 21:07:34 | Already listed; cutoff         | Existing site entry retained                                       |
| [Vorpal](https://api.github.com/repos/hyper-light/vorpal)                   | 2026-07-01 01:04:34 | Retain existing entry          | Older than cutoff                                                  |
| [sylk-sh](https://api.github.com/repos/hyper-light/sylk-sh)                 | 2026-06-01 01:43:58 | Exclude                        | Sylk landing page                                                  |
| [sylk-ai](https://github.com/hyper-light/sylk-ai)                           | 2026-05-30 23:55:55 | Exclude                        | Explicitly excluded Sylk variant                                   |
| [sylk](https://api.github.com/repos/hyper-light/sylk)                       | 2026-01-11 06:49:56 | Exclude                        | Explicitly excluded Sylk project                                   |
| [cocoa](https://api.github.com/repos/hyper-light/cocoa)                     | 2025-03-12 14:41:32 | Exclude                        | Explicit user exclusion                                            |
| [mkfst-py](https://api.github.com/repos/hyper-light/mkfst-py)               | 2024-07-12 18:42:31 | Exclude                        | Explicit user exclusion                                            |
| [Hyperscale](https://api.github.com/repos/hyper-light/hyperscale)           | 2024-06-19 17:52:06 | Retain existing entry          | Older than cutoff                                                  |

## Shared implementation limits

Hex, Shards, Athame, Reliquary, Hoard, and Quiver each have exactly three files on `main`: `.gitignore`, `LICENSE`, and `README.md`. Each README consists of a heading and a one-sentence purpose. Clarion has `.gitignore` and `LICENSE` only; its README endpoint returns 404. Their complete Git trees report `truncated: false`. There are no source files, package manifests, design specifications, tests, install instructions, or separate documentation pages in those trees. [Hex tree](https://api.github.com/repos/hyper-light/hex/git/trees/main?recursive=1), [Shards tree](https://api.github.com/repos/hyper-light/shards/git/trees/main?recursive=1), [Athame tree](https://api.github.com/repos/hyper-light/athame/git/trees/main?recursive=1), [Reliquary tree](https://api.github.com/repos/hyper-light/reliquary/git/trees/main?recursive=1), [Hoard tree](https://api.github.com/repos/hyper-light/hoard/git/trees/main?recursive=1), [Quiver tree](https://api.github.com/repos/hyper-light/quiver/git/trees/main?recursive=1), [Clarion tree](https://api.github.com/repos/hyper-light/clarion/git/trees/main?recursive=1).

For these entries, use **In design** and `language: null`. These are site classifications based on the observed contents, not release labels asserted by the repositories. A `.gitignore` template is not evidence of an implementation language. Describe intended purposes without claiming working security controls, delivery guarantees, integrations, APIs, or deployment support.

## Hex

**Established purpose:** agent runtime and compute provisioning, scheduling, and management. The README and repository description agree. **Repository:** [hyper-light/hex](https://github.com/hyper-light/hex). **Documentation:** its [README](https://github.com/hyper-light/hex/blob/main/README.md); no separate docs. [Metadata](https://api.github.com/repos/hyper-light/hex), [complete tree](https://api.github.com/repos/hyper-light/hex/git/trees/main?recursive=1).

Suggested category: **Agent compute**. Suggested tagline: **Give the work somewhere to run.** Suggested description: “Runtime and compute management for agents: provision capacity, schedule work, and keep track of where it runs.” Present this as the project’s direction while it is in design.

Animation proposal — **Allocation:** a hexagonal field stays mostly dark. Small arriving work signals illuminate and gently expand selected cells; completed signals leave and cells settle. The meaningful action is capacity assigned around work. Avoid suggesting a measured scheduler policy or a specific cluster architecture.

## Shards

**Established purpose:** a lightweight microVM and container environment for agents, with security as a stated goal. There is no implemented isolation boundary to evaluate yet. **Repository:** [hyper-light/shards](https://github.com/hyper-light/shards). **Documentation:** its [README](https://github.com/hyper-light/shards/blob/main/README.md). [Metadata](https://api.github.com/repos/hyper-light/shards), [complete tree](https://api.github.com/repos/hyper-light/shards/git/trees/main?recursive=1).

Suggested category: **Agent environments**. Suggested tagline: **A boundary around the work.** Suggested description: “Lightweight environments for agents, built around microVMs and containers.” Keep security language aspirational until actual boundaries and their guarantees are documented.

Animation proposal — **Containment:** a fleet of irregular, jagged hollow shells each contains a moving payload. Thin fractured boundaries remain visibly separate while activity proceeds inside each one. The owner’s visual direction is sharp, irregular containers—not smooth cells, broad stacked planes, or solid decorative crystals. This remains a visual interpretation of isolated environments, not a claim about implemented isolation guarantees.

## Athame

**Established purpose:** identity access management and policy control for agents. The current source does not specify authentication protocols, token formats, permissions syntax, or an enforcement mechanism. **Repository:** [hyper-light/athame](https://github.com/hyper-light/athame). **Documentation:** its [README](https://github.com/hyper-light/athame/blob/main/README.md). [Metadata](https://api.github.com/repos/hyper-light/athame), [complete tree](https://api.github.com/repos/hyper-light/athame/git/trees/main?recursive=1).

Suggested category: **Identity & access**. Suggested tagline: **Make access a deliberate choice.** Suggested description: “Identity, access, and policy control for agents. A place to define who can do what.”

Animation proposal — **Admission:** moving request lines meet a transparent, shield-like boundary. A narrow aligned opening admits one path while other requests turn away; reflections keep the boundary visible without making it an opaque plate. This illustrates a policy decision without claiming the project has implemented any particular security behavior.

## Reliquary

**Established purpose:** an artifact registry for agents, skills, and more. No supported artifact formats, content-addressing scheme, version semantics, or distribution protocol is documented. **Repository:** [hyper-light/reliquary](https://github.com/hyper-light/reliquary). **Documentation:** its [README](https://github.com/hyper-light/reliquary/blob/main/README.md). [Metadata](https://api.github.com/repos/hyper-light/reliquary), [complete tree](https://api.github.com/repos/hyper-light/reliquary/git/trees/main?recursive=1).

Suggested category: **Artifact registry**. Suggested tagline: **A place for the things agents use.** Suggested description: “A registry for agents, skills, and their artifacts, with a clear place to find what the work needs.”

Animation proposal — **Catalog:** distinct artifacts form an addressable constellation beside an index. A selected address illuminates its artifact; the rest remain individually identifiable. The action connects identity and retrieval without suggesting that a particular addressing scheme is implemented. Avoid a generic storage box or a cloud of interchangeable particles.

## Hoard

**Established purpose:** lightweight Redis- and Valkey-compatible caching. Compatibility is a stated project direction, not a demonstrated implementation: the repository contains only `.gitignore`, `LICENSE`, and a short README. Use **In design** and `language: null`. **Repository:** [hyper-light/hoard](https://github.com/hyper-light/hoard). **Documentation:** its [README](https://github.com/hyper-light/hoard/blob/main/README.md). [Metadata](https://api.github.com/repos/hyper-light/hoard), [complete tree](https://api.github.com/repos/hyper-light/hoard/git/trees/main?recursive=1).

Hoard was private at the initial inspection; its owner approved publishing this project information on the site. The final read-only GitHub API check confirmed that Hoard is now public, so its repository and README links are publicly accessible. No visibility change was performed by the implementation agents. [Current repository metadata](https://api.github.com/repos/hyper-light/hoard).

Suggested category: **Caching**. Suggested tagline: **Keep the next read close.** Suggested description: “Lightweight caching, with Redis and Valkey compatibility as its starting point. Keep frequently needed data close to the work.”

Animation proposal — **Recall:** a request first takes a long path to a stored tile. When the request returns, the nearby cached tile answers through a short illuminated loop. Make the second retrieval visibly shorter without presenting a benchmark, eviction policy, or hit-rate guarantee.

## Quiver

**Established purpose:** a simple queuing service designed for agentic scale. Nothing currently specifies ordering, acknowledgements, persistence, retries, or delivery semantics. **Repository:** [hyper-light/quiver](https://github.com/hyper-light/quiver). **Documentation:** its [README](https://github.com/hyper-light/quiver/blob/main/README.md). [Metadata](https://api.github.com/repos/hyper-light/quiver), [complete tree](https://api.github.com/repos/hyper-light/quiver/git/trees/main?recursive=1).

Suggested category: **Work queues**. Suggested tagline: **Work, waiting for its turn.** Suggested description: “A simple queuing service for agents, making room for work as it arrives.”

**Owner-provided design direction:** after the repository review, the owner described Quiver as a state-of-the-art upgrade of SQS. The site interprets that direction as a rethink of the SQS-style work queue for agents, covering work arriving, being claimed, and returning a result. This is first-party product intent supplied in the conversation, not a capability established by the sparse README. Keep **In design** and the explicit limits on unimplemented ordering, persistence, retries, and delivery guarantees.

Animation interpretation — **Dispatch:** one persistent ingress vector faces seven equal, translucent outgoing vectors. Their proportions stay fixed under an orthographic camera; shared breathing and traveling refracted light suggest one queue supplying many workers. The owner's refinements explicitly ruled out spawning, disappearing forms, perspective-driven size changes, opaque chrome, and branching ribbons. The mark echoes the one-to-many arrangement. This is a visual interpretation, not a claim of implemented broadcast, ordering, or delivery semantics.

## Clarion

**Established purpose:** a simple notification service designed for agents. This comes from the repository’s public description; **there is no README** at the time of review. No supported channels, subscriber model, or delivery guarantees are documented. **Repository:** [hyper-light/clarion](https://github.com/hyper-light/clarion). Link to the repository itself rather than an invented docs page. [Metadata](https://api.github.com/repos/hyper-light/clarion), [complete tree](https://api.github.com/repos/hyper-light/clarion/git/trees/main?recursive=1).

Suggested category: **Notifications**. Suggested tagline: **Let the right signal through.** Suggested description: “A simple notification service for agents, for the moments when something needs their attention.”

Animation proposal — **Signal:** a discrete event sends expanding resonance wavefronts across a delicate field. Nearby surfaces respond as the wave reaches them, then settle. The direction is a visible event and response, not a horn, speaker, or a claim about supported notification channels.

## Mantle: correct the existing purpose

Mantle’s public repository description now supplies a specific purpose: **a distributed filesystem and object store for agents**. Its README still contains only the heading `mantle`, and its complete tree contains `.gitignore`, `LICENSE`, and `README.md`. Update the old “purpose unspecified” copy, retain **In design** and `language: null`, and avoid invented replication, consistency, encryption, or durability guarantees. [Repository](https://github.com/hyper-light/mantle), [metadata containing the purpose](https://api.github.com/repos/hyper-light/mantle), [README](https://github.com/hyper-light/mantle/blob/main/README.md), [complete tree](https://api.github.com/repos/hyper-light/mantle/git/trees/main?recursive=1).

Suggested category: **Distributed storage**. Suggested tagline: **A place for the work to live.** Suggested description: “A distributed filesystem and object store for agents. Files and artifacts, with room for the work to grow.”

Animation interpretation — **Storage:** the existing layered globe can represent storage distributed across regions. A file resolves into several illuminated surface locations, with a path crossing the cutaway. Keep the globe visibly spherical; the concept does not require replacing it with generic server cubes.

## Remaining boundaries

- Repository creation time defines eligibility, not maturity. Today’s new names are starting points, not newly released products.
- Repository metadata and current default-branch contents establish the descriptions above. Local unpublished work was not used to claim public functionality; Hoard’s inclusion has explicit owner authorization.
- No missing public repository declares itself a Sylk component in the inspected purpose or contents. The explicit Sylk exclusions remain excluded regardless of age or activity.
- Animation proposals communicate intended roles. They are original visual interpretations and do not document implementation details.

## September 11 additions: Grid and Ergo

The owner explicitly requested both new projects. At review, each repository contains only `.gitignore`, `README.md`, and an MIT `LICENSE`; neither has source code, tests, package manifests, detailed design documents, or release tags. Both use **In design** and `language: null`, consistent with the other repository scaffolds above.

**Grid** establishes the scope “Hyperplane, vpc, routing, and security groups.” It joins the catalog under **Networking**. The intended network boundaries and controlled routes are described as design goals, not deployed capabilities. Its **Connection** study uses a four-cell-wide cubic lattice, translucent private regions, and light traveling between connected grid junctions. The companion icon echoes the cubic grid. This is an editorial interpretation of the scope, not a specified topology or policy algorithm. [README](https://github.com/hyper-light/grid/blob/d7f0dc8b4933f3de49f37c11fc554b5c80059f14/README.md), [complete tree](https://github.com/hyper-light/grid/tree/d7f0dc8b4933f3de49f37c11fc554b5c80059f14), [license](https://github.com/hyper-light/grid/blob/d7f0dc8b4933f3de49f37c11fc554b5c80059f14/LICENSE).

**Ergo** establishes the scope “High performance L4/L7 load balancer.” It joins the catalog under **Load balancing**, with high performance explicitly framed as a design goal; no throughput, latency, protocol support, or failover claims are made. Its **Distribution** study uses a radial glass distributor: light enters a central intake, travels through separate radial channels, and illuminates the receiving chambers around its perimeter. The companion icon uses the same hub-and-outlets structure. The study is a visual interpretation, not a claim about a balancing policy. [README](https://github.com/hyper-light/ergo/blob/0410d85d5ebecfbaec2d44a9424d9f2e45defb6a/README.md), [complete tree](https://github.com/hyper-light/ergo/tree/0410d85d5ebecfbaec2d44a9424d9f2e45defb6a), [license](https://github.com/hyper-light/ergo/blob/0410d85d5ebecfbaec2d44a9424d9f2e45defb6a/LICENSE).
