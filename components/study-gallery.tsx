"use client";

import { Suspense, useState, useTransition } from "react";
import { ArrowLeft, ArrowRight, ArrowUpRight, Pause, Play } from "lucide-react";
import Link from "next/link";
import { SpectralArt } from "@/components/spectral-art";
import { StudyArtwork } from "@/components/study-artwork";
import { studies, type StudyId } from "@/lib/studies";
import { useMotionPreference } from "@/components/motion-provider";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function StudyGallery() {
  const [selected, setSelected] = useState<StudyId>("hyperlight");
  const [pending, startTransition] = useTransition();
  const { paused, reduced, toggle } = useMotionPreference();
  const index = studies.findIndex((item) => item.id === selected);
  const study = studies[index];
  function move(direction: number) {
    startTransition(() =>
      setSelected((current) => {
        const position = studies.findIndex((item) => item.id === current);
        return studies[(position + direction + studies.length) % studies.length]
          .id;
      }),
    );
  }
  return (
    <div
      className="hero-art-frame study-gallery"
      role="region"
      aria-roledescription="carousel"
      aria-label="Light studies"
    >
      <div className="study-artwork" aria-hidden="true" aria-busy={pending}>
        <Suspense fallback={<SpectralArt paused className="hero-sculpture" />}>
          <div className="study-stage" key={selected} data-study={selected}>
            <StudyArtwork
              id={selected}
              paused={paused}
              className="hero-sculpture"
            />
          </div>
        </Suspense>
      </div>
      <div className="study-controls">
        <div className="study-caption">
          <span className="study-index" aria-hidden="true">
            {String(index + 1).padStart(2, "0")} /{" "}
            {String(studies.length).padStart(2, "0")}
          </span>
          {study.id === "hyperlight" ? (
            <div className="study-caption-text">
              <span className="study-name">Hyperlight</span>
              <span className="study-title">{study.title}</span>
            </div>
          ) : (
            <Link
              className="study-caption-text study-caption-link"
              href={`/projects/${study.id}`}
              aria-label={`View ${study.name} project`}
            >
              <span className="study-name">
                {study.name}
                <ArrowUpRight size={11} />
              </span>
              <span className="study-title">{study.title}</span>
            </Link>
          )}
        </div>
        <div
          className="study-navigation"
          onKeyDown={(event) => {
            if (
              event.altKey ||
              event.ctrlKey ||
              event.metaKey ||
              event.shiftKey
            )
              return;
            if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
              event.preventDefault();
              move(event.key === "ArrowRight" ? 1 : -1);
            }
          }}
        >
          <button
            type="button"
            className="study-arrow"
            aria-label="Previous study"
            aria-keyshortcuts="ArrowLeft"
            onClick={() => move(-1)}
          >
            <ArrowLeft size={16} />
          </button>
          <button
            type="button"
            className="study-arrow"
            aria-label="Next study"
            aria-keyshortcuts="ArrowRight"
            onClick={() => move(1)}
          >
            <ArrowRight size={16} />
          </button>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="art-control study-motion-control"
                  aria-label={
                    reduced
                      ? "Reduced motion follows your device setting"
                      : paused
                        ? "Resume ambient animation"
                        : "Pause ambient animation"
                  }
                  aria-pressed={paused}
                  disabled={reduced}
                  onClick={toggle}
                >
                  {paused ? <Play size={12} /> : <Pause size={12} />}
                </button>
              </TooltipTrigger>
              <TooltipContent>
                {reduced
                  ? "Following your device’s motion preference"
                  : paused
                    ? "Resume all motion"
                    : "Pause all motion"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      <span className="sr-only" role="status" aria-live="polite">
        {study.name}: {study.title}. {study.description}
      </span>
    </div>
  );
}
