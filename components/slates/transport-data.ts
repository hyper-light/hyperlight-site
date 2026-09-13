import type { ProofStep } from "../proof-work/proof-figure";
import { runtimePhase } from "./runtime-drawing";

export const transportOperation = {
  request: "R17",
  result: "S7",
  verb: "Snapshot",
} as const;
/** Four cells illustrate a finite byte-credit window, not a configured transport limit. */
export const illustratedCreditCells = 4;

export const transportSteps: ProofStep[] = [
  {
    label: "Send",
    title: "Send requests and content over separate streams",
    description:
      "Region A forwards Snapshot request R17 to the volume’s owner. Reliable request, reply and content streams share the authenticated session. The separate content transfer fills only the space the receiver has granted. Consuming those bytes makes room for more.",
  },
  {
    label: "Loss",
    title: "The owner commits; the reply is lost",
    description:
      "The owner creates S7 and records R17’s result. The session fails before the caller receives that result. A lost reply does not mean the operation failed to run.",
  },
  {
    label: "Retry",
    title: "Reconnect and retry the original request",
    description:
      "The enrolled peer reconnects and resends R17 within the operation’s retry budget. The session identity changes; the authenticated origin and operation identity do not. The owner finds the recorded result instead of taking another snapshot.",
  },
  {
    label: "Complete",
    title: "The caller receives S7, not a second snapshot",
    description:
      "The original result returns over the replacement session. Packet acknowledgements recover transport delivery; the operation’s completion record prevents a duplicate effect. Credit bounds the stream independently of the object’s total size.",
  },
];

export function transportState(selection: number) {
  const sent = runtimePhase(selection, 0, 0.55);
  const committed = runtimePhase(selection, 0.55, 0.7);
  const lostReply = runtimePhase(selection, 0.72, 0.95);
  const lost = runtimePhase(selection, 0.95, 1);
  const reconnected = runtimePhase(selection, 1.05, 1.35);
  const retried = runtimePhase(selection, 1.4, 2);
  const returned = runtimePhase(selection, 2.2, 3);
  const contentCells = Array.from(
    { length: illustratedCreditCells },
    (_, cell) => {
      const admitted = runtimePhase(
        selection,
        0.02 + cell * 0.04,
        0.08 + cell * 0.04,
      );
      const consumed = runtimePhase(
        selection,
        0.32 + cell * 0.055,
        0.38 + cell * 0.055,
      );
      return { admitted, consumed, occupied: admitted * (1 - consumed) };
    },
  );
  return {
    sent,
    committed,
    lostReply,
    lost,
    reconnected,
    retried,
    returned,
    contentCells,
    effects: selection >= 0.7 ? 1 : 0,
    operation: transportOperation,
  };
}
