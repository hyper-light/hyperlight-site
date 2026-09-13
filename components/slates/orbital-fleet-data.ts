import type { ProofStep } from "../proof-work/proof-figure";
import { fleetSource } from "./fleet-data";

export const orbitalFleetSources = {
  architecture:
    "https://github.com/hyper-light/slates/blob/3aa6b85c155ba4269614b5e5d3c053e28dd3c787/docs/wip/SLATES_DESIGN.md#L335-L498",
  durability: fleetSource,
} as const;

export const orbitalFleetAgents = [
  { id: "agent-1", label: "AGENT 1", edit: "format=webp", task: "WebP format" },
  { id: "agent-2", label: "AGENT 2", edit: "cache=on", task: "Enable cache" },
  { id: "agent-3", label: "AGENT 3", edit: "+ WebP test", task: "Add a test" },
] as const;

/** Lifecycle position is separate from the scene's clock: idle hardware can
 * keep moving without repeating a submission or changing a committed head. */
const phase = (position: number, start: number, end: number) =>
  Math.max(0, Math.min(1, (position - start) / (end - start)));

export function orbitalFleetState(selection: number) {
  const position = Number.isFinite(selection)
    ? Math.max(0, Math.min(7, selection))
    : 0;
  const stage = Math.floor(position);
  const agents = orbitalFleetAgents.map((agent, index) => {
    const provisionProgress = phase(
      position,
      0.08 + index * 0.14,
      0.7 + index * 0.14,
    );
    // The long-range carrier clears the central launch corridor first. The
    // side departures then follow without passing through a waiting craft.
    const deployProgress = phase(
      position,
      [1.16, 1.3, 1.02][index],
      [1.8, 1.98, 1.8][index],
    );
    const editProgress = phase(
      position,
      2.08 + index * 0.14,
      2.7 + index * 0.14,
    );
    const submitProgress = phase(
      position,
      3.08 + index * 0.18,
      3.48 + index * 0.18,
    );
    const checkProgress = phase(
      position,
      4.08 + index * 0.32,
      4.3 + index * 0.32,
    );
    return {
      ...agent,
      index,
      provisionProgress,
      deployProgress,
      editProgress,
      submitProgress,
      checkProgress,
      provisioned: provisionProgress === 1,
      deployed: deployProgress === 1,
      edited: editProgress === 1,
      submitted: submitProgress === 1,
      checked: checkProgress === 1,
    };
  });
  const checkedCount = agents.filter((agent) => agent.checked).length;
  const homeProgress = phase(position, 5.08, 5.9);
  const homeVerified = homeProgress === 1;
  const mirrorProgress = phase(position, 6.06, 6.74);
  const mirrorVerified = homeVerified && mirrorProgress === 1;
  const replyProgress = mirrorVerified ? phase(position, 6.8, 7) : 0;
  const reply = replyProgress === 1;

  return {
    position,
    stage,
    agents,
    checkedCount,
    // Checks build a candidate prefix. None of its version references is
    // committed before the required holders have verified reachable content.
    acceptedCount: homeVerified ? checkedCount : 0,
    candidateVersion: `v${checkedCount}`,
    headVersion: homeVerified ? "v3" : "v0",
    homeProgress,
    homeVerified,
    mirrorProgress,
    mirrorVerified,
    replyProgress,
    reply,
    diskChanged: false,
    testsPassed: false,
  } as const;
}

export type OrbitalFleetState = ReturnType<typeof orbitalFleetState>;

export const orbitalFleetSteps: ProofStep[] = [
  {
    label: "Base",
    title: "One starting version, three agents",
    description:
      "Three agents are updating an image service. They start from the same captured version, v0. The large station owns this shared volume; other volumes can have other owners.",
    facts: [
      { label: "Starting files", value: "Captured v0" },
      { label: "Shared volume", value: "One owner" },
    ],
  },
  {
    label: "Provision",
    title: "Give each agent its own filesystem",
    description:
      "Slates creates three private VFS workspaces, shown as starfighters leaving the station. Each starts by referencing v0’s unchanged content. Creating a workspace does not copy the whole repository.",
    facts: [
      { label: "Private workspaces", value: "3" },
      { label: "Unchanged content", value: "Shared references" },
    ],
  },
  {
    label: "Deploy",
    title: "Work on separate machines",
    description:
      "Each satellite runs an autonomous agent with its assigned workspace. A remote worker fetches and verifies content as it needs it. The craft stays with that worker while the agent edits its private files.",
    facts: [
      { label: "Agents", value: "Separate worker nodes" },
      { label: "Shared head", value: "Still v0" },
    ],
  },
  {
    label: "Edit",
    title: "Three agents make three concrete changes",
    description:
      "Agent 1 sets format=webp. Agent 2 changes cache=off to cache=on. Agent 3 adds a WebP test. Each edit changes only that agent’s workspace; the others keep their original files.",
    facts: [
      { label: "Private edits", value: "Format · cache · test" },
      { label: "Shared files", value: "Unchanged" },
    ],
  },
  {
    label: "Submit",
    title: "Send the changes back to the volume’s owner",
    description:
      "The agents submit their recorded edits and sealed content. The small packets carry those changes back; the workspaces stay at the satellites. Submitting does not give a worker permission to overwrite the shared version.",
    facts: [
      { label: "In transit", value: "Edits + changed content" },
      { label: "Shared head", value: "Still v0" },
    ],
  },
  {
    label: "Merge",
    title: "Combine the changes in order",
    description:
      "The owner checks Agent 1, then Agent 2, then Agent 3 against the preceding result. These edits are compatible, forming candidate versions v1, v2 and v3. The owner still has to place their content before committing those versions.",
    facts: [
      { label: "Candidate history", value: "v1 → v2 → v3" },
      { label: "Commit", value: "Waiting for copies", tone: "pending" },
    ],
  },
  {
    label: "Replicate",
    title: "Keep the files needed to recover the result",
    description:
      "The required home-region holders receive missing content and verify it. Only then can the owner commit the versions through v3. This request also requires a regional mirror, so the final reply waits for that copy too.",
    facts: [
      { label: "Home copies", value: "Verified through v3", tone: "pass" },
      { label: "Requested mirror", value: "Still waiting", tone: "pending" },
    ],
  },
  {
    label: "Ready",
    title: "Return one exact version for the next step",
    description:
      "The mirror verifies the history and content through v3, and the owner replies. The agents now have a shared version containing all three changes. Run checks against that version; accepting file edits does not prove the service works. Writing it to disk needs separate human approval.",
    facts: [
      { label: "Shared result", value: "v3 · mirror verified", tone: "pass" },
      { label: "Source directory", value: "Unchanged" },
    ],
  },
];
