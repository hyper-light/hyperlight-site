import { approachProofScene } from "./proof-scene-helper";
import { expect, test, type Locator } from "@playwright/test";

async function expectSelectionVisible(rail: Locator) {
  await expect
    .poll(() =>
      rail.evaluate((element) => {
        const active = element.querySelector('[aria-selected="true"]')!;
        const outer = element.getBoundingClientRect();
        const inner = active.getBoundingClientRect();
        return inner.left >= outer.left - 1 && inner.right <= outer.right + 1;
      }),
    )
    .toBe(true);
}

test("lifecycle stages remain a single row with complete keyboard navigation", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/blog/agentic-proof-of-work");
  await page.evaluate(() => document.fonts.ready);
  const explorer = page.locator("[data-lifecycle-explorer]");
  await approachProofScene(explorer);
  const rail = explorer.locator("[data-proof-steps]");
  const dimensions = await rail.evaluate((element) => ({
    width: element.clientWidth,
    scrollWidth: element.scrollWidth,
    height: element.getBoundingClientRect().height,
    rows: new Set(
      Array.from(
        element.children,
        (child) => child.getBoundingClientRect().top,
      ),
    ).size,
    overflow: getComputedStyle(element).overflowX,
    narrowestStage: Math.min(
      ...Array.from(
        element.children,
        (child) => child.getBoundingClientRect().width,
      ),
    ),
  }));
  expect(dimensions.rows).toBe(1);
  expect(dimensions.height).toBeLessThanOrEqual(50);
  if (dimensions.width <= 700) {
    expect(dimensions.scrollWidth).toBeGreaterThan(dimensions.width);
    expect(dimensions.overflow).toBe("auto");
    expect(dimensions.narrowestStage).toBeGreaterThanOrEqual(72);
  } else {
    expect(dimensions.scrollWidth).toBe(dimensions.width);
    expect(dimensions.overflow).not.toBe("auto");
  }
  await rail.screenshot({ path: testInfo.outputPath("stage-rail-start.png") });
  const stages = rail.getByRole("tab");
  await stages.first().focus();
  await page.keyboard.press("End");
  await expect(stages.last()).toBeFocused();
  await expect(stages.last()).toHaveAttribute("aria-selected", "true");
  await expectSelectionVisible(rail);
  await page.keyboard.press("ArrowRight");
  await expect(stages.first()).toBeFocused();
  await expectSelectionVisible(rail);
  await page.keyboard.press("ArrowLeft");
  await expect(stages.last()).toBeFocused();
  await expectSelectionVisible(rail);
  await page.keyboard.press("Home");
  await expect(stages.first()).toBeFocused();
  await expectSelectionVisible(rail);

  await explorer.getByLabel("Evaluation outcome").selectOption("missing");
  await stages.first().focus();
  await page.keyboard.press("End");
  await expect(stages.last()).toHaveText("Record missing", {
    useInnerText: true,
  });
  await expectSelectionVisible(rail);
  await rail.screenshot({ path: testInfo.outputPath("stage-rail-end.png") });
  expect(
    await rail.evaluate((element) => element.getBoundingClientRect().height),
  ).toBe(dimensions.height);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("autoplay reveals the active lifecycle stage without scrolling the article", async ({
  page,
}) => {
  await page.clock.install();
  await page.goto("/blog/agentic-proof-of-work");
  await page.evaluate(() => document.fonts.ready);
  await page.clock.pauseAt(
    new Date(await page.evaluate(() => Date.now() + 1000)),
  );
  const explorer = page.locator("[data-lifecycle-explorer]");
  await approachProofScene(explorer);
  const rail = explorer.locator("[data-proof-steps]");
  const scene = explorer.locator("[data-proof-scene]:visible");
  await scene.scrollIntoViewIfNeeded();
  const scrollY = await page.evaluate(() => window.scrollY);
  for (let index = 1; index <= 4; index++) {
    await scene.evaluate(
      (element) =>
        new Promise<void>((resolve) => {
          const observer = new IntersectionObserver(
            (entries) => {
              if (entries.some((entry) => entry.intersectionRatio >= 0.25)) {
                observer.disconnect();
                resolve();
              }
            },
            { threshold: 0.25 },
          );
          observer.observe(element);
        }),
    );
    await page.clock.runFor(index === 1 ? 5100 : index === 2 ? 8500 : 5000);
    await expect(rail.getByRole("tab").nth(index)).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expectSelectionVisible(rail);
    expect(await page.evaluate(() => window.scrollY)).toBe(scrollY);
  }
});
