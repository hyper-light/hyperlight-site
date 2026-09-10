import { expect, test } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";
import { projects } from "../../lib/projects";

async function geometry(art: Locator) {
  return art.evaluate((element) => {
    const attributes = [
      "d",
      "points",
      "cx",
      "cy",
      "rx",
      "ry",
      "x1",
      "x2",
      "y1",
      "y2",
      "transform",
    ];
    const value = [
      ...element.querySelectorAll(
        "path,circle,ellipse,polygon,polyline,line,g",
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

async function markerPosition(card: Locator) {
  return card.evaluate(
    (element) => getComputedStyle(element, "::before").backgroundPosition,
  );
}

async function expectStill(art: Locator, message: string) {
  const stopped = await geometry(art);
  await art.page().waitForTimeout(250);
  expect(await geometry(art), message).toBe(stopped);
  return stopped;
}

async function chooseCard(page: Page, slug: string, active = false) {
  await page.getByRole("searchbox", { name: "Search projects" }).fill(slug);
  await expect(page.locator(".project-card")).toHaveCount(1);
  const card = page.locator(".project-card");
  await page.mouse.move(0, 0);
  await card.scrollIntoViewIfNeeded();
  const art = card.locator(`[data-project-study="${slug}"] > svg`);
  await expect(art).toBeVisible();
  await expect(card).toHaveAttribute("data-active", String(active));
  return { card, art };
}

test("Hoard's actual study and prismatic rule animate on hover and freeze on leave", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "Touch navigation is covered without synthetic hover.");
  await page.goto("/projects");
  const { card, art } = await chooseCard(page, "hoard");
  const idle = await expectStill(
    art,
    "An idle project card should hold its pose",
  );
  const idleMarker = await markerPosition(card);
  await page.waitForTimeout(250);
  expect(
    await markerPosition(card),
    "The idle prismatic rule should also stay still",
  ).toBe(idleMarker);
  await card.hover();
  await expect(card).toHaveAttribute("data-active", "true");
  await expect
    .poll(() => geometry(art), {
      timeout: 4000,
      message:
        "Hover should animate the actual Hoard study geometry, not only scale its card",
    })
    .not.toBe(idle);
  await expect
    .poll(() => markerPosition(card), {
      message: "Hover should shift the prismatic rule's gradient",
    })
    .not.toBe(idleMarker);

  await page.mouse.move(0, 0);
  await expect(card).toHaveAttribute("data-active", "false");
  const stopped = await expectStill(
    art,
    "Leaving the card should freeze the study",
  );
  expect(
    stopped,
    "Leaving should preserve the animated pose, not reset it",
  ).not.toBe(idle);
  const stoppedMarker = await markerPosition(card);
  await page.waitForTimeout(250);
  expect(
    await markerPosition(card),
    "Leaving should freeze the prismatic rule",
  ).toBe(stoppedMarker);
  expect(
    stoppedMarker,
    "The rule should preserve its position after hover",
  ).not.toBe(idleMarker);
});

test("every catalog card renders its full study with modality-appropriate motion", async ({
  page,
  isMobile,
}) => {
  test.setTimeout(90000);
  await page.goto("/projects");
  await expect(page.locator(".project-card")).toHaveCount(projects.length);
  await expect(page.locator(".graph-art, .focal-art")).toHaveCount(0);
  for (const project of projects) {
    const { card, art } = await chooseCard(page, project.slug, isMobile);
    await expect(
      art,
      `${project.name} should use the full-size study renderer`,
    ).toHaveAttribute("viewBox", "0 0 640 640");
    expect(
      await art.locator("path,circle,ellipse,polygon,polyline,line").count(),
      `${project.name} should render the study, not the small project mark`,
    ).toBeGreaterThan(15);
    if (isMobile) {
      const initial = await geometry(art);
      const marker = await markerPosition(card);
      await expect
        .poll(() => geometry(art), {
          message: `${project.name} should animate while visible on touch`,
        })
        .not.toBe(initial);
      await expect
        .poll(() => markerPosition(card), {
          message: `${project.name}'s visible touch rule should animate`,
        })
        .not.toBe(marker);
    } else {
      await expectStill(
        art,
        `${project.name} should stay still without hover or focus on desktop`,
      );
    }
  }
});

test("every desktop catalog study moves on hover and keeps its pose afterward", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "Touch navigation is covered without synthetic hover.");
  test.setTimeout(90000);
  await page.goto("/projects");
  for (const project of projects) {
    const { card, art } = await chooseCard(page, project.slug);
    const idle = await geometry(art);
    const marker = await markerPosition(card);
    await card.hover();
    await expect(card).toHaveAttribute("data-active", "true");
    await expect
      .poll(() => geometry(art), {
        timeout: 4000,
        message: `${project.name} should animate its actual study on hover`,
      })
      .not.toBe(idle);
    await expect
      .poll(() => markerPosition(card), {
        message: `${project.name}'s prismatic rule should animate on hover`,
      })
      .not.toBe(marker);
    await page.mouse.move(0, 0);
    await expect(card).toHaveAttribute("data-active", "false");
    const stopped = await expectStill(
      art,
      `${project.name} should freeze when the pointer leaves`,
    );
    expect(stopped, `${project.name} should preserve its pose`).not.toBe(idle);
  }
});

test("keyboard focus within a card activates motion until focus leaves", async ({
  page,
  isMobile,
  browserName,
}) => {
  test.skip(
    isMobile,
    "Keyboard interaction is exercised in the desktop project.",
  );
  await page.goto("/projects");
  const { card, art } = await chooseCard(page, "hoard");
  const idle = await geometry(art);
  const idleMarker = await markerPosition(card);
  const projectLink = card.getByRole("link", { name: "Explore Hoard" });
  // Safari's default Tab policy skips links; Option+Tab includes them natively.
  const next = browserName === "webkit" ? "Alt+Tab" : "Tab";
  const previous = browserName === "webkit" ? "Alt+Shift+Tab" : "Shift+Tab";
  await page.getByRole("searchbox", { name: "Search projects" }).focus();
  for (let step = 0; step < 6; step++) {
    await page.keyboard.press(next);
    if (
      await projectLink.evaluate(
        (element) => element === document.activeElement,
      )
    )
      break;
  }
  await expect(projectLink).toBeFocused();
  await expect(card).toHaveAttribute("data-active", "true");
  await expect.poll(() => geometry(art)).not.toBe(idle);
  await expect.poll(() => markerPosition(card)).not.toBe(idleMarker);
  await page.keyboard.press(next);
  await expect(
    card.getByRole("link", { name: "Hoard repository on GitHub" }),
  ).toBeFocused();
  await expect(card).toHaveAttribute("data-active", "true");
  await page.keyboard.press(previous);
  await page.keyboard.press(previous);
  await expect(card).toHaveAttribute("data-active", "false");
  await expectStill(
    art,
    "Moving keyboard focus outside the card should freeze the study",
  );
});

test("global pause and live reduced motion override card hover and focus", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "Hover override is exercised with a real fine pointer.");
  await page.goto("/projects");
  const { card, art } = await chooseCard(page, "hoard");
  await card.hover();
  await expect(card).toHaveAttribute("data-active", "true");
  await page.getByRole("button", { name: "Pause motion", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-motion", "paused");
  await card.hover();
  await card.getByRole("link", { name: "Explore Hoard" }).focus();
  await expect(card).toHaveAttribute("data-active", "false");
  const paused = await expectStill(
    art,
    "Global pause must win even while the card is hovered and focused",
  );
  const pausedMarker = await markerPosition(card);
  await page.waitForTimeout(250);
  expect(await markerPosition(card)).toBe(pausedMarker);

  await page
    .getByRole("button", { name: "Resume motion", exact: true })
    .click();
  await expect(page.locator("html")).toHaveAttribute("data-motion", "playing");
  await card.hover();
  await expect(card).toHaveAttribute("data-active", "true");
  await expect.poll(() => geometry(art)).not.toBe(paused);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator("html")).toHaveAttribute("data-motion", "paused");
  await expect(card).toHaveAttribute("data-active", "false");
  await expectStill(
    art,
    "Device reduced motion must stop an already-hovered study",
  );
  const reducedMarker = await markerPosition(card);
  await page.waitForTimeout(250);
  expect(await markerPosition(card)).toBe(reducedMarker);
  await expect(
    page.getByRole("button", { name: "Reduced motion", exact: true }),
  ).toBeDisabled();
});

test("touch opens a project with one tap without a hover-only intermediate state", async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, "This case exercises the mobile touch project.");
  await page.goto("/projects");
  const { card, art } = await chooseCard(page, "hoard", true);
  const initial = await geometry(art);
  await expect
    .poll(() => geometry(art), {
      message: "Visible touch cards should animate before interaction",
    })
    .not.toBe(initial);
  await card.locator(".project-visual").tap();
  await expect(page).toHaveURL("/projects/hoard");
  await expect(
    page.getByRole("heading", { name: "Hoard", exact: true }),
  ).toBeVisible();
});

test("landing, catalog, and project pages use the same canonical project marks", async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const signature = (mark: Locator) =>
    mark.evaluate((element) =>
      element instanceof HTMLImageElement
        ? `image:${element.getAttribute("src")}`
        : `svg:${element.innerHTML}`,
    );
  const marks = new Map<string, string>();
  await page.goto("/");
  for (const project of projects) {
    const mark = page.locator(
      `.ecosystem-projects [data-project-mark="${project.slug}"]`,
    );
    await expect(mark).toBeVisible();
    marks.set(project.slug, await signature(mark));
  }
  await page.goto("/projects");
  for (const project of projects) {
    const mark = page.locator(
      `.project-card-body [data-project-mark="${project.slug}"]`,
    );
    await expect(mark).toBeVisible();
    expect(
      await signature(mark),
      `${project.name} catalog mark should match its landing mark`,
    ).toBe(marks.get(project.slug));
  }
  for (const project of projects) {
    await page.goto(`/projects/${project.slug}`);
    const mark = page.locator(
      `.project-detail-label [data-project-mark="${project.slug}"]`,
    );
    await expect(mark).toBeVisible();
    expect(
      await signature(mark),
      `${project.name} detail mark should match its landing mark`,
    ).toBe(marks.get(project.slug));
  }
});
