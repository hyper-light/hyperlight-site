import assert from "node:assert/strict";
import { test } from "node:test";
import { getPost, getPosts } from "../lib/posts";
import { canonicalPostSlug } from "../lib/post-redirects";
import { getProject } from "../lib/projects";

test("Hyperlight announcement replaces the rough article and retains its incoming URL", async () => {
  const slug = "announcing-hyperlight";
  assert.equal(canonicalPostSlug("tools-that-make-the-work-clearer"), slug);
  assert.equal(canonicalPostSlug(slug), slug);
  const options = { now: new Date("2026-09-10T12:00:00Z") };
  const posts = getPosts(options);
  assert.ok(posts.some((post) => post.slug === slug));
  assert.ok(
    !posts.some((post) => post.slug === "tools-that-make-the-work-clearer"),
  );
  const post = await getPost(slug, options);
  assert.ok(post);
  assert.equal(post.title, "Announcing Hyperlight");
  assert.equal(post.category, "Announcements");
  assert.equal(post.date, "2026-09-10");
  assert.equal(post.readingTime, "2 min read");
  assert.equal(post.project, undefined);
  assert.equal(post.format, "md");
  if (post.format !== "md") return;
  assert.deepEqual(
    post.headings.map((heading) => heading.text),
    ["The first projects", "Moving Forward"],
  );
  for (const project of ["vorpal", "hyperscale", "focal", "slates", "hecate"]) {
    assert.ok(getProject(project), `unknown announcement project: ${project}`);
    assert.ok(post.html.includes(`href="/projects/${project}"`));
  }
  assert.match(post.html, /href="\/blog\/introducing-vorpal"/);
  assert.ok(await getPost("introducing-vorpal", options));
  assert.doesNotMatch(post.html, /Give each question a home|visual language/);
});
