"use client";

import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { StudyGallery } from "@/components/study-gallery";
import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <section className="hero container" aria-labelledby="hero-title">
      <div className="hero-copy">
        <div className="eyebrow hero-eyebrow">
          <span className="spectrum-rule" /> Infrastructure for every agent
        </div>
        <h1 id="hero-title">
          One platform.
          <br />
          <span>Any agent.</span>
        </h1>
        <p>
          Good tools get out of your way.
          <br className="hidden sm:block" /> We build the infrastructure that
          lets you do more—from your laptop to whatever comes next.
        </p>
        <div className="hero-actions flex flex-wrap items-center gap-3">
          <Button asChild>
            <Link href="/projects">
              Explore the projects <ArrowRight size={16} />
            </Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/blog">
              View blog <ArrowUpRight size={15} />
            </Link>
          </Button>
        </div>
        <div className="hero-footnote">
          <span className="tiny-cross">+</span>Built independent. Built for you.
        </div>
      </div>
      <StudyGallery />
    </section>
  );
}
