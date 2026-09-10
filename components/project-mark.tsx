import type { SVGProps } from "react";
import Image from "next/image";

export function ProjectMark({
  slug,
  ...props
}: SVGProps<SVGSVGElement> & { slug: string }) {
  if (slug === "slates")
    return (
      <Image
        src="/brand/slates-tablets.svg"
        alt=""
        aria-hidden="true"
        width={Number(props.width ?? 32)}
        height={Number(props.height ?? 32)}
        className={props.className}
        unoptimized
      />
    );
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {slug === "vorpal" && (
        <>
          <path
            d="M8 26 24 4 20 20 8 26Z"
            fill="currentColor"
            fillOpacity=".12"
          />
          <path d="m8 26 11-12 5-10M7 21l6 5M6 28l3-4" />
        </>
      )}
      {slug === "focal" && (
        <>
          <path d="m16 4 13 24H3L16 4Z" />
          <path d="m4 12 12 5 12-5M4 21l12-4 12 4M16 4v13" opacity=".55" />
          <circle cx="16" cy="17" r="2" fill="currentColor" />
        </>
      )}
      {slug === "hecate" && (
        <>
          <circle cx="16" cy="9" r="5" />
          <circle cx="10" cy="20" r="5" />
          <circle cx="22" cy="20" r="5" />
          <path d="M16 9v8m-6 3 6-3 6 3" opacity=".6" />
        </>
      )}
      {slug === "veil" && (
        <>
          <path d="M6 26V14C6 1 26 1 26 14v12M11 26V14c0-7 10-7 10 0v12M16 13v13" />
        </>
      )}
      {slug === "mantle" && (
        <>
          <path d="m16 3 12 7v12l-12 7-12-7V10l12-7Z" />
          <path d="m4 10 12 7 12-7M16 17v12M10 7l12 7v11" opacity=".5" />
        </>
      )}
      {slug === "hyperscale" && (
        <>
          <path d="M5 26V16h5v10M14 26V10h5v16M23 26V4h5v22" />
          <path d="M3 26h27" opacity=".4" />
        </>
      )}
    </svg>
  );
}
