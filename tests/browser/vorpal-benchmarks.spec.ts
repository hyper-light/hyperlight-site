import { expect, test, type Locator, type Page } from "@playwright/test";

async function openBenchmark(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  const response = await page.goto("/blog/introducing-vorpal");
  expect(response?.status()).toBe(200);
  const figure = page.locator("[data-vorpal-benchmarks]");
  const chart = figure.locator('[data-benchmark-chart="kernel"]');
  await chart.scrollIntoViewIfNeeded();
  return { figure, chart, errors };
}

const shape = (chart: Locator) =>
  chart.locator('[data-benchmark-surface="1-skin"]').getAttribute("d");

test("cold-index ribbons preserve all six measurements and match the retrieval material", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const { figure, chart, errors } = await openBenchmark(page);
  for (const [corpus, vorpal, cbm] of [
    ["kernel", 8.1, 296],
    ["cpython", 0.9, 38.5],
    ["vorpal", 6.9, 43.1],
  ] as const) {
    const pair = figure.locator(`[data-benchmark-corpus="${corpus}"]`);
    await expect(pair.locator("dd")).toHaveText([`${vorpal} s`, `${cbm} s`]);
    for (const [tool, seconds, width, index] of [
      ["vorpal", vorpal, Number(((vorpal / cbm) * 560).toFixed(2)), 0],
      ["cbm", cbm, 560, 1],
    ] as const) {
      const ruler = pair.locator(`[data-benchmark-bar="${tool}"]`);
      await expect(ruler).toHaveAttribute(
        "data-benchmark-seconds",
        String(seconds),
      );
      expect(Number(await ruler.getAttribute("data-benchmark-width"))).toBe(
        width,
      );
      expect(Number(await ruler.getAttribute("width"))).toBe(width);
      expect(Number(await ruler.getAttribute("height"))).toBeLessThan(1);
      const vertices = await pair
        .locator(`[data-benchmark-surface="${index}-skin"]`)
        .evaluate((path) =>
          Array.from(
            path.getAttribute("d")!.matchAll(/[ML](-?[\d.]+),(-?[\d.]+)/g),
            (match) => Number(match[1]),
          ),
        );
      expect(Math.min(...vertices)).toBe(0);
      expect(Math.max(...vertices)).toBe(width);
    }
  }
  const retrieval = page.locator('[data-vorpal-comparisons="retrieval"]');
  for (const part of ["skin", "upper", "lower", "spine", "ribs", "depth"]) {
    const treatment = (path: Locator) =>
      path.evaluate((element) =>
        ["fill-opacity", "stroke-opacity", "stroke-width", "vector-effect"].map(
          (name) => element.getAttribute(name),
        ),
      );
    expect(
      await treatment(chart.locator(`[data-benchmark-surface="0-${part}"]`)),
    ).toEqual(
      await treatment(
        retrieval.locator(`[data-comparison-surface="0-${part}"]`),
      ),
    );
  }
  const initial = await chart.innerHTML();
  await page.waitForTimeout(200);
  expect(await chart.innerHTML()).toBe(initial);
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  expect(errors).toEqual([]);
});

test("cold-index ribbon geometry moves without changing measured lengths and obeys the shared motion lifecycle", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const { figure, chart, errors } = await openBenchmark(page);
  const widths = await chart
    .locator("[data-benchmark-bar]")
    .evaluateAll((bars) => bars.map((bar) => bar.getAttribute("width")));
  const first = await shape(chart);
  await expect.poll(() => shape(chart)).not.toBe(first);
  const light = chart.locator("[data-benchmark-prism]");
  const initialLight = await light.getAttribute("x1");
  await expect.poll(() => light.getAttribute("x1")).not.toBe(initialLight);
  await figure
    .getByRole("button", { name: "Pause benchmark animation" })
    .click();
  await expect(page.locator("html")).toHaveAttribute("data-motion", "paused");
  const paused = await chart.innerHTML();
  await page.waitForTimeout(250);
  expect(await chart.innerHTML()).toBe(paused);
  await figure
    .getByRole("button", { name: "Resume benchmark animation" })
    .click();
  await expect.poll(() => chart.innerHTML()).not.toBe(paused);
  await page.evaluate(() =>
    window.scrollTo(0, document.documentElement.scrollHeight),
  );
  await page.waitForTimeout(150);
  const offscreen = await chart.innerHTML();
  await page.waitForTimeout(250);
  expect(await chart.innerHTML()).toBe(offscreen);
  await chart.scrollIntoViewIfNeeded();
  await expect.poll(() => chart.innerHTML()).not.toBe(offscreen);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(
    figure.getByRole("button", {
      name: "Benchmark animation follows reduced motion",
    }),
  ).toBeDisabled();
  const reduced = await chart.innerHTML();
  await page.waitForTimeout(250);
  expect(await chart.innerHTML()).toBe(reduced);
  expect(
    await chart
      .locator("[data-benchmark-bar]")
      .evaluateAll((bars) => bars.map((bar) => bar.getAttribute("width"))),
  ).toEqual(widths);
  expect(errors).toEqual([]);
});
