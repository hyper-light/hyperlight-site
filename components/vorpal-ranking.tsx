"use client";

import { useEffect, useId, useRef, useState, type RefObject } from "react";
import { Pause, Play, RotateCcw, StepForward } from "lucide-react";
import { useMotionPreference } from "@/components/motion-provider";
import {
  candidates,
  channels,
  contribution,
  score,
  ordered,
  DURATION,
  STAGES,
  STAGE_STARTS,
  traceAt,
} from "./vorpal-ranking-model";
import styles from "./vorpal-ranking.module.css";
import articleTabs from "./article-tabs.module.css";
import { RankingHardware } from "./vorpal-ranking-hardware";

const stageCopy = [
  "Three search methods nominate results. Keep each result’s original rank, starting at zero.",
  "Read a rank from its input bank, calculate its reciprocal contribution, and add it to the matching score register.",
  "The registers hold the summed contributions. Completed scores are written to the result buffer; an absent nomination contributes zero.",
  "Reorder the result buffer by total, highest first. loadConfig wins through support across all three lists.",
];
const clamp = (value: number) => Math.max(0, Math.min(1, value));
const format = (value: number) => value.toFixed(5);

/** One finite, visibility-aware clock for data, highlights and row positions. */
function useTracePlayback() {
  const ref = useRef<HTMLDivElement>(null);
  const { paused: globallyPaused, reduced, toggle } = useMotionPreference();
  const [time, setTime] = useState(0);
  const [held, setHeld] = useState(false);
  const [stopAt, setStopAt] = useState(DURATION);
  const [reducedSnapshot, setReducedSnapshot] = useState<number | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const stopped = held || globallyPaused || time >= stopAt;
  // Inspectable pauses settle an in-flight row reorder. A lifted row must not
  // indefinitely conceal another candidate when either motion control pauses.
  if (
    (held || globallyPaused) &&
    !reduced &&
    time >= STAGE_STARTS[3] &&
    time < STAGE_STARTS[3] + 2.4
  ) {
    setTime(DURATION);
  }
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const change = () => {
      setReducedSnapshot(null);
      if (preference.matches) setTime(DURATION);
    };
    preference.addEventListener("change", change);
    return () => preference.removeEventListener("change", change);
  }, []);
  useEffect(() => {
    const element = ref.current;
    if (!element || stopped || reduced) return;
    let visible = false;
    let request = 0;
    let previous = 0;
    let lastPaint = 0;
    let elapsed = 0;
    const paint = (now: number) => {
      if (previous) elapsed += Math.min(now - previous, 100) / 1000;
      previous = now;
      if (now - lastPaint >= 1000 / 60) {
        const delta = elapsed;
        elapsed = 0;
        lastPaint = now;
        setTime((value) => Math.min(stopAt, value + delta));
      }
      request = requestAnimationFrame(paint);
    };
    const synchronize = () => {
      cancelAnimationFrame(request);
      previous = 0;
      lastPaint = 0;
      elapsed = 0;
      if (visible && !document.hidden) request = requestAnimationFrame(paint);
    };
    const observer = new IntersectionObserver(
      (entries) => {
        const latest = entries.at(-1);
        if (!latest) return;
        visible = latest.isIntersecting;
        synchronize();
      },
      { rootMargin: "32px" },
    );
    observer.observe(element);
    document.addEventListener("visibilitychange", synchronize);
    return () => {
      cancelAnimationFrame(request);
      observer.disconnect();
      document.removeEventListener("visibilitychange", synchronize);
    };
  }, [stopped, reduced, stopAt]);
  const seek = (stage: number) => {
    const start = STAGE_STARTS[stage];
    const snapshot = stage === 1 ? start + 0.7 : stage === 3 ? DURATION : start;
    setReducedSnapshot(snapshot);
    setTime(globallyPaused || held ? snapshot : start);
    setStopAt(stage === 3 ? DURATION : STAGE_STARTS[stage + 1] - 0.001);
  };
  const replay = () => {
    setTime(0);
    setReducedSnapshot(0);
    setStopAt(DURATION);
    setHeld(false);
  };
  const playPause = () => {
    if (globallyPaused && !reduced) toggle();
    if (time >= stopAt) {
      if (time >= DURATION) setTime(0);
      setStopAt(DURATION);
      setHeld(false);
    } else setHeld(globallyPaused ? false : !held);
  };
  const step = () => {
    const current = reduced ? (reducedSnapshot ?? DURATION) : time;
    const frame = traceAt(current);
    const cellDuration = (STAGE_STARTS[2] - STAGE_STARTS[1]) / 9;
    const next =
      frame.stage === 3
        ? 0
        : frame.stage === 2
          ? DURATION
          : frame.stage === 0
            ? STAGE_STARTS[1] + cellDuration * 0.5
            : frame.cellPhase < 0.25
              ? STAGE_STARTS[1] + cellDuration * (frame.activeCell + 0.5)
              : frame.cellPhase < 0.72
                ? STAGE_STARTS[1] + cellDuration * (frame.activeCell + 0.85)
                : frame.activeCell === 8
                  ? STAGE_STARTS[2]
                  : STAGE_STARTS[1] + cellDuration * (frame.activeCell + 1.5);
    setTime(next);
    setReducedSnapshot(next);
    setStopAt(DURATION);
    setHeld(true);
    const nextFrame = traceAt(next);
    if (nextFrame.activeCell >= 0) {
      const candidate = candidates[Math.floor(nextFrame.activeCell / 3)];
      const channel = nextFrame.activeCell % 3;
      const rank = candidate.ranks[channel];
      const included =
        nextFrame.completedCells + Number(nextFrame.cellPhase >= 0.72);
      const total = candidate.ranks.reduce<number>(
        (sum, value, i) =>
          sum +
          (Math.floor(nextFrame.activeCell / 3) * 3 + i < included
            ? contribution(value)
            : 0),
        0,
      );
      setAnnouncement(
        `${candidate.symbol}, ${channels[channel]}: ${rank === null ? "not nominated" : `rank ${rank}`}. Contribution ${format(contribution(rank))}. Running total ${format(total)}.`,
      );
    } else setAnnouncement(stageCopy[nextFrame.stage]);
  };
  return {
    ref,
    time: reduced ? (reducedSnapshot ?? DURATION) : time,
    paused: stopped || reduced,
    reduced,
    seek,
    replay,
    playPause,
    step,
    announcement,
  };
}

function TraceArt({
  time,
  artRef,
}: {
  time: number;
  artRef: RefObject<HTMLDivElement | null>;
}) {
  return (
    <div
      ref={artRef}
      className={styles.art}
      data-ranking-art=""
      data-stage={traceAt(time).stage}
      data-time={time.toFixed(3)}
      aria-hidden="true"
    >
      <RankingHardware time={time} />
      <RankingHardware time={time} portrait />
      <p className={styles.metaphor}>
        Ranked lists → score registers → ordered results. A hardware metaphor
        for the RRF calculation.
      </p>
    </div>
  );
}

/** A worked example of rank fusion, not measured search output. */
export function VorpalRanking() {
  const playback = useTracePlayback();
  const trace = traceAt(playback.time);
  const id = useId();
  return (
    <figure
      className={styles.figure}
      data-vorpal-ranking=""
      data-paused={playback.paused}
      aria-labelledby={id + "-title"}
      aria-describedby={id + "-caption"}
    >
      <div className={styles.header}>
        <div>
          <span className={styles.eyebrow}>
            VORPAL / RECIPROCAL RANK FUSION
          </span>
          <h3 className={styles.title} id={id + "-title"}>
            From ranked lists to one result order.
          </h3>
        </div>
        <div className={styles.motionControls}>
          <button
            type="button"
            className={styles.motion}
            onClick={playback.replay}
            aria-label="Replay ranking calculation"
            title="Replay the calculation"
          >
            <RotateCcw size={14} aria-hidden="true" />
          </button>
          <button
            type="button"
            className={styles.motion}
            onClick={playback.playPause}
            disabled={playback.reduced}
            aria-pressed={playback.paused}
            aria-label={
              playback.reduced
                ? "Ranking animation follows reduced motion"
                : playback.paused
                  ? "Resume ranking animation"
                  : "Pause ranking animation"
            }
          >
            {playback.paused ? (
              <Play size={14} aria-hidden="true" />
            ) : (
              <Pause size={14} aria-hidden="true" />
            )}
          </button>
        </div>
      </div>
      <p className={styles.subtitle}>
        Read the ranks. Add their contributions. Sort the totals.
      </p>
      <TraceArt time={playback.time} artRef={playback.ref} />
      <div
        className={`${articleTabs.tabs} ${styles.stages}`}
        role="group"
        aria-label="Explore the rank fusion calculation"
      >
        {STAGES.map((stage, index) => (
          <button
            type="button"
            key={stage}
            aria-pressed={trace.stage === index}
            onClick={() => playback.seek(index)}
            data-ranking-select={index}
          >
            <span className={styles.stageNumber}>0{index + 1}</span>
            {stage}
            <span
              className={styles.stageProgress}
              style={{
                transform: `scaleX(${clamp((playback.time - STAGE_STARTS[index]) / ((STAGE_STARTS[index + 1] ?? DURATION) - STAGE_STARTS[index]))})`,
              }}
            />
          </button>
        ))}
      </div>
      <div className={styles.explanationRow}>
        <div
          className={styles.explanation}
          aria-live="polite"
          aria-atomic="true"
        >
          {stageCopy[trace.stage]}
        </div>
        <button
          type="button"
          className={styles.step}
          onClick={playback.step}
          aria-label="Step ranking calculation"
          title="Pause and advance one calculation step"
        >
          <StepForward size={13} aria-hidden="true" />
          Step
        </button>
      </div>
      <span className={styles.srOnly} role="status">
        {playback.announcement}
      </span>
      <details className={styles.details}>
        <summary>Inspect the ranks and calculations</summary>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <caption>
              Illustrative ranks, starting at zero. Sorted by the computed RRF
              total.
            </caption>
            <thead>
              <tr>
                <th scope="col">Symbol</th>
                {channels.map((channel) => (
                  <th key={channel} scope="col">
                    {channel}
                  </th>
                ))}
                <th scope="col">Total</th>
              </tr>
            </thead>
            <tbody>
              {ordered.map((candidate) => (
                <tr key={candidate.id} data-ranking-result={candidate.id}>
                  <th scope="row">
                    {candidate.symbol}
                    <span className={styles.tableId}> ({candidate.id})</span>
                  </th>
                  {candidate.ranks.map((rank, i) => (
                    <td key={i}>
                      {rank === null ? (
                        <span aria-label="Not nominated">—</span>
                      ) : (
                        rank
                      )}
                    </td>
                  ))}
                  <td data-ranking-score={candidate.id}>
                    {format(score(candidate))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className={styles.equations}>
            {ordered.map((candidate) => (
              <p key={candidate.id}>
                <span>{candidate.symbol}</span>
                <code>
                  {candidate.ranks
                    .map((rank) => (rank === null ? "0" : `1/${60 + rank}`))
                    .join(" + ")}{" "}
                  = {format(score(candidate))}
                </code>
              </p>
            ))}
          </div>
          <p className={styles.rounding}>
            Values are rounded for display; totals use the unrounded
            contributions.
          </p>
        </div>
      </details>
      <figcaption className={styles.caption} id={id + "-caption"}>
        <span>
          <strong>loadConfig ranks first overall.</strong> readFile leads the
          vector list, but loadConfig receives strong contributions from all
          three. This example uses equal list weights and k = 60.
        </span>
        <span className={styles.note}>
          The graph list ranks name-matched candidates by references from other
          code. Other enabled lists can also contribute; an optional neural
          reranker runs after fusion.{" "}
          <a href="https://github.com/hyper-light/vorpal/blob/4dd203fa560bfd2c0c8f1857f7bbca983c23de63/crates/index/src/lib.rs#L4328-L4365">
            See the fusion implementation.
          </a>
        </span>
      </figcaption>
    </figure>
  );
}
