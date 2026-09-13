"use client";

import { ProofFigure } from "./proof-figure";
import { livenessGuardSource, livenessGuardSteps } from "./liveness-guard-data";
import { loadLivenessGuardFrame } from "./proof-frame-loaders";

export function LivenessGuard() {
  return (
    <ProofFigure
      id="liveness-guard"
      eyebrow="FAILURE DETECTION / BOUNDED GRACE"
      title="Lifeguard and Late-Homework Extensions"
      steps={livenessGuardSteps}
      loadFrame={loadLivenessGuardFrame}
      caption={
        <>
          Local health limits hasty accusations; witnessed, capped grace gives a
          progressing host time to answer. Neither changes Raft quorum. Reply
          times and witnesses are illustrative; timeout and grant rules follow
          the <a href={livenessGuardSource}>liveness specification</a>.
        </>
      }
    />
  );
}
