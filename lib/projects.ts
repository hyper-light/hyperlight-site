export type ProjectStatus = "Available" | "In development" | "In design";

export interface Project {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  category: string;
  language: string | null;
  status: ProjectStatus;
  repository: string;
  featured: boolean;
  overview: string[];
  features: { title: string; description: string }[];
  links?: { label: string; href: string }[];
}

export const projects: Project[] = [
  {
    slug: "vorpal",
    name: "Vorpal",
    tagline: "Code intelligence, swift and sharp.",
    description:
      "A codebase, understood through its structure. Knowledge graphs, structural search, and hybrid semantic search in one binary.",
    category: "Code intelligence",
    language: "Rust",
    status: "Available",
    repository: "https://github.com/hyper-light/vorpal",
    featured: true,
    overview: [
      "Vorpal turns source code into a queryable knowledge graph. Ask who calls a function, what implements an interface, or where a behavior lives. Its 49 built-in tree-sitter grammars extract definitions and relationships, while confidence labels make the limits of resolution visible.",
      "The same engine combines structural search and rewriting with hybrid semantic search. Use the CLI directly, connect a coding agent through MCP, or work through the Python, Node.js, and WebAssembly packages. Incremental indexing keeps repeated exploration practical as a repository changes.",
    ],
    features: [
      {
        title: "Follow the structure",
        description:
          "Explore callers, references, imports, implementations, and types through relationships extracted from the syntax tree.",
      },
      {
        title: "Search with context",
        description:
          "Combine name matching, semantic similarity, and graph signals, or match precise code shapes with structural patterns.",
      },
      {
        title: "Meet agents where they work",
        description:
          "Expose code intelligence through a built-in MCP server, with source spans and compact, paginated query results.",
      },
    ],
    links: [
      {
        label: "Getting started",
        href: "https://github.com/hyper-light/vorpal/blob/main/docs/getting-started.md",
      },
      {
        label: "Releases",
        href: "https://github.com/hyper-light/vorpal/releases",
      },
    ],
  },
  {
    slug: "focal",
    name: "Focal",
    tagline: "Coordination with evidence.",
    description:
      "A durable ledger for agents to request work, report results, and verify what was done. Clear acceptance criteria, inspectable proof.",
    category: "Agent coordination",
    language: "Rust",
    status: "In development",
    repository: "https://github.com/hyper-light/focal",
    featured: true,
    overview: [
      "Focal records the agreements behind collaborative work: who requested it, who took responsibility, which evidence came back, and how it was checked. Claims carry acceptance requirements. Participants author testaments, attach artifacts, and record validations against that evidence.",
      "One binary contains the service, CLI, and MCP server. The local claim-and-evidence workflow, restart recovery, durable retries, and cluster joining are implemented. Focal has no release yet; automatic placement, archival and restore, and multi-region operation remain in development.",
    ],
    features: [
      {
        title: "State the agreement",
        description:
          "Direct work to a participant with explicit acceptance requirements and declared dependencies.",
      },
      {
        title: "Keep the evidence",
        description:
          "Attach work products and diagnostics to an authored result, including failed work, so the record remains inspectable.",
      },
      {
        title: "Derive completion",
        description:
          "Record designated checks against exact evidence and derive satisfaction from the stated requirements.",
      },
    ],
    links: [
      {
        label: "CLI guide",
        href: "https://github.com/hyper-light/focal/blob/main/docs/manual-cli.md",
      },
      {
        label: "Implementation status",
        href: "https://github.com/hyper-light/focal/blob/main/docs/REMAINING.md",
      },
    ],
  },
  {
    slug: "slates",
    name: "Slates",
    tagline: "Room for every agent to work.",
    description:
      "Isolated workspaces in memory, with snapshots and precise merge conflicts. Fearless parallelism for your agent's work.",
    category: "Agent workspaces",
    language: "Rust",
    status: "In development",
    repository: "https://github.com/hyper-light/slates",
    featured: true,
    overview: [
      "Slates gives coding agents separate work volumes backed by memory. A volume can read untouched files from an existing directory while keeping its changes in an overlay. Snapshots and clones share a starting point, and submissions describe the edits an agent made.",
      "The merge engine accepts disjoint changes, recognizes an edit already present, or returns the exact conflicting byte ranges. The daemon, CLI, macOS mounts, local merge engine, landing plans, MCP server, and async Python and Node.js SDKs work today. Releases, Linux and Windows mounts, disk-write grants, and fleet integration are still in development.",
    ],
    features: [
      {
        title: "Separate the work",
        description:
          "Create work volumes from a shared starting point, with changes held in memory and snapshots available for cloning.",
      },
      {
        title: "Make collisions explicit",
        description:
          "Merge recorded operations and return precise byte ranges when changes overlap, preserving the work that needs a decision.",
      },
      {
        title: "Use familiar tools",
        description:
          "Mount volumes via battle-tested FUSE VFS, all controllable via CLI, MCP server, and SDKs.",
      },
    ],
    links: [
      {
        label: "CLI guide",
        href: "https://github.com/hyper-light/slates/blob/main/docs/cli.md",
      },
    ],
  },
  {
    slug: "hyperscale",
    name: "Hyperscale",
    tagline: "Testing at the cutting edge.",
    description:
      "Performance and integration testing expressed as workflows. Multiple protocols, live feedback, and flexible reporting.",
    category: "Performance testing",
    language: "Python",
    status: "Available",
    repository: "https://github.com/hyper-light/hyperscale",
    featured: false,
    overview: [
      "Hyperscale lets you write your tests like integration tests, compose them like end-to-end tests, and execute them at the scale and speed of performance tests. Combine different clients in a single workflow to exercise your full stack, then send the results where you want via thirty-one reporting options.",
      "The framework includes FTP, HTTP, HTTP/2, HTTP/3, SMTP, SFTP, TCP, UDP, and WebSocket clients, with additional integrations such as GraphQL(H2), Playwright, and gRPC available as extras.",
    ],
    features: [
      {
        title: "Write the workflow",
        description:
          "Write tests as a workflows using simple, async Python and type-hints.",
      },
      {
        title: "Push the limits",
        description:
          "Use multiple protocol clients in the same workflow to test every layer of your stack at thousands or tens of thousands of VUs per test.",
      },
      {
        title: "Run the same anywhere",
        description:
          "Execute your tests locally, via a small cluster, or globally-distributed installation the same way. Hyperscale's Lightwire wire protocol has you covered.",
      },
    ],
    links: [
      { label: "Python package", href: "https://pypi.org/project/hyperscale/" },
    ],
  },
  {
    slug: "hecate",
    name: "Hecate",
    tagline: "Multi-agent orchestration and magic.",
    description:
      "The multi-agent harness for work at any scale, local or distributed, built on Hyperlight's stack.",
    category: "Agent systems",
    language: "Rust",
    status: "In design",
    repository: "https://github.com/hyper-light/hecate",
    featured: false,
    overview: [
      "Hecate is a multi-agent collaborative and adversarial harness that makes the most of frontier coding agents while not restricting you to environment or developer whim. Hecate doesn't prescribe, it learns you, your code, and your goals - then pushes toward them ruthlessly.",
      "Hecate is built on top of Hyperlight's cutting edge stack of tools and infrastructure, ensuring you're always at the cutting edge of what agents can do without vendor lock-in.",
    ],
    features: [
      {
        title: "Anti-slop by design",
        description:
          "Hecate doesn't just encourage agents to push back on one-another, build on Focal and Slates it enforces it as part of its architecture.",
      },
      {
        title: "User first, user always.",
        description:
          "Unlike other frontier coding agents, Hecate provides a single pane-of-glass to view and control agents, keeping the human (you) in the loop.",
      },
    ],
    links: [
      {
        label: "Architecture",
        href: "https://github.com/hyper-light/hecate/blob/main/CONTEXT.md",
      },
      {
        label: "Design status",
        href: "https://github.com/hyper-light/hecate/blob/main/docs/GAPS.md",
      },
    ],
  },
  {
    slug: "veil",
    name: "Veil",
    tagline: "Secrets on demand.",
    description:
      "Just-in-time secrets injection and secrets control for agents, locally or across distributed systems.",
    category: "Agent secrets",
    language: null,
    status: "In design",
    repository: "https://github.com/hyper-light/veil",
    featured: false,
    overview: [
      "Veil provides just-in-time secrets injection, generation, rotation, and control for you and your agents. Never leak an API key to Claude again.",
      "Offering AWS secrets-manager compatible APIs with HashiCorp Vault-like grouping and segmentation.",
    ],
    features: [],
  },
  {
    slug: "mantle",
    name: "Mantle",
    tagline: "File-system and object store for exabyte scale.",
    description:
      "Robust and performant, Mantle is the object store and filesystem your agents always wanted.",
    category: "Distributed storage",
    language: null,
    status: "In design",
    repository: "https://github.com/hyper-light/mantle",
    featured: false,
    overview: [
      "Mantle is the bedrock for your agents, a distributed object store and filesystem designed for the multi-modal work your agents do.",
      "Based on Meta's legendary TectonicFS, Mantle is innately designed for exabyte-scale work, ensuring your agents always have access to whatever comes their way.",
    ],
    features: [],
  },
  {
    slug: "hex",
    name: "Hex",
    tagline: "Agent scheduling orchestration for infinite scale.",
    description:
      "Provision, manage, and scale, wicked fast.",
    category: "Agent compute",
    language: null,
    status: "In design",
    repository: "https://github.com/hyper-light/hex",
    featured: false,
    overview: [
      "Designed to provision at the scale of millions of agents in a single cluster, Hex embraces the best aspects of well-tested schedulers to facilitate fast and fault-tolerant provisioning of microvms and containers.",
      "Hex is the brain your agents need to tackle the hardest problems at any size.",
    ],
    features: [],
  },
  {
    slug: "shards",
    name: "Shards",
    tagline: "Unleash your agents. Isolation at-scale.",
    description:
      "Hybrid microVM/container environments to give your agents room to build, test, and break. Built ground up.",
    category: "Execution environments",
    language: null,
    status: "In design",
    repository: "https://github.com/hyper-light/shards",
    featured: false,
    overview: [
      "Shards gives your agents dedicated microVMs and containers for the code they need to run. Bring the tools and dependencies the job calls for, then let the agent get to work.",
      "Quick experiments, unfamiliar codebases, full builds—agent work gets messy. Shards gives that work its own runtime and an explicit execution boundary, so experimentation doesn't require sharing the host's environment.",
    ],
    features: [],
  },
  {
    slug: "athame",
    name: "Athame",
    tagline: "Your agents. Your rules.",
    description:
      "Identity, access, and policy for agents—with you calling the shots.",
    category: "Identity and access",
    language: null,
    status: "In design",
    repository: "https://github.com/hyper-light/athame",
    featured: false,
    overview: [
      "More agents shouldn't mean less control. Athame brings identity, access, and policy into your agent stack, putting you in charge of who can reach which resources and what they're allowed to do there.",
      "A patch review and a production rollout don't need the same permissions. Athame makes that difference explicit, letting you delegate more work while retaining control over your systems.",
    ],
    features: [],
  },
  {
    slug: "reliquary",
    name: "Reliquary",
    tagline: "Build once. Equip every agent.",
    description:
      "An artifact registry that puts your best agents and skills in everyone's hands.",
    category: "Artifact registry",
    language: null,
    status: "In design",
    repository: "https://github.com/hyper-light/reliquary",
    featured: false,
    overview: [
      "Reliquary turns your agent toolkit into something the whole team can use. Publish agent and skill artifacts to a shared registry, ready to find and bring into the next project.",
      "A hard-won review workflow shouldn't disappear into one developer's setup. Package the skill, share it, and let other agents build on it. Good tooling compounds when everyone can reach it.",
    ],
    features: [],
  },
  {
    slug: "hoard",
    name: "Hoard",
    tagline: "Cutting edge caching and pub-sub.",
    description:
      "Redis and Valkey compatible caching that keeps your agents working instead of waiting.",
    category: "Caching",
    language: null,
    status: "In design",
    repository: "https://github.com/hyper-light/hoard",
    featured: false,
    overview: [
      "Your agents have better things to do than fetch the same data again. Hoard caches repeated lookups and shared data, cutting unnecessary round trips and taking pressure off the services behind them.",
      "Redis and Valkey compatibility brings familiar clients and caching patterns to your agent stack. Put the data your agents keep reaching for in the cache, and let the next task reuse what the last one already fetched.",
    ],
    features: [],
  },
  {
    slug: "quiver",
    name: "Quiver",
    tagline: "The cornerstone for an event-driven world.",
    description:
      "SQS-style work queues that keep your agent fleet busy, from one task to a mountain of work.",
    category: "Work queues",
    language: null,
    status: "In design",
    repository: "https://github.com/hyper-light/quiver",
    featured: false,
    overview: [
      "Quiver puts SQS-style queues behind your agent workforce. Load up coding tasks, batch jobs, and background work for available agents to pick up, without waiting for a particular worker to be ready.",
      "A burst of work shouldn't dictate how many agents you run all day. Quiver separates incoming demand from execution, giving your agents a backlog to work through as capacity becomes available.",
    ],
    features: [],
  },
  {
    slug: "clarion",
    name: "Clarion",
    tagline: "Sound the call. Notifications made easy.",
    description: "Easy mass-scale AWS SNS-style notifications for agents and humans.",
    category: "Notifications",
    language: null,
    status: "In design",
    repository: "https://github.com/hyper-light/clarion",
    featured: false,
    overview: [
      "Clarion brings mass-scale notifications to your agent fleet. When a job finishes or something changes, give the next agent a signal to act on instead of another reason to poll.",
      "Build workflows that react. A completed build can call for a review; a changed resource can prompt another task. Clarion supplies the notification, and your orchestrator decides how to respond.",
    ],
    features: [],
  },
  {
    slug: "grid",
    name: "Grid",
    tagline: "Keep your agents connected.",
    description:
      "Private networking that connects your agent fleet and puts you in control of who can reach it.",
    category: "Networking",
    language: null,
    status: "In design",
    repository: "https://github.com/hyper-light/grid",
    featured: false,
    overview: [
      "Grid connects your agents to the tools, services, and storage they depend on. It brings hyperplane networking, virtual private clouds, routing, and security groups together as the networking layer of your agent infrastructure.",
      "Give workloads their own networks and connect them to the services they need. You choose which connections cross those boundaries, keeping access under your control as your agent fleet grows.",
    ],
    features: [],
  },
  {
    slug: "ergo",
    name: "Ergo",
    tagline: "Bring on the traffic.",
    description:
      "High-performance L4/L7 load balancing that puts your backend fleet to work.",
    category: "Load balancing",
    language: null,
    status: "In design",
    repository: "https://github.com/hyper-light/ergo",
    featured: false,
    overview: [
      "Ergo takes the front line when your agents put services under pressure. L4/L7 load balancing distributes connections and application requests across the backends that handle them, putting more of your infrastructure to work.",
      "Give agents one service to call while you add capacity behind it. More backends can share the load without making every agent track where each request should go.",
    ],
    features: [],
  },
];

export function getProject(slug: string): Project | undefined {
  return projects.find((project) => project.slug === slug);
}
