"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import { useMotionPreference } from "@/components/motion-provider";
import { ProofScene } from "./proof-scene";
import type { ProofFrameFunction } from "./proof-geometry";
import tabs from "@/components/article-tabs.module.css";
import styles from "./proof-work.module.css";

export type ProofStep = {
  label: string;
  shortLabel?: string;
  title: string;
  description: string;
  facts?: {
    label: string;
    value: string;
    tone?: "pass" | "fail" | "pending" | "error";
  }[];
};

export function ProofFigure({
  id,
  eyebrow,
  title,
  description,
  steps,
  frame,
  caption,
  autoAdvance = false,
}: {
  id: string;
  eyebrow: string;
  title: string;
  description?: string;
  steps: ProofStep[];
  frame: ProofFrameFunction;
  caption: ReactNode;
  autoAdvance?: boolean;
}) {
  const [selected, setSelected] = useState(0);
  const [sequence, setSequence] = useState(autoAdvance);
  const [replay, setReplay] = useState(0);
  const stage = useRef<HTMLDivElement>(null);
  const { paused, reduced, toggle } = useMotionPreference();
  useEffect(() => {
    const element = stage.current;
    if (!element || !sequence || paused || selected >= steps.length - 1) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let visible = false;
    const synchronize = () => {
      clearTimeout(timer);
      if (visible && !document.hidden)
        timer = setTimeout(
          () => setSelected((value) => Math.min(value + 1, steps.length - 1)),
          5000,
        );
    };
    const observer = new IntersectionObserver(
      (entries) => {
        visible = (entries.at(-1)?.intersectionRatio ?? 0) >= 0.25;
        synchronize();
      },
      { threshold: 0.25 },
    );
    observer.observe(element);
    document.addEventListener("visibilitychange", synchronize);
    return () => {
      clearTimeout(timer);
      observer.disconnect();
      document.removeEventListener("visibilitychange", synchronize);
    };
  }, [sequence, paused, selected, steps.length, replay]);
  const select = (index: number) => {
    setSequence(false);
    setSelected(index);
  };
  const prefix = "proof-figure-" + useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const keyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const next =
      event.key === "ArrowRight"
        ? (index + 1) % steps.length
        : event.key === "ArrowLeft"
          ? (index + steps.length - 1) % steps.length
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? steps.length - 1
              : -1;
    if (next < 0) return;
    event.preventDefault();
    select(next);
    event.currentTarget.parentElement
      ?.querySelectorAll<HTMLButtonElement>("button")
      [next]?.focus();
  };
  return (
    <figure
      className={styles.figure}
      data-proof-figure={id}
      aria-labelledby={prefix + "-title"}
    >
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>{eyebrow}</p>
          <h3 className={styles.title} id={prefix + "-title"}>
            {title}
          </h3>
          {description && <p className={styles.description}>{description}</p>}
        </div>
        <div className={styles.actions}>
          {autoAdvance && (
            <button
              className={styles.motion}
              aria-label={`Replay ${title} sequence`}
              onClick={() => {
                setSelected(0);
                setSequence(true);
                setReplay((value) => value + 1);
              }}
            >
              <RotateCcw size={15} aria-hidden="true" />
            </button>
          )}
          <button
            className={styles.motion}
            onClick={toggle}
            disabled={reduced}
            aria-pressed={paused}
            aria-label={
              reduced
                ? `${title} follows reduced motion`
                : `${paused ? "Resume" : "Pause"} ${title} animation`
            }
          >
            {paused ? (
              <Play size={15} aria-hidden="true" />
            ) : (
              <Pause size={15} aria-hidden="true" />
            )}
          </button>
        </div>
      </header>
      <div className={styles.stage} ref={stage}>
        <ProofScene
          key={`landscape-${replay}`}
          frame={frame}
          selection={selected}
          portrait={false}
          paused={paused}
        />
        <ProofScene
          key={`portrait-${replay}`}
          frame={frame}
          selection={selected}
          portrait
          paused={paused}
        />
      </div>
      <div className={tabs.tabs} role="tablist" aria-label={title}>
        {steps.map((step, index) => (
          <button
            key={step.label}
            id={`${prefix}-tab-${index}`}
            role="tab"
            aria-controls={`${prefix}-panel-${index}`}
            aria-selected={selected === index}
            tabIndex={selected === index ? 0 : -1}
            aria-label={step.label}
            onClick={() => select(index)}
            onKeyDown={(event) => keyDown(event, index)}
          >
            <span className={step.shortLabel ? styles.longLabel : undefined}>
              {step.label}
            </span>
            {step.shortLabel && (
              <span className={styles.shortLabel} aria-hidden="true">
                {step.shortLabel}
              </span>
            )}
          </button>
        ))}
      </div>
      <div className={styles.panels}>
        {steps.map((step, index) => (
          <section
            key={step.label}
            className={styles.panel}
            role="tabpanel"
            id={`${prefix}-panel-${index}`}
            aria-labelledby={`${prefix}-tab-${index}`}
            aria-hidden={selected !== index}
            inert={selected !== index}
            data-active={String(selected === index)}
            tabIndex={selected === index ? 0 : -1}
          >
            <h4>{step.title}</h4>
            <p>{step.description}</p>
            {step.facts && (
              <dl className={styles.facts}>
                {step.facts.map((fact) => (
                  <div key={fact.label} data-tone={fact.tone}>
                    <dt>{fact.label}</dt>
                    <dd>{fact.value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </section>
        ))}
      </div>
      <figcaption className={styles.caption}>{caption}</figcaption>
    </figure>
  );
}
