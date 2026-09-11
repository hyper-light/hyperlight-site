"use client";

import { useId, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { useMotionPreference } from "@/components/motion-provider";
import { useStudyMotion } from "@/components/studies/use-study-motion";
import {
  fusionDetails,
  rankLeafDetails,
  rankLeafPoint,
  type RankingDetail,
} from "./vorpal-ranking-geometry";
import articleTabs from "./article-tabs.module.css";
import styles from "./vorpal-ranking.module.css";

const channels = ["Name", "Vector", "Graph"] as const;
type CandidateId = "A" | "B" | "C";
type Candidate = {
  id: CandidateId;
  ranks: readonly [number | null, number | null, number | null];
};
const candidates: readonly Candidate[] = [
  { id: "A", ranks: [0, 5, 1] },
  { id: "B", ranks: [null, 0, null] },
  { id: "C", ranks: [1, 2, 0] },
];
const contribution = (rank: number | null) =>
  rank === null ? 0 : 1 / (60 + rank);
const score = (candidate: Candidate) =>
  candidate.ranks.reduce<number>((sum, rank) => sum + contribution(rank), 0);
const ordered = [...candidates].sort((a, b) => score(b) - score(a));

type Point = readonly [number, number, number];
type Shape = {
  id: string;
  d: string;
  kind: RankingDetail["kind"] | "slot" | "contribution" | "result";
  candidate?: CandidateId;
};
type Label = {
  id: string;
  x: string;
  y: string;
  text: string;
  kind: "channel" | "rank" | "candidate" | "output" | "formula";
  candidate?: CandidateId;
};
type Scene = { shapes: Shape[]; labels: Label[] };

function scene(time: number, portrait = false): Scene {
  const shapes: Shape[] = [];
  const labels: Label[] = [];
  // Bodies and their text share one gently breathing projection. The type
  // remains upright and undistorted while its anchor follows the glass.
  const yaw = -0.15 + Math.sin(time * 0.31) * 0.065;
  const pitch = 0.13 + Math.sin(time * 0.41) * 0.032;
  const breath = 1 + Math.sin(time * 0.53) * 0.017;
  const lift = Math.sin(time * 0.43) * 4;
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  const project = ([x, y, z]: Point): [number, number] => {
    const xx = x * cy + z * sy;
    const zz = -x * sy + z * cy;
    const yy = y * cp - zz * sp;
    const depth = y * sp + zz * cp;
    const perspective = ((portrait ? 0.88 : 1) * breath * 820) / (820 + depth);
    return [
      (portrait ? 210 : 392) + xx * perspective,
      (portrait ? 270 : 268) + lift + yy * perspective,
    ];
  };

  const rowPitch = 16;
  const outputs = ordered.map((_, index) => ({
    x:
      (portrait ? (index - 1) * 132 : 256) +
      Math.sin(time * 0.48 + index * 0.8) * 3,
    y:
      (portrait ? 230 : (index - 1) * 54) +
      Math.sin(time * 0.52 + index * 0.65) * 4,
    z: Math.sin(time * 0.39 + index * 0.7) * 8,
  }));
  const path = (points: Point[], closed = false) =>
    points
      .map((point, index) => {
        const [x, y] = project(point);
        return `${index ? "L" : "M"}${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(" ") + (closed ? "Z" : "");
  const add = (
    id: string,
    points: Point[],
    kind: Shape["kind"],
    closed = false,
    candidate?: CandidateId,
  ) => shapes.push({ id, d: path(points, closed), kind, candidate });
  const label = (
    id: string,
    point: Point,
    text: string,
    kind: Label["kind"],
    candidate?: CandidateId,
  ) => {
    const [x, y] = project(point);
    labels.push({
      id,
      x: x.toFixed(2),
      y: y.toFixed(2),
      text,
      kind,
      candidate,
    });
  };

  // The front surface is also the exact attachment point for each flow.
  const finPoint = (
    center: Point,
    halfWidth: number,
    halfHeight: number,
    phase: number,
    u: number,
    side: number,
  ): Point =>
    rankLeafPoint(time, center, halfWidth, halfHeight, phase, u, side);
  const fin = (
    id: string,
    center: Point,
    halfWidth: number,
    halfHeight: number,
    phase: number,
    kind: "slot" | "result",
    candidate?: CandidateId,
  ) => {
    const contour = (side: number) =>
      Array.from({ length: 17 }, (_, index) =>
        finPoint(center, halfWidth, halfHeight, phase, index / 16, side),
      );
    const upper = contour(-1);
    const lower = contour(1);
    add(id, [...upper, ...lower.slice().reverse()], kind, true, candidate);
    for (const detail of rankLeafDetails(
      time,
      center,
      halfWidth,
      halfHeight,
      phase,
    )) {
      add(
        `${id}-${detail.id}`,
        detail.points,
        detail.kind,
        detail.closed,
        candidate,
      );
    }
  };

  // The three sheets are continuous surfaces, with a shallow moving twist.
  // Camera/material motion changes neither candidate identities nor rank data.
  channels.forEach((channel, channelIndex) => {
    const columnX =
      (portrait ? (channelIndex - 1) * 144 : -236) +
      Math.sin(time * 0.47 + channelIndex * 0.8) * 4;
    const center =
      (portrait ? -170 : (channelIndex - 1) * 168) +
      Math.sin(time * 0.51 + channelIndex * 0.7) * 5;
    const sourceDepth = Math.sin(time * 0.38 + channelIndex * 0.85) * 9;
    const halfWidth = portrait ? 34 : 38;
    const sourceX = columnX + halfWidth;
    const ribbonPoint = (u: number, across: number): Point => {
      const v = 1 - u;
      const x = portrait
        ? v * v * v * sourceX +
          3 * v * v * u * (sourceX + 30) +
          3 * v * u * u * columnX * 0.45
        : v * v * v * sourceX +
          3 * v * v * u * -84 +
          3 * v * u * u * 3 +
          u * u * u * 104;
      const y = portrait
        ? v * v * v * center +
          3 * v * v * u * -86 +
          3 * v * u * u * -30 +
          u * u * u * 52
        : center * (v * v * v + 2.1 * v * v * u + 0.15 * v * u * u);
      const width = 41 * (1 - u) + 9 * u;
      const twist =
        Math.sin(u * Math.PI) *
        (0.65 +
          channelIndex * 0.18 +
          Math.sin(time * 0.48 + channelIndex) * 0.16);
      const drift =
        Math.sin(time * 0.36 + channelIndex * 1.4) * Math.sin(u * Math.PI) * 10;
      const turn = portrait ? (u * Math.PI) / 2 : 0;
      return [
        x + across * width * Math.sin(turn) * Math.cos(twist),
        y + across * width * Math.cos(turn) * Math.cos(twist),
        Math.sin(u * Math.PI) * 48 +
          across * width * Math.sin(twist) +
          drift +
          sourceDepth * (1 - u),
      ];
    };
    const strip = (across: number) =>
      Array.from({ length: 33 }, (_, index) => ribbonPoint(index / 32, across));
    add(
      `sheet-${channelIndex}`,
      [...strip(-1), ...strip(1).reverse()],
      "glass",
      true,
    );
    // The rear edge is a second surface, not a detached decorative contour.
    const rear = strip(-1).map(([x, y, z]): Point => [x, y + 0.4, z - 3]);
    add(`sheet-${channelIndex}-rear`, rear, "wire");
    add(
      `sheet-${channelIndex}-bevel`,
      [...strip(-1), ...rear.slice().reverse()],
      "bevel",
      true,
    );
    add(
      `sheet-${channelIndex}-reflection`,
      Array.from({ length: 29 }, (_, i) =>
        ribbonPoint(0.035 + (i / 28) * 0.93, -0.91),
      ),
      "sheen",
    );
    [-1, 0, 1].forEach((across, index) =>
      add(`grain-${channelIndex}-${index}`, strip(across), "wire"),
    );
    // Fine transverse ribs reveal the sheet's curvature without a box/grid UI.
    [0.09, 0.19, 0.3, 0.42, 0.55, 0.69, 0.82, 0.93].forEach((u, index) =>
      add(
        `rib-${channelIndex}-${index}`,
        [-1, -0.5, 0, 0.5, 1].map((across) => ribbonPoint(u, across)),
        "rib",
      ),
    );
    label(
      `channel-${channelIndex}`,
      [columnX - halfWidth, center - 68, sourceDepth],
      channel,
      "channel",
    );
    for (let rank = 0; rank < 6; rank++) {
      const y = center + (rank - 2.5) * rowPitch;
      const candidate = candidates.find(
        (item) => item.ranks[channelIndex] === rank,
      );
      fin(
        `slot-${channelIndex}-${rank}`,
        [columnX, y, sourceDepth],
        halfWidth,
        4.4,
        channelIndex * 1.3 + rank * 0.32,
        "slot",
        candidate?.id,
      );
      label(
        `rank-${channelIndex}-${rank}`,
        [columnX - halfWidth - 28, y + 3, sourceDepth],
        String(rank),
        "rank",
      );
      if (candidate) {
        label(
          `candidate-${channelIndex}-${rank}`,
          [columnX - halfWidth - 10, y + 3, sourceDepth],
          candidate.id,
          "candidate",
          candidate.id,
        );
        const resultIndex = ordered.findIndex(
          (item) => item.id === candidate.id,
        );
        const output = outputs[resultIndex];
        const [resultX, resultY, resultDepth] = finPoint(
          [output.x + 5, output.y, output.z],
          53,
          7,
          2 + resultIndex * 0.7,
          portrait ? 0.75 : 0,
          portrait ? -1 : 0,
        );
        const flow = strip(((rank - 2.5) * rowPitch) / 41);
        const last = flow[flow.length - 1];
        for (let i = 1; i <= 28; i++) {
          const u = i / 28;
          const smooth = u * u * (3 - 2 * u);
          // Portrait routes bend around a reserved central lane for the
          // formula and output heading, then join the sliver's upper edge.
          const rise = Math.min(1, u / 0.35);
          const fall = Math.min(1, (1 - u) / 0.16);
          const clearance = portrait
            ? rise *
              rise *
              (3 - 2 * rise) *
              fall *
              fall *
              (3 - 2 * fall) *
              (resultIndex === 0 ? -1 : 1) *
              (resultIndex === 1 ? 115 : 48)
            : 0;
          flow.push([
            last[0] * (1 - smooth) + resultX * smooth + clearance,
            last[1] * (1 - smooth) + resultY * smooth,
            last[2] * (1 - u) +
              resultDepth * u -
              Math.sin(u * Math.PI) * (18 + channelIndex * 5),
          ]);
        }
        add(
          `flow-${channelIndex}-${candidate.id}`,
          flow,
          "contribution",
          false,
          candidate.id,
        );
      }
    }
  });

  for (const detail of fusionDetails(time, portrait))
    add(detail.id, detail.points, detail.kind, detail.closed);
  label(
    "fusion",
    portrait ? [0, 125, 0] : [78, 116, 0],
    "Σ 1 / (60 + r)",
    "formula",
  );
  labels[labels.length - 1].x = project(
    portrait ? [0, 52, 0] : [78, 0, 0],
  )[0].toFixed(2);
  label(
    "result",
    portrait
      ? [outputs[1].x, 183, outputs[1].z]
      : [outputs[0].x, outputs[0].y - 35, outputs[0].z],
    "Fused order",
    "channel",
  );
  ordered.forEach((candidate, index) => {
    const { x, y, z } = outputs[index];
    fin(
      `result-${candidate.id}`,
      [x + 5, y, z],
      53,
      7,
      2 + index * 0.7,
      "result",
      candidate.id,
    );
    label(
      `output-rank-${candidate.id}`,
      [x - 46, y - 22, z],
      String(index + 1),
      "rank",
      candidate.id,
    );
    label(
      `output-${candidate.id}`,
      [x - 28, y - 22, z],
      candidate.id,
      "output",
      candidate.id,
    );
  });
  return { shapes, labels };
}

const initial = [scene(0), scene(0, true)];
type Elements = {
  paths: Map<string, SVGPathElement>;
  texts: Map<string, SVGTextElement>;
  lights: SVGPathElement[];
  prism: SVGLinearGradientElement | null;
  reflection: SVGLinearGradientElement | null;
  figure: HTMLElement | null;
};
const cache = new WeakMap<SVGSVGElement, Elements>();

function animate(svg: SVGSVGElement, time: number) {
  let elements = cache.get(svg);
  if (!elements) {
    elements = {
      paths: new Map(
        Array.from(
          svg.querySelectorAll<SVGPathElement>("[data-ranking-shape]"),
          (node) => [node.dataset.rankingShape!, node],
        ),
      ),
      texts: new Map(
        Array.from(
          svg.querySelectorAll<SVGTextElement>("[data-ranking-label]"),
          (node) => [node.dataset.rankingLabel!, node],
        ),
      ),
      lights: Array.from(
        svg.querySelectorAll<SVGPathElement>("[data-ranking-light]"),
      ),
      prism: svg.querySelector("[data-ranking-prism]"),
      reflection: svg.querySelector("[data-ranking-reflection]"),
      figure: svg.closest<HTMLElement>("[data-vorpal-ranking]"),
    };
    cache.set(svg, elements);
  }
  const current = scene(time, svg.dataset.portrait === "true");
  for (const shape of current.shapes)
    elements.paths.get(shape.id)?.setAttribute("d", shape.d);
  for (const text of current.labels) {
    const element = elements.texts.get(text.id);
    element?.setAttribute("x", text.x);
    element?.setAttribute("y", text.y);
  }
  elements.lights.forEach((light, index) => {
    const shape = elements.paths.get(light.dataset.rankingLight!);
    if (shape) light.setAttribute("d", shape.getAttribute("d")!);
    light.setAttribute(
      "stroke-dashoffset",
      (-time * 18 + index * 13).toFixed(2),
    );
  });
  const shift = Math.sin(time * 0.21) * 145;
  elements.prism?.setAttribute("x1", (95 + shift).toFixed(2));
  elements.prism?.setAttribute("x2", (740 + shift).toFixed(2));
  elements.reflection?.setAttribute(
    "gradientTransform",
    `rotate(${(Math.sin(time * 0.33) * 16).toFixed(2)} .5 .5)`,
  );
  elements.figure?.style.setProperty(
    "--ranking-prism-shift",
    `${(50 + Math.sin(time * 0.21) * 45).toFixed(2)}%`,
  );
}

function RankingArt({
  paused,
  selected,
  portrait = false,
}: {
  paused: boolean;
  selected: CandidateId | "all";
  portrait?: boolean;
}) {
  const ref = useRef<SVGSVGElement>(null);
  const id = "ranking-" + useId().replace(/[^a-zA-Z0-9_-]/g, "");
  useStudyMotion({ ref, paused, update: animate, fps: 60 });
  const frame = initial[Number(portrait)];
  return (
    <svg
      ref={ref}
      className={`${styles.art} ${portrait ? styles.portrait : styles.landscape}`}
      data-ranking-art=""
      data-portrait={String(portrait)}
      data-highlight={selected}
      viewBox={portrait ? "0 0 420 535" : "0 0 800 548"}
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={id + "-lettering"} x1="0" y1="0" x2=".25" y2="1">
          <stop stopColor="#c2d4d6" />
          <stop offset=".48" stopColor="#aebdc9" />
          <stop offset="1" stopColor="#a89caf" />
        </linearGradient>
        <linearGradient
          id={id + "-fin"}
          data-ranking-reflection=""
          x1="0"
          y1="0"
          x2=".8"
          y2="1"
        >
          <stop stopColor="#acc9d5" stopOpacity=".025" />
          <stop offset=".35" stopColor="#b9d1df" stopOpacity=".09" />
          <stop offset=".48" stopColor="#d3e1eb" stopOpacity=".23" />
          <stop offset=".59" stopColor="#849eb7" stopOpacity=".035" />
          <stop offset="1" stopColor="#b9b7d2" stopOpacity=".075" />
        </linearGradient>
        <linearGradient id={id + "-glass"} x1="0" y1="0" x2=".8" y2="1">
          <stop stopColor="#c5d2e2" stopOpacity=".055" />
          <stop offset=".46" stopColor="#657c98" stopOpacity=".012" />
          <stop offset="1" stopColor="#b5c3d9" stopOpacity=".045" />
        </linearGradient>
        <linearGradient
          id={id + "-prism"}
          data-ranking-prism=""
          gradientUnits="userSpaceOnUse"
          x1="95"
          y1="30"
          x2="740"
          y2="370"
        >
          <stop stopColor="#96c6bc" />
          <stop offset=".3" stopColor="#9dafd9" />
          <stop offset=".64" stopColor="#c3a2cd" />
          <stop offset="1" stopColor="#d5bd94" />
        </linearGradient>
        <radialGradient id={id + "-aura"}>
          <stop stopColor="#91adc4" stopOpacity=".055" />
          <stop offset="1" stopColor="#91adc4" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse
        cx={portrait ? 210 : 440}
        cy={portrait ? 285 : 270}
        rx={portrait ? 190 : 230}
        ry="200"
        fill={`url(#${id}-aura)`}
      />
      {frame.shapes.map((shape) => (
        <path
          key={shape.id}
          data-ranking-shape={shape.id}
          data-kind={shape.kind}
          data-candidate={shape.candidate}
          d={shape.d}
          className={styles[shape.kind]}
          fill={
            shape.kind === "slot" ||
            shape.kind === "result" ||
            shape.kind === "bevel"
              ? `url(#${id}-fin)`
              : shape.kind === "glass"
                ? `url(#${id}-glass)`
                : "none"
          }
          stroke={
            (shape.candidate &&
              shape.kind !== "sheen" &&
              shape.kind !== "rib") ||
            shape.kind === "rim"
              ? `url(#${id}-prism)`
              : undefined
          }
          vectorEffect="non-scaling-stroke"
        />
      ))}
      {frame.shapes
        .filter((shape) => shape.kind === "contribution")
        .map((shape, index) => (
          <path
            key={shape.id}
            data-ranking-light={shape.id}
            data-candidate={shape.candidate}
            d={shape.d}
            className={styles.light}
            pathLength="100"
            stroke={`url(#${id}-prism)`}
            strokeDasharray="9 91"
            strokeDashoffset={index * 13}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      {frame.labels.map((text) => (
        <text
          key={text.id}
          data-ranking-label={text.id}
          data-candidate={text.candidate}
          x={text.x}
          y={text.y}
          style={
            text.kind === "candidate" || text.kind === "output"
              ? { fill: `url(#${id}-lettering)` }
              : undefined
          }
          textAnchor={
            text.id === "fusion" ||
            text.id === "result" ||
            text.kind === "candidate" ||
            text.kind === "output"
              ? "middle"
              : undefined
          }
          className={styles[text.kind + "Label"]}
        >
          {text.text}
        </text>
      ))}
    </svg>
  );
}

/** A concrete RRF example, not measured search output or an embedding-space plot. */
export function VorpalRanking() {
  const [selected, setSelected] = useState<CandidateId | "all">("all");
  const { paused, reduced, toggle } = useMotionPreference();
  const id = useId();
  const focused = candidates.find((candidate) => candidate.id === selected);
  return (
    <figure
      className={styles.figure}
      data-vorpal-ranking=""
      aria-labelledby={id + "-title"}
      aria-describedby={id + "-caption"}
    >
      <div className={styles.header}>
        <div>
          <span className={styles.eyebrow}>
            VORPAL / RECIPROCAL RANK FUSION
          </span>
          <h3 className={styles.title} id={id + "-title"}>
            Different signals. One result order.
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
              ? "Ranking animation follows reduced motion"
              : paused
                ? "Resume ranking animation"
                : "Pause ranking animation"
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
        Add rank contributions, not incompatible raw scores.
      </p>
      <RankingArt paused={paused} selected={selected} />
      <RankingArt paused={paused} selected={selected} portrait />
      <div
        className={articleTabs.tabs}
        role="group"
        aria-label="Highlight candidate contributions"
      >
        {(["all", "A", "B", "C"] as const).map((candidate) => (
          <button
            key={candidate}
            type="button"
            aria-label={
              candidate === "all" ? "All candidates" : `Candidate ${candidate}`
            }
            aria-pressed={selected === candidate}
            onClick={() => setSelected(candidate)}
            data-ranking-select={candidate}
          >
            {candidate === "all" ? (
              "All candidates"
            ) : (
              <>
                <span className={styles.candidateWord}>Candidate </span>
                {candidate}
              </>
            )}
          </button>
        ))}
      </div>
      <div className={styles.explanation} aria-live="polite" aria-atomic="true">
        {focused ? (
          <>
            <span className={styles.equation}>
              {focused.id}:{" "}
              {focused.ranks
                .map((rank) => (rank === null ? "0" : `1/${60 + rank}`))
                .join(" + ")}{" "}
              = {score(focused).toFixed(5)}
            </span>
            <span>
              {focused.id === "B"
                ? "B leads the vector list but gets no contribution from the other two."
                : focused.id === "C"
                  ? "C wins with support from all three lists, though it doesn't lead the vector list."
                  : "A leads the name list, but its lower vector rank puts it just behind C."}
            </span>
          </>
        ) : (
          <>
            <span className={styles.equation}>score = Σ 1 / (60 + rank)</span>
            <span>
              Each list can contribute to a candidate’s score. A missing
              candidate gets zero from that list.
            </span>
          </>
        )}
      </div>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <caption>
            Illustrative ranks, starting at zero. Sorted by the computed RRF
            total.
          </caption>
          <thead>
            <tr>
              <th scope="col">Candidate</th>
              {channels.map((channel) => (
                <th key={channel} scope="col">
                  {channel}
                </th>
              ))}
              <th scope="col">RRF total</th>
            </tr>
          </thead>
          <tbody>
            {ordered.map((candidate) => (
              <tr
                key={candidate.id}
                data-ranking-result={candidate.id}
                data-highlighted={
                  selected === "all" || selected === candidate.id
                }
              >
                <th scope="row">{candidate.id}</th>
                {candidate.ranks.map((rank, index) => (
                  <td key={channels[index]}>
                    {rank === null ? (
                      <span aria-label="Not nominated">—</span>
                    ) : (
                      rank
                    )}
                  </td>
                ))}
                <td data-ranking-score={candidate.id}>
                  {score(candidate).toFixed(5)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <figcaption className={styles.caption} id={id + "-caption"}>
        <span>
          C wins without leading the vector list. Select a candidate to follow
          its contributions. The graph list ranks name-matched candidates by how
          often other code references them.
        </span>
        <span className={styles.note}>
          Other enabled lists can contribute too. The optional neural reranker
          keeps the fused winner and reorders the remaining top results.{" "}
          <a href="https://github.com/hyper-light/vorpal/blob/4dd203fa560bfd2c0c8f1857f7bbca983c23de63/crates/index/src/lib.rs#L4328-L4365">
            See the fusion implementation.
          </a>
        </span>
      </figcaption>
    </figure>
  );
}
