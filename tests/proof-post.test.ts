import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { getPost, getPosts } from "../lib/posts";
import { canonicalPostSlug } from "../lib/post-redirects";
import { runPostMdx } from "../lib/post-mdx";

test("Agentic Proof of Work replaces the old title and keeps its incoming URL", async () => {
  assert.equal(
    canonicalPostSlug("what-counts-as-done"),
    "agentic-proof-of-work",
  );
  const posts = getPosts({ now: new Date("2026-09-10T12:00:00Z") });
  assert.ok(posts.some((post) => post.slug === "agentic-proof-of-work"));
  assert.ok(!posts.some((post) => post.slug === "what-counts-as-done"));
  assert.ok(
    posts.some((post) => post.slug === "tools-that-make-the-work-clearer"),
  );
  const post = await getPost("agentic-proof-of-work");
  assert.ok(post);
  assert.equal(post.title, "Agentic Proof of Work");
  assert.equal(post.format, "mdx");
  assert.ok(post.headings.length >= 10);
  assert.deepEqual(post.headings.at(-1), {
    id: "heading-apply-it-to-your-workflow",
    text: "Apply it to your workflow",
    level: 2,
  });
});

test("proof article renders all nine registered illustrations with its concrete examples", async () => {
  const post = await getPost("agentic-proof-of-work");
  assert.ok(post);
  assert.equal(post.format, "mdx");
  if (post.format !== "mdx") return;
  const { default: Content } = await runPostMdx(post.code);
  const illustration = (name: string) =>
    function Illustration() {
      return createElement("figure", { "data-example": name });
    };
  const html = renderToStaticMarkup(
    createElement(Content, {
      components: {
        WorkOrder: illustration("work-order"),
        EvidenceCassette: illustration("evidence-cassette"),
        ValidationFixture: illustration("validation-fixture"),
        RecordReader: illustration("record-reader"),
        LedgerPlacement: illustration("ledger-placement"),
        LedgerShards: illustration("ledger-shards"),
        ReplicaFailover: illustration("replica-failover"),
        LatencyProbing: illustration("latency-probing"),
        LivenessGuard: illustration("liveness-guard"),
      },
    }),
  );
  assert.equal((html.match(/data-example=/g) ?? []).length, 9);
  for (const term of [
    "Claim C17",
    "artifact A",
    "artifact B",
    "DependsOn",
    "Incomplete",
    "Observe",
    "Ledger Sharding",
    "Global Distribution",
    "Failover and Recovery",
    "Apply it to your workflow",
  ])
    assert.ok(html.includes(term), `missing explanation: ${term}`);
  assert.ok(!html.includes("What counts as done?"));
  assert.ok(!html.includes("Introducing Focal"));
});
