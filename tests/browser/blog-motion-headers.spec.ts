import { expect, test } from "@playwright/test";
import { readdirSync } from "node:fs";

const posts = readdirSync("content/posts")
  .filter((file) => /\.mdx?$/.test(file))
  .map((file) => file.replace(/\.mdx?$/, ""));

for (const post of posts) {
  test(`${post}: every mobile animation header puts motion controls below its title`, async ({
    page,
  }, testInfo) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`/blog/${post}`);
    await page.evaluate(() => document.fonts.ready);
    const headers = page.locator(
      "figure > :is(header, div):has(h3):has(button[aria-label])",
    );
    const count = await headers.count();
    // Both animated articles must be covered, not just the combined lifecycle.
    if (
      post === "agentic-proof-of-work" ||
      post === "introducing-vorpal" ||
      post === "introducing-slates"
    )
      expect(count).toBeGreaterThan(1);

    for (const width of [320, 390, 700]) {
      await page.setViewportSize({ width, height: 900 });
      for (let index = 0; index < count; index++) {
        const header = headers.nth(index);
        await expect(header).toHaveCSS("flex-direction", "column");
        const dimensions = await header.evaluate((element) => {
          const rect = (target: Element) => {
            const { left, right, top, bottom, width, height } =
              target.getBoundingClientRect();
            return { left, right, top, bottom, width, height };
          };
          return {
            header: rect(element),
            heading: rect(element.querySelector("h3")!),
            title: element.querySelector("h3")!.textContent,
            buttons: Array.from(
              element.querySelectorAll("button"),
              (button) => ({
                ...rect(button),
                label: button.getAttribute("aria-label"),
                border: getComputedStyle(button).borderTopWidth,
                color: getComputedStyle(button).borderTopColor,
                radius: getComputedStyle(button).borderRadius,
                disabled: button.disabled,
                unavailable: button.hasAttribute("data-unavailable-replay"),
                opacity: Number(getComputedStyle(button).opacity),
              }),
            ),
          };
        });
        const first = dimensions.buttons[0];
        const context = `${post}: ${dimensions.title} at ${width}px`;
        expect(dimensions.buttons, context).toHaveLength(2);
        expect(first.label, context).toMatch(/^Replay /);
        if (first.unavailable) {
          expect(first.disabled, context).toBe(true);
          expect(first.opacity, context).toBeLessThanOrEqual(0.4);
        } else {
          expect(first.disabled, context).toBe(false);
        }
        expect(first.left, context).toBeCloseTo(dimensions.heading.left, 1);
        expect(first.top, context).toBeGreaterThanOrEqual(
          dimensions.heading.bottom + 12,
        );
        for (const [buttonIndex, button] of dimensions.buttons.entries()) {
          expect(button.top, context).toBe(first.top);
          expect(button.width, context).toBe(44);
          expect(button.height, context).toBe(44);
          expect(button.border, context).toBe("1px");
          expect(button.color, context).not.toBe("rgba(0, 0, 0, 0)");
          expect(button.radius, context).toBe("50%");
          expect(button.right, context).toBeLessThanOrEqual(
            dimensions.header.right,
          );
          expect(button.bottom, context).toBeLessThanOrEqual(
            dimensions.header.bottom,
          );
          if (buttonIndex > 0)
            expect(button.left, context).toBeGreaterThanOrEqual(
              dimensions.buttons[buttonIndex - 1].right + 8,
            );
        }
      }
      if (count && width === 390)
        await headers.first().screenshot({
          path: testInfo.outputPath("mobile-animation-header.png"),
        });
    }

    await page.setViewportSize({ width: 1440, height: 1000 });
    for (let index = 0; index < count; index++)
      await expect(headers.nth(index)).toHaveCSS("flex-direction", "row");
    for (const placeholder of await page
      .locator("[data-unavailable-replay]")
      .all())
      await expect(placeholder).toBeHidden();
  });
}
