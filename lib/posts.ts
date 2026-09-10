import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeSlug from "rehype-slug";
import rehypeHighlight from "rehype-highlight";
import rehypeStringify from "rehype-stringify";
import type { Element, Root, RootContent } from "hast";

export type PostSummary = {
  slug: string;
  title: string;
  description: string;
  date: string;
  category: string;
  project?: string;
  featured: boolean;
  readingTime: string;
};

export type PostHeading = { id: string; text: string; level: number };
export type Post = PostSummary & { html: string; headings: PostHeading[] };

export type PostOptions = {
  directory?: string;
  /** Publication is evaluated by UTC calendar date. */
  now?: Date;
};

type SourcePost = { summary: PostSummary; content: string; draft: boolean };
const safeSlug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function validSlug(value: string): boolean {
  return value.length <= 100 && safeSlug.test(value);
}

function invalid(filename: string, message: string): never {
  throw new Error(`Invalid post "${filename}": ${message}`);
}

function stringField(
  data: Record<string, unknown>,
  key: string,
  filename: string,
): string {
  const value = data[key];
  if (typeof value !== "string" || !value.trim()) {
    invalid(filename, `"${key}" must be a nonempty string.`);
  }
  return value.trim();
}

function booleanField(
  data: Record<string, unknown>,
  key: string,
  filename: string,
): boolean {
  const value = data[key];
  if (value === undefined) return false;
  if (typeof value !== "boolean")
    invalid(filename, `"${key}" must be true or false.`);
  return value;
}

function calendarDate(
  data: Record<string, unknown>,
  frontmatter: string,
  filename: string,
): string {
  // YAML parses an unquoted date as a Date, even when the source calendar date is
  // impossible (for example February 30). Keep its original spelling to validate it.
  const value =
    data.date instanceof Date
      ? frontmatter.match(
          /^date:[\t ]*(\d{4}-\d{2}-\d{2})[\t ]*(?:#.*)?\r?$/m,
        )?.[1]
      : data.date;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    invalid(filename, '"date" must be a calendar date in YYYY-MM-DD format.');
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (
    !Number.isFinite(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== value
  ) {
    invalid(filename, `"date" is not a valid calendar date: ${value}.`);
  }
  return value;
}

function readSource(directory: string, filename: string): SourcePost {
  const slug = filename.slice(0, -3);
  if (!validSlug(slug)) {
    invalid(
      filename,
      "use a lowercase kebab-case filename of at most 100 characters before .md.",
    );
  }

  const source = fs.readFileSync(path.join(directory, filename), "utf8");
  // Only YAML is supported. In particular, never pass gray-matter a ---js header,
  // which would select its executable JavaScript frontmatter engine.
  const frontmatter = source.match(
    /^---[\t ]*\r?\n([\s\S]*?)\r?\n---[\t ]*(?:\r?\n|$)/,
  );
  if (!frontmatter) {
    invalid(
      filename,
      "start with a YAML frontmatter block between two --- lines.",
    );
  }

  let parsed: ReturnType<typeof matter>;
  try {
    parsed = matter(source);
  } catch (error) {
    invalid(
      filename,
      `cannot parse YAML frontmatter: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  const data = parsed.data as Record<string, unknown>;
  if (data.slug !== undefined && data.slug !== slug) {
    invalid(filename, '"slug", when supplied, must match the filename.');
  }

  const project =
    data.project === undefined
      ? undefined
      : stringField(data, "project", filename);
  if (project !== undefined && !validSlug(project)) {
    invalid(filename, '"project" must be a lowercase kebab-case project slug.');
  }

  const words = parsed.content.match(/\S+/g)?.length ?? 0;
  return {
    summary: {
      slug,
      title: stringField(data, "title", filename),
      description: stringField(data, "description", filename),
      date: calendarDate(data, frontmatter[1], filename),
      category: stringField(data, "category", filename),
      ...(project === undefined ? {} : { project }),
      featured: booleanField(data, "featured", filename),
      readingTime: `${Math.max(1, Math.ceil(words / 220))} min read`,
    },
    draft: booleanField(data, "draft", filename),
    content: parsed.content,
  };
}

function publishedSources(options: PostOptions = {}): SourcePost[] {
  const directory =
    options.directory ?? path.join(process.cwd(), "content", "posts");
  const now = options.now ?? new Date();
  if (!Number.isFinite(now.getTime()))
    throw new Error("Post publication date must be valid.");
  const today = now.toISOString().slice(0, 10);
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(directory, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }

  return entries
    .filter((entry) => entry.name.endsWith(".md"))
    .map((entry) => {
      if (!entry.isFile())
        invalid(entry.name, "posts must be regular Markdown files.");
      return readSource(directory, entry.name);
    })
    .filter(({ summary, draft }) => !draft && summary.date <= today)
    .sort(
      (a, b) =>
        b.summary.date.localeCompare(a.summary.date) ||
        a.summary.slug.localeCompare(b.summary.slug),
    );
}

export function getPosts(options: PostOptions = {}): PostSummary[] {
  return publishedSources(options).map(({ summary }) => summary);
}

export function getPostsByProject(
  slug: string,
  options: PostOptions = {},
): PostSummary[] {
  return getPosts(options).filter((post) => post.project === slug);
}

function visitElements(
  node: Root | RootContent,
  visitor: (element: Element) => void,
): void {
  if (node.type === "element") visitor(node);
  if ("children" in node) {
    for (const child of node.children) visitElements(child, visitor);
  }
}

function textContent(node: RootContent): string {
  if (node.type === "text") return node.value;
  if (node.type === "element" && node.tagName === "img")
    return String(node.properties.alt ?? "");
  return "children" in node ? node.children.map(textContent).join("") : "";
}

const sanitizeSchema: typeof defaultSchema = {
  ...defaultSchema,
  // Source HTML is discarded by remark-rehype. The only IDs are generated by
  // trusted plugins with heading- / user-content- prefixes, preventing clobbering
  // without breaking the links between footnotes, their references, and headings.
  clobberPrefix: "",
  attributes: {
    ...defaultSchema.attributes,
    code: [["className", "hljs", /^language-[\w-]+$/]],
    span: [["className", /^hljs-[\w-]+$/, /^[\w-]+_$/]],
  },
};

export async function getPost(
  slug: string,
  options: PostOptions = {},
): Promise<Post | undefined> {
  if (!validSlug(slug)) return undefined;
  const source = publishedSources(options).find(
    (post) => post.summary.slug === slug,
  );
  if (!source) return undefined;

  const headings: PostHeading[] = [];
  const result = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeSlug, { prefix: "heading-" })
    .use(rehypeHighlight, { detect: false, ignoreMissing: true })
    .use(rehypeSanitize, sanitizeSchema)
    .use(() => (tree: Root) => {
      const identifiers = new Set<string>();
      visitElements(tree, (node) => {
        if (typeof node.properties.id === "string")
          identifiers.add(node.properties.id);
        if (
          /^h[1-6]$/.test(node.tagName) &&
          typeof node.properties.id === "string"
        ) {
          headings.push({
            id: node.properties.id,
            text: textContent(node),
            level: Number(node.tagName[1]),
          });
        }
      });
      visitElements(tree, (node) => {
        const href = node.properties.href;
        if (
          node.tagName !== "a" ||
          typeof href !== "string" ||
          !href.startsWith("#")
        )
          return;
        let target: string;
        try {
          target = decodeURIComponent(href.slice(1));
        } catch {
          return;
        }
        if (!identifiers.has(target) && identifiers.has(`heading-${target}`)) {
          node.properties.href = `#heading-${target}`;
        }
      });
    })
    .use(rehypeStringify)
    .process(source.content);

  return { ...source.summary, html: String(result), headings };
}

export function formatDate(date: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}
