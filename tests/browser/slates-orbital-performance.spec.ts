import { expect, test } from "@playwright/test";

const url =
  process.env.SLATES_PERF_URL ??
  "http://localhost:3000/blog/introducing-slates";
const selector = '[data-proof-figure="slates-orbital-fleet"]';

test("initial article HTML omits animation geometry but keeps the explanation", async ({
  request,
}) => {
  const response = await request.get(url);
  expect(response.status()).toBe(200);
  const html = await response.text();
  expect(html).toContain("Private Work. Shared Progress.");
  expect(html).toContain("Building on EdenFS");
  expect(html).toContain("A starfighter represents a private VFS workspace");
  expect(html.includes("data-proof-path"), "SSR must omit path geometry").toBe(
    false,
  );
});

test("offscreen geometry mounts once in the matching responsive layout without a size jump", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(url);
  await page.evaluate(() => document.fonts.ready);
  const figure = page.locator(selector);
  await expect(figure.locator("header")).toContainText(
    "Private Work. Shared Progress.",
  );
  await expect(figure.locator("[data-proof-scene]")).toHaveCount(0);
  const stage = figure.locator("[data-proof-stage]");
  const reserved = await stage.boundingBox();
  expect(reserved?.height).toBeGreaterThan(500);
  await stage.scrollIntoViewIfNeeded();
  const svg = figure.locator("[data-proof-scene]");
  await expect(svg).toHaveCount(1);
  await expect(svg).toHaveAttribute("viewBox", "0 0 420 800");
  expect(
    Math.abs((await stage.boundingBox())!.height - reserved!.height),
  ).toBeLessThan(1);

  await figure.getByRole("tab", { name: "Deploy", exact: true }).click();
  await expect(svg).toHaveAttribute("data-proof-selection", "2.000");
  for (const [width, expected] of [
    [1440, "0 0 800 720"],
    [390, "0 0 420 800"],
  ] as const) {
    await page.setViewportSize({ width, height: 844 });
    await expect(svg).toHaveCount(1);
    await expect(svg).toHaveAttribute("viewBox", expected);
    await expect(svg).toHaveAttribute("data-proof-selection", "2.000");
    const box = await stage.boundingBox();
    const expectedRatio = width === 390 ? 800 / 420 : 720 / 800;
    expect(Math.abs(box!.height / box!.width - expectedRatio)).toBeLessThan(
      0.01,
    );
  }
  const frozen = await svg
    .locator("[data-proof-path]")
    .evaluateAll((paths) =>
      paths.map((path) => [
        path.getAttribute("d"),
        path.getAttribute("opacity"),
      ]),
    );
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.waitForTimeout(100);
  await expect(svg).toHaveCount(1);
  expect(
    await svg
      .locator("[data-proof-path]")
      .evaluateAll((paths) =>
        paths.map((path) => [
          path.getAttribute("d"),
          path.getAttribute("opacity"),
        ]),
      ),
  ).toEqual(frozen);
});

test("a previously visited offscreen illustration stops mutating while motion is enabled", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto(url);
  const late = page.locator('[data-proof-figure="slates-landing"]');
  await late.locator("[data-proof-stage]").scrollIntoViewIfNeeded();
  const svg = late.locator("[data-proof-scene]");
  await expect(svg).toHaveCount(1);
  const prism = svg.locator("[data-proof-prism]");
  const first = await prism.getAttribute("x1");
  await expect.poll(() => prism.getAttribute("x1")).not.toBe(first);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.waitForTimeout(200);
  const mutations = await svg.evaluate(
    (element) =>
      new Promise<number>((resolve) => {
        let count = 0;
        const observer = new MutationObserver((records) => {
          count += records.length;
        });
        observer.observe(element, { attributes: true, subtree: true });
        setTimeout(() => {
          observer.disconnect();
          resolve(count);
        }, 350);
      }),
  );
  expect(mutations).toBe(0);
  await expect(svg).toHaveCount(1);
});

test("a failed lazy illustration download keeps the article readable and can be retried", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(url);
  await page.evaluate(() => document.fonts.ready);
  const figure = page.locator(selector);
  const stage = figure.locator("[data-proof-stage]");
  await expect(figure.locator("[data-proof-scene]")).toHaveCount(0);
  const reserved = await stage.boundingBox();
  const denied: string[] = [];
  const chunks = /\.js(?:\?.*)?$/;
  await page.route(chunks, async (route) => {
    denied.push(new URL(route.request().url()).pathname);
    await route.abort("failed");
  });
  await stage.scrollIntoViewIfNeeded();
  const retry = figure.getByRole("button", {
    name: "Retry illustration",
    exact: true,
  });
  await expect(retry).toBeVisible();
  expect(denied.length).toBeGreaterThan(0);
  await expect(figure.locator("header")).toContainText(
    "Private Work. Shared Progress.",
  );
  await expect(figure.locator("figcaption")).toContainText(
    "A starfighter represents a private VFS workspace",
  );
  expect(
    Math.abs((await stage.boundingBox())!.height - reserved!.height),
  ).toBeLessThan(1);
  await page.unroute(chunks);
  await retry.click();
  const svg = figure.locator("[data-proof-scene]");
  await expect(svg).toHaveCount(1);
  await expect(retry).toHaveCount(0);
  expect(
    Math.abs((await stage.boundingBox())!.height - reserved!.height),
  ).toBeLessThan(1);
  const tabs = figure.getByRole("tab");
  await expect(tabs).toHaveCount(8);
  for (let step = 0; step < 8; step++) {
    await tabs.nth(step).click();
    await expect(svg).toHaveAttribute("data-proof-selection", step.toFixed(3));
  }
});
