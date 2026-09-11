import assert from "node:assert/strict";
import test from "node:test";
import type { PostSummary } from "../lib/posts";
import { postSortOptions, sortPosts } from "../lib/post-sorting";

function post(slug: string, title: string, date: string): PostSummary {
  return {
    slug,
    title,
    date,
    description: `${title} description`,
    category: "Engineering",
    featured: false,
    readingTime: "1 min read",
  };
}

// Equal-date entries retain the server's editorial tie-break, not slug order.
const posts = Object.freeze([
  Object.freeze(post("zeta", "Zeta", "2026-09-11")),
  Object.freeze(post("vorpal", "Introducing Vorpal", "2026-09-10")),
  Object.freeze(post("proof", "Agentic Proof of Work", "2026-09-10")),
  Object.freeze(post("announcement", "Announcing Hyperlight", "2026-09-10")),
  Object.freeze(post("alpha", "Alpha", "2026-09-09")),
]);

function slugs(entries: readonly PostSummary[]) {
  return entries.map(({ slug }) => slug);
}

test("offers all four date and name sort modes", () => {
  assert.deepEqual(postSortOptions, [
    { value: "newest", label: "Newest first" },
    { value: "oldest", label: "Oldest first" },
    { value: "name-asc", label: "Name A–Z" },
    { value: "name-desc", label: "Name Z–A" },
  ]);
});

test("newest preserves canonical ordering, including editorial same-date ties", () => {
  assert.deepEqual(slugs(sortPosts(posts, "newest")), [
    "zeta",
    "vorpal",
    "proof",
    "announcement",
    "alpha",
  ]);
});

test("oldest reverses the canonical chronology, including its tie-break", () => {
  assert.deepEqual(slugs(sortPosts(posts, "oldest")), [
    "alpha",
    "announcement",
    "proof",
    "vorpal",
    "zeta",
  ]);
});

test("names sort alphabetically in both directions", () => {
  assert.deepEqual(slugs(sortPosts(posts, "name-asc")), [
    "proof",
    "alpha",
    "announcement",
    "vorpal",
    "zeta",
  ]);
  assert.deepEqual(slugs(sortPosts(posts, "name-desc")), [
    "zeta",
    "vorpal",
    "announcement",
    "alpha",
    "proof",
  ]);
});

test("matching names retain canonical date and editorial order in either direction", () => {
  const ties = [
    post("newest", "Same title", "2026-09-11"),
    post("same-day-first", "same title", "2026-09-10"),
    post("same-day-last", "Same title", "2026-09-10"),
    post("oldest", "SAME TITLE", "2026-09-09"),
  ];
  for (const mode of ["name-asc", "name-desc"] as const) {
    assert.deepEqual(sortPosts(ties, mode), ties);
  }
});

test("sorting a filtered subset preserves the selected order and its tie-break", () => {
  const filtered = posts.filter(({ date }) => date === "2026-09-10");
  assert.deepEqual(slugs(sortPosts(filtered, "newest")), [
    "vorpal",
    "proof",
    "announcement",
  ]);
  assert.deepEqual(slugs(sortPosts(filtered, "name-desc")), [
    "vorpal",
    "announcement",
    "proof",
  ]);
});

test("every mode returns a new array without mutating input or posts", () => {
  const original = [...posts];
  for (const { value } of postSortOptions) {
    const sorted = sortPosts(posts, value);
    assert.notEqual(sorted, posts);
    assert.deepEqual(posts, original);
    assert.ok(sorted.every((entry) => posts.includes(entry)));
    assert.deepEqual(sortPosts([], value), []);
    assert.deepEqual(sortPosts(posts.slice(0, 1), value), posts.slice(0, 1));
  }
});
