/**
 * Illustrative three-region placement of one session's voting replicas.
 * Focal's durability and minority-refusal contract:
 * https://github.com/hyper-light/focal/blob/626b1b59fa286ba4093e96f481afe38b8b061ede/docs/archictecutre/04-storage-and-distribution.md#L524-L545
 */
export const committedPrefix = ["01", "02", "03", "04"] as const;

export const replicaStates = [
  {
    label: "Replicate",
    title: "Quorum Replication",
    description:
      "One session has three voting replicas in three authorized regions. Each retains the same committed prefix; a write needs the required durable quorum before it can be acknowledged.",
    reachable: 3,
    leader: "A",
    roles: ["Leader", "Follower", "Follower"],
    writes: "Admitted",
    status: "3 / 3 reachable · writes admitted",
  },
  {
    label: "Leader loss",
    shortLabel: "Loss",
    title: "Leader Isolation",
    description:
      "Region A is isolated. Its old leader cannot confirm a quorum or serve authoritative reads. B and C retain the committed prefix, but must establish current-term authority before serving writes.",
    reachable: 2,
    leader: null,
    roles: ["Isolated", "Electing", "Electing"],
    writes: "Waiting for election",
    status: "2 / 3 reachable · election required",
  },
  {
    label: "Failover",
    title: "Majority Failover",
    description:
      "B and C form a majority and elect B. Once the new leader has current-term authority and has caught up, it can serve writes without losing the committed prefix. A's old authority remains fenced.",
    reachable: 2,
    leader: "B",
    roles: ["Fenced", "Leader", "Follower"],
    writes: "Admitted",
    status: "2 / 3 majority · writes admitted",
  },
  {
    label: "No quorum",
    shortLabel: "No quorum",
    title: "Minority Refusal",
    description:
      "Only B remains reachable. One voter cannot acknowledge new writes or force a promotion. The committed records remain on disk; availability waits for quorum recovery or explicit disaster recovery.",
    reachable: 1,
    leader: null,
    roles: ["Fenced", "No majority", "Unreachable"],
    writes: "Refused",
    status: "1 / 3 reachable · writes refused",
  },
] as const;
