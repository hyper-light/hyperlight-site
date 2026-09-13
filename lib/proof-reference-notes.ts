import type { ReferenceNote } from "./reference-notes";

// Source-by-source evidence and pinned revisions: docs/research/proof-reference-notes.md.
export const proofReferenceNotes: Record<string, ReferenceNote> = {
  "agentic-proof-of-work:ledger": {
    title: "What the ledger records",
    explanation:
      "Hecate’s ledger records obligations, authored responses, evidence and acceptance decisions. Agent configuration, telemetry and filesystem contents belong to other systems; an artifact can identify evidence without making the ledger a filesystem.",
    example:
      "Claim: reject incomplete escapes\nArtifact: the proposed patch\nTestament: the respondent’s closing account\nValidation: the check against that patch",
  },
  "agentic-proof-of-work:peer": {
    title: "Who may evaluate a requirement",
    explanation:
      "The claim names the evaluator and fixes the validator contract before work begins. Asking a peer for advice does not transfer that authority: only the participant designated for the original requirement may submit its verdict.",
    example:
      "Maintainer asks reviewer for advice.\nReviewer returns a consultation response.\nMaintainer still submits the original verdict.",
  },
  "agentic-proof-of-work:claim-states": {
    title: "Progress does not complete a claim",
    explanation:
      "A generated claim becomes actionable when posted; an execution receipt then records the responsible respondent and its receipt generation. Progress and a closing testament advance the record, but satisfaction still requires passing acceptance checks and the declared dependencies.",
    example:
      "Generated → Posted → Received → Progressed\n“Patch written” leaves the claim open.",
  },
  "agentic-proof-of-work:object-states": {
    title: "Separate objects, separate receipts",
    explanation:
      "Claims, artifacts, testaments and validations have independent lifecycles. Taking responsibility for a claim, observing an artifact and receiving a posted testament record three different facts; none substitutes for an evaluation of the work.",
    example:
      "Execution receipt: I own this work.\nArtifact receipt: I observed this evidence.\nTestament receipt: I received this account.",
  },
  "agentic-proof-of-work:response-states": {
    title: "Closing a work cycle",
    explanation:
      "Closing a testament freezes its reported outcome and artifact bindings before posting and receipt. Failed or partial work still needs the respondent’s own account and real diagnostic evidence; the system does not invent a testament for an absent agent.",
    example:
      "Cycle 1: Partial + patch + diagnostic\nCycle 2: a separate testament and evidence\nNeither rewrites the first account.",
  },
  "agentic-proof-of-work:artifact-identity": {
    title: "What an artifact digest covers",
    explanation:
      "The versioned BLAKE3 definition hashes the artifact’s immutable description, including its namespace, schema, payload, producer and provenance. Its object ID is excluded from that content digest but included in a separate intent fingerprint, distinguishing equal content from the same creation request.",
    example:
      "Same immutable content, different artifact IDs:\nsame content digest; different intent fingerprints.",
  },
  "agentic-proof-of-work:identity-tests": {
    title: "Testing identity and field boundaries",
    explanation:
      "These tests change an artifact’s ID without changing its content digest, then verify that its retry identity changes. They also check that field boundaries matter: metadata ‘ab’ with payload ‘c’ must not hash like metadata ‘a’ with payload ‘bc’.",
    example: "metadata=ab, payload=c\n≠\nmetadata=a, payload=bc",
  },
  "agentic-proof-of-work:validation-states": {
    title: "Checks stay bound to one artifact",
    explanation:
      "Every Required check for a slot must pass on the same artifact ID and digest within one response. A requirement with programmatic and quality phases enters quality only after programmatic Pass; an agentic-only requirement starts directly in quality.",
    example:
      "Artifact A: behavior Pass, review pending\nArtifact B: review Pass, behavior pending\nNo artifact has passed both checks.",
  },
  "agentic-proof-of-work:aggregation-tests": {
    title: "A regression against combining incompatible passes",
    explanation:
      "The test gives one artifact a behavioral pass and review failure, and another the reverse. Aggregation must remain blocked; adjacent tests also reject a second result carrying the wrong artifact ID or digest.",
    example:
      "A: Pass / Fail\nB: Fail / Pass\nCombined result: blocked, not Pass / Pass",
  },
  "agentic-proof-of-work:validator-contract": {
    title: "Participants run the validators",
    explanation:
      "The ledger pins the validator definition, target and authorized evaluator; the participant resolves and runs the tool or skill in its own environment. Authenticating the submitted result proves who submitted it, not that an external program actually ran.",
    example:
      "Read context → begin check → run validator\n→ submit evidence and verdict\nIndependent execution proof must be required explicitly.",
  },
  "agentic-proof-of-work:test-report": {
    title: "What the test-report validator checks",
    explanation:
      "This validator parses a fixed report schema and evaluates the submitted counts, without launching a test runner. Any failed test yields Fail; zero passes yields Incomplete; otherwise the report passes, while malformed reports fail schema checking.",
    example:
      "passed=12, failed=0 → Pass\npassed=12, failed=1 → Fail\npassed=0, skipped=9 → Incomplete",
  },
  "agentic-proof-of-work:aggregation": {
    title: "Alternative evidence before a terminal decision",
    explanation:
      "Before committing a blocking outcome, aggregation checks for successful witnesses in responses already posted, received and evaluated. Different slots may use different successful responses, but a later response cannot repair a terminal claim and one slot cannot combine checks from different artifacts.",
    example:
      "A valid patch in T1 can cover the change slot.\nA valid log in T2 can cover the test-log slot.\nBoth witnesses must exist before terminal failure.",
  },
  "agentic-proof-of-work:dependencies": {
    title: "Waiting for success versus waiting for an answer",
    explanation:
      "DependsOn requires the target claim to be satisfied; Awaits only requires it to reach a terminal outcome. Satisfaction is computed from actual successful work and these predicates, so mutually waiting claims cannot manufacture success by referring to one another.",
    example:
      "DependsOn failed tests → acceptance blocked\nAwaits a refused consultation → wait complete",
  },
  "agentic-proof-of-work:scope": {
    title: "A terminal claim can still own unfinished work",
    explanation:
      "A claim’s owned scope tracks its child work and registered waits separately from its acceptance state. Releasing that scope requires disposing of every wait and releasing each child’s scope; cancelling a wait does not claim the observed work succeeded.",
    example:
      "Parent cancelled; child still running\n→ parent scope remains owned\nChild released and wait cancelled → scope can release",
  },
  "agentic-proof-of-work:request-identity": {
    title: "Retrying a committed request",
    explanation:
      "A request is identified by its authenticated principal, ledger, request epoch and request ID, with the command digest checked separately. An exact retained retry returns the original result; changed content conflicts, and expired history must resolve from a verified receipt or return RequestHistoryExpired.",
    example:
      "Same request + same command → original outcome\nSame request + changed command → conflict\nExpired, unverified history → no re-execution",
  },
  "agentic-proof-of-work:audit": {
    title: "Recording evaluations without evaluating them forever",
    explanation:
      "Evaluator result artifacts finish at Generated, and the claimant’s result testament finishes at Posted. These audit roles do not enter ordinary response acceptance, so recording a verdict does not recursively require another validator to approve that verdict.",
    example:
      "Work artifact → evaluation\nEvaluation → result artifact + result testament\nAudit records stop there.",
  },
  "agentic-proof-of-work:distribution-authority": {
    title: "Directories route; sessions order mutations",
    explanation:
      "The deployment root delegates bounded namespace ranges to directories, which locate sessions and their placements. Each session has its own Raft group and ordered history; splitting its materialized state does not create another independent authority for that session.",
    example:
      "Tenant + session → directory → session leader\nState ranges consume that session’s ordered log.",
  },
  "agentic-proof-of-work:range-movement": {
    title: "Moving a range through recorded steps",
    explanation:
      "Range movement records its intent, snapshot, barrier, readiness and activation in the session log so recovery resumes the committed step. After the barrier, writes touching the moving range return RangeMoving until activation; unrelated ranges can continue accepting eligible writes.",
    example:
      "Copy → catch up → barrier → ready → activate\nRestart at barrier → resume there, not from scratch",
  },
  "agentic-proof-of-work:range-publication": {
    title: "Publishing one complete session view",
    explanation:
      "A committed mutation becomes publicly visible only at a complete prefix across the required active state ranges. A coherent read pins every range to one session sequence and route epoch; it waits or retries rather than mixing new and old versions.",
    example:
      "Range A applied 42; range B applied 41\nPublished prefix: at most 41\nA view at 42 waits for B.",
  },
  "agentic-proof-of-work:session-boundaries": {
    title: "Where atomic graph decisions stop",
    explanation:
      "A session is the consistency boundary for its claim graph and ordered mutations. Cross-session cooperation uses explicit coordination and imported evidence with provenance, rather than unchecked dependency edges that pretend two independent logs share an atomic decision.",
    example:
      "Same session: atomic child/parent update\nDifferent sessions: publish evidence, import, coordinate",
  },
  "agentic-proof-of-work:durable-commit": {
    title: "Persistence comes before a normal reply",
    explanation:
      "A normal Committed reply waits for both durable quorum agreement and publication of the complete mutation. A separately named durable-submission receipt can precede materialization, but subsequent reads must carry its minimum sequence instead of assuming the change is already visible.",
    example:
      "Persist quorum → commit → publish → normal reply\nA lost reply does not prove the write failed.",
  },
  "agentic-proof-of-work:quorum-tests": {
    title: "A failed disk write cannot supply the missing vote",
    explanation:
      "This test injects a follower storage failure and checks that the leader still has no committed result. Its neighboring read test isolates a leader and verifies that retaining local disk state cannot produce a quorum-backed read receipt.",
    example:
      "Leader persists; follower persistence fails.\nNo other acknowledgment arrives.\nThe leader cannot report a committed write.",
  },
  "agentic-proof-of-work:global-placement": {
    title: "Replica count is not regional tolerance",
    explanation:
      "A failure promise depends on where voting replicas are placed, not just how many exist. One voter in each of three regions leaves a majority after any one region fails; placing two of three voters in one region cannot survive losing that region.",
    example:
      "Regions A/B/C: 1 + 1 + 1 → any one may fail\nRegions A/B:   2 + 1 → losing A loses quorum",
  },
  "agentic-proof-of-work:content-custody": {
    title: "Proving that required copies hold the evidence",
    explanation:
      "A content copy reports Durable only after verifying the complete object, and its receipt is bound to the current route epoch and policy revision. Beginning an artifact evaluation requires receipts from the currently required copies; a transfer request alone is not custody.",
    example:
      "Placement adds copy C.\nOld A/B receipts do not prove C holds the patch.\nVerify current copies before beginning evaluation.",
  },
  "agentic-proof-of-work:failover-authority": {
    title: "A new leader must also have a readable view",
    explanation:
      "Serving authority requires both a current quorum-backed read barrier and the necessary published state. The publication coordinator is fenced by the leader’s term and route epoch, so old progress acknowledgments cannot make a replacement view authoritative.",
    example:
      "Elected leader → ReadIndex → complete prefix\n→ pin that version → answer\nElection alone does not make a replica read-ready.",
  },
  "agentic-proof-of-work:checkpoint-recovery": {
    title: "Recovering state without rerunning the work",
    explanation:
      "A checkpoint names the complete session state at one published prefix, including required range roots and replay metadata. Recovery verifies it and applies the committed log suffix, preserving recorded evaluation results instead of rerunning their validators.",
    example:
      "Verified checkpoint at 40 + committed 41…46\n→ recovered view at 46\nThe recorded parser-test result stays recorded.",
  },
  "agentic-proof-of-work:disaster-recovery": {
    title: "A backup does not inherit live authority automatically",
    explanation:
      "Continuing a backup’s old incarnation requires the same cluster and revocation of every other old member’s enrollment. Otherwise restore requires explicit acknowledgment of a new recovery incarnation with a different log identity; it cannot silently become the old session’s legitimate replacement.",
    example:
      "Old members not all fenced\n→ require --new-incarnation\nSame retained history; different authority lineage",
  },
  "agentic-proof-of-work:placement-tests": {
    title: "What the three-process placement test establishes",
    explanation:
      "The qualification expands a session to three real processes over QUIC, kills and restarts the controller during the plan, and checks a quorum read with one host stopped. It exercises restartable placement and node loss, not measured performance between distant regions.",
    example:
      "Plan 3 voters → kill controller → restart\n→ activation completes from committed state\nStop one host → quorum read still succeeds",
  },
  "agentic-proof-of-work:range-limits": {
    title: "Range serving still retains the whole session",
    explanation:
      "At the cited revision, both voters and additional serving holders materialize the full session state. Moving reads to holders distributes serving work, but does not yet establish that each holder needs memory only for its assigned range.",
    example: "More serving holders ≠ less session state per holder",
  },
  "agentic-proof-of-work:control-limits": {
    title: "The founder remains a control-plane dependency",
    explanation:
      "The cited control implementation splits directory metadata into bounded partitions, but hosts their one-voter control groups on the founder. Splitting those records therefore bounds each partition without distributing the founder’s total state or removing that host dependency.",
    example:
      "Partition A + partition B on the same founder\n→ separate metadata owners, same host dependency",
  },
  "agentic-proof-of-work:custody-limits": {
    title: "Verified copies are not yet a failure-domain proof",
    explanation:
      "Custody checks verify the content copies required by the active placement. At this revision, they do not independently weigh those copies against the requested node, zone or region failures, so a satisfied copy obligation is not that additional topology proof.",
    example:
      "Two verified copies in one region\nprove possession, not survival of that region’s loss.",
  },
  "agentic-proof-of-work:liveness-probes": {
    title: "An unanswered probe is not always evidence of failure",
    explanation:
      "The detector tries direct and indirect probes before suspecting a previously confirmed member. A busy probe lane, unavailable route or peer refusal is inconclusive, so local inability to send does not become an accusation that the remote host died.",
    example:
      "Direct + indirect unanswered → possible suspicion\nLocal lane busy → inconclusive",
  },
  "agentic-proof-of-work:liveness-health": {
    title: "A slow observer gives peers more time",
    explanation:
      "The local health score rises on probe timeouts, self-refutations and late ticks, and falls on successful probes or answers. It saturates at eight and scales detector timeouts by 1 + 0.25 × score, from one to three times the baseline.",
    example: "Score 0 → 1×\nScore 4 → 2×\nScore 8 → 3×",
  },
  "agentic-proof-of-work:liveness-contract": {
    title: "Confirming and refuting a suspicion",
    explanation:
      "Independent confirmations shorten a suspicion’s existing deadline toward its minimum; repeated gossip does not restart the timer. A suspected host can answer with a higher incarnation to clear the old accusation, distinguishing fresh evidence from stale gossip.",
    example:
      "Suspect host at incarnation 7\nHost refutes with Alive at incarnation 8\nOld incarnation-7 gossip cannot revive that suspicion.",
  },
  "agentic-proof-of-work:liveness-extensions": {
    title: "Extra time requires new progress and has a limit",
    explanation:
      "An extension is refused for overload, an unchanged progress witness, requests within one probe period, or an exhausted allowance. At most five grants are allowed per incarnation; their duration halves each time until reaching the configured floor.",
    example:
      "Advancing witness → possible grant\nSame witness again → denied\nA sixth extension → denied",
  },
  "agentic-proof-of-work:liveness-witness": {
    title: "The witness measures the control loop, not agent work",
    explanation:
      "The placement agent reports a completed-tick counter as its progress witness. Its overload flag comes from memory use reaching 95% of its limit or disk free space falling below headroom, not from an agent’s claim progress or percentage complete.",
    example:
      "Witness 120 → 121: placement loop advanced\nIt does not mean C18’s patch made progress.",
  },
  "agentic-proof-of-work:network-coordinates": {
    title: "Learning latency rather than geographic location",
    explanation:
      "Vivaldi updates an eight-dimensional coordinate, access-link delay and error estimate from acknowledged probe round trips. The resulting distance predicts network delay rather than physical geography; invalid or insufficient samples fall back to conservative defaults.",
    example:
      "Measured round trip → update coordinate and error\nTwo coordinates → estimated round-trip duration",
  },
  "agentic-proof-of-work:coordinate-deadline": {
    title: "Turning a latency estimate into a probe deadline",
    explanation:
      "The driver multiplies the round-trip upper-confidence estimate by its timeout factor, clamps that result between the base timeout and cap, then applies local health. Under the cited defaults, a healthy observer waits between 300 ms and 2 s; maximum local-health scaling raises that cap to 6 s.",
    example:
      "Upper estimate 200 ms × factor 3 = 600 ms\nHealth multiplier 2 → deadline 1,200 ms",
  },
  "agentic-proof-of-work:leader-routing": {
    title: "Work requests follow directory authority",
    explanation:
      "The route cache resolves a session through its directory and returns the current leader with a route epoch and enrolled endpoint. Coordinate estimates do not choose the destination; a missing invalidation interval clears that partition’s cached routes rather than trusting stale entries.",
    example:
      "Session key → directory route → leader endpoint\nLowest predicted latency does not choose the writer.",
  },
  "agentic-proof-of-work:committed-liveness": {
    title: "When an observation becomes a placement fact",
    explanation:
      "The partition leader commits settled alive or dead outcomes for confirmed members, not temporary suspicions. These generation-checked facts inform planning, repair and failure-tolerance reports without revoking enrollment; a revived node can return under its existing identity.",
    example:
      "Suspect → local observation\nDead, committed → placement excludes the node\nRevived, committed → no re-enrollment required",
  },
  "agentic-proof-of-work:raft-authority": {
    title: "Failure detection does not grant leadership",
    explanation:
      "The Raft adapter enables quorum checking and pre-vote independently of the liveness detector. Giving a slow host more probe time does not elect it, let a minority commit, or extend a claim’s deadline: those decisions have separate authorities.",
    example:
      "Liveness extension → more time to answer probes\nRaft majority → authority to commit session history",
  },
  "agentic-proof-of-work:liveness-tests": {
    title: "What the liveness qualification actually exercises",
    explanation:
      "Real-QUIC tests stop and revive a joined host, checking committed death and revival without re-enrollment. Crafted probes exercise sender binding, refutation and extension limits; they are not a measured WAN deployment or proof of behavior under sustained real overload.",
    example:
      "Stopped host → suspect → committed dead\nRestart with higher incarnation → committed alive\nExtension cases use deliberately constructed probes.",
  },
};

/** Reused documents explain different mechanisms at each authored link label. */
export const proofReferenceVariants: Record<string, ReferenceNote> = {
  "agentic-proof-of-work:object-states:Object transitions.": {
    title: "Following the exchange without conflating its states",
    explanation:
      "The respondent takes responsibility for the claim, produces an artifact and closes a separate testament; the claimant then receives that testament and the designated evaluators check its evidence. A Complete testament reports the respondent’s outcome, while the claim remains open until its acceptance requirements and dependencies are met.",
    example:
      "C17: open\nT1: Complete, received\nPatch A: awaiting review\nThe response is delivered; the claim is not yet satisfied.",
  },
  "agentic-proof-of-work:object-states:Independent object lifecycles.": {
    title: "Receiving a failure report can satisfy delivery",
    explanation:
      "Pure Receipt validates that the claimant received the exact posted testament, without running an artifact check. It can therefore pass for a Failed testament; artifact receipt and the patch’s required behavior or quality checks retain their separate meanings and states.",
    example:
      "T1 reports Failed; claimant receives T1.\nDelivery: Pass\nSuccessful patch: not established",
  },
  "agentic-proof-of-work:peer:Requirements and authority.": {
    title: "Freezing the acceptance agreement before work starts",
    explanation:
      "Generation fixes the requirement’s mode, target, validator definition and evaluator designation as authored content. Lifecycle records can record attempts and outcomes but cannot quietly replace those terms; changed acceptance requirements belong in an explicitly related new claim.",
    example:
      "C17 requires behavior and boundary review.\nDropping review is not a status update to C17.\nDifferent requirements need a new claim.",
  },
  "agentic-proof-of-work:peer:Evaluator designation.": {
    title: "Checking the submitter against the named evaluator",
    explanation:
      "The authenticated participant must match the evaluator named for that committed requirement or phase, whether the evaluator is the claimant or another participant. A consultation response does not change that designation, and evaluation authority alone does not grant authority to take over or cancel the underlying claim.",
    example:
      "Requirement names maintainer as evaluator.\nReviewer supplies advice through a consultation.\nMaintainer remains the authorized verdict submitter.",
  },
  "agentic-proof-of-work:validation-states:Same-artifact rule": {
    title: "One slot needs one artifact with every required pass",
    explanation:
      "Within a response, the declared slot resolves to a particular artifact ID and content digest rather than any artifact with a matching schema. Its required passes must accumulate on that exact target; a behavioral pass for A cannot be combined with a review pass for B.",
    example:
      "change → A / hA\nBehavior must target A / hA.\nReview must also target A / hA.",
  },
  "agentic-proof-of-work:validation-states:Evaluation phases.": {
    title: "Ordering phases within one requirement",
    explanation:
      "A requirement declaring programmatic and quality phases reaches quality only after its actual programmatic result passes. An agentic-only requirement begins in quality without inventing a programmatic pass, and this internal phase order does not impose an undeclared dependency on other requirements.",
    example:
      "Report structure Pass → assess source support\nAgentic-only review → assess quality directly\nA separate requirement may proceed independently.",
  },
  "agentic-proof-of-work:validation-states:Outcome and retry rules.": {
    title: "Retry an evaluation error, not a conclusive failure",
    explanation:
      "Error records that evaluation could not establish an answer and permits another attempt only under the pinned retry or fallback policy. Fail is a conclusive negative result, while Incomplete records missing required evidence; neither can be turned into a pass by resetting a terminal evaluation.",
    example:
      "Runner dependency unavailable → Error\nMalformed escape still accepted → Fail\nRequired patch absent → Incomplete",
  },
  "agentic-proof-of-work:validator-contract:Participant execution and validator contracts.":
    {
      title: "Binding a fixed check to a participant’s own tools",
      explanation:
        "The authored validator reference and schemas specify the check, not the machine, credentials or endpoint that will run it. The designated participant reads the pinned context, records the check’s start, invokes its implementation and submits the resulting evidence and verdict through the ledger’s guarded transitions.",
      example:
        "Pinned validator v3 + target A / hA\n→ participant’s local implementation\n→ result evidence bound to that same check",
    },
  "agentic-proof-of-work:validator-contract:Execution and attestation boundary.":
    {
      title: "A signed report does not prove the runner executed",
      explanation:
        "Authentication identifies the result’s submitter, and the bound digest identifies its evidence; neither establishes that an arbitrary external program ran as reported. Independent execution, evaluator approval or additional attestation must be explicitly required by the acceptance contract and supported by the submitted evidence.",
      example:
        "Authenticated claim: “12 tests passed.”\nEstablished: who submitted these report bytes.\nExecution proof requires evidence of the actual run.",
    },
  "agentic-proof-of-work:range-publication:Cross-range publication": {
    title: "Publishing a child result and its parent consequence together",
    explanation:
      "A session mutation can change records in several state ranges while retaining one ordered transaction. Its resulting prefix is published only after all required roots are available, so observers cannot see a satisfied parent without the child result that caused that satisfaction.",
    example:
      "Sequence 42 changes child in range A and parent in B.\nBoth become visible at prefix 42 together.",
  },
  "agentic-proof-of-work:range-publication:Publication and reads.": {
    title: "Reading every range at the same version",
    explanation:
      "A linearizable read obtains a Raft read barrier, waits for a complete published prefix and pins every needed range at one sequence and route epoch. Discovering another range during traversal requires that same version there; if its root is unavailable, the query must retry instead of mixing versions.",
    example:
      "Read token: sequence 42, route epoch 3\nRead acceptance at 42 and evaluation at 42.\nEvaluation at 41 is not an acceptable substitute.",
  },
};
