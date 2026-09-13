import type { ProofStep } from "../proof-work/proof-figure";

export const fleetSource =
  "https://github.com/hyper-light/slates/blob/3aa6b85c155ba4269614b5e5d3c053e28dd3c787/docs/wip/SLATES_DESIGN.md#L1927-L2039";

/** Each region has its own illustrative f=1 placement, not a vote among regions. */
export function fleetPlacementState(selection: number) {
  const stage = Math.max(
    0,
    Math.min(4, Math.floor(Number.isFinite(selection) ? selection : 0)),
  );
  return {
    stage,
    homeVerified: stage >= 2 ? 2 : stage >= 1 ? 1 : 0,
    mirrorVerified: stage >= 4 ? 2 : stage >= 3 ? 1 : 0,
    homeHead: stage >= 2 ? "v7" : "v6",
    mirrorHead: stage >= 4 ? "v7" : "v6",
    reply: stage >= 4 ? "Mirror scope met" : "Mirror scope waiting",
    manifest: "H7",
  };
}

export const fleetSteps: ProofStep[] = [
  {
    label: "Route",
    title: "Send the request to the home region",
    description:
      "A request from Singapore reaches the volume's owner in Virginia. The requested durability scope includes a Frankfurt mirror. Sending a request does not make the client a content holder.",
    facts: [
      { label: "Requester", value: "Singapore" },
      { label: "Home / mirror", value: "Virginia / Frankfurt" },
      { label: "Requested scope", value: "Mirror" },
    ],
  },
  {
    label: "Seal",
    title: "Seal the content for replication",
    description:
      "The owner seals the new content as H7. Other machines receive its content list, reserve space, and report which chunks they lack. One local copy is not enough to publish the new version.",
    facts: [
      { label: "Home holders", value: "1 of 3 verified" },
      { label: "Home head", value: "v6" },
      { label: "Mirror head", value: "v6" },
    ],
  },
  {
    label: "Home",
    title: "Store two verified copies in Virginia",
    description:
      "A and B retain verified H7 content and its version record. Two of the three home machines now hold copies, enough to tolerate one failed machine (f=1). Virginia publishes v7, but the request still waits for the Frankfurt mirror.",
    facts: [
      { label: "Home holders", value: "2 of 3 verified", tone: "pass" },
      { label: "Home head", value: "v7" },
      { label: "Mirror scope", value: "Waiting", tone: "pending" },
    ],
  },
  {
    label: "Mirror",
    title: "Copy the content to Frankfurt",
    description:
      "Frankfurt receives the missing content and verifies it independently. It still has only one verified copy and needs two. Virginia's acknowledgements cannot count toward Frankfurt's quorum.",
    facts: [
      { label: "Home holders", value: "2 of 3 verified" },
      { label: "Mirror holders", value: "1 of 3 verified" },
      { label: "Mirror head", value: "v6", tone: "pending" },
    ],
  },
  {
    label: "Reply",
    title: "Confirm the copy in both regions",
    description:
      "M1 and M2 now hold H7 and the history through version 7. Each region meets its own two-copy requirement, so the caller receives confirmation at the requested mirror scope. The copies remain in RAM and still depend on surviving machines.",
    facts: [
      { label: "Home / mirror", value: "v7 / v7", tone: "pass" },
      { label: "Mirror holders", value: "2 of 3 verified", tone: "pass" },
      { label: "Reply", value: "Mirror scope met", tone: "pass" },
    ],
  },
];
