import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("landing page, buttons, and global motion control are accessible", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text().slice(0, 400));
  });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Any scale. Any place." }),
  ).toBeVisible();
  const button = page.getByRole("link", { name: "Explore the projects" });
  await expect(button).toHaveCSS("color", "rgb(17, 18, 20)");
  await expect(button).toHaveCSS("background-color", "rgb(228, 229, 231)");
  await page.getByRole("button", { name: "Pause ambient animation" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-motion", "paused");
  await expect(
    page.getByRole("button", { name: "Resume motion", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page
    .getByRole("button", { name: "Resume motion", exact: true })
    .click();
  await expect(page.locator("html")).toHaveAttribute("data-motion", "playing");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator("html")).toHaveAttribute("data-motion", "paused");
  const accessibility = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    accessibility.violations.map(({ id, nodes }) => ({
      id,
      nodes: nodes.map(({ target, failureSummary }) => ({
        target,
        failureSummary,
      })),
    })),
  ).toEqual([]);
  expect(errors).toEqual([]);
});

test("project filters, search, and empty state work together", async ({
  page,
}) => {
  await page.goto("/projects");
  await expect(page.locator(".project-card")).toHaveCount(7);
  await page.getByRole("tab", { name: /In design/ }).click();
  await expect(page.locator(".project-card")).toHaveCount(3);
  await page.getByRole("searchbox", { name: "Search projects" }).fill("veil");
  await expect(page.locator(".project-card")).toHaveCount(1);
  await page
    .getByRole("searchbox", { name: "Search projects" })
    .fill("not-a-project");
  await expect(
    page.getByRole("heading", { name: "No projects found." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(page.locator(".project-card")).toHaveCount(7);
  await page.getByRole("tab", { name: /All projects/ }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: /Available/ })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(page.locator(".project-card")).toHaveCount(2);
  const accessibility = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    accessibility.violations.map(({ id, nodes }) => ({
      id,
      nodes: nodes.map(({ target, failureSummary }) => ({
        target,
        failureSummary,
      })),
    })),
  ).toEqual([]);
});

test("writing is searchable and article headings have working anchors", async ({
  page,
}) => {
  await page.goto("/blog");
  await page.getByRole("searchbox", { name: "Search posts" }).fill("codebase");
  await expect(page.locator(".post-row")).toHaveCount(1);
  await page.locator(".post-row a").click();
  await expect(page.locator("#article-body")).toBeVisible();
  const firstHeadingLink = page
    .getByRole("navigation", { name: "Table of contents" })
    .getByRole("link")
    .first();
  const href = await firstHeadingLink.getAttribute("href");
  expect(href).toMatch(/^#heading-/);
  await firstHeadingLink.click();
  await expect(page).toHaveURL(new RegExp(`${href}$`));
  const accessibility = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    accessibility.violations.map(({ id, nodes }) => ({
      id,
      nodes: nodes.map(({ target, failureSummary }) => ({
        target,
        failureSummary,
      })),
    })),
  ).toEqual([]);
});

test("pages fit narrow screens and mobile navigation manages focus", async ({
  page,
  isMobile,
}) => {
  for (const width of isMobile ? [320, 360, 390, 768] : [1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of [
      "/",
      "/projects",
      "/blog",
      "/projects/vorpal",
      "/blog/a-codebase-is-more-than-text",
      "/about",
    ]) {
      await page.goto(route);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth,
      );
      expect(overflow, `${route} overflows at ${width}px`).toBe(false);
    }
  }
  if (isMobile) {
    await page.setViewportSize({ width: 390, height: 844 });
    const trigger = page.getByRole("button", { name: "Open navigation" });
    await trigger.click();
    const dialog = page.getByRole("dialog", { name: "Navigation" });
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    await expect(trigger).toBeFocused();
    await trigger.click();
    await dialog.getByRole("link", { name: "Projects", exact: true }).click();
    await expect(page).toHaveURL("/projects");
    await expect(dialog).not.toBeVisible();
  }
});

test("device reduced motion produces a static illustration", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-motion", "paused");
  await expect(
    page.getByRole("button", { name: "Reduced motion", exact: true }),
  ).toBeDisabled();
  const pausedAnimations = await page
    .locator(".graph-trace")
    .first()
    .evaluate((node) => getComputedStyle(node).animationPlayState);
  expect(pausedAnimations).toBe("paused");
});
