/** The public study collection. Every project has one deliberately distinct study. */
export const studies = [
  {
    id: "hyperlight",
    name: "Hyperlight",
    title: "Refraction",
    description: "One surface. A different light at every turn.",
  },
  {
    id: "vorpal",
    name: "Vorpal",
    title: "Trace",
    description: "Follow a connection. See what it opens up.",
  },
  {
    id: "focal",
    name: "Focal",
    title: "Convergence",
    description: "Independent signals. A shared point of focus.",
  },
  {
    id: "slates",
    name: "Slates",
    title: "Parallel",
    description: "Room to work apart. A way to come together.",
  },
  {
    id: "hecate",
    name: "Hecate",
    title: "Crossroads",
    description: "Separate paths, meeting with purpose.",
  },
  {
    id: "veil",
    name: "Veil",
    title: "Disclosure",
    description: "Light passes through. A little becomes visible.",
  },
  {
    id: "mantle",
    name: "Mantle",
    title: "Foundation",
    description: "The bedrock. Layers to build on.",
  },
  {
    id: "hyperscale",
    name: "Hyperscale",
    title: "Throughput",
    description: "Send the load. Follow the response.",
  },
  {
    id: "hex",
    name: "Hex",
    title: "Allocation",
    description: "A place for the work. Room for what comes next.",
  },
  {
    id: "shards",
    name: "Shards",
    title: "Containment",
    description:
      "A fleet of separate containers. Each with its own work inside.",
  },
  {
    id: "athame",
    name: "Athame",
    title: "Permission",
    description: "An identity. A boundary. A deliberate way through.",
  },
  {
    id: "reliquary",
    name: "Reliquary",
    title: "Collection",
    description: "Keep what matters. Find it when it is needed.",
  },
  {
    id: "hoard",
    name: "Hoard",
    title: "Locality",
    description: "The first read travels out. The next is already close.",
  },
  {
    id: "quiver",
    name: "Quiver",
    title: "Dispatch",
    description: "Work arrives, gets claimed, and makes room for the next.",
  },
  {
    id: "clarion",
    name: "Clarion",
    title: "Resonance",
    description: "A signal travels. The right things respond.",
  },
  {
    id: "grid",
    name: "Grid",
    title: "Routing",
    description: "Private spaces, connected by deliberate paths.",
  },
  {
    id: "ergo",
    name: "Ergo",
    title: "Distribution",
    description: "One incoming stream. The load shared across many paths.",
  },
] as const;

export type StudyId = (typeof studies)[number]["id"];

export function getStudy(id: string) {
  return studies.find((study) => study.id === id);
}
