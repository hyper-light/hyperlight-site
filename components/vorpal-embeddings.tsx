"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Pause, Play, ArrowRight } from "lucide-react";
import { useMotionPreference } from "@/components/motion-provider";
import { useStudyMotion } from "@/components/studies/use-study-motion";
import {
  embeddingFrame,
  lexicalExample,
  modeBlend,
  EMBEDDING_MODES,
  type Blend,
  type EmbeddingMode,
} from "./embedding-geometry";
import styles from "./vorpal-embeddings.module.css";
import articleTabs from "./article-tabs.module.css";

const example = lexicalExample();
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
      "resolve_import_path and resolveImportPath split into the same three words. Each word contributes to two signed buckets in a 256-dimensional vector. The highlighted cells below correspond to this query’s actual buckets.",
    formula: "v[b] += sign(token)    →    v̂ = v / ‖v‖₂",
    detail:
      "Code definitions use the name twice, followed by the signature and file basename. This measures shared words; it does not infer the meaning of an unfamiliar phrase.",
  },
  learned: {
    label: "Learned",
    metric: "Corpus-selected dimensions · up to 256",
    title: "The repository teaches the vocabulary.",
    steps: ["Word + subword counts", "PPMI → SVD", "Weighted pooling"],
    description:
      "Vorpal counts words and character fragments that occur together in definitions. PPMI measures their association; SVD produces a compact basis. At query time, the learned token vectors are pooled and normalized.",
    formula: "co-occurrence → PPMI → SVD → ABTT → uSIF → L2",
    detail:
      "The dimension is selected from the corpus. Three-to-six-character fragments help with new identifiers. Graph relationships can also refine stored document vectors. No pretrained model download is needed.",
  },
  neural: {
    label: "Neural",
    metric: "768 dimensions · CodeRankEmbed",
    title: "Context changes the representation.",
    steps: ["Tokenize text", "Contextual encoder", "CLS pooling + L2"],
    description:
      "A pretrained encoder processes tokens together. Vorpal takes the final CLS representation and normalizes it. Queries receive a search-specific prefix; background document embeddings can also include a leading comment and source text.",
    formula: "v̂ = L2(encoder(tokens)[CLS])    ·    768 dimensions",
    detail:
      "The encoder can rerank retrieved candidates. A separate background index of document embeddings can introduce additional candidates. The f16 and f32 downloads use the same architecture, not different embedding methods.",
  },
} as const;

type Nodes = {
  blend: Blend;
  time: number;
  portrait: boolean;
  surfaces: SVGPathElement[];
  edges: SVGPathElement[];
  lines: SVGPathElement[];
  cells: SVGCircleElement[];
  connections: SVGPathElement[];
  inputs: SVGPathElement[];
  words: SVGTextElement[];
  flows: SVGPathElement[];
  outgoing: SVGPathElement[];
  rings: SVGPathElement[];
  rays: SVGPathElement[];
  points: SVGCircleElement[];
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
      time: 0,
      portrait: svg.dataset.portrait === "true",
      surfaces: paths("surface"),
      edges: paths("edge"),
      lines: paths("line"),
      cells: Array.from(
        svg.querySelectorAll<SVGCircleElement>("[data-embedding-cell]"),
      ),
      connections: paths("connection"),
      inputs: paths("input"),
      words: Array.from(
        svg.querySelectorAll<SVGTextElement>("[data-embedding-word]"),
      ),
      flows: paths("flow"),
      outgoing: paths("outgoing"),
      rings: paths("ring"),
      rays: paths("ray"),
      points: Array.from(
        svg.querySelectorAll<SVGCircleElement>("[data-embedding-point]"),
      ),
      prism: svg.querySelector<SVGLinearGradientElement>(
        "[data-embedding-prism]",
      )!,
    };
    cache.set(svg, nodes);
  }
  return nodes;
}
function paint(svg: SVGSVGElement, nodes: Nodes, time: number) {
  svg.dataset.embeddingMix = nodes.blend
    .map((value) => value.toFixed(3))
    .join(",");
  const frame = embeddingFrame(time, nodes.blend, nodes.portrait);
  const assign = (elements: SVGPathElement[], paths: string[]) =>
    elements.forEach((el, i) => el.setAttribute("d", paths[i % paths.length]));
  assign(nodes.surfaces, frame.surfaces);
  assign(nodes.edges, frame.surfaces);
  assign(nodes.lines, frame.lines);
  assign(nodes.connections, frame.connections);
  nodes.flows.forEach((el, i) =>
    el.setAttribute("d", frame.flows[Math.floor(i / 2)]),
  );
  nodes.outgoing.forEach((el, i) =>
    el.setAttribute("d", frame.outgoing[Math.floor(i / 2)]),
  );
  assign(nodes.rings, frame.rings);
  nodes.surfaces.forEach((el, i) =>
    el.setAttribute(
      "fill-opacity",
      (
        nodes.blend[0] * (i === 7 ? 0.06 : 0.001) +
        nodes.blend[1] * ([1, 3, 6].includes(i) ? 0.07 : 0.005) +
        nodes.blend[2] * 0.06 +
        Math.sin(time * 0.4 + i * 0.5) ** 2 * 0.015
      ).toFixed(3),
    ),
  );
  nodes.edges.forEach((el, i) =>
    el.setAttribute(
      "stroke-opacity",
      (
        nodes.blend[0] * (i === 7 ? 0.45 : 0.015) +
        (1 - nodes.blend[0]) * 0.22
      ).toFixed(3),
    ),
  );
  nodes.lines.forEach((el, i) =>
    el.setAttribute(
      "stroke-opacity",
      (
        nodes.blend[0] * (i < 32 ? 0.12 : 0.015) +
        (1 - nodes.blend[0]) * 0.16
      ).toFixed(3),
    ),
  );
  nodes.cells.forEach((el, i) => {
    const p = frame.cells[i];
    el.setAttribute("cx", p.x.toFixed(2));
    el.setAttribute("cy", p.y.toFixed(2));
    const hot = example.vector[i] !== 0;
    const intensity =
      nodes.blend[0] * (hot ? 0.96 : 0.24) +
      (1 - nodes.blend[0]) *
        (0.35 + 0.45 * Math.sin(i * 0.37 - time * 0.8) ** 6);
    el.setAttribute("opacity", intensity.toFixed(3));
    el.setAttribute(
      "r",
      (hot ? 2.8 : 1.3 + (1 - nodes.blend[0]) * 0.55).toFixed(2),
    );
  });
  nodes.connections.forEach((el) =>
    el.setAttribute(
      "opacity",
      (0.025 + 0.12 * (1 - nodes.blend[0])).toFixed(3),
    ),
  );
  frame.inputs.forEach((item, i) => {
    nodes.inputs[i].setAttribute("d", item.body);
    nodes.words[i].setAttribute("x", item.x.toFixed(2));
    nodes.words[i].setAttribute("y", item.y.toFixed(2));
  });
  frame.vectors.forEach((item, i) => {
    nodes.rays[i].setAttribute("d", item.ray);
    nodes.points[i].setAttribute("cx", item.point.x.toFixed(2));
    nodes.points[i].setAttribute("cy", item.point.y.toFixed(2));
  });
  [...nodes.flows, ...nodes.outgoing].forEach((el, i) => {
    if (el.dataset.energy !== undefined)
      el.setAttribute("stroke-dashoffset", (-time * 31 + i * 17).toFixed(2));
  });
  nodes.prism.setAttribute("x1", (-90 + Math.sin(time * 0.3) * 160).toFixed(2));
  nodes.prism.setAttribute(
    "x2",
    (740 + Math.sin(time * 0.27) * 130).toFixed(2),
  );
}
function update(svg: SVGSVGElement, time: number) {
  const nodes = nodesFor(svg);
  const mode = svg.dataset.mode as EmbeddingMode;
  const target = modeBlend(mode);
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
    if (
      paused ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      const nodes = nodesFor(svg);
      nodes.blend = modeBlend(mode);
      paint(svg, nodes, nodes.time);
    }
  }, [mode, paused]);
  useStudyMotion({ ref, paused, update, fps: 60 });
  const opticalPath = (paths: string[], key: "flow" | "outgoing") =>
    paths.map((d, i) => (
      <g key={i}>
        <path
          {...{ [`data-embedding-${key}`]: "" }}
          d={d}
          stroke={`url(#${id}-prism)`}
          strokeOpacity=".13"
          strokeWidth=".7"
        />
        <path
          {...{ [`data-embedding-${key}`]: "" }}
          data-energy=""
          d={d}
          pathLength="200"
          stroke={`url(#${id}-prism)`}
          strokeOpacity=".62"
          strokeWidth="1.2"
          strokeDasharray="11 189"
          strokeDashoffset={i * 17}
          strokeLinecap="round"
        />
      </g>
    ));
  return (
    <svg
      ref={ref}
      className={portrait ? styles.portrait : styles.landscape}
      viewBox={portrait ? "0 0 420 634" : "0 0 800 510"}
      data-embedding-scene=""
      data-portrait={String(portrait)}
      data-mode={mode}
      aria-hidden="true"
      focusable="false"
      fill="none"
    >
      <defs>
        <linearGradient id={id + "-glass"} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#c5d8e1" stopOpacity=".35" />
          <stop offset=".28" stopColor="#81939f" stopOpacity=".08" />
          <stop offset=".52" stopColor="#bfd0df" stopOpacity=".3" />
          <stop offset=".71" stopColor="#314452" stopOpacity=".1" />
          <stop offset="1" stopColor="#b7c4d0" stopOpacity=".26" />
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
        cy={portrait ? 300 : 250}
        rx={portrait ? 185 : 275}
        ry="200"
        fill={`url(#${id}-halo)`}
      />
      {opticalPath(frame.flows, "flow")}
      {frame.surfaces.map((d, i) => (
        <g key={i}>
          <path
            data-embedding-surface=""
            d={d}
            fill={`url(#${id}-glass)`}
            fillOpacity={i === 7 ? 0.06 : 0.001}
          />
          <path
            data-embedding-edge=""
            d={d}
            stroke={`url(#${id}-prism)`}
            strokeWidth=".8"
            strokeOpacity={i === 7 ? 0.45 : 0.015}
          />
        </g>
      ))}
      {frame.lines.map((d, i) => (
        <path
          key={i}
          data-embedding-line=""
          d={d}
          stroke="#a8bfce"
          strokeOpacity=".12"
          strokeWidth=".55"
        />
      ))}
      {frame.connections.map((d, i) => (
        <path
          key={i}
          data-embedding-connection=""
          d={d}
          stroke={`url(#${id}-prism)`}
          opacity=".025"
          strokeWidth=".7"
        />
      ))}
      {frame.cells.map((p, i) => (
        <circle
          key={i}
          data-embedding-cell={i}
          cx={p.x.toFixed(2)}
          cy={p.y.toFixed(2)}
          r={example.vector[i] ? 2.8 : 1.3}
          fill={`url(#${id}-prism)`}
          opacity={example.vector[i] ? 0.96 : 0.24}
        />
      ))}
      {opticalPath(frame.outgoing, "outgoing")}
      {frame.rings.map((d, i) => (
        <path
          key={i}
          data-embedding-ring=""
          d={d}
          stroke={`url(#${id}-prism)`}
          strokeOpacity=".26"
          strokeWidth=".65"
        />
      ))}
      {frame.vectors.map((v, i) => (
        <g key={i}>
          <path
            data-embedding-ray=""
            d={v.ray}
            stroke={`url(#${id}-prism)`}
            strokeOpacity=".13"
            strokeWidth=".7"
          />
          <circle
            data-embedding-point=""
            cx={v.point.x.toFixed(2)}
            cy={v.point.y.toFixed(2)}
            r="1.65"
            fill={`url(#${id}-prism)`}
            opacity=".72"
          />
        </g>
      ))}
      {frame.inputs.map((item, i) => (
        <g key={i}>
          <path
            data-embedding-input=""
            d={item.body}
            fill={`url(#${id}-glass)`}
            fillOpacity="0"
            stroke={`url(#${id}-prism)`}
            strokeWidth=".8"
            strokeOpacity=".48"
          />
          <text
            data-embedding-word=""
            x={item.x.toFixed(2)}
            y={item.y.toFixed(2)}
            dominantBaseline="middle"
            textAnchor="middle"
            className={styles.word}
          >
            {item.word}
          </text>
        </g>
      ))}
      <text
        x={portrait ? 210 : 142}
        y={portrait ? 25 : 107}
        textAnchor="middle"
        className={styles.sceneLabel}
      >
        QUERY TOKENS
      </text>
      <text
        x={portrait ? 210 : 662}
        y={portrait ? 627 : 369}
        textAnchor="middle"
        className={styles.sceneLabel}
      >
        UNIT VECTOR
      </text>
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
    >
      <div className={styles.header}>
        <div>
          <span className={styles.eyebrow}>VORPAL / REPRESENTATION</span>
          <h3 id={id + "-title"} className={styles.title}>
            From words to a vector.
          </h3>
        </div>
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
      <figcaption className={styles.caption}>
        An illustration of each process, not a 3D projection of measured
        embeddings. The lexical buckets are calculated from the example query;
        learned and neural geometry is schematic. No model runs in your browser.
      </figcaption>
    </figure>
  );
}
