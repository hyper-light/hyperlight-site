import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Project } from "@/lib/projects";
import { ProjectMark } from "@/components/project-mark";
import { ProjectVisual } from "@/components/project-visual";
import { ProjectCardSurface } from "@/components/project-card-surface";

export function Status({ status }: { status: Project["status"] }) {
  return (
    <span
      className={`project-status status-${status.toLowerCase().replaceAll(" ", "-")}`}
    >
      <i />
      {status}
    </span>
  );
}

export function ProjectCard({ project }: { project: Project }) {
  return (
    <ProjectCardSurface>
      <Link
        href={`/projects/${project.slug}`}
        className="project-card-link"
        aria-label={`Explore ${project.name}`}
      >
        <ProjectVisual slug={project.slug} />
        <div className="project-card-body">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <ProjectMark slug={project.slug} width={25} height={25} />
              <h3>{project.name}</h3>
            </div>
            <ArrowUpRight size={18} className="card-arrow" />
          </div>
          <p>{project.description}</p>
          <div className="card-meta">
            <span>{project.category}</span>
            <span>{project.language || "Exploration"}</span>
          </div>
        </div>
      </Link>
      <div className="card-footer">
        <Status status={project.status} />
        <a
          href={project.repository}
          aria-label={`${project.name} repository on GitHub`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Source <ArrowUpRight size={12} />
        </a>
      </div>
    </ProjectCardSurface>
  );
}
