import type { Metadata } from "next";
import { Rss } from "lucide-react";
import { BlogExplorer } from "@/components/blog-explorer";
import { getPosts } from "@/lib/posts";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Engineering notes, design decisions, and things we’re learning while building Hyperlight.",
  alternates: { canonical: "/blog" },
};

export default function BlogPage() {
  return (
    <main id="main" className="container subpage">
      <div className="page-intro writing-intro">
        <span className="eyebrow">
          <span className="spectrum-rule" /> Blog
        </span>
        <h1>Building Hyperlight.</h1>
        <p>
          Updates on the tools we’re making and what we learn along the way.
        </p>
        <a href="/feed.xml" className="text-link">
          <Rss size={14} /> Follow via RSS
        </a>
      </div>
      <BlogExplorer posts={getPosts()} />
    </main>
  );
}
