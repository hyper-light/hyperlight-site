"use client";

import { useId, useRef } from "react";
import {
  useStudyMotion,
  type StudyProps,
} from "@/components/studies/use-study-motion";

const THREADS = 55;
const STEPS = 35;
type Thread = { d: string; opacity: string };

function point(u: number, v: number, time: number): [number, number] {
  const envelope = Math.sin(v * Math.PI);
  const ripple = Math.sin(v * 7.5 - u * 4.5 + time * 0.9);
  return [
    131 +
      u * 376 +
      envelope * (ripple * 22 + Math.sin(u * 5.5 + time * 0.48) * 19),
    113 +
      v * 378 +
      Math.sin(u * Math.PI) * 29 +
      Math.sin(u * 4.2 + time * 0.55) * envelope * 14 -
      u * 17,
  ];
}

function line(u: number, time: number): string {
  return Array.from({ length: STEPS + 1 }, (_, index) => {
    const [x, y] = point(u, index / STEPS, time);
    return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
  }).join("");
}

function frame(time: number): Thread[] {
  const slit = 0.49 + Math.sin(time * 0.52) * 0.25;
  return Array.from({ length: THREADS }, (_, index) => {
    const u = index / (THREADS - 1);
    const light = Math.exp(-Math.pow((u - slit) / 0.052, 2));
    return { d: line(u, time), opacity: (light * 0.91).toFixed(4) };
  });
}

function perimeter(time: number) {
  const points: [number, number][] = [];
  for (let v = 0; v <= STEPS; v++) points.push(point(0, v / STEPS, time));
  for (let u = 1; u <= STEPS; u++) points.push(point(u / STEPS, 1, time));
  for (let v = STEPS - 1; v >= 0; v--) points.push(point(1, v / STEPS, time));
  for (let u = STEPS - 1; u >= 0; u--) points.push(point(u / STEPS, 0, time));
  return `M${points.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join("L")}Z`;
}

const initial = frame(0);
const elements = new WeakMap<
  SVGSVGElement,
  {
    threads: NodeListOf<SVGPathElement>;
    light: NodeListOf<SVGPathElement>;
    film: SVGPathElement | null;
  }
>();

function update(svg: SVGSVGElement, time: number) {
  let nodes = elements.get(svg);
  if (!nodes) {
    nodes = {
      threads: svg.querySelectorAll("[data-veil-thread]"),
      light: svg.querySelectorAll("[data-veil-light]"),
      film: svg.querySelector("[data-veil-film]"),
    };
    elements.set(svg, nodes);
  }
  frame(time).forEach((thread, index) => {
    nodes.threads[index].setAttribute("d", thread.d);
    nodes.light[index].setAttribute("d", thread.d);
    nodes.light[index].setAttribute("opacity", thread.opacity);
  });
  nodes.film?.setAttribute("d", perimeter(time));
}

/** Light passes through a woven surface; one traveling slit reveals its color. */
export function VeilStudy({ paused = false, className }: StudyProps) {
  const ref = useRef<SVGSVGElement>(null);
  const id = `veil-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
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
        <linearGradient
          id={`${id}-silver`}
          x1="128"
          y1="110"
          x2="497"
          y2="504"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#cad2db" stopOpacity=".25" />
          <stop offset=".35" stopColor="#768392" stopOpacity=".33" />
          <stop offset=".65" stopColor="#e5e0df" stopOpacity=".62" />
          <stop offset="1" stopColor="#bfc5d5" stopOpacity=".15" />
        </linearGradient>
        <linearGradient
          id={`${id}-spectrum`}
          x1="285"
          y1="119"
          x2="370"
          y2="505"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#d8bd9a" />
          <stop offset=".24" stopColor="#d1aabd" />
          <stop offset=".47" stopColor="#bcb3df" />
          <stop offset=".72" stopColor="#98c4e0" />
          <stop offset="1" stopColor="#bfd8c5" />
        </linearGradient>
        <radialGradient id={`${id}-light`}>
          <stop stopColor="#c7cdd9" stopOpacity=".055" />
          <stop offset="1" stopColor="#c7cdd9" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="324" cy="323" rx="181" ry="224" fill={`url(#${id}-light)`} />
      <path
        d="M216 405c-47-102 4-208 93-211 89-3 134 109 94 201"
        stroke="#bdc5d8"
        strokeWidth=".7"
        opacity=".12"
      />
      <path
        d="M233 405c-44-84-1-188 76-192 78-4 120 99 78 183"
        stroke="#b6a8c7"
        strokeWidth=".65"
        opacity=".11"
      />
      <path
        data-veil-film
        d={perimeter(0)}
        fill="#a7b8cb"
        fillOpacity=".024"
        stroke="#abb7c7"
        strokeOpacity=".23"
        strokeWidth=".65"
      />
      <g stroke={`url(#${id}-silver)`} strokeWidth=".75">
        {initial.map((thread, index) => (
          <path key={index} data-veil-thread d={thread.d} />
        ))}
      </g>
      <g stroke={`url(#${id}-spectrum)`} strokeWidth="1.1">
        {initial.map((thread, index) => (
          <path
            key={index}
            data-veil-light
            d={thread.d}
            opacity={thread.opacity}
          />
        ))}
      </g>
      <path
        d="M111 108h9m-4-4v8m398 378h9m-5-4v8"
        stroke="#8d929d"
        strokeWidth=".7"
        opacity=".55"
      />
      <path d="M260 548h119" stroke="#454954" strokeWidth=".6" />
      <path d="M314 545v6m9-6v6" stroke="#8a91a0" strokeWidth=".7" />
    </svg>
  );
}
