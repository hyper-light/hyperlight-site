import { test, expect, type Page } from "@playwright/test";

async function batchVisibilityEntries(page: Page, selector: string) {
  await page.addInitScript((selector) => {
    const NativeObserver = window.IntersectionObserver;
    window.IntersectionObserver = class extends NativeObserver {
      constructor(
        callback: IntersectionObserverCallback,
        options?: IntersectionObserverInit,
      ) {
        super((entries, observer) => {
          const visible = entries.find(
            (entry) => entry.target.matches(selector) && entry.isIntersecting,
          );
          // Real rapid filtering queued [outside, inside] in a single callback.
          // Pin that browser timing at the actual observer/preview boundary.
          if (visible) {
            const outside: IntersectionObserverEntry = {
              target: visible.target,
              time: visible.time - 1,
              rootBounds: visible.rootBounds,
              boundingClientRect: new DOMRect(17, 5308, 286, 150),
              intersectionRect: new DOMRect(),
              intersectionRatio: 0,
              isIntersecting: false,
            };
            callback([outside, ...entries], observer);
          } else {
            callback(entries, observer);
          }
        }, options);
      }
    };
  }, selector);
}

test("project previews handle every queued visibility entry", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await batchVisibilityEntries(page, '[data-project-study="hoard"]');
  await page.goto("/projects");
  await page.getByRole("searchbox", { name: "Search projects" }).fill("hoard");
  await expect(page.locator(".project-card")).toHaveCount(1);
  const preview = page.locator('[data-project-study="hoard"]');
  await preview.scrollIntoViewIfNeeded();
  await expect(preview.locator("svg.project-study-svg")).toBeVisible();
});

test("study motion follows the latest queued visibility entry", async ({
  page,
}) => {
  await batchVisibilityEntries(page, "svg.project-study-svg");
  await page.goto("/projects/hoard");
  await expect(page.locator("html")).toHaveAttribute("data-motion", "playing");
  const art = page.locator("svg.project-study-svg");
  await art.scrollIntoViewIfNeeded();
  const movingPath = art.locator("[data-cache-cell]").first();
  const initial = await movingPath.getAttribute("d");
  await expect
    .poll(() => movingPath.getAttribute("d"), { timeout: 2000 })
    .not.toBe(initial);
});
