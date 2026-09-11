"use client";

import { useLayoutEffect, useId, useMemo, useRef } from "react";
import { useStudyMotion } from "@/components/studies/use-study-motion";
import type { ProofFrameFunction } from "./proof-geometry";
import styles from "./proof-work.module.css";

const toneColor = {
  pass: "#a8c9bc",
  fail: "#d5a4ad",
  pending: "#aab8d2",
  error: "#d8bb95",
};
function color(tone: keyof typeof toneColor | "neutral" | undefined) {
  return tone && tone !== "neutral" ? toneColor[tone] : undefined;
}

type SceneNodes = {
  frame: ProofFrameFunction;
  portrait: boolean;
  time: number;
  selection: number;
  paths: SVGPathElement[];
  labels: SVGTextElement[];
  prism: SVGLinearGradientElement;
};

const cache = new WeakMap<SVGSVGElement, SceneNodes>();

function paint(svg: SVGSVGElement, nodes: SceneNodes, time: number) {
  const frame = nodes.frame(time, nodes.selection, nodes.portrait);
  frame.paths.forEach((path, index) => {
    const element = nodes.paths[index];
    element.setAttribute("d", path.d);
    element.setAttribute("opacity", path.opacity.toFixed(3));
    element.style.stroke = color(path.tone) ?? "";
    if (path.kind === "light")
      element.setAttribute(
        "stroke-dashoffset",
        (-time * 22 + index * 7).toFixed(2),
      );
  });
  frame.labels.forEach((label, index) => {
    const element = nodes.labels[index];
    element.setAttribute("x", label.x.toFixed(2));
    element.setAttribute("y", label.y.toFixed(2));
    element.setAttribute("opacity", (label.opacity ?? 1).toFixed(3));
    element.style.fill = color(label.tone) ?? "";
    if (label.surface) element.dataset.proofSurface = label.surface;
    else delete element.dataset.proofSurface;
    if (element.textContent !== label.text) element.textContent = label.text;
  });
  nodes.prism.setAttribute(
    "x1",
    (-100 + Math.sin(time * 0.23) * 130).toFixed(2),
  );
  nodes.prism.setAttribute(
    "x2",
    (760 + Math.sin(time * 0.19) * 110).toFixed(2),
  );
  svg.dataset.proofSelection = nodes.selection.toFixed(3);
}

function update(svg: SVGSVGElement, time: number) {
  const nodes = cache.get(svg);
  if (!nodes) return;
  const target = Number(svg.dataset.proofTarget);
  const delta = Math.min(0.1, Math.max(0, time - nodes.time));
  nodes.selection += (target - nodes.selection) * (1 - Math.exp(-delta * 7));
  if (Math.abs(target - nodes.selection) < 0.001) nodes.selection = target;
  nodes.time = time;
  paint(svg, nodes, time);
}

export function ProofScene({
  frame,
  selection,
  portrait,
  paused,
}: {
  frame: ProofFrameFunction;
  selection: number;
  portrait: boolean;
  paused: boolean;
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
    // Fast Refresh can retain this SVG while replacing its geometry function.
    // Rebind before animation resumes so old coordinates never target new labels.
    const rebound =
      !nodes || nodes.frame !== frame || nodes.portrait !== portrait;
    if (rebound) {
      nodes = {
        frame,
        portrait,
        selection: nodes?.selection ?? selection,
        time: nodes?.time ?? 0,
        paths: Array.from(
          svg.querySelectorAll<SVGPathElement>("[data-proof-path]"),
        ),
        labels: Array.from(
          svg.querySelectorAll<SVGTextElement>("[data-proof-label]"),
        ),
        prism:
          svg.querySelector<SVGLinearGradientElement>("[data-proof-prism]")!,
      };
      cache.set(svg, nodes);
    }
    if (
      nodes &&
      (rebound ||
        (paused && selectionChanged) ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches)
    ) {
      nodes.selection = selection;
      paint(svg, nodes, nodes.time);
    }
  }, [frame, portrait, paused, selection]);
  useStudyMotion({ ref, paused, update, fps: 60 });

  return (
    <svg
      ref={ref}
      className={portrait ? styles.portrait : styles.landscape}
      viewBox={portrait ? "0 0 420 740" : "0 0 800 520"}
      data-proof-scene=""
      data-portrait={String(portrait)}
      data-proof-target={selection}
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
          className={styles[path.kind]}
          d={path.d}
          opacity={path.opacity}
          fill={
            path.kind === "glass" || path.kind === "shade"
              ? `url(#${prefix}-glass)`
              : "none"
          }
          stroke={`url(#${prefix}-prism)`}
          style={{ stroke: color(path.tone) }}
          vectorEffect="non-scaling-stroke"
          pathLength={path.kind === "light" ? 200 : undefined}
          strokeDasharray={path.kind === "light" ? "12 188" : undefined}
        />
      ))}
      {initial.labels.map((label) => (
        <text
          key={label.id}
          data-proof-label={label.id}
          data-proof-surface={label.surface}
          className={
            label.kind === "heading"
              ? styles.sceneHeading
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
          style={{ fill: color(label.tone) }}
        >
          {label.text}
        </text>
      ))}
    </svg>
  );
}
