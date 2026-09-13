import type { Root, RootContent } from "mdast";
import { referenceNote } from "./reference-notes";

function textContent(node: Root | RootContent): string {
  if ("value" in node) return String(node.value);
  return "children" in node
    ? node.children.map((child) => textContent(child as RootContent)).join("")
    : "";
}

/** Keep the authored reference identity through MDX's link resolution. */
export function remarkReferenceNotes({ post }: { post: string }) {
  return (tree: Root) => {
    function visit(node: Root | RootContent) {
      if (node.type === "linkReference") {
        const id = `${post}:${node.identifier.toLowerCase()}`;
        const context = textContent(node).trim().replace(/\s+/g, " ");
        if (referenceNote(id, context)) {
          node.data = {
            ...node.data,
            hProperties: {
              ...node.data?.hProperties,
              "data-reference": id,
              "data-reference-context": context,
            },
          };
        }
      }
      if ("children" in node)
        for (const child of node.children) visit(child as RootContent);
    }
    visit(tree);
  };
}
