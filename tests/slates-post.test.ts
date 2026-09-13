import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { getPost, getPosts } from "../lib/posts";
import { runPostMdx } from "../lib/post-mdx";

test("Slates follows the first two technical posts and compiles its fleet opener and eleven focused illustrations", async () => {
  const now = new Date("2026-09-12T12:00:00Z");
  assert.equal(getPosts({ now })[0].slug, "introducing-slates");
  const post = await getPost("introducing-slates", { now });
  assert.ok(post && post.format === "mdx");
  assert.equal(post.project, "slates");
  assert.equal(post.featured, true);
  assert.equal(post.category, "Engineering");
  for (const heading of [
    "Building on EdenFS",
    "File Names and Open Handles",
    "Storing and Writing File Content",
    "Memory Limits and Shared Content",
    "Adjusting Edit Positions",
    "Surviving Host and Region Loss",
    "Owner Failure and Recovery",
    "Network Transfers and Request Retries",
    "Combining Changes from Multiple Agents",
    "Resolving a Disk Conflict",
    "Putting Slates to Work",
  ]) {
    assert.ok(
      post.headings.some((h) => h.text === heading),
      heading,
    );
  }
  const names = [
    "SlatesOrbitalFleet",
    "SlatesNamespace",
    "SlatesWorkspace",
    "SlatesOperationMap",
    "SlatesMerge",
    "SlatesOwnership",
    "SlatesRecovery",
    "SlatesFleet",
    "SlatesAuthority",
    "SlatesTransport",
    "SlatesLanding",
    "SlatesConflictResolution",
  ];
  const { default: Content } = await runPostMdx(post.code);
  const components = Object.fromEntries(
    names.map((name) => [
      name,
      () => createElement("figure", { "data-example": name }),
    ]),
  );
  const html = renderToStaticMarkup(createElement(Content, { components }));
  for (const name of names)
    assert.equal(
      (html.match(new RegExp(`data-example="${name}"`, "g")) ?? []).length,
      1,
    );
  assert.equal((html.match(/data-example=/g) ?? []).length, names.length);
  assert.match(html, /WebP/);
  assert.match(html, /format=webp\\nquality=90\\ncache=off\\n/);
  assert.match(html, /Virginia needs two of its three eligible candidates/);
  assert.match(html, /Frankfurt needs two of its own three/);
  assert.doesNotMatch(
    html,
    /parser|in this (post|article)|we will (explore|examine)|we’ll (explore|examine)/i,
  );
  const source = readFileSync("content/posts/introducing-slates.mdx", "utf8");
  assert.ok(
    source.indexOf("<SlatesOrbitalFleet />") <
      source.indexOf("## Building on EdenFS"),
  );
  const links = Array.from(
    source.matchAll(
      /https:\/\/github\.com\/hyper-light\/slates\/blob\/([^\s#]+)/g,
    ),
    ([, path]) => path,
  );
  assert.ok(links.length > 40);
  assert.ok(
    links.every((link) =>
      link.startsWith("3aa6b85c155ba4269614b5e5d3c053e28dd3c787/"),
    ),
  );
  const walkthrough = source
    .split("## Combining Changes from Multiple Agents")[1]
    .split("## Putting Slates to Work")[0];
  assert.match(walkthrough, /if not result\["ok"\]/);
  assert.match(walkthrough, /await client\.changed_since\(green, base\)/);
  assert.match(walkthrough, /Tests must check.*this exact accepted version/);
  assert.equal(post.headings.at(-1)?.text, "Putting Slates to Work");
});

test("Slates narrative describes caller behavior rather than repository test coverage", () => {
  const source = readFileSync("content/posts/introducing-slates.mdx", "utf8");
  const narrative = source.split(/^\[architecture\]:/m)[0];
  assert.doesNotMatch(
    narrative,
    /\b(?:restart|reconstruction|forwarding|client retry|session) tests?\b/i,
  );
  assert.doesNotMatch(
    narrative,
    /\b(?:benchmark|measurement) (?:measured|recorded)|\b(?:median|p99|p999)\b/i,
  );
  // Agent-authored application checks are still part of the workflow.
  assert.match(narrative, /Tests must check.*this exact accepted version/);
});
