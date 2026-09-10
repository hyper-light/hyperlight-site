import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { formatDate, getPost, getPosts, getPostsByProject } from "../lib/posts";
import { validateSiteUrl } from "../lib/site";
import { createPost } from "../scripts/new-post";

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
  assert.doesNotMatch(post.html, /<script|<iframe|onerror|javascript:/);
  assert.match(post.html, /class="hljs language-typescript"/);
  assert.match(post.html, /class="hljs-keyword"/);
  assert.match(post.html, /<table>/);
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
