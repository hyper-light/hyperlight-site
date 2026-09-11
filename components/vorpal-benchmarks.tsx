"use client";

import { useId, useRef } from "react";
import { Pause, Play } from "lucide-react";
import { useMotionPreference } from "@/components/motion-provider";
import { useStudyMotion } from "@/components/studies/use-study-motion";
import styles from "./vorpal-benchmarks.module.css";
import { comparisonSurface } from "./comparison-geometry";

const measurements = [
  {
    slug: "kernel",
    name: "Linux kernel",
    files: "75,954",
    vorpal: 8.1,
    cbm: 296,
  },
  { slug: "cpython", name: "CPython", files: "3,841", vorpal: 0.9, cbm: 38.5 },
  { slug: "vorpal", name: "Vorpal", files: "1,917", vorpal: 6.9, cbm: 43.1 },
] as const;

const WIDTH = 560;
type BarNodes = {
  widths: number[];
  surfaces: Map<string, SVGPathElement>;
  lights: SVGPathElement[];
  glints: SVGLinearGradientElement[];
  prism: SVGLinearGradientElement;
  figure: HTMLElement | null;
};
const cache = new WeakMap<SVGSVGElement, BarNodes>();

function nodesFor(svg: SVGSVGElement): BarNodes {
  let nodes = cache.get(svg);
  if (!nodes) {
    const bars = Array.from(
      svg.querySelectorAll<SVGRectElement>("[data-benchmark-bar]"),
    );
    nodes = {
      widths: bars.map((bar) => Number(bar.dataset.benchmarkWidth)),
      surfaces: new Map(
        Array.from(
          svg.querySelectorAll<SVGPathElement>("[data-benchmark-surface]"),
          (path) => [path.dataset.benchmarkSurface!, path],
        ),
      ),
      lights: Array.from(
        svg.querySelectorAll<SVGPathElement>("[data-benchmark-light]"),
      ),
      glints: Array.from(
        svg.querySelectorAll<SVGLinearGradientElement>(
          "[data-benchmark-glint]",
        ),
      ),
      prism: svg.querySelector<SVGLinearGradientElement>(
        "[data-benchmark-prism]",
      )!,
      figure: svg.closest<HTMLElement>("[data-vorpal-benchmarks]"),
    };
    cache.set(svg, nodes);
  }
  return nodes;
}

function animate(svg: SVGSVGElement, elapsed: number) {
  const nodes = nodesFor(svg);
  nodes.widths.forEach((width, index) => {
    const shape = comparisonSurface(width, index, elapsed);
    for (const [part, d] of Object.entries(shape))
      nodes.surfaces.get(`${index}-${part}`)?.setAttribute("d", d);
    nodes.lights[index].setAttribute("d", shape.upper);
  });
  const shift = Math.sin(elapsed * 0.32) * 230;
  nodes.prism.setAttribute("x1", (-140 + shift).toFixed(2));
  nodes.prism.setAttribute("x2", (WIDTH + shift).toFixed(2));
  nodes.glints.forEach((glint, index) => {
    const position =
      (0.5 + Math.sin(elapsed * 0.45 + index * 0.8) * 0.68) * WIDTH;
    glint.setAttribute("x1", (position - 60).toFixed(2));
    glint.setAttribute("x2", (position + 60).toFixed(2));
  });
  if (svg.dataset.benchmarkChart === "kernel")
    nodes.figure?.style.setProperty(
      "--benchmark-light",
      `${((1 - Math.cos(elapsed * 0.36)) * 50).toFixed(2)}%`,
    );
}

function Comparison({
  measurement,
  paused,
}: {
  measurement: (typeof measurements)[number];
  paused: boolean;
}) {
  const ref = useRef<SVGSVGElement>(null);
  const id = "benchmark-" + useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const vorpalWidth = Number(
    ((measurement.vorpal / measurement.cbm) * WIDTH).toFixed(2),
  );

  // Exact lengths are present on the server and never reset on scroll/pause.
  useStudyMotion({ ref, paused, update: animate, fps: 60 });

  return (
    <section
      className={styles.comparison}
      aria-labelledby={id + "-title"}
      data-benchmark-corpus={measurement.slug}
    >
      <div className={styles.corpusHeader}>
        <div>
          <h4 className={styles.corpus} id={id + "-title"}>
            {measurement.name}
          </h4>
          <span className={styles.files}>
            {measurement.files} files parsed by Vorpal
          </span>
        </div>
        <span className={styles.ratio}>
          {(measurement.cbm / measurement.vorpal).toFixed(1)}×
          <span> faster</span>
        </span>
      </div>
      <div className={styles.plot}>
        <dl className={styles.values}>
          <div>
            <dt className={styles.vorpalLabel}>Vorpal</dt>
            <dd>{measurement.vorpal} s</dd>
          </div>
          <div>
            <dt>cbm</dt>
            <dd>{measurement.cbm} s</dd>
          </div>
        </dl>
        <svg
          ref={ref}
          className={styles.bars}
          viewBox={`0 0 ${WIDTH} 76`}
          preserveAspectRatio="none"
          aria-hidden="true"
          focusable="false"
          data-benchmark-chart={measurement.slug}
          data-benchmark-revealed="true"
        >
          <defs>
            <linearGradient
              id={id + "-prism"}
              data-benchmark-prism=""
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
            {[0, 1].map((index) => (
              <linearGradient
                key={index}
                id={`${id}-glint-${index}`}
                data-benchmark-glint={index}
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
          {[vorpalWidth, WIDTH].map((width, index) => (
            <g key={index} transform={`translate(0 ${-18 - index * 34})`}>
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
                data-benchmark-bar={index === 0 ? "vorpal" : "cbm"}
                data-benchmark-seconds={
                  index === 0 ? measurement.vorpal : measurement.cbm
                }
                data-benchmark-width={width}
                x="0"
                y={index * 72 + 39}
                width={width}
                height=".6"
                fill={`url(#${id}-prism)`}
                fillOpacity={index === 0 ? ".4" : ".18"}
              />
              {Object.entries(comparisonSurface(width, index, 0)).map(
                ([part, d]) => (
                  <path
                    key={part}
                    data-benchmark-surface={`${index}-${part}`}
                    d={d}
                    fill={part === "skin" ? `url(#${id}-prism)` : "none"}
                    fillOpacity={index === 0 ? ".14" : ".085"}
                    stroke={part === "skin" ? "none" : `url(#${id}-prism)`}
                    strokeOpacity={
                      part === "upper"
                        ? index === 0
                          ? ".85"
                          : ".65"
                        : part === "lower"
                          ? ".3"
                          : ".16"
                    }
                    strokeWidth={part === "upper" ? ".9" : ".6"}
                    vectorEffect="non-scaling-stroke"
                  />
                ),
              )}
              <path
                data-benchmark-light={index}
                d={comparisonSurface(width, index, 0).upper}
                fill="none"
                stroke={`url(#${id}-glint-${index})`}
                strokeWidth="1.3"
                vectorEffect="non-scaling-stroke"
              />
            </g>
          ))}
        </svg>
      </div>
      <div className={styles.axis} aria-hidden="true">
        <span>0</span>
        <span>{measurement.cbm} seconds</span>
      </div>
    </section>
  );
}

/** Published cold-index times; moving depth and light never change their lengths. */
export function VorpalBenchmarks() {
  const { paused, reduced, toggle } = useMotionPreference();
  const id = useId();
  return (
    <figure
      className={styles.figure}
      data-vorpal-benchmarks=""
      aria-labelledby={id + "-title"}
      aria-describedby={id + "-caption"}
    >
      <div className={styles.header}>
        <div>
          <span className={styles.eyebrow}>VORPAL / COLD INDEX</span>
          <h3 className={styles.title} id={id + "-title"}>
            Time to index a codebase.
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
              ? "Benchmark animation follows reduced motion"
              : paused
                ? "Resume benchmark animation"
                : "Pause benchmark animation"
          }
          title={
            reduced
              ? "Following your device's motion preference"
              : paused
                ? "Resume all ambient motion"
                : "Pause all ambient motion"
          }
        >
          {paused ? (
            <Play size={14} aria-hidden="true" />
          ) : (
            <Pause size={14} aria-hidden="true" />
          )}
        </button>
      </div>
      <p className={styles.subtitle}>
        Vorpal and codebase-memory-mcp. Less time is better.
      </p>
      <div className={styles.comparisons}>
        {measurements.map((measurement) => (
          <Comparison
            key={measurement.slug}
            measurement={measurement}
            paused={paused}
          />
        ))}
      </div>
      <figcaption className={styles.caption} id={id + "-caption"}>
        <span>
          The wait before your first code-graph query. Each pair has its own
          zero-based linear scale; compare lengths within a pair.
        </span>
        <span className={styles.note}>
          Published September 7, 2026 · M5 Max · 18 cores · 128 GB RAM. Vorpal
          v0.9.0; cbm 997d087, full mode.{" "}
          <a href="https://github.com/hyper-light/vorpal/blob/4dd203fa560bfd2c0c8f1857f7bbca983c23de63/README.md#how-does-it-compare">
            Measurements and methods
          </a>
          .
        </span>
      </figcaption>
    </figure>
  );
}
