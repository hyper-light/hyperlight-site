import { expect, test, type Locator, type Page } from "@playwright/test";

// Independent literals from the published README table: preserve its units
// and rounding rather than deriving the expected text from the chart data.
const published = [
  {
    id: "kernel",
    name: "Linux kernel",
    ram: ["2.1 GB", "2.4 GB", "3.0 GB", "2.9 GB"],
    storage: ["8.1 GB", "8.5 GB"],
  },
  {
    id: "cpython",
    name: "CPython",
    ram: ["110 MB", "154 MB", "748 MB", "658 MB"],
    storage: ["210 MB", "280 MB"],
  },
  {
    id: "vorpal",
    name: "Vorpal",
    ram: ["65 MB", "79 MB", "652 MB", "561 MB"],
    storage: ["880 MB", "910 MB"],
  },
] as const;

const tierNames = ["Default", "Learned", "Learned + f16", "Learned + f32"];

test("RAM and disk preserve their hardware proportions on narrow screens", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1440, height: 1000 });
  const { figure, errors } = await openFootprint(page);
  for (const metric of ["RAM", "Disk"] as const) {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await selectMetric(figure, metric);
    const grid = figure.locator("[data-footprint-grid]");
    const ratio = () => grid.evaluate((element) => {
      const box = (element as SVGSVGElement).getBBox();
      return box.width / box.height;
    });
    const desktopRatio = await ratio();
    for (const width of [768, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      await grid.evaluate(() => new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }));
      await grid.screenshot({
        path: testInfo.outputPath(`hardware-${metric.toLowerCase()}-${width}.png`),
      });
      expect.soft(
        await ratio(),
        `${metric} at ${width}px should scale the hardware, not reshape it`,
      ).toBeCloseTo(desktopRatio, 1);
    }
  }
  expect(errors).toEqual([]);
});

test("resource and tier tabs show one module without shifting the article or adding an inner scroller", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const { figure, errors } = await openFootprint(page);
  const read = () =>
    figure.evaluate((element) => ({
      height: element.getBoundingClientRect().height,
      nextTop:
        element.nextElementSibling!.getBoundingClientRect().top +
        window.scrollY,
    }));
  for (const width of testInfo.project.name.includes("mobile")
    ? [320, 390]
    : [1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(figure).toHaveAttribute("data-footprint-columns", "40");
    await selectMetric(figure, "RAM");
    await selectTier(figure, 0);
    const ram = await read();
    for (const [metric, tiers] of [
      ["RAM", 4],
      ["Disk", 2],
    ] as const) {
      await selectMetric(figure, metric);
      const tierControls = figure.getByRole("group", {
        name: "Memory and disk tier",
      });
      await expect(tierControls.getByRole("button")).toHaveCount(tiers);
      for (let tier = 0; tier < tiers; tier++) {
        await selectTier(figure, tier);
        await expect(figure.locator("[data-footprint-grid]")).toHaveCount(1);
        await expect(figure.locator("[data-footprint-value]")).toHaveCount(1);
        const current = await read();
        expect(current.height).toBeCloseTo(ram.height, 0);
        expect(current.nextTop).toBeCloseTo(ram.nextTop, 0);
        const hardware = figure.locator("section[data-footprint-tier]");
        const layout = await hardware.evaluate((element) => ({
          module: element.getBoundingClientRect().height,
          stage: element.parentElement!.getBoundingClientRect().height,
          bottom: element.getBoundingClientRect().bottom,
        }));
        expect(
          layout.stage - layout.module,
          "reserve only the small RAM/SSD aspect-ratio difference, not empty module rows",
        ).toBeLessThan(layout.module * 0.25 + 2);
        expect((await tierControls.boundingBox())!.y).toBeGreaterThanOrEqual(
          layout.bottom - 1,
        );
        expect(
          await figure.evaluate((element) =>
            Array.from(element.querySelectorAll<HTMLElement>("*")).some(
              (child) =>
                /^(auto|scroll)$/.test(getComputedStyle(child).overflowY) &&
                child.scrollHeight > child.clientHeight + 1,
            ),
          ),
          "the module is not an independently scrolling pane",
        ).toBe(false);
      }
    }
    // Each resource remembers its own tier, and both selectors use native
    // keyboard buttons with the same shared segmented treatment.
    await selectMetric(figure, "RAM");
    const f16 = tierButton(figure, 2);
    await f16.focus();
    await page.keyboard.press("Enter");
    await expect(f16).toHaveAttribute("aria-pressed", "true");
    await selectMetric(figure, "Disk");
    await expect(tierButton(figure, 1)).toHaveAttribute("aria-pressed", "true");
    await selectMetric(figure, "RAM");
    await expect(f16).toHaveAttribute("aria-pressed", "true");
    expect((await read()).height).toBeCloseTo(ram.height, 0);
    const selectors = figure
      .getByRole("group")
      .filter({ has: page.getByRole("button", { name: /^(RAM|Default)$/ }) });
    const classes = await selectors.evaluateAll((elements) =>
      elements.map((element) => element.className),
    );
    expect(classes).toHaveLength(2);
    expect(classes[0]).toBe(classes[1]);
    for (const control of await selectors.getByRole("button").all()) {
      const box = (await control.boundingBox())!;
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
    await figure
      .getByRole("heading", { name: "Memory and disk usage." })
      .click();
    await figure.screenshot({
      path: testInfo.outputPath(`footprint-single-${width}.png`),
    });
  }
  expect(errors).toEqual([]);
});

async function openFootprint(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  const response = await page.goto("/blog/introducing-vorpal");
  expect(response?.status()).toBe(200);
  await page.evaluate(() => document.fonts.ready);
  const figure = page.locator("[data-vorpal-footprint]");
  const grid = figure.locator("[data-footprint-grid]").first();
  await grid.scrollIntoViewIfNeeded();
  await expect(figure).toBeVisible();
  if (
    !(await page.evaluate(
      () => matchMedia("(prefers-reduced-motion: reduce)").matches,
    ))
  ) {
    // Let the real visibility delivery activate the hook before any test
    // freezes its clock; font/layout completion alone does not guarantee it.
    const firstLight = await prism(grid);
    await expect.poll(() => prism(grid)).not.toEqual(firstLight);
  }
  return { figure, errors };
}

async function selectMetric(figure: Locator, metric: "RAM" | "Disk") {
  const button = figure
    .getByRole("group", { name: "Memory and disk metric" })
    .getByRole("button", { name: metric, exact: true });
  await button.click();
  await expect(button).toHaveAttribute("aria-pressed", "true");
}

function tierButton(figure: Locator, tier: number) {
  return figure
    .getByRole("group", { name: "Memory and disk tier" })
    .getByRole("button", { name: tierNames[tier], exact: true });
}

async function selectTier(figure: Locator, tier: number) {
  const button = tierButton(figure, tier);
  await button.click();
  await expect(button).toHaveAttribute("aria-pressed", "true");
}

function occupiedMB(grid: Locator) {
  return grid.evaluate((element) =>
    Array.from(element.querySelectorAll("[data-footprint-cell]"), (cell) => {
      const slot = cell.querySelector<SVGRectElement>("[data-footprint-slot]")!;
      const fill = cell.querySelector<SVGRectElement>("[data-footprint-fill]")!;
      return (
        (25 * fill.width.baseVal.value * fill.height.baseVal.value) /
        (slot.width.baseVal.value * slot.height.baseVal.value)
      );
    }).reduce((sum, amount) => sum + amount, 0),
  );
}

function gridGeometry(grid: Locator) {
  return grid
    .locator("[data-footprint-slot]")
    .first()
    .evaluate((element) => {
      const matrix = (element as SVGGraphicsElement).getScreenCTM()!;
      return {
        attributes: ["d", "x", "y", "width", "height", "transform"].map(
          (name) => element.getAttribute(name),
        ),
        matrix: [matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f],
      };
    });
}

function prism(grid: Locator) {
  return grid
    .locator("[data-footprint-prism]")
    .evaluate((element) =>
      ["x1", "x2", "y1", "y2", "gradientTransform"].map((name) =>
        element.getAttribute(name),
      ),
    );
}

async function expectStill(grid: Locator) {
  await new Promise((resolve) => setTimeout(resolve, 100));
  const before = {
    svg: await grid.evaluate((element) => element.innerHTML),
    geometry: await gridGeometry(grid),
  };
  await new Promise((resolve) => setTimeout(resolve, 350));
  expect({
    svg: await grid.evaluate((element) => element.innerHTML),
    geometry: await gridGeometry(grid),
  }).toEqual(before);
}

test("the footprint chart displays all eighteen published measurements without changing their units", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const { figure, errors } = await openFootprint(page);
  let measurements = 0;
  for (const sample of published) {
    await expect(figure).toHaveAttribute("data-footprint-sample", sample.id);
    for (const [kind, metric] of [
      ["ram", "RAM"],
      ["storage", "Disk"],
    ] as const) {
      await selectMetric(figure, metric);
      await expect(figure).toHaveAttribute("data-footprint-kind", kind);
      for (const [tier, label] of sample[kind].entries()) {
        await selectTier(figure, tier);
        await expect(figure.locator("[data-footprint-value]")).toHaveText(
          label,
        );
        const grid = figure.locator("[data-footprint-grid]");
        await expect(grid).toHaveCount(1);
        expect(await occupiedMB(grid)).toBeCloseTo(
          parseFloat(label) * (label.endsWith("GB") ? 1000 : 1),
          2,
        );
        measurements++;
      }
    }
    if (sample.id !== "vorpal") {
      await figure
        .getByRole("button", { name: "Next footprint repository" })
        .click();
    }
  }
  expect(measurements).toBe(18);
  await figure.locator("details > summary").click();
  const table = figure.getByRole("table", {
    name: "All published RAM and disk measurements",
  });
  await expect(table).toBeVisible();
  await expect(table.locator("tbody tr")).toHaveCount(18);
  const tableLayout = await table.evaluate((element) => ({
    width: element.getBoundingClientRect().width,
    container: element.parentElement!.clientWidth,
    minimum: parseFloat(getComputedStyle(element).minWidth) || 0,
  }));
  expect(tableLayout.width).toBeGreaterThanOrEqual(tableLayout.container - 0.5);
  if (tableLayout.container >= tableLayout.minimum) {
    expect(Math.abs(tableLayout.width - tableLayout.container)).toBeLessThan(
      0.5,
    );
  }
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  for (const sample of published) {
    for (const kind of ["ram", "storage"] as const) {
      for (const [index, value] of sample[kind].entries()) {
        const row = table.locator(
          `tr[data-footprint-sample="${sample.id}"][data-footprint-kind="${kind}"][data-footprint-tier="${index}"]`,
        );
        await expect(row).toContainText(sample.name);
        await expect(row).toContainText(value);
      }
    }
  }
  expect(errors).toEqual([]);
});

test("manual pause holds intermediate occupancy and resume completes the transition", async ({
  page,
}) => {
  await page.clock.install();
  const { figure, errors } = await openFootprint(page);
  const grid = figure.locator('[data-footprint-grid="0"]');
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  await page.clock.runFor(250);
  expect(await occupiedMB(grid)).toBeCloseTo(2100, 2);
  await figure
    .getByRole("button", { name: "Next footprint repository" })
    .click();
  await page.clock.runFor(250);
  const beforePause = await occupiedMB(grid);
  expect(beforePause).toBeGreaterThan(110);
  expect(beforePause).toBeLessThan(2100);
  await figure
    .getByRole("button", { name: "Pause footprint animation" })
    .click();
  await expect(page.locator("html")).toHaveAttribute("data-motion", "paused");
  const afterPause = await occupiedMB(grid);
  expect(
    afterPause,
    `manual pause changed occupied area from ${beforePause} MB to ${afterPause} MB`,
  ).toBeCloseTo(beforePause, 2);
  const paused = await grid.evaluate((element) => element.innerHTML);
  await page.clock.runFor(1000);
  expect(await grid.evaluate((element) => element.innerHTML)).toBe(paused);
  await figure
    .getByRole("button", { name: "Resume footprint animation" })
    .click();
  await page.clock.runFor(1100);
  expect(await occupiedMB(grid)).toBeCloseTo(110, 2);
  await figure
    .getByRole("button", { name: "Pause footprint animation" })
    .click();
  await selectTier(figure, 1);
  const selected = figure.locator("[data-footprint-grid]");
  expect(await occupiedMB(selected)).toBeCloseTo(154, 2);
  const selectedWhilePaused = await selected.evaluate(
    (element) => element.innerHTML,
  );
  await page.clock.runFor(1000);
  expect(await selected.evaluate((element) => element.innerHTML)).toBe(
    selectedWhilePaused,
  );
  expect(errors).toEqual([]);
});

test("projected cells retain a twenty-five MB unit and attached partial fills", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({
    width: testInfo.project.name.includes("mobile") ? 320 : 1440,
    height: 1000,
  });
  const { figure, errors } = await openFootprint(page);
  let cellArea = 0;
  for (const [metric, tiers, count] of [
    ["RAM", 4, 160],
    ["Disk", 2, 400],
  ] as const) {
    await selectMetric(figure, metric);
    const grids = figure.locator("[data-footprint-grid]");
    await expect(grids).toHaveCount(1);
    for (let tier = 0; tier < tiers; tier++) {
      await selectTier(figure, tier);
      const grid = grids;
      const sizing = await grid.evaluate((element) => ({
        width: element.getBoundingClientRect().width,
        available: element.parentElement!.getBoundingClientRect().width,
      }));
      const relativeWidth = sizing.width / sizing.available;
      if (sizing.available >= 750) {
        expect(relativeWidth, "keep the 25% reduction in wide plots").toBeCloseTo(0.75, 2);
      } else if (sizing.available <= 460) {
        expect(relativeWidth, "use the available width on small screens").toBeCloseTo(1, 2);
      } else {
        expect(relativeWidth).toBeGreaterThanOrEqual(0.75);
        expect(relativeWidth).toBeLessThanOrEqual(1);
      }
      await expect(grid.locator("[data-footprint-cell]")).toHaveCount(count);
      const cells = await grid
        .locator("[data-footprint-cell]")
        .evaluateAll((nodes) =>
          nodes.map((cell) => {
            const slot = cell.querySelector<SVGRectElement>(
              "[data-footprint-slot]",
            )!;
            const fill = cell.querySelector<SVGRectElement>(
              "[data-footprint-fill]",
            )!;
            const matrix = (rect: SVGRectElement) => {
              const value = rect.getScreenCTM()!;
              return [value.a, value.b, value.c, value.d, value.e, value.f];
            };
            return {
              width: slot.width.baseVal.value,
              height: slot.height.baseVal.value,
              origin: [slot.x.baseVal.value, slot.y.baseVal.value],
              fillOrigin: [fill.x.baseVal.value, fill.y.baseVal.value],
              fillWidth: fill.width.baseVal.value,
              fillHeight: fill.height.baseVal.value,
              slotMatrix: matrix(slot),
              fillMatrix: matrix(fill),
            };
          }),
        );
      for (const cell of cells) {
        expect(cell.width).toBeGreaterThan(0);
        expect(cell.width).toBe(cell.height);
        cellArea ||= cell.width * cell.height;
        expect(
          cell.width * cell.height,
          "a resource or tier change must preserve the 25 MB local unit area",
        ).toBe(cellArea);
        expect(cell.fillOrigin).toEqual(cell.origin);
        expect(cell.fillHeight).toBe(cell.height);
        expect(cell.fillWidth).toBeGreaterThanOrEqual(0);
        expect(cell.fillWidth).toBeLessThanOrEqual(cell.width);
        expect(
          cell.fillMatrix,
          "fill and base cell must share the same projected plane",
        ).toEqual(cell.slotMatrix);
      }
    }
    await figure
      .getByRole("heading", { name: "Memory and disk usage." })
      .click();
    await figure.screenshot({
      path: testInfo.outputPath(`footprint-${metric.toLowerCase()}.png`),
    });
  }
  await figure
    .getByRole("button", { name: "Previous footprint repository" })
    .click();
  await selectMetric(figure, "RAM");
  await selectTier(figure, 0);
  await expect(figure).toHaveAttribute("data-footprint-sample", "vorpal");
  const grid = figure.locator('[data-footprint-grid="0"]');
  const fractions = await grid
    .locator("[data-footprint-cell]")
    .evaluateAll((cells) =>
      cells.map((cell) => {
        const slot = cell.querySelector<SVGRectElement>(
          "[data-footprint-slot]",
        )!;
        const fill = cell.querySelector<SVGRectElement>(
          "[data-footprint-fill]",
        )!;
        return (
          (fill.width.baseVal.value * fill.height.baseVal.value) /
          (slot.width.baseVal.value * slot.height.baseVal.value)
        );
      }),
    );
  expect(fractions.slice(0, 2)).toEqual([1, 1]);
  expect(fractions[2]).toBeCloseTo(0.6, 5);
  expect(fractions.slice(3)).toEqual(Array(157).fill(0));
  expect(await occupiedMB(grid)).toBeCloseTo(65, 3);
  await expect(figure.locator('[data-footprint-value="0"]')).toHaveText(
    "65 MB",
  );
  for (const control of await figure.getByRole("button").all()) {
    const box = await control.boundingBox();
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);
  }
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await figure.getByRole("heading", { name: "Memory and disk usage." }).click();
  await figure.screenshot({
    path: testInfo.outputPath("footprint-partial.png"),
  });
  expect(errors).toEqual([]);
});

test("interrupting repository and tier transitions continues from the visible fill without resetting cells", async ({
  page,
}) => {
  await page.clock.install();
  const { figure, errors } = await openFootprint(page);
  const grid = figure.locator("[data-footprint-grid]");
  const firstCell = await grid
    .locator('[data-footprint-cell="0"]')
    .elementHandle();
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  await page.clock.runFor(250);
  const next = figure.getByRole("button", {
    name: "Next footprint repository",
  });
  await next.focus();
  await page.keyboard.press("Enter");
  await expect(figure).toHaveAttribute("data-footprint-sample", "cpython");
  await page.clock.runFor(250);
  const intermediate = await occupiedMB(grid);
  expect(intermediate).toBeGreaterThan(110);
  expect(intermediate).toBeLessThan(2100);
  await page.keyboard.press("Enter");
  await expect(figure).toHaveAttribute("data-footprint-sample", "vorpal");
  expect(await occupiedMB(grid)).toBeCloseTo(intermediate, 2);
  await page.clock.runFor(32);
  const continued = await occupiedMB(grid);
  expect(continued).toBeGreaterThan(intermediate * 0.98);
  expect(continued).toBeLessThanOrEqual(intermediate);
  await page.clock.runFor(1100);
  expect(await occupiedMB(grid)).toBeCloseTo(65, 2);
  expect(await firstCell!.evaluate((cell) => cell.isConnected)).toBe(true);
  await tierButton(figure, 2).focus();
  await page.keyboard.press("Enter");
  await page.clock.runFor(250);
  const tierIntermediate = await occupiedMB(grid);
  expect(tierIntermediate).toBeGreaterThan(65);
  expect(tierIntermediate).toBeLessThan(652);
  await tierButton(figure, 1).focus();
  await page.keyboard.press("Enter");
  expect(await occupiedMB(grid)).toBeCloseTo(tierIntermediate, 2);
  await page.clock.runFor(1100);
  expect(await occupiedMB(grid)).toBeCloseTo(79, 2);
  expect(await firstCell!.evaluate((cell) => cell.isConnected)).toBe(true);
  const disk = figure
    .getByRole("group", { name: "Memory and disk metric" })
    .getByRole("button", { name: "Disk", exact: true });
  await disk.focus();
  await page.keyboard.press("Enter");
  await expect(disk).toHaveAttribute("aria-pressed", "true");
  await page.clock.runFor(1100);
  expect(await occupiedMB(grid)).toBeCloseTo(880, 2);
  expect(await firstCell!.evaluate((cell) => cell.isConnected)).toBe(true);
  expect(errors).toEqual([]);
});

test("hardware geometry and light move, pause, and stop offscreen", async ({
  page,
}) => {
  const { figure, errors } = await openFootprint(page);
  const grid = figure.locator('[data-footprint-grid="0"]');
  const startGeometry = await gridGeometry(grid);
  const startLight = await prism(grid);
  await expect
    .poll(() => gridGeometry(grid), {
      message: "the hardware geometry must move, not only its colors",
    })
    .not.toEqual(startGeometry);
  await expect.poll(() => prism(grid)).not.toEqual(startLight);
  const attachments = await grid
    .locator("[data-footprint-cell]")
    .evaluateAll((cells) =>
      cells.map((cell) => {
        const matrix = (selector: string) => {
          const value = cell
            .querySelector<SVGGraphicsElement>(selector)!
            .getScreenCTM()!;
          return [value.a, value.b, value.c, value.d, value.e, value.f];
        };
        return {
          slot: matrix("[data-footprint-slot]"),
          fill: matrix("[data-footprint-fill]"),
        };
      }),
    );
  for (const { slot, fill } of attachments) {
    expect(
      fill,
      "animated fills must stay attached to their projected base cells",
    ).toEqual(slot);
  }
  expect(
    await occupiedMB(grid),
    "ambient breathing must not change the represented memory",
  ).toBeCloseTo(2100, 2);
  const metric = figure
    .getByRole("group", { name: "Memory and disk metric" })
    .getByRole("button", { name: "RAM", exact: true });
  const underline = () =>
    metric.evaluate(
      (element) => getComputedStyle(element, "::after").backgroundPosition,
    );
  const initialUnderline = await underline();
  await expect.poll(underline).not.toBe(initialUnderline);
  const style = await metric.evaluate((element) => {
    const body = getComputedStyle(element),
      line = getComputedStyle(element, "::after");
    return {
      family: body.fontFamily,
      weight: body.fontWeight,
      radius: body.borderRadius,
      border: body.borderTopWidth,
      left: line.left,
      width: line.width,
      buttonWidth: element.getBoundingClientRect().width,
      background: line.backgroundImage,
    };
  });
  expect(style.family).toContain("Geist");
  expect(style.weight).toBe("400");
  expect(style.radius).toBe("0px");
  expect(style.border).toBe("0px");
  expect(style.background).toContain("linear-gradient");
  expect(parseFloat(style.width) / style.buttonWidth).toBeCloseTo(0.6, 2);
  expect(parseFloat(style.left) / style.buttonWidth).toBeCloseTo(0.2, 2);
  await figure
    .getByRole("button", { name: "Pause footprint animation" })
    .click();
  await expect(page.locator("html")).toHaveAttribute("data-motion", "paused");
  await expectStill(grid);
  const pausedUnderline = await underline();
  await new Promise((resolve) => setTimeout(resolve, 250));
  expect(await underline()).toBe(pausedUnderline);
  await figure
    .getByRole("button", { name: "Resume footprint animation" })
    .click();
  await grid.scrollIntoViewIfNeeded();
  const resumed = await gridGeometry(grid);
  await expect.poll(() => gridGeometry(grid)).not.toEqual(resumed);
  await page
    .getByRole("heading", { name: "Introducing Vorpal", exact: true })
    .scrollIntoViewIfNeeded();
  expect(
    await grid.evaluate(
      (element) => element.getBoundingClientRect().top > innerHeight + 32,
    ),
  ).toBe(true);
  await expectStill(grid);
  await grid.scrollIntoViewIfNeeded();
  const reentered = await gridGeometry(grid);
  await expect.poll(() => gridGeometry(grid)).not.toEqual(reentered);
  expect(errors).toEqual([]);
});

test("initial and live reduced motion settle measurements and preserve usable controls", async ({
  page,
}) => {
  await page.clock.install();
  await page.emulateMedia({ reducedMotion: "reduce" });
  const { figure, errors } = await openFootprint(page);
  const grid = figure.locator('[data-footprint-grid="0"]');
  await expect(
    figure.getByRole("button", { name: "Footprint follows reduced motion" }),
  ).toBeDisabled();
  await expectStill(grid);
  await figure
    .getByRole("button", { name: "Next footprint repository" })
    .click();
  expect(await occupiedMB(grid)).toBeCloseTo(110, 2);
  await expectStill(grid);
  await figure
    .getByRole("button", { name: "Previous footprint repository" })
    .click();
  expect(await occupiedMB(grid)).toBeCloseTo(2100, 2);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(page.locator("html")).toHaveAttribute("data-motion", "playing");
  const initialGeometry = await gridGeometry(grid);
  await expect.poll(() => gridGeometry(grid)).not.toEqual(initialGeometry);
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  await page.clock.runFor(250);
  await figure
    .getByRole("button", { name: "Next footprint repository" })
    .click();
  await page.clock.runFor(250);
  const intermediate = await occupiedMB(grid);
  expect(intermediate).toBeGreaterThan(110);
  expect(intermediate).toBeLessThan(2100);
  await figure
    .getByRole("button", { name: "Pause footprint animation" })
    .click();
  expect(await occupiedMB(grid)).toBeCloseTo(intermediate, 2);
  // Reduced motion must settle even if manual pause already made paused=true.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(
    figure.getByRole("button", { name: "Footprint follows reduced motion" }),
  ).toBeDisabled();
  expect(await occupiedMB(grid)).toBeCloseTo(110, 2);
  await expectStill(grid);
  await figure
    .getByRole("button", { name: "Next footprint repository" })
    .click();
  expect(await occupiedMB(grid)).toBeCloseTo(65, 2);
  await expectStill(grid);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(
    figure.getByRole("button", { name: "Resume footprint animation" }),
  ).toBeEnabled();
  await expectStill(grid);
  await figure
    .getByRole("button", { name: "Resume footprint animation" })
    .click();
  await page.clock.runFor(100);
  const resumed = await gridGeometry(grid);
  await page.clock.runFor(400);
  expect(await gridGeometry(grid)).not.toEqual(resumed);
  expect(errors).toEqual([]);
});
