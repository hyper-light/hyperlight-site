"use client";

import { useEffect, useState, type CSSProperties, type RefObject } from "react";
import type { ProofFrameFunction } from "./proof-geometry";
import type { ProofFrameLoader } from "./proof-frame-loader";
import { ProofScene } from "./proof-scene";
import styles from "./proof-work.module.css";

export type ProofFrameSource =
  | { frame: ProofFrameFunction; loadFrame?: never }
  | { frame?: never; loadFrame: ProofFrameLoader };

/** Keep the article's exact layout and prose without shipping hidden SVG trees. */
export function ProofStage({
  stageRef,
  frame,
  loadFrame,
  selection,
  paused,
  sceneKey,
  heights,
  stepDuration,
  transitionLimit,
  onReady,
}: ProofFrameSource & {
  stageRef: RefObject<HTMLDivElement | null>;
  selection: number;
  paused: boolean;
  sceneKey: string;
  heights?: { landscape: number; portrait: number };
  stepDuration: number;
  transitionLimit?: number;
  onReady: (ready: boolean) => void;
}) {
  const [viewport, setViewport] = useState({ ready: false, portrait: false });
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState<{
    loader: ProofFrameLoader;
    attempt: number;
    frame?: ProofFrameFunction;
    failed?: boolean;
  }>();

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    let near = false;
    let width = stage.getBoundingClientRect().width;
    const publish = () => {
      setViewport((previous) => {
        // Retain a visited scene so scrolling away and back preserves its pose.
        const ready = previous.ready || (near && width > 0);
        const portrait = width <= 560;
        return previous.ready === ready && previous.portrait === portrait
          ? previous
          : { ready, portrait };
      });
    };
    const resize = new ResizeObserver((entries) => {
      width = entries.at(-1)?.contentRect.width ?? width;
      publish();
    });
    const intersection = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        near = true;
        publish();
        intersection.disconnect();
      },
      { rootMargin: "400px" },
    );
    resize.observe(stage);
    intersection.observe(stage);
    return () => {
      resize.disconnect();
      intersection.disconnect();
    };
  }, [stageRef]);

  useEffect(() => {
    if (!viewport.ready || !loadFrame) return;
    let cancelled = false;
    loadFrame().then(
      (next) => {
        if (!cancelled) setLoaded({ loader: loadFrame, attempt, frame: next });
      },
      () => {
        if (!cancelled) setLoaded({ loader: loadFrame, attempt, failed: true });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [viewport.ready, loadFrame, attempt]);

  const current = loaded?.loader === loadFrame ? loaded : undefined;
  const resolved = frame ?? current?.frame;
  const ready = viewport.ready && !!resolved;
  const failed = current?.failed && current.attempt === attempt;
  useEffect(() => onReady(ready), [onReady, ready]);

  return (
    <div
      className={styles.stage}
      ref={stageRef}
      data-proof-stage=""
      style={
        {
          "--proof-landscape-ratio": `800 / ${heights?.landscape ?? 520}`,
          "--proof-portrait-ratio": `420 / ${heights?.portrait ?? 740}`,
        } as CSSProperties
      }
    >
      {ready ? (
        <ProofScene
          key={sceneKey}
          frame={resolved!}
          selection={selection}
          portrait={viewport.portrait}
          height={viewport.portrait ? heights?.portrait : heights?.landscape}
          paused={paused}
          stepDuration={stepDuration}
          transitionLimit={transitionLimit}
        />
      ) : (
        <div className={styles.stagePlaceholder}>
          {failed ? (
            <>
              <p>The illustration couldn’t load. The explanation is below.</p>
              <button onClick={() => setAttempt((value) => value + 1)}>
                Retry illustration
              </button>
            </>
          ) : (
            <span aria-hidden="true">Loading interactive illustration…</span>
          )}
        </div>
      )}
    </div>
  );
}
