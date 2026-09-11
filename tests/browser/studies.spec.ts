import { test, expect } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";
import { studies, type StudyId } from "../../lib/studies";

const newStudyIds: StudyId[] = [
  "hex",
  "shards",
  "athame",
  "reliquary",
  "hoard",
  "quiver",
  "clarion",
  "grid",
  "ergo",
];

async function fingerprint(art: Locator) {
  return art.evaluate((element) => {
    const markup = element.innerHTML;
    let hash = 0;
    for (let i = 0; i < markup.length; i++)
      hash = ((hash << 5) - hash + markup.charCodeAt(i)) | 0;
    return hash;
  });
}

async function expectArtworkInsideCard(art: Locator, id: StudyId) {
  const bounds = await art.evaluate((element) => {
    if (!(element instanceof SVGSVGElement))
      throw new Error("Expected artwork SVG");
    const frame = element.closest(".project-visual")?.getBoundingClientRect();
    const matrix = element.getScreenCTM();
    if (!frame || !matrix)
      throw new Error("Artwork must have a rendered card frame");
    const box = element.getBBox();
    const corners = [
      new DOMPoint(box.x, box.y),
      new DOMPoint(box.x + box.width, box.y),
      new DOMPoint(box.x, box.y + box.height),
      new DOMPoint(box.x + box.width, box.y + box.height),
    ].map((point) => point.matrixTransform(matrix));
    const left = Math.min(...corners.map((point) => point.x));
    const right = Math.max(...corners.map((point) => point.x));
    const top = Math.min(...corners.map((point) => point.y));
    const bottom = Math.max(...corners.map((point) => point.y));
    const width = right - left;
    const height = bottom - top;
    const visibleWidth = Math.max(
      0,
      Math.min(right, frame.right) - Math.max(left, frame.left),
    );
    const visibleHeight = Math.max(
      0,
      Math.min(bottom, frame.bottom) - Math.max(top, frame.top),
    );
    return {
      visibleArea: (visibleWidth * visibleHeight) / (width * height),
      centerX: ((left + right) / 2 - frame.left) / frame.width,
      centerY: ((top + bottom) / 2 - frame.top) / frame.height,
      width: width / frame.width,
      height: height / frame.height,
    };
  });
  const message = `${id} artwork should fit its card: ${JSON.stringify(bounds)}`;
  // Check the SVG's drawn content, not its oversized CSS viewport or placeholder icon.
  // A small margin accommodates faint registration marks and shadows at the edges.
  expect(bounds.visibleArea, message).toBeGreaterThanOrEqual(0.96);
  expect(bounds.centerX, message).toBeGreaterThan(0.2);
  expect(bounds.centerX, message).toBeLessThan(0.8);
  expect(bounds.centerY, message).toBeGreaterThan(0.2);
  expect(bounds.centerY, message).toBeLessThan(0.8);
  expect(bounds.width, message).toBeGreaterThan(0.35);
  expect(bounds.height, message).toBeGreaterThan(0.35);
}

async function chooseStudy(page: Page, id: StudyId) {
  const stage = page.locator(".study-gallery [data-study]");
  await expect(stage).toBeVisible();
  const current = await stage.getAttribute("data-study");
  let index = studies.findIndex((study) => study.id === current);
  const target = studies.findIndex((study) => study.id === id);
  expect(index).toBeGreaterThanOrEqual(0);
  expect(target).toBeGreaterThanOrEqual(0);
  const forward = (target - index + studies.length) % studies.length;
  const backward = (index - target + studies.length) % studies.length;
  const direction = forward <= backward ? 1 : -1;
  const control = page.getByRole("button", {
    name: direction === 1 ? "Next study" : "Previous study",
  });
  for (let step = 0; step < Math.min(forward, backward); step++) {
    await control.click();
    index = (index + direction + studies.length) % studies.length;
    await expect(
      page.locator(`.study-gallery [data-study="${studies[index].id}"]`),
    ).toBeVisible();
  }
}

test("every registered study can be chosen and visibly animates", async ({
  page,
}) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text().slice(0, 400));
  });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-motion", "playing");
  for (const [index, study] of studies.entries()) {
    await chooseStudy(page, study.id);
    const art = page.locator(`.study-gallery [data-study="${study.id}"] svg`);
    await expect(art).toBeVisible();
    await expect(page.locator(".study-gallery [data-study]")).toHaveCount(1);
    await expect(page.locator(".study-index")).toHaveText(
      `${String(index + 1).padStart(2, "0")} / ${String(studies.length).padStart(2, "0")}`,
    );
    await expect(page.locator(".study-title")).toHaveText(study.title);
    await art.scrollIntoViewIfNeeded();
    const first = await fingerprint(art);
    await expect
      .poll(() => fingerprint(art), {
        timeout: 4000,
        message: `${study.name} should animate its SVG`,
      })
      .not.toBe(first);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      `${study.name} should fit the viewport`,
    ).toBe(false);
  }
  expect(errors).toEqual([]);
});

test("paused and reduced-motion studies remain visible when switching", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const lastStudy = studies[studies.length - 1];
  const previousStudy = page.getByRole("button", { name: "Previous study" });
  await previousStudy.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(`[data-study="${lastStudy.id}"]`)).toBeVisible();
  await expect(page.locator(`[data-study="${lastStudy.id}"]`)).toHaveCSS(
    "opacity",
    "1",
  );
  const art = page.locator(`[data-study="${lastStudy.id}"] svg`);
  const initial = await fingerprint(art);
  // A short observation window catches accidental frame loops in a static state.
  await page.waitForTimeout(250);
  expect(await fingerprint(art)).toBe(initial);
  await expect(
    page.getByRole("link", { name: `View ${lastStudy.name} project` }),
  ).toHaveAttribute("href", `/projects/${lastStudy.id}`);
  await page.keyboard.press("ArrowRight");
  await expect(page.locator('[data-study="hyperlight"]')).toBeVisible();
  await expect(previousStudy).toBeFocused();
  await page.keyboard.press("ArrowRight");
  const projectLink = page.getByRole("link", { name: "View Vorpal project" });
  await projectLink.focus();
  await page.keyboard.press("ArrowLeft");
  await expect(projectLink).toBeFocused();
  await expect(page.locator('[data-study="vorpal"]')).toBeVisible();
});

test("Mantle animates, pauses, resumes, and follows live reduced motion", async ({
  page,
}) => {
  await page.goto("/");
  await chooseStudy(page, "mantle");

  const art = page.locator('[data-study="mantle"] svg');
  await expect(art).toBeVisible();
  await expect(page.locator(".study-title")).toHaveText(
    studies.find((study) => study.id === "mantle")!.title,
  );
  await art.scrollIntoViewIfNeeded();
  await expect(page.locator("html")).toHaveAttribute("data-motion", "playing");
  const initial = await fingerprint(art);
  await expect
    .poll(() => fingerprint(art), {
      timeout: 4000,
      message: "Mantle should change its SVG while playing",
    })
    .not.toBe(initial);

  await page.getByRole("button", { name: "Pause ambient animation" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-motion", "paused");
  const resume = page.getByRole("button", { name: "Resume ambient animation" });
  await expect(resume).toHaveAttribute("aria-pressed", "true");
  const paused = await fingerprint(art);
  // Observe several potential frames; a single equality check could pass between ticks.
  await page.waitForTimeout(400);
  expect(
    await fingerprint(art),
    "Paused Mantle should keep the same pose",
  ).toBe(paused);

  await resume.click();
  await expect(page.locator("html")).toHaveAttribute("data-motion", "playing");
  await expect
    .poll(() => fingerprint(art), {
      timeout: 4000,
      message: "Resuming should restart Mantle's SVG animation",
    })
    .not.toBe(paused);

  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(
    page.getByRole("button", {
      name: "Reduced motion follows your device setting",
    }),
  ).toBeDisabled();
  await expect(page.locator("html")).toHaveAttribute("data-motion", "paused");
  await expect(art).toBeVisible();
  const reduced = await fingerprint(art);
  await page.waitForTimeout(400);
  expect(
    await fingerprint(art),
    "A live reduced-motion preference should stop Mantle's SVG animation",
  ).toBe(reduced);
});

test("new studies honor pause, resume, and live reduced motion", async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.goto("/");

  for (const id of newStudyIds) {
    await chooseStudy(page, id);
    const art = page.locator(`.study-gallery [data-study="${id}"] svg`);
    await expect(art).toBeVisible();
    await art.scrollIntoViewIfNeeded();
    const first = await fingerprint(art);
    await expect
      .poll(() => fingerprint(art), {
        timeout: 4000,
        message: `${id} should animate before pausing`,
      })
      .not.toBe(first);

    await page.getByRole("button", { name: "Pause ambient animation" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-motion", "paused");
    const paused = await fingerprint(art);
    await page.waitForTimeout(300);
    expect(
      await fingerprint(art),
      `${id} should remain frozen while paused`,
    ).toBe(paused);

    await page
      .getByRole("button", { name: "Resume ambient animation" })
      .click();
    await expect(page.locator("html")).toHaveAttribute(
      "data-motion",
      "playing",
    );
    await expect
      .poll(() => fingerprint(art), {
        timeout: 4000,
        message: `${id} should resume from its paused pose`,
      })
      .not.toBe(paused);

    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(
      page.getByRole("button", {
        name: "Reduced motion follows your device setting",
      }),
    ).toBeDisabled();
    await expect(page.locator("html")).toHaveAttribute("data-motion", "paused");
    await expect(art).toBeVisible();
    const reduced = await fingerprint(art);
    await page.waitForTimeout(300);
    expect(
      await fingerprint(art),
      `${id} should stop when the device requests reduced motion`,
    ).toBe(reduced);

    await page.emulateMedia({ reducedMotion: "no-preference" });
    await expect(page.locator("html")).toHaveAttribute(
      "data-motion",
      "playing",
    );
  }
});

test("new project previews fit their cards and follow input modality while details animate", async ({
  page,
  isMobile,
}) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text().slice(0, 400));
  });
  await page.goto("/projects");
  await expect(page.locator("html")).toHaveAttribute("data-motion", "playing");

  for (const id of newStudyIds) {
    const preview = page.locator(`.project-card [data-project-study="${id}"]`);
    await preview.scrollIntoViewIfNeeded();
    await page.mouse.move(0, 0);
    const art = preview.locator(":scope > svg");
    await expect(
      art,
      `${id} should load its study rather than stay a placeholder`,
    ).toBeVisible();
    await expectArtworkInsideCard(art, id);
    const first = await fingerprint(art);
    if (isMobile) {
      await expect
        .poll(() => fingerprint(art), {
          message: `${id} catalog preview should animate while visible on touch`,
        })
        .not.toBe(first);
    } else {
      await page.waitForTimeout(250);
      expect(
        await fingerprint(art),
        `${id} desktop catalog preview should remain still without hover`,
      ).toBe(first);
    }
  }

  for (const id of newStudyIds) {
    await page.goto(`/projects/${id}`);
    const art = page.locator(
      `.project-detail-hero [data-project-study="${id}"] > svg`,
    );
    await expect(art).toBeVisible();
    await art.scrollIntoViewIfNeeded();
    const first = await fingerprint(art);
    await expect
      .poll(() => fingerprint(art), {
        timeout: 4000,
        message: `${id} should animate on its project page`,
      })
      .not.toBe(first);
  }
  expect(errors).toEqual([]);
});

test("project previews load after a desktop-to-mobile resize and filtering", async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/projects/hoard");
  await expect(
    page.locator('[data-project-study="hoard"] > svg'),
  ).toBeVisible();

  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto("/");
  await expect(page.locator(".ecosystem-strip")).toBeVisible();
  await page.goto("/projects");
  const search = page.getByRole("searchbox", { name: "Search projects" });
  for (const id of [
    "hoard",
    ...newStudyIds.filter((id) => id !== "hoard"),
  ] as StudyId[]) {
    await search.fill(id);
    await expect(page.locator(".project-card")).toHaveCount(1);
    const preview = page.locator(`.project-card [data-project-study="${id}"]`);
    await preview.scrollIntoViewIfNeeded();
    const art = preview.locator(":scope > svg");
    await expect(
      art,
      `${id} should load after resizing and filtering`,
    ).toBeVisible();
    await expectArtworkInsideCard(art, id);
  }
});
