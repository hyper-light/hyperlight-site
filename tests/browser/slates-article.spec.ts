import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const figures = [
  "slates-orbital-fleet",
  "slates-namespace",
  "slates-workspace",
  "slates-operation-map",
  "slates-merge",
  "slates-ownership",
  "slates-recovery",
  "slates-fleet",
  "slates-authority",
  "slates-transport",
  "slates-landing",
  "slates-conflict-resolution",
];

test("Slates publishes with its fleet opener, eleven focused figures and navigable contents", async ({
  page,
  request,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const response = await page.goto("/blog/introducing-slates");
  expect(response?.status()).toBe(200);
  await expect(
    page.getByRole("heading", { level: 1, name: "Introducing Slates" }),
  ).toBeVisible();
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    /\/blog\/introducing-slates$/,
  );
  await expect(page.locator("[data-proof-figure]")).toHaveCount(figures.length);
  for (const id of figures)
    await expect(page.locator(`[data-proof-figure="${id}"]`)).toHaveCount(1);
  const contents = page.getByRole("navigation", { name: "Table of contents" });
  expect(await contents.getByRole("link").count()).toBeGreaterThanOrEqual(20);
  for (const link of await contents.getByRole("link").all()) {
    const href = await link.getAttribute("href");
    expect(href).toMatch(/^#heading-/);
    await expect(page.locator(href!)).toHaveCount(1);
  }
  expect(
    await page
      .locator('#article-body a[href*="github.com/hyper-light/slates/blob/"]')
      .count(),
  ).toBeGreaterThan(40);
  expect(await (await request.get("/feed.xml")).text()).toContain(
    "Introducing Slates",
  );
  expect(await (await request.get("/sitemap.xml")).text()).toContain(
    "/blog/introducing-slates",
  );
  const accessibility = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    accessibility.violations.map(({ id, nodes }) => ({
      id,
      targets: nodes.map(({ target }) => target),
    })),
  ).toEqual([]);
  expect(errors).toEqual([]);
});

test("all Slates illustrations keep labels clear at every responsive stage", async ({
  page,
}, testInfo) => {
  test.setTimeout(180_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/blog/introducing-slates");
  await page.evaluate(() => document.fonts.ready);
  const widths = testInfo.project.name.includes("mobile")
    ? [320, 390, 700]
    : [1024, 1440];
  for (const width of widths) {
    await page.setViewportSize({ width, height: 1000 });
    for (const id of figures) {
      const figure = page.locator(`[data-proof-figure="${id}"]`);
      const svg = figure.locator("[data-proof-scene]:visible");
      await expect(svg).toHaveCount(1);
      const variants =
        id === "slates-landing"
          ? ["clean", "drift"]
          : id === "slates-merge"
            ? ["disjoint", "identical", "conflict"]
            : id === "slates-conflict-resolution"
              ? [
                  "agent:unchanged",
                  "agent:changed",
                  "human:unchanged",
                  "human:changed",
                ]
              : ["default"];
      for (const variant of variants) {
        if (id === "slates-conflict-resolution") {
          const [author, disk] = variant.split(":");
          await figure.getByRole("combobox").nth(0).selectOption(author);
          await figure.getByRole("combobox").nth(1).selectOption(disk);
        } else if (variant !== "default")
          await figure.getByRole("combobox").selectOption(variant);
        const tabs = figure.getByRole("tab");
        for (let stage = 0; stage < (await tabs.count()); stage++) {
          await tabs.nth(stage).click();
          await expect(svg).toHaveAttribute(
            "data-proof-selection",
            stage.toFixed(3),
          );
          const problems = await svg.evaluate((element) => {
            const scene = element as SVGSVGElement;
            const vb = scene.viewBox.baseVal;
            const labels = Array.from(
              scene.querySelectorAll<SVGTextElement>("[data-proof-label]"),
            )
              .filter(
                (label) =>
                  Number(label.getAttribute("opacity")) > 0.1 &&
                  label.textContent?.trim(),
              )
              .map((label) => {
                const bounds = label.getBBox();
                const matrix = scene
                  .getScreenCTM()!
                  .inverse()
                  .multiply(label.getScreenCTM()!);
                const corners = [
                  [bounds.x, bounds.y],
                  [bounds.x + bounds.width, bounds.y],
                  [bounds.x + bounds.width, bounds.y + bounds.height],
                  [bounds.x, bounds.y + bounds.height],
                ].map(([x, y]) => new DOMPoint(x, y).matrixTransform(matrix));
                const x = Math.min(...corners.map((p) => p.x)),
                  y = Math.min(...corners.map((p) => p.y));
                return {
                  id: label.dataset.proofLabel,
                  corners,
                  box: {
                    x,
                    y,
                    width: Math.max(...corners.map((p) => p.x)) - x,
                    height: Math.max(...corners.map((p) => p.y)) - y,
                  },
                };
              });
            const issues: string[] = [];
            for (let i = 0; i < labels.length; i++) {
              const a = labels[i].box;
              if (
                a.x < 4 ||
                a.y < 4 ||
                a.x + a.width > vb.width - 4 ||
                a.y + a.height > vb.height - 4
              )
                issues.push(`${labels[i].id}: outside canvas`);
              for (let j = i + 1; j < labels.length; j++) {
                const b = labels[j].box;
                // These separately animated runs form the single expression
                // quality=80 (or quality=90), not two independent captions.
                const joinedCode =
                  [labels[i].id, labels[j].id].includes("quality-code") &&
                  [labels[i].id, labels[j].id].some(
                    (id) =>
                      id === "current-old-byte" || id === "replacement-byte",
                  );
                const gutter = joinedCode ? 0 : 2;
                if (
                  a.x < b.x + b.width + 2 &&
                  a.x + a.width + 2 > b.x &&
                  a.y < b.y + b.height + 2 &&
                  a.y + a.height + 2 > b.y &&
                  ![labels[i].corners, labels[j].corners].some((polygon) =>
                    polygon.some((point, edge) => {
                      const next = polygon[(edge + 1) % polygon.length];
                      const length = Math.hypot(
                        next.x - point.x,
                        next.y - point.y,
                      );
                      const nx = -(next.y - point.y) / length;
                      const ny = (next.x - point.x) / length;
                      const project = (corners: DOMPoint[]) =>
                        corners.map((p) => p.x * nx + p.y * ny);
                      const first = project(labels[i].corners);
                      const second = project(labels[j].corners);
                      return (
                        Math.max(...first) + gutter <= Math.min(...second) ||
                        Math.max(...second) + gutter <= Math.min(...first)
                      );
                    }),
                  )
                )
                  issues.push(`${labels[i].id} overlaps ${labels[j].id}`);
              }
            }
            return issues;
          });
          // Report every stage's layout failures in one run instead of hiding
          // later collisions behind the first narrow-screen failure.
          expect
            .soft(problems, `${width}/${id}/${variant}/${stage}`)
            .toEqual([]);
          if (width === 390 || width === 1440) {
            await svg.screenshot({
              path: testInfo.outputPath(
                `${id}-${variant}-${stage}-${width}.png`,
              ),
            });
          }
        }
      }
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
});

test("conflict-resolution display text keeps eight units of native glyph padding", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/blog/introducing-slates");
  await page.evaluate(() => document.fonts.ready);
  const figure = page.locator(
    '[data-proof-figure="slates-conflict-resolution"]',
  );
  const svg = figure.locator("[data-proof-scene]:visible");
  const surfaces = [
    "agent1-tower-integrated-display",
    "agent2-tower-integrated-display",
    "owner-controller-display",
    "owner-drive-display",
  ];
  for (const author of ["agent", "human"]) {
    for (const recheck of ["unchanged", "changed"]) {
      await figure.getByRole("combobox").nth(0).selectOption(author);
      await figure.getByRole("combobox").nth(1).selectOption(recheck);
      const tabs = figure.getByRole("tab");
      await expect(tabs).toHaveCount(8);
      for (let stage = 0; stage < 8; stage++) {
        await tabs.nth(stage).click();
        await expect(svg).toHaveAttribute(
          "data-proof-selection",
          stage.toFixed(3),
        );
        const measurements = await svg.evaluate((element, surfaceIds) => {
          const scene = element as SVGSVGElement;
          const inverse = scene.getScreenCTM()!.inverse();
          return Array.from(
            scene.querySelectorAll<SVGTextElement>("[data-proof-label]"),
          )
            .filter(
              (label) =>
                Number(label.getAttribute("opacity")) > 0.1 &&
                label.textContent?.trim() &&
                surfaceIds.includes(label.dataset.proofSurface ?? ""),
            )
            .map((label) => {
              const surfaceId = label.dataset.proofSurface!;
              const surface = scene.querySelector<SVGPathElement>(
                `[data-proof-path="${surfaceId}"]`,
              );
              if (!surface) throw new Error(`Missing display ${surfaceId}`);
              const bounds = label.getBBox();
              const textMatrix = inverse.multiply(label.getScreenCTM()!);
              const corners = [
                [bounds.x, bounds.y],
                [bounds.x + bounds.width, bounds.y],
                [bounds.x + bounds.width, bounds.y + bounds.height],
                [bounds.x, bounds.y + bounds.height],
              ].map(([x, y]) => new DOMPoint(x, y).matrixTransform(textMatrix));
              // The declared display faces are straight-sided polygons. Work
              // in scene units so CSS scaling cannot conceal tight padding.
              const coordinates = surface
                .getAttribute("d")!
                .match(/-?\d+(?:\.\d+)?/g)!
                .map(Number);
              const faceMatrix = inverse.multiply(surface.getScreenCTM()!);
              const polygon = Array.from(
                { length: coordinates.length / 2 },
                (_, i) =>
                  new DOMPoint(
                    coordinates[i * 2],
                    coordinates[i * 2 + 1],
                  ).matrixTransform(faceMatrix),
              );
              const winding = Math.sign(
                polygon.reduce((area, point, i) => {
                  const next = polygon[(i + 1) % polygon.length];
                  return area + point.x * next.y - next.x * point.y;
                }, 0),
              );
              const padding = polygon.map((point, i) => {
                const next = polygon[(i + 1) % polygon.length];
                const dx = next.x - point.x;
                const dy = next.y - point.y;
                return Math.min(
                  ...corners.map(
                    (corner) =>
                      (winding *
                        (dx * (corner.y - point.y) -
                          dy * (corner.x - point.x))) /
                      Math.hypot(dx, dy),
                  ),
                );
              });
              return {
                label: label.dataset.proofLabel,
                surface: surfaceId,
                padding,
              };
            });
        }, surfaces);
        // Guard against accidentally removing surface metadata to make this
        // regression pass without measuring the status and filename glyphs.
        expect(
          [...new Set(measurements.map((item) => item.surface))].sort(),
        ).toEqual([...surfaces].sort());
        expect(measurements.map((item) => item.label)).toEqual(
          expect.arrayContaining([
            "agent1-file",
            "agent1-status",
            "agent2-file",
            "agent2-status",
            "owner-task",
            "owner-verdict",
            "target-file-name",
            "target-file-kind",
          ]),
        );
        expect
          .soft(
            measurements.filter((item) =>
              item.padding.some((distance) => distance < 8 - 0.001),
            ),
            `${author}/${recheck}/${stage}: native display padding`,
          )
          .toEqual([]);
      }
    }
  }
});

test("landing refuses outside edits and stage navigation respects reduced motion", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/blog/introducing-slates");
  const figure = page.locator('[data-proof-figure="slates-landing"]');
  const svg = figure.locator("[data-proof-scene]:visible");
  await figure.getByRole("combobox").selectOption("drift");
  await figure.getByRole("tab", { name: "Land", exact: true }).click();
  await expect(svg.locator('[data-proof-label="land-result"]')).toHaveText(
    "REFUSED · OUTSIDE EDIT KEPT",
  );
  await expect(svg.locator('[data-proof-label="land-disk-bytes"]')).toHaveText(
    "DISK: 60",
  );
  await expect(
    svg.locator('[data-proof-path="land-entry-write"]'),
  ).toHaveAttribute("opacity", "0.000");
  await figure.getByRole("combobox").selectOption("clean");
  await expect(
    figure.getByRole("tab", { name: "Plan", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await figure
    .getByRole("tab", { name: "Plan", exact: true })
    .press("ArrowRight");
  await expect(
    figure.getByRole("tab", { name: "Grant", exact: true }),
  ).toBeFocused();
  await expect(svg).toHaveAttribute("data-proof-selection", "1.000");
  await figure.getByRole("tab", { name: "Land", exact: true }).click();
  await expect(svg.locator('[data-proof-label="land-disk-bytes"]')).toHaveText(
    "DISK: 90",
  );
});
