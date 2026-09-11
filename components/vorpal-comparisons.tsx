"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Pause, Play } from "lucide-react";
import { useMotionPreference } from "@/components/motion-provider";
import { useStudyMotion } from "@/components/studies/use-study-motion";
import {
  agentSamples,
  retrievalSamples,
  comparisonMetrics,
  comparisonMaximum,
  comparisonValue,
  comparisonWidth,
  comparisonSource,
  type ComparisonKind,
} from "./vorpal-comparison-data";
import styles from "./vorpal-comparisons.module.css";
import articleTabs from "./article-tabs.module.css";
import { comparisonSurface } from "./comparison-geometry";

const WIDTH = 600;
const ROW = 72;
type ChartNodes = {
  bars: SVGRectElement[];
  clips: SVGRectElement[];
  glints: SVGLinearGradientElement[];
  surfaces: Map<string, SVGPathElement>;
  lights: SVGPathElement[];
  prism: SVGLinearGradientElement;
  surface: HTMLElement | null;
  revision: string;
  from: number[];
  to: number[];
  started: number;
  elapsed: number;
};
const cache = new WeakMap<SVGSVGElement, ChartNodes>();

function nodesFor(svg: SVGSVGElement) {
  let nodes = cache.get(svg);
  if (!nodes) {
    const bars = Array.from(
      svg.querySelectorAll<SVGRectElement>("[data-comparison-bar]"),
    );
    nodes = {
      bars,
      clips: Array.from(
        svg.querySelectorAll<SVGRectElement>("[data-comparison-clip]"),
      ),
      glints: Array.from(
        svg.querySelectorAll<SVGLinearGradientElement>(
          "[data-comparison-glint]",
        ),
      ),
      surfaces: new Map(
        Array.from(
          svg.querySelectorAll<SVGPathElement>("[data-comparison-surface]"),
          (path) => [path.dataset.comparisonSurface!, path],
        ),
      ),
      lights: Array.from(
        svg.querySelectorAll<SVGPathElement>("[data-comparison-light]"),
      ),
      prism: svg.querySelector<SVGLinearGradientElement>(
        "[data-comparison-prism]",
      )!,
      surface: svg.closest<HTMLElement>("[data-vorpal-comparisons]"),
      revision: svg.dataset.revision!,
      from: bars.map((bar) => Number(bar.getAttribute("width"))),
      to: bars.map((bar) => Number(bar.dataset.targetWidth)),
      started: -1,
      elapsed: 0,
    };
    const targets = nodes.to;
    if (nodes.from.some((width, index) => width !== targets[index]))
      nodes.started = -2;
    cache.set(svg, nodes);
  }
  return nodes;
}

function setWidth(nodes: ChartNodes, index: number, value: number) {
  const width = value.toFixed(2);
  nodes.bars[index].setAttribute("width", width);
  nodes.clips[index].setAttribute("width", width);
}

function paintSurfaces(nodes: ChartNodes) {
  nodes.bars.forEach((bar, index) => {
    const surface = comparisonSurface(
      Number(bar.getAttribute("width")),
      index,
      nodes.elapsed,
    );
    for (const [part, d] of Object.entries(surface))
      nodes.surfaces.get(`${index}-${part}`)?.setAttribute("d", d);
    nodes.lights[index]?.setAttribute("d", surface.upper);
  });
}

function animate(svg: SVGSVGElement, elapsed: number) {
  const nodes = nodesFor(svg);
  nodes.elapsed = elapsed;
  if (nodes.revision !== svg.dataset.revision || nodes.started === -2) {
    nodes.revision = svg.dataset.revision!;
    nodes.from = nodes.bars.map((bar) => Number(bar.getAttribute("width")));
    nodes.to = nodes.bars.map((bar) => Number(bar.dataset.targetWidth));
    nodes.started = elapsed;
  }
  if (nodes.started >= 0) {
    const progress = Math.min(1, (elapsed - nodes.started) / 0.7);
    const ease = progress * progress * (3 - 2 * progress);
    nodes.to.forEach((target, index) =>
      setWidth(
        nodes,
        index,
        nodes.from[index] + (target - nodes.from[index]) * ease,
      ),
    );
    if (progress === 1) nodes.started = -1;
  }
  paintSurfaces(nodes);
  const shift = Math.sin(elapsed * 0.32) * 230;
  nodes.prism.setAttribute("x1", (-140 + shift).toFixed(2));
  nodes.prism.setAttribute("x2", (WIDTH + shift).toFixed(2));
  nodes.surface?.style.setProperty(
    "--comparison-light",
    `${((1 - Math.cos(elapsed * 0.36)) * 50).toFixed(2)}%`,
  );
  nodes.glints.forEach((glint, index) => {
    const position =
      (0.5 + Math.sin(elapsed * 0.45 + index * 0.8) * 0.68) * WIDTH;
    glint.setAttribute("x1", (position - 60).toFixed(2));
    glint.setAttribute("x2", (position + 60).toFixed(2));
  });
}

function Bars({
  widths,
  best,
  revision,
  paused,
  reduced,
}: {
  widths: number[];
  best: boolean[];
  revision: string;
  paused: boolean;
  reduced: boolean;
}) {
  const ref = useRef<SVGSVGElement>(null);
  const id = "comparison-" + useId().replace(/[^a-zA-Z0-9_-]/g, "");
  // The DOM owns animated widths after SSR. New selections change targets only.
  const [initialWidths] = useState(widths);
  useEffect(() => {
    const svg = ref.current;
    if (!svg) return;
    const nodes = nodesFor(svg);
    if (!reduced && (!paused || nodes.revision === revision)) return;
    nodes.to = nodes.bars.map((bar) => Number(bar.dataset.targetWidth));
    nodes.to.forEach((target, index) => setWidth(nodes, index, target));
    nodes.revision = revision;
    nodes.started = -1;
    paintSurfaces(nodes);
  }, [paused, reduced, revision]);
  useStudyMotion({ ref, paused, update: animate, fps: 60 });

  return (
    <svg
      ref={ref}
      className={styles.bars}
      data-comparison-chart=""
      data-revision={revision}
      viewBox={`0 0 ${WIDTH} ${ROW * 3}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient
          id={id + "-prism"}
          data-comparison-prism=""
          gradientUnits="userSpaceOnUse"
          x1="-140"
          y1="0"
          x2={WIDTH}
          y2="0"
        >
          <stop stopColor="#a6c9c1" />
          <stop offset=".36" stopColor="#a7bbd8" />
          <stop offset=".68" stopColor="#bba7ce" />
          <stop offset="1" stopColor="#d2bca0" />
        </linearGradient>
        {widths.map((_, index) => (
          <g key={index}>
            <linearGradient
              id={`${id}-glint-${index}`}
              data-comparison-glint=""
              gradientUnits="userSpaceOnUse"
              x1="-60"
              y1="0"
              x2="60"
              y2="0"
            >
              <stop stopColor="#e5f0ef" stopOpacity="0" />
              <stop offset=".5" stopColor="#e5f0ef" stopOpacity=".85" />
              <stop offset="1" stopColor="#e5f0ef" stopOpacity="0" />
            </linearGradient>
            <clipPath id={`${id}-clip-${index}`}>
              <rect
                data-comparison-clip=""
                x="0"
                y={index * ROW + 20}
                width={initialWidths[index]}
                height="29"
              />
            </clipPath>
          </g>
        ))}
      </defs>
      {widths.map((target, index) => (
        <g key={index}>
          <path
            d={`M0,${index * ROW + 39}H${WIDTH}`}
            stroke="#72849b"
            strokeOpacity=".12"
            strokeWidth=".6"
            vectorEffect="non-scaling-stroke"
          />
          {[0, 0.25, 0.5, 0.75, 1].map((position) => (
            <path
              key={position}
              d={`M${position * WIDTH},${index * ROW + 37}v5`}
              stroke="#899bb1"
              strokeOpacity={position === 0 ? ".38" : ".17"}
              vectorEffect="non-scaling-stroke"
            />
          ))}
          <rect
            data-comparison-bar={index}
            data-target-width={target}
            x="0"
            y={index * ROW + 39}
            width={initialWidths[index]}
            height=".6"
            fill={`url(#${id}-prism)`}
            fillOpacity={best[index] ? ".4" : ".18"}
          />
          {Object.entries(
            comparisonSurface(initialWidths[index], index, 0),
          ).map(([part, d]) => (
            <path
              key={part}
              data-comparison-surface={`${index}-${part}`}
              d={d}
              fill={part === "skin" ? `url(#${id}-prism)` : "none"}
              fillOpacity={best[index] ? ".14" : ".085"}
              stroke={part === "skin" ? "none" : `url(#${id}-prism)`}
              strokeOpacity={
                part === "upper"
                  ? best[index]
                    ? ".85"
                    : ".65"
                  : part === "lower"
                    ? ".3"
                    : ".16"
              }
              strokeWidth={part === "upper" ? ".9" : ".6"}
              vectorEffect="non-scaling-stroke"
            />
          ))}
          <g clipPath={`url(#${id}-clip-${index})`}>
            <path
              data-comparison-light={index}
              d={comparisonSurface(initialWidths[index], index, 0).upper}
              fill="none"
              stroke={`url(#${id}-glint-${index})`}
              strokeWidth="1.3"
              vectorEffect="non-scaling-stroke"
            />
          </g>
        </g>
      ))}
    </svg>
  );
}

function RawResults({ kind, id }: { kind: ComparisonKind; id: string }) {
  const agents = kind === "agents";
  const samples = agents ? agentSamples : retrievalSamples;
  return (
    <details className={styles.raw}>
      <summary>
        All measured results <span>{agents ? 12 : 9} rows</span>
      </summary>
      <div
        className={styles.tableScroll}
        tabIndex={0}
        role="region"
        aria-labelledby={id + "-table-title"}
      >
        <table className={styles.rawTable}>
          <caption id={id + "-table-title"}>
            {agents
              ? "Agent questions — all access paths"
              : "Retrieval quality — all corpora and tiers"}
          </caption>
          <thead>
            <tr>
              {(agents
                ? [
                    "Question",
                    "Access",
                    "Model turns",
                    "Tokens processed",
                    "Billed cost",
                    "Wall time",
                  ]
                : ["Corpus", "Tier", "NDCG@10", "MRR", "Recall@5"]
              ).map((name) => (
                <th key={name} scope="col">
                  {name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {samples.flatMap((sample) =>
              sample.rows.map((row) => (
                <tr key={sample.name + row.name}>
                  <th scope="row">
                    {agents ? `${sample.detail}: ${sample.name}` : sample.name}
                  </th>
                  <td>{row.name}</td>
                  {(agents ? [3, 1, 2, 0] : [0, 1, 2]).map((metric) => (
                    <td key={metric}>
                      {comparisonValue(kind, metric, row.values[metric])}
                    </td>
                  ))}
                </tr>
              )),
            )}
          </tbody>
        </table>
      </div>
    </details>
  );
}

export function VorpalComparisons({ kind }: { kind: ComparisonKind }) {
  const [sampleIndex, setSampleIndex] = useState(0);
  const [metric, setMetric] = useState(0);
  const { paused, reduced, toggle } = useMotionPreference();
  const id = useId();
  const agents = kind === "agents";
  const samples = agents ? agentSamples : retrievalSamples;
  const sample = samples[sampleIndex];
  const metrics = comparisonMetrics[kind];
  const maximum = comparisonMaximum(kind, metric);
  const values = sample.rows.map((row) => row.values[metric]);
  const bestValue = agents ? Math.min(...values) : Math.max(...values);
  const best = values.map((value) => value === bestValue);
  const revision = `${kind}-${sampleIndex}-${metric}`;
  const subject = agents ? "agent question" : "retrieval corpus";
  const move = (direction: number) =>
    setSampleIndex(
      (current) => (current + direction + samples.length) % samples.length,
    );
  return (
    <figure
      className={styles.figure}
      data-vorpal-comparisons={kind}
      aria-labelledby={id + "-title"}
      aria-describedby={id + "-caption"}
    >
      <div className={styles.header}>
        <div>
          <span className={styles.eyebrow}>
            VORPAL / {agents ? "AGENT TASKS" : "RETRIEVAL QUALITY"}
          </span>
          <h3 className={styles.title} id={id + "-title"}>
            {agents ? "Less work for the agent." : "Finding the right result."}
          </h3>
        </div>
        <button
          type="button"
          className={styles.iconButton}
          onClick={toggle}
          disabled={reduced}
          aria-pressed={paused}
          aria-label={
            reduced
              ? "Comparison follows reduced motion"
              : paused
                ? "Resume comparison animation"
                : "Pause comparison animation"
          }
          title="Control all ambient motion"
        >
          {paused ? (
            <Play size={14} aria-hidden="true" />
          ) : (
            <Pause size={14} aria-hidden="true" />
          )}
        </button>
      </div>
      <div
        className={articleTabs.tabs}
        role="group"
        aria-label={
          agents ? "Agent comparison metric" : "Retrieval comparison metric"
        }
      >
        {metrics.map((item, index) => (
          <button
            type="button"
            key={item.name}
            aria-pressed={metric === index}
            aria-controls={id + "-plot"}
            onClick={() => setMetric(index)}
          >
            {item.name}
          </button>
        ))}
      </div>
      <div className={styles.selection}>
        <div className={styles.sample} aria-live="polite" aria-atomic="true">
          <span>
            {sample.detail} · {sampleIndex + 1} / {samples.length}
          </span>
          <h4>{sample.name}</h4>
        </div>
        <div className={styles.navigation}>
          <button
            type="button"
            className={styles.iconButton}
            onClick={() => move(-1)}
            aria-label={`Previous ${subject}`}
            aria-controls={id + "-plot"}
          >
            <ArrowLeft size={15} aria-hidden="true" />
          </button>
          <button
            type="button"
            className={styles.iconButton}
            onClick={() => move(1)}
            aria-label={`Next ${subject}`}
            aria-controls={id + "-plot"}
          >
            <ArrowRight size={15} aria-hidden="true" />
          </button>
        </div>
      </div>
      <div className={styles.chartSection} id={id + "-plot"}>
        <div className={styles.chartHeading}>
          <span>{metrics[metric].name}</span>
          <span>{agents ? "Lower is better" : "Higher is better"}</span>
        </div>
        <div className={styles.plot}>
          <dl className={styles.values}>
            {sample.rows.map((row, index) => (
              <div key={row.name}>
                <dt>{row.name}</dt>
                <dd>
                  <span className={styles.best}>
                    {best[index] ? (agents ? "Lowest" : "Highest") : ""}
                  </span>
                  <span data-comparison-value={index}>
                    {comparisonValue(kind, metric, values[index])}
                  </span>
                </dd>
              </div>
            ))}
          </dl>
          <Bars
            widths={values.map((value) => comparisonWidth(value, maximum))}
            best={best}
            revision={revision}
            paused={paused}
            reduced={reduced}
          />
        </div>
        <div className={styles.axis} aria-hidden="true">
          <span>0</span>
          <span>
            {comparisonValue(kind, metric, maximum)}
            {agents && metric === 3 ? " turns" : ""}
          </span>
        </div>
        <p className={styles.metricDescription}>
          {metrics[metric].description}
        </p>
      </div>
      <RawResults kind={kind} id={id} />
      <figcaption className={styles.caption} id={id + "-caption"}>
        <span>
          {agents
            ? "Same question, three ways to reach the code. Compare the agent's time, tokens, cost, and turns. Each metric keeps the same zero-based scale across all four questions."
            : "Which tier finds the code you need? The highlighted tier leads for the selected repository and metric. All scores share a zero-to-one scale."}
        </span>
        <span className={styles.note}>
          {agents
            ? "September 6, 2026 · Vorpal v0.8.3 · Claude Code 2.1.261, Opus 5, high effort. Medians of the last three of four runs; prompt cache warm."
            : "54 kernel, 54 CPython, and 55 Vorpal queries. Default: September 7; learned and encoder: September 6. Measured before background embedding fill."}{" "}
          <a
            href={
              comparisonSource +
              (agents ? "#how-does-it-compare" : "#is-search-any-good")
            }
          >
            Published README results
          </a>
          .
        </span>
      </figcaption>
    </figure>
  );
}
