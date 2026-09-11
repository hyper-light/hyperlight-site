"use client";

import { useId } from "react";
import {
  MemoryBoard,
  ProcessorPackage,
  OutputBoard,
} from "./vorpal-ranking-hardware-parts";
import {
  candidates,
  channels,
  contribution,
  ordered,
  traceAt,
} from "./vorpal-ranking-model";
import styles from "./vorpal-ranking.module.css";

type Point = readonly [number, number];
type Pose = { matrix: string; at: (x: number, y: number) => Point };
const clamp = (n: number) => Math.min(1, Math.max(0, n));
const ease = (n: number) => n * n * (3 - 2 * n);
const colors = ["#9cbfb9", "#a3b5d3", "#baa7c8"];
const fmt = (n: number) => n.toFixed(5);

// Same rigid three-quarter construction as the RAM/NVMe figures. Text and pins
// belong to their board plane; bus endpoints use that very same projection.
function pose(
  x: number,
  y: number,
  width: number,
  height: number,
  time: number,
  phase: number,
  portrait: boolean,
): Pose {
  const yaw = -0.26 + Math.sin(time * 0.32 + phase) * 0.025;
  const pitch = -0.31 + Math.sin(time * 0.38 + phase) * 0.035;
  const roll =
    (portrait ? -0.035 : -0.105) + Math.sin(time * 0.29 + phase) * 0.018;
  const cy = Math.cos(yaw),
    sy = Math.sin(yaw),
    cp = Math.cos(pitch),
    sp = Math.sin(pitch),
    cr = Math.cos(roll),
    sr = Math.sin(roll);
  const a = cy * cr - sy * sp * sr,
    b = cy * sr + sy * sp * cr,
    c = -cp * sr,
    d = cp * cr;
  const e = x + width / 2 - (a * width + c * height) / 2;
  const f =
    y +
    height / 2 -
    (b * width + d * height) / 2 +
    Math.sin(time * 0.48 + phase) * 3;
  return {
    matrix: `matrix(${[a, b, c, d, e, f].map((n) => n.toFixed(5)).join(" ")})`,
    at: (xx, yy) => [a * xx + c * yy + e, b * xx + d * yy + f],
  };
}
function route(
  start: Point,
  end: Point,
  portrait: boolean,
  lane: number,
): Point[] {
  if (!portrait) {
    const gap = (end[0] - start[0]) * 0.6;
    return [start, [start[0] + gap, start[1]], [end[0] - gap, end[1]], end];
  }
  const rail = 389 + lane * 6;
  return [start, [rail, start[1] + 28], [rail, end[1] - 35], end];
}
function bezier(points: Point[], t: number): Point {
  const v = 1 - t;
  const axis = (i: number) =>
    v * v * v * points[0][i] +
    3 * v * v * t * points[1][i] +
    3 * v * t * t * points[2][i] +
    t * t * t * points[3][i];
  return [axis(0), axis(1)];
}
function wire(points: Point[], offset = 0) {
  const [a, b, c, d] = points;
  return `M${a[0]},${a[1] + offset}C${b[0]},${b[1] + offset} ${c[0]},${c[1] + offset} ${d[0]},${d[1] + offset}`;
}
function pulse(points: Point[], progress: number) {
  return Array.from({ length: 12 }, (_, i) =>
    bezier(
      points,
      Math.max(0, progress - 0.13) +
        ((Math.min(1, progress) - Math.max(0, progress - 0.13)) * i) / 11,
    ),
  )
    .map((p, i) => `${i ? "L" : "M"}${p[0]},${p[1]}`)
    .join(" ");
}

export function RankingHardware({
  time,
  portrait = false,
}: {
  time: number;
  portrait?: boolean;
}) {
  const id = "rrf-hardware-" + useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const trace = traceAt(time);
  const activeIndex =
    trace.activeCell < 0 ? -1 : Math.floor(trace.activeCell / 3);
  const channel = trace.activeCell < 0 ? -1 : trace.activeCell % 3;
  const active = candidates[activeIndex];
  const rank = active?.ranks[channel] ?? null;
  const committed =
    trace.completedCells +
    Number(trace.activeCell >= 0 && trace.cellPhase >= 0.72);
  const mw = portrait ? 330 : 274,
    mh = 128;
  const cw = 304,
    ch = 266;
  const ow = portrait ? 338 : 290,
    oh = 166;
  const banks = channels.map((_, i) =>
    pose(42, portrait ? 44 + i * 156 : 74 + i * 166, mw, mh, time, i, portrait),
  );
  const cpu = pose(
    portrait ? 58 : 408,
    portrait ? 555 : 210,
    cw,
    ch,
    time,
    3,
    portrait,
  );
  const output = pose(
    portrait ? 40 : 790,
    portrait ? 913 : 257,
    ow,
    oh,
    time,
    4,
    portrait,
  );
  const buses = banks.map((bank, i) =>
    route(
      bank.at(mw - 30, mh - 4),
      cpu.at(portrait ? cw - 1.5 : 1.5, 65 + i * 49),
      portrait,
      i,
    ),
  );
  const outBus = portrait
    ? [
        cpu.at(1.5, ch * 0.81),
        [15, cpu.at(1.5, ch * 0.81)[1] + 50] as Point,
        [15, output.at(2, oh * 0.52)[1]] as Point,
        output.at(2, oh * 0.52),
      ]
    : route(cpu.at(cw - 1.5, ch * 0.54), output.at(2, oh * 0.52), false, 0);
  const hasRead =
    trace.activeCell >= 0 && rank !== null && trace.cellPhase < 0.25;
  const writing =
    trace.activeCell >= 0 && channel === 2 && trace.cellPhase >= 0.72;
  const readProgress = ease(clamp(trace.cellPhase / 0.25));
  const writeProgress = ease(clamp((trace.cellPhase - 0.72) / 0.28));
  const sort = ease(clamp((time - 20) / 2.4));
  const totals = candidates.map((candidate, i) =>
    candidate.ranks.reduce<number>(
      (sum, r, j) => sum + (i * 3 + j < committed ? contribution(r) : 0),
      0,
    ),
  );
  const mathPhase =
    trace.stage !== 1
      ? "idle"
      : rank === null
        ? "absent"
        : trace.cellPhase < 0.25
          ? "read"
          : trace.cellPhase < 0.48
            ? "form"
            : trace.cellPhase < 0.72
              ? "transfer"
              : "add";
  const addFlash =
    mathPhase === "add" ? 1 - clamp((trace.cellPhase - 0.72) / 0.28) : 0;
  // A full track represents three rank-zero nominations. Every contribution
  // uses this same scale, including while the segment travels to its register.
  const trackStart = 72;
  const trackWidth = 112;
  const units = trackWidth / (3 * contribution(0));
  const contributionWidth = contribution(rank) * units;
  const previousWidth = active
    ? active.ranks.reduce<number>(
        (sum, r, j) => sum + (j < channel ? contribution(r) * units : 0),
        0,
      )
    : 0;
  const transferProgress = ease(clamp((trace.cellPhase - 0.48) / 0.24));
  // The segment arrives exactly when phase 0.72 commits the numeric total.
  const accumulatorRoute: Point[] = [
    [trackStart, 99],
    [48, 106],
    [48, 155 + activeIndex * 27],
    [trackStart + previousWidth, 155 + activeIndex * 27],
  ];
  const segmentPosition = bezier(accumulatorRoute, transferProgress);
  return (
    <svg
      className={`${styles.hardware} ${portrait ? styles.portrait : styles.landscape}`}
      viewBox={portrait ? "0 0 420 1138" : "0 0 1120 610"}
      data-ranking-scene={portrait ? "portrait" : "landscape"}
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
        <linearGradient id={id + "-bus"} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#9cbfb9" />
          <stop offset=".5" stopColor="#a3b5d3" />
          <stop offset="1" stopColor="#baa7c8" />
        </linearGradient>
        <radialGradient id={id + "-aura"}>
          <stop stopColor="#9aafc9" stopOpacity=".075" />
          <stop offset="1" stopColor="#9aafc9" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse
        cx={portrait ? 210 : 590}
        cy={portrait ? 670 : 335}
        rx={portrait ? 208 : 530}
        ry={portrait ? 440 : 260}
        fill={`url(#${id}-aura)`}
      />
      {buses.map((bus, i) => (
        <g key={i} data-ranking-bus={i}>
          {[-4.5, -1.5, 1.5, 4.5].map((offset) => (
            <path
              key={offset}
              d={wire(bus, offset)}
              stroke={colors[i]}
              strokeOpacity={channel === i ? 0.4 : 0.18}
              strokeWidth=".75"
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {hasRead && channel === i && (
            <>
              <path
                data-ranking-packet="read"
                d={pulse(bus, readProgress)}
                stroke={colors[i]}
                strokeWidth="2.6"
                strokeLinecap="round"
              />
              <circle
                cx={bezier(bus, readProgress)[0]}
                cy={bezier(bus, readProgress)[1]}
                r="3.5"
                fill={colors[i]}
                fillOpacity=".6"
              />
            </>
          )}
        </g>
      ))}
      <g data-ranking-bus="output">
        {[-6, -2, 2, 6].map((offset) => (
          <path
            key={offset}
            d={wire(outBus, offset)}
            stroke={`url(#${id}-bus)`}
            strokeOpacity=".25"
            strokeWidth=".8"
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {writing && (
          <path
            data-ranking-packet="write"
            d={pulse(outBus, writeProgress)}
            stroke="#bbc9d9"
            strokeWidth="3"
            strokeLinecap="round"
          />
        )}
      </g>
      {channels.map((name, i) => (
        <g
          key={name}
          transform={banks[i].matrix}
          data-ranking-board={`input-${i}`}
        >
          <text
            x="12"
            y="-18"
            className={styles.hwLegend}
            style={{ fill: colors[i] }}
            data-ranking-label={`channel-${name.toLowerCase()}`}
          >
            0{i + 1} / {name.toUpperCase()}
          </text>
          <MemoryBoard
            id={`${id}-bank-${i}`}
            width={mw}
            height={mh}
            active={channel === i}
          >
            <text x="23" y="33" className={styles.hwMicro}>
              RANK
            </text>
            <text x="67" y="33" className={styles.hwMicro}>
              SYMBOL
            </text>
            {candidates
              .filter((candidate) => candidate.ranks[i] !== null)
              .sort((a, b) => a.ranks[i]! - b.ranks[i]!)
              .map((candidate, j) => (
                <g
                  key={candidate.id}
                  data-source-entry={`${candidate.id}-${i}`}
                  data-active={active?.id === candidate.id && channel === i}
                >
                  <text x="30" y={55 + j * 22} className={styles.hwRank}>
                    {candidate.ranks[i]}
                  </text>
                  <text
                    x="67"
                    y={55 + j * 22}
                    className={styles.hwSymbol}
                    fill={`url(#${id}-lettering)`}
                    data-ranking-label={`candidate-${candidate.id}-${i}`}
                  >
                    {candidate.symbol}
                  </text>
                  <text
                    x={mw - 26}
                    y={55 + j * 22}
                    textAnchor="end"
                    className={styles.hwId}
                  >
                    {candidate.id}
                  </text>
                  {active?.id === candidate.id && channel === i && (
                    <path
                      d={`M18 ${44 + j * 22}v13M20 ${60 + j * 22}H${mw - 22}`}
                      stroke={colors[i]}
                      strokeWidth="1.2"
                      strokeOpacity=".75"
                    />
                  )}
                </g>
              ))}
          </MemoryBoard>
        </g>
      ))}
      <g transform={cpu.matrix} data-ranking-board="processor">
        <text
          x={cw / 2}
          y="-34"
          textAnchor="middle"
          className={styles.hwLegend}
        >
          RECIPROCAL RANK FUSION
        </text>
        <ProcessorPackage
          id={id + "-cpu"}
          width={cw}
          height={ch}
          active={trace.stage === 1}
        >
          <text
            x={cw / 2}
            y="50"
            textAnchor="middle"
            className={styles.hwCpuTitle}
            fill={`url(#${id}-lettering)`}
          >
            RRF
          </text>
          <text
            x={cw / 2}
            y="80"
            textAnchor="middle"
            className={styles.hwSymbol}
            fill={`url(#${id}-lettering)`}
            data-ranking-current-symbol=""
          >
            {active?.symbol ??
              (trace.stage === 0
                ? "Initialize registers"
                : "Scores accumulated")}
          </text>
          <g
            data-ranking-operation=""
            data-math-phase={mathPhase}
            data-contribution-value={contribution(rank)}
          >
            <rect
              x={trackStart - 2}
              y="97"
              width={trackWidth + 4}
              height="11"
              rx="1"
              stroke="#a5b6cc"
              strokeOpacity=".2"
              strokeWidth=".8"
            />
            {trace.stage === 1 && rank !== null && (
              <>
                <path
                  d={wire(accumulatorRoute, 3.5)}
                  stroke={colors[channel]}
                  strokeOpacity=".12"
                  strokeWidth=".8"
                />
                {(mathPhase === "form" || mathPhase === "transfer") && (
                  <rect
                    data-ranking-contribution=""
                    x={segmentPosition[0]}
                    y={segmentPosition[1]}
                    width={contributionWidth}
                    height="7"
                    rx=".6"
                    fill={colors[channel]}
                    fillOpacity={
                      mathPhase === "form"
                        ? 0.6 * ease(clamp((trace.cellPhase - 0.25) / 0.16))
                        : 0.6
                    }
                    stroke={colors[channel]}
                    strokeOpacity=".8"
                    strokeWidth=".65"
                  />
                )}
              </>
            )}
          </g>
          <path d={`M42 120H${cw - 42}`} stroke="#a5b6cc" strokeOpacity=".25" />
          <text x="44" y="137" className={styles.hwMicro}>
            REGISTER
          </text>
          <text x={cw - 45} y="137" textAnchor="end" className={styles.hwMicro}>
            RUNNING TOTAL
          </text>
          {candidates.map((candidate, i) => (
            <g
              key={candidate.id}
              data-ranking-register={candidate.id}
              data-active={active?.id === candidate.id}
            >
              <path
                d={`M39 ${147 + i * 27}H${cw - 40}v24H39Z`}
                fill={active?.id === candidate.id ? "#aebcd7" : "#91a2b6"}
                fillOpacity={active?.id === candidate.id ? 0.06 : 0.02}
                stroke="#91a2b6"
                strokeOpacity={
                  0.18 + (active?.id === candidate.id ? addFlash * 0.45 : 0)
                }
              />
              <text x="50" y={165 + i * 27} className={styles.hwRank}>
                {candidate.id}
              </text>
              <rect
                data-ranking-score-track={candidate.id}
                x={trackStart}
                y={155 + i * 27}
                width={trackWidth}
                height="7"
                rx=".6"
                stroke="#91a2b6"
                strokeOpacity=".2"
                strokeWidth=".7"
              />
              {candidate.ranks.map((r, j) => {
                if (r === null || i * 3 + j >= committed) return null;
                const precedingWidth = candidate.ranks.reduce<number>(
                  (sum, previous, index) =>
                    sum + (index < j ? contribution(previous) * units : 0),
                  0,
                );
                return (
                  <rect
                    key={j}
                    data-ranking-score-segment={`${candidate.id}-${j}`}
                    x={trackStart + precedingWidth}
                    y={155 + i * 27}
                    width={contribution(r) * units}
                    height="7"
                    fill={colors[j]}
                    fillOpacity={
                      0.45 +
                      (active?.id === candidate.id && j === channel
                        ? addFlash * 0.25
                        : 0)
                    }
                    stroke={colors[j]}
                    strokeOpacity=".65"
                    strokeWidth=".5"
                  />
                );
              })}
              <text
                x={cw - 52}
                y={165 + i * 27}
                textAnchor="end"
                className={styles.hwValue}
                data-register-total={candidate.id}
              >
                {fmt(totals[i])}
              </text>
            </g>
          ))}
          <text
            x={cw / 2}
            y="238"
            textAnchor="middle"
            className={styles.hwMicro}
          >
            {String(committed).padStart(2, "0")} / 09 CONTRIBUTIONS
          </text>
        </ProcessorPackage>
      </g>
      <g transform={output.matrix} data-ranking-board="output">
        <text
          x="12"
          y="-22"
          className={styles.hwLegend}
          data-ranking-label="result"
        >
          RESULT BUFFER
        </text>
        <OutputBoard id={id + "-out"} width={ow} height={oh}>
          <text x="29" y="34" className={styles.hwMicro}>
            {trace.stage === 3
              ? "ORDERED BY TOTAL ↓"
              : "WRITE ACCUMULATED SCORES"}
          </text>
          {candidates.map((candidate, i) => {
            const order = ordered.findIndex((item) => item.id === candidate.id);
            const position = i + (order - i) * sort;
            const written =
              trace.completedCells >= (i + 1) * 3 || trace.stage >= 2;
            return (
              <g
                key={candidate.id}
                data-trace-row={candidate.id}
                data-written={written}
                transform={`translate(${candidate.id === "C" ? Math.sin(Math.PI * sort) * 5 : 0} ${position * 32})`}
              >
                <path
                  d={`M21 42H${ow - 31}l5 5v19H21Z`}
                  fill="#0d1219"
                  fillOpacity=".96"
                  stroke={
                    candidate.id === "C" && trace.stage === 3
                      ? "#a7c7bd"
                      : "#9eacc2"
                  }
                  strokeOpacity={written ? 0.48 : 0.16}
                />
                <path
                  d={`M21 42l3-4H${ow - 28}l-3 4M${ow - 26} 47l3-4v20l-3 3`}
                  stroke="#b5c4d6"
                  strokeOpacity=".22"
                  strokeWidth=".7"
                />
                <text x="30" y="59" className={styles.hwId}>
                  {trace.stage === 3 ? order + 1 : candidate.id}
                </text>
                <text
                  x="48"
                  y="59"
                  className={styles.hwOutputSymbol}
                  fill={`url(#${id}-lettering)`}
                  data-ranking-label={`output-${candidate.id}`}
                >
                  {candidate.symbol}
                </text>
                <text
                  x={ow - 39}
                  y="59"
                  textAnchor="end"
                  className={styles.hwOutputValue}
                  data-ranking-total={candidate.id}
                >
                  {written ? fmt(totals[i]) : "—"}
                </text>
              </g>
            );
          })}
          <text x="29" y={oh - 24} className={styles.hwMicro}>
            {trace.stage === 3
              ? "C → A → B"
              : "UNSORTED UNTIL FUSION COMPLETES"}
          </text>
        </OutputBoard>
      </g>
      <text
        x={portrait ? 210 : 560}
        y={portrait ? 1113 : 582}
        textAnchor="middle"
        className={styles.hwFootnote}
      >
        Original ranks preserved · absent nominations contribute 0
      </text>
    </svg>
  );
}
