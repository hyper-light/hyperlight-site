import { expect, test } from "@playwright/test";

test("Quiver's eight arrows stay present and move without size or position jumps", async ({
  page,
}) => {
  test.setTimeout(45_000);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/projects/quiver");
  await expect(page.locator("html")).toHaveAttribute("data-motion", "playing");
  const art = page.locator(
    '.project-detail-hero [data-project-study="quiver"] > svg',
  );
  await expect(art).toBeVisible();
  await expect(art.locator("[data-quiver-lance]")).toHaveCount(8);
  await page.evaluate(() => document.fonts.ready);
  await art.evaluate((element) => {
    element.scrollIntoView({ block: "center", behavior: "instant" });
  });
  await expect(art).toBeInViewport();

  const observation = await art.evaluate(async (element) => {
    const arrows = Array.from(
      element.querySelectorAll<SVGGElement>("[data-quiver-lance]"),
    );
    const initialMarkup = element.innerHTML;
    const failures = new Set<string>();
    const measurements = arrows.map(() => ({
      minimumDiagonal: Infinity,
      maximumDiagonal: 0,
      maximumStepRatio: 0,
      previous: { x: 0, y: 0, diagonal: 0, time: 0 },
    }));
    let samples = 0;
    const started = performance.now();

    await new Promise<void>((resolve) => {
      function sample(now: number) {
        samples++;
        const current = element.querySelectorAll("[data-quiver-lance]");
        if (current.length !== 8) failures.add("The arrow count changed");

        arrows.forEach((arrow, index) => {
          const label = `Arrow ${index + 1}`;
          if (!arrow.isConnected || !element.contains(arrow)) {
            failures.add(`${label} was detached or replaced`);
            return;
          }
          // Observe the original nodes: a replacement with the same count is still a pop.
          for (
            let node: Element | null = arrow;
            node;
            node = node.parentElement
          ) {
            const style = getComputedStyle(node);
            if (
              style.display === "none" ||
              style.visibility !== "visible" ||
              style.opacity !== "1"
            ) {
              failures.add(`${label} faded or became hidden`);
              break;
            }
          }
          const bounds = arrow.getBoundingClientRect();
          const diagonal = Math.hypot(bounds.width, bounds.height);
          if (!Number.isFinite(diagonal) || diagonal <= 1) {
            failures.add(`${label} lost its rendered geometry`);
            return;
          }
          if (
            bounds.right <= 0 ||
            bounds.left >= innerWidth ||
            bounds.bottom <= 0 ||
            bounds.top >= innerHeight
          ) {
            failures.add(`${label} left the visible viewport`);
          }

          const metric = measurements[index];
          const x = bounds.x + bounds.width / 2;
          const y = bounds.y + bounds.height / 2;
          metric.minimumDiagonal = Math.min(metric.minimumDiagonal, diagonal);
          metric.maximumDiagonal = Math.max(metric.maximumDiagonal, diagonal);
          if (metric.previous.diagonal) {
            const distance = Math.hypot(
              x - metric.previous.x,
              y - metric.previous.y,
            );
            const stepRatio = distance / metric.previous.diagonal;
            const elapsedSeconds = (now - metric.previous.time) / 1000;
            metric.maximumStepRatio = Math.max(
              metric.maximumStepRatio,
              stepRatio,
            );
            // Allow ordinary motion and delayed CI samples, but not a reset/teleport.
            // This is a spatial-continuity limit, deliberately not a frame-rate limit.
            if (stepRatio > 0.025 + elapsedSeconds * 0.04) {
              failures.add(`${label} jumped discontinuously between samples`);
            }
          }
          metric.previous = { x, y, diagonal, time: now };
        });

        // A full ten-second window catches the former spawn/fade/scale cycles.
        if (now - started >= 10_000) resolve();
        else requestAnimationFrame(sample);
      }
      requestAnimationFrame(sample);
    });

    return {
      failures: [...failures],
      samples,
      elapsed: performance.now() - started,
      changed: element.innerHTML !== initialMarkup,
      arrows: measurements.map((metric) => ({
        sizeVariation: metric.maximumDiagonal / metric.minimumDiagonal - 1,
        maximumStepRatio: metric.maximumStepRatio,
      })),
    };
  });

  expect(observation.failures, JSON.stringify(observation, null, 2)).toEqual(
    [],
  );
  expect(observation.elapsed).toBeGreaterThanOrEqual(10_000);
  expect(observation.samples).toBeGreaterThan(1);
  expect(
    observation.changed,
    "The observed artwork must actually animate",
  ).toBe(true);
  for (const [index, arrow] of observation.arrows.entries()) {
    expect(
      arrow.sizeVariation,
      `Arrow ${index + 1} must keep its scale throughout the observation window`,
    ).toBeLessThan(0.12);
  }
});
