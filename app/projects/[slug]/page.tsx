import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, ArrowUpRight, Github } from "lucide-react";
import { getProject, projects } from "@/lib/projects";
import { getPostsByProject } from "@/lib/posts";
import { ProjectMark } from "@/components/project-mark";
import { ProjectVisual } from "@/components/project-visual";
import { Status } from "@/components/project-card";
import { PostList } from "@/components/post-list";
import { Button } from "@/components/ui/button";

type Props = { params: Promise<{ slug: string }> };
export const dynamicParams = false;
export function generateStaticParams() {
  return projects.map(({ slug }) => ({ slug }));
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const project = getProject((await params).slug);
  if (!project) return {};
  return {
    title: project.name,
    description: project.description,
    alternates: { canonical: `/projects/${project.slug}` },
    openGraph: {
      title: `${project.name} — Hyperlight`,
      description: project.description,
      url: `/projects/${project.slug}`,
      images: [],
    },
    twitter: {
      card: "summary",
      title: `${project.name} — Hyperlight`,
      description: project.description,
      images: [],
    },
  };
}

export default async function ProjectPage({ params }: Props) {
  const project = getProject((await params).slug);
  if (!project) notFound();
  const related = getPostsByProject(project.slug);
  const next = projects[(projects.indexOf(project) + 1) % projects.length];
  return (
    <main id="main" className="container project-detail subpage">
      <Link className="back-link" href="/projects">
        <ArrowLeft size={15} /> All projects
      </Link>
      <div className="project-detail-hero">
        <div>
          <div className="project-detail-label">
            <ProjectMark slug={project.slug} width={37} height={37} />
            <span className="eyebrow">{project.category}</span>
          </div>
          <h1>{project.name}</h1>
          <p className="project-tagline">{project.tagline}</p>
          <p className="project-description">{project.description}</p>
          <div className="flex flex-wrap items-center gap-5">
            <Button asChild>
              <a
                href={project.repository}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Github size={16} /> View repository <ArrowUpRight size={15} />
              </a>
            </Button>
            <Status status={project.status} />
          </div>
        </div>
        <ProjectVisual slug={project.slug} large />
      </div>
      <div className="project-information">
        <aside>
          <div>
            <span>Stage</span>
            <Status status={project.status} />
          </div>
          {project.language && (
            <div>
              <span>
                {project.status === "In design"
                  ? "Planned language"
                  : "Language"}
              </span>
              <p>{project.language}</p>
            </div>
          )}
          <div>
            <span>Elsewhere</span>
            <a
              href={project.repository}
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub <ArrowUpRight size={13} />
            </a>
            {project.links?.map((link) => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
              >
                {link.label}
                <ArrowUpRight size={13} />
              </a>
            ))}
          </div>
        </aside>
        <div className="project-overview">
          <h2>
            {project.status === "In design"
              ? "What’s taking shape"
              : "What it does"}
          </h2>
          {project.overview.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
          {project.features.length > 0 && (
            <div className="feature-list">
              {project.features.map((feature, index) => (
                <div key={feature.title}>
                  <span className="eyebrow">
                    {(index + 1).toString().padStart(2, "0")}
                  </span>
                  <div>
                    <h3>{feature.title}</h3>
                    <p>{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {related.length > 0 && (
        <section className="related-writing" aria-labelledby="related-heading">
          <span className="eyebrow section-number">Blog</span>
          <h2 id="related-heading">Behind {project.name}.</h2>
          <PostList posts={related} />
        </section>
      )}
      <Link href={`/projects/${next.slug}`} className="next-project">
        <div>
          <span className="eyebrow">Keep exploring</span>
          <span>
            <ProjectMark slug={next.slug} />
            {next.name}
          </span>
        </div>
        <ArrowRight size={26} />
      </Link>
    </main>
  );
}
