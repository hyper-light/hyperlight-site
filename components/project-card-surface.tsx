"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { useMotionPreference } from "@/components/motion-provider";

const CardMotionContext = createContext(false);

export function useProjectCardMotion() {
  return useContext(CardMotionContext);
}

/** The article owns interaction, so its artwork also responds to its text and links. */
export function ProjectCardSurface({ children }: { children: ReactNode }) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const { paused } = useMotionPreference();
  const active = !paused && (hovered || focused);

  return (
    <CardMotionContext.Provider value={active}>
      <article
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
