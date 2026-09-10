import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { PostSummary } from "@/lib/posts";
import { displayDate } from "@/lib/date";

export function PostList({ posts }: { posts: PostSummary[] }) {
  return (
    <div className="post-list">
      {posts.map((post) => (
        <article key={post.slug} className="post-row">
          <Link href={`/blog/${post.slug}`}>
            <div className="post-row-date">
              <time dateTime={post.date}>{displayDate(post.date)}</time>
              <span>{post.category}</span>
            </div>
            <div className="post-row-copy">
              <h3>{post.title}</h3>
              <p>{post.description}</p>
            </div>
            <div className="post-row-end">
              <span>{post.readingTime}</span>
              <ArrowUpRight size={19} />
            </div>
          </Link>
        </article>
      ))}
    </div>
  );
}
