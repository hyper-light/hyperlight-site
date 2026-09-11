/** Only these repository-owned illustrations can become interactive article figures. */
export const articleVisuals = {
  "/illustrations/vorpal-architecture.svg": "vorpal-architecture",
} as const;

export type ArticleVisual =
  (typeof articleVisuals)[keyof typeof articleVisuals];
export type ArticleBlock =
  | { kind: "html"; html: string }
  | { kind: "visual"; visual: ArticleVisual; alt: string };

export function getArticleVisual(src: unknown): ArticleVisual | undefined {
  return typeof src === "string" && Object.hasOwn(articleVisuals, src)
    ? articleVisuals[src as keyof typeof articleVisuals]
    : undefined;
}
