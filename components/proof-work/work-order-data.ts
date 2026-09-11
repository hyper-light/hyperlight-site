/** Fixed teaching example, not a record from a live ledger. */
export const workOrder = {
  claim: "C17",
  content: "parser-fix-a",
  requirements: [
    "Reject malformed escapes",
    "Preserve valid input",
    "Review the exact patch",
  ],
} as const;

export const workOrderSteps = [
  {
    label: "Draft",
    title: "Claim Creation",
    description:
      "The ledger records C17 and its acceptance requirements. It hasn't been posted, so the respondent can't pick it up yet.",
    facts: [
      { label: "Claim", value: "C17 · parser-fix-a" },
      { label: "State", value: "Generated", tone: "pending" as const },
      {
        label: "Work receipt",
        value: "Not acquired",
        tone: "pending" as const,
      },
      { label: "Acceptance", value: "Not evaluated", tone: "pending" as const },
    ],
  },
  {
    label: "Post",
    title: "Claim Posting",
    description:
      "The maintainer posts C17 through the ledger. The parser agent can read it there, but responsibility still needs a work receipt.",
    facts: [
      { label: "Claim", value: "C17 · parser-fix-a" },
      { label: "State", value: "Posted", tone: "pending" as const },
      {
        label: "Work receipt",
        value: "Not acquired",
        tone: "pending" as const,
      },
      { label: "Acceptance", value: "Not evaluated", tone: "pending" as const },
    ],
  },
  {
    label: "Accept",
    title: "Execution Receipt",
    description:
      "The parser agent acquires its receipt through the ledger. The recorded receipt establishes responsibility for C17, not whether its checks have passed.",
    facts: [
      { label: "Claim", value: "C17 · parser-fix-a" },
      { label: "State", value: "Received", tone: "pending" as const },
      { label: "Work receipt", value: "Parser agent · generation 1" },
      { label: "Acceptance", value: "Not evaluated", tone: "pending" as const },
    ],
  },
];
