import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "About",
  description:
    "Infrastructure for agents and humans, any scale, any place. Why we’re building Hyperlight.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <main id="main" className="container subpage about-page">
      <div className="page-intro">
        <span className="eyebrow">
          <span className="spectrum-rule" /> A little about Hyperlight
        </span>
        <h1>
          More room
          <br />
          to do good work.
        </h1>
        <p>
          Infrastructure for agents and humans,
          <br />
          any scale, any place.
        </p>
      </div>
      <div className="about-content">
        <div className="about-aside">
          <span className="eyebrow">Independent by design.</span>
          <div className="about-optic" aria-hidden="true">
            {Array.from({ length: 9 }, (_, i) => (
              <span key={i} style={{ "--i": i } as React.CSSProperties} />
            ))}
          </div>
        </div>
        <div className="prose">
          <h2>We make tools for the work itself.</h2>
          <p>
            There’s a lot happening between an idea and working software.
            Finding the right code. Sharing a task. Checking whether the result
            holds up. Keeping one person’s—or one agent’s—changes from getting
            tangled up with everyone else’s.
          </p>
          <p>
            Those are the problems Hyperlight works on. We build focused tools,
            each with a clear job, and pay attention to the boundaries between
            them.
          </p>
          <h2>Agents and humans deserve the same clarity.</h2>
          <p>
            A useful tool should be easy to ask, honest about what it knows, and
            clear about what happened. That matters whether the caller is a
            person at a terminal or an agent working through an API.
          </p>
          <p>
            We care about inspectable evidence, explicit control, and workflows
            you can understand without guessing what’s happening underneath.
          </p>
          <h2>A laptop is a good place to start.</h2>
          <p>
            Running something locally shouldn’t feel like using a cut-down
            version of the real thing. We start with useful local workflows,
            then work through what it takes for those ideas to hold up across
            more processes, machines, and people.
          </p>
          <p>
            Some of our projects are available now. Others are still being
            designed. We’ll tell you which is which, and write about what we
            learn along the way.
          </p>
          <div className="flex flex-wrap gap-3 pt-5">
            <Button asChild>
              <Link href="/projects">
                Explore the projects <ArrowRight size={16} />
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <a
                href="https://github.com/hyper-light"
                target="_blank"
                rel="noopener noreferrer"
              >
                Follow the work <ArrowUpRight size={16} />
              </a>
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
