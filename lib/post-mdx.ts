import * as runtime from "react/jsx-runtime";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import rehypeHighlight from "rehype-highlight";
import type { Root as MarkdownRoot } from "mdast";
import type { Root } from "hast";
import { remarkReferenceNotes } from "./remark-reference-notes";

/** Components belong in our registry, not imports embedded in an article. */
function repositoryComponents() {
  return (tree: MarkdownRoot) => {
    for (const node of tree.children) {
      if ((node.type as string) === "mdxjsEsm") {
        throw new Error(
          "MDX posts cannot contain imports or exports. Register React components in components/article-components.tsx instead.",
        );
      }
    }
  };
}

// MDX is executable repository code, NOT sanitized user content. Only the local
// post loader calls this compiler; never connect it to a request body or URL.
export async function compilePostMdx(
  content: string,
  filename: string,
  prepareTree: (tree: Root) => void,
): Promise<string> {
  try {
    // MDX is ESM-only. Loading it here also keeps listings on the metadata path.
    const { compile } = await import("@mdx-js/mdx");
    const result = await compile(
      { value: content, path: filename },
      {
        format: "mdx",
        outputFormat: "function-body",
        development: false,
        remarkPlugins: [
          remarkGfm,
          repositoryComponents,
          [
            remarkReferenceNotes,
            {
              post:
                filename
                  .split(/[\\/]/)
                  .at(-1)
                  ?.replace(/\.mdx$/, "") ?? filename,
            },
          ],
        ],
        rehypePlugins: [
          [rehypeSlug, { prefix: "heading-" }],
          [rehypeHighlight, { detect: false, ignoreMissing: true }],
          () => prepareTree,
        ],
      },
    );
    return String(result);
  } catch (error) {
    throw new Error(
      `Invalid post "${filename}": ${error instanceof Error ? error.message : String(error)}`,
      { cause: error },
    );
  }
}

/** Runs only on the server; React handles the registered client boundaries. */
export async function runPostMdx(code: string) {
  const { run } = await import("@mdx-js/mdx");
  return run(code, runtime);
}
