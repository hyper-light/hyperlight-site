import { expect, test } from "@playwright/test";
import type { Locator } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function underlinePosition(link: Locator) {
  return link.evaluate(
    (element) => getComputedStyle(element, "::after").backgroundPosition,
  );
}

test("the active desktop underline moves its prismatic color", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "The desktop underline is hidden in the mobile menu.");
  await page.goto("/projects");
  const link = page
    .getByRole("navigation", { name: "Main navigation", exact: true })
    .getByRole("link", { name: "Projects", exact: true });
  await expect(link).toHaveAttribute("aria-current", "page");
  const initial = await underlinePosition(link);
  await expect
    .poll(() => underlinePosition(link), {
      timeout: 4000,
      message:
        "The active navigation underline should visibly shift its gradient",
    })
    .not.toBe(initial);
});

test("desktop navigation items have equal hit areas and text treatment", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "Desktop navigation is checked at desktop breakpoints.");
  for (const width of [1440, 900, 768]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/projects");
    const navigation = page.getByRole("navigation", {
      name: "Main navigation",
      exact: true,
    });
    await expect(navigation).toBeVisible();
    const links = navigation.getByRole("link");
    await expect(links).toHaveText(["Projects", "Blog", "About"]);
    const metrics = await links.evaluateAll((elements) =>
      elements.map((element) => {
        const box = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return {
          text: element.textContent,
          width: box.width,
          height: box.height,
          treatment: {
            fontSize: style.fontSize,
            fontWeight: style.fontWeight,
            lineHeight: style.lineHeight,
            letterSpacing: style.letterSpacing,
            padding: style.padding,
            alignItems: style.alignItems,
            justifyContent: style.justifyContent,
          },
        };
      }),
    );
    for (const item of metrics) {
      expect(
        item.width,
        `${item.text} should match Projects' hit-area width at ${width}px`,
      ).toBeCloseTo(metrics[0].width, 1);
      expect(
        item.height,
        `${item.text} should match Projects' hit-area height at ${width}px`,
      ).toBeCloseTo(metrics[0].height, 1);
      expect(item.width).toBeGreaterThanOrEqual(44);
      expect(item.height).toBeGreaterThanOrEqual(44);
      expect(
        item.treatment,
        `${item.text} should use the same text treatment`,
      ).toEqual(metrics[0].treatment);
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
    ).toBe(false);
  }
});

test("active underlines have consistent size across navigation and nested routes", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "The desktop underline is hidden in the mobile menu.");
  test.setTimeout(60000);
  const routes = [
    ["/projects", "Projects"],
    ["/projects/hoard", "Projects"],
    ["/blog", "Blog"],
    ["/blog/a-codebase-is-more-than-text", "Blog"],
    ["/about", "About"],
  ];
  for (const width of [1440, 768]) {
    await page.setViewportSize({ width, height: 1000 });
    let reference: { width: number; height: number } | undefined;
    for (const [route, label] of routes) {
      await page.goto(route);
      const navigation = page.getByRole("navigation", {
        name: "Main navigation",
        exact: true,
      });
      const active = navigation.locator('[aria-current="page"]');
      await expect(active).toHaveCount(1);
      await expect(active).toHaveText(label);
      const underline = await active.evaluate((element) => {
        const style = getComputedStyle(element, "::after");
        return {
          width: parseFloat(style.width),
          height: parseFloat(style.height),
          content: style.content,
          opacity: Number(style.opacity),
          image: style.backgroundImage,
          linkWidth: element.getBoundingClientRect().width,
        };
      });
      expect(
        underline.content,
        `${route} should visibly mark its current section`,
      ).not.toBe("none");
      expect(underline.opacity).toBeGreaterThan(0);
      expect(underline.image).toContain("linear-gradient");
      expect(underline.width).toBeGreaterThan(10);
      expect(underline.height).toBeGreaterThan(0);
      expect(underline.width).toBeLessThanOrEqual(underline.linkWidth + 1);
      if (!reference) reference = underline;
      expect(
        underline.width,
        `${route} should use the same underline width at ${width}px`,
      ).toBeCloseTo(reference.width, 1);
      expect(
        underline.height,
        `${route} should use the same underline height at ${width}px`,
      ).toBeCloseTo(reference.height, 1);
      const position = await underlinePosition(active);
      await expect
        .poll(() => underlinePosition(active), {
          message: `${route}'s active underline should move`,
        })
        .not.toBe(position);
    }
  }
});

test("global pause and reduced motion freeze the active navigation underline", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "The desktop underline is hidden in the mobile menu.");
  await page.goto("/about");
  const active = page
    .getByRole("navigation", { name: "Main navigation", exact: true })
    .getByRole("link", { name: "About", exact: true });
  const initial = await underlinePosition(active);
  await expect.poll(() => underlinePosition(active)).not.toBe(initial);
  await page.getByRole("button", { name: "Pause motion", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-motion", "paused");
  await expect
    .poll(() =>
      active.evaluate(
        (element) => getComputedStyle(element, "::after").animationPlayState,
      ),
    )
    .toBe("paused");
  const paused = await underlinePosition(active);
  await page.waitForTimeout(350);
  expect(
    await underlinePosition(active),
    "Global pause should freeze the active underline",
  ).toBe(paused);
  await page
    .getByRole("button", { name: "Resume motion", exact: true })
    .click();
  await expect(page.locator("html")).toHaveAttribute("data-motion", "playing");
  await expect
    .poll(() => underlinePosition(active), {
      message: "Resuming should restart the active underline",
    })
    .not.toBe(paused);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator("html")).toHaveAttribute("data-motion", "paused");
  await expect
    .poll(() =>
      active.evaluate(
        (element) => getComputedStyle(element, "::after").animationPlayState,
      ),
    )
    .toBe("paused");
  const reduced = await underlinePosition(active);
  await page.waitForTimeout(350);
  expect(
    await underlinePosition(active),
    "Device reduced motion should freeze the active underline",
  ).toBe(reduced);
  await expect(active).toHaveAttribute("aria-current", "page");
  await expect(
    page.getByRole("button", { name: "Reduced motion", exact: true }),
  ).toBeDisabled();
});

test("mobile navigation retains equal touch targets, focus containment, and working links", async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, "This case exercises the touch navigation drawer.");
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/projects/hoard");
    const trigger = page.getByRole("button", { name: "Open navigation" });
    await expect(trigger).toBeVisible();
    const triggerBox = await trigger.boundingBox();
    expect(triggerBox!.width).toBeGreaterThanOrEqual(44);
    expect(triggerBox!.height).toBeGreaterThanOrEqual(44);
    await trigger.tap();
    const dialog = page.getByRole("dialog", {
      name: "Navigation",
      exact: true,
    });
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveCSS("opacity", "1");
    const navigation = dialog.getByRole("navigation", {
      name: "Mobile navigation",
      exact: true,
    });
    const metrics = [];
    for (const label of ["Projects", "Blog", "About"]) {
      const link = navigation.getByRole("link", { name: label, exact: true });
      await expect(link).toBeVisible();
      metrics.push(
        await link.evaluate((element) => {
          const box = element.getBoundingClientRect();
          return { width: box.width, height: box.height };
        }),
      );
    }
    for (const metric of metrics) {
      expect(metric.width).toBeCloseTo(metrics[0].width, 1);
      expect(metric.height).toBeCloseTo(metrics[0].height, 1);
      expect(metric.width).toBeGreaterThanOrEqual(44);
      expect(metric.height).toBeGreaterThanOrEqual(44);
    }
    await expect(
      navigation.getByRole("link", { name: "Projects", exact: true }),
    ).toHaveAttribute("aria-current", "page");
    await navigation.getByRole("link", { name: /GitHub/ }).focus();
    await page.keyboard.press("Tab");
    expect(
      await dialog.evaluate((element) =>
        element.contains(document.activeElement),
      ),
      "Tab should remain inside the open navigation dialog",
    ).toBe(true);
    const accessibility = await new AxeBuilder({ page })
      .include("#mobile-navigation")
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
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    await expect(trigger).toBeFocused();
    for (const [label, route] of [
      ["Blog", "/blog"],
      ["About", "/about"],
      ["Projects", "/projects"],
    ]) {
      await trigger.tap();
      await dialog.getByRole("link", { name: label, exact: true }).tap();
      await expect(page).toHaveURL(route);
      await expect(dialog).not.toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
      ).toBe(false);
    }
  }
});
