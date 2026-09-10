import { expect, test } from "@playwright/test";
import type { Locator } from "@playwright/test";

async function seamPosition(art: Locator) {
  return art
    .locator("[data-mantle-seam]")
    .first()
    .evaluate((element) => {
      if (!(element instanceof SVGPathElement))
        throw new Error("Expected the Mantle seam");
      const matrix = element.getScreenCTM();
      if (!matrix) throw new Error("The Mantle seam must be rendered");
      const point = element
        .getPointAtLength(element.getTotalLength() / 2)
        .matrixTransform(matrix);
      return { x: point.x, y: point.y };
    });
}

async function fingerprint(art: Locator) {
  return art.evaluate((element) => {
    let hash = 0;
    for (const character of element.innerHTML)
      hash = ((hash << 5) - hash + character.charCodeAt(0)) | 0;
    return hash;
  });
}

async function expectStill(art: Locator) {
  await art.page().waitForTimeout(100);
  const paused = await fingerprint(art);
  await art.page().waitForTimeout(350);
  expect(
    await fingerprint(art),
    "Mantle's geometry and lighting should hold their pose",
  ).toBe(paused);
  return paused;
}

test("Mantle has clear short-interval motion at mobile card size and honors pause preferences", async ({
  page,
  isMobile,
}) => {
  // Keep the same mobile card size when comparing Chrome, Firefox, and WebKit.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/projects");
  await expect(page.locator("html")).toHaveAttribute("data-motion", "playing");
  await page.getByRole("searchbox", { name: "Search projects" }).fill("mantle");
  const card = page.locator(".project-card");
  await expect(card).toHaveCount(1);
  await card.scrollIntoViewIfNeeded();
  const art = card.locator('[data-project-study="mantle"] > svg');
  await expect(art).toBeVisible();
  await art.scrollIntoViewIfNeeded();
  await expect(card).toHaveAttribute("data-active", "true");

  const first = await seamPosition(art);
  let displacement = 0;
  for (let sample = 0; sample < 4; sample++) {
    await page.waitForTimeout(300);
    const next = await seamPosition(art);
    displacement = Math.max(
      displacement,
      Math.hypot(next.x - first.x, next.y - first.y),
    );
  }
  // The original 348px card moved its luminous seam only 1.71 CSS px in 1.2s.
  // Five CSS pixels protects visible travel, not merely changed SVG decimals.
  expect(
    displacement,
    "Mantle's luminous seam should visibly travel within 1.2 seconds",
  ).toBeGreaterThanOrEqual(5);

  const pause = page.getByRole("button", { name: "Pause motion", exact: true });
  if (isMobile) await pause.tap();
  else await pause.click();
  await art.scrollIntoViewIfNeeded();
  await expect(card).toHaveAttribute("data-active", "false");
  const paused = await expectStill(art);
  const resume = page.getByRole("button", {
    name: "Resume motion",
    exact: true,
  });
  if (isMobile) await resume.tap();
  else await resume.click();
  await art.scrollIntoViewIfNeeded();
  await expect(card).toHaveAttribute("data-active", "true");
  await expect.poll(() => fingerprint(art)).not.toBe(paused);

  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(card).toHaveAttribute("data-active", "false");
  await expectStill(art);
  await page.locator(".site-footer").scrollIntoViewIfNeeded();
  await art.scrollIntoViewIfNeeded();
  await expectStill(art);
});
