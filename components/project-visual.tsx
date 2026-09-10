"use client";

import { ProjectMark } from "@/components/project-mark";
import { SlatesStudy } from "@/components/studies/slates";
import { useMotionPreference } from "@/components/motion-provider";

export function ProjectVisual({
  slug,
  large = false,
}: {
  slug: string;
  large?: boolean;
}) {
  const { paused } = useMotionPreference();
  return (
    <div
      className={`project-visual visual-${slug}${large ? " visual-large" : ""}`}
      aria-hidden="true"
    >
      <div className="visual-grid" />
      {slug === "vorpal" ? (
        <svg viewBox="0 0 360 200" fill="none" className="graph-art">
          <path
            d="M-20 101H101L154 48H240L290-2M101 101l53 53h86l50 48M101 101h160l46-47h73M240 154l45-45h95"
            stroke="#34373d"
          />
          <path
            className="graph-trace"
            d="M-20 101H101L154 48H240L290-2"
            stroke="#9ba7c1"
            strokeDasharray="30 400"
          />
          <path
            className="graph-trace graph-trace-two"
            d="M-20 101H101l53 53h86l50 48"
            stroke="#b1a0bf"
            strokeDasharray="25 400"
          />
          {[
            [101, 101],
            [154, 48],
            [240, 48],
            [154, 154],
            [240, 154],
            [261, 101],
          ].map(([x, y], i) => (
            <g key={i}>
              <rect
                x={x - 5}
                y={y - 5}
                width="10"
                height="10"
                rx="2"
                fill="#111316"
                stroke="#666b73"
              />
              <rect x={x - 1} y={y - 1} width="2" height="2" fill="#c5cbd7" />
            </g>
          ))}
          <g fontFamily="monospace" fontSize="9" fill="#8a8d95">
            <text x="78" y="128">
              symbol
            </text>
            <text x="153" y="34">
              references
            </text>
            <text x="153" y="179">
              callers
            </text>
          </g>
        </svg>
      ) : slug === "focal" ? (
        <svg viewBox="0 0 360 200" fill="none" className="focal-art">
          <circle cx="180" cy="100" r="76" stroke="#23252a" />
          <circle cx="180" cy="100" r="54" stroke="#3a3d45" />
          <circle cx="180" cy="100" r="31" stroke="#53515e" />
          <path
            d="M-10 100h370M180-10v220"
            stroke="#27282d"
            strokeDasharray="2 5"
          />
          <circle
            className="focal-orbit"
            cx="180"
            cy="100"
            r="54"
            stroke="#b1a4bf"
            strokeWidth="1.3"
            strokeDasharray="22 317"
          />
          <path d="m169 100 7 7 15-15" stroke="#d6d4df" strokeWidth="1.5" />
          <g fill="#111214" stroke="#777482">
            <circle cx="180" cy="24" r="3" />
            <circle cx="234" cy="100" r="3" />
            <circle cx="180" cy="176" r="3" />
          </g>
          <g fontFamily="monospace" fontSize="9" fill="#8a8d95">
            <text x="22" y="90">
              claim
            </text>
            <text x="270" y="119">
              evidence
            </text>
          </g>
        </svg>
      ) : slug === "slates" ? (
        <SlatesStudy paused={paused} className="slates-art" />
      ) : (
        <div className="quiet-art">
          <span />
          <span />
          <ProjectMark slug={slug} width={66} height={66} />
        </div>
      )}
      <span className="visual-coordinate">
        {slug === "vorpal"
          ? "STRUCTURE → CONTEXT"
          : slug === "focal"
            ? "INTENT → EVIDENCE"
            : slug === "slates"
              ? "ISOLATE → INTEGRATE"
              : slug === "hyperscale"
                ? "SCENARIO → FEEDBACK"
                : "HYPERLIGHT / RESEARCH"}
      </span>
    </div>
  );
}
