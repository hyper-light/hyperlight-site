import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("reference explanations work by tap without viewport or internal collisions", async ({
  page,
}, testInfo) => {
  test.setTimeout(180_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const widths = testInfo.project.name.includes("mobile") ? [320, 390] : [1440];
  for (const width of widths) {
    await page.setViewportSize({ width, height: 850 });
    for (const post of [
      "introducing-slates",
      "agentic-proof-of-work",
      "introducing-vorpal",
    ]) {
      await page.goto(`/blog/${post}`);
      const triggers = page.locator(
        '[data-reference] button[aria-label^="Explain:"]',
      );
      expect(await triggers.count()).toBeGreaterThan(15);
      const seen = new Set<string>();
      for (const trigger of await triggers.all()) {
        const title = (await trigger.getAttribute("aria-label"))!;
        if (seen.has(title)) continue;
        seen.add(title);
        await trigger.scrollIntoViewIfNeeded();
        await trigger.evaluate((button: HTMLButtonElement) => button.click());
        const dialog = page.getByRole("dialog");
        await expect(dialog).toBeVisible();
        const checkLayout = () =>
          dialog.evaluate((element) => {
            const r = element.getBoundingClientRect();
            const errors: string[] = [];
            if (
              r.left < 12 ||
              r.right > innerWidth - 12 ||
              r.top < 0 ||
              r.bottom > innerHeight
            )
              errors.push(
                `outside viewport: ${JSON.stringify(r.toJSON())} in ${innerWidth}x${innerHeight}`,
              );
            if (element.scrollWidth > element.clientWidth)
              errors.push("horizontal content overflow");
            const title = element.querySelector("h3")!.getBoundingClientRect();
            const close = element
              .querySelector('[aria-label="Close explanation"]')!
              .getBoundingClientRect();
            if (title.right > close.left - 6)
              errors.push("title overlaps close");
            return errors;
          });
        await expect
          .poll(checkLayout, {
            message: `${width}/${post}/${title}`,
            timeout: 2500,
          })
          .toEqual([]);
        await expect(
          dialog.getByRole("link", { name: "Read the source" }),
        ).toHaveAttribute("href", /^https:\/\//);
        if (await dialog.locator("[data-reference-example]").count()) {
          await dialog.getByRole("button", { name: "Next step" }).click();
          await expect(
            dialog.locator("[data-reference-example]"),
          ).toHaveAttribute("data-example-step", "1");
          await dialog.getByRole("button", { name: "Restart example" }).click();
          await expect(
            dialog.locator("[data-reference-example]"),
          ).toHaveAttribute("data-example-step", "0");
        }
        await dialog.getByRole("button", { name: "Close explanation" }).click();
        await expect(dialog).toHaveCount(0);
      }
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
  }
});

test("source navigation and keyboard disclosure remain accessible", async ({
  page,
}) => {
  await page.goto("/blog/introducing-slates");
  const reference = page
    .locator('[data-reference="introducing-slates:vfs"]')
    .first();
  await expect(reference.getByRole("link")).toHaveAttribute(
    "href",
    /github.com\/hyper-light\/slates\/blob\//,
  );
  await reference.getByRole("button").focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  const accessibility = await new AxeBuilder({ page })
    .include('[role="dialog"]')
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(accessibility.violations.map(({ id }) => id)).toEqual([]);
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
});
