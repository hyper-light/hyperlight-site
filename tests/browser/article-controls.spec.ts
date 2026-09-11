import { test, expect } from "@playwright/test";

test("article selectors share equal-width tabs, typography, and motion-aware chromatic underlines", async ({
  page,
}) => {
  await page.goto("/blog/introducing-vorpal");
  const groups = [
    page.getByRole("tablist", { name: "Embedding method" }),
    page.locator("[data-ranking-select]").first().locator(".."),
    page.getByRole("group", { name: "Agent comparison metric" }),
    page.getByRole("group", { name: "Retrieval comparison metric" }),
    page.getByRole("group", { name: "Memory and disk metric" }),
    page.getByRole("group", { name: "Memory and disk tier" }),
    page.getByRole("group", { name: "Vorpal and tgrep metric" }),
  ];
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const treatments = [];
    for (const group of groups) {
      await group.scrollIntoViewIfNeeded();
      const buttons = group.getByRole("button").or(group.getByRole("tab"));
      const boxes = await buttons.evaluateAll((elements) =>
        elements.map((element) => {
          const rect = element.getBoundingClientRect();
          return { width: rect.width, height: rect.height };
        }),
      );
      expect(boxes.length).toBeGreaterThanOrEqual(2);
      expect(
        Math.max(...boxes.map((b) => b.width)) -
          Math.min(...boxes.map((b) => b.width)),
      ).toBeLessThan(1);
      expect(Math.min(...boxes.map((b) => b.height))).toBeGreaterThanOrEqual(
        44,
      );
      const active = group.locator(
        '[aria-pressed="true"], [aria-selected="true"]',
      );
      await expect(active).toHaveCount(1);
      treatments.push(
        await active.evaluate((element) => {
          const style = getComputedStyle(element);
          const underline = getComputedStyle(element, "::after");
          return {
            font: style.fontFamily,
            size: style.fontSize,
            background: style.backgroundColor,
            radius: style.borderRadius,
            border: style.borderWidth,
            line: underline.backgroundImage,
            height: underline.height,
          };
        }),
      );
    }
    for (const treatment of treatments)
      expect(treatment).toEqual(treatments[0]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  const embedding = page.locator("[data-vorpal-embeddings]");
  const active = embedding.getByRole("tab", { selected: true });
  await active.scrollIntoViewIfNeeded();
  const chroma = () =>
    active.evaluate(
      (element) => getComputedStyle(element, "::after").backgroundPosition,
    );
  const playing = await chroma();
  await expect.poll(chroma).not.toBe(playing);
  await embedding
    .getByRole("button", { name: "Pause embedding animation" })
    .click();
  const paused = await chroma();
  await page.waitForTimeout(200);
  expect(await chroma()).toBe(paused);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect
    .poll(() =>
      active.evaluate(
        (element) => getComputedStyle(element, "::after").animationName,
      ),
    )
    .toBe("none");
});

test("ranking trace labels retain their own proportional treatment beside the embedding diagrams", async ({
  page,
}) => {
  await page.goto("/blog/introducing-vorpal");
  for (const width of [320, 600, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const embedding = page.locator("[data-embedding-scene]:visible");
    for (const word of await embedding.locator("[data-embedding-word]").all()) {
      // The embedding engraving remains unchanged; only ranking uses Barlow.
      await expect(word).toHaveCSS("font-family", /Geist Mono Variable/);
    }
    const ranking = page.locator("[data-ranking-scene]:visible");
    for (const title of await ranking
      .locator(
        '[data-ranking-label^="channel-"], [data-ranking-label="result"]',
      )
      .all()) {
      await expect(title).toHaveCSS("font-family", /Barlow/);
    }
    for (const label of await ranking
      .locator(
        '[data-ranking-label^="candidate-"], [data-ranking-label^="output-"]',
      )
      .all()) {
      await expect(label).toHaveCSS("font-family", /Barlow/);
    }
    await expect(ranking.locator("[data-ranking-operation]")).toHaveText("");
  }
});
