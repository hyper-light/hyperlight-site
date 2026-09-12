"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Pause, Play, ArrowRight } from "lucide-react";
import { AnimationMotionControls } from "./animation-motion-controls";
import { useMotionPreference } from "@/components/motion-provider";
import { useStudyMotion } from "@/components/studies/use-study-motion";
import {
  embeddingFrame,
  lexicalExample,
  modeBlend,
  EMBEDDING_MODES,
  type Blend,
  type EmbeddingMode,
  type Point,
} from "./embedding-geometry";
import styles from "./vorpal-embeddings.module.css";
import articleTabs from "./article-tabs.module.css";

const example = lexicalExample();
const bucketSigns = new Map(
  example.routes.map(({ bucket, sign }) => [bucket, sign]),
);
const first = [
  embeddingFrame(0, [1, 0, 0]),
  embeddingFrame(0, [1, 0, 0], true),
];
const modes = {
  lexical: {
    label: "Lexical",
    metric: "256 dimensions · no training",
    title: "Words become signed features.",
    steps: ["Split identifiers", "Two signed hashes", "Normalize the vector"],
    description:
      "resolve_import_path and resolveImportPath split into the same three words. Each word contributes to two signed buckets in a 256-dimensional vector. The highlighted cells show this query’s buckets.",
    formula: "v[b] += sign(token)    →    v̂ = v / ‖v‖₂",
    detail:
      "Definition vectors use the name twice, then the signature and file basename. This matches shared words; it doesn't infer the meaning of an unfamiliar phrase.",
  },
  learned: {
    label: "Learned",
    metric: "Corpus-selected dimensions · up to 256",
    title: "The repository teaches the vocabulary.",
    steps: ["Word + subword counts", "PPMI → SVD", "Weighted pooling"],
    description:
      "Vorpal measures which words and character fragments occur together using PPMI, then compresses those associations with SVD. Queries combine learned token vectors and normalize the result.",
    formula: "co-occurrence → PPMI → SVD → ABTT → uSIF → L2",
    detail:
      "The corpus determines the dimension. Three-to-six-character fragments help with new identifiers; graph relationships can refine stored document vectors. There's no pretrained model to download.",
  },
  neural: {
    label: "Neural",
    metric: "768 dimensions · CodeRankEmbed",
    title: "Context changes the representation.",
    steps: ["Tokenize text", "Contextual encoder", "CLS pooling + L2"],
    description:
      "The pretrained encoder processes tokens together; Vorpal normalizes its final CLS representation. Queries get a search-specific prefix. Background document embeddings can include a leading comment and source text.",
    formula: "v̂ = L2(encoder(tokens)[CLS])    ·    768 dimensions",
    detail:
      "The encoder can rerank retrieved candidates; a separate background document-embedding index can add candidates. The f16 and f32 downloads use the same architecture and embedding method.",
  },
} as const;

type Nodes = {
  blend: Blend;
  mode: EmbeddingMode;
  time: number;
  sequenceStart: number;
  portrait: boolean;
  hardware: SVGPathElement[];
  componentFaces: SVGPathElement[];
  surfaces: SVGPathElement[];
  edges: SVGPathElement[];
  backs: SVGPathElement[];
  walls: SVGPathElement[];
  rims: SVGPathElement[];
  ribs: SVGPathElement[];
  etching: SVGPathElement[];
  sheens: SVGPathElement[];
  paths: SVGPathElement[];
  trails: SVGPathElement[];
  cells: SVGCircleElement[];
  operations: SVGPathElement[];
  signals: SVGCircleElement[];
  labels: SVGTextElement[];
  prism: SVGLinearGradientElement;
};
const cache = new WeakMap<SVGSVGElement, Nodes>();
function nodesFor(svg: SVGSVGElement) {
  let nodes = cache.get(svg);
  if (!nodes) {
    const paths = (key: string) =>
      Array.from(
        svg.querySelectorAll<SVGPathElement>(`[data-embedding-${key}]`),
      );
    nodes = {
      blend: [1, 0, 0],
      mode: "lexical",
      time: 0,
      sequenceStart: 0,
      portrait: svg.dataset.portrait === "true",
      hardware: paths("hardware"),
      componentFaces: paths("component-activity"),
      surfaces: paths("surface"),
      edges: paths("edge"),
      backs: paths("back"),
      walls: paths("wall"),
      rims: paths("rim"),
      ribs: paths("rib"),
      etching: paths("etching"),
      sheens: paths("sheen"),
      paths: paths("path"),
      trails: paths("trail"),
      cells: Array.from(
        svg.querySelectorAll<SVGCircleElement>("[data-embedding-cell]"),
      ),
      operations: paths("operation"),
      signals: Array.from(
        svg.querySelectorAll<SVGCircleElement>("[data-embedding-signal]"),
      ),
      labels: Array.from(
        svg.querySelectorAll<SVGTextElement>("[data-embedding-label]"),
      ),
      prism: svg.querySelector<SVGLinearGradientElement>(
        "[data-embedding-prism]",
      )!,
    };
    cache.set(svg, nodes);
  }
  return nodes;
}
function operationPath(point: Point, operation: string, cells: Point[]) {
  // Arithmetic takes place on the silicon plane, including its portrait pose.
  // A glyph fits inside one etched cell rather than floating over the board.
  const h = 1.3;
  const xAxis = {
    x: (cells[1].x - cells[0].x) / 5.5,
    y: (cells[1].y - cells[0].y) / 5.5,
  };
  const yAxis = {
    x: (cells[16].x - cells[0].x) / 5.5,
    y: (cells[16].y - cells[0].y) / 5.5,
  };
  const at = (x: number, y: number) =>
    `${(point.x + xAxis.x * x + yAxis.x * y).toFixed(2)},${(point.y + xAxis.y * x + yAxis.y * y).toFixed(2)}`;
  if (operation === "none") return "";
  if (operation === "multiply")
    return `M${at(-h, -h)}L${at(h, h)}M${at(h, -h)}L${at(-h, h)}`;
  return (
    `M${at(-h, 0)}L${at(h, 0)}` +
    (operation === "add" ? `M${at(0, -h)}L${at(0, h)}` : "")
  );
}
function paint(svg: SVGSVGElement, nodes: Nodes, time: number) {
  const processTime = Math.max(0, time - nodes.sequenceStart);
  const frame = embeddingFrame(time, nodes.blend, nodes.portrait, processTime);
  svg.dataset.embeddingMix = nodes.blend
    .map((value) => value.toFixed(3))
    .join(",");
  svg.dataset.embeddingTime = time.toFixed(3);
  svg.dataset.embeddingProcessTime = processTime.toFixed(3);
  svg.dataset.embeddingPhase = frame.phase.stage;
  svg.dataset.embeddingProgress = frame.phase.progress.toFixed(4);
  frame.hardware.forEach((part, i) => {
    nodes.hardware[i].setAttribute("d", part.d);
    nodes.hardware[i].setAttribute(
      "data-activity",
      (frame.partActivity[part.id] ?? 0).toFixed(4),
    );
  });
  const faces = frame.hardware.filter((part) =>
    ["board", "memory", "package", "contact", "socket", "bracket"].includes(
      part.kind,
    ),
  );
  faces.forEach((part, i) => {
    nodes.componentFaces[i].setAttribute("d", part.d);
    nodes.componentFaces[i].setAttribute(
      "opacity",
      (frame.partActivity[part.id] ?? 0).toFixed(4),
    );
  });
  frame.materials.forEach((material, i) => {
    for (const [elements, d] of [
      [nodes.surfaces, material.front],
      [nodes.edges, material.front],
      [nodes.backs, material.back],
      [nodes.walls, material.wall],
      [nodes.rims, material.rim],
      [nodes.ribs, material.ribs],
      [nodes.etching, material.etching],
      [nodes.sheens, material.sheen],
    ] as const)
      elements[i].setAttribute("d", d);
    const firstRow = Math.floor(i / 2) * 4;
    const firstColumn = (i % 2) * 8;
    const heat =
      Math.max(
        ...Array.from(
          { length: 32 },
          (_, cell) =>
            frame.cellActivity[
              (firstRow + Math.floor(cell / 8)) * 16 + firstColumn + (cell % 8)
            ],
        ),
      ) *
      (1 - nodes.blend[0] * 0.7);
    nodes.sheens[i].setAttribute(
      "stroke-opacity",
      (0.06 + heat * 0.65).toFixed(3),
    );
    nodes.edges[i].setAttribute(
      "stroke-opacity",
      (0.24 + heat * 0.65).toFixed(3),
    );
    nodes.surfaces[i].setAttribute(
      "fill-opacity",
      (0.045 + heat * 0.22).toFixed(3),
    );
  });
  frame.cells.forEach((p, i) => {
    const el = nodes.cells[i];
    el.setAttribute("cx", p.x.toFixed(2));
    el.setAttribute("cy", p.y.toFixed(2));
    el.setAttribute("opacity", frame.cellActivity[i].toFixed(3));
    el.setAttribute("r", ".75");
    const operation = nodes.operations[i];
    operation.setAttribute(
      "d",
      operationPath(p, frame.cellOperations[i], frame.cells),
    );
    operation.setAttribute("data-operation", frame.cellOperations[i]);
    operation.setAttribute(
      "opacity",
      (frame.operationActivity[i] * frame.operationOpacity).toFixed(3),
    );
  });
  frame.paths.forEach((path, i) => {
    nodes.paths[i].setAttribute("d", path.d);
    nodes.paths[i].setAttribute(
      "stroke-opacity",
      (0.14 * path.weight + path.activity * 0.72).toFixed(3),
    );
    nodes.paths[i].setAttribute("data-activity", path.activity.toFixed(4));
    nodes.paths[i].setAttribute("data-weight", path.weight.toFixed(4));
  });
  frame.signals.forEach((signal, i) => {
    const el = nodes.signals[i];
    el.setAttribute("cx", signal.point.x.toFixed(2));
    el.setAttribute("cy", signal.point.y.toFixed(2));
    el.setAttribute("r", signal.radius.toFixed(2));
    el.setAttribute("opacity", signal.opacity.toFixed(3));
    el.setAttribute("data-progress", signal.progress.toFixed(4));
    const trail = nodes.trails[i];
    trail.setAttribute(
      "d",
      frame.paths.find((path) => path.id === signal.pathId)!.d,
    );
    trail.setAttribute(
      "stroke-dashoffset",
      (-(signal.progress - 0.045)).toFixed(4),
    );
    trail.setAttribute("opacity", signal.opacity.toFixed(3));
  });
  frame.labels.forEach((label, i) => {
    const el = nodes.labels[i];
    el.setAttribute("x", label.x.toFixed(2));
    el.setAttribute("y", label.y.toFixed(2));
    el.setAttribute("opacity", label.opacity.toFixed(3));
    if (el.textContent !== label.text) el.textContent = label.text;
  });
  nodes.prism.setAttribute("x1", (-90 + Math.sin(time * 0.3) * 100).toFixed(2));
  nodes.prism.setAttribute("x2", (740 + Math.sin(time * 0.27) * 90).toFixed(2));
}
function update(svg: SVGSVGElement, time: number) {
  const nodes = nodesFor(svg);
  const target = modeBlend(svg.dataset.mode as EmbeddingMode);
  const amount =
    1 - Math.exp(-Math.min(0.1, Math.max(0, time - nodes.time)) * 5);
  nodes.blend = nodes.blend.map(
    (value, i) => value + (target[i] - value) * amount,
  ) as Blend;
  nodes.time = time;
  paint(svg, nodes, time);
}

function Scene({
  portrait,
  mode,
  paused,
}: {
  portrait: boolean;
  mode: EmbeddingMode;
  paused: boolean;
}) {
  const ref = useRef<SVGSVGElement>(null);
  const id = "embedding-" + useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const frame = first[Number(portrait)];
  useEffect(() => {
    const svg = ref.current;
    if (!svg) return;
    const nodes = nodesFor(svg);
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const changed = nodes.mode !== mode;
    if (changed) {
      nodes.mode = mode;
      nodes.sequenceStart = nodes.time;
    }
    if (paused || reduced) {
      nodes.blend = modeBlend(mode);
      // Keep a selected method inspectable without jumping the board's pose.
      if (changed || (reduced && nodes.time === 0))
        nodes.sequenceStart = nodes.time - 5.4;
      paint(svg, nodes, nodes.time);
    }
  }, [mode, paused]);
  useStudyMotion({ ref, paused, update, fps: 60 });
  return (
    <svg
      ref={ref}
      className={portrait ? styles.portrait : styles.landscape}
      viewBox={portrait ? "0 0 420 634" : "0 0 800 510"}
      data-embedding-scene=""
      data-portrait={String(portrait)}
      data-mode={mode}
      data-embedding-time="0.000"
      data-embedding-phase={frame.phase.stage}
      aria-hidden="true"
      focusable="false"
      fill="none"
    >
      <defs>
        <linearGradient
          id={id + "-glass"}
          gradientUnits="userSpaceOnUse"
          x1={portrait ? 100 : 210}
          y1="100"
          x2={portrait ? 320 : 650}
          y2="420"
        >
          <stop stopColor="#d9e3e9" stopOpacity=".7" />
          <stop offset=".18" stopColor="#667784" stopOpacity=".1" />
          <stop offset=".38" stopColor="#bbcbd9" stopOpacity=".45" />
          <stop offset=".51" stopColor="#d9e0e9" stopOpacity=".85" />
          <stop offset=".57" stopColor="#27323d" stopOpacity=".1" />
          <stop offset=".81" stopColor="#8b9daf" stopOpacity=".26" />
          <stop offset="1" stopColor="#d4dbe6" stopOpacity=".72" />
        </linearGradient>
        <linearGradient
          id={id + "-prism"}
          data-embedding-prism=""
          gradientUnits="userSpaceOnUse"
          x1="-90"
          y1="50"
          x2="740"
          y2="430"
        >
          <stop stopColor="#acd0c3" />
          <stop offset=".34" stopColor="#95b9d8" />
          <stop offset=".68" stopColor="#bca4cb" />
          <stop offset="1" stopColor="#d5c3a8" />
        </linearGradient>
        <radialGradient id={id + "-halo"}>
          <stop stopColor="#a2b9cb" stopOpacity=".07" />
          <stop offset="1" stopColor="#a2b9cb" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse
        cx={portrait ? 210 : 400}
        cy={portrait ? 315 : 255}
        rx={portrait ? 205 : 370}
        ry={portrait ? 245 : 220}
        fill={`url(#${id}-halo)`}
      />
      <g data-embedding-gpu="" className={styles.gpu}>
        {frame.hardware.map((part) => (
          <path
            key={part.id}
            data-embedding-hardware={part.id}
            data-gpu-kind={part.kind}
            data-embedding-gpu-board={part.id === "pcb" ? "" : undefined}
            data-embedding-gpu-package={
              part.id === "gpu-package" ? "" : undefined
            }
            data-embedding-gpu-memory={part.kind === "memory" ? "" : undefined}
            data-embedding-gpu-contact={
              part.kind === "contact" ? "" : undefined
            }
            d={part.d}
            stroke={`url(#${id}-prism)`}
            fill={`url(#${id}-glass)`}
          />
        ))}
        {frame.hardware
          .filter((part) =>
            [
              "board",
              "memory",
              "package",
              "contact",
              "socket",
              "bracket",
            ].includes(part.kind),
          )
          .map((part) => (
            <path
              key={part.id}
              data-embedding-component-activity={part.id}
              d={part.d}
              fill={`url(#${id}-prism)`}
              fillOpacity=".28"
              stroke={`url(#${id}-prism)`}
              strokeWidth="1"
              strokeOpacity=".9"
              opacity={frame.partActivity[part.id] ?? 0}
            />
          ))}
        {frame.materials.map((material, i) => (
          <g key={i}>
            <path
              data-embedding-back=""
              d={material.back}
              stroke="#a7bdcd"
              strokeWidth=".65"
              strokeOpacity=".18"
            />
            <path
              data-embedding-wall=""
              d={material.wall}
              fill={`url(#${id}-prism)`}
              fillOpacity=".06"
            />
            <path
              data-embedding-surface=""
              d={material.front}
              fill={`url(#${id}-glass)`}
              fillOpacity=".065"
            />
            <path
              data-embedding-edge=""
              d={material.front}
              stroke={`url(#${id}-prism)`}
              strokeWidth=".8"
              strokeOpacity=".28"
            />
            <path
              data-embedding-rim=""
              d={material.rim}
              stroke="#c0d0de"
              strokeWidth=".55"
              strokeOpacity=".3"
            />
            <path
              data-embedding-rib=""
              d={material.ribs}
              stroke={`url(#${id}-prism)`}
              strokeWidth=".6"
              strokeOpacity=".3"
            />
            <path
              data-embedding-etching=""
              d={material.etching}
              stroke="#b3c4d3"
              strokeWidth=".5"
              strokeOpacity=".24"
            />
            <path
              data-embedding-sheen=""
              d={material.sheen}
              stroke={`url(#${id}-prism)`}
              strokeWidth="1.3"
              strokeOpacity=".08"
            />
          </g>
        ))}
        {frame.paths.map((path) => (
          <path
            key={path.id}
            data-embedding-path={path.id}
            data-kind={path.kind}
            data-mode={path.mode}
            data-weight={path.weight.toFixed(4)}
            data-token={path.token}
            data-bucket={path.bucket}
            data-sign={path.sign}
            data-activity={path.activity.toFixed(4)}
            d={path.d}
            className={styles.signalPath}
            stroke={`url(#${id}-prism)`}
            strokeOpacity={0.14 * path.weight + path.activity * 0.72}
            strokeWidth="1"
          />
        ))}
        {frame.cells.map((p, i) => (
          <circle
            key={i}
            data-embedding-cell={i}
            data-sign={bucketSigns.get(i)}
            cx={p.x.toFixed(2)}
            cy={p.y.toFixed(2)}
            r=".75"
            fill={`url(#${id}-prism)`}
            opacity={frame.cellActivity[i]}
          />
        ))}
        {frame.cells.map((p, i) => (
          <path
            key={i}
            data-embedding-operation={i}
            data-operation={frame.cellOperations[i]}
            d={operationPath(p, frame.cellOperations[i], frame.cells)}
            opacity={frame.operationActivity[i] * frame.operationOpacity}
            className={styles.operation}
            stroke={`url(#${id}-prism)`}
          />
        ))}
        {frame.signals.map((signal) => (
          <path
            key={signal.id}
            data-embedding-trail={signal.id}
            data-kind={signal.kind}
            data-mode={signal.mode}
            d={frame.paths.find((path) => path.id === signal.pathId)!.d}
            pathLength="1"
            strokeDasharray=".045 .955"
            strokeDashoffset={-(signal.progress - 0.045)}
            opacity={signal.opacity}
            className={styles.signalPath}
            strokeWidth="2.4"
          />
        ))}
        {frame.signals.map((signal) => (
          <circle
            key={signal.id}
            data-embedding-signal={signal.id}
            data-kind={signal.kind}
            data-mode={signal.mode}
            data-path-id={signal.pathId}
            data-progress={signal.progress.toFixed(4)}
            cx={signal.point.x.toFixed(2)}
            cy={signal.point.y.toFixed(2)}
            r={signal.radius}
            opacity={signal.opacity}
            fill={`url(#${id}-prism)`}
            className={styles.signal}
          />
        ))}
        {frame.labels.map((label) => (
          <text
            key={label.id}
            data-embedding-label={label.id}
            data-embedding-word={label.kind === "token" ? "" : undefined}
            data-kind={label.kind}
            x={label.x}
            y={label.y}
            textAnchor={label.anchor}
            opacity={label.opacity}
            className={label.kind === "token" ? styles.word : styles.sceneLabel}
          >
            {label.text}
          </text>
        ))}
      </g>
    </svg>
  );
}

export function VorpalEmbeddings() {
  const [mode, setMode] = useState<EmbeddingMode>("lexical");
  const { paused, reduced, toggle } = useMotionPreference();
  const id = "embedding-study-" + useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const content = modes[mode];
  function keyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const index = EMBEDDING_MODES.indexOf(mode);
    const next =
      event.key === "ArrowRight"
        ? (index + 1) % 3
        : event.key === "ArrowLeft"
          ? (index + 2) % 3
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? 2
              : null;
    if (next === null) return;
    event.preventDefault();
    setMode(EMBEDDING_MODES[next]);
    event.currentTarget.parentElement
      ?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
      [next].focus();
  }
  return (
    <figure
      className={styles.figure}
      data-vorpal-embeddings=""
      aria-labelledby={id + "-title"}
      aria-describedby={id + "-caption"}
    >
      <div className={styles.header}>
        <div>
          <span className={styles.eyebrow}>VORPAL / REPRESENTATION</span>
          <h3 id={id + "-title"} className={styles.title}>
            From words to a vector.
          </h3>
        </div>
        <AnimationMotionControls unavailableReplayLabel="Replay embedding animation (unavailable)">
          <button
            type="button"
            className={styles.motion}
            onClick={toggle}
            disabled={reduced}
            aria-pressed={paused}
            aria-label={
              reduced
                ? "Embeddings follow reduced motion"
                : paused
                  ? "Resume embedding animation"
                  : "Pause embedding animation"
            }
          >
            {paused ? (
              <Play size={15} aria-hidden="true" />
            ) : (
              <Pause size={15} aria-hidden="true" />
            )}
          </button>
        </AnimationMotionControls>
      </div>
      <div
        className={articleTabs.tabs}
        role="tablist"
        aria-label="Embedding method"
      >
        {EMBEDDING_MODES.map((key) => (
          <button
            key={key}
            id={`${id}-${key}`}
            type="button"
            role="tab"
            aria-selected={mode === key}
            aria-controls={id + "-panel"}
            tabIndex={mode === key ? 0 : -1}
            onClick={() => setMode(key)}
            onKeyDown={keyDown}
          >
            {modes[key].label}
          </button>
        ))}
      </div>
      <div
        id={id + "-panel"}
        role="tabpanel"
        aria-labelledby={`${id}-${mode}`}
        data-embedding-panel={mode}
      >
        <div className={styles.metric}>{content.metric}</div>
        <Scene portrait={false} mode={mode} paused={paused} />
        <Scene portrait mode={mode} paused={paused} />
        <ol className={styles.steps}>
          {content.steps.map((step, i) => (
            <li key={step}>
              <span>{String(i + 1).padStart(2, "0")}</span>
              {step}
              {i < 2 && <ArrowRight size={12} aria-hidden="true" />}
            </li>
          ))}
        </ol>
        <div className={styles.explanation}>
          <h4>{content.title}</h4>
          <p>{content.description}</p>
          <code className={styles.formula}>{content.formula}</code>
          <p className={styles.detail}>{content.detail}</p>
          {mode === "lexical" && (
            <div
              className={styles.buckets}
              aria-label="Actual signed hash buckets for the example query"
            >
              {example.routes.map((route, i) => (
                <span key={i}>
                  {route.token} <span aria-hidden="true">→</span> [
                  {route.bucket}] {route.sign > 0 ? "+1" : "−1"}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
      <figcaption className={styles.caption} id={id + "-caption"}>
        The GPU illustrates the computation; it isn’t required for lexical
        hashing. Lexical buckets are calculated from the example query. Learned
        and neural signals are illustrative. Activity density is not measured
        GPU utilization or model output.
      </figcaption>
    </figure>
  );
}
