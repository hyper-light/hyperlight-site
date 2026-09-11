/** Retain incoming links when an existing article receives a more useful title. */
export const postRedirects: Readonly<Record<string, string>> = {
  "a-codebase-is-more-than-text": "introducing-vorpal",
  "what-counts-as-done": "agentic-proof-of-work",
};

export function canonicalPostSlug(slug: string): string {
  return Object.hasOwn(postRedirects, slug) ? postRedirects[slug] : slug;
}
