import assert from "node:assert/strict";
import { test } from "node:test";
import { getProject, projects } from "../lib/projects";
import { studies } from "../lib/studies";

const newProjects = [
  ["hex", "Hex"],
  ["shards", "Shards"],
  ["athame", "Athame"],
  ["reliquary", "Reliquary"],
  ["hoard", "Hoard"],
  ["quiver", "Quiver"],
  ["clarion", "Clarion"],
] as const;

test("the catalog includes every newly requested project with its source and honest stage", () => {
  for (const [slug, name] of newProjects) {
    const project = getProject(slug);
    assert.ok(project, `${name} must be included`);
    assert.equal(project.name, name);
    assert.equal(project.repository, `https://github.com/hyper-light/${slug}`);
    assert.equal(
      project.status,
      "In design",
      `${name} has no implementation yet`,
    );
    assert.equal(project.language, null, `${name} has no established language`);
    assert.ok(
      project.description.trim(),
      `${name} needs a useful introduction`,
    );
    assert.ok(
      project.overview.length > 0,
      `${name} needs a detail-page overview`,
    );
  }
});

test("project and study catalogs exclude every Sylk variant and explicitly excluded repositories", () => {
  for (const project of projects) {
    assert.doesNotMatch(
      `${project.slug} ${project.name} ${project.repository}`,
      /sylk/i,
    );
    assert.ok(!["cocoa", "mkfst-py", "hyperlight-site"].includes(project.slug));
  }
  for (const study of studies) {
    assert.doesNotMatch(`${study.id} ${study.name}`, /sylk/i);
    assert.ok(!["cocoa", "mkfst-py", "hyperlight-site"].includes(study.id));
  }
});

test("every project has exactly one identifiable study and a unique route", () => {
  const slugs = projects.map((project) => project.slug);
  const studyIds = studies.map((study) => study.id);
  assert.equal(
    new Set(slugs).size,
    projects.length,
    "Project routes must be unique",
  );
  assert.equal(
    new Set(studyIds).size,
    studies.length,
    "Study IDs must be unique",
  );
  assert.equal(studies[0].id, "hyperlight");
  assert.deepEqual(
    studyIds.filter((id) => id !== "hyperlight").toSorted(),
    slugs.toSorted(),
    "Each project must appear in the gallery exactly once",
  );
  for (const study of studies) {
    assert.ok(study.title.trim());
    assert.ok(study.description.trim());
    if (study.id !== "hyperlight") {
      assert.equal(getProject(study.id)?.name, study.name);
    }
  }
});

test("existing projects remain available alongside the new inventory", () => {
  for (const slug of [
    "vorpal",
    "focal",
    "slates",
    "hecate",
    "veil",
    "mantle",
    "hyperscale",
  ]) {
    assert.ok(getProject(slug), `${slug} should retain its route`);
  }
  assert.equal(getProject("not-a-project"), undefined);
});
