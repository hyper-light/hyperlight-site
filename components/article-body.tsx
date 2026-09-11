import "server-only";
import type { Post } from "@/lib/posts";
import { runPostMdx } from "@/lib/post-mdx";
import { VorpalArchitecture } from "@/components/vorpal-architecture";
import { articleComponents } from "@/components/article-components";

export async function ArticleBody({ post }: { post: Post }) {
  if (post.format === "mdx") {
    const { default: Content } = await runPostMdx(post.code);
    return (
      <div id="article-body" className="prose">
        <Content components={articleComponents} />
      </div>
    );
  }
  return (
    <div id="article-body" className="prose">
      {post.blocks.map((block, index) =>
        block.kind === "visual" ? (
          <VorpalArchitecture key={index} description={block.alt} />
        ) : (
          <div
            key={index}
            style={{ display: "contents" }}
            dangerouslySetInnerHTML={{ __html: block.html }}
          />
        ),
      )}
    </div>
  );
}
