"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useMotionPreference } from "@/components/motion-provider";

const CardMotionContext = createContext(false);

export function useProjectCardMotion() {
  return useContext(CardMotionContext);
}

/** Hover/focus on desktop; viewport entry on touch and compact layouts. */
export function ProjectCardSurface({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(false);
  const [viewportMotion, setViewportMotion] = useState(false);
  const { paused } = useMotionPreference();

  useEffect(() => {
    const card = ref.current;
    if (!card) return;
    const input = window.matchMedia(
      "(hover: none), (pointer: coarse), (max-width: 767px)",
    );
    let inView = false;
    const synchronize = () => {
      setVisible(inView && !document.hidden);
      setViewportMotion(input.matches);
      // Pointer/focus entry may predate hydration or happen during restoration.
      // Reconcile native state instead of waiting for another enter event.
      setHovered(
        window.matchMedia("(any-hover: hover)").matches &&
          card.matches(":hover"),
      );
      setFocused(card.contains(document.activeElement));
    };
    const observer = new IntersectionObserver(
      (entries) => {
        // Scroll, filtering, and restoration can deliver a batch of transitions.
        const latest = entries.at(-1);
        if (!latest) return;
        inView = latest.isIntersecting && latest.intersectionRatio >= 0.05;
        synchronize();
      },
      { threshold: 0.05 },
    );
    observer.observe(card);
    input.addEventListener("change", synchronize);
    document.addEventListener("visibilitychange", synchronize);
    return () => {
      observer.disconnect();
      input.removeEventListener("change", synchronize);
      document.removeEventListener("visibilitychange", synchronize);
    };
  }, []);

  const active = !paused && visible && (hovered || focused || viewportMotion);

  return (
    <CardMotionContext.Provider value={active}>
      <article
        ref={ref}
        className="project-card group"
        data-active={active}
        onPointerEnter={(event) => {
          if (
            event.pointerType !== "touch" &&
            window.matchMedia("(any-hover: hover)").matches
          ) {
            setHovered(true);
          }
        }}
        onPointerLeave={() => setHovered(false)}
        onPointerCancel={() => setHovered(false)}
        onFocusCapture={() => setFocused(true)}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) {
            setFocused(false);
          }
        }}
      >
        {children}
      </article>
    </CardMotionContext.Provider>
  );
}
