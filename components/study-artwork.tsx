"use client";

import { lazy, Suspense, type ComponentType } from "react";
import { ProjectMark } from "@/components/project-mark";
import { SpectralArt } from "@/components/spectral-art";
import type { StudyProps } from "@/components/studies/use-study-motion";
import type { StudyId } from "@/lib/studies";

const artwork = {
  hyperlight: SpectralArt,
  vorpal: lazy(() =>
    import("@/components/studies/vorpal").then((module) => ({
      default: module.VorpalStudy,
    })),
  ),
  focal: lazy(() =>
    import("@/components/studies/focal").then((module) => ({
      default: module.FocalStudy,
    })),
  ),
  slates: lazy(() =>
    import("@/components/studies/slates").then((module) => ({
      default: module.SlatesStudy,
    })),
  ),
  hecate: lazy(() =>
    import("@/components/studies/hecate").then((module) => ({
      default: module.HecateStudy,
    })),
  ),
  veil: lazy(() =>
    import("@/components/studies/veil").then((module) => ({
      default: module.VeilStudy,
    })),
  ),
  mantle: lazy(() =>
    import("@/components/studies/mantle").then((module) => ({
      default: module.MantleStudy,
    })),
  ),
  hyperscale: lazy(() =>
    import("@/components/studies/hyperscale").then((module) => ({
      default: module.HyperscaleStudy,
    })),
  ),
  hex: lazy(() =>
    import("@/components/studies/hex").then((module) => ({
      default: module.HexStudy,
    })),
  ),
  shards: lazy(() =>
    import("@/components/studies/shards").then((module) => ({
      default: module.ShardsStudy,
    })),
  ),
  athame: lazy(() =>
    import("@/components/studies/athame").then((module) => ({
      default: module.AthameStudy,
    })),
  ),
  reliquary: lazy(() =>
    import("@/components/studies/reliquary").then((module) => ({
      default: module.ReliquaryStudy,
    })),
  ),
  hoard: lazy(() =>
    import("@/components/studies/hoard").then((module) => ({
      default: module.HoardStudy,
    })),
  ),
  quiver: lazy(() =>
    import("@/components/studies/quiver").then((module) => ({
      default: module.QuiverStudy,
    })),
  ),
  clarion: lazy(() =>
    import("@/components/studies/clarion").then((module) => ({
      default: module.ClarionStudy,
    })),
  ),
} satisfies Record<StudyId, ComponentType<StudyProps>>;

/** A single lazy renderer keeps the landing gallery and project pages in sync. */
export function StudyArtwork({ id, ...props }: StudyProps & { id: StudyId }) {
  const Study = artwork[id];
  return <Study {...props} />;
}

export function StudyPreview({ id, ...props }: StudyProps & { id: StudyId }) {
  return (
    <Suspense
      fallback={
        <div className="study-preview-placeholder">
          <ProjectMark slug={id} width={48} height={48} />
        </div>
      }
    >
      <StudyArtwork id={id} {...props} />
    </Suspense>
  );
}
