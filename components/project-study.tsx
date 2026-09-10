"use client";

import { useEffect, useRef, useState } from "react";
import { ProjectMark } from "@/components/project-mark";
import { StudyPreview } from "@/components/study-artwork";
import type { StudyId } from "@/lib/studies";

/** Catalog previews load near the viewport and remain still; detail art can move. */
export function ProjectStudy({
  id,
  paused,
  large,
}: {
  id: StudyId;
  paused: boolean;
  large: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(large);
  useEffect(() => {
    if (ready || !ref.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        // Filtering can queue both an outside and an inside entry in one batch.
        if (entries.some((entry) => entry.isIntersecting)) {
          setReady(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [ready]);
  return (
    <div ref={ref} className="project-study" data-project-study={id}>
      {ready ? (
        <StudyPreview
          id={id}
          paused={paused || !large}
          className="project-study-svg"
        />
      ) : (
        <div className="study-preview-placeholder">
          <ProjectMark slug={id} width={48} height={48} />
        </div>
      )}
    </div>
  );
}
