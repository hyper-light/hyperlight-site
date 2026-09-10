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
      "Hyperlight's bedrock. An early project focused on the foundation the rest is built on.",
    category: "Exploration",
    language: null,
    status: "In design",
    repository: "https://github.com/hyper-light/mantle",
    featured: false,
    overview: [
      "Mantle is the bedrock: the foundation beneath the work. The project is still in design; its detailed scope and implementation have not yet been documented in the repository.",
      "Follow the repository for the project's direction as it takes shape. There are no documented capabilities or installation instructions to present at this stage.",
    ],
    features: [],
  },
];

export function getProject(slug: string): Project | undefined {
  return projects.find((project) => project.slug === slug);
}
