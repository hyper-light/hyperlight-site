import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { slug } from "github-slugger";
import { projects } from "../lib/projects";

interface AuditedDocument {
  revision: string;
  lineCount: number | null;
  contentSha256: string | null;
  anchors: Record<string, { kind: "lines" | "heading"; heading?: string }>;
}

const audit: { documents: Record<string, AuditedDocument> } = JSON.parse(
  readFileSync("tests/fixtures/blog-source-targets.json", "utf8"),
);

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = join(directory, entry.name);
    return entry.isDirectory()
      ? sourceFiles(file)
      : /\.(md|mdx|ts|tsx)$/.test(entry.name)
        ? [file]
        : [];
  });
}

const postFiles = sourceFiles("content/posts");
const captionFiles = [
  ...sourceFiles("components/slates"),
  ...sourceFiles("components/proof-work"),
  ...readdirSync("components")
    .filter((name) => /^vorpal.*\.(ts|tsx)$/.test(name))
    .map((name) => join("components", name)),
];

test("blog source URLs retain the audited public revision and exact section", () => {
  // Deliberately offline: this fixture records a separately performed public HTTP
  // and pinned-content audit. A new source/fragment needs review, not live-network CI.
  let targets = 0;
  for (const file of [...postFiles, ...captionFiles]) {
    const source = readFileSync(file, "utf8");
    for (const match of source.matchAll(
      /https:\/\/github\.com\/(?:hyper-light\/(?:slates|focal|vorpal|hecate)|facebook\/sapling)\/blob\/[^\s<>"'`\)\]}]+/g,
    )) {
      const url = new URL(match[0].replace(/[.,;]+$/, ""));
      const document = audit.documents[url.pathname.slice(1)];
      assert.ok(
        document,
        `${file}: source needs a public-content audit: ${url}`,
      );
      assert.equal(url.username + url.password + url.search, "");
      if (url.pathname.startsWith("/hyper-light/slates/"))
        assert.equal(
          document.revision,
          "3aa6b85c155ba4269614b5e5d3c053e28dd3c787",
        );
      if (document.revision !== "main") {
        assert.match(document.revision, /^[0-9a-f]{40}$/);
        assert.match(document.contentSha256 ?? "", /^[0-9a-f]{64}$/);
      }
      const fragment = decodeURIComponent(url.hash.slice(1));
      if (fragment) {
        const anchor = document.anchors[fragment];
        assert.ok(anchor, `${file}: fragment needs review: ${url}`);
        if (anchor.kind === "heading") {
          assert.equal(slug(anchor.heading ?? ""), fragment);
        } else {
          const range = /^L(\d+)(?:-L(\d+))?$/.exec(fragment);
          assert.ok(range);
          const start = Number(range[1]);
          const end = Number(range[2] ?? range[1]);
          assert.ok(start >= 1 && start <= end);
          assert.ok(document.lineCount && end <= document.lineCount);
        }
      }
      targets++;
    }
  }
  assert.ok(
    targets > 100,
    "audit includes article definitions and figure sources",
  );
});

test("announcement and article cross-links name real project and blog pages", () => {
  const routes = new Set([
    "/projects",
    ...projects.map((project) => `/projects/${project.slug}`),
    ...postFiles.map(
      (file) =>
        `/blog/${file
          .split("/")
          .at(-1)
          ?.replace(/\.mdx?$/, "")}`,
    ),
  ]);
  for (const file of postFiles) {
    for (const match of readFileSync(file, "utf8").matchAll(
      /\]\((\/[^)\s#]+)\)/g,
    ))
      assert.ok(
        routes.has(match[1]),
        `${file}: unknown internal target ${match[1]}`,
      );
  }
});
