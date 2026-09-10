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
          Infrastructure and tools
          <br />
          for every agent.
        </h1>
        <p>
          An open-source, modular platform for agents.
          <br />
          Any scale, anywhere.
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
          <h2>Make tools and platform that scale.</h2>
          <p>
            Agents and artificial intelligence are changing everything, 
            including how we think about and run software. Traditional cloud
            solutions designed for human-scale usage actively degrade and break
            under agentic usage patterns and scale.
          </p>
          <p>
            Hyperlight builds tools and technologies that handle this scale by nature of their construction,
            while also running just as efficiently on your local laptop at home. We
            pride ourselves on ruthless optimization, minimal config, and being able
            to blend the best of well-tested distributed computational techniques with
            cutting edge approaches to auto-scaling, consensus, and more.
          </p>
          <h2>One platform for every agent.</h2>
          <p>
            The best platforms are workload agnostic, and the same goes for any agentic platform. We
            build tools and technology that support any agent, whether by adopting well-established 
            open source standards like OCI or FUSE or industry leading approaches like AWS's IAM access 
            and  identity management.
          </p>
          <p>
            We also take inspiration from the legendary Solid State Logic of Oxford London and their "Lego Studio"
            approach. We build tools that meet your agents where they're at and don't force monolithic adoption or 
            ecosystem lockin. Utilizing OSS technologies and well-established APIs, Hyperlight's ecosystem of tooling
            allows you to build the platform <i>you</i> need by integrating with what you have.
          </p>
          <h2>Open forever, open always.</h2>
          <p>
            We recognize that artificial intelligence offers significant economic opportunity, and there's ample
            temptation to default to closed-source. We believe in the power of FOSS - Hyperlight is not
            a company, it is a project designed to provide novel solutions to the infrastructural and platform problems
            inherent to the agentic future of software.
          </p>
          <p>
            Hyperlight is a work in progress and is constantly evolving. Learn
            with us along the way.
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
