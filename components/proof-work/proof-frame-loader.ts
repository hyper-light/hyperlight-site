import type { ProofFrameFunction } from "./proof-geometry";

/** Loading a frame never replaces the server-rendered figure explanation. */
export type ProofFrameLoader = () => Promise<ProofFrameFunction>;

/** Share a requested chunk across remounts, but allow retry after a failed fetch. */
export function lazyProofFrame(load: ProofFrameLoader): ProofFrameLoader {
  let pending: Promise<ProofFrameFunction> | undefined;
  return () => {
    pending ??= Promise.resolve()
      .then(load)
      .catch((error: unknown) => {
        pending = undefined;
        throw error;
      });
    return pending;
  };
}
