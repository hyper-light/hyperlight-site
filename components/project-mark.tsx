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
          <circle cx="16" cy="16" r="12" />
          <path
            d="M12 4.7c-5 7.1-3.3 16.9 6.3 23M5 12c5 2 6 1.7 7 1m-7.2 4c5 2.6 7 2.3 10 1.5M7 23c4 1.7 7 1.4 10.3.8"
            opacity=".6"
          />
          <path d="M16 8a8 8 0 0 1 8 13M17 12a4 4 0 0 1 4 7" />
        </>
      )}
      {slug === "hyperscale" && (
        <>
          <path d="M5 26V16h5v10M14 26V10h5v16M23 26V4h5v22" />
          <path d="M3 26h27" opacity=".4" />
        </>
      )}
      {slug === "hex" && (
        <>
          <path
            d="m11.9 4.5 3.5 2v4l-3.5 2-3.5-2v-4Zm8.2 0 3.5 2v4l-3.5 2-3.5-2v-4ZM7.8 11.8l3.5 2v4l-3.5 2-3.5-2v-4Zm16.4 0 3.5 2v4l-3.5 2-3.5-2v-4ZM11.9 19l3.5 2v4l-3.5 2-3.5-2v-4Zm8.2 0 3.5 2v4l-3.5 2-3.5-2v-4Z"
            opacity=".45"
          />
          <path
            d="m16 11.8 3.5 2v4l-3.5 2-3.5-2v-4Z"
            fill="currentColor"
            fillOpacity=".18"
          />
          <path d="m20.1 19 3.5 2v4l-3.5 2" />
          <circle cx="16" cy="15.8" r="1" fill="currentColor" stroke="none" />
        </>
      )}
      {slug === "shards" && (
        <>
          <path d="m14 6 5-4 2 10-5 7-4-5Zm-11 8 6-5 2 9-4 8-3-6Zm20 3 6-6-2 14-5 5-1-7Z" />
          <path d="m19 2-3 10v7M9 9l-3 9 1 8m22-15-5 12-2 7" opacity=".4" />
          <path d="m15 10 2 3m-12 4 2 2m16 2 2 2" />
        </>
      )}
      {slug === "athame" && (
        <>
          <path d="M7 10V7l9-4 9 4v8c0 6-9 13-9 13S7 21 7 15" />
          <path d="m11 9 5-2.3L21 9v6c0 3.4-3 6.9-5 8.7" opacity=".35" />
          <path d="M2 13h10m3-3 3 3-3 3-3-3 3-3Z" />
          <path d="M2 21h4m0-2v4" opacity=".55" />
        </>
      )}
      {slug === "reliquary" && (
        <>
          <path d="M4 5v22m0-21h9M4 16h7M4 26h6" opacity=".5" />
          <path d="m18 3 4 3-4 3-4-3 4-3Zm-2 9 9 3v7l-9 3-4-5v-5l4-3Z" />
          <path d="m16 12 3 6 6-3m-6 3-3 7" opacity=".4" />
          <path d="M10 24h4v4h-4Z" fill="currentColor" fillOpacity=".12" />
        </>
      )}
      {slug === "hoard" && (
        <>
          <path d="M5 10V6h13m7-3 3 3-3 3-3-3 3-3Z" opacity=".4" />
          <path d="M7 16h10m3 5v5H5v-5" />
          <circle cx="5" cy="16" r="2" />
          <path d="M17 12h7v8h-7Z" fill="currentColor" fillOpacity=".15" />
          <path d="m3 23 2-2 2 2" />
        </>
      )}
      {slug === "quiver" && (
        <>
          <path
            d="m2 16 4-2.5L15 16l-9 2.5L2 16Z"
            fill="currentColor"
            fillOpacity=".15"
          />
          <path d="m17 8 2-3 10-2-8 5h-4Z" opacity=".65" />
          <path d="m19 16 3-2 9 2-9 2-3-2Z" />
          <path d="m17 24 4 0 8 5-10-2-2-3Z" opacity=".65" />
        </>
      )}
      {slug === "clarion" && (
        <>
          <path
            d="M16 3a13 13 0 0 1 13 13M16 29A13 13 0 0 1 3 16"
            opacity=".45"
          />
          <path d="M7 16a9 9 0 0 1 9-9m9 9a9 9 0 0 1-9 9" />
          <path d="M16 11a5 5 0 0 1 5 5m-5 5a5 5 0 0 1-5-5" opacity=".7" />
          <path d="m16 14 2 2-2 2-2-2 2-2Z" fill="currentColor" />
        </>
      )}
    </svg>
  );
}
