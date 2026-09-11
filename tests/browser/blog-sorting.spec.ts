import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const newest = [
  "Agentic Proof of Work",
  "Introducing Vorpal",
  "Announcing Hyperlight",
];
const alphabetical = [
  "Agentic Proof of Work",
  "Announcing Hyperlight",
  "Introducing Vorpal",
];

test("blog defaults to newest first and composes all sort modes with search and categories", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/blog");
  const titles = page.locator(".blog-catalog .post-row h3");
  const sort = page.getByRole("combobox", { name: "Sort posts" });
  const search = page.getByRole("searchbox", { name: "Search posts" });
  await expect(sort.locator("option:checked")).toHaveText("Newest first");
  await expect(titles).toHaveText(newest);
  await expect(page.locator(".blog-catalog .post-row time")).toHaveCount(3);
  for (const time of await page.locator(".blog-catalog .post-row time").all()) {
    await expect(time).toHaveAttribute("datetime", "2026-09-10");
  }

  await sort.focus();
  await expect(sort).toBeFocused();
  await sort.selectOption({ label: "Oldest first" });
  await expect(titles).toHaveText([...newest].reverse());
  await sort.selectOption({ label: "Name A–Z" });
  await expect(titles).toHaveText(alphabetical);
  await sort.selectOption({ label: "Name Z–A" });
  await expect(titles).toHaveText([...alphabetical].reverse());

  await page.getByRole("tab", { name: "Engineering", exact: true }).click();
  await expect(titles).toHaveText([
    "Introducing Vorpal",
    "Agentic Proof of Work",
  ]);
  await search.fill("vorpal");
  await expect(titles).toHaveText(["Introducing Vorpal"]);
  await page.getByRole("button", { name: "Clear post search" }).click();
  await expect(titles).toHaveText([
    "Introducing Vorpal",
    "Agentic Proof of Work",
  ]);
  await expect(sort.locator("option:checked")).toHaveText("Name Z–A");

  await page.getByRole("tab", { name: "Announcements", exact: true }).click();
  await expect(titles).toHaveText(["Announcing Hyperlight"]);
  await search.fill("no-such-post");
  await expect(
    page.getByRole("heading", { name: "Nothing here just yet." }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Clear filters", exact: true })
    .click();
  await expect(titles).toHaveText([...alphabetical].reverse());
  await expect(sort.locator("option:checked")).toHaveText("Name Z–A");
  await sort.selectOption({ label: "Newest first" });
  await expect(titles).toHaveText(newest);
  expect(errors).toEqual([]);
});

test("blog sort controls remain accessible and fit desktop and narrow mobile layouts", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/blog");
  const sort = page.getByRole("combobox", { name: "Sort posts" });
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect(sort).toBeVisible();
    const box = await sort.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height).toBeGreaterThanOrEqual(44);
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(width);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page
      .locator(".blog-catalog .catalog-toolbar")
      .screenshot({ path: testInfo.outputPath(`toolbar-${width}.png`) });
  }
  const report = await new AxeBuilder({ page })
    .include(".blog-catalog")
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(report.violations).toEqual([]);
});
