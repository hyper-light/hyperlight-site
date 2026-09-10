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
          Built for the next
          <br />
          generation of software.
        </h1>
        <p>
          The world's first modular agentic platform, built to work anywhere
          for every agent.
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
