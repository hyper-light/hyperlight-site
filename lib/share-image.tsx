import React from "react";
import { ImageResponse } from "next/og";
import { brandContour, brandFold, brandRefraction } from "@/lib/brand";

type ShareImageOptions = {
  title: string;
  description: string;
  label: string;
};

function shortText(value: string, limit: number) {
  const clean = value.replace(/\s+/g, " ").trim();
  const characters = Array.from(clean);
  if (characters.length <= limit) return clean;
  const slice = characters.slice(0, limit - 1).join("");
  const lastSpace = slice.lastIndexOf(" ");
  return (
    (lastSpace > slice.length * 0.7 ? slice.slice(0, lastSpace) : slice) + "…"
  );
}

/** Shared, self-contained social image. Text stays text; rendering fetches no assets. */
export function renderShareImage({
  title,
  description,
  label,
}: ShareImageOptions) {
  const heading = shortText(title, 132) || "Hyperlight";
  const summary = shortText(description, 180);
  const category = shortText(label, 36).toUpperCase();
  const fontSize =
    heading.length > 100
      ? 48
      : heading.length > 72
        ? 56
        : heading.length > 46
          ? 64
          : 76;
  const colors = [
    "#9eacb7",
    "#a5b7c9",
    "#a99bc1",
    "#c0a4b2",
    "#a6bbb6",
    "#c4bda4",
  ];

  return new ImageResponse(
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        position: "relative",
        overflow: "hidden",
        background: "#08090a",
        color: "#ededee",
        fontFamily: "sans-serif",
        padding: "60px 76px",
      }}
    >
      <div
        style={{
          position: "absolute",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          right: 28,
          top: 116,
          width: 344,
          height: 420,
        }}
      >
        {Array.from({ length: 14 }, (_, index) => (
          <div
            key={index}
            style={{
              position: "absolute",
              width: 269 - index * 9,
              height: 361 - index * 11,
              border: `1px solid ${colors[index % colors.length]}`,
              borderRadius: "50%",
              transform: `rotate(${24 + index * 6}deg)`,
              opacity: 0.2 + index * 0.024,
            }}
          />
        ))}
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: 728,
          position: "relative",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 15 }}>
          <svg width="35" height="39" viewBox="0 0 32 32" fill="none">
            <path d={brandContour} stroke="#ededee" strokeWidth="2" />
            <path d={brandFold} stroke="#a9a7b5" strokeWidth="1.5" />
            <path d={brandRefraction} stroke="#bcb1d8" strokeWidth="2" />
          </svg>
          <span style={{ fontSize: 29, letterSpacing: -0.9 }}>hyperlight</span>
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 51,
            fontSize: 13,
            letterSpacing: 2.2,
            color: "#b1b4c2",
          }}
        >
          {category}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 19,
            fontSize,
            lineHeight: 1.08,
            fontWeight: 500,
            letterSpacing: fontSize > 60 ? -3.2 : -1.8,
            maxHeight: 274,
            overflow: "hidden",
            wordBreak: "break-word",
          }}
        >
          {heading}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 24,
            maxWidth: 690,
            maxHeight: 104,
            overflow: "hidden",
            fontSize: 22,
            lineHeight: 1.45,
            color: "#a2a8b4",
            wordBreak: "break-word",
          }}
        >
          {summary}
        </div>
      </div>
      <span
        style={{
          position: "absolute",
          display: "flex",
          left: 76,
          bottom: 39,
          fontSize: 11,
          letterSpacing: 1.5,
          color: "#838d9d",
        }}
      >
        INFRASTRUCTURE FOR AGENTS AND HUMANS
      </span>
      <div
        style={{
          position: "absolute",
          left: 76,
          right: 76,
          bottom: 0,
          height: 2,
          background: "linear-gradient(100deg,#b8d9d2,#a6c4ed,#b8a6d5,#d8cbb0)",
          opacity: 0.8,
        }}
      />
    </div>,
    { width: 1200, height: 630 },
  );
}
