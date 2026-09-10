import { ImageResponse } from "next/og";
import { brandContour, brandFold, brandRefraction } from "@/lib/brand";

export const alt =
  "Hyperlight. Infrastructure for agents and humans, any scale, any place.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        background: "#08090a",
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "64px 76px",
        color: "#ededee",
        fontFamily: "sans-serif",
        position: "relative",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <svg width="38" height="42" viewBox="0 0 32 32" fill="none">
          <path d={brandContour} stroke="#ededee" strokeWidth="2" />
          <path d={brandFold} stroke="#a9a7b5" strokeWidth="1.5" />
          <path d={brandRefraction} stroke="#bcb1d8" strokeWidth="2" />
        </svg>
        <span style={{ fontSize: 32, letterSpacing: -1 }}>hyperlight</span>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          fontSize: 106,
          lineHeight: 1.05,
          letterSpacing: -7,
          fontWeight: 500,
        }}
      >
        <span>Any scale.</span>
        <span style={{ color: "#b3b1be" }}>Any place.</span>
      </div>
      <span
        style={{
          display: "flex",
          fontSize: 22,
          color: "#a0a1ab",
          letterSpacing: 0.2,
        }}
      >
        Infrastructure for agents and humans.
      </span>
      <div
        style={{
          position: "absolute",
          right: 82,
          top: 104,
          width: 360,
          height: 420,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {Array.from({ length: 12 }, (_, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              width: 270 - i * 10,
              height: 365 - i * 12,
              border: `1px solid ${["#939da7", "#aeb1bb", "#b0a4c4", "#c1a8b5", "#a6b5ca", "#bbc7bf"][i % 6]}`,
              borderRadius: "50%",
              transform: `rotate(${24 + i * 6}deg)`,
              opacity: 0.26 + i * 0.03,
            }}
          />
        ))}
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 76,
          right: 76,
          height: 2,
          background: "linear-gradient(100deg,#b8d9d2,#a6c4ed,#b8a6d5,#d8cbb0)",
          opacity: 0.8,
        }}
      />
    </div>,
    size,
  );
}
