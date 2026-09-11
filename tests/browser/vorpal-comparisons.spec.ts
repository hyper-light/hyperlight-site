import { test, expect, type Locator } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import {
  agentSamples,
  retrievalSamples,
  comparisonMetrics,
  comparisonMaximum,
  comparisonValue,
  comparisonWidth,
  type ComparisonKind,
} from "../../components/vorpal-comparison-data";

async function widths(chart: Locator) {
  return chart
    .locator("[data-comparison-bar]")
    .evaluateAll((bars) =>
      bars.map((bar) => Number(bar.getAttribute("width"))),
    );
}
async function settled(chart: Locator) {
  const targets = await chart
    .locator("[data-comparison-bar]")
    .evaluateAll((bars) =>
      bars.map((bar) => Number(bar.getAttribute("data-target-width"))),
    );
  await expect
    .poll(() => widths(chart), { intervals: [50, 100], timeout: 3000 })
    .toEqual(targets);
}

async function settledScrollLeft(region: Locator) {
  return region.evaluate(
    (element) =>
      new Promise<number>((resolve, reject) => {
        let position = element.scrollLeft;
        let stableSince = performance.now();
        const deadline = stableSince + 2000;
        const sample = (time: number) => {
          if (element.scrollLeft !== position) {
            position = element.scrollLeft;
            stableSince = time;
          }
          if (time - stableSince >= 150) return resolve(position);
          if (time > deadline)
            return reject(new Error("Native table scrolling did not settle"));
          requestAnimationFrame(sample);
        };
        requestAnimationFrame(sample);
      }),
  );
}

test("comparison ribbon bodies breathe while their visible endpoints retain the exact scale", async ({
  page,
}) => {
  await page.clock.install();
  await page.goto("/blog/introducing-vorpal");
  const chart = page.locator(
    '[data-vorpal-comparisons="agents"] [data-comparison-chart]',
  );
  await chart.scrollIntoViewIfNeeded();
  const prism = chart.locator("[data-comparison-prism]");
  const initialColor = await prism.getAttribute("x1");
  await expect.poll(() => prism.getAttribute("x1")).not.toBe(initialColor);
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  await page.clock.runFor(250);
  const read = () =>
    chart.evaluate((svg) =>
      Array.from(
        svg.querySelectorAll<SVGPathElement>(
          '[data-comparison-surface$="-skin"]',
        ),
        (skin, index) => {
          const coordinates = Array.from(
            skin.getAttribute("d")!.matchAll(/[ML](-?[\d.]+),(-?[\d.]+)/g),
            (match) => [Number(match[1]), Number(match[2])],
          );
          return {
            length: Number(
              svg
                .querySelector(`[data-comparison-bar="${index}"]`)!
                .getAttribute("width"),
            ),
            minX: Math.min(...coordinates.map(([x]) => x)),
            maxX: Math.max(...coordinates.map(([x]) => x)),
            ys: coordinates.map(([, y]) => y),
            opacity: Number(skin.getAttribute("fill-opacity")),
          };
        },
      ),
    );
  const initial = await read();
  const motion = [0, 0, 0];
  for (let sample = 0; sample < 12; sample++) {
    await page.clock.runFor(500);
    const frame = await read();
    frame.forEach((ribbon, index) => {
      expect(ribbon.minX).toBe(0);
      expect(ribbon.maxX).toBe(ribbon.length);
      expect(ribbon.length).toBe(initial[index].length);
      expect(ribbon.opacity).toBeLessThanOrEqual(0.2);
      expect(ribbon.ys.length).toBe(initial[index].ys.length);
      motion[index] = Math.max(
        motion[index],
        ...ribbon.ys.map((y, vertex) =>
          Math.abs(y - initial[index].ys[vertex]),
        ),
      );
    });
  }
  for (const displacement of motion) expect(displacement).toBeGreaterThan(2);
});

test("manual pause preserves an unfinished ribbon and reduced motion settles it even when already paused", async ({
  page,
}) => {
  await page.clock.install();
  await page.goto("/blog/introducing-vorpal");
  const figure = page.locator('[data-vorpal-comparisons="agents"]');
  const chart = figure.locator("[data-comparison-chart]");
  await chart.scrollIntoViewIfNeeded();
  const prism = chart.locator("[data-comparison-prism]");
  const initialColor = await prism.getAttribute("x1");
  await expect.poll(() => prism.getAttribute("x1")).not.toBe(initialColor);
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  await page.clock.runFor(250);
  const initial = await widths(chart);
  await figure.getByRole("button", { name: "Cost", exact: true }).click();
  await page.clock.runFor(250);
  const intermediate = await widths(chart);
  expect(intermediate[0]).toBeLessThan(initial[0]);
  expect(intermediate[0]).toBeGreaterThan(comparisonWidth(0.081, 0.2));
  await figure
    .getByRole("button", { name: "Pause comparison animation" })
    .click();
  expect(await widths(chart)).toEqual(intermediate);
  const pose = await chart.evaluate((svg) => svg.innerHTML);
  await page.clock.runFor(1000);
  expect(await chart.evaluate((svg) => svg.innerHTML)).toBe(pose);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(
    figure.getByRole("button", { name: "Comparison follows reduced motion" }),
  ).toBeDisabled();
  await settled(chart);
  const renderedEnds = await chart
    .locator('[data-comparison-surface$="-upper"]')
    .evaluateAll((surfaces) =>
      surfaces.map((path) =>
        Math.max(
          ...Array.from(
            path.getAttribute("d")!.matchAll(/[ML](-?[\d.]+),/g),
            (match) => Number(match[1]),
          ),
        ),
      ),
    );
  expect(renderedEnds).toEqual(await widths(chart));
});

for (const kind of ["agents", "retrieval"] as const) {
  test(`${kind} comparisons preserve exact data, a common linear scale, and every raw row`, async ({
    page,
  }, testInfo) => {
    test.setTimeout(60000);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/blog/introducing-vorpal");
    const figure = page.locator(`[data-vorpal-comparisons="${kind}"]`);
    const chart = figure.locator("[data-comparison-chart]");
    const samples = kind === "agents" ? agentSamples : retrievalSamples;
    const subject = kind === "agents" ? "agent question" : "retrieval corpus";
    await chart.scrollIntoViewIfNeeded();
    const metrics = figure.getByRole("group", {
      name:
        kind === "agents"
          ? "Agent comparison metric"
          : "Retrieval comparison metric",
    });
    const buttonWidths = await metrics
      .getByRole("button")
      .evaluateAll((buttons) =>
        buttons.map((button) => button.getBoundingClientRect().width),
      );
    expect(Math.max(...buttonWidths) - Math.min(...buttonWidths)).toBeLessThan(
      1,
    );

    for (let metric = 0; metric < comparisonMetrics[kind].length; metric++) {
      await metrics
        .getByRole("button", {
          name: comparisonMetrics[kind][metric].name,
          exact: true,
        })
        .click();
      for (let index = 0; index < samples.length; index++) {
        const sample = samples[index];
        await expect(
          figure.getByRole("heading", {
            level: 4,
            name: sample.name,
            exact: true,
          }),
        ).toBeVisible();
        await expect(figure.locator("[data-comparison-value]")).toHaveText(
          sample.rows.map((row) =>
            comparisonValue(kind, metric, row.values[metric]),
          ),
        );
        await settled(chart);
        expect(await widths(chart)).toEqual(
          sample.rows.map((row) =>
            comparisonWidth(
              row.values[metric],
              comparisonMaximum(kind, metric),
            ),
          ),
        );
        expect(
          await chart
            .locator("[data-comparison-bar]")
            .evaluateAll((bars) => bars.map((bar) => bar.getAttribute("x"))),
        ).toEqual(["0", "0", "0"]);
        await figure
          .getByRole("button", { name: `Next ${subject}`, exact: true })
          .click();
      }
    }
    // Both directions wrap without hiding a question or corpus.
    await figure
      .getByRole("button", { name: `Previous ${subject}`, exact: true })
      .click();
    await expect(
      figure.getByRole("heading", {
        level: 4,
        name: samples.at(-1)!.name,
        exact: true,
      }),
    ).toBeVisible();
    await figure
      .getByRole("button", { name: `Next ${subject}`, exact: true })
      .click();
    await settled(chart);
    await figure.screenshot({
      path: testInfo.outputPath(`${kind}-comparison.png`),
    });
    await figure.getByText("All measured results", { exact: false }).click();
    await expect(figure.locator("tbody tr")).toHaveCount(
      kind === "agents" ? 12 : 9,
    );
    const rawRows = await figure.locator("tbody tr").allTextContents();
    expect(rawRows.join(" ")).toContain(kind === "agents" ? "$0.200" : "0.500");
    expect(rawRows.join(" ")).toContain(kind === "agents" ? "104 K" : "0.290");
    expect(errors).toEqual([]);
  });
}

test("comparison widths interpolate without resets; light, pause, reduced motion and offscreen state agree", async ({
  page,
}) => {
  await page.goto("/blog/introducing-vorpal");
  const figure = page.locator('[data-vorpal-comparisons="agents"]');
  const chart = figure.locator("[data-comparison-chart]");
  await chart.scrollIntoViewIfNeeded();
  const prism = chart.locator("[data-comparison-prism]");
  const color = await prism.getAttribute("x1");
  await expect.poll(() => prism.getAttribute("x1")).not.toBe(color);
  const edge = await figure.evaluate(
    (element) => getComputedStyle(element, "::before").backgroundPosition,
  );
  await expect
    .poll(() =>
      figure.evaluate(
        (element) => getComputedStyle(element, "::before").backgroundPosition,
      ),
    )
    .not.toBe(edge);
  const original = await chart
    .locator("[data-comparison-bar]")
    .elementHandles();
  const before = await widths(chart);
  await figure.getByRole("button", { name: "Cost", exact: true }).click();
  const frames = await chart.evaluate(
    (svg) =>
      new Promise<number[][]>((resolve) => {
        const bars = Array.from(svg.querySelectorAll("[data-comparison-bar]"));
        const start = performance.now();
        const samples: number[][] = [];
        const sample = () => {
          samples.push(bars.map((bar) => Number(bar.getAttribute("width"))));
          if (performance.now() - start >= 1000) resolve(samples);
          else requestAnimationFrame(sample);
        };
        sample();
      }),
  );
  const after = await widths(chart);
  expect(new Set(frames.map((frame) => frame[0])).size).toBeGreaterThan(10);
  for (const frame of frames) {
    frame.forEach((value, index) => {
      expect(value).toBeGreaterThan(0);
      expect(value).toBeGreaterThanOrEqual(
        Math.min(before[index], after[index]) - 0.01,
      );
      expect(value).toBeLessThanOrEqual(
        Math.max(before[index], after[index]) + 0.01,
      );
    });
  }
  for (const handle of original)
    expect(await handle.evaluate((bar) => bar.isConnected)).toBe(true);
  await settled(chart);

  const fingerprint = () => chart.evaluate((svg) => svg.innerHTML);
  await figure
    .getByRole("button", { name: "Pause comparison animation" })
    .click();
  const paused = await fingerprint();
  await page.waitForTimeout(200);
  expect(await fingerprint()).toBe(paused);
  await figure.getByRole("button", { name: "Turns", exact: true }).click();
  await settled(chart);
  expect(await widths(chart)).toEqual([600, 360, 240]);
  await figure
    .getByRole("button", { name: "Resume comparison animation" })
    .click();
  const resumed = await fingerprint();
  await expect.poll(fingerprint).not.toBe(resumed);

  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.waitForTimeout(200);
  const offscreen = await fingerprint();
  await page.waitForTimeout(250);
  expect(await fingerprint()).toBe(offscreen);
  await chart.scrollIntoViewIfNeeded();
  await expect.poll(fingerprint).not.toBe(offscreen);
  await figure.getByRole("button", { name: "Time", exact: true }).click();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await settled(chart);
  await expect(
    figure.getByRole("button", { name: "Comparison follows reduced motion" }),
  ).toBeDisabled();
  const reduced = await fingerprint();
  await page.waitForTimeout(200);
  expect(await fingerprint()).toBe(reduced);
  await figure.getByRole("button", { name: "Tokens", exact: true }).click();
  await settled(chart);
  expect(await widths(chart)).toEqual(
    agentSamples[0].rows.map((row) => comparisonWidth(row.values[1], 104000)),
  );
});

test("comparison figures fit narrow screens, keep keyboard controls, and expose accessible raw tables", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/blog/introducing-vorpal");
  const widthsToCheck = testInfo.project.name.includes("mobile")
    ? [320, 390]
    : [1024, 1440];
  for (const width of widthsToCheck) {
    await page.setViewportSize({ width, height: 900 });
    for (const kind of ["agents", "retrieval"] as ComparisonKind[]) {
      const figure = page.locator(`[data-vorpal-comparisons="${kind}"]`);
      await figure.scrollIntoViewIfNeeded();
      expect(
        await figure.evaluate(
          (element) => element.scrollWidth <= element.clientWidth,
        ),
      ).toBe(true);
      const metric = figure.getByRole("button", {
        name: kind === "agents" ? "Cost" : "MRR",
        exact: true,
      });
      await metric.focus();
      await page.keyboard.press("Space");
      await expect(metric).toHaveAttribute("aria-pressed", "true");
      const details = figure.locator("details");
      if (
        !(await details.getAttribute("open")) &&
        (await details.evaluate(
          (element) => !(element as HTMLDetailsElement).open,
        ))
      )
        await details.locator("summary").click();
      const tableRegion = figure.getByRole("region");
      await tableRegion.focus();
      await expect(tableRegion).toBeFocused();
      const overflow = await tableRegion.evaluate(
        (element) => element.scrollWidth > element.clientWidth,
      );
      if (overflow) {
        const before = await tableRegion.evaluate(
          (element) => element.scrollLeft,
        );
        // Keep each key down until real native movement starts, and release
        // even after failure. The eased scroll can continue after keyup.
        await page.keyboard.down("ArrowRight");
        try {
          await expect
            .poll(() => tableRegion.evaluate((element) => element.scrollLeft))
            .toBeGreaterThan(before);
        } finally {
          await page.keyboard.up("ArrowRight");
        }
        // Reversing before the prior native scroll commits can leave a
        // traced browser at its old destination. Compare completed gestures,
        // not the first positive offset of an unfinished rightward scroll.
        const right = await settledScrollLeft(tableRegion);
        await page.keyboard.down("ArrowLeft");
        try {
          await expect
            .poll(() => tableRegion.evaluate((element) => element.scrollLeft))
            .toBeLessThan(right);
        } finally {
          await page.keyboard.up("ArrowLeft");
        }
        expect(await settledScrollLeft(tableRegion)).toBeLessThan(right);
      }
      const accessibility = await new AxeBuilder({ page })
        .include(`[data-vorpal-comparisons="${kind}"]`)
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(
        accessibility.violations.map(({ id, nodes }) => ({
          id,
          targets: nodes.map(({ target }) => target),
        })),
      ).toEqual([]);
      await figure.screenshot({
        path: testInfo.outputPath(`${kind}-${width}.png`),
      });
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }
});
