"use client";

import { ProjectMark } from "@/components/project-mark";
import { useMotionPreference } from "@/components/motion-provider";
import { useProjectCardMotion } from "@/components/project-card-surface";
import { ProjectStudy } from "@/components/project-study";
import { getStudy } from "@/lib/studies";

export function ProjectVisual({
  slug,
  large = false,
}: {
  slug: string;
  large?: boolean;
}) {
  const { paused } = useMotionPreference();
  const active = useProjectCardMotion();
  const study = getStudy(slug);
  return (
    <div
      className={`project-visual visual-${slug}${large ? " visual-large" : ""}`}
      aria-hidden="true"
    >
      <div className="project-visual-grid" />
      {study ? (
        <ProjectStudy
          id={study.id}
          paused={paused}
          large={large}
          active={active}
        />
      ) : (
        <div className="quiet-art">
          <span />
          <span />
          <ProjectMark slug={slug} width={66} height={66} />
        </div>
      )}
      <span className="visual-coordinate">
        {study ? study.title.toUpperCase() : "HYPERLIGHT / RESEARCH"}
      </span>
    </div>
  );
}
