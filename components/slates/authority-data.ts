import type { ProofStep } from "../proof-work/proof-figure";
import { runtimePhase } from "./runtime-drawing";

/** Illustrative register history: f=1, candidates A/B/C, committed v7 at A+B. */
export const authorityHistory = {
  candidates: ["A", "B", "C"],
  committed: "v7",
  previousEpoch: 4,
  nextEpoch: 5,
  commitHolders: ["A", "B"],
  promiseHolders: ["B", "C"],
  quorum: 2,
} as const;

export const authoritySteps: ProofStep[] = [
  {
    label: "Own",
    title: "A commits version 7",
    description:
      "A owns the register under epoch 4. Version 7 committed at A and B: two acknowledgements from three eligible candidates. C can still hold an older version.",
  },
  {
    label: "Suspect",
    title: "A stops responding",
    description:
      "A stops answering probes. The probe times out and client writes wait. Failure detection supplies evidence to the regional council; it does not make B a writer. The ownership epoch has not changed.",
  },
  {
    label: "Authorize",
    title: "Authorize a replacement owner",
    description:
      "The regional council commits ownership epoch 5 and delivers it to B and C. The surviving holders install the new fence and reject older owners for all affected objects. B still has to recover the accepted state before serving requests.",
  },
  {
    label: "Adopt",
    title: "Recover the accepted version",
    description:
      "B and C return their promised records under epoch 5. B’s record carries version 7 from the earlier commit; C still reports version 6. The replacement recovers version 7 from the overlapping commit and recovery quorums. Reading the records does not yet enable writes.",
  },
  {
    label: "Serve",
    title: "B resumes service",
    description:
      "B recommits the recovered version to B and C under epoch 5. With acknowledgements, a confirmed serving lease, and the content available, client writes go to B and receive a reply. The recovered files are still at version 7.",
  },
  {
    label: "Refuse",
    title: "Reject writes from the previous owner",
    description:
      "A resumes with epoch 4. Holders that installed epoch 5 return StaleEpoch, preventing A from gathering enough acknowledgements to commit a write. B and C completed recovery while A was unavailable; its return does not restore permission to write.",
  },
];

export function authorityState(selection: number) {
  const position = Math.max(0, Math.min(5, selection));
  return {
    suspicion: runtimePhase(position, 0.15, 1),
    authorization: runtimePhase(position, 1.15, 2),
    adoption: runtimePhase(position, 2.15, 3),
    service: runtimePhase(position, 3.15, 4),
    staleArrival: runtimePhase(position, 4.1, 4.85),
    refusal: runtimePhase(position, 4.85, 5),
    epoch: position >= 2 ? 5 : 4,
    owner: position >= 4 ? "B" : position >= 2 ? null : "A",
    adoptedVersion: position >= 3 ? "v7" : null,
    servedVersion: position >= 4 ? "v7" : null,
    holderFences: { B: position >= 2 ? 5 : 4, C: position >= 2 ? 5 : 4 },
    rejected: position >= 5,
  } as const;
}

/** Repeating demonstrations within a selected protocol state. This clock never
 * changes the owner, epoch, accepted version, or quorum membership. */
export function authorityActivity(time: number, selection: number) {
  const cycle = (seconds: number) =>
    (((Math.max(0, time) / seconds) % 1) + 1) % 1;
  const held = (stage: number) =>
    1 - runtimePhase(Math.abs(selection - stage), 0, 0.22);
  const own = cycle(4),
    suspect = cycle(3.6),
    authorize = cycle(4),
    adopt = cycle(4),
    serve = cycle(4),
    refuse = cycle(3.4);
  const transfer = (
    stage: number,
    clock: number,
    from: number,
    to: number,
  ) => ({
    progress: Math.max(0, Math.min(1, (clock - from) / (to - from))),
    opacity:
      held(stage) *
      runtimePhase(clock, from, from + 0.025) *
      (1 - runtimePhase(clock, to - 0.025, to)),
  });
  const packets = {
    ownWrite: transfer(0, own, 0.02, 0.24),
    ownCopy: transfer(0, own, 0.26, 0.43),
    ownAck: transfer(0, own, 0.45, 0.62),
    ownReply: transfer(0, own, 0.65, 0.95),
    suspectProbe: transfer(1, suspect, 0.02, 0.35),
    authorizeB: transfer(2, authorize, 0.02, 0.48),
    authorizeC: transfer(2, authorize, 0.2, 0.66),
    adoptB: transfer(3, adopt, 0.02, 0.34),
    adoptC: transfer(3, adopt, 0.16, 0.48),
    adoptContent: transfer(3, adopt, 0.55, 0.95),
    serveCopy: transfer(4, serve, 0.02, 0.2),
    serveAck: transfer(4, serve, 0.22, 0.36),
    serveWrite: transfer(4, serve, 0.39, 0.65),
    serveReply: transfer(4, serve, 0.67, 0.97),
    refusedWrite: transfer(5, refuse, 0.02, 0.43),
    refusedReply: transfer(5, refuse, 0.58, 0.94),
  };
  const stage = Math.max(0, Math.min(5, Math.round(selection)));
  const caption = [
    own < 0.26
      ? "Client writes v7 to A"
      : own < 0.45
        ? "A copies v7 to B"
        : own < 0.65
          ? "A + B acknowledge v7"
          : "Committed reply to client",
    suspect < 0.35
      ? "Probe sent to A"
      : suspect < 0.65
        ? "Waiting for A’s reply…"
        : "Probe timed out · writes wait",
    authorize < 0.48
      ? "Council sends epoch 5"
      : authorize < 0.68
        ? "Install epoch 5 at B and C"
        : "Fenced · not serving yet",
    adopt < 0.5 ? "Read both promised records" : "Recover v7 into B",
    serve < 0.22
      ? "Recommit v7 from B to C"
      : serve < 0.38
        ? "B + C acknowledge epoch 5"
        : serve < 0.67
          ? "Client writes to B"
          : "B replies under epoch 5",
    refuse < 0.45
      ? "A sends an epoch-4 write"
      : refuse < 0.58
        ? "Epoch-5 fence rejects it"
        : "StaleEpoch reply · no commit",
  ][stage];
  return {
    packets,
    caption,
    own: held(0),
    suspect: held(1),
    authorize: held(2),
    adopt: held(3),
    serve: held(4),
    refuse: held(5),
    probeWait:
      held(1) *
      runtimePhase(suspect, 0.35, 0.4) *
      (1 - runtimePhase(suspect, 0.94, 1)),
    probeExpired:
      held(1) *
      runtimePhase(suspect, 0.62, 0.68) *
      (1 - runtimePhase(suspect, 0.94, 1)),
    timer: Math.max(0, Math.min(1, (suspect - 0.35) / 0.3)),
    fenceB:
      held(2) *
      runtimePhase(authorize, 0.44, 0.5) *
      (1 - runtimePhase(authorize, 0.91, 1)),
    fenceC:
      held(2) *
      runtimePhase(authorize, 0.63, 0.69) *
      (1 - runtimePhase(authorize, 0.91, 1)),
    blocked:
      held(5) *
      runtimePhase(refuse, 0.4, 0.46) *
      (1 - runtimePhase(refuse, 0.56, 0.62)),
  };
}
