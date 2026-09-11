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
      "Isolated workspaces in memory, with snapshots and precise merge conflicts. Let parallel work come together deliberately.",
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
          "Mount volumes on macOS through its built-in NFS client, or use the CLI, MCP server, and async language SDKs.",
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
    tagline: "Test the whole interaction.",
    description:
      "Performance and integration testing expressed as async Python workflows. Multiple protocols, live feedback, and flexible reporting.",
    category: "Performance testing",
    language: "Python",
    status: "Available",
    repository: "https://github.com/hyper-light/hyperscale",
    featured: false,
    overview: [
      "Hyperscale expresses test scenarios as Python workflow classes with asynchronous actions. Combine different clients in a workflow to exercise interactions across an application, then run the tests through a CLI with live execution statistics in the terminal.",
      "The framework includes HTTP, HTTP/2, HTTP/3, SMTP, TCP, UDP, and WebSocket clients, with additional integrations such as Playwright and gRPC available as extras. JSON and CSV reporting are included, with optional reporters and custom metrics extending how results are collected.",
    ],
    features: [
      {
        title: "Describe the scenario",
        description:
          "Write async actions inside Python workflow classes, expressing dependencies and client interactions in ordinary code.",
      },
      {
        title: "Exercise the stack",
        description:
          "Use multiple protocol clients in the same workflow, with optional browser and gRPC integrations.",
      },
      {
        title: "Watch and report",
        description:
          "Follow live terminal statistics and send results to built-in or optional reporters, including custom metrics.",
      },
    ],
    links: [
      { label: "Python package", href: "https://pypi.org/project/hyperscale/" },
    ],
  },
  {
    slug: "hecate",
    name: "Hecate",
    tagline: "An architecture for working together.",
    description:
      "A multi-agent coding harness being designed around isolated execution, durable coordination, and explicit validation.",
    category: "Agent systems",
    language: "Rust",
    status: "In design",
    repository: "https://github.com/hyper-light/hecate",
    featured: false,
    overview: [
      "Hecate explores how a group of coding agents can share work while keeping execution boundaries and responsibilities clear. The architecture specifies microVM isolation, a durable claims ledger, and a streaming merge gate with checks at both the increment and whole-work levels.",
      "This is an architecture and specification project. Its repository contains design documents and decisions; the implementation has not begun. Rust is the planned implementation language, and the published gap ledger distinguishes accepted designs from demonstrated behavior.",
    ],
    features: [
      {
        title: "Isolation by design",
        description:
          "The proposed pod combines a microVM boundary with separate containers for a primary agent and its Scribe companion.",
      },
      {
        title: "Validation before landing",
        description:
          "The design separates checks on individual increments from the whole-work requirements that gate a disk commit.",
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
    tagline: "Secrets, at the moment of need.",
    description:
      "An early project exploring just-in-time secrets for agents, locally or across distributed systems.",
    category: "Agent secrets",
    language: null,
    status: "In design",
    repository: "https://github.com/hyper-light/veil",
    featured: false,
    overview: [
      "Veil's stated direction is agentic just-in-time secrets, for local or distributed use. The project is at an early stage, with its purpose recorded in the repository introduction.",
      "The repository currently contains an introductory README and license. An implementation, supported integrations, and detailed operating model have not yet been published there.",
    ],
    features: [],
  },
  {
    slug: "mantle",
    name: "Mantle",
    tagline: "The foundation beneath the work.",
    description:
      "The storage foundation for agent work. A distributed filesystem and object store, currently in design.",
    category: "Distributed storage",
    language: null,
    status: "In design",
    repository: "https://github.com/hyper-light/mantle",
    featured: false,
    overview: [
      "Mantle is the bedrock: the foundation beneath the work. Its direction is a distributed filesystem and object store for agents, giving the things they create a place to live.",
      "The repository currently records that direction, not an implementation. Storage semantics, supported interfaces, and operating details are still to be designed and documented.",
    ],
    features: [],
  },
  {
    slug: "hex",
    name: "Hex",
    tagline: "Give the work somewhere to run.",
    description:
      "An agent runtime for provisioning, scheduling, and managing compute. The next layer is taking shape.",
    category: "Agent compute",
    language: null,
    status: "In design",
    repository: "https://github.com/hyper-light/hex",
    featured: false,
    overview: [
      "Agent work needs compute behind it. Hex is being designed around that responsibility: provisioning resources, scheduling work, and managing the runtime it uses.",
      "The repository establishes the project's direction. There is no runtime implementation yet, and supported environments, scheduling behavior, and operating interfaces have not been specified.",
    ],
    features: [],
  },
  {
    slug: "shards",
    name: "Shards",
    tagline: "A boundary around the work.",
    description:
      "MicroVM and container environments for agents. Separate places to run, with the boundaries considered from the start.",
    category: "Execution environments",
    language: null,
    status: "In design",
    repository: "https://github.com/hyper-light/shards",
    featured: false,
    overview: [
      "Shards explores the environments agents work inside. Its stated direction brings together microVMs and containers, making the execution boundary a first-class part of the system.",
      "This is an early design, not a shipping isolation layer. The repository contains an introduction; implementation, platform support, and security properties remain to be established.",
    ],
    features: [],
  },
  {
    slug: "athame",
    name: "Athame",
    tagline: "Make access a deliberate choice.",
    description:
      "Identity, access, and policy for agents. A project about who can act, and the boundaries around that authority.",
    category: "Identity and access",
    language: null,
    status: "In design",
    repository: "https://github.com/hyper-light/athame",
    featured: false,
    overview: [
      "An agent's ability to do something should not be the only thing deciding whether it may. Athame's direction is identity, access, and policy for agent systems.",
      "The project is at the beginning. Its repository records the purpose, with no implementation, policy language, authentication integrations, or enforcement guarantees published yet.",
    ],
    features: [],
  },
  {
    slug: "reliquary",
    name: "Reliquary",
    tagline: "A place for the things agents use.",
    description:
      "An artifact registry for agents and skills. A home for the pieces of work worth keeping and using again.",
    category: "Artifact registry",
    language: null,
    status: "In design",
    repository: "https://github.com/hyper-light/reliquary",
    featured: false,
    overview: [
      "Reliquary is being shaped as an artifact registry for agents and skills. The idea is simple: the things an agent uses deserve a place of their own, beyond the current conversation or working directory.",
      "The repository currently establishes that purpose. Artifact formats, distribution interfaces, and registry behavior have not yet been implemented or documented.",
    ],
    features: [],
  },
  {
    slug: "hoard",
    name: "Hoard",
    tagline: "Keep the next read close.",
    description:
      "A cache for agent workloads, with Redis and Valkey compatibility as its design direction.",
    category: "Caching",
    language: null,
    status: "In design",
    repository: "https://github.com/hyper-light/hoard",
    featured: false,
    overview: [
      "Hoard is about keeping frequently used data close to the work. Its stated direction is caching for agents, with compatibility with Redis and Valkey.",
      "That compatibility is a design goal, not a shipped guarantee. The repository is an early scaffold; commands, persistence, topology, and performance characteristics have not been established.",
    ],
    features: [],
  },
  {
    slug: "quiver",
    name: "Quiver",
    tagline: "Keep the work moving.",
    description:
      "Work queues built around agents. Hold the work, put it in ready hands, and keep track of what comes back.",
    category: "Work queues",
    language: null,
    status: "In design",
    repository: "https://github.com/hyper-light/quiver",
    featured: false,
    overview: [
      "Quiver is our rethink of the SQS-style work queue for agents. The aim is to make the whole journey legible: work arriving, an agent claiming it, and the result coming back.",
      "The project currently has an introductory README, not a queue implementation. Delivery, ordering, acknowledgement, and retry semantics remain to be designed and documented.",
    ],
    features: [],
  },
  {
    slug: "clarion",
    name: "Clarion",
    tagline: "Let the right signal through.",
    description:
      "Notifications for agents. A project about bringing attention to something that has changed.",
    category: "Notifications",
    language: null,
    status: "In design",
    repository: "https://github.com/hyper-light/clarion",
    featured: false,
    overview: [
      "Sometimes the useful next step is simply knowing that something happened. Clarion is an early project for agent notifications.",
      "The repository description establishes its direction. There is no implementation or published design yet; channels, subscriptions, and delivery behavior are still open questions.",
    ],
    features: [],
  },
  {
    slug: "grid",
    name: "Grid",
    tagline: "Private networks. Deliberate routes.",
    description:
      "A networking layer in design, covering hyperplane, virtual private clouds, routing, and security groups.",
    category: "Networking",
    language: null,
    status: "In design",
    repository: "https://github.com/hyper-light/grid",
    featured: false,
    overview: [
      "Grid brings hyperplane networking, virtual private clouds, routing, and security groups into one project. The goal is to give workloads a network of their own, with deliberate routes and access boundaries.",
      "The project currently establishes that scope. There’s no networking implementation yet; interfaces, supported environments, and traffic policies remain to be designed and documented.",
    ],
    features: [],
  },
  {
    slug: "ergo",
    name: "Ergo",
    tagline: "Direct traffic. Share the load.",
    description:
      "An L4/L7 load-balancing project for distributing traffic at the transport and application layers, with high performance as its design goal.",
    category: "Load balancing",
    language: null,
    status: "In design",
    repository: "https://github.com/hyper-light/ergo",
    featured: false,
    overview: [
      "Ergo is being designed to distribute traffic at both the transport layer (L4) and application layer (L7). Its focus is a high-performance load balancer for the services behind that traffic.",
      "The project is at its beginning. There’s no implementation or benchmark yet; balancing policies, supported protocols, and deployment details remain to be established.",
    ],
    features: [],
  },
];

export function getProject(slug: string): Project | undefined {
  return projects.find((project) => project.slug === slug);
}
