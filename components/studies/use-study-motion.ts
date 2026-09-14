"use client";

import { useEffect, useRef, type RefObject } from "react";

export type StudyProps = { paused?: boolean; className?: string };

type StudyMotionOptions = {
  ref: RefObject<SVGSVGElement | null>;
  paused?: boolean;
  /** Use a stable module-level function or useCallback; elapsed time is in seconds. */
  update: (svg: SVGSVGElement, elapsed: number) => void;
  fps?: number;
};

/** One clock per mounted study. Hidden artwork does no work and resumes its pose. */
export function useStudyMotion({
  ref,
  paused = false,
  update,
  fps = 30,
}: StudyMotionOptions) {
  const elapsed = useRef(0);

  useEffect(() => {
    const svg = ref.current;
    if (!svg) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const interval = 1000 / fps;
    let visible = false;
    let request = 0;
    let previous: number | null = null;
    let lastPaint = 0;

    const animate = (now: number) => {
      request = window.requestAnimationFrame(animate);
      // Sample the full active interval even when a slow frame misses its budget.
      // synchronize() resets the timestamp across intentional inactive periods.
      if (previous !== null)
        elapsed.current += Math.max(0, now - previous) / 1000;
      previous = now;
      if (now - lastPaint < interval) return;
      lastPaint = now - ((now - lastPaint) % interval);
      update(svg, elapsed.current);
    };

    const synchronize = () => {
      window.cancelAnimationFrame(request);
      previous = null;
      lastPaint = 0;
      if (!paused && !reducedMotion.matches && !document.hidden && visible) {
        request = window.requestAnimationFrame(animate);
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        // A reflow can deliver several records for this SVG. Use its final state.
        const latest = entries.at(-1);
        if (!latest) return;
        visible = latest.isIntersecting;
        synchronize();
      },
      { rootMargin: "32px" },
    );
    observer.observe(svg);
    reducedMotion.addEventListener("change", synchronize);
    document.addEventListener("visibilitychange", synchronize);

    return () => {
      window.cancelAnimationFrame(request);
      observer.disconnect();
      reducedMotion.removeEventListener("change", synchronize);
      document.removeEventListener("visibilitychange", synchronize);
    };
  }, [ref, paused, update, fps]);
}
