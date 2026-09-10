import { expect, test } from "@playwright/test";
import type { Locator } from "@playwright/test";

async function appearance(rings: Locator) {
  return rings.evaluateAll((elements) =>
    elements.map((element) => {
      const style = getComputedStyle(element);
      return { transform: style.transform, borderColor: style.borderColor };
    }),
  );
}

for (const property of ["transform", "borderColor"] as const) {
  test(`the About optic animates its ${property}`, async ({
    page,
    isMobile,
  }) => {
    test.skip(
      isMobile,
      "The existing mobile layout hides the decorative optic.",
    );
    await page.goto("/about");
    const optic = page.locator(".about-optic");
    await optic.scrollIntoViewIfNeeded();
    await expect(optic).toBeVisible();
    await expect(optic).toHaveAttribute("aria-hidden", "true");
    const rings = optic.locator(":scope > span");
    await expect(rings).toHaveCount(9);
    await expect(page.locator("html")).toHaveAttribute(
      "data-motion",
      "playing",
    );
    const initial = (await appearance(rings)).map((ring) => ring[property]);
    await expect
      .poll(
        async () => (await appearance(rings)).map((ring) => ring[property]),
        {
          timeout: 4000,
          message: `The nine-ring optic should visibly change ${property}`,
        },
      )
      .not.toEqual(initial);
  });
}

test("global pause holds the optic's pose and colors, and resume restarts both", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "The existing mobile layout hides the decorative optic.");
  await page.goto("/about");
  const optic = page.locator(".about-optic");
  const rings = optic.locator(":scope > span");
  await optic.scrollIntoViewIfNeeded();
  await expect(rings).toHaveCount(9);
  await page.getByRole("button", { name: "Pause motion", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-motion", "paused");
  await optic.scrollIntoViewIfNeeded();
  const paused = await appearance(rings);
  await page.waitForTimeout(350);
  expect(
    await appearance(rings),
    "Global pause should freeze every ring's geometry and color",
  ).toEqual(paused);
  await page
    .getByRole("button", { name: "Resume motion", exact: true })
    .click();
  await expect(page.locator("html")).toHaveAttribute("data-motion", "playing");
  await optic.scrollIntoViewIfNeeded();
  for (const property of ["transform", "borderColor"] as const) {
    await expect
      .poll(
        async () => (await appearance(rings)).map((ring) => ring[property]),
        {
          message: `Resume should restart the optic's ${property}`,
        },
      )
      .not.toEqual(paused.map((ring) => ring[property]));
  }
});

test("device reduced motion keeps all nine rings static, including live changes", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "The existing mobile layout hides the decorative optic.");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/about");
  const optic = page.locator(".about-optic");
  const rings = optic.locator(":scope > span");
  await optic.scrollIntoViewIfNeeded();
  await expect(optic).toBeVisible();
  await expect(rings).toHaveCount(9);
  await expect(page.locator("html")).toHaveAttribute("data-motion", "paused");
  await expect(
    page.getByRole("button", { name: "Reduced motion", exact: true }),
  ).toBeDisabled();
  const reduced = await appearance(rings);
  expect(reduced.every((ring) => ring.transform !== "none")).toBe(true);
  await page.waitForTimeout(350);
  expect(await appearance(rings)).toEqual(reduced);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(page.locator("html")).toHaveAttribute("data-motion", "playing");
  await expect.poll(() => appearance(rings)).not.toEqual(reduced);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator("html")).toHaveAttribute("data-motion", "paused");
  const stopped = await appearance(rings);
  await page.waitForTimeout(350);
  expect(
    await appearance(rings),
    "Changing the device preference should stop the optic",
  ).toEqual(stopped);
});

test("mobile keeps the optic hidden without horizontal overflow", async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, "This case exercises the existing mobile layout.");
  await page.goto("/about");
  for (const width of [320, 390, 767]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.locator(".about-optic > span")).toHaveCount(9);
    await expect(page.locator(".about-optic")).toBeHidden();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      `About should fit a ${width}px viewport`,
    ).toBe(false);
  }
});
