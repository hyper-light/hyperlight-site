import { expect, test } from "@playwright/test";

test("mobile lifecycle motion controls have their own aligned row", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/blog/agentic-proof-of-work");
  await page.evaluate(() => document.fonts.ready);
  const header = page.locator(
    '[data-proof-figure="lifecycle-journey"] > header',
  );
  for (const width of [320, 390, 700]) {
    await page.setViewportSize({ width, height: 900 });
    await expect
      .poll(() =>
        header.evaluate((element) => getComputedStyle(element).flexDirection),
      )
      .toBe("column");
    const dimensions = await header.evaluate((element) => {
      const rect = (target: Element) => {
        const { left, right, top, bottom, width, height } =
          target.getBoundingClientRect();
        return { left, right, top, bottom, width, height };
      };
      return {
        header: rect(element),
        heading: rect(element.querySelector("h3")!),
        buttons: Array.from(element.querySelectorAll("button"), rect),
      };
    });
    expect(dimensions.buttons).toHaveLength(2);
    const [replay, pause] = dimensions.buttons;
    expect(replay.top).toBe(pause.top);
    expect(replay.left).toBe(dimensions.heading.left);
    expect(replay.top).toBeGreaterThanOrEqual(dimensions.heading.bottom + 12);
    expect(pause.left).toBeGreaterThanOrEqual(replay.right + 8);
    for (const button of dimensions.buttons) {
      expect(button.width).toBe(44);
      expect(button.height).toBe(44);
      expect(button.left).toBeGreaterThanOrEqual(dimensions.header.left);
      expect(button.right).toBeLessThanOrEqual(dimensions.header.right);
      expect(button.bottom).toBeLessThanOrEqual(dimensions.header.bottom);
    }
    await header.screenshot({
      path: testInfo.outputPath(`header-${width}.png`),
    });
  }
});

test("desktop lifecycle header keeps its existing inline controls", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/blog/agentic-proof-of-work");
  const header = page.locator(
    '[data-proof-figure="lifecycle-journey"] > header',
  );
  await expect
    .poll(() =>
      header.evaluate((element) => getComputedStyle(element).flexDirection),
    )
    .toBe("row");
  const buttons = header.getByRole("button");
  const first = await buttons.nth(0).boundingBox();
  const second = await buttons.nth(1).boundingBox();
  expect(first!.y).toBe(second!.y);
});
