import { expect, test } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";

const featured = ["vorpal", "focal", "slates"];

async function geometry(art: Locator) {
  return art.evaluate((element) => {
    const attributes = [
      "d",
      "points",
      "transform",
      "cx",
      "cy",
      "r",
      "rx",
      "ry",
      "x",
      "y",
      "x1",
      "x2",
      "y1",
      "y2",
    ];
    const value = [
      ...element.querySelectorAll(
        "path,g,circle,ellipse,polygon,polyline,line",
      ),
    ]
      .map((node) =>
        attributes
          .map((attribute) => node.getAttribute(attribute) || "")
          .join(","),
      )
      .join(";");
    let hash = 0;
    for (let i = 0; i < value.length; i++)
      hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
    return hash;
  });
}

async function sustainedMotion(art: Locator, message: string) {
  const samples = [await geometry(art)];
  for (let i = 0; i < 4; i++) {
    await art.page().waitForTimeout(300);
    samples.push(await geometry(art));
  }
  expect(
    new Set(samples).size,
    `${message}; samples: ${samples.join(", ")}`,
  ).toBeGreaterThanOrEqual(4);
}

async function remainsStill(art: Locator, message: string) {
  // Allow the observer/event cleanup to commit before observing several frame intervals.
  await art.page().waitForTimeout(100);
  const stopped = await geometry(art);
  await art.page().waitForTimeout(300);
  expect(await geometry(art), message).toBe(stopped);
}

async function revealCard(page: Page, slug: string) {
  const card = page
    .locator(".project-card")
    .filter({ has: page.locator(`[data-project-study="${slug}"]`) });
  await card.scrollIntoViewIfNeeded();
  const art = card.locator(`[data-project-study="${slug}"] > svg`);
  await expect(art).toBeVisible();
  await art.scrollIntoViewIfNeeded();
  await expect(art).toBeInViewport();
  return { card, art };
}

for (const interaction of ["hover", "keyboard focus"]) {
  test(`desktop ${interaction} begun before hydration starts sustained study motion`, async ({
    page,
    isMobile,
  }) => {
    test.skip(
      isMobile,
      "This reproduces desktop interaction with server-rendered HTML.",
    );
    let releaseScripts = () => {};
    const hydrationGate = new Promise<void>((resolve) => {
      releaseScripts = resolve;
    });
    await page.route("**/_next/static/**/*.js", async (route) => {
      await hydrationGate;
      await route.continue();
    });
    const card = page.locator(".project-card").filter({
      has: page.getByRole("heading", { name: "Vorpal", exact: true }),
    });
    try {
      await page.goto("/", { waitUntil: "commit" });
      const heading = card.getByRole("heading", {
        name: "Vorpal",
        exact: true,
      });
      await expect(heading).toBeAttached();
      await card.evaluate((element) =>
        element.scrollIntoView({ block: "center", behavior: "instant" }),
      );
      if (interaction === "hover") {
        const box = await heading.boundingBox();
        if (!box)
          throw new Error("The server-rendered Vorpal heading must be visible");
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        expect(
          await card.evaluate((element) => element.matches(":hover")),
        ).toBe(true);
      } else {
        await card.getByRole("link", { name: "Explore Vorpal" }).focus();
        await expect(
          card.getByRole("link", { name: "Explore Vorpal" }),
        ).toBeFocused();
      }
    } finally {
      releaseScripts();
    }
    await expect(page.locator("html")).toHaveAttribute(
      "data-motion",
      "playing",
    );
    const art = card.locator('[data-project-study="vorpal"] > svg');
    await expect(art).toBeVisible();
    await expect(art).toBeInViewport();
    if (interaction === "hover") {
      expect(await card.evaluate((element) => element.matches(":hover"))).toBe(
        true,
      );
    } else {
      await expect(
        card.getByRole("link", { name: "Explore Vorpal" }),
      ).toBeFocused();
    }
    await sustainedMotion(
      art,
      `${interaction} already present before hydration should activate sustained motion`,
    );
  });
}

for (const slug of featured) {
  test(`homepage ${slug} sustains motion through entry, re-entry, and scrolling`, async ({
    page,
    isMobile,
  }) => {
    await page.goto("/");
    await expect(page.locator(".project-card")).toHaveCount(featured.length);
    await expect(page.locator("html")).toHaveAttribute(
      "data-motion",
      "playing",
    );
    const { card, art } = await revealCard(page, slug);
    if (!isMobile) {
      await card.hover();
      await expect(card).toHaveAttribute("data-active", "true");
    }
    await sustainedMotion(
      art,
      `${slug} should keep moving while ${isMobile ? "visible on touch" : "hovered"}`,
    );
    if (!isMobile) {
      await page.mouse.move(0, 0);
      await expect(card).toHaveAttribute("data-active", "false");
      await remainsStill(art, `${slug} should pause after pointer leave`);
      await card.hover();
      await sustainedMotion(
        art,
        `${slug} should keep moving after hover re-entry`,
      );
    }
    await page.locator(".hero").scrollIntoViewIfNeeded();
    await expect(art).not.toBeInViewport();
    await remainsStill(art, `${slug} should stop working while offscreen`);
    if (!isMobile) await page.mouse.move(0, 0);
    await revealCard(page, slug);
    if (!isMobile) await card.hover();
    await sustainedMotion(
      art,
      `${slug} should keep moving after scrolling back into view`,
    );
  });
}

test("mobile catalog cards animate on scroll entry and restart after leaving the viewport", async ({
  page,
  isMobile,
}) => {
  test.skip(
    !isMobile,
    "Desktop hover behavior is covered on the actual home cards.",
  );
  test.setTimeout(60000);
  await page.goto("/projects");
  for (const slug of [...featured, "hoard"]) {
    const { art } = await revealCard(page, slug);
    await sustainedMotion(
      art,
      `${slug} catalog artwork should animate on touch scroll entry`,
    );
    await page.locator(".site-footer").scrollIntoViewIfNeeded();
    await expect(art).not.toBeInViewport();
    await remainsStill(art, `${slug} catalog artwork should stop offscreen`);
    await revealCard(page, slug);
    await sustainedMotion(
      art,
      `${slug} catalog artwork should resume on touch scroll re-entry`,
    );
  }
});

test("mobile project details keep autoplay when their artwork is visible", async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, "This checks the reported mobile detail-page behavior.");
  test.setTimeout(60000);
  for (const slug of featured) {
    await page.goto(`/projects/${slug}`);
    const art = page.locator(
      `.project-detail-hero [data-project-study="${slug}"] > svg`,
    );
    await expect(art).toBeVisible();
    await art.scrollIntoViewIfNeeded();
    await sustainedMotion(
      art,
      `${slug} detail artwork should sustain visible autoplay`,
    );
    await page.locator(".site-footer").scrollIntoViewIfNeeded();
    await expect(art).not.toBeInViewport();
    await remainsStill(art, `${slug} detail artwork should stop offscreen`);
    await art.scrollIntoViewIfNeeded();
    await sustainedMotion(
      art,
      `${slug} detail artwork should sustain autoplay after re-entry`,
    );
  }
});

for (const route of ["/", "/projects"]) {
  test(`mobile cards on ${route} respect global pause and device reduced motion`, async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, "This checks viewport-triggered touch motion.");
    await page.goto(route);
    const { card, art } = await revealCard(page, "vorpal");
    await expect(card).toHaveAttribute("data-active", "true");
    await sustainedMotion(art, "Visible touch artwork should start moving");

    await page.getByRole("button", { name: "Pause motion", exact: true }).tap();
    await expect(page.locator("html")).toHaveAttribute("data-motion", "paused");
    await revealCard(page, "vorpal");
    await expect(card).toHaveAttribute("data-active", "false");
    await remainsStill(art, "Global pause must win on touch scroll entry");
    const pausedRule = await card.evaluate(
      (element) => getComputedStyle(element, "::before").backgroundPosition,
    );
    await page.waitForTimeout(300);
    expect(
      await card.evaluate(
        (element) => getComputedStyle(element, "::before").backgroundPosition,
      ),
      "Global pause must also stop the card's prismatic rule",
    ).toBe(pausedRule);

    await page
      .getByRole("button", { name: "Resume motion", exact: true })
      .tap();
    await revealCard(page, "vorpal");
    await expect(card).toHaveAttribute("data-active", "true");
    await sustainedMotion(art, "Visible touch artwork should resume");

    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(page.locator("html")).toHaveAttribute("data-motion", "paused");
    await expect(card).toHaveAttribute("data-active", "false");
    await remainsStill(
      art,
      "Live reduced motion must stop visible touch artwork",
    );
    await page.locator(".site-footer").scrollIntoViewIfNeeded();
    await revealCard(page, "vorpal");
    await remainsStill(
      art,
      "Scrolling must not restart reduced-motion artwork",
    );

    await page.emulateMedia({ reducedMotion: "no-preference" });
    await expect(card).toHaveAttribute("data-active", "true");
    await sustainedMotion(
      art,
      "Removing reduced motion should restore autoplay",
    );

    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.reload();
    await revealCard(page, "vorpal");
    await expect(card).toHaveAttribute("data-active", "false");
    await remainsStill(
      art,
      "Initial reduced motion must keep touch artwork still",
    );
  });
}
