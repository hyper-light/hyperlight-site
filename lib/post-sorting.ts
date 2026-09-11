import type { PostSummary } from "@/lib/posts";

export const postSortOptions = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "name-asc", label: "Name A–Z" },
  { value: "name-desc", label: "Name Z–A" },
] as const;

export type PostSort = (typeof postSortOptions)[number]["value"];

/** Input is the canonical newest-first order supplied by getPosts. */
export function sortPosts(
  posts: readonly PostSummary[],
  sort: PostSort,
): PostSummary[] {
  if (sort === "newest") return [...posts];
  if (sort === "oldest") return [...posts].reverse();

  const direction = sort === "name-asc" ? 1 : -1;
  return posts
    .map((post, index) => ({ post, index }))
    .sort(
      (a, b) =>
        direction *
          a.post.title.localeCompare(b.post.title, "en", {
            sensitivity: "base",
          }) || a.index - b.index,
    )
    .map(({ post }) => post);
}
