import { test, expect } from "@playwright/test";
import type { Locator } from "@playwright/test";

async function fingerprint(art: Locator) {
  return art.evaluate((element) => {
    const markup = element.innerHTML;
    let hash = 0;
    for (let i = 0; i < markup.length; i++)
      hash = ((hash << 5) - hash + markup.charCodeAt(i)) | 0;
    return hash;
  });
}

test("all eight studies can be chosen and visibly animate", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text().slice(0, 400));
  });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-motion", "playing");
  const nextStudy = page.getByRole("button", { name: "Next study" });
  for (const name of [
    "Hyperlight",
    "Vorpal",
    "Focal",
    "Slates",
    "Hecate",
    "Veil",
    "Mantle",
    "Hyperscale",
  ]) {
    if (name !== "Hyperlight") await nextStudy.click();
    const art = page.locator(`[data-study="${name.toLowerCase()}"] svg`);
    await expect(art).toBeVisible();
    await art.scrollIntoViewIfNeeded();
    const first = await fingerprint(art);
    await expect
      .poll(() => fingerprint(art), {
        timeout: 4000,
        message: `${name} should animate its SVG`,
      })
      .not.toBe(first);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      `${name} should fit the viewport`,
    ).toBe(false);
  }
  expect(errors).toEqual([]);
});

test("paused and reduced-motion studies remain visible when switching", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const previousStudy = page.getByRole("button", { name: "Previous study" });
  await previousStudy.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator('[data-study="hyperscale"]')).toBeVisible();
  await expect(page.locator('[data-study="hyperscale"]')).toHaveCSS(
    "opacity",
    "1",
  );
  const art = page.locator('[data-study="hyperscale"] svg');
  const initial = await fingerprint(art);
  // A short observation window catches accidental frame loops in a static state.
  await page.waitForTimeout(250);
  expect(await fingerprint(art)).toBe(initial);
  await expect(
    page.getByRole("link", { name: "View Hyperscale project" }),
  ).toHaveAttribute("href", "/projects/hyperscale");
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
  const previousStudy = page.getByRole("button", { name: "Previous study" });
  await previousStudy.click();
  await expect(page.locator('[data-study="hyperscale"]')).toBeVisible();
  await previousStudy.click();

  const art = page.locator('[data-study="mantle"] svg');
  await expect(art).toBeVisible();
  await expect(page.locator(".study-title")).toHaveText("Foundation");
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
