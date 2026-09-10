import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { Hero } from "@/components/hero";
import { ProjectCard } from "@/components/project-card";
import { PostList } from "@/components/post-list";
import { ProjectMark } from "@/components/project-mark";
import { projects } from "@/lib/projects";
import { getPosts } from "@/lib/posts";

export const metadata = { alternates: { canonical: "/" } };

export default function Home() {
  const featured = projects.filter((project) => project.featured);
  return (
    <main id="main">
      <Hero />
      <div className="ecosystem-strip">
        <div className="container ecosystem-inner">
          <span className="eyebrow">
            One shared direction.
            <br />
            Many ways forward.
          </span>
          <div className="ecosystem-projects">
            {projects.map((project) => (
              <Link key={project.slug} href={`/projects/${project.slug}`}>
                <ProjectMark slug={project.slug} width={22} height={22} />
                <span>{project.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
      <section
        className="container section-space"
        aria-labelledby="projects-heading"
        data-reveal
      >
        <div className="section-heading">
          <div>
            <span className="eyebrow section-number">01 / The projects</span>
            <h2 id="projects-heading">
              Small surfaces.
              <br />
              Deep capabilities.
            </h2>
          </div>
          <div className="section-heading-aside">
            <p>
              Understand your code. Coordinate the work.
              <br />
              Give every agent room to build.
            </p>
            <Link className="text-link" href="/projects">
              All projects{" "}
              <span className="count">
                {projects.length.toString().padStart(2, "0")}
              </span>
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {featured.map((project) => (
            <ProjectCard key={project.slug} project={project} />
          ))}
        </div>
      </section>
      <section
        className="approach-section"
        aria-labelledby="approach-heading"
        data-reveal
      >
        <div className="container approach-grid">
          <div>
            <span className="eyebrow section-number">02 / How we think</span>
            <h2 id="approach-heading">
              The work is complex.
              <br />
              <span className="text-muted">The tools shouldn&apos;t be.</span>
            </h2>
            <Link className="text-link" href="/about">
              A little about Hyperlight <ArrowUpRight size={15} />
            </Link>
          </div>
          <div className="principles">
            <div>
              <span>01</span>
              <div>
                <h3>Built for both sides of the keyboard.</h3>
                <p>
                  People need tools they can understand. Agents need tools they
                  can use reliably. We think those should be the same tools.
                </p>
              </div>
            </div>
            <div>
              <span>02</span>
              <div>
                <h3>Start here. Go further.</h3>
                <p>
                  A local workflow is a real workflow. We build from that
                  foundation, with room for the work to grow.
                </p>
              </div>
            </div>
            <div>
              <span>03</span>
              <div>
                <h3>Show your work.</h3>
                <p>
                  Clear boundaries, inspectable evidence, honest documentation.
                  Knowing what a tool can’t do matters, too.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section
        className="container section-space writing-section"
        aria-labelledby="writing-heading"
        data-reveal
      >
        <div className="section-heading">
          <div>
            <span className="eyebrow section-number">03 / Blog</span>
            <h2 id="writing-heading">What we&apos;re working on.</h2>
          </div>
          <Link className="text-link" href="/blog">
            View blog <ArrowRight size={16} />
          </Link>
        </div>
        <PostList posts={getPosts().slice(0, 3)} />
      </section>
      <section className="container closing-section" data-reveal>
        <div className="spectrum-rule" />
        <p>There’s more to build.</p>
        <h2>Come take a look.</h2>
        <a
          className="text-link"
          href="https://github.com/hyper-light"
          target="_blank"
          rel="noopener noreferrer"
        >
          Find us on GitHub <ArrowUpRight size={17} />
        </a>
      </section>
    </main>
  );
}
