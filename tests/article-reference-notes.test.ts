import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import type { Root, RootContent } from "hast";
import { referenceNote, referenceNoteIds } from "../lib/reference-notes";
import { compilePostMdx } from "../lib/post-mdx";
import { slatesReferenceVariants } from "../lib/slates-reference-notes";

async function authoredReferences(source: string, post: string) {
  const references: { id: string; context: string }[] = [];
  await compilePostMdx(
    source.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, ""),
    post + ".mdx",
    (tree) => {
      function visit(node: Root | RootContent) {
        if (node.type === "element" && node.tagName === "a") {
          const id = node.properties["data-reference"];
          const context = node.properties["data-reference-context"];
          if (typeof id === "string" && typeof context === "string")
            references.push({ id, context });
        }
        if ("children" in node) for (const child of node.children) visit(child);
      }
      visit(tree);
    },
  );
  return references;
}

test("curated reference identities and real destinations survive MDX link resolution", async () => {
  const code = await compilePostMdx(
    "[Directory structures][vfs]\n\n[vfs]: https://example.com/source",
    "introducing-slates.mdx",
    () => {},
  );
  assert.match(code, /data-reference/);
  assert.match(code, /introducing-slates:vfs/);
  assert.match(code, /https:\/\/example.com\/source/);
  const unknown = await compilePostMdx(
    "[Unknown][unknown]\n\n[unknown]: https://example.com/source",
    "introducing-slates.mdx",
    () => {},
  );
  assert.doesNotMatch(unknown, /data-reference/);
});

test("curated explanations cover technical references in all three articles", async () => {
  const navigation = new Set(["repo", "releases"]);
  for (const post of [
    "introducing-slates",
    "agentic-proof-of-work",
    "introducing-vorpal",
  ]) {
    const source = await readFile(`content/posts/${post}.mdx`, "utf8");
    for (const [, id] of source.matchAll(/^\[([^\]]+)\]: https:/gm)) {
      if (navigation.has(id)) continue;
      const note = referenceNote(`${post}:${id}`);
      assert.ok(note, `${post}:${id}`);
      assert.ok(note.explanation.length > 60, id);
      assert.ok(note.title.length < 65, id);
    }
  }
  assert.equal(referenceNoteIds.length, new Set(referenceNoteIds).size);
});

test("different source links have distinct, pertinent explanations, including reused documents", async () => {
  for (const post of [
    "introducing-slates",
    "agentic-proof-of-work",
    "introducing-vorpal",
  ]) {
    const source = await readFile(`content/posts/${post}.mdx`, "utf8");
    const explanations = new Map<string, string>();
    const references = await authoredReferences(source, post);
    assert.ok(references.length > 20);
    for (const { id, context } of references) {
      const note = referenceNote(id, context);
      assert.ok(note, id + ":" + context);
      const key = `${id}:${context}`;
      const previous = explanations.get(note.explanation);
      assert.ok(
        !previous || previous === key,
        `${post}: ${key} duplicates ${previous}`,
      );
      explanations.set(note.explanation, key);
      if (
        post === "introducing-slates" &&
        references.some((other) => other.id === id && other.context !== context)
      )
        assert.ok(
          slatesReferenceVariants[key],
          key +
            " needs an explicit contextual explanation, not a generic fallback",
        );
    }
  }
  const logical = referenceNote(
    "introducing-slates:accounting",
    "Per-volume accounting.",
  )!;
  const physical = referenceNote(
    "introducing-slates:memory",
    "Shared content and physical admission.",
  )!;
  assert.match(logical.explanation, /counter|unique/);
  assert.match(physical.explanation, /physical|admission/);
  assert.notEqual(logical.explanation, physical.explanation);
});

test("authored link context survives compilation independently of its destination", async () => {
  const code = await compilePostMdx(
    "[Directory structures and algorithms.][vfs]\n\n[vfs]: https://example.com/source",
    "introducing-slates.mdx",
    () => {},
  );
  assert.match(code, /data-reference-context/);
  assert.match(code, /Directory structures and algorithms/);
  const structure = referenceNote(
    "introducing-slates:vfs",
    "Directory structures and algorithms.",
  )!;
  const inode = referenceNote("introducing-slates:vfs", "Inode numbering")!;
  assert.notEqual(structure.explanation, inode.explanation);
  const inline = await authoredReferences(
    "An edit at `[8, 10)` changes the file. Read [**extents**][vfs] or [Slates reports `BaseDrift`][vfs].\n\n[vfs]: https://example.com/source",
    "introducing-slates",
  );
  assert.deepEqual(inline, [
    { id: "introducing-slates:vfs", context: "extents" },
    { id: "introducing-slates:vfs", context: "Slates reports BaseDrift" },
  ]);
  const extents = referenceNote(inline[0].id, inline[0].context)!;
  const drift = referenceNote(inline[1].id, inline[1].context)!;
  assert.match(extents.explanation, /extents.*offsets/);
  assert.match(drift.explanation, /BaseDrift/);
  assert.notEqual(extents.explanation, drift.explanation);
});

test("benchmark explanations retain their measurements, conditions and limits", () => {
  const snapshot = referenceNote("introducing-slates:vfs-bench")!;
  const provisioning = referenceNote("introducing-slates:provision-bench")!;
  for (const note of [snapshot, provisioning]) {
    assert.match(note.explanation, /2026-09-05/);
    assert.match(note.explanation, /release build/);
    assert.match(note.explanation, /18-core Apple M5 Max/);
    assert.match(note.explanation, /128 GiB/);
    assert.match(note.explanation, /macOS 26\.4\.1/);
    assert.match(note.explanation, /Rust 1\.98\.0/);
    assert.match(note.explanation, /mount/);
    assert.match(note.explanation, /agent launch|launching an agent/);
  }
  assert.match(snapshot.explanation, /untouched clone/);
  assert.match(snapshot.explanation, /500 ms/);
  assert.match(snapshot.explanation, /95% bootstrap/);
  assert.match(snapshot.explanation, /attachment-barrier cache flush/);
  assert.match(snapshot.explanation, /host-directory capture/);
  assert.match(snapshot.example ?? "", /45 \/ 44 \/ 45 ns/);
  assert.match(snapshot.example ?? "", /265 \/ 260 \/ 244 ns/);
  assert.match(provisioning.explanation, /one spinning Rust client/);
  assert.match(provisioning.explanation, /real rendezvous/);
  assert.match(provisioning.explanation, /in-process daemon/);
  assert.match(
    provisioning.explanation,
    /9 µs median, 25 µs p99 and 31 µs p999/,
  );
  assert.match(
    provisioning.explanation,
    /Eight spinning clients.*34–45 µs p99/,
  );
  assert.match(provisioning.explanation, /oversubscribing.*latency/);
  assert.match(provisioning.explanation, /not include.*populating/);
  assert.match(provisioning.example ?? "", /--example provision_bench/);
});
