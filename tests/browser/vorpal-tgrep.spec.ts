import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const metrics = [
  {
    name: "Build time",
    max: 10,
    values: [8.1, 8.2, 0.9, 0.54, 6.9, 0.69],
    labels: ["8.1 s", "8.2 s", "0.9 s", "0.54 s", "6.9 s", "0.69 s"],
  },
  {
    name: "Peak RAM",
    max: 12000,
    values: [6100, 310, 700, 140, 11600, 260],
    labels: ["6.1 GB", "0.31 GB", "0.7 GB", "0.14 GB", "11.6 GB", "0.26 GB"],
  },
  {
    name: "Disk",
    max: 5000,
    values: [4800, 1000, 160, 74, 860, 28],
    labels: ["4.8 GB", "1.0 GB", "160 MB", "74 MB", "860 MB", "28 MB"],
  },
];

test("tgrep comparison retains all README values and uses a shared zero-based scale", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/blog/introducing-vorpal");
  const figure = page.locator("[data-vorpal-tgrep]");
  await expect(figure.locator("[data-tgrep-corpus]")).toHaveCount(3);
  for (const metric of metrics) {
    await figure
      .getByRole("button", { name: metric.name, exact: true })
      .click();
    await expect(figure.locator("[data-tgrep-value]")).toHaveText(
      metric.labels,
    );
    const widths = await figure
      .locator("[data-tgrep-bar]")
      .evaluateAll((bars) =>
        bars.map((bar) => Number(bar.getAttribute("width"))),
      );
    widths.forEach((width, index) =>
      expect(width).toBeCloseTo((metric.values[index] / metric.max) * 560, 2),
    );
  }
  await figure.locator("summary").click();
  await expect(figure.locator("tbody tr")).toHaveCount(9);
  const table = await figure.locator("table").textContent();
  for (const metric of metrics)
    for (const label of metric.labels) expect(table).toContain(label);
});

test("tgrep ribbons move only in view and respect pause and reduced motion", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/blog/introducing-vorpal");
  const figure = page.locator("[data-vorpal-tgrep]");
  const chart = figure.locator("[data-tgrep-chart]").first();
  await chart.scrollIntoViewIfNeeded();
  const skin = chart.locator('[data-tgrep-surface="0-skin"]');
  const initial = await skin.getAttribute("d");
  await expect.poll(() => skin.getAttribute("d")).not.toBe(initial);
  await figure
    .getByRole("button", { name: "Pause tgrep comparison animation" })
    .click();
  const fingerprint = () => chart.evaluate((element) => element.innerHTML);
  const paused = await fingerprint();
  await page.waitForTimeout(200);
  expect(await fingerprint()).toBe(paused);
  await figure
    .getByRole("button", { name: "Resume tgrep comparison animation" })
    .click();
  await chart.scrollIntoViewIfNeeded();
  await expect.poll(fingerprint).not.toBe(paused);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.waitForTimeout(200);
  const hidden = await fingerprint();
  await page.waitForTimeout(200);
  expect(await fingerprint()).toBe(hidden);
  await chart.scrollIntoViewIfNeeded();
  await expect.poll(fingerprint).not.toBe(hidden);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(
    figure.getByRole("button", { name: /follows reduced motion/ }),
  ).toBeDisabled();
  const reduced = await fingerprint();
  await page.waitForTimeout(200);
  expect(await fingerprint()).toBe(reduced);
  expect(errors).toEqual([]);
});

test("tgrep figure and full-width raw table fit desktop and mobile", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/blog/introducing-vorpal");
  const figure = page.locator("[data-vorpal-tgrep]");
  for (const width of testInfo.project.name.includes("mobile")
    ? [320, 390]
    : [1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await figure.scrollIntoViewIfNeeded();
    const tabs = figure.getByRole("group", { name: "Vorpal and tgrep metric" });
    const widths = await tabs
      .getByRole("button")
      .evaluateAll((buttons) =>
        buttons.map((button) => button.getBoundingClientRect().width),
      );
    expect(Math.max(...widths) - Math.min(...widths)).toBeLessThan(1);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await figure.screenshot({
      path: testInfo.outputPath(`tgrep-${width}.png`),
    });
  }
  await figure.locator("summary").click();
  const region = figure.getByRole("region", {
    name: "Vorpal and tgrep — all indexing measurements",
    exact: true,
  });
  await region.focus();
  await expect(region).toBeFocused();
  expect(
    await region
      .locator("table")
      .evaluate(
        (table) =>
          table.getBoundingClientRect().width >=
          table.parentElement!.clientWidth - 1,
      ),
  ).toBe(true);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const accessibility = await new AxeBuilder({ page })
    .include("[data-vorpal-tgrep]")
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(accessibility.violations).toEqual([]);
});
