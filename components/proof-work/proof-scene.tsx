"use client";

import { useLayoutEffect, useId, useMemo, useRef } from "react";
import { useStudyMotion } from "@/components/studies/use-study-motion";
import type { ProofFrameFunction } from "./proof-geometry";
import {
  createProofPainter,
  proofPathFill,
  proofToneColor,
  type ProofFramePainter,
} from "./proof-scene-painter";
import styles from "./proof-work.module.css";

type SceneNodes = {
  frame: ProofFrameFunction;
  portrait: boolean;
  time: number;
  selection: number;
  transition: { from: number; target: number; elapsed: number };
  paint: ProofFramePainter;
};

const cache = new WeakMap<SVGSVGElement, SceneNodes>();

function paint(nodes: SceneNodes, time: number) {
  nodes.paint(
    nodes.frame(time, nodes.selection, nodes.portrait),
    time,
    nodes.selection,
  );
}

function update(svg: SVGSVGElement, time: number) {
  const nodes = cache.get(svg);
  if (!nodes) return;
  const target = Number(svg.dataset.proofTarget);
  // The study clock already excludes paused/hidden time. Capping an active
  // interval here makes slow devices fall behind the lifecycle controls.
  const delta = Math.max(0, time - nodes.time);
  const secondsPerStep = Number(svg.dataset.proofStepDuration);
  if (secondsPerStep > 0) {
    if (target !== nodes.transition.target) {
      nodes.transition = { from: nodes.selection, target, elapsed: 0 };
    }
    const transition = nodes.transition;
    transition.elapsed += delta;
    const distance = Math.abs(target - transition.from);
    const limit = Number(svg.dataset.proofTransitionLimit);
    const duration = Math.min(
      secondsPerStep * distance,
      limit > 0 ? limit : Infinity,
    );
    const progress = distance ? Math.min(1, transition.elapsed / duration) : 1;
    const eased = progress * progress * (3 - 2 * progress);
    nodes.selection = transition.from + (target - transition.from) * eased;
  } else {
    nodes.selection += (target - nodes.selection) * (1 - Math.exp(-delta * 7));
  }
  if (Math.abs(target - nodes.selection) < 0.001) nodes.selection = target;
  nodes.time = time;
  paint(nodes, time);
}

export function ProofScene({
  frame,
  selection,
  portrait,
  paused,
  stepDuration = 0,
  transitionLimit,
  height,
}: {
  frame: ProofFrameFunction;
  selection: number;
  portrait: boolean;
  paused: boolean;
  stepDuration?: number;
  /** Optional duration cap for direct stage selection, independent of distance. */
  transitionLimit?: number;
  /** A larger physical assembly may need extra room without shrinking its lettering. */
  height?: number;
}) {
  const ref = useRef<SVGSVGElement>(null);
  const previousSelection = useRef(selection);
  const initial = useMemo(() => frame(0, 0, portrait), [frame, portrait]);
  const prefix = "proof-" + useId().replace(/[^a-zA-Z0-9_-]/g, "");
  useLayoutEffect(() => {
    const svg = ref.current;
    if (!svg) return;
    const selectionChanged = previousSelection.current !== selection;
    previousSelection.current = selection;
    let nodes = cache.get(svg);
    const firstMount = !nodes;
    // Fast Refresh can retain this SVG while replacing its geometry function.
    // Rebind before animation resumes so old coordinates never target new labels.
    const rebound =
      !nodes || nodes.frame !== frame || nodes.portrait !== portrait;
    if (rebound) {
      nodes = {
        frame,
        portrait,
        selection: nodes?.selection ?? selection,
        transition: nodes?.transition ?? {
          from: selection,
          target: selection,
          elapsed: 0,
        },
        time: nodes?.time ?? 0,
        paint: createProofPainter(
          svg,
          Array.from(svg.querySelectorAll<SVGPathElement>("[data-proof-path]")),
          Array.from(
            svg.querySelectorAll<SVGTextElement>("[data-proof-label]"),
          ),
          svg.querySelector<SVGLinearGradientElement>("[data-proof-prism]")!,
          prefix,
        ),
      };
      cache.set(svg, nodes);
    }
    if (
      nodes &&
      (rebound ||
        (paused && selectionChanged) ||
        // Keep an offscreen scene's requested stage current without replaying
        // an old lifecycle when its containing view becomes visible.
        (selectionChanged && svg.getClientRects().length === 0) ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches)
    ) {
      // A geometry-only Fast Refresh must retain the in-flight pose, not
      // teleport to the selected stage while the preview is being edited.
      if (
        firstMount ||
        !rebound ||
        selectionChanged ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ) {
        nodes.selection = selection;
        nodes.transition = { from: selection, target: selection, elapsed: 0 };
      }
      paint(nodes, nodes.time);
    }
  }, [frame, portrait, paused, selection, prefix]);
  useStudyMotion({ ref, paused, update, fps: 60 });

  return (
    <svg
      ref={ref}
      className={portrait ? styles.portrait : styles.landscape}
      viewBox={`0 0 ${portrait ? 420 : 800} ${height ?? (portrait ? 740 : 520)}`}
      data-proof-scene=""
      data-portrait={String(portrait)}
      data-proof-target={selection}
      data-proof-step-duration={stepDuration}
      data-proof-transition-limit={transitionLimit}
      aria-hidden="true"
      focusable="false"
      fill="none"
    >
      <defs>
        <linearGradient
          id={prefix + "-prism"}
          data-proof-prism=""
          gradientUnits="userSpaceOnUse"
          x1="-100"
          y1="80"
          x2="760"
          y2="360"
        >
          <stop stopColor="#a4cabe" />
          <stop offset=".34" stopColor="#9db8d5" />
          <stop offset=".68" stopColor="#b7a2c9" />
          <stop offset="1" stopColor="#d0bda0" />
        </linearGradient>
        <linearGradient id={prefix + "-glass"} x1="0" y1="0" x2=".8" y2="1">
          <stop stopColor="#b8cbd7" stopOpacity=".24" />
          <stop offset=".22" stopColor="#7c91a1" stopOpacity=".02" />
          <stop offset=".63" stopColor="#c0bdd5" stopOpacity=".12" />
          <stop offset="1" stopColor="#a4bacb" stopOpacity=".025" />
        </linearGradient>
        <radialGradient id={prefix + "-halo"}>
          <stop stopColor="#94acc1" stopOpacity=".055" />
          <stop offset="1" stopColor="#94acc1" stopOpacity="0" />
        </radialGradient>
        {(
          [
            ["paper", "#6b7c89", "#1c2631", "#354250"],
            ["circuit", "#344d50", "#111d25", "#253342"],
            ["metal", "#6c788b", "#222c3a", "#42475b"],
            ["silicon", "#303747", "#0c111b", "#242033"],
            ["shadow", "#020407", "#020407", "#020407"],
            ["emissive", "#b7e3d6", "#669daa", "#b8b0dc"],
          ] as const
        ).map(([name, start, middle, end]) => (
          <linearGradient
            key={name}
            id={`${prefix}-${name}`}
            x1="0"
            y1="0"
            x2=".85"
            y2="1"
          >
            <stop stopColor={start} />
            <stop offset=".48" stopColor={middle} />
            <stop offset="1" stopColor={end} />
          </linearGradient>
        ))}
      </defs>
      <ellipse
        cx={portrait ? 210 : 400}
        cy="215"
        rx={portrait ? 200 : 365}
        ry="175"
        fill={`url(#${prefix}-halo)`}
      />
      {initial.paths.map((path) => (
        <path
          key={path.id}
          data-proof-path={path.id}
          data-proof-kind={path.kind}
          data-proof-material={path.material}
          className={styles[path.kind]}
          d={path.d}
          // Match paint() precision across server V8 and browser engines.
          opacity={path.opacity.toFixed(3)}
          display={path.opacity === 0 ? "none" : undefined}
          fill={proofPathFill(path, prefix)}
          fillOpacity={path.fillOpacity}
          strokeOpacity={path.strokeOpacity?.toFixed(3)}
          stroke={`url(#${prefix}-prism)`}
          style={{
            stroke:
              path.material === "shadow" ? "none" : proofToneColor(path.tone),
          }}
          vectorEffect="non-scaling-stroke"
          pathLength={path.kind === "light" ? 200 : undefined}
          strokeDasharray={
            path.dashArray ?? (path.kind === "light" ? "12 188" : undefined)
          }
        />
      ))}
      {initial.labels.map((label) => (
        <text
          key={label.id}
          data-proof-label={label.id}
          data-proof-type={label.kind ?? "label"}
          data-proof-surface={label.surface}
          transform={label.transform}
          className={
            label.kind === "heading"
              ? styles.sceneHeading
              : label.kind === "name"
                ? styles.sceneName
                : label.kind === "small"
                  ? styles.sceneSmall
                  : label.kind === "status"
                    ? styles.sceneStatus
                    : styles.sceneLabel
          }
          x={label.x}
          y={label.y}
          textAnchor={label.anchor ?? "middle"}
          opacity={label.opacity ?? 1}
          style={{ fill: proofToneColor(label.tone) }}
        >
          {label.text}
        </text>
      ))}
    </svg>
  );
}
