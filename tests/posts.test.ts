import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { formatDate, getPost, getPosts, getPostsByProject } from "../lib/posts";
import { runPostMdx } from "../lib/post-mdx";
import { validateSiteUrl } from "../lib/site";
import { createPost } from "../scripts/new-post";
import { getArticleVisual } from "../lib/article-visuals";
import { canonicalPostSlug } from "../lib/post-redirects";

const now = new Date("2026-09-10T12:00:00Z");

function fixture() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "hyperlight-posts-"));
  return {
    directory,
    now,
    write(filename: string, extra = "", content = "A useful idea.") {
      fs.writeFileSync(
        path.join(directory, filename),
        `---\ntitle: "A useful idea"\ndescription: "A short description."\ndate: "2026-09-09"\ncategory: "Engineering"\n${extra}---\n\n${content}\n`,
      );
    },
    cleanup() {
      fs.rmSync(directory, { recursive: true, force: true });
    },
  };
}

test("published posts are sorted, project-filtered, and exclude drafts and future dates", async (t) => {
  const posts = fixture();
  t.after(posts.cleanup);
  posts.write("older.md", "project: vorpal\nfeatured: true\n");
  fs.writeFileSync(
    path.join(posts.directory, "today.md"),
    `---\ntitle: Today\ndescription: Shipping today\ndate: 2026-09-10\ncategory: Notes\nproject: vorpal\n---\n\n${"word ".repeat(441)}`,
  );
  posts.write("draft.md", "draft: true\n");
  fs.writeFileSync(
    path.join(posts.directory, "future.md"),
    "---\ntitle: Future\ndescription: Later\ndate: 2026-09-11\ncategory: Notes\n---\n\nLater.",
  );
  posts.write("other.md", "project: veil\n");

  assert.deepEqual(
    getPosts(posts).map((post) => post.slug),
    ["today", "older", "other"],
  );
  assert.deepEqual(
    getPostsByProject("vorpal", posts).map((post) => post.slug),
    ["today", "older"],
  );
  assert.equal(getPosts(posts)[0].readingTime, "3 min read");
  assert.equal(getPosts(posts)[1].featured, true);
  assert.equal(getPosts(posts)[2].featured, false);
  assert.equal(await getPost("draft", posts), undefined);
  assert.equal(await getPost("future", posts), undefined);
  assert.equal(await getPost("missing", posts), undefined);
  assert.equal(formatDate("2026-09-10"), "September 10, 2026");
});

test("same-day order is explicit, defaults to zero, and never overrides publication dates", (t) => {
  const posts = fixture();
  t.after(posts.cleanup);
  posts.write("z-first.md", "order: -1\n");
  posts.write("a-last.md", "order: 1\n");
  posts.write("b-default.md");
  posts.write("c-default.mdx");
  posts.write("d-zero.md", "order: 0\n");
  fs.writeFileSync(
    path.join(posts.directory, "newer.md"),
    '---\ntitle: Newer\ndescription: Newest by date\ndate: "2026-09-10"\ncategory: Notes\norder: 100\n---\nNewer.\n',
  );
  fs.writeFileSync(
    path.join(posts.directory, "older.md"),
    '---\ntitle: Older\ndescription: Oldest by date\ndate: "2026-09-08"\ncategory: Notes\norder: -100\n---\nOlder.\n',
  );
  assert.deepEqual(
    getPosts(posts).map((post) => post.slug),
    ["newer", "z-first", "b-default", "c-default", "d-zero", "a-last", "older"],
  );
});

test("frontmatter validation rejects impossible dates and wrong metadata with the filename", (t) => {
  const posts = fixture();
  t.after(posts.cleanup);
  const cases = [
    ['date: "2026-02-30"', /valid calendar date/],
    ["date: 2026-02-30", /valid calendar date/],
    ["date: 2026-13-01", /calendar date/],
    ["date: 2026-9-1", /YYYY-MM-DD/],
    ["date: 2026-09-10T12:00:00Z", /YYYY-MM-DD/],
    ['featured: "false"', /featured.*true or false/],
    ["draft: yes", /draft.*true or false/],
    ["description: ''", /description.*nonempty string/],
    ["title: 42", /title.*nonempty string/],
    ["project: '../private'", /project.*kebab-case/],
    ['order: "1"', /order.*safe integer/],
    ["order: 0.5", /order.*safe integer/],
    ["order: null", /order.*safe integer/],
    ["order: true", /order.*safe integer/],
    ["order: .inf", /order.*safe integer/],
    ["order: .nan", /order.*safe integer/],
    ["order: 9007199254740992", /order.*safe integer/],
  ] as const;

  for (const [replacement, expected] of cases) {
    posts.write("invalid.md");
    const file = path.join(posts.directory, "invalid.md");
    const key = replacement.split(":")[0];
    const original = fs.readFileSync(file, "utf8");
    const field = new RegExp(`^${key}:.*$`, "m");
    fs.writeFileSync(
      file,
      field.test(original)
        ? original.replace(field, replacement)
        : original.replace(
            'category: "Engineering"',
            `category: "Engineering"\n${replacement}`,
          ),
    );
    assert.throws(
      () => getPosts(posts),
      (error: unknown) => {
        assert.ok(error instanceof Error);
        assert.match(error.message, /invalid\.md/);
        assert.match(error.message, expected);
        return true;
      },
    );
  }
});

test("dates accept leap days and Windows line endings", (t) => {
  const posts = fixture();
  t.after(posts.cleanup);
  posts.write("leap-day.md");
  const file = path.join(posts.directory, "leap-day.md");
  fs.writeFileSync(
    file,
    fs
      .readFileSync(file, "utf8")
      .replace('"2026-09-09"', "2024-02-29")
      .replace(/\n/g, "\r\n"),
  );
  assert.equal(getPosts(posts)[0].date, "2024-02-29");
});

test("slugs cannot escape the content directory or disagree with filenames", async (t) => {
  const posts = fixture();
  t.after(posts.cleanup);
  posts.write("valid.md", "slug: elsewhere\n");
  assert.throws(() => getPosts(posts), /valid\.md.*slug.*match the filename/);
  assert.equal(await getPost("../valid", posts), undefined);
  assert.equal(await getPost("%2e%2e%2fvalid", posts), undefined);
  assert.equal(await getPost("/etc/passwd", posts), undefined);
  fs.unlinkSync(path.join(posts.directory, "valid.md"));
  posts.write("Uppercase.md");
  assert.throws(() => getPosts(posts), /Uppercase\.md.*kebab-case/);
});

test("non-YAML frontmatter cannot select an executable parser", (t) => {
  const posts = fixture();
  t.after(posts.cleanup);
  fs.writeFileSync(
    path.join(posts.directory, "unsafe.md"),
    '---js\nthrow new Error("executed")\n---\nHello',
  );
  assert.throws(() => getPosts(posts), /unsafe\.md.*YAML frontmatter/);
});

test("rendering sanitizes HTML and unsafe URLs while preserving code, tables, and working anchors", async (t) => {
  const posts = fixture();
  t.after(posts.cleanup);
  posts.write(
    "rendering.md",
    "",
    [
      "## Hello, world",
      "[Jump](#hello-world)",
      "## Hello, world",
      "[Second](#hello-world-1)",
      "## location",
      "[Bad](javascript:alert%281%29) ![Bad image](javascript:alert%281%29)",
      '<script>alert("unsafe")</script>',
      '<img src="x" onerror="alert(1)">',
      '<iframe src="https://example.com"></iframe>',
      "```typescript\nconst answer = 42;\n```",
      "```imaginary-language\nsome source\n```",
      "| Name | Value |\n| --- | --- |\n| Answer | 42 |",
      "A footnote.[^one]\n\n[^one]: Further detail.",
    ].join("\n\n"),
  );

  const post = await getPost("rendering", posts);
  assert.ok(post);
  assert.equal(post.format, "md");
  if (post.format !== "md") return;
  assert.doesNotMatch(post.html, /<script|<iframe|onerror|javascript:/);
  assert.match(post.html, /class="hljs language-typescript"/);
  assert.match(post.html, /class="hljs-keyword"/);
  assert.match(post.html, /<pre tabindex="0">/);
  assert.match(
    post.html,
    /class="article-table-scroll"[^>]*tabindex="0"[^>]*role="region"[^>]*><table>/,
  );
  assert.match(post.html, /id="heading-location"/);
  assert.match(post.html, /href="#heading-hello-world"/);
  assert.match(post.html, /href="#heading-hello-world-1"/);
  assert.deepEqual(post.headings.slice(0, 3), [
    { id: "heading-hello-world", text: "Hello, world", level: 2 },
    { id: "heading-hello-world-1", text: "Hello, world", level: 2 },
    { id: "heading-location", text: "location", level: 2 },
  ]);
  // Every internal link must still resolve after sanitization, including GFM footnotes.
  for (const match of post.html.matchAll(/href="#([^"]+)"/g)) {
    assert.ok(
      post.html.includes(`id="${match[1]}"`),
      `Missing destination for ${match[1]}`,
    );
  }
});

test("post creation defaults to drafts and never overwrites existing files", (t) => {
  const posts = fixture();
  t.after(posts.cleanup);
  const first = createPost('Café: "A useful idea"', posts);
  const original = fs.readFileSync(first.filePath, "utf8");
  const second = createPost('Café: "A useful idea"', posts);
  assert.equal(first.slug, "cafe-a-useful-idea");
  assert.equal(second.slug, "cafe-a-useful-idea-2");
  assert.equal(fs.readFileSync(first.filePath, "utf8"), original);
  assert.deepEqual(getPosts(posts), []);
  fs.writeFileSync(
    first.filePath,
    original.replace("draft: true", "draft: false"),
  );
  assert.equal(getPosts(posts)[0].title, 'Café: "A useful idea"');
  assert.equal(getPosts(posts)[0].date, "2026-09-10");
  assert.throws(() => createPost("   ", posts), /Provide a title/);
});

test("MDX drafts can be created without colliding with Markdown slugs", (t) => {
  const posts = fixture();
  t.after(posts.cleanup);
  posts.write("new-idea.md");
  const mdx = createPost("New idea", { ...posts, format: "mdx" });
  assert.equal(mdx.slug, "new-idea-2");
  assert.equal(path.extname(mdx.filePath), ".mdx");
  assert.match(fs.readFileSync(mdx.filePath, "utf8"), /draft: true/);
  const markdown = createPost("New idea", posts);
  assert.equal(markdown.slug, "new-idea-3");
  assert.deepEqual(
    getPosts(posts).map((post) => post.slug),
    ["new-idea"],
  );
});

test("canonical configuration only accepts a secure origin or local development URL", () => {
  assert.equal(
    validateSiteUrl("https://hyperlight.example/"),
    "https://hyperlight.example",
  );
  assert.equal(
    validateSiteUrl("http://localhost:3000"),
    "http://localhost:3000",
  );
  for (const value of [
    "javascript:alert(1)",
    "/relative",
    "https://user:pass@example.com",
    "https://example.com/posts",
    "https://example.com/?q=1",
    "https://example.com/#top",
    "http://example.com",
  ]) {
    assert.throws(() => validateSiteUrl(value), /NEXT_PUBLIC_SITE_URL/);
  }
});

test("article figures use only standalone allowlisted Markdown images and preserve static HTML", async (t) => {
  const posts = fixture();
  t.after(posts.cleanup);
  posts.write(
    "illustrated.md",
    "",
    [
      "## Before",
      "[After](#after)",
      "![Files → graph & queries](/illustrations/vorpal-architecture.svg)",
      "## After",
      "![Unknown](/illustrations/unregistered.svg)",
      "Inline ![Not a figure](/illustrations/vorpal-architecture.svg) text.",
      "[![Linked image](/illustrations/vorpal-architecture.svg)](https://example.com)",
      '<script>alert("bad")</script>',
    ].join("\n\n"),
  );
  const post = await getPost("illustrated", posts);
  assert.ok(post);
  assert.equal(post.format, "md");
  if (post.format !== "md") return;
  assert.deepEqual(
    post.blocks.map((block) => block.kind),
    ["html", "visual", "html"],
  );
  assert.deepEqual(post.blocks[1], {
    kind: "visual",
    visual: "vorpal-architecture",
    alt: "Files → graph & queries",
  });
  assert.match(
    post.html,
    /<img src="\/illustrations\/vorpal-architecture.svg"/,
  );
  assert.match(
    post.blocks[0].kind === "html" ? post.blocks[0].html : "",
    /href="#heading-after"/,
  );
  const ending = post.blocks[2];
  assert.equal(ending.kind, "html");
  if (ending.kind !== "html") return;
  assert.match(ending.html, /id="heading-after"/);
  assert.match(ending.html, /unregistered.svg/);
  assert.match(ending.html, /Inline <img/);
  assert.doesNotMatch(ending.html, /<script/);
  for (const invalid of [
    "__proto__",
    "constructor",
    "toString",
    null,
    "/illustrations/vorpal-architecture.svg?x",
    "https://example.com/illustrations/vorpal-architecture.svg",
  ]) {
    assert.equal(getArticleVisual(invalid), undefined);
  }
});

test("ordinary posts keep their sanitized HTML unchanged in a single block", async (t) => {
  const posts = fixture();
  t.after(posts.cleanup);
  posts.write(
    "ordinary.md",
    "",
    "## Heading\n\nA paragraph.\n\n```sh\nvorpal index .\n```",
  );
  const post = await getPost("ordinary", posts);
  assert.ok(post);
  assert.equal(post.format, "md");
  if (post.format !== "md") return;
  assert.deepEqual(post.blocks, [{ kind: "html", html: post.html }]);
});

test("Introducing Vorpal replaces the old listing and preserves its incoming URL mapping", async () => {
  assert.equal(
    canonicalPostSlug("a-codebase-is-more-than-text"),
    "introducing-vorpal",
  );
  assert.equal(canonicalPostSlug("introducing-vorpal"), "introducing-vorpal");
  assert.equal(canonicalPostSlug("constructor"), "constructor");
  const posts = getPosts({ now });
  assert.ok(posts.some((post) => post.slug === "introducing-vorpal"));
  assert.ok(
    !posts.some((post) => post.slug === "a-codebase-is-more-than-text"),
  );
  const post = await getPost("introducing-vorpal", { now });
  assert.ok(post);
  assert.equal(post.title, "Introducing Vorpal");
  assert.equal(post.project, "vorpal");
  assert.equal(post.format, "mdx");
  if (post.format !== "mdx") return;
  const { default: Content } = await runPostMdx(post.code);
  const html = renderToStaticMarkup(
    createElement(Content, {
      components: {
        VorpalArchitecture: ({ description }: { description: string }) =>
          createElement("figure", { "data-architecture": true }, description),
        VorpalBenchmarks: () =>
          createElement("figure", { "data-benchmarks": true }),
        VorpalEmbeddings: () =>
          createElement("figure", { "data-embeddings": true }),
        VorpalRanking: () => createElement("figure", { "data-ranking": true }),
        VorpalComparisons: ({ kind }: { kind: string }) =>
          createElement("figure", { "data-comparisons": kind }),
        VorpalFootprint: () =>
          createElement("figure", { "data-footprint": true }),
        VorpalTgrep: () => createElement("figure", { "data-tgrep": true }),
      },
    }),
  );
  assert.match(html, /releases\/latest\/download\/vorpal-macos-arm64/);
  assert.doesNotMatch(html, /npm install/);
  assert.equal((html.match(/data-architecture=/g) ?? []).length, 1);
  assert.match(html, /data-comparisons="agents"/);
  assert.match(html, /data-comparisons="retrieval"/);
  assert.equal((html.match(/data-footprint=/g) ?? []).length, 1);
  assert.equal((html.match(/data-tgrep=/g) ?? []).length, 1);
  assert.match(html, /--selector call_expression/);
  assert.match(html, /296 s/);
  assert.match(html, /NDCG@10/);
  assert.doesNotMatch(html, /\b(envelope|substrate)\b/i);
  for (const match of html.matchAll(/href="#([^"]+)"/g)) {
    assert.ok(html.includes(`id="${match[1]}"`));
  }
});

test("MDX renders real React components and expressions while retaining Markdown features", async (t) => {
  const posts = fixture();
  t.after(posts.cleanup);
  posts.write(
    "react-article.mdx",
    "project: vorpal\n",
    [
      "## A useful heading",
      "[Jump](#a-useful-heading) and [Second](#a-useful-heading-1).",
      '<VorpalArchitecture description="Parse → resolve → query" />',
      "The result is **{6 * 7}**.",
      "## A useful heading",
      "```typescript\nconst answer = 42;\n```",
      "| Tool | Result |\n| --- | --- |\n| Vorpal | Found |",
      "A footnote.[^one]\n\n[^one]: Further detail.",
      "![An ordinary image](/illustrations/vorpal-architecture.svg)",
    ].join("\n\n"),
  );
  const post = await getPost("react-article", posts);
  assert.ok(post);
  assert.equal(post.format, "mdx");
  if (post.format !== "mdx") return;
  const { default: Content } = await runPostMdx(post.code);
  let componentCalls = 0;
  const html = renderToStaticMarkup(
    createElement(Content, {
      components: {
        VorpalArchitecture: ({ description }: { description: string }) => {
          componentCalls++;
          return createElement(
            "figure",
            { "data-react-component": true },
            description,
          );
        },
      },
    }),
  );
  assert.equal(componentCalls, 1);
  assert.match(
    html,
    /<figure data-react-component="true">Parse → resolve → query<\/figure>/,
  );
  assert.match(html, /<strong>42<\/strong>/);
  assert.match(html, /<pre tabindex="0">/);
  assert.match(html, /class="hljs-keyword"/);
  assert.match(
    html,
    /class="article-table-scroll"[^>]*tabindex="0"[^>]*role="region"[^>]*><table>/,
  );
  assert.match(html, /<img src="\/illustrations\/vorpal-architecture.svg"/);
  assert.deepEqual(post.headings.slice(0, 2), [
    { id: "heading-a-useful-heading", text: "A useful heading", level: 2 },
    { id: "heading-a-useful-heading-1", text: "A useful heading", level: 2 },
  ]);
  for (const match of html.matchAll(/href="#([^"]+)"/g)) {
    assert.ok(
      html.includes(`id="${match[1]}"`),
      `Missing destination for ${match[1]}`,
    );
  }
});

test("Markdown and MDX share publication rules, project links, and slug validation", async (t) => {
  const posts = fixture();
  t.after(posts.cleanup);
  posts.write("ordinary.md", "project: vorpal\n");
  posts.write("interactive.mdx", "project: vorpal\n");
  posts.write("draft.mdx", "draft: true\n", "<Invalid unfinished MDX");
  posts.write("future.mdx");
  const future = path.join(posts.directory, "future.mdx");
  fs.writeFileSync(
    future,
    fs.readFileSync(future, "utf8").replace("2026-09-09", "2026-09-11"),
  );
  assert.deepEqual(
    getPostsByProject("vorpal", posts).map((post) => post.slug),
    ["interactive", "ordinary"],
  );
  assert.equal(await getPost("draft", posts), undefined);
  assert.equal(await getPost("future", posts), undefined);
  assert.equal(await getPost("../interactive", posts), undefined);
  posts.write("bad.mdx", "slug: other\n");
  assert.throws(() => getPosts(posts), /bad\.mdx.*slug.*match the filename/);
});

test("duplicate Markdown and MDX slugs fail even if one file is a draft", (t) => {
  const posts = fixture();
  t.after(posts.cleanup);
  posts.write("same.md");
  posts.write("same.mdx", "draft: true\n");
  assert.throws(() => getPosts(posts), /same\.(md|mdx).*duplicate slug/);
});

test("MDX is restricted to local regular post files, with clear compile and component errors", async (t) => {
  const posts = fixture();
  t.after(posts.cleanup);
  for (const content of [
    'import Example from "https://example.com/remote.js"\n\n<Example />',
    'export const title = "Not frontmatter"',
  ]) {
    posts.write("imports.mdx", "", content);
    await assert.rejects(
      getPost("imports", posts),
      /imports\.mdx.*cannot contain imports or exports/,
    );
  }
  fs.unlinkSync(path.join(posts.directory, "imports.mdx"));
  posts.write("invalid.mdx", "", "<Unclosed>");
  await assert.rejects(
    getPost("invalid", posts),
    /Invalid post "invalid\.mdx"/,
  );
  posts.write("invalid.mdx", "", "<UnregisteredComponent />");
  const post = await getPost("invalid", posts);
  assert.ok(post?.format === "mdx");
  const { default: Content } = await runPostMdx(post.code);
  assert.throws(
    () => renderToStaticMarkup(createElement(Content)),
    /UnregisteredComponent/,
  );
  fs.symlinkSync(
    path.join(posts.directory, "invalid.mdx"),
    path.join(posts.directory, "linked.mdx"),
  );
  assert.throws(
    () => getPosts(posts),
    /linked\.mdx.*regular Markdown or MDX files/,
  );
});
