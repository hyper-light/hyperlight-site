import type { ProofStep } from "../proof-work/proof-figure";
import { runtimePhase } from "./runtime-drawing";

/** Illustrative identities, not a statement of the runtime's shard count or ring depth. */
export const ownershipLanes = [
  { shard: "S0", core: "CORE 0", volume: "V17", other: "V29" },
  { shard: "S1", core: "CORE 1", volume: "V08", other: "V31" },
  { shard: "S2", core: "CORE 2", volume: "V42", other: "V56" },
] as const;

export const ownershipSteps: ProofStep[] = [
  {
    label: "Route",
    title: "Route each request to its owning core",
    description:
      "Requests for different volumes travel to the shards that own them. Routing does not acquire a shared lock or consult a global catalog on each write.",
  },
  {
    label: "Queue",
    title: "Queue the request within a fixed limit",
    description:
      "The sender queues a request for the owning core. The queue has a fixed limit. When it is full, the caller waits or receives an explicit error.",
  },
  {
    label: "Apply",
    title: "Apply writes on the owning core",
    description:
      "Each core runs its own executor and applies its own volumes’ mutations. Other cores proceed independently. Immutable shared content can still be read across owners.",
  },
  {
    label: "Reply",
    title: "Return the result to the caller",
    description:
      "The owning shard returns the operation’s result. The request, mutation and completion remain associated with one owner; there is no global write lock between these lanes.",
  },
];

export function ownershipState(selection: number) {
  return {
    queued: runtimePhase(selection, 0, 1),
    transferred: runtimePhase(selection, 1, 1.65),
    applying: runtimePhase(selection, 1.65, 2),
    replying: runtimePhase(selection, 2, 3),
  };
}
