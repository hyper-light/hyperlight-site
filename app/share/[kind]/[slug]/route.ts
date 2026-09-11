import { getPosts } from "@/lib/posts";
import { getProject, projects } from "@/lib/projects";
import { renderShareImage } from "@/lib/share-image";

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return [
    ...getPosts().map(({ slug }) => ({ kind: "blog", slug })),
    ...projects.map(({ slug }) => ({ kind: "project", slug })),
  ];
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ kind: string; slug: string }> },
) {
  const { kind, slug } = await params;
  const content =
    kind === "blog"
      ? getPosts().find((post) => post.slug === slug)
      : kind === "project"
        ? getProject(slug)
        : undefined;
  if (!content) return new Response("Not found", { status: 404 });
  return renderShareImage({
    title: "title" in content ? content.title : content.name,
    description: content.description,
    label: kind === "blog" ? "Blog" : "Project",
  });
}
