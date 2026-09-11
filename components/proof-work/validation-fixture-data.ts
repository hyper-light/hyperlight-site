export type FixtureArtifact = "A" | "B";
export type FixtureVerdict = "Pass" | "Fail" | "Error" | "Pending";
export type FixtureCheck = {
  check: "Tests" | "Review";
  artifact: FixtureArtifact | null;
  verdict: FixtureVerdict;
};
export type FixtureExample = {
  label: string;
  shortLabel: string;
  title: string;
  description: string;
  checks: readonly FixtureCheck[];
  missingSlot?: boolean;
  exhaustedErrors?: boolean;
};

export const fixtureExamples: readonly FixtureExample[] = [
  {
    label: "Same patch",
    shortLabel: "Same",
    title: "Matching Evidence",
    description:
      "The Maintainer tested and reviewed A. Its identity and digest match across the two results, so the patch has the required evidence for acceptance.",
    checks: [
      { check: "Tests", artifact: "A", verdict: "Pass" },
      { check: "Review", artifact: "A", verdict: "Pass" },
    ],
  },
  {
    label: "Mixed patches",
    shortLabel: "Mixed",
    title: "Mixed Evidence",
    description:
      "Tests passed on A; review passed on B. A still needs review, and B still needs tests. Neither patch is ready to accept.",
    checks: [
      { check: "Tests", artifact: "A", verdict: "Pass" },
      { check: "Review", artifact: "B", verdict: "Pass" },
    ],
  },
  {
    label: "Failed check",
    shortLabel: "Failed",
    title: "Failed Validation",
    description:
      "The tests failed on A. The passing review doesn't cancel that result; A doesn't meet the claim's requirements.",
    checks: [
      { check: "Tests", artifact: "A", verdict: "Fail" },
      { check: "Review", artifact: "A", verdict: "Pass" },
    ],
  },
  {
    label: "Missing",
    shortLabel: "Missing",
    title: "Missing Target",
    description:
      "The respondent closed its account without the required patch. Evaluation records the missing slot instead of running a check against a substitute.",
    missingSlot: true,
    checks: [
      { check: "Tests", artifact: null, verdict: "Pending" },
      { check: "Review", artifact: null, verdict: "Pending" },
    ],
  },
  {
    label: "Tool error",
    shortLabel: "Error",
    title: "Execution Error",
    description:
      "The test runner couldn't finish, and no permitted attempts remain. The diagnostic explains why the evaluator couldn't reach a verdict about A.",
    exhaustedErrors: true,
    checks: [
      { check: "Tests", artifact: "A", verdict: "Error" },
      { check: "Review", artifact: "A", verdict: "Pass" },
    ],
  },
];

/** This figure's two-check example, not a replacement for ledger aggregation. */
export function fixtureOutcome(example: FixtureExample) {
  if (example.missingSlot) return "Incomplete";
  if (example.checks.some((check) => check.verdict === "Fail")) return "Failed";
  if (example.exhaustedErrors) return "Errored";
  const witness = (["A", "B"] as const).find((artifact) =>
    (["Tests", "Review"] as const).every((required) =>
      example.checks.some(
        (check) =>
          check.check === required &&
          check.artifact === artifact &&
          check.verdict === "Pass",
      ),
    ),
  );
  return witness ? "Satisfied" : "Not satisfied";
}
