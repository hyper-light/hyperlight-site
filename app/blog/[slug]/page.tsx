import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { getPost, getPosts, formatDate } from "@/lib/posts";
import { getProject } from "@/lib/projects";
import { ArticleControls } from "@/components/article-controls";
import { PostList } from "@/components/post-list";
import { Brand } from "@/components/brand";
import { site } from "@/lib/site";
import { canonicalPostSlug, postRedirects } from "@/lib/post-redirects";
import { ArticleBody } from "@/components/article-body";

type Props = { params: Promise<{ slug: string }> };
export const dynamicParams = false;
export function generateStaticParams() {
  const posts = getPosts();
  return [
    ...posts.map(({ slug }) => ({ slug })),
    ...Object.entries(postRedirects)
      .filter(([, target]) => posts.some((post) => post.slug === target))
      .map(([slug]) => ({ slug })),
  ];
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await getPost(canonicalPostSlug((await params).slug));
  if (!post) return {};
  const image = {
    url: `/share/blog/${post.slug}`,
    width: 1200,
    height: 630,
    alt: `${post.title} — Hyperlight Blog`,
  };
  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.description,
      publishedTime: post.date,
      authors: ["Hyperlight"],
      url: `/blog/${post.slug}`,
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
      images: [image],
    },
  };
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const post = await getPost(canonicalPostSlug(slug));
  if (!post) notFound();
  if (slug !== post.slug) permanentRedirect(`/blog/${post.slug}`);
  const project = post.project ? getProject(post.project) : undefined;
  const related = getPosts()
    .filter((item) => item.slug !== post.slug)
    .slice(0, 2);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    author: { "@type": "Organization", name: "Hyperlight", url: site.url },
    mainEntityOfPage: `${site.url}/blog/${post.slug}`,
    image: `${site.url}/share/blog/${post.slug}`,
  };
  return (
    <main id="main" className="container article-page subpage">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replaceAll("<", "\\u003c"),
        }}
      />
      <Link className="back-link" href="/blog">
        <ArrowLeft size={15} /> All posts
      </Link>
      <article>
        <header className="article-header">
          <div className="article-kicker">
            <span className="eyebrow">{post.category}</span>
            <span className="eyebrow">{post.readingTime}</span>
          </div>
          <h1>{post.title}</h1>
          <p>{post.description}</p>
          <div className="article-byline">
            <div>
              <Brand wordmark={false} />
              <span>Hyperlight</span>
              <span className="byline-separator">/</span>
              <time dateTime={post.date}>{formatDate(post.date)}</time>
            </div>
            <ArticleControls />
          </div>
        </header>
        <div className="article-layout">
          <aside className="article-sidebar">
            <details open>
              <summary>On this page</summary>
              <nav aria-label="Table of contents">
                {post.headings
                  .filter((h) => h.level === 2)
                  .map((heading) => (
                    <a href={`#${heading.id}`} key={heading.id}>
                      {heading.text}
                    </a>
                  ))}
              </nav>
            </details>
            {project && (
              <Link
                href={`/projects/${project.slug}`}
                className="article-project-link"
              >
                <span>Meet the project</span>
                <span>
                  {project.name}
                  <ArrowUpRight size={15} />
                </span>
              </Link>
            )}
          </aside>
          <ArticleBody post={post} />
        </div>
      </article>
      <section className="related-writing" aria-labelledby="more-writing">
        <span className="eyebrow section-number">Keep reading</span>
        <h2 id="more-writing">More from the blog.</h2>
        <PostList posts={related} />
      </section>
    </main>
  );
}
