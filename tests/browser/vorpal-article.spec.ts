import { test, expect, type Locator, type Page } from "@playwright/test";
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

test("GPU embedding modes retain stable hardware and respect every motion preference", async ({
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
  await expect(scene.locator("[data-embedding-gpu-board]")).toHaveCount(1);
  await expect(scene.locator("[data-embedding-gpu-package]")).toHaveCount(1);
  await expect(scene.locator("[data-embedding-word]")).toHaveText([
    "resolve",
    "import",
    "path",
  ]);
  const board = await scene
    .locator("[data-embedding-gpu-board]")
    .elementHandle();
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
    expect(await board!.evaluate((element) => element.isConnected)).toBe(true);
    expect(await fingerprint()).not.toMatch(/NaN|Infinity/);
    await expect(
      scene.locator('[data-embedding-path][data-kind="input"]'),
    ).toHaveCount(3);
    for (const kind of ["compute", "reduce", "output"])
      expect(
        await scene
          .locator(`[data-embedding-path][data-kind="${kind}"]`)
          .count(),
      ).toBeGreaterThan(0);
    await expect(
      scene.locator(
        "[data-embedding-ring], [data-embedding-input-skin], [data-embedding-output-skin]",
      ),
    ).toHaveCount(0);
    await scene.screenshot({
      path: testInfo.outputPath(`embedding-${mode.toLowerCase()}.png`),
    });
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

const embeddingHashes = [
  { token: "resolve", bucket: 163, sign: -1 },
  { token: "resolve", bucket: 144, sign: -1 },
  { token: "import", bucket: 244, sign: 1 },
  { token: "import", bucket: 82, sign: 1 },
  { token: "path", bucket: 118, sign: -1 },
  { token: "path", bucket: 1, sign: -1 },
];

async function openGpuEmbedding(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.clock.install();
  const response = await page.goto("/blog/introducing-vorpal");
  expect(response?.status()).toBe(200);
  await page.evaluate(() => document.fonts.ready);
  const figure = page.locator("[data-vorpal-embeddings]");
  const scene = figure.locator("[data-embedding-scene]:visible");
  await expect(scene).toHaveCount(1);
  await scene.scrollIntoViewIfNeeded();
  await page.clock.pauseAt(new Date(Date.now() + 100));
  return { figure, scene, errors };
}

const embeddingTime = async (scene: Locator) =>
  Number(await scene.getAttribute("data-embedding-time"));

const embeddingProcessTime = async (scene: Locator) =>
  Number(await scene.getAttribute("data-embedding-process-time"));

async function advanceEmbeddingTo(page: Page, scene: Locator, target: number) {
  const before = await embeddingProcessTime(scene);
  expect(before, `advance to ${target}s`).toBeLessThan(target);
  // Real IntersectionObserver delivery may occur after the mocked clock has
  // been installed; require one advancing paint before measuring the interval.
  await expect
    .poll(async () => {
      await page.clock.runFor(32);
      return embeddingProcessTime(scene);
    })
    .toBeGreaterThan(before);
  await page.clock.runFor(
    Math.max(
      0,
      Math.ceil((target - (await embeddingProcessTime(scene))) * 1000),
    ) + 32,
  );
}

async function activeEmbeddingSignals(scene: Locator) {
  return scene.evaluate((element) => {
    const paths = new Map(
      Array.from(
        element.querySelectorAll<SVGPathElement>("[data-embedding-path]"),
        (path) => [path.dataset.embeddingPath!, path] as const,
      ),
    );
    const trails = new Map(
      Array.from(
        element.querySelectorAll<SVGPathElement>("[data-embedding-trail]"),
        (trail) => [trail.dataset.embeddingTrail!, trail] as const,
      ),
    );
    return Array.from(
      element.querySelectorAll<SVGCircleElement>("[data-embedding-signal]"),
    )
      .filter((signal) => Number(signal.getAttribute("opacity")) > 0.01)
      .map((signal) => {
        const id = signal.dataset.embeddingSignal!;
        const path = paths.get(signal.dataset.pathId!)!;
        const trail = trails.get(id)!;
        const progress = Number(signal.dataset.progress);
        const point = path.getPointAtLength(path.getTotalLength() * progress);
        const x = signal.cx.baseVal.value,
          y = signal.cy.baseVal.value;
        return {
          id,
          kind: signal.dataset.kind,
          mode: path.dataset.mode,
          progress,
          x,
          y,
          distance: Math.hypot(point.x - x, point.y - y),
          trailMatches: trail.getAttribute("d") === path.getAttribute("d"),
          trailOpacity: Number(trail.getAttribute("opacity")),
          trailLength: Number(
            trail.getAttribute("stroke-dasharray")?.split(/[, ]/)[0],
          ),
        };
      });
  });
}

async function expectAttachedEmbeddingSignals(scene: Locator) {
  const signals = await activeEmbeddingSignals(scene);
  for (const signal of signals) {
    // Browser arc-length math and four-decimal progress can disagree by a
    // fraction of a pixel; they must still describe the same physical trace.
    expect(signal.distance, signal.id).toBeLessThan(0.1);
    expect(signal.progress, signal.id).toBeGreaterThan(0);
    expect(signal.progress, signal.id).toBeLessThan(1);
    expect(signal.trailMatches, signal.id).toBe(true);
    expect(signal.trailOpacity, signal.id).toBeGreaterThan(0.01);
    expect(signal.trailLength, signal.id).toBeGreaterThan(0);
    expect(signal.trailLength, signal.id).toBeLessThan(0.1);
  }
  return signals;
}

test("GPU embedding occupies the scene with readable hardware and exact lexical routes", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const { figure, scene, errors } = await openGpuEmbedding(page);
  await expect(scene.locator("[data-embedding-gpu-memory]")).toHaveCount(12);
  await expect(
    scene.locator('[data-embedding-label][data-kind="math"]'),
  ).toHaveCount(0);
  expect(
    await scene.locator("[data-embedding-gpu-contact]").count(),
  ).toBeGreaterThanOrEqual(20);
  const hashes = await scene
    .locator('[data-embedding-path][data-kind="compute"][data-bucket]')
    .evaluateAll((paths) =>
      paths.map((path) => ({
        token: path.getAttribute("data-token"),
        bucket: Number(path.getAttribute("data-bucket")),
        sign: Number(path.getAttribute("data-sign")),
      })),
    );
  expect(hashes).toEqual(embeddingHashes);
  const joins = await scene.evaluate((element) => {
    const routes = Array.from(
      element.querySelectorAll<SVGPathElement>("[data-embedding-path]"),
    );
    const contacts = Array.from(
      element.querySelectorAll<SVGPathElement>("[data-embedding-gpu-contact]"),
    );
    const failures: string[] = [];
    const endpoints = (route: SVGPathElement) => ({
      start: route.getPointAtLength(0),
      end: route.getPointAtLength(route.getTotalLength()),
    });
    const distance = (a: DOMPoint, b: { x: number; y: number }) =>
      Math.hypot(a.x - b.x, a.y - b.y);
    for (const route of routes.filter(
      (path) => path.dataset.kind === "input",
    )) {
      const { end } = endpoints(route);
      if (!contacts.some((contact) => contact.isPointInFill(end)))
        failures.push(
          `input misses a physical contact: ${route.dataset.token}`,
        );
    }
    for (const route of routes.filter(
      (path) =>
        path.dataset.kind === "compute" && path.hasAttribute("data-bucket"),
    )) {
      const { start, end } = endpoints(route);
      const input = routes.find(
        (path) =>
          path.dataset.kind === "input" &&
          path.dataset.token === route.dataset.token,
      )!;
      const cell = element.querySelector<SVGCircleElement>(
        `[data-embedding-cell="${route.dataset.bucket}"]`,
      )!;
      if (distance(start, endpoints(input).end) > 0.025)
        failures.push(
          `hash route does not start at its token contact: ${route.dataset.embeddingPath}`,
        );
      if (
        distance(end, { x: cell.cx.baseVal.value, y: cell.cy.baseVal.value }) >
        0.025
      )
        failures.push(
          `hash route does not reach its addressed cell: ${route.dataset.embeddingPath}`,
        );
    }
    return failures;
  });
  expect(joins).toEqual([]);
  for (const { token, bucket, sign } of embeddingHashes)
    await expect(
      figure.locator(
        '[aria-label="Actual signed hash buckets for the example query"]',
      ),
    ).toContainText(`${token} → [${bucket}] ${sign > 0 ? "+1" : "−1"}`);
  await expect(figure.locator("figcaption")).toContainText(
    "isn’t required for lexical hashing",
  );
  await expect(figure.locator("figcaption")).toContainText(
    "Learned and neural signals are illustrative",
  );
  await expect(figure.locator("figcaption")).toContainText(
    "not measured GPU utilization or model output",
  );
  await expect(figure.locator("figcaption")).not.toContainText("sphere");

  for (const width of testInfo.project.name.includes("mobile")
    ? [390, 320]
    : [1440, 768, 650]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const [index, mode] of ["Lexical", "Learned", "Neural"].entries()) {
      await figure.getByRole("tab", { name: mode, exact: true }).click();
      await expect(scene).toHaveCount(1);
      await expect(scene).toHaveAttribute(
        "data-embedding-mix",
        [0, 1, 2]
          .map((value) => (value === index ? "1.000" : "0.000"))
          .join(","),
      );
      const layout = await scene.evaluate((element) => {
        const svg = element as SVGSVGElement;
        const view = svg.viewBox.baseVal;
        const board = svg
          .querySelector<SVGPathElement>("[data-embedding-gpu-board]")!
          .getBBox();
        const labels = Array.from(
          svg.querySelectorAll<SVGTextElement>("[data-embedding-label]"),
        )
          .filter((label) => Number(label.getAttribute("opacity") ?? 1) > 0.01)
          .map((label) => {
            const box = label.getBBox();
            // Compare projected label bounds, including any local transform.
            const matrix = svg
              .getScreenCTM()!
              .inverse()
              .multiply(label.getScreenCTM()!);
            const corners = [
              [box.x, box.y],
              [box.x + box.width, box.y],
              [box.x + box.width, box.y + box.height],
              [box.x, box.y + box.height],
            ].map(([x, y]) => new DOMPoint(x, y).matrixTransform(matrix));
            const left = Math.min(...corners.map((point) => point.x));
            const top = Math.min(...corners.map((point) => point.y));
            return {
              text: label.textContent,
              box: {
                x: left,
                y: top,
                width: Math.max(...corners.map((point) => point.x)) - left,
                height: Math.max(...corners.map((point) => point.y)) - top,
              },
            };
          });
        const failures: string[] = [];
        for (const { text, box } of labels) {
          if (
            box.x < view.x + 2 ||
            box.y < view.y + 2 ||
            box.x + box.width > view.x + view.width - 2 ||
            box.y + box.height > view.y + view.height - 2
          )
            failures.push(`label outside viewport: ${text}`);
        }
        for (let i = 0; i < labels.length; i++)
          for (let j = i + 1; j < labels.length; j++) {
            const a = labels[i].box,
              b = labels[j].box;
            if (
              Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x) >
                0.5 &&
              Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y) >
                0.5
            )
              failures.push(
                `labels overlap: ${labels[i].text} / ${labels[j].text}`,
              );
          }
        const drawing = svg.getBBox();
        if (
          drawing.x < view.x - 1 ||
          drawing.y < view.y - 1 ||
          drawing.x + drawing.width > view.x + view.width + 1 ||
          drawing.y + drawing.height > view.y + view.height + 1
        )
          failures.push("geometry outside viewport");
        for (const cell of svg.querySelectorAll<SVGCircleElement>(
          "[data-embedding-cell]",
        )) {
          const x = cell.cx.baseVal.value,
            y = cell.cy.baseVal.value;
          if (
            x < board.x ||
            x > board.x + board.width ||
            y < board.y ||
            y > board.y + board.height
          )
            failures.push("die cell detached from GPU");
        }
        return {
          failures,
          widthRatio: board.width / view.width,
          heightRatio: board.height / view.height,
          portrait: svg.dataset.portrait === "true",
        };
      });
      expect(layout.failures, `${mode} at ${width}px`).toEqual([]);
      expect(
        layout.widthRatio,
        "GPU is the main object, not an inserted prop",
      ).toBeGreaterThan(0.55);
      expect(layout.heightRatio).toBeGreaterThan(layout.portrait ? 0.6 : 0.5);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      expect(
        await scene.evaluate((element) =>
          /NaN|Infinity/.test(element.innerHTML),
        ),
      ).toBe(false);
    }
    await scene.screenshot({
      path: testInfo.outputPath(`embedding-gpu-${width}.png`),
    });
  }
  expect(errors).toEqual([]);
});

test("GPU embedding receives tokens, writes the die, and only then emits a normalized vector", async ({
  page,
}, testInfo) => {
  const { scene, errors } = await openGpuEmbedding(page);
  const initialTime = await embeddingProcessTime(scene);
  const cycleStart = initialTime < 0.8 ? 0 : Math.ceil(initialTime / 8) * 8;
  const count = await scene.locator("*").count();
  const board = await scene
    .locator("[data-embedding-gpu-board]")
    .elementHandle();
  await advanceEmbeddingTo(page, scene, cycleStart + 1);
  await expect(scene).toHaveAttribute("data-embedding-phase", "receive");
  const incoming = await expectAttachedEmbeddingSignals(scene);
  expect(incoming).toHaveLength(3);
  expect([...new Set(incoming.map((signal) => signal.kind))]).toEqual([
    "input",
  ]);
  const tracked = incoming.find(
    (signal) => signal.progress > 0.2 && signal.progress < 0.8,
  )!;
  expect(tracked).toBeDefined();
  await advanceEmbeddingTo(page, scene, cycleStart + 1.15);
  const moved = (await expectAttachedEmbeddingSignals(scene)).find(
    (signal) => signal.id === tracked.id,
  )!;
  expect(moved).toBeDefined();
  expect(moved.progress).toBeGreaterThan(tracked.progress);
  expect(Math.hypot(moved.x - tracked.x, moved.y - tracked.y)).toBeGreaterThan(
    2,
  );

  for (const [time, stage, kind] of [
    [3, "process", "compute"],
    [5.4, "process", "reduce"],
    [6.8, "emit", "output"],
  ] as const) {
    await advanceEmbeddingTo(page, scene, cycleStart + time);
    await expect(scene).toHaveAttribute("data-embedding-phase", stage);
    const active = await expectAttachedEmbeddingSignals(scene);
    expect(
      active.length,
      `${kind} has substantive visible packets`,
    ).toBeGreaterThan(0);
    expect([...new Set(active.map((signal) => signal.kind))]).toEqual([kind]);
    expect(await scene.locator("*").count()).toBe(count);
    expect(await board!.evaluate((element) => element.isConnected)).toBe(true);
    await scene.screenshot({
      path: testInfo.outputPath(`embedding-${kind}-phase.png`),
    });
  }
  // Signals disappear before their route resets, not after teleporting back
  // through the finished calculation. The next cycle begins with input only.
  for (const time of [7.9, 8.05]) {
    await advanceEmbeddingTo(page, scene, cycleStart + time);
    expect(await activeEmbeddingSignals(scene)).toEqual([]);
  }
  await advanceEmbeddingTo(page, scene, cycleStart + 9);
  await expect(scene).toHaveAttribute("data-embedding-phase", "receive");
  expect([
    ...new Set(
      (await expectAttachedEmbeddingSignals(scene)).map(
        (signal) => signal.kind,
      ),
    ),
  ]).toEqual(["input"]);
  expect(errors).toEqual([]);
});

test("GPU embedding mode changes restart distinct computations without replacing the GPU", async ({
  page,
}, testInfo) => {
  const { figure, scene, errors } = await openGpuEmbedding(page);
  const count = await scene.locator("*").count();
  const boardHandle = await scene
    .locator("[data-embedding-gpu-board]")
    .elementHandle();
  const densities: number[] = [];
  for (const [index, mode] of ["Lexical", "Learned", "Neural"].entries()) {
    const board = await scene
      .locator("[data-embedding-gpu-board]")
      .getAttribute("d");
    const poseTime = await embeddingTime(scene);
    await figure.getByRole("tab", { name: mode, exact: true }).click();
    // Selecting a mode restarts the computation, not the physical board pose.
    expect(await embeddingTime(scene)).toBe(poseTime);
    await expect(scene.locator("[data-embedding-gpu-board]")).toHaveAttribute(
      "d",
      board!,
    );
    await page.clock.runFor(48);
    if (index > 0) expect(await embeddingProcessTime(scene)).toBeLessThan(0.1);
    const processTime = await embeddingProcessTime(scene);
    const cycleStart = processTime < 2.8 ? 0 : Math.ceil(processTime / 8) * 8;
    for (const [offset, families] of [
      [3, ["compute-", "learned-read-", "neural-entry-"]],
      [4.3, ["compute-", "learned-pool-", "neural-"]],
    ] as const) {
      await advanceEmbeddingTo(page, scene, cycleStart + offset);
      await expect(scene).toHaveAttribute("data-embedding-phase", "process");
      const signals = await expectAttachedEmbeddingSignals(scene);
      expect(
        signals.length,
        `${mode} has a visible operation at ${offset}s`,
      ).toBeGreaterThan(0);
      expect(
        signals.every((signal) => signal.mode === mode.toLowerCase()),
      ).toBe(true);
      expect(
        signals.every((signal) => signal.id.startsWith(families[index])),
      ).toBe(true);
      const activeRoutes = await scene
        .locator("[data-embedding-path]")
        .evaluateAll((paths) =>
          paths
            .filter((path) => Number(path.getAttribute("data-activity")) > 0.01)
            .map((path) => ({
              mode: path.getAttribute("data-mode"),
              length: (path as SVGPathElement).getTotalLength(),
            })),
        );
      expect(activeRoutes.length).toBeGreaterThan(0);
      expect(
        activeRoutes.every(
          (route) => route.mode === mode.toLowerCase() && route.length > 20,
        ),
      ).toBe(true);
      expect(await scene.locator("*").count()).toBe(count);
      expect(
        await boardHandle!.evaluate((element) => element.isConnected),
      ).toBe(true);
    }
    await advanceEmbeddingTo(page, scene, cycleStart + 5.4);
    const work = await scene
      .locator("[data-embedding-cell]")
      .evaluateAll((cells) =>
        cells
          .filter((cell) => Number(cell.getAttribute("opacity")) > 0.35)
          .map((cell) => Number(cell.getAttribute("data-embedding-cell"))),
      );
    densities.push(work.length);
    if (mode === "Lexical")
      expect(work.sort((a, b) => a - b)).toEqual(
        embeddingHashes.map(({ bucket }) => bucket).sort((a, b) => a - b),
      );
    // Results stay visible after each transient arithmetic operation ends.
    // Glyph pulse timing is checked separately from this held-result density.
    await expect(
      scene.locator('[data-embedding-label][data-kind="math"]'),
    ).toHaveCount(0);
    await scene.screenshot({
      path: testInfo.outputPath(
        `embedding-${mode.toLowerCase()}-processing.png`,
      ),
    });
  }
  expect(densities).toEqual([6, 96, 256]);
  expect(errors).toEqual([]);
});

test("GPU embedding arithmetic pulses on arrival and leaves held results without equations", async ({
  page,
}, testInfo) => {
  const { figure, scene, errors } = await openGpuEmbedding(page);
  const modes = [
    {
      name: "Lexical",
      samples: [
        [3.4, 163, "subtract"],
        [4.008, 244, "add"],
      ],
      held: 4.53,
    },
    {
      name: "Learned",
      samples: [
        [4.64, 64, "multiply"],
        [4.92, 64, "add"],
      ],
      held: 5.52,
    },
    {
      name: "Neural",
      samples: [
        [3.76, 0, "multiply"],
        [4, 0, "add"],
      ],
      held: 4.48,
    },
  ] as const;
  for (const [index, mode] of modes.entries()) {
    await figure.getByRole("tab", { name: mode.name, exact: true }).click();
    await page.clock.runFor(48);
    if (index > 0) expect(await embeddingProcessTime(scene)).toBeLessThan(0.1);
    const time = await embeddingProcessTime(scene);
    const cycleStart = time < 0.8 ? 0 : Math.ceil(time / 8) * 8;
    await advanceEmbeddingTo(page, scene, cycleStart + 1);
    const early = await scene
      .locator("[data-embedding-operation]")
      .evaluateAll(
        (glyphs) =>
          glyphs.filter((glyph) => Number(glyph.getAttribute("opacity")) > 0.01)
            .length,
      );
    expect(
      early,
      "Incoming tokens do not imply arithmetic has already happened",
    ).toBe(0);
    await expect(
      scene.locator('[data-embedding-label][data-kind="math"]'),
    ).toHaveCount(0);
    for (const [offset, cell, operation] of mode.samples) {
      await advanceEmbeddingTo(page, scene, cycleStart + offset);
      const glyph = scene.locator(`[data-embedding-operation="${cell}"]`);
      await expect(glyph).toHaveAttribute("data-operation", operation);
      expect(
        Number(await glyph.getAttribute("opacity")),
        `${mode.name} ${operation} pulse`,
      ).toBeGreaterThan(0.25);
      const attached = await glyph.evaluate((element, cellIndex) => {
        const svg = (element as SVGPathElement).ownerSVGElement!;
        const cells = Array.from(
          svg.querySelectorAll<SVGCircleElement>("[data-embedding-cell]"),
        );
        const cell = cells[cellIndex];
        const coordinates = element
          .getAttribute("d")!
          .match(/-?\d+(?:\.\d+)?/g)!
          .map(Number);
        const line = {
          x: coordinates[2] - coordinates[0],
          y: coordinates[3] - coordinates[1],
        };
        const xAxis = {
          x: cells[1].cx.baseVal.value - cells[0].cx.baseVal.value,
          y: cells[1].cy.baseVal.value - cells[0].cy.baseVal.value,
        };
        const yAxis = {
          x: cells[16].cx.baseVal.value - cells[0].cx.baseVal.value,
          y: cells[16].cy.baseVal.value - cells[0].cy.baseVal.value,
        };
        const axis =
          element.getAttribute("data-operation") === "multiply"
            ? { x: xAxis.x + yAxis.x, y: xAxis.y + yAxis.y }
            : xAxis;
        return {
          distance: Math.hypot(
            (coordinates[0] + coordinates[2]) / 2 - cell.cx.baseVal.value,
            (coordinates[1] + coordinates[3]) / 2 - cell.cy.baseVal.value,
          ),
          alignment:
            (line.x * axis.x + line.y * axis.y) /
            (Math.hypot(line.x, line.y) * Math.hypot(axis.x, axis.y)),
        };
      }, cell);
      expect(
        attached.distance,
        "Arithmetic stays centered on its addressed silicon cell",
      ).toBeLessThan(0.025);
      expect(
        attached.alignment,
        "Glyph follows the board plane, including portrait rotation",
      ).toBeGreaterThan(0.995);
      await scene.screenshot({
        path: testInfo.outputPath(
          `embedding-${mode.name.toLowerCase()}-${operation}-pulse.png`,
        ),
      });
      if (offset === mode.samples[0][0]) {
        await figure
          .getByRole("button", {
            name: "Pause embedding animation",
            exact: true,
          })
          .click();
        const paused = await scene.evaluate((element) => element.innerHTML);
        const stoppedAt = await embeddingProcessTime(scene);
        await page.clock.runFor(240);
        expect(
          await scene.evaluate((element) => element.innerHTML),
          "Pause freezes the arithmetic pulse and stored cells together",
        ).toBe(paused);
        expect(await embeddingProcessTime(scene)).toBe(stoppedAt);
        await figure
          .getByRole("button", {
            name: "Resume embedding animation",
            exact: true,
          })
          .click();
        await scene.scrollIntoViewIfNeeded();
      }
    }
    await advanceEmbeddingTo(page, scene, cycleStart + mode.held);
    for (const cell of new Set(mode.samples.map(([, cell]) => cell))) {
      expect(
        Number(
          await scene
            .locator(`[data-embedding-operation="${cell}"]`)
            .getAttribute("opacity"),
        ),
        "The completed operation is no longer shown as busy",
      ).toBeLessThan(0.01);
      expect(
        Number(
          await scene
            .locator(`[data-embedding-cell="${cell}"]`)
            .getAttribute("opacity"),
        ),
        "The result remains on the die after the pulse",
      ).toBeGreaterThan(0.35);
    }
  }
  expect(errors).toEqual([]);
});
