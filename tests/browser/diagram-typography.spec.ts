import { expect, test, type Locator } from "@playwright/test";

async function expectDiagramLettering(labels: Locator) {
  const typography = await labels.evaluateAll((elements) =>
    elements.map((element) => {
      const style = getComputedStyle(element);
      return {
        text: element.textContent,
        family: style.fontFamily,
        weight: style.fontWeight,
      };
    }),
  );
  expect(typography.length).toBeGreaterThan(0);
  for (const label of typography) {
    expect(label.family, label.text ?? "").toContain("Geist Mono Variable");
    expect(label.weight, label.text ?? "").toBe("400");
  }
}

test("all proof scenes use instrument lettering without changing article typography", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/blog/agentic-proof-of-work");
  await page.evaluate(() => document.fonts.ready);
  const figures = page.locator("[data-proof-figure]");
  await expect(figures).toHaveCount(9);
  for (const figure of await figures.all()) {
    await expectDiagramLettering(
      figure.locator("[data-proof-scene]:visible text"),
    );
    await expect(figure.getByRole("heading").first()).toHaveCSS(
      "font-family",
      /Geist Variable/,
    );
    for (const tab of await figure.getByRole("tab").all()) {
      await expect(tab).toHaveCSS("font-family", /Geist Variable/);
    }
  }

  const claim = figures.filter({ hasText: "Claim Lifecycle" });
  const names = claim.locator(
    '[data-proof-scene]:visible [data-proof-type="name"]',
  );
  await expect(names).toHaveCount(3);
  for (const name of await names.all()) {
    await expect(name).toHaveCSS("text-transform", "uppercase");
    const tracking = await name.evaluate((element) =>
      Number.parseFloat(getComputedStyle(element).letterSpacing),
    );
    expect(tracking).toBeGreaterThan(0.5);
  }
  await expect(
    claim.locator('[data-proof-scene]:visible [data-proof-label="acceptance"]'),
  ).toHaveCSS("text-transform", "none");
  await claim.locator("[data-proof-scene]:visible").screenshot({
    path: testInfo.outputPath("claim-lettering.png"),
  });
});

test("Vorpal architecture, tokens and chart labels retain their wireframe lettering", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/blog/introducing-vorpal");
  await page.evaluate(() => document.fonts.ready);
  for (const selector of [
    "[data-architecture-flow]",
    "[data-embedding-scene]",
  ]) {
    const svg = page.locator(`${selector}:visible`);
    await expectDiagramLettering(svg.locator("text"));
    await svg.screenshot({
      path: testInfo.outputPath(`${selector.slice(1, -1)}-lettering.png`),
    });
  }
  for (const selector of [
    "[data-vorpal-benchmarks]",
    "[data-vorpal-tgrep]",
    "[data-vorpal-comparisons]",
  ]) {
    for (const figure of await page.locator(selector).all()) {
      await expectDiagramLettering(figure.locator("dl dt, dl dd"));
      await expect(figure.getByRole("heading").first()).toHaveCSS(
        "font-family",
        /Geist Variable/,
      );
    }
  }
  await expectDiagramLettering(
    page.locator('[data-vorpal-footprint] [class*="tierHeading"] h5'),
  );
});

test("ranking uses normal-width shaded identifiers while keeping its formula and controls distinct", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/blog/introducing-vorpal");
  const figure = page.locator("[data-vorpal-ranking]");
  const svg = figure.locator("[data-ranking-art]:visible");
  await svg.scrollIntoViewIfNeeded();
  await page.evaluate(() => document.fonts.ready);
  expect(
    await page.evaluate(() =>
      Array.from(document.fonts).some(
        (font) => font.family === "Barlow" && font.status === "loaded",
      ),
    ),
  ).toBe(true);
  for (const label of await svg
    .locator('text:not([data-ranking-label="fusion"])')
    .all()) {
    await expect(label).toHaveCSS("font-family", /"?Barlow"?,/);
    await expect(label).toHaveCSS("font-weight", "400");
  }
  const formula = svg.locator('[data-ranking-label="fusion"]');
  await expect(formula).toHaveText("Σ 1 / (60 + r)");
  await expect(formula).toHaveCSS("font-family", /Geist Mono Variable/);
  await expect(formula).toHaveCSS("font-weight", "300");
  for (const label of await svg
    .locator(
      '[data-ranking-label^="candidate-"], [data-ranking-label^="output-"]:not([data-ranking-label^="output-rank-"])',
    )
    .all()) {
    const stops = await label.evaluate((element) => {
      const fill = element.style.fill;
      const id = fill.slice(fill.lastIndexOf("#") + 1).replace(/["')]/g, "");
      const gradient = document.getElementById(id);
      return Array.from(gradient?.querySelectorAll("stop") ?? [], (stop) =>
        stop.getAttribute("stop-color"),
      );
    });
    expect(stops).toEqual(["#c2d4d6", "#aebdc9", "#a89caf"]);
  }
  await expect(figure.getByRole("heading").first()).toHaveCSS(
    "font-family",
    /Geist Variable/,
  );
  for (const button of await figure.getByRole("button").all())
    await expect(button).toHaveCSS("font-family", /Geist Variable/);
  await svg.screenshot({
    path: testInfo.outputPath("ranking-type-and-hue.png"),
  });
});

test("monospaced chart names leave room for their values on narrow screens", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/blog/introducing-vorpal");
  await page.evaluate(() => document.fonts.ready);
  for (const width of testInfo.project.name.includes("mobile")
    ? [390, 320]
    : [1440, 768]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const [index, figure] of (
      await page
        .locator(
          "[data-vorpal-benchmarks], [data-vorpal-tgrep], [data-vorpal-comparisons]",
        )
        .all()
    ).entries()) {
      const tabs = await figure.getByRole("tab").all();
      for (const tab of tabs.length ? tabs : [null]) {
        if (tab) await tab.click();
        const failures = await figure.locator("dl > div").evaluateAll((rows) =>
          rows.flatMap((row) => {
            const name = row.querySelector("dt")!;
            const value = row.querySelector("dd")!;
            const nameBox = name.getBoundingClientRect();
            const valueBox = value.getBoundingClientRect();
            const range = document.createRange();
            range.selectNodeContents(name);
            const ink = range.getBoundingClientRect();
            return ink.right > valueBox.left - 3 ||
              ink.right > nameBox.right + 0.5
              ? [name.textContent]
              : [];
          }),
        );
        expect(failures, `${index} at ${width}px`).toEqual([]);
      }
      await figure.screenshot({
        path: testInfo.outputPath(`chart-${index}-${width}.png`),
      });
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
});

test("record lettering is attached to the glass plane rather than a camera-facing overlay", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/blog/agentic-proof-of-work");
  const figure = page.locator('[data-proof-figure="work-order"]');
  const labels = figure.locator(
    "[data-proof-scene]:visible [data-proof-surface]",
  );
  const planes = await labels.evaluateAll((elements) =>
    elements.map((element) => {
      const label = element as SVGTextElement;
      const matrix = label.transform.baseVal.consolidate()?.matrix;
      const x = label.x.baseVal.getItem(0).value;
      const y = label.y.baseVal.getItem(0).value;
      const transformed = new DOMPoint(x, y).matrixTransform(matrix);
      return {
        id: label.dataset.proofLabel,
        transform: label.getAttribute("transform"),
        scaleX: matrix?.a,
        shear: matrix?.c,
        anchorError: Math.hypot(transformed.x - x, transformed.y - y),
      };
    }),
  );
  expect(planes.length).toBeGreaterThan(10);
  for (const plane of planes) {
    expect(plane.transform, plane.id).toMatch(/^matrix\(/);
    expect(plane.scaleX, plane.id).toBeGreaterThan(0.7);
    expect(plane.scaleX, plane.id).toBeLessThan(1);
    expect(Math.abs(plane.shear ?? 0), plane.id).toBeGreaterThan(0.01);
    expect(plane.anchorError, plane.id).toBeLessThan(0.1);
  }
  await expect(
    figure.locator(
      '[data-proof-scene]:visible [data-proof-label="post-label"]',
    ),
  ).not.toHaveAttribute("transform");
});

test("claim state changes visibly transfer, write and acknowledge in order", async ({
  page,
}, testInfo) => {
  await page.clock.install();
  await page.goto("/blog/agentic-proof-of-work");
  await page.evaluate(() => document.fonts.ready);
  const figure = page.locator('[data-proof-figure="work-order"]');
  const svg = figure.locator("[data-proof-scene]:visible");
  await svg.scrollIntoViewIfNeeded();
  await page.clock.pauseAt(new Date(Date.now() + 100));
  await figure.getByRole("tab", { name: "Draft", exact: true }).click();
  await page.clock.runFor(100);
  const packet = svg.locator('[data-proof-path="post-direction-probe"]');
  const source = await packet.getAttribute("d");
  await figure.getByRole("tab", { name: "Post", exact: true }).click();
  await page.clock.runFor(800);
  expect(await packet.getAttribute("d")).not.toEqual(source);
  expect(Number(await packet.getAttribute("opacity"))).toBeGreaterThan(0.5);
  expect(Number(await svg.getAttribute("data-proof-selection"))).toBeLessThan(
    0.5,
  );
  await svg.screenshot({ path: testInfo.outputPath("claim-01-transfer.png") });
  await page.clock.runFor(800);
  const sweep = svg.locator('[data-proof-path="claim-post-scan"]');
  expect(Number(await sweep.getAttribute("opacity"))).toBeGreaterThan(0.3);
  await svg.screenshot({ path: testInfo.outputPath("claim-02-write.png") });
  await page.clock.runFor(1000);
  await expect(svg).toHaveAttribute("data-proof-selection", "1.000");
  await expect(svg.locator('[data-proof-label="claim-state"]')).toHaveText(
    "Posted",
  );
  const receipt = svg.locator('[data-proof-path="work-receipt-skin"]');
  const emptyReceipt = await receipt.getAttribute("d");
  await figure.getByRole("tab", { name: "Accept", exact: true }).click();
  await page.clock.runFor(1300);
  expect(await receipt.getAttribute("d")).not.toEqual(emptyReceipt);
  expect(
    Number(
      await svg
        .locator('[data-proof-label="receipt-value"]')
        .getAttribute("opacity"),
    ),
  ).toBeLessThan(0.3);
  await svg.screenshot({ path: testInfo.outputPath("claim-03-receipt.png") });
  await page.clock.runFor(500);
  const ack = svg.locator('[data-proof-path="receipt-direction-probe"]');
  expect(Number(await ack.getAttribute("opacity"))).toBeGreaterThan(0.3);
  await svg.screenshot({ path: testInfo.outputPath("claim-04-ack.png") });
  await page.clock.runFor(800);
  await expect(svg).toHaveAttribute("data-proof-selection", "2.000");
  await expect(svg.locator('[data-proof-label="receipt-value"]')).toHaveText(
    "Generation 1 · Parser agent",
  );
  await expect(
    svg.locator('[data-proof-label="receipt-value"]'),
  ).toHaveAttribute("data-proof-surface", "work-receipt-skin");
  await expect(svg.locator('[data-proof-label="acceptance"]')).toHaveText(
    "Acceptance: not evaluated",
  );
});

test("responsive claim layout preserves the selected state without replaying hidden history", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.clock.install();
  await page.goto("/blog/agentic-proof-of-work");
  const figure = page.locator('[data-proof-figure="work-order"]');
  await figure.locator("[data-proof-scene]:visible").scrollIntoViewIfNeeded();
  await page.clock.pauseAt(new Date(Date.now() + 100));
  await figure.getByRole("tab", { name: "Accept", exact: true }).click();
  await page.clock.runFor(5000);
  await expect(figure.locator("[data-proof-scene]:visible")).toHaveAttribute(
    "data-proof-selection",
    "2.000",
  );
  await page.setViewportSize({ width: 390, height: 1000 });
  await expect(figure.locator("[data-proof-scene]:visible")).toHaveAttribute(
    "data-portrait",
    "true",
  );
  await expect(figure.locator("[data-proof-scene]:visible")).toHaveAttribute(
    "data-proof-selection",
    "2.000",
  );
});
