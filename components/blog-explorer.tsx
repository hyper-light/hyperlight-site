"use client";

import { useState } from "react";
import { ChevronDown, Search, X } from "lucide-react";
import type { PostSummary } from "@/lib/posts";
import { postSortOptions, sortPosts, type PostSort } from "@/lib/post-sorting";
import { PostList } from "@/components/post-list";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

export function BlogExplorer({ posts }: { posts: PostSummary[] }) {
  const categories = [
    { value: "all", label: "All posts" },
    ...Array.from(new Set(posts.map((post) => post.category)), (label) => ({
      value: `category:${label}`,
      label,
    })),
  ];
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<PostSort>("newest");
  const visible = sortPosts(
    posts.filter(
      (post) =>
        (category === "all" || `category:${post.category}` === category) &&
        `${post.title} ${post.description} ${post.category}`
          .toLowerCase()
          .includes(query.trim().toLowerCase()),
    ),
    sort,
  );
  return (
    <Tabs
      value={category}
      onValueChange={setCategory}
      className="catalog blog-catalog"
    >
      <div className="catalog-toolbar">
        <TabsList aria-label="Filter blog posts by category">
          {categories.map((item) => (
            <TabsTrigger value={item.value} key={item.value}>
              {item.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <div className="blog-controls">
          <div className="search-field">
            <Search size={16} aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Find a post…"
              aria-label="Search posts"
            />
            {query && (
              <button
                aria-label="Clear post search"
                onClick={() => setQuery("")}
              >
                <X size={15} />
              </button>
            )}
          </div>
          <label className="blog-sort">
            <span className="sr-only">Sort posts</span>
            <select
              value={sort}
              onChange={(event) => {
                const option = postSortOptions.find(
                  ({ value }) => value === event.target.value,
                );
                if (option) setSort(option.value);
              }}
            >
              {postSortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDown size={14} aria-hidden="true" />
          </label>
        </div>
      </div>
      <p className="sr-only" role="status" aria-live="polite">
        {visible.length} {visible.length === 1 ? "article" : "articles"} found
      </p>
      {categories.map((item) => (
        <TabsContent key={item.value} value={item.value}>
          {visible.length ? (
            <PostList posts={visible} />
          ) : (
            <div className="empty-state">
              <Search size={25} />
              <h2>Nothing here just yet.</h2>
              <p>Try another search or browse all posts.</p>
              <Button
                variant="secondary"
                onClick={() => {
                  setQuery("");
                  setCategory("all");
                }}
              >
                Clear filters
              </Button>
            </div>
          )}
        </TabsContent>
      ))}
    </Tabs>
  );
}
