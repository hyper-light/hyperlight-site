import type { ProofStep } from "../proof-work/proof-figure";
import type { ProofTone } from "../proof-work/proof-geometry";
import { orbitalFleetSteps } from "./orbital-fleet-data";

export type OrbitalScenario =
  | "success"
  | "conflict"
  | "missing"
  | "unavailable"
  | "reply-loss"
  | "owner-loss";

export const orbitalScenarios: { value: OrbitalScenario; label: string }[] = [
  { value: "success", label: "Compatible changes" },
  { value: "conflict", label: "Conflicting agent edits" },
  { value: "missing", label: "A missing content chunk" },
  { value: "unavailable", label: "Content unavailable" },
  { value: "reply-loss", label: "The reply is lost" },
  { value: "owner-loss", label: "The owner fails" },
];

export type OrbitalTrafficRoute =
  | "worker1Out"
  | "worker2Out"
  | "worker3Out"
  | "worker1Back"
  | "worker2Back"
  | "worker3Back"
  | "homeOut"
  | "homeBack"
  | "mirrorOut"
  | "mirrorBack"
  | "holdersOut"
  | "holdersBack"
  | "staleOut"
  | "worker1ToHome"
  | "homeToWorker1";
export type OrbitalStoryState = {
  position: number;
  stage: number;
  caption: string;
  footer: string;
  ownerName: string;
  ownerStatus: string;
  homeName: string;
  homeStatus: string;
  mirrorName: string;
  mirrorStatus: string;
  workerReadouts: [string, string, string];
  workerTones: [ProofTone, ProofTone, ProofTone];
  ownerTone: ProofTone;
  homeTone: ProofTone;
  mirrorTone: ProofTone;
  ownerDisabled: number;
  homeDisabled: number;
  mirrorDisabled: number;
  checks: [number, number, number];
  traffic: Partial<
    Record<
      OrbitalTrafficRoute,
      { progress: number; tone: ProofTone; loss?: number }
    >
  >;
  epoch: number;
  serving: "owner" | "home" | "none";
  chunkState: "complete" | "missing" | "received" | "verified" | "unavailable";
  commitVersion: string;
  requestId: string;
  replyReceived: boolean;
};

const step = (
  label: string,
  title: string,
  description: string,
): ProofStep => ({ label, title, description });

const conflictSteps = [
  step(
    "Base",
    "Two agents start from quality=80",
    "Agent 1 and Agent 2 already have private workspaces from v0. The owner is the only node that can change the shared version. Agent 3 is not part of this conflicting edit.",
  ),
  step(
    "Edit",
    "Both agents replace the same two bytes",
    "Agent 1 changes 80 to 90. Agent 2 changes those same bytes to 60. Neither private edit changes the other workspace or the shared file.",
  ),
  step(
    "Accept 1",
    "Agent 1’s edit becomes v1",
    "The owner checks the first submission. Required holders receive and verify its content before the owner commits v1: quality=90. Agent 2 still has its v0-based 60.",
  ),
  step(
    "Conflict",
    "Return the conflicting text to Agent 2",
    "The owner compares base 80, accepted 90 and proposed 60 at the same range. It returns those windows instead of replacing 90. Agent 2 keeps its private 60; the accepted version stays v1.",
  ),
  step(
    "Read head",
    "Start fresh work from the accepted version",
    "Agent 2 reads the returned conflict and v1, then creates a fresh workspace from v1. This new work starts at 90. An unresolved overlapping edit cannot be forced through by rebasing it.",
  ),
  step(
    "Revise",
    "Choose a new edit deliberately",
    "Agent 2, optionally with a human reviewer, chooses 85 and checks the revised change. Slates does not calculate an average. The new operation replaces 90 with 85 against v1.",
  ),
  step(
    "Resubmit",
    "Submit the revision against v1",
    "Agent 2 sends its revised operation and sealed content to the owner. Sending the request does not advance the shared head. The owner must check the current version again.",
  ),
  step(
    "Accept 2",
    "Accept the revised edit as v2",
    "In this run no further overlapping edit arrived. After checking and placing the revised content, the owner accepts v2: quality=85 and replies. Another intervening edit could cause another conflict. The source directory remains unchanged.",
  ),
];

const missingSteps = [
  step(
    "Offer",
    "A candidate version needs another verified copy",
    "The owner has candidate v3, but the shared head is still v0. It offers the candidate’s content manifest to the home holders. The receiver must have the referenced bytes before acknowledging placement.",
  ),
  step(
    "Missing",
    "Identify the exact absent chunk",
    "The receiving holder already has chunks A and C, but lacks B. It returns B’s content identity. Reusing A and C avoids transferring content already present; an empty slot is not a valid copy of B.",
  ),
  step(
    "Request",
    "Ask an existing holder for B",
    "The receiver requests B from a node that retains it. The request names immutable content, not a mutable file path. No placement acknowledgement has been issued.",
  ),
  step(
    "Transfer",
    "Deliver B into reserved space",
    "The retaining holder sends B. Receiving bytes is not yet proof that they are the requested bytes. The candidate remains uncommitted while verification is pending.",
  ),
  step(
    "Verify",
    "Verify B and the complete referenced content",
    "The receiver verifies the chunk’s content hash and confirms that everything required by the candidate is available. A mismatched chunk is rejected, not renamed to make it fit.",
  ),
  step(
    "Acknowledge",
    "Confirm the required home copies",
    "The required distinct holders now acknowledge verified placement. A repeated response from one holder does not count as another copy. The owner can proceed with the version records.",
  ),
  step(
    "Commit",
    "Commit the candidate as shared v3",
    "The owner commits the ordered versions through v3 using the required record acknowledgements. This run requests home-region protection only; it does not claim that a remote mirror is ready.",
  ),
  step(
    "Ready",
    "Reply with the version the agents can use",
    "The owner returns v3. The agents can run application checks against that exact result. Repairing a missing replica did not bypass merge checks or approve writing the version to the source directory.",
  ),
];

const unavailableSteps = [
  missingSteps[0],
  missingSteps[1],
  missingSteps[2],
  step(
    "Retry",
    "Try another eligible content source",
    "The first request cannot supply B. Slates tries another retained source within the request’s budget. A temporary missing copy can be repaired when another valid source remains reachable.",
  ),
  step(
    "Exhausted",
    "No available source supplies B",
    "This run reaches its retry limit without the required chunk. It does not infer B’s bytes, substitute zeros, or lower the placement requirement. An unavailable source is not evidence that a valid copy was received.",
  ),
  step(
    "Refuse",
    "Do not acknowledge an incomplete replica",
    "The receiver reports that placement cannot complete. The owner cannot publish the candidate as a version protected by those holders. Retrying later is useful only if a valid source or sufficient capacity becomes available.",
  ),
  step(
    "Keep head",
    "Leave the previous accepted version intact",
    "The shared head remains v0; candidate v3 was never committed. Agent work is not rewritten to hide the failed placement. This is a failed attempt to place a new candidate, not a claim that v0’s retained content disappeared.",
  ),
  step(
    "Unavailable",
    "Return the failure instead of a false success",
    "The caller receives an unavailable result. If every retained RAM copy of required content was lost, a retry cannot recreate it: recovery needs an independent export or approved disk copy. The source directory is unchanged.",
  ),
];

const replySteps = [
  step(
    "Send",
    "Send snapshot request R17",
    "Agent 1 asks the owner for a snapshot. R17 identifies this operation within its authenticated origin and client. The transport session carries the request, but its session ID is not the operation’s identity.",
  ),
  step(
    "Execute",
    "Create snapshot S7 once",
    "The owner creates S7 for R17. This operation saves a version; it does not make another edit or increment the shared head. The client still has not received the result.",
  ),
  step(
    "Record",
    "Retain the effect and its result together",
    "R17’s completion records S7 together with the completed effect. This is the result the owner must return if the same outstanding request is retried.",
  ),
  step(
    "Lose reply",
    "Lose the response, not the completed snapshot",
    "The reply is lost when the session fails. The caller cannot conclude that the operation failed to run. S7 and the saved R17 result remain at the owner.",
  ),
  step(
    "Reconnect",
    "Open a replacement authenticated session",
    "The peer reconnects. The new connection has a new session identity, but the authenticated origin, client and operation sequence for R17 remain the same.",
  ),
  step(
    "Retry",
    "Resend R17 within its retry budget",
    "Agent 1 retries the original request identity. It does not create R18 to guess whether R17 succeeded. The owner looks for R17’s retained completion before executing another effect.",
  ),
  step(
    "Recall",
    "Find the original S7 result",
    "The owner finds R17 → S7 and sends that result on the replacement session. Packet acknowledgements handle delivery; the completion record prevents another snapshot from being created.",
  ),
  step(
    "Complete",
    "Receive S7, not a second snapshot",
    "The caller receives the original snapshot ID. Retry budgets and completion-retirement rules still apply; this is not an unlimited replay cache. The source directory and shared file content have not changed.",
  ),
];

const ownerSteps = [
  step(
    "Committed",
    "A and B retain committed v3",
    "Owner A serves v3 under epoch 4. A and B acknowledged the commit; C may still hold v2. For this scenario B and C are eligible holders in the same home region, not votes from two different regions.",
  ),
  step(
    "Suspect",
    "A stops answering; writes wait",
    "A direct probe times out, triggering indirect probes and suspicion. These observations do not grant B permission to write. The previously committed v3 remains recorded; the client waits for a legal serving owner.",
  ),
  step(
    "Authorize",
    "The regional council authorizes epoch 5",
    "The regional council commits takeover authority for B under epoch 5. This is a configuration decision, separate from the failed probe. B cannot serve simply because it has received the new epoch.",
  ),
  step(
    "Fence",
    "Fence the departed owner at surviving holders",
    "B and C install the committed epoch-5 fence for A’s affected objects. Old epoch-4 requests cannot form a new legal commit quorum. Recovery does not need a response from the powered-off A.",
  ),
  step(
    "Promise",
    "Obtain two distinct authorized promises",
    "B collects promises from B and C. That set intersects the earlier commit set A and B, so B’s accepted v3 is included even if C reports v2. One holder’s repeated response is not a second promise.",
  ),
  step(
    "Recover",
    "Recover v3 and supply C’s missing content",
    "B adopts the highest accepted values consistent with the committed prefix and ensures the referenced content is available. In this run B retains v3 and sends what C lacks. Choosing the largest version number alone would not be sufficient.",
  ),
  step(
    "Recommit",
    "Recommit the recovered state under epoch 5",
    "B and C accept the recovered v3 records under epoch 5. Even unchanged file bytes need the new acceptance epoch. B is not yet shown serving until content, acknowledgements and its serving authority are confirmed.",
  ),
  step(
    "Serve",
    "Resume through B with confirmed authority",
    "B can now serve the recovered v3. Clients route to B rather than starting another independent writer. If two authorized holders or the required content were unavailable, this run would have to stop instead of weakening the quorum.",
  ),
  step(
    "Refuse",
    "Reject the former owner’s epoch-4 write",
    "A returns and sends an old-epoch request. The installed fence rejects it with StaleEpoch. Answering a probe again does not restore A’s right to write. B remains the serving owner of v3; the source directory is unchanged.",
  ),
];

export function orbitalScenarioSteps(scenario: OrbitalScenario): ProofStep[] {
  switch (scenario) {
    case "success":
      return orbitalFleetSteps;
    case "conflict":
      return conflictSteps;
    case "missing":
      return missingSteps;
    case "unavailable":
      return unavailableSteps;
    case "reply-loss":
      return replySteps;
    case "owner-loss":
      return ownerSteps;
  }
}

const phase = (position: number, start: number, end: number) =>
  Math.max(0, Math.min(1, (position - start) / (end - start)));
const neutralWorkers: [ProofTone, ProofTone, ProofTone] = [
  "neutral",
  "neutral",
  "neutral",
];

export function orbitalScenarioState(
  scenario: OrbitalScenario,
  selection: number,
): OrbitalStoryState | null {
  if (scenario === "success") return null;
  const last = orbitalScenarioSteps(scenario).length - 1;
  const position = Number.isFinite(selection)
    ? Math.max(0, Math.min(last, selection))
    : 0;
  const stage = Math.floor(position);
  // During travel into a selected step, name the action in progress, not the
  // previous completed step. Protocol changes still use their causal cutoffs.
  const shown = Math.min(last, Math.ceil(position));
  const state: OrbitalStoryState = {
    position,
    stage,
    caption: "",
    footer: "SOURCE DISK UNCHANGED",
    ownerName: "VOLUME OWNER",
    ownerStatus: "SHARED v0",
    homeName: "HOME COPIES",
    homeStatus: "v0 · retained",
    mirrorName: "REGIONAL MIRROR",
    mirrorStatus: "Not requested",
    workerReadouts: ["W1 · ready", "W2 · ready", "W3 · observing"],
    workerTones: [...neutralWorkers],
    ownerTone: "neutral",
    homeTone: "neutral",
    mirrorTone: "neutral",
    ownerDisabled: 0,
    homeDisabled: 0,
    mirrorDisabled: 0,
    checks: [0, 0, 0],
    traffic: {},
    epoch: 4,
    serving: "owner",
    chunkState: "complete",
    commitVersion: "v0",
    requestId: "",
    replyReceived: false,
  };
  const packet = (
    route: OrbitalTrafficRoute,
    start: number,
    end: number,
    tone: ProofTone = "pending",
    loss?: number,
  ) => {
    state.traffic[route] = {
      progress: phase(position, start, end),
      tone,
      ...(loss === undefined ? {} : { loss }),
    };
  };

  if (scenario === "conflict") {
    const edited = position >= 0.9,
      first = position >= 1.94,
      returned = position >= 2.94;
    const fresh = position >= 3.94,
      revised = position >= 4.92,
      submitted = position >= 5.92,
      accepted = position >= 6.94;
    state.caption = [
      "SAME BASE · QUALITY 80",
      "TWO AGENTS REPLACE THE SAME 80",
      "ACCEPT AGENT 1 · SHARED v1",
      "RETURN THE CONFLICT TO AGENT 2",
      "READ v1 · CREATE FRESH WORK",
      "CHOOSE 85 · REVISE THE EDIT",
      "RESUBMIT AGAINST v1",
      "ACCEPT REVISION · SHARED v2",
    ][shown];
    state.workerReadouts = [
      first
        ? "W1 · 90 accepted v1"
        : edited
          ? "W1 · 80 → 90"
          : "W1 · base v0 · 80",
      accepted
        ? "W2 · 85 accepted v2"
        : submitted
          ? "W2 · submit 90 → 85"
          : revised
            ? "W2 · choose 85"
            : fresh
              ? "W2 · fresh v1 · 90"
              : returned
                ? "W2 · 80 / 90 / 60"
                : edited
                  ? "W2 · 80 → 60"
                  : "W2 · base v0 · 80",
      "W3 · no conflicting edit",
    ];
    state.workerTones = [
      first ? "pass" : "pending",
      accepted ? "pass" : returned && !fresh ? "fail" : "pending",
      "neutral",
    ];
    state.commitVersion = accepted ? "v2" : first ? "v1" : "v0";
    state.ownerStatus = accepted
      ? "v2 · quality=85"
      : first
        ? "v1 · quality=90"
        : "v0 · quality=80";
    state.ownerTone = returned && !fresh ? "fail" : first ? "pass" : "neutral";
    state.homeStatus = accepted
      ? "v2 · verified"
      : first
        ? "v1 · verified"
        : "v0 · retained";
    state.homeTone = first ? "pass" : "neutral";
    state.checks = [
      phase(position, 1.45, 1.94),
      accepted ? 1 : submitted ? phase(position, 6.1, 6.6) : 0,
      0,
    ];
    state.footer = accepted
      ? "v2 · QUALITY 85 · SOURCE DISK UNCHANGED"
      : returned && !fresh
        ? "CONFLICT · SHARED 90 · PRIVATE 60"
        : first
          ? "SHARED v1 · AGENT 2 MUST REVISE"
          : "SHARED v0 · TWO PRIVATE EDITS";
    state.replyReceived = position >= 6.995;
    packet("worker1Out", 1.04, 1.4);
    packet("worker1Back", 1.95, 2, "pass");
    if (position < 4) {
      packet("worker2Out", 2.04, 2.5);
      packet("worker2Back", 2.56, 2.94, "fail");
      if (position > 3) packet("worker2Back", 3.08, 3.94, "pending");
      packet("homeOut", 1.46, 1.7);
      packet("homeBack", 1.72, 1.92, "pass");
    } else {
      packet("worker2Out", 5.08, 5.92);
      packet("worker2Back", 6.945, 6.995, "pass");
      packet("homeOut", 6.1, 6.58);
      packet("homeBack", 6.62, 6.9, "pass");
    }
    return state;
  }

  if (scenario === "missing" || scenario === "unavailable") {
    const unavailable = scenario === "unavailable";
    const missing = position >= 0.94,
      received = !unavailable && position >= 2.96;
    const verified = !unavailable && position >= 3.94,
      acknowledged = !unavailable && position >= 4.94;
    const committed = !unavailable && position >= 5.96,
      exhausted = unavailable && position >= 3.94,
      refused = unavailable && position >= 4.94;
    state.caption = (
      unavailable
        ? [
            "OFFER CANDIDATE v3",
            "HOLDER IS MISSING CHUNK B",
            "REQUEST THE MISSING CHUNK",
            "TRY ANOTHER CONTENT SOURCE",
            "NO SOURCE SUPPLIES CHUNK B",
            "REFUSE INCOMPLETE PLACEMENT",
            "KEEP THE ACCEPTED HEAD AT v0",
            "UNAVAILABLE · NO FALSE SUCCESS",
          ]
        : [
            "OFFER CANDIDATE v3",
            "HOLDER IS MISSING CHUNK B",
            "REQUEST THE MISSING CHUNK",
            "TRANSFER B · NOT YET VERIFIED",
            "VERIFY B AND REFERENCED CONTENT",
            "ACKNOWLEDGE THE VERIFIED COPIES",
            "COMMIT SHARED v3",
            "RETURN THE VERIFIED RESULT",
          ]
    )[shown];
    state.chunkState = exhausted
      ? "unavailable"
      : verified
        ? "verified"
        : received
          ? "received"
          : "missing";
    state.commitVersion = committed ? "v3" : "v0";
    state.ownerStatus = committed
      ? "SHARED v3"
      : refused
        ? "v0 · candidate refused"
        : "v3 candidate · head v0";
    state.ownerTone = refused ? "fail" : committed ? "pass" : "pending";
    state.homeStatus = exhausted
      ? "B absent; no ACK"
      : acknowledged
        ? "ABC verified ACK"
        : verified
          ? "ABC verified"
          : received
            ? "B · checking"
            : missing
              ? "A _ C · B absent"
              : "Check manifest";
    state.homeTone = exhausted ? "fail" : verified ? "pass" : "pending";
    state.replyReceived = position >= 6.98;
    state.workerReadouts = [
      unavailable && state.replyReceived
        ? "W1 · unavailable"
        : state.replyReceived
          ? "W1 · received v3"
          : committed
            ? "W1 · await reply"
            : "W1 · await placement",
      "W2 · private work kept",
      "W3 · private work kept",
    ];
    state.workerTones = [
      state.replyReceived ? (unavailable ? "fail" : "pass") : "pending",
      "neutral",
      "neutral",
    ];
    state.checks = [missing ? 1 : 0, received ? 1 : 0, acknowledged ? 1 : 0];
    state.footer = refused
      ? "HEAD v0 KEPT · SOURCE DISK UNCHANGED"
      : committed
        ? "SHARED v3 · SOURCE DISK UNCHANGED"
        : "CANDIDATE v3 · NO PLACEMENT ACK YET";
    if (acknowledged && !committed)
      state.footer = "VERIFIED COPIES · COMMIT STILL PENDING";
    packet("homeOut", 0.06, 0.55);
    packet("homeBack", 0.6, 0.94, "error");
    if (position > 1) packet("homeBack", 1.08, 1.94, "pending");
    if (unavailable) {
      packet("homeOut", 2.06, 2.8, "fail", 1);
      packet("mirrorOut", 2.12, 2.82, "pending");
      packet("mirrorBack", 2.86, 3.92, "fail", 1);
      if (position >= 4) packet("homeBack", 4.08, 4.94, "fail");
      packet("worker1Back", 6.06, 6.98, "fail");
      state.mirrorStatus =
        position >= 3.94
          ? "B unavailable"
          : position > 2
            ? "Try retained source"
            : "Not yet queried";
      state.mirrorTone = exhausted ? "fail" : "pending";
    } else {
      if (position >= 2) packet("homeOut", 2.08, 2.96, "pending");
      if (position >= 4) packet("homeBack", 4.08, 4.94, "pass");
      if (position >= 5) {
        packet("homeOut", 5.04, 5.55, "pass");
        packet("homeBack", 5.6, 5.94, "pass");
      }
      packet("worker1Back", 6.06, 6.98, "pass");
    }
    return state;
  }

  if (scenario === "reply-loss") {
    const committed = position >= 0.96,
      lost = position >= 2.94,
      connected = position >= 3.94;
    const retried = position >= 4.94,
      recalled = position >= 5.94,
      complete = position >= 6.98;
    state.caption = [
      "SEND SNAPSHOT REQUEST R17",
      "CREATE S7 ONCE",
      "SAVE R17 → S7 WITH ITS EFFECT",
      "THE REPLY IS LOST",
      "RECONNECT · KEEP R17",
      "RETRY THE ORIGINAL REQUEST",
      "FIND THE SAVED S7 RESULT",
      "RETURN S7 · NO SECOND SNAPSHOT",
    ][shown];
    state.requestId = "R17";
    state.commitVersion = "v3";
    state.replyReceived = complete;
    state.ownerStatus = committed ? "R17 → S7 · saved" : "v3 · waiting for R17";
    state.ownerTone = committed ? "pass" : "pending";
    state.homeStatus = "v3 · retained";
    state.workerReadouts = [
      complete
        ? "W1 · received S7"
        : recalled
          ? "W1 · reply coming"
          : retried
            ? "W1 · retried R17"
            : connected
              ? "W1 · new session · R17"
              : lost
                ? "W1 · result unknown"
                : "W1 · request R17",
      "W2 · work unchanged",
      "W3 · work unchanged",
    ];
    state.workerTones = [
      lost && !connected ? "fail" : complete ? "pass" : "pending",
      "neutral",
      "neutral",
    ];
    state.footer = complete
      ? "ONE S7 · SOURCE DISK UNCHANGED"
      : committed
        ? "S7 EXISTS · A LOST REPLY IS NOT ROLLBACK"
        : "SNAPSHOT REQUEST · SOURCE DISK UNCHANGED";
    // Record highlights the completion already saved atomically with S7;
    // it does not delay completion persistence until this explanatory stage.
    state.checks = [
      committed ? 1 : 0,
      position >= 1.94 ? 1 : 0,
      recalled ? 1 : 0,
    ];
    packet("worker1Out", 0.06, 0.8);
    if (position < 4) packet("worker1Back", 2.06, 2.94, "fail", 1);
    else {
      packet("worker1Out", 4.06, 4.94);
      packet("worker1Back", 6.06, 6.98, "pass");
    }
    return state;
  }

  const failed = position >= 0.22,
    authorized = position >= 1.96,
    fenced = position >= 2.96;
  const promised = position >= 3.96,
    recovered = position >= 4.96,
    recommitted = position >= 5.96;
  const serving = position >= 6.96,
    staleRejected = position >= 7.94;
  state.caption = [
    "A + B HOLD v3 · EPOCH 4",
    "PROBE TIMEOUT · WRITES WAIT",
    "COUNCIL AUTHORIZES EPOCH 5",
    "B + C FENCE THE PREVIOUS OWNER",
    "COLLECT TWO DISTINCT PROMISES",
    "RECOVER v3 · FILL C’S MISSING DATA",
    "RECOMMIT v3 UNDER EPOCH 5",
    "B RESUMES WITH CONFIRMED AUTHORITY",
    "REJECT A’S STALE EPOCH-4 WRITE",
  ][shown];
  state.ownerName = authorized ? "PREVIOUS OWNER A" : "VOLUME OWNER A";
  state.homeName = authorized ? "REPLACEMENT OWNER B" : "HOME HOLDER B";
  state.mirrorName = "HOME HOLDER C";
  state.epoch = authorized ? 5 : 4;
  state.serving = serving ? "home" : failed ? "none" : "owner";
  state.commitVersion = "v3";
  state.ownerDisabled =
    phase(position, 0.05, 0.85) * (1 - phase(position, 7.06, 7.5));
  state.ownerStatus = staleRejected
    ? "E4 rejected · StaleEpoch"
    : position > 7
      ? "E4 · returns without rights"
      : fenced
        ? "E4 · fenced"
        : failed
          ? "E4 · no response"
          : "E4 · serves v3";
  state.ownerTone = failed ? "fail" : "pass";
  state.homeStatus = serving
    ? "E5 · serves v3"
    : recommitted
      ? "v3 E5 · wait"
      : recovered
        ? "v3 recovered"
        : promised
          ? "2 promises · v3"
          : fenced
            ? "E5 · fenced"
            : authorized
              ? "E5 grant · wait"
              : "E4 · v3 retained";
  state.mirrorStatus = recommitted
    ? "E5 · v3 accepted"
    : recovered
      ? "v3 bytes verified"
      : promised
        ? "E5 promise · v2"
        : fenced
          ? "E5 fence installed"
          : "E4 · v2 retained";
  state.homeTone = serving ? "pass" : "pending";
  state.mirrorTone = recovered ? "pass" : "pending";
  state.chunkState = recovered ? "verified" : promised ? "missing" : "complete";
  state.workerReadouts = [
    serving
      ? "W1 · route to B"
      : failed
        ? "W1 · writes waiting"
        : "W1 · route to A",
    "W2 · private work kept",
    "W3 · private work kept",
  ];
  state.workerTones = [serving ? "pass" : "pending", "neutral", "neutral"];
  state.checks = [fenced ? 1 : 0, promised ? 1 : 0, recommitted ? 1 : 0];
  state.footer = staleRejected
    ? "B SERVES v3 · A CANNOT COMMIT"
    : serving
      ? "B SERVES v3 · SOURCE DISK UNCHANGED"
      : failed
        ? "v3 RETAINED · NO NEW WRITER YET"
        : "A SERVES v3 · SOURCE DISK UNCHANGED";
  state.replyReceived = position >= 7;
  packet("worker1Out", 0.06, 0.8, "error", 1);
  packet("homeBack", 0.25, 0.68, "error", 1);
  packet("holdersOut", 0.69, 0.98, "error");
  if (position >= 2) packet("holdersOut", 2.08, 2.96, "pending");
  packet("holdersBack", 3.08, 3.96, "pending");
  if (position >= 4) packet("holdersOut", 4.08, 4.92, "pending");
  if (position >= 5) {
    packet("holdersOut", 5.06, 5.54, "pass");
    packet("holdersBack", 5.58, 5.96, "pass");
  }
  packet("worker1ToHome", 6.04, 6.65, "pending");
  packet("homeToWorker1", 6.97, 7, "pass");
  packet("staleOut", 7.08, 7.94, "fail", 1);
  return state;
}
