import { expect, test, type Locator } from "@playwright/test";

async function expectHeaderClearance(figure: Locator, context: string) {
  const dimensions = await figure.evaluate((element) => {
    const header = element.querySelector(":scope > header")!;
    const rect = (target: Element) => {
      const { top, bottom, left, right, width, height } =
        target.getBoundingClientRect();
      return { top, bottom, left, right, width, height };
    };
    const buttons = Array.from(header.querySelectorAll("button"), rect).filter(
      (button) => button.width > 0 && button.height > 0,
    );
    const scenes = Array.from(element.querySelectorAll("svg"), rect).filter(
      (svg) => svg.width > 100,
    );
    return {
      header: rect(header),
      copy: rect(header.firstElementChild!),
      heading: rect(header.querySelector("h3")!),
      next: rect(header.nextElementSibling!),
      scene: scenes[0],
      buttons,
      direction: getComputedStyle(header).flexDirection,
    };
  });
  expect(dimensions.buttons, context).toHaveLength(2);
  const first = dimensions.buttons[0];
  const buttonBottom = Math.max(
    ...dimensions.buttons.map((button) => button.bottom),
  );
  const contentBottom = Math.max(dimensions.copy.bottom, buttonBottom);
  expect(
    dimensions.header.bottom - contentBottom,
    `${context}: header content bottom gap`,
  ).toBeGreaterThanOrEqual(24);
  expect(
    dimensions.next.top - buttonBottom,
    `${context}: next controls/scene gap`,
  ).toBeGreaterThanOrEqual(24);
  expect(
    dimensions.scene.top - buttonBottom,
    `${context}: visible scene clearance`,
  ).toBeGreaterThanOrEqual(24);
  for (const button of dimensions.buttons) {
    expect(button.width, context).toBe(44);
    expect(button.height, context).toBe(44);
    expect(button.top, context).toBe(first.top);
    expect(button.right, context).toBeLessThanOrEqual(dimensions.header.right);
  }
  if (dimensions.direction === "column") {
    expect(
      first.top - dimensions.copy.bottom,
      `${context}: title/control row gap`,
    ).toBeGreaterThanOrEqual(12);
    expect(first.left, context).toBeCloseTo(dimensions.heading.left, 1);
  } else {
    expect(
      first.left - dimensions.copy.right,
      `${context}: title/button separation`,
    ).toBeGreaterThanOrEqual(12);
  }
  return dimensions;
}

test("compact animation headers retain space below the motion buttons", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 900, height: 1000 });
  await page.goto("/blog/introducing-slates");
  await page.evaluate(() => document.fonts.ready);
  const figure = page.locator("[data-proof-figure='slates-operation-map']");
  const header = figure.locator(
    ":scope > header, :scope > div:has(h3):has(button[aria-label])",
  );
  await expect(header).toBeVisible();
  const gap = await header.evaluate(
    (element) =>
      element.getBoundingClientRect().bottom -
      Math.max(
        ...Array.from(
          element.querySelectorAll("button"),
          (button) => button.getBoundingClientRect().bottom,
        ),
      ),
  );
  expect(
    gap,
    "motion buttons need a 24px gap before the header ends",
  ).toBeGreaterThanOrEqual(24);
});

test("every Slates header keeps button clearance at desktop and mobile viewport widths", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/blog/introducing-slates");
  await page.evaluate(() => document.fonts.ready);
  const figures = page.locator("[data-proof-figure^='slates-']");
  expect(await figures.count()).toBeGreaterThanOrEqual(10);
  for (const width of [320, 390, 700, 768, 900, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const figure of await figures.all())
      await expectHeaderClearance(
        figure,
        `${await figure.getAttribute("data-proof-figure")} at ${width}px viewport`,
      );
  }
});

test("long titles and custom controls stay separated around both container breakpoints", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/blog/introducing-slates");
  await page.evaluate(() => document.fonts.ready);
  // These exercise a bare scene, outcome buttons, and a labelled select respectively.
  for (const id of ["slates-operation-map", "slates-merge", "slates-landing"]) {
    const figure = page.locator(`[data-proof-figure='${id}']`);
    await figure.evaluate((element) => {
      element.querySelector("h3")!.textContent =
        "Updating Several Concurrent Edits After Another Agent Changes the Same File";
    });
    for (const width of [320, 559, 560, 561, 699, 700, 701, 822]) {
      await figure.evaluate((element, contentWidth) => {
        const container = element as HTMLElement;
        container.style.boxSizing = "content-box";
        container.style.width = `${contentWidth}px`;
        container.style.maxWidth = "none";
      }, width);
      // Container-query styles settle on a rendering update after resizing the fixture.
      await expect
        .poll(() =>
          figure
            .locator(":scope > header")
            .evaluate((header) => header.getBoundingClientRect().width),
        )
        .toBeCloseTo(width, 1);
      const dimensions = await expectHeaderClearance(
        figure,
        `${id} at ${width}px container`,
      );
      expect(dimensions.header.width).toBeCloseTo(width, 1);
      expect(dimensions.direction).toBe(width <= 700 ? "column" : "row");
      if (width <= 560) expect(dimensions.heading.height).toBeGreaterThan(40);
    }
  }
});
