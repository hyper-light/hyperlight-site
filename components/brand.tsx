import { brandContour, brandFold, brandRefraction } from "@/lib/brand";

export function Brand({ wordmark = true }: { wordmark?: boolean }) {
  return (
    <span className="brand">
      <svg
        className="brand-mark"
        viewBox="0 0 32 32"
        fill="none"
        aria-hidden="true"
        focusable="false"
      >
        <path
          d={brandContour}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="square"
        />
        <path
          d={brandFold}
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="square"
          opacity=".56"
        />
        <path d={brandRefraction} stroke="#bcb1d8" strokeWidth="2" />
        <path
          d="M5.2 21.3C4.9 19.8 5.1 18.5 5.4 17.2"
          stroke="#aacbd0"
          strokeWidth="2"
        />
      </svg>
      {wordmark && <span>hyperlight</span>}
    </span>
  );
}
