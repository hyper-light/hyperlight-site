/** Illustrative identities, not measurements or records from a running ledger. */
export const cassetteArtifacts = [
  {
    id: "patch-a",
    label: "Patch",
    reference: "A / hA",
    slot: "01",
    detail: "The exact proposed change.",
  },
  {
    id: "tests-a",
    label: "Tests",
    reference: "L / hL",
    slot: "02",
    detail: "The recorded test report.",
  },
  {
    id: "repro-a",
    label: "Fixture",
    reference: "R / hR",
    slot: "03",
    detail: "The input that reproduces the bug.",
  },
] as const;

export const cassetteStates = [
  {
    label: "Artifacts",
    title: "Artifact Publication",
    description:
      "The Parser agent submits the patch, its test log and a reproduction input. The ledger retains each artifact's identity and digest. None has been accepted just because it is recorded.",
    detail: "Evidence recorded",
  },
  {
    label: "Close",
    title: "Frozen Manifest",
    description:
      "The Parser agent closes T8 against C17. Its bindings name A/hA, L/hL and R/hR. Closing freezes that account on the ledger; it does not post it or accept the work.",
    detail: "Bindings frozen",
  },
  {
    label: "Post",
    title: "Testament Posting",
    description:
      "The Parser agent posts T8. The ledger makes the account available for the Maintainer to receive. The original artifacts and their bindings stay on the ledger.",
    detail: "Posted; not received",
  },
  {
    label: "Receive",
    title: "Testament Receipt",
    description:
      "The Maintainer reads T8 from the ledger and records its receipt there. Receipt establishes delivery. The required checks still decide acceptance.",
    detail: "Received; checks pending",
  },
] as const;
