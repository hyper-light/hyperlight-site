"use client";

import { Fragment, useId, useRef } from "react";
import {
  useStudyMotion,
  type StudyProps,
} from "@/components/studies/use-study-motion";

type Point = { x: number; y: number };
const f = (n: number) => n.toFixed(2);
const path = (points: Point[], close = false) =>
  points.map((p, i) => `${i ? "L" : "M"}${f(p.x)},${f(p.y)}`).join("") +
  (close ? "Z" : "");
const COUNT = 16;
function project(x: number, y: number, z: number, t: number): Point {
  const turn = -0.54 + Math.sin(t * 0.24) * 0.055;
  const px = x * Math.cos(turn) - y * Math.sin(turn);
  const depth = x * Math.sin(turn) + y * Math.cos(turn);
  const scale = 1200 / (1200 - depth * 0.32 - z * 0.2);
  return { x: 320 + px * scale, y: 341 + (depth * 0.56 - z * 0.9) * scale };
}
function frame(t: number) {
  const selected = (t * 0.26 + 5) % COUNT;
  const artifacts = Array.from({ length: COUNT }, (_, i) => {
    const distance = Math.min(
      Math.abs(i - selected),
      COUNT - Math.abs(i - selected),
    );
    const focus = Math.exp(-Math.pow(distance / 0.63, 4));
    const x = ((i % 4) - 1.5) * 88;
    const y = (Math.floor(i / 4) - 1.5) * 86;
    const z = 13 + Math.sin(t * 0.56 + i * 0.61) * 2 + focus * 54;
    const height = 39 + ((i * 7) % 5) * 7;
    const width = 14 + (i % 3) * 3;
    const depth = 12 + (i % 2) * 4;
    const p = (dx: number, dy: number, dz: number) =>
      project(x + dx, y + dy, z + dz, t);
    const lower = [
      p(-width, -depth, 0),
      p(width, -depth, 0),
      p(width, depth, 0),
      p(-width, depth, 0),
    ];
    const upper = [
      p(-width, -depth, height),
      p(width, -depth, height),
      p(width, depth, height),
      p(-width, depth, height),
    ];
    const address = project(x, y, 0, t);
    return {
      faces: [
        path([lower[0], lower[1], upper[1], upper[0]], true),
        path([lower[1], lower[2], upper[2], upper[1]], true),
        path([lower[2], lower[3], upper[3], upper[2]], true),
        path([lower[3], lower[0], upper[0], upper[3]], true),
        path(upper, true),
      ],
      outline:
        path(lower, true) +
        path(upper, true) +
        lower.map((p, j) => path([p, upper[j]])).join(""),
      etchings: Array.from({ length: 9 }, (_, j) =>
        path([
          p(-width * 0.73, depth + 0.4, height * (0.1 + (j / 10) * 0.85)),
          p(
            width * (0.24 + ((j + i) % 4) * 0.16),
            depth + 0.4,
            height * (0.1 + (j / 10) * 0.85),
          ),
        ]),
      ).join(""),
      signature: path(
        Array.from({ length: 51 }, (_, j) => {
          const u = j / 50;
          return p(
            Math.cos(u * Math.PI * (2 + (i % 3)) + i) * width * 0.44,
            Math.sin(u * Math.PI * (2 + (i % 3)) + i) * depth * 0.55,
            u * height * 0.77 + height * 0.1,
          );
        }),
      ),
      tether: path([address, project(x, y, z + height * 0.5, t)]),
      socket: path(
        [
          project(x - width * 0.8, y - depth * 0.8, 0, t),
          project(x + width * 0.8, y - depth * 0.8, 0, t),
          project(x + width * 0.8, y + depth * 0.8, 0, t),
          project(x - width * 0.8, y + depth * 0.8, 0, t),
        ],
        true,
      ),
      focus: (0.12 + focus * 0.79).toFixed(4),
      glass: (0.76 + focus * 0.2).toFixed(4),
      shine: (0.32 + Math.sin(t * 0.69 + i * 0.57) * 0.14).toFixed(4),
      shineEnd: (0.375 + Math.sin(t * 0.69 + i * 0.57) * 0.14).toFixed(4),
      glow: (0.1 + focus * 0.58).toFixed(4),
    };
  });
  const index = Array.from({ length: 10 }, (_, i) => {
    const value = -171 + (i % 5) * 86;
    return i < 5
      ? path([project(value, -171, 0, t), project(value, 173, 0, t)])
      : path([project(-171, value, 0, t), project(173, value, 0, t)]);
  });
  return { artifacts, index };
}
const FIRST = frame(0);
const cache = new WeakMap<
  SVGSVGElement,
  {
    faces: SVGPathElement[];
    outlines: SVGPathElement[];
    etchings: SVGPathElement[];
    signatures: SVGPathElement[];
    tethers: SVGPathElement[];
    sockets: SVGPathElement[];
    index: SVGPathElement[];
    spectrum: SVGLinearGradientElement;
    shine: SVGStopElement[];
    shineEnd: SVGStopElement[];
  }
>();
function update(svg: SVGSVGElement, t: number) {
  let nodes = cache.get(svg);
  if (!nodes) {
    const all = (name: string) =>
      Array.from(
        svg.querySelectorAll<SVGPathElement>(`[data-reliquary-${name}]`),
      );
    nodes = {
      faces: all("face"),
      outlines: all("outline"),
      etchings: all("etching"),
      signatures: all("signature"),
      tethers: all("tether"),
      sockets: all("socket"),
      index: all("index"),
      spectrum: svg.querySelector("[data-reliquary-spectrum]")!,
      shine: Array.from(svg.querySelectorAll("[data-reliquary-shine]")),
      shineEnd: Array.from(svg.querySelectorAll("[data-reliquary-shine-end]")),
    };
    cache.set(svg, nodes);
  }
  const elements = nodes;
  const pose = frame(t);
  pose.index.forEach((d, i) => elements.index[i].setAttribute("d", d));
  pose.artifacts.forEach((artifact, i) => {
    elements.shine[i].setAttribute("offset", artifact.shine);
    elements.shineEnd[i].setAttribute("offset", artifact.shineEnd);
    artifact.faces.forEach((d, j) => {
      elements.faces[i * 5 + j].setAttribute("d", d);
      elements.faces[i * 5 + j].setAttribute("opacity", artifact.glass);
    });
    elements.outlines[i].setAttribute("d", artifact.outline);
    elements.etchings[i].setAttribute("d", artifact.etchings);
    elements.signatures[i].setAttribute("d", artifact.signature);
    elements.signatures[i].setAttribute("opacity", artifact.focus);
    elements.tethers[i].setAttribute("d", artifact.tether);
    elements.tethers[i].setAttribute("opacity", artifact.focus);
    elements.tethers[i].setAttribute("stroke-dashoffset", f(-t * 27));
    elements.sockets[i].setAttribute("d", artifact.socket);
    elements.sockets[i].setAttribute("opacity", artifact.glow);
  });
  elements.spectrum.setAttribute(
    "gradientTransform",
    `rotate(${f(Math.sin(t * 0.31) * 19)} 320 300)`,
  );
}

/** Addressable glass artifacts retain their individual signatures and connections during retrieval. */
export function ReliquaryStudy({ paused = false, className }: StudyProps) {
  const ref = useRef<SVGSVGElement>(null);
  const id = `reliquary-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  useStudyMotion({ ref, paused, update });
  return (
    <svg
      ref={ref}
      className={className}
      viewBox="0 0 640 640"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        {FIRST.artifacts.map((artifact, i) => (
          <linearGradient
            key={i}
            id={`${id}-glass-${i}`}
            x1="0"
            y1="0"
            x2="1"
            y2=".25"
          >
            <stop stopColor="#a5bfd3" stopOpacity=".13" />
            <stop offset=".08" stopColor="#8ba7bc" stopOpacity=".04" />
            <stop
              data-reliquary-shine=""
              offset={artifact.shine}
              stopColor="#d7e4ed"
              stopOpacity=".31"
            />
            <stop
              data-reliquary-shine-end=""
              offset={artifact.shineEnd}
              stopColor="#aac3d9"
              stopOpacity=".06"
            />
            <stop offset=".77" stopColor="#8ba4bf" stopOpacity=".04" />
            <stop offset=".93" stopColor="#c0cfe6" stopOpacity=".22" />
            <stop offset="1" stopColor="#ced9e5" stopOpacity=".11" />
          </linearGradient>
        ))}
        <linearGradient id={`${id}-edge`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#d0dce6" stopOpacity=".69" />
          <stop offset=".28" stopColor="#a2b4c5" stopOpacity=".23" />
          <stop offset=".57" stopColor="#c4cee0" stopOpacity=".5" />
          <stop offset=".79" stopColor="#a1b4c5" stopOpacity=".17" />
          <stop offset="1" stopColor="#c9dbe2" stopOpacity=".63" />
        </linearGradient>
        <linearGradient
          id={`${id}-spectrum`}
          data-reliquary-spectrum=""
          x1="124"
          y1="227"
          x2="505"
          y2="421"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#c4c3a2" />
          <stop offset=".25" stopColor="#9bc8bd" />
          <stop offset=".48" stopColor="#a1b8db" />
          <stop offset=".71" stopColor="#bfa7d2" />
          <stop offset="1" stopColor="#d0a8b2" />
        </linearGradient>
      </defs>
      {FIRST.index.map((d, i) => (
        <path
          key={i}
          data-reliquary-index=""
          d={d}
          stroke="#9fb0c1"
          strokeWidth=".55"
          strokeOpacity=".07"
          strokeDasharray="2 5"
        />
      ))}
      {FIRST.artifacts.map((artifact, i) => (
        <Fragment key={i}>
          <path
            data-reliquary-socket=""
            d={artifact.socket}
            stroke={`url(#${id}-spectrum)`}
            strokeWidth=".7"
            opacity={artifact.glow}
          />
          <path
            data-reliquary-tether=""
            d={artifact.tether}
            stroke={`url(#${id}-spectrum)`}
            strokeWidth=".75"
            strokeDasharray="8 5"
            opacity={artifact.focus}
          />
          {artifact.faces.map((d, j) => (
            <path
              key={j}
              data-reliquary-face=""
              d={d}
              fill={`url(#${id}-glass-${i})`}
              opacity={artifact.glass}
            />
          ))}
          <path
            data-reliquary-outline=""
            d={artifact.outline}
            stroke={`url(#${id}-edge)`}
            strokeWidth=".8"
          />
          <path
            data-reliquary-etching=""
            d={artifact.etchings}
            stroke="#b9c9d5"
            strokeWidth=".6"
            strokeOpacity=".27"
          />
          <path
            data-reliquary-signature=""
            d={artifact.signature}
            stroke={`url(#${id}-spectrum)`}
            strokeWidth="1.15"
            opacity={artifact.focus}
          />
        </Fragment>
      ))}
    </svg>
  );
}
