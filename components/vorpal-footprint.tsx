"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Pause, Play } from "lucide-react";
import { useMotionPreference } from "@/components/motion-provider";
import { useStudyMotion } from "@/components/studies/use-study-motion";
import {
  CELL_MB,
  cellOccupancy,
  footprintKinds,
  footprintSamples,
  footprintSource,
  type FootprintKind,
} from "./vorpal-footprint-data";
import articleTabs from "./article-tabs.module.css";
import styles from "./vorpal-footprint.module.css";

const SIZE = 14;
const STEP = 18;
const DURATION = 0.8;
const CHIP_WIDTH = 5 * STEP - (STEP - SIZE) + 12;

function projection(yaw: number, pitch: number, roll: number) {
  const cy = Math.cos(yaw),
    sy = Math.sin(yaw);
  const cp = Math.cos(pitch),
    sp = Math.sin(pitch);
  const cr = Math.cos(roll),
    sr = Math.sin(roll);
  return [cy * cr - sy * sp * sr, cy * sr + sy * sp * cr, -cp * sr, cp * cr];
}
// Bound every allowed pose, not only the initial frame, without a padded stage.
const projectionBounds = [-0.466, -0.434]
  .flatMap((yaw) =>
    [-0.455, -0.385].flatMap((pitch) =>
      [-0.298, -0.282].map((roll) => projection(yaw, pitch, roll)),
    ),
  )
  .reduce(
    (bounds, matrix) =>
      matrix.map((value, index) => Math.max(Math.abs(value), bounds[index])),
    [0, 0, 0, 0],
  );

function moduleLayout(columns: number, cells: number) {
  const chipsAcross = columns / 5;
  const chipRows = cells / 40;
  const chipHeight = chipRows * STEP - (STEP - SIZE) + 12;
  const width = chipsAcross * (CHIP_WIDTH + 8) + 24;
  const height =
    (8 / chipsAcross) * (chipHeight + 12) + (cells === 160 ? 154 : 18);
  return {
    chipsAcross,
    chipRows,
    chipHeight,
    width,
    height,
    viewWidth: Number(
      (projectionBounds[0] * width + projectionBounds[2] * height + 20).toFixed(
        4,
      ),
    ),
    viewHeight: Number(
      (projectionBounds[1] * width + projectionBounds[3] * height + 24).toFixed(
        4,
      ),
    ),
  };
}

// A rigid orthographic three-quarter view: nothing stretches the data cells.
// Board, raised packages, contact fingers and exact fills move as one object.
function moduleTransform(
  columns: number,
  cells: number,
  time: number,
  tier: number,
) {
  const layout = moduleLayout(columns, cells);
  // Negative pitch is the below-board view: raised fronts sit below their
  // recessed backs, exposing the underside of the contact rail and the casing.
  const yaw = -0.45 + Math.sin(time * 0.42 + tier * 0.13) * 0.016;
  const pitch = -0.42 + Math.sin(time * 0.37) * 0.035;
  const roll = -0.29 + Math.sin(time * 0.34) * 0.008;
  const [a, b, c, d] = projection(yaw, pitch, roll);
  const e = -(a * layout.width + c * layout.height) / 2;
  const f =
    -(b * layout.width + d * layout.height) / 2 + Math.sin(time * 0.48) * 2;
  return `matrix(${[a, b, c, d, e, f].map((value) => value.toFixed(5)).join(" ")})`;
}

function boardOutline(width: number, height: number, ram: boolean) {
  const key = Math.round(width * 0.59);
  const bottom = ram ? `H${key + 8}v-10h-16v10H6` : "H6";
  return `M8,0H${width - 8}L${width},8V${height - 6}L${width - 6},${height}${bottom}L0,${height - 6}V8Z`;
}

function Heatspreader({
  width,
  height,
  id,
  columns,
}: {
  width: number;
  height: number;
  id: string;
  columns: number;
}) {
  const shell = `M0,${height - 31}V57L43,3H${width - 34}L${width},45V${height - 35}L${width - 20},${height - 19}H22Z`;
  const inset = `M16,${height - 41}V65L53,20H${width - 43}L${width - 17},52V${height - 44}L${width - 30},${height - 34}H31Z`;
  return (
    <g data-footprint-heatspreader="" fill="none" strokeLinejoin="round">
      <path
        d={shell}
        transform="translate(6 -11)"
        stroke="#bcc9dc"
        strokeOpacity=".25"
        strokeWidth="1"
      />
      <path
        d={`M0,57l6,-11M43,3l6,-11M${width - 34},3l6,-11M${width},45l6,-11M${width},${height - 35}l6,-11M22,${height - 19}l6,-11`}
        stroke={`url(#${id}-prism)`}
        strokeOpacity=".5"
        strokeWidth=".8"
      />
      <path
        d={shell}
        fill={`url(#${id}-prism)`}
        fillOpacity=".021"
        stroke={`url(#${id}-prism)`}
        strokeOpacity=".63"
        strokeWidth="1"
      />
      <path d={inset} stroke="#c7d2e0" strokeOpacity=".27" strokeWidth=".8" />
      <path
        d={`M16,65L53,20H${width - 43}L${width - 17},52M31,${height - 34}H${width - 30}`}
        stroke={`url(#${id}-sheen)`}
        strokeWidth="1.2"
      />
      <path
        d={`M44,46H${width - 31}M47,53H${width - 28}M22,${height - 29}H${width - 21}`}
        stroke={`url(#${id}-prism)`}
        strokeOpacity=".35"
        strokeWidth=".7"
      />
      {Array.from({ length: columns * 2 }, (_, fin) => {
        const x = 50 + (fin * (width - 95)) / (columns * 2);
        return (
          <path
            key={fin}
            d={`M${x.toFixed(3)},22v23m2,-22v20`}
            stroke={`url(#${id}-prism)`}
            strokeOpacity={fin % 7 === 0 ? ".55" : ".21"}
            strokeWidth={fin % 7 === 0 ? "1.4" : ".6"}
          />
        );
      })}
      {Array.from({ length: 12 }, (_, window) => {
        const x = 61 + (window * (width - 134)) / 12;
        return (
          <path
            key={window}
            d={`M${x.toFixed(3)},5h17l4,6h-17Z`}
            fill={`url(#${id}-prism)`}
            fillOpacity=".07"
            stroke={`url(#${id}-sheen)`}
            strokeWidth=".65"
          />
        );
      })}
      {[22, width - 12].flatMap((x, side) =>
        [89, height - 61].map((y, bolt) => (
          <g key={`${side}-${bolt}`}>
            <circle
              cx={x}
              cy={y}
              r="4.4"
              stroke="#b5c4d9"
              strokeOpacity=".42"
              strokeWidth=".8"
            />
            <circle
              cx={x}
              cy={y}
              r="2.1"
              stroke={`url(#${id}-prism)`}
              strokeOpacity=".3"
              strokeWidth=".7"
            />
            <path
              d={`M${x - 1.5},${y}h3`}
              stroke="#c1cde0"
              strokeOpacity=".32"
              strokeWidth=".65"
            />
          </g>
        )),
      )}
    </g>
  );
}

type GridNodes = {
  fills: SVGRectElement[];
  edges: SVGRectElement[];
  widths: number[];
  rows: SVGGElement[];
  columns: number;
  prism: SVGLinearGradientElement;
  sheen: SVGLinearGradientElement;
  surface: HTMLElement | null;
  revision: string;
  current: number;
  from: number;
  target: number;
  started: number;
};
const cache = new WeakMap<SVGSVGElement, GridNodes>();

function paintAmount(svg: SVGSVGElement, nodes: GridNodes, amount: number) {
  for (let index = 0; index < nodes.fills.length; index++) {
    const occupancy = cellOccupancy(amount, index);
    const width = Number((SIZE * occupancy).toFixed(4));
    if (nodes.widths[index] === width) continue;
    nodes.widths[index] = width;
    nodes.fills[index].setAttribute("width", String(width));
    nodes.fills[index].setAttribute(
      "data-footprint-occupancy",
      occupancy.toFixed(6),
    );
    nodes.edges[index].setAttribute("width", String(width));
    nodes.edges[index].setAttribute("opacity", width > 0 ? "1" : "0");
  }
  nodes.current = amount;
  svg.dataset.footprintCurrentMb = amount.toFixed(4);
}

function nodesFor(svg: SVGSVGElement): GridNodes {
  let nodes = cache.get(svg);
  const count = Number(svg.dataset.footprintCells);
  const columns = Number(svg.dataset.footprintColumns);
  if (!nodes) {
    const current = Number(svg.dataset.footprintCurrentMb);
    const target = Number(svg.dataset.footprintTargetMb);
    nodes = {
      fills: [],
      edges: [],
      widths: [],
      rows: [],
      columns: 0,
      prism: svg.querySelector<SVGLinearGradientElement>(
        "[data-footprint-prism]",
      )!,
      sheen: svg.querySelector<SVGLinearGradientElement>(
        "[data-footprint-sheen]",
      )!,
      surface: svg.closest<HTMLElement>("[data-vorpal-footprint]"),
      revision: svg.dataset.revision!,
      current,
      from: current,
      target,
      started: current === target ? -1 : -2,
    };
    cache.set(svg, nodes);
  }
  if (nodes.fills.length !== count || nodes.columns !== columns) {
    nodes.columns = columns;
    nodes.rows = Array.from(
      svg.querySelectorAll<SVGGElement>("[data-footprint-row]"),
    );
    nodes.fills = Array.from(
      svg.querySelectorAll<SVGRectElement>("[data-footprint-fill]"),
    );
    nodes.edges = Array.from(
      svg.querySelectorAll<SVGRectElement>("[data-footprint-edge]"),
    );
    nodes.widths = nodes.fills.map((fill) =>
      Number(fill.getAttribute("width")),
    );
    // A resource change also changes the chart limit. Keep the amount that can
    // be shown on that scale; repository changes retain their exact live fill.
    paintAmount(
      svg,
      nodes,
      Math.min(nodes.current, Number(svg.dataset.footprintCapacityMb)),
    );
  }
  return nodes;
}

function animate(svg: SVGSVGElement, elapsed: number) {
  const nodes = nodesFor(svg);
  if (nodes.revision !== svg.dataset.revision || nodes.started === -2) {
    nodes.revision = svg.dataset.revision!;
    nodes.from = nodes.current;
    nodes.target = Number(svg.dataset.footprintTargetMb);
    nodes.started = elapsed;
  }
  if (nodes.started >= 0) {
    const progress = Math.min(1, (elapsed - nodes.started) / DURATION);
    const eased = progress * progress * (3 - 2 * progress);
    paintAmount(svg, nodes, nodes.from + (nodes.target - nodes.from) * eased);
    if (progress === 1) nodes.started = -1;
  }
  // One rigid module matrix moves; hundreds of cell meshes stay cached.
  const tier = Number(svg.dataset.footprintGrid);
  nodes.rows.forEach((row) => {
    row.setAttribute(
      "transform",
      moduleTransform(nodes.columns, nodes.fills.length, elapsed, tier),
    );
  });
  const width = nodes.columns * STEP;
  const shift = Math.sin(elapsed * 0.38 + tier * 0.25) * width * 0.4;
  nodes.prism.setAttribute("x1", (-80 + shift).toFixed(2));
  nodes.prism.setAttribute("x2", (width + shift).toFixed(2));
  const light = (0.5 + Math.sin(elapsed * 0.48 - 0.8) * 0.65) * width;
  nodes.sheen.setAttribute("x1", (light - 110).toFixed(2));
  nodes.sheen.setAttribute("x2", (light + 110).toFixed(2));
  if (tier === 0)
    nodes.surface?.style.setProperty(
      "--footprint-light",
      `${((1 - Math.cos(elapsed * 0.38)) * 50).toFixed(2)}%`,
    );
}

function CellGrid({
  amount,
  kind,
  tier,
  revision,
  paused,
  reduced,
  columns,
}: {
  amount: number;
  kind: FootprintKind;
  tier: number;
  revision: string;
  paused: boolean;
  reduced: boolean;
  columns: number;
}) {
  const ref = useRef<SVGSVGElement>(null);
  const id = "footprint-" + useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const [initialAmount] = useState(amount);
  const { cells, capacityMB } = footprintKinds[kind];
  const layout = moduleLayout(columns, cells);
  const outline = boardOutline(layout.width, layout.height, kind === "ram");
  useEffect(() => {
    const svg = ref.current;
    if (!svg) return;
    const nodes = nodesFor(svg);
    const reduce =
      reduced || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Manual pause freezes the current pose, including an unfinished fill.
    // A new selection while paused, or reduced motion, resolves immediately.
    if (!reduce && (!paused || nodes.revision === revision)) return;
    nodes.target = Number(svg.dataset.footprintTargetMb);
    paintAmount(svg, nodes, nodes.target);
    nodes.revision = revision;
    nodes.started = -1;
  }, [paused, reduced, revision, cells, columns]);
  useStudyMotion({ ref, paused, update: animate, fps: 60 });

  return (
    <svg
      ref={ref}
      className={styles.grid}
      data-footprint-grid={tier}
      data-footprint-target-mb={amount}
      data-footprint-current-mb={initialAmount}
      data-footprint-capacity-mb={capacityMB}
      data-footprint-cells={cells}
      data-footprint-columns={columns}
      data-revision={revision}
      viewBox={`${-layout.viewWidth / 2} ${-layout.viewHeight / 2} ${layout.viewWidth} ${layout.viewHeight}`}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient
          id={id + "-prism"}
          data-footprint-prism=""
          gradientUnits="userSpaceOnUse"
          x1="-80"
          y1="0"
          x2={columns * STEP}
          y2="0"
        >
          <stop stopColor="#a4d1c6" />
          <stop offset=".35" stopColor="#b3cee8" />
          <stop offset=".69" stopColor="#c9b7dc" />
          <stop offset="1" stopColor="#e2c7a7" />
        </linearGradient>
        <linearGradient
          id={id + "-sheen"}
          data-footprint-sheen=""
          gradientUnits="userSpaceOnUse"
          x1="-100"
          y1="0"
          x2="120"
          y2="0"
          spreadMethod="pad"
        >
          <stop stopColor="#a6c9dc" stopOpacity=".3" />
          <stop offset=".5" stopColor="#f0f4ed" stopOpacity=".82" />
          <stop offset="1" stopColor="#c0accd" stopOpacity=".3" />
        </linearGradient>
      </defs>
      <g
        data-footprint-module={kind}
        data-footprint-row="0"
        transform={moduleTransform(columns, cells, 0, tier)}
      >
        <path
          d={outline}
          transform="translate(3 -7)"
          fill="none"
          stroke="#a8b8ce"
          strokeOpacity=".2"
          strokeWidth=".8"
        />
        <path
          d={`M8,0l3,-7M${layout.width},8l3,-7M${layout.width - 6},${layout.height}l3,-7M0,${layout.height - 6}l3,-7`}
          fill="none"
          stroke={`url(#${id}-prism)`}
          strokeOpacity=".45"
          strokeWidth=".8"
        />
        <path
          d={outline}
          fill={`url(#${id}-prism)`}
          fillOpacity=".025"
          stroke={`url(#${id}-prism)`}
          strokeOpacity=".47"
          strokeWidth=".9"
        />
        {kind === "ram" ? (
          <>
            <Heatspreader
              width={layout.width}
              height={layout.height}
              id={id}
              columns={columns}
            />
            <g
              fill={`url(#${id}-prism)`}
              fillOpacity=".075"
              stroke={`url(#${id}-sheen)`}
              strokeWidth=".7"
            >
              {Array.from({ length: columns * 2 }, (_, finger) => {
                const x = 13 + finger * ((layout.width - 30) / (columns * 2));
                if (Math.abs(x - Math.round(layout.width * 0.59)) < 14)
                  return null;
                return (
                  <rect
                    key={finger}
                    x={Number(x.toFixed(4))}
                    y={layout.height - 12}
                    width="4"
                    height="9"
                  />
                );
              })}
            </g>
          </>
        ) : (
          <g
            fill="none"
            stroke={`url(#${id}-prism)`}
            strokeOpacity=".48"
            strokeWidth=".8"
          >
            <circle cx={layout.width - 7} cy={layout.height / 2} r="4.5" />
            {Array.from({ length: 9 }, (_, finger) => (
              <path
                key={finger}
                d={`M0,${layout.height / 2 - 32 + finger * 8}h8`}
              />
            ))}
          </g>
        )}
        {Array.from({ length: 8 }, (_, chip) => {
          const x = 12 + (chip % layout.chipsAcross) * (CHIP_WIDTH + 8);
          const y =
            (kind === "ram" ? 85 : 10) +
            Math.floor(chip / layout.chipsAcross) * (layout.chipHeight + 12);
          return (
            <g
              data-footprint-package={chip}
              key={chip}
              transform={`translate(${x - 4} ${y + 5})`}
            >
              <rect
                x="4"
                y="-5"
                width={CHIP_WIDTH}
                height={layout.chipHeight}
                fill="none"
                stroke="#9eb1c5"
                strokeOpacity=".18"
                strokeWidth=".7"
              />
              <path
                d={`M0,0l4,-5M${CHIP_WIDTH},0l4,-5M${CHIP_WIDTH},${layout.chipHeight}l4,-5M0,${layout.chipHeight}l4,-5`}
                fill="none"
                stroke={`url(#${id}-prism)`}
                strokeOpacity=".35"
                strokeWidth=".7"
              />
              <rect
                width={CHIP_WIDTH}
                height={layout.chipHeight}
                rx="1"
                fill="#bbcadf"
                fillOpacity=".018"
                stroke={`url(#${id}-prism)`}
                strokeOpacity=".44"
                strokeWidth=".7"
              />
              {Array.from({ length: cells / 8 }, (_, cell) => {
                const index = chip * (cells / 8) + cell;
                const cellX = 6 + (cell % 5) * STEP;
                const cellY = 6 + Math.floor(cell / 5) * STEP;
                const occupancy = cellOccupancy(initialAmount, index);
                const occupiedWidth = Number((SIZE * occupancy).toFixed(4));
                return (
                  <g data-footprint-cell={index} key={cell}>
                    <rect
                      data-footprint-slot=""
                      x={cellX}
                      y={cellY}
                      width={SIZE}
                      height={SIZE}
                      fill="none"
                      stroke="#93a4ba"
                      strokeOpacity=".18"
                      strokeWidth=".6"
                    />
                    <rect
                      data-footprint-fill={index}
                      data-footprint-occupancy={Number(occupancy.toFixed(6))}
                      x={cellX}
                      y={cellY}
                      width={occupiedWidth}
                      height={SIZE}
                      fill={`url(#${id}-prism)`}
                      fillOpacity=".15"
                    />
                    <rect
                      data-footprint-edge={index}
                      x={cellX}
                      y={cellY}
                      width={occupiedWidth}
                      height={SIZE}
                      fill="none"
                      stroke={`url(#${id}-sheen)`}
                      strokeWidth=".8"
                      opacity={occupiedWidth > 0 ? 1 : 0}
                    />
                  </g>
                );
              })}
            </g>
          );
        })}
      </g>
    </svg>
  );
}

function RawResults({ id }: { id: string }) {
  return (
    <details className={styles.raw}>
      <summary>
        All measured results <span>18 rows</span>
      </summary>
      <div
        className={styles.tableScroll}
        role="region"
        tabIndex={0}
        aria-labelledby={id + "-raw-title"}
      >
        <table className={styles.rawTable}>
          <caption id={id + "-raw-title"}>
            All published RAM and disk measurements
          </caption>
          <thead>
            <tr>
              {["Repository", "Resource", "Tier", "Usage"].map((name) => (
                <th key={name} scope="col">
                  {name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {footprintSamples.flatMap((sample) =>
              (["ram", "storage"] as const).flatMap((kind) =>
                sample[kind].map((measurement, tier) => (
                  <tr
                    key={`${sample.id}-${kind}-${tier}`}
                    data-footprint-sample={sample.id}
                    data-footprint-kind={kind}
                    data-footprint-tier={tier}
                  >
                    <th scope="row">{sample.name}</th>
                    <td>{footprintKinds[kind].label}</td>
                    <td>{measurement.name}</td>
                    <td>{measurement.label}</td>
                  </tr>
                )),
              ),
            )}
          </tbody>
        </table>
      </div>
    </details>
  );
}

export function VorpalFootprint() {
  const ref = useRef<HTMLElement>(null);
  const [columns, setColumns] = useState(40);
  const [kind, setKind] = useState<FootprintKind>("ram");
  const [tiers, setTiers] = useState({ ram: 0, storage: 0 });
  const [sampleIndex, setSampleIndex] = useState(0);
  const { paused, reduced, toggle } = useMotionPreference();
  const id = useId();
  const sample = footprintSamples[sampleIndex];
  const view = footprintKinds[kind];
  const tier = tiers[kind];
  const measurement = sample[kind][tier];
  useEffect(() => {
    const figure = ref.current;
    if (!figure) return;
    const observer = new ResizeObserver(([entry]) => {
      setColumns(entry.contentRect.width < 500 ? 20 : 40);
    });
    observer.observe(figure);
    return () => observer.disconnect();
  }, []);
  const move = (direction: number) =>
    setSampleIndex(
      (current) =>
        (current + direction + footprintSamples.length) %
        footprintSamples.length,
    );
  return (
    <figure
      ref={ref}
      className={styles.figure}
      data-vorpal-footprint=""
      data-footprint-kind={kind}
      data-footprint-sample={sample.id}
      data-footprint-columns={columns}
      aria-labelledby={id + "-title"}
      aria-describedby={id + "-caption"}
    >
      <div className={styles.header}>
        <div>
          <span className={styles.eyebrow}>VORPAL / RESOURCE USAGE</span>
          <h3 className={styles.title} id={id + "-title"}>
            Memory and disk usage.
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
              ? "Footprint follows reduced motion"
              : paused
                ? "Resume footprint animation"
                : "Pause footprint animation"
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
        aria-label="Memory and disk metric"
      >
        {(["ram", "storage"] as const).map((resource) => (
          <button
            type="button"
            key={resource}
            aria-pressed={kind === resource}
            aria-controls={id + "-plot"}
            onClick={() => setKind(resource)}
          >
            {footprintKinds[resource].label}
          </button>
        ))}
      </div>
      <div className={styles.selection}>
        <div className={styles.sample} aria-live="polite" aria-atomic="true">
          <span>
            Repository {sampleIndex + 1} / {footprintSamples.length}
          </span>
          <h4>{sample.name}</h4>
        </div>
        <div className={styles.navigation}>
          {([-1, 1] as const).map((direction) => (
            <button
              type="button"
              className={styles.iconButton}
              key={direction}
              onClick={() => move(direction)}
              aria-label={`${direction < 0 ? "Previous" : "Next"} footprint repository`}
              aria-controls={id + "-plot"}
            >
              {direction < 0 ? (
                <ArrowLeft size={15} aria-hidden="true" />
              ) : (
                <ArrowRight size={15} aria-hidden="true" />
              )}
            </button>
          ))}
        </div>
      </div>
      <div className={styles.chartSection} id={id + "-plot"}>
        <div className={styles.chartHeading}>
          <span>{view.metric}</span>
          <span>{view.capacityMB / 1000} GB chart scale</span>
        </div>
        <div className={styles.plotStage}>
          {/* A single shared frame fits either module. Empty sizing elements
              reserve only their small aspect-ratio difference, not extra rows. */}
          {(["ram", "storage"] as const).map((resource) => {
            const layout = moduleLayout(
              columns,
              footprintKinds[resource].cells,
            );
            return (
              <div
                key={resource}
                className={styles.plotSize}
                aria-hidden="true"
              >
                <div className={styles.tierHeading}>
                  <span>&nbsp;</span>
                </div>
                <div
                  className={styles.grid}
                  style={{
                    aspectRatio: `${layout.viewWidth} / ${layout.viewHeight}`,
                  }}
                />
              </div>
            );
          })}
          <section
            className={styles.tier}
            data-footprint-tier={tier}
            aria-label={measurement.name}
          >
            <div className={styles.tierHeading}>
              <h5>{measurement.name}</h5>
              <span data-footprint-value={tier}>{measurement.label}</span>
            </div>
            <CellGrid
              amount={measurement.mb}
              kind={kind}
              tier={tier}
              revision={`${sample.id}-${kind}-${tier}`}
              paused={paused}
              reduced={reduced}
              columns={columns}
            />
          </section>
        </div>
      </div>
      <div
        className={articleTabs.tabs}
        role="group"
        aria-label="Memory and disk tier"
      >
        {sample[kind].map((entry, index) => (
          <button
            key={entry.name}
            type="button"
            aria-label={entry.name}
            aria-pressed={tier === index}
            aria-controls={id + "-plot"}
            onClick={() =>
              setTiers((current) => ({ ...current, [kind]: index }))
            }
          >
            {index < 2 ? entry.name : index === 2 ? "f16" : "f32"}
          </button>
        ))}
      </div>
      <div className={styles.legendSection}>
        <p className={styles.legend}>
          <span aria-hidden="true" />
          {CELL_MB} MB per cell. Partial cells show the remaining MB.
        </p>
      </div>
      <RawResults id={id} />
      <figcaption className={styles.caption} id={id + "-caption"}>
        <span>
          Fixed 4 GB RAM and 10 GB disk chart scales, not the machine’s
          capacity. Cell area represents the published usage; moving light does
          not change the measurement.
        </span>
        <span>
          RAM is the peak sampled after each of 30 stdio MCP round trips per
          tool. Encoder runs include background embedding work. Disk covers one
          committed index generation after warming search.
        </span>
        <span className={styles.note}>
          Encoder files use another 274 MB (f16) or 547 MB (f32) on disk, shared
          across repositories—not a separate copy per index.{" "}
          <a href={footprintSource}>Published README results</a>.
        </span>
      </figcaption>
    </figure>
  );
}
