import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("all article tables fill their content width without overflowing the page", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/blog/introducing-vorpal");
  await page.locator("#article-body details").evaluateAll((details) => {
    for (const element of details) (element as HTMLDetailsElement).open = true;
  });
  for (const width of testInfo.project.name.includes("mobile")
    ? [320, 390]
    : [1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const tables = await page
      .locator("#article-body table")
      .evaluateAll((nodes) =>
        nodes.map((table) => {
          const parent = table.parentElement!;
          const style = getComputedStyle(parent);
          return {
            heading: table.querySelector("th")?.textContent,
            width: table.getBoundingClientRect().width,
            available:
              parent.clientWidth -
              parseFloat(style.paddingLeft) -
              parseFloat(style.paddingRight),
            display: getComputedStyle(table).display,
          };
        }),
      );
    expect(tables.length).toBeGreaterThanOrEqual(12);
    for (const table of tables) {
      expect(table.display, table.heading ?? "table").toBe("table");
      expect(table.width, table.heading ?? "table").toBeGreaterThanOrEqual(
        table.available - 1,
      );
    }
    for (const region of await page.locator("[data-article-table]").all()) {
      await expect(region).toHaveAttribute("tabindex", "0");
      await expect(region).toHaveAttribute("role", "region");
      expect(await region.getAttribute("aria-label")).toMatch(/^Table:/);
      expect(
        await region.evaluate((element) => getComputedStyle(element).overflowX),
      ).toBe("auto");
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  const firstTable = page.locator("[data-article-table]").first();
  await firstTable.scrollIntoViewIfNeeded();
  await firstTable.screenshot({
    path: testInfo.outputPath("full-width-table.png"),
  });
});

test("Vorpal article, old URL, contents, and responsive architecture work together", async ({
  page,
  request,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const response = await page.goto("/blog/a-codebase-is-more-than-text");
  expect(response?.status()).toBe(200);
  await expect(page).toHaveURL(/\/blog\/introducing-vorpal$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Introducing Vorpal" }),
  ).toBeVisible();
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    /\/blog\/introducing-vorpal$/,
  );
  await expect(page.locator("#article-body")).toContainText("37× faster");
  await expect(page.locator("#article-body")).not.toContainText("envelope");
  await expect(page.locator("[data-vorpal-benchmarks]")).toHaveCount(1);
  await expect(page.locator('[data-vorpal-comparisons="agents"]')).toHaveCount(
    1,
  );
  await expect(
    page.locator('[data-vorpal-comparisons="retrieval"]'),
  ).toHaveCount(1);
  await expect(page.locator("[data-vorpal-footprint]")).toHaveCount(1);
  expect(
    await page.locator("#article-body table").count(),
  ).toBeGreaterThanOrEqual(12);
  await page.screenshot({ path: testInfo.outputPath("article-top.png") });

  const contents = page.getByRole("navigation", { name: "Table of contents" });
  for (const link of await contents.getByRole("link").all()) {
    const target = await link.getAttribute("href");
    expect(target).toMatch(/^#heading-/);
    await expect(page.locator(target!)).toHaveCount(1);
  }
  const figure = page.locator(
    "#article-body figure:has([data-architecture-flow])",
  );
  await figure.scrollIntoViewIfNeeded();
  await expect(figure).toBeVisible();
  await expect(
    figure.locator("svg[data-architecture-flow]:visible"),
  ).toHaveCount(1);
  await figure.screenshot({ path: testInfo.outputPath("architecture.png") });
  const widths = testInfo.project.name.includes("mobile")
    ? [320, 390]
    : [1024, 1440];
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      )
      .toBe(true);
    await expect(
      figure.locator("svg[data-architecture-flow]:visible"),
    ).toHaveCount(1);
  }

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

  const feed = await request.get("/feed.xml");
  expect(await feed.text()).toContain("Introducing Vorpal");
  expect(await feed.text()).not.toContain("/blog/a-codebase-is-more-than-text");
  const sitemap = await request.get("/sitemap.xml");
  expect(await sitemap.text()).toContain("/blog/introducing-vorpal");
  const fallback = await request.get("/illustrations/vorpal-architecture.svg");
  expect(fallback.ok()).toBe(true);
  expect(fallback.headers()["content-type"]).toContain("image/svg+xml");
});

test("architecture starts in view, animates its colors, and obeys pause and reduced motion", async ({
  page,
}) => {
  await page.goto("/blog/introducing-vorpal");
  const figure = page.locator(
    "#article-body figure:has([data-architecture-flow])",
  );
  const svg = figure.locator("svg[data-architecture-flow]:visible");
  await figure.scrollIntoViewIfNeeded();
  const fingerprint = () => svg.evaluate((element) => element.innerHTML);
  const initial = await fingerprint();
  await expect.poll(fingerprint).not.toBe(initial);
  const gradient = svg.locator("[data-architecture-prism]");
  const color = await gradient.getAttribute("x1");
  await expect.poll(() => gradient.getAttribute("x1")).not.toBe(color);

  await figure
    .getByRole("button", { name: "Pause architecture animation" })
    .click();
  await expect(page.locator("html")).toHaveAttribute("data-motion", "paused");
  const paused = await fingerprint();
  await page.waitForTimeout(250);
  expect(await fingerprint()).toBe(paused);
  await figure
    .getByRole("button", { name: "Resume architecture animation" })
    .click();
  await expect.poll(fingerprint).not.toBe(paused);

  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.waitForTimeout(150);
  const hidden = await fingerprint();
  await page.waitForTimeout(250);
  expect(await fingerprint()).toBe(hidden);
  await figure.scrollIntoViewIfNeeded();
  await expect.poll(fingerprint).not.toBe(hidden);

  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator("html")).toHaveAttribute("data-motion", "paused");
  const reduced = await fingerprint();
  await page.waitForTimeout(250);
  expect(await fingerprint()).toBe(reduced);
  await expect(
    figure.getByRole("button", { name: "Architecture follows reduced motion" }),
  ).toBeDisabled();
});

test("MDX benchmark figure renders accurate values and obeys motion controls", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const response = await page.goto("/blog/introducing-vorpal");
  expect(response?.status()).toBe(200);
  const figure = page.locator("[data-vorpal-benchmarks]");
  await figure.scrollIntoViewIfNeeded();
  await expect(figure).toBeVisible();
  const pair = figure.locator('[data-benchmark-corpus="kernel"]');
  await pair.scrollIntoViewIfNeeded();
  await expect(pair).toContainText("8.1");
  await expect(pair).toContainText("296");
  const chart = pair.locator("[data-benchmark-chart]");
  const bar = chart.locator('[data-benchmark-bar="vorpal"]');
  const baseline = chart.locator('[data-benchmark-bar="cbm"]');
  const target = Number(await bar.getAttribute("data-benchmark-width"));
  await expect
    .poll(async () => Number(await bar.getAttribute("width")))
    .toBeCloseTo(target, 2);
  // SVG widths round to .01px, so compare linear width at that precision.
  expect(target).toBeCloseTo(
    (8.1 / 296) * Number(await baseline.getAttribute("data-benchmark-width")),
    2,
  );
  const gradient = chart.locator("[data-benchmark-prism]");
  const before = await gradient.getAttribute("x1");
  await expect.poll(() => gradient.getAttribute("x1")).not.toBe(before);
  await figure.screenshot({ path: testInfo.outputPath("benchmarks.png") });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator("html")).toHaveAttribute("data-motion", "paused");
  const reduced = await chart.evaluate((element) => element.innerHTML);
  await page.waitForTimeout(200);
  expect(await chart.evaluate((element) => element.innerHTML)).toBe(reduced);
  expect(errors).toEqual([]);
});

test("embedding modes morph with stable geometry and respect every motion preference", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  const response = await page.goto("/blog/introducing-vorpal");
  expect(response?.status()).toBe(200);
  const figure = page.locator("[data-vorpal-embeddings]");
  const scene = figure.locator("[data-embedding-scene]:visible");
  await scene.scrollIntoViewIfNeeded();
  await expect(scene).toHaveCount(1);
  await expect(scene.locator("[data-embedding-cell]")).toHaveCount(256);
  const count = await scene.locator("*").count();
  const fingerprint = () => scene.evaluate((element) => element.innerHTML);
  const initial = await fingerprint();
  await expect.poll(fingerprint).not.toBe(initial);
  const firstSurface = scene.locator("[data-embedding-surface]").first();
  const shape = await firstSurface.getAttribute("d");
  await expect.poll(() => firstSurface.getAttribute("d")).not.toBe(shape);
  for (const [index, mode] of ["Lexical", "Learned", "Neural"].entries()) {
    await figure.getByRole("tab", { name: mode, exact: true }).click();
    await scene.scrollIntoViewIfNeeded();
    await expect
      .poll(async () =>
        Number(
          (await scene.getAttribute("data-embedding-mix"))?.split(",")[index],
        ),
      )
      .toBeGreaterThan(0.95);
    expect(await scene.locator("*").count()).toBe(count);
    expect(await fingerprint()).not.toMatch(/NaN|Infinity/);
    await scene.screenshot({
      path: testInfo.outputPath(`embedding-${mode.toLowerCase()}.png`),
    });
    const pairsMatch = await scene.evaluate((svg) => {
      for (const kind of ["flow", "outgoing"]) {
        const paths = [...svg.querySelectorAll(`[data-embedding-${kind}]`)];
        for (let i = 0; i < paths.length; i += 2)
          if (paths[i].getAttribute("d") !== paths[i + 1].getAttribute("d"))
            return false;
      }
      return true;
    });
    expect(pairsMatch).toBe(true);
    const joinGap = await scene.evaluate((svg) => {
      const inputs = [
        ...svg.querySelectorAll<SVGPathElement>("[data-embedding-input]"),
      ];
      const flows = [
        ...svg.querySelectorAll<SVGPathElement>(
          "[data-embedding-flow]:not([data-energy])",
        ),
      ];
      return Math.max(
        ...flows.map((flow, i) => {
          const input = inputs[Math.floor(i / 2)];
          const end = input.getPointAtLength(input.getTotalLength());
          const start = flow.getPointAtLength(0);
          return Math.hypot(end.x - start.x, end.y - start.y);
        }),
      );
    });
    expect(joinGap).toBeLessThan(0.02);
  }
  await figure
    .getByRole("button", { name: "Pause embedding animation", exact: true })
    .click();
  await expect(page.locator("html")).toHaveAttribute("data-motion", "paused");
  await figure.getByRole("tab", { name: "Learned", exact: true }).click();
  await expect(scene).toHaveAttribute(
    "data-embedding-mix",
    "0.000,1.000,0.000",
  );
  const stopped = await fingerprint();
  await page.waitForTimeout(200);
  expect(await fingerprint()).toBe(stopped);
  await figure
    .getByRole("tab", { name: "Learned", exact: true })
    .press("ArrowRight");
  await expect(
    figure.getByRole("tab", { name: "Neural", exact: true }),
  ).toBeFocused();
  await expect(scene).toHaveAttribute(
    "data-embedding-mix",
    "0.000,0.000,1.000",
  );
  await figure
    .getByRole("button", { name: "Resume embedding animation", exact: true })
    .click();
  await scene.scrollIntoViewIfNeeded();
  const resumed = await fingerprint();
  await expect.poll(fingerprint).not.toBe(resumed);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.waitForTimeout(150);
  const hidden = await fingerprint();
  await page.waitForTimeout(200);
  expect(await fingerprint()).toBe(hidden);
  await scene.scrollIntoViewIfNeeded();
  await expect.poll(fingerprint).not.toBe(hidden);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(
    figure.getByRole("button", { name: "Embeddings follow reduced motion" }),
  ).toBeDisabled();
  await figure.getByRole("tab", { name: "Lexical", exact: true }).click();
  await expect(scene).toHaveAttribute(
    "data-embedding-mix",
    "1.000,0.000,0.000",
  );
  const reduced = await fingerprint();
  await page.waitForTimeout(200);
  expect(await fingerprint()).toBe(reduced);
  expect(errors).toEqual([]);
});
