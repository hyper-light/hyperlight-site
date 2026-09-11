"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { useMotionPreference } from "./motion-provider";
import { useStudyMotion } from "./studies/use-study-motion";
import { comparisonSurface } from "./comparison-geometry";
import {
  tgrepMetrics,
  tgrepSamples,
  tgrepSource,
  tgrepWidth,
  tgrepPlotWidth,
} from "./vorpal-tgrep-data";
import articleTabs from "./article-tabs.module.css";
import styles from "./vorpal-tgrep.module.css";

const WIDTH = tgrepPlotWidth;
const tools = ["vorpal", "tgrep"] as const;
type RibbonNodes = {
  bars: SVGRectElement[];
  surfaces: Map<string, SVGPathElement>;
  lights: SVGPathElement[];
  glints: SVGLinearGradientElement[];
  prism: SVGLinearGradientElement;
  figure: HTMLElement | null;
  revision: string;
  from: number[];
  targets: number[];
  started: number;
  elapsed: number;
};
const cache = new WeakMap<SVGSVGElement, RibbonNodes>();

function nodesFor(svg: SVGSVGElement): RibbonNodes {
  let nodes = cache.get(svg);
  if (!nodes) {
    const bars = Array.from(
      svg.querySelectorAll<SVGRectElement>("[data-tgrep-bar]"),
    );
    const from = bars.map((bar) => Number(bar.getAttribute("width")));
    const targets = bars.map((bar) => Number(bar.dataset.targetWidth));
    nodes = {
      bars,
      surfaces: new Map(
        Array.from(
          svg.querySelectorAll<SVGPathElement>("[data-tgrep-surface]"),
          (path) => [path.dataset.tgrepSurface!, path],
        ),
      ),
      lights: Array.from(
        svg.querySelectorAll<SVGPathElement>("[data-tgrep-light]"),
      ),
      glints: Array.from(
        svg.querySelectorAll<SVGLinearGradientElement>("[data-tgrep-glint]"),
      ),
      prism: svg.querySelector<SVGLinearGradientElement>("[data-tgrep-prism]")!,
      figure: svg.closest<HTMLElement>("[data-vorpal-tgrep]"),
      revision: svg.dataset.revision!,
      from,
      targets,
      started: from.some((width, index) => width !== targets[index]) ? -2 : -1,
      elapsed: 0,
    };
    cache.set(svg, nodes);
  }
  return nodes;
}

function paintRibbons(nodes: RibbonNodes) {
  nodes.bars.forEach((bar, index) => {
    const shape = comparisonSurface(
      Number(bar.getAttribute("width")),
      index,
      nodes.elapsed,
    );
    for (const [part, d] of Object.entries(shape))
      nodes.surfaces.get(`${index}-${part}`)?.setAttribute("d", d);
    nodes.lights[index].setAttribute("d", shape.upper);
  });
}

function animate(svg: SVGSVGElement, elapsed: number) {
  const nodes = nodesFor(svg);
  nodes.elapsed = elapsed;
  if (nodes.revision !== svg.dataset.revision || nodes.started === -2) {
    nodes.revision = svg.dataset.revision!;
    nodes.from = nodes.bars.map((bar) => Number(bar.getAttribute("width")));
    nodes.targets = nodes.bars.map((bar) => Number(bar.dataset.targetWidth));
    nodes.started = elapsed;
  }
  if (nodes.started >= 0) {
    const progress = Math.min(1, (elapsed - nodes.started) / 0.7);
    const ease = progress * progress * (3 - 2 * progress);
    nodes.targets.forEach((target, index) =>
      nodes.bars[index].setAttribute(
        "width",
        (nodes.from[index] + (target - nodes.from[index]) * ease).toFixed(4),
      ),
    );
    if (progress === 1) nodes.started = -1;
  }
  paintRibbons(nodes);
  const shift = Math.sin(elapsed * 0.32) * 230;
  nodes.prism.setAttribute("x1", (-140 + shift).toFixed(2));
  nodes.prism.setAttribute("x2", (WIDTH + shift).toFixed(2));
  nodes.glints.forEach((glint, index) => {
    const center =
      (0.5 + Math.sin(elapsed * 0.45 + index * 0.8) * 0.68) * WIDTH;
    glint.setAttribute("x1", (center - 60).toFixed(2));
    glint.setAttribute("x2", (center + 60).toFixed(2));
  });
  if (svg.dataset.tgrepChart === "kernel")
    nodes.figure?.style.setProperty(
      "--tgrep-light",
      `${((1 - Math.cos(elapsed * 0.36)) * 50).toFixed(2)}%`,
    );
}

function Ribbons({
  widths,
  best,
  corpus,
  revision,
  maximum,
  paused,
  reduced,
}: {
  widths: number[];
  best: boolean[];
  corpus: string;
  revision: string;
  maximum: number;
  paused: boolean;
  reduced: boolean;
}) {
  const ref = useRef<SVGSVGElement>(null);
  const id = "tgrep-" + useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const [initialWidths] = useState(widths);
  useEffect(() => {
    const svg = ref.current;
    if (!svg) return;
    const nodes = nodesFor(svg);
    // Manual pause holds the in-flight pose. New choices while paused and
    // reduced motion resolve to the selected values without a reset animation.
    if (!reduced && (!paused || nodes.revision === revision)) return;
    nodes.targets = nodes.bars.map((bar) => Number(bar.dataset.targetWidth));
    nodes.targets.forEach((target, index) =>
      nodes.bars[index].setAttribute("width", target.toFixed(4)),
    );
    nodes.revision = revision;
    nodes.started = -1;
    paintRibbons(nodes);
  }, [paused, reduced, revision]);
  useStudyMotion({ ref, paused, update: animate, fps: 60 });
  return (
    <svg
      ref={ref}
      className={styles.ribbons}
      data-tgrep-chart={corpus}
      data-revision={revision}
      data-tgrep-metric={revision}
      data-tgrep-maximum={maximum}
      viewBox={`0 0 ${WIDTH} 144`}
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient
          id={id + "-prism"}
          data-tgrep-prism=""
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
        {tools.map((tool, index) => (
          <linearGradient
            key={tool}
            id={`${id}-glint-${index}`}
            data-tgrep-glint={tool}
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
        ))}
      </defs>
      {tools.map((tool, index) => (
        <g key={tool}>
          <path
            d={`M0,${index * 72 + 39}H${WIDTH}`}
            fill="none"
            stroke="#72849b"
            strokeOpacity=".12"
            strokeWidth=".6"
            vectorEffect="non-scaling-stroke"
          />
          {[0, 0.25, 0.5, 0.75, 1].map((fraction) => (
            <path
              key={fraction}
              d={`M${fraction * WIDTH},${index * 72 + 37}v5`}
              stroke="#899bb1"
              strokeOpacity={fraction === 0 ? ".38" : ".17"}
              vectorEffect="non-scaling-stroke"
            />
          ))}
          <rect
            data-tgrep-bar={tool}
            data-target-width={widths[index]}
            x="0"
            y={index * 72 + 39}
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
              data-tgrep-surface={`${index}-${part}`}
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
          <path
            data-tgrep-light={tool}
            d={comparisonSurface(initialWidths[index], index, 0).upper}
            fill="none"
            stroke={`url(#${id}-glint-${index})`}
            strokeWidth="1.3"
            vectorEffect="non-scaling-stroke"
          />
        </g>
      ))}
    </svg>
  );
}

export function VorpalTgrep() {
  const [metricIndex, setMetricIndex] = useState(0);
  const { paused, reduced, toggle } = useMotionPreference();
  const id = useId();
  const metric = tgrepMetrics[metricIndex];
  return (
    <figure
      className={styles.figure}
      data-vorpal-tgrep=""
      data-tgrep-metric={metric.id}
      aria-labelledby={id + "-title"}
      aria-describedby={id + "-caption"}
    >
      <div className={styles.header}>
        <div>
          <span className={styles.eyebrow}>VORPAL / INDEXED TEXT SEARCH</span>
          <h3 className={styles.title} id={id + "-title"}>
            Vorpal and tgrep.
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
              ? "Tgrep comparison follows reduced motion"
              : paused
                ? "Resume tgrep comparison animation"
                : "Pause tgrep comparison animation"
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
        aria-label="Vorpal and tgrep metric"
      >
        {tgrepMetrics.map((item, index) => (
          <button
            type="button"
            key={item.id}
            aria-pressed={metricIndex === index}
            aria-controls={id + "-plots"}
            onClick={() => setMetricIndex(index)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className={styles.intro}>
        <div className={styles.scale}>
          <span>Same 0–{metric.maximumLabel} scale for every repository</span>
          <span>Lower is better</span>
        </div>
        <p className={styles.description}>{metric.description}</p>
      </div>
      <div className={styles.corpora} id={id + "-plots"}>
        {tgrepSamples.map((sample) => {
          const values = tools.map((tool) => sample[tool].values[metricIndex]);
          const best = Math.min(...values);
          return (
            <section
              key={sample.id}
              className={styles.corpus}
              data-tgrep-corpus={sample.id}
              aria-labelledby={`${id}-${sample.id}`}
            >
              <h4 id={`${id}-${sample.id}`}>{sample.name}</h4>
              <div className={styles.plot}>
                <dl className={styles.values}>
                  {tools.map((tool, index) => (
                    <div key={tool}>
                      <dt>{tool === "vorpal" ? "Vorpal" : "tgrep"}</dt>
                      <dd>
                        <span className={styles.lowest}>
                          {values[index] === best ? "Lowest" : ""}
                        </span>
                        <span data-tgrep-value={tool}>
                          {sample[tool].labels[metricIndex]}
                        </span>
                      </dd>
                    </div>
                  ))}
                </dl>
                <Ribbons
                  widths={values.map((value) => tgrepWidth(value, metric.id))}
                  best={values.map((value) => value === best)}
                  corpus={sample.id}
                  revision={metric.id}
                  maximum={metric.maximum}
                  paused={paused}
                  reduced={reduced}
                />
              </div>
              <div className={styles.axis} aria-hidden="true">
                <span>0</span>
                <span>{metric.maximumLabel}</span>
              </div>
            </section>
          );
        })}
      </div>
      <details className={styles.raw}>
        <summary>
          All measured results <span>18 values</span>
        </summary>
        <div
          className={styles.tableScroll}
          tabIndex={0}
          role="region"
          aria-labelledby={id + "-table-title"}
        >
          <table className={styles.rawTable}>
            <caption id={id + "-table-title"}>
              Vorpal and tgrep — all indexing measurements
            </caption>
            <thead>
              <tr>
                {["Repository", "Measurement", "Vorpal", "tgrep"].map(
                  (label) => (
                    <th scope="col" key={label}>
                      {label}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {tgrepSamples.flatMap((sample) =>
                tgrepMetrics.map((item, index) => (
                  <tr
                    key={`${sample.id}-${item.id}`}
                    data-tgrep-repository={sample.id}
                    data-tgrep-measurement={item.id}
                  >
                    <th scope="row">{sample.name}</th>
                    <td>{item.measurement}</td>
                    <td>{sample.vorpal.labels[index]}</td>
                    <td>{sample.tgrep.labels[index]}</td>
                  </tr>
                )),
              )}
            </tbody>
          </table>
        </div>
      </details>
      <figcaption className={styles.caption} id={id + "-caption"}>
        <span>
          Compare build time, peak RAM, and disk usage. Each metric uses the
          same zero-based scale across repositories.
        </span>
        <span>
          tgrep indexes text. Vorpal also parses syntax and connects
          definitions. On the kernel, tgrep indexed 94,719 files; Vorpal parsed
          75,954.
        </span>
        <span className={styles.note}>
          September 7, 2026 · Vorpal v0.9.0 and tgrep 1.0.4, built from source
          on the same machine and checkouts. Vorpal build times are the best of
          three; tgrep times are medians of three.{" "}
          <a href={tgrepSource}>Published README results</a>.
        </span>
      </figcaption>
    </figure>
  );
}
