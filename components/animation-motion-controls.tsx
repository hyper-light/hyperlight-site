import type { ReactNode } from "react";
import { RotateCcw } from "lucide-react";
import styles from "./animation-motion-controls.module.css";

/** Keep the mobile replay/pause slots consistent, even for ambient animations. */
export function AnimationMotionControls({
  children,
  unavailableReplayLabel,
}: {
  children: ReactNode;
  unavailableReplayLabel?: string;
}) {
  return (
    <div className={styles.actions}>
      {unavailableReplayLabel && (
        <button
          type="button"
          className={styles.unavailableReplay}
          disabled
          data-unavailable-replay=""
          aria-label={unavailableReplayLabel}
          title="Replay is unavailable for this animation"
        >
          <RotateCcw size={15} aria-hidden="true" />
        </button>
      )}
      {children}
    </div>
  );
}
