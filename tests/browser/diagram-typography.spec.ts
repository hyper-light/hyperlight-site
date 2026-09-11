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

test("Vorpal diagram names, identifiers, tokens and chart labels share the wireframe lettering", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/blog/introducing-vorpal");
  await page.evaluate(() => document.fonts.ready);
  for (const selector of [
    "[data-architecture-flow]",
    "[data-embedding-scene]",
    "[data-ranking-art]",
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
