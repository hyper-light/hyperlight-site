import type { Metadata } from "next";
import { ProjectExplorer } from "@/components/project-explorer";
import { projects } from "@/lib/projects";

export const metadata: Metadata = {
  title: "Projects",
  description:
    "Tools for understanding code, coordinating agents, and building systems. Explore what’s available and what’s taking shape at Hyperlight.",
  alternates: { canonical: "/projects" },
};

export default function ProjectsPage() {
  return (
    <main id="main" className="container subpage">
      <div className="page-intro">
        <span className="eyebrow">
          <span className="spectrum-rule" /> The Hyperlight projects
        </span>
        <h1>
          Built for the work
          <br />
          you want to do.
        </h1>
        <p>
          Tools with a clear purpose, from the first line of code to the systems
          around it. Some are ready to use. Others are taking shape.
        </p>
      </div>
      <ProjectExplorer projects={projects} />
      <div className="catalog-note">
        <span className="spectral-dot" />
        <p>
          Different stages. One direction. Follow the repositories for the
          latest work.
        </p>
      </div>
    </main>
  );
}
