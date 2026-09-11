import type { ProofStep } from "./proof-figure";

export const livenessGuardSource =
  "https://github.com/hyper-light/focal/blob/626b1b59fa286ba4093e96f481afe38b8b061ede/docs/archictecutre/24-placement-execution-and-fleet-control.md#12-liveness-probes-suspicion-extension-and-coordinates";
export const livenessGuardImplementation =
  "https://github.com/hyper-light/focal/blob/626b1b59fa286ba4093e96f481afe38b8b061ede/crates/focal-node/src/liveness/suspicion.rs";

/** A worked example. Reply time, incarnation and completed-tick witnesses are illustrative. */
export const livenessExample = {
  baseProbeMs: 300,
  healthyScore: 0,
  slowScore: 8,
  replyMs: 600,
  suspicionMinMs: 3124,
  suspicionMaxMs: 18744,
  confirmationTarget: 3,
  confirmations: 2,
  previousIncarnation: 7,
  incarnation: 8,
  previousWitness: 42,
  witness: 43,
  firstGrantMs: 3120,
  minGrantMs: 1000,
  maxGrants: 5,
  minGrantIntervalMs: 1000,
  graceReplyMs: 2000,
} as const;

export function healthMultiplier(score: number) {
  return 1 + Math.max(0, Math.min(8, score)) * 0.25;
}
export function suspicionDuration(confirmations: number) {
  const {
    suspicionMinMs: min,
    suspicionMaxMs: max,
    confirmationTarget: target,
  } = livenessExample;
  const ratio = Math.max(
    0,
    Math.min(1, Math.log(confirmations + 1) / Math.log(target + 1)),
  );
  return max - Math.round((max - min) * ratio);
}
export function extensionGrant(count: number) {
  if (count < 0 || count >= livenessExample.maxGrants) return 0;
  return Math.max(
    livenessExample.minGrantMs,
    Math.floor(livenessExample.firstGrantMs / 2 ** count),
  );
}

export const livenessGuardSteps: ProofStep[] = [
  {
    label: "Probe",
    title: "Observer Health Scaling",
    description:
      "A slow observer widens its own timeouts. In this example, a 300ms base becomes 900ms at health score 8, leaving room for an illustrative 600ms reply. A direct timeout still gets up to three indirect probes before suspicion.",
    facts: [
      { label: "Health multiplier", value: "1 + 0.25 × score · 1–3×" },
      { label: "Observer score", value: "0 healthy · 8 slow" },
      { label: "Indirect probes", value: "Up to 3 confirmed peers" },
    ],
  },
  {
    label: "Suspect",
    title: "Bounded Suspicion",
    description:
      "A confirmed member can be suspected after direct and indirect probes fail outside grace. Independent confirmations shorten the same deadline; repeated gossip doesn't restart it. Suspicion alone isn't a directory verdict.",
    facts: [
      { label: "Independent confirmations", value: "2 of 3 in this example" },
      { label: "Suspicion window", value: "18.744s → 6.365s · health 1×" },
      { label: "Timer start", value: "Unchanged by repeated gossip" },
    ],
  },
  {
    label: "Extend",
    title: "Witnessed Late Extension",
    description:
      "The slow target refutes incarnation 7 with Alive(8), clearing the old suspicion. It asks its accuser for grace with completed placement-loop tick witness 43. A granted 3.120s window protects against a new accusation; it isn't a leader election.",
    facts: [
      { label: "Request recipient", value: "The accuser, not a Raft leader" },
      { label: "Progress witness", value: "Placement-loop ticks · 42 → 43" },
      {
        label: "First default grant",
        value: "3,120ms · bounded grace",
        tone: "pass",
      },
    ],
  },
  {
    label: "Recover",
    title: "Reply Within Grace",
    description:
      "The example reply arrives 2s into the fixed 3.120s grace window. An acknowledgment or higher-incarnation Alive clears suspicion. Further grants require fresh progress, a one-period gap, and an available grant budget.",
    facts: [
      { label: "Member", value: "Alive · incarnation 8", tone: "pass" },
      { label: "Default grants", value: "3120 · 1560 · 1000 · 1000 · 1000ms" },
      { label: "Grant limit", value: "5 per incarnation" },
    ],
  },
  {
    label: "No progress",
    shortLabel: "No progress",
    title: "Extension Denial and Settled Failure",
    description:
      "Witness 43 again earns no extension. Capacity overload, rate limits and exhausted grants also deny one. If silence continues after grace, probes can start a new suspicion; only its expiry yields a settled Dead verdict for the partition leader to commit.",
    facts: [
      {
        label: "Request",
        value: "Witness 43 unchanged · denied",
        tone: "fail",
      },
      {
        label: "Failure path",
        value: "Grace ends → silence → suspicion expires",
      },
      { label: "Authority", value: "Directory verdict; Raft quorum unchanged" },
    ],
  },
];
