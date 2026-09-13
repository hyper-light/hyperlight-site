import { approachProofScene } from "./proof-scene-helper";
import { expect, test, type Locator, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const ids = [
  "work-order",
  "evidence-cassette",
  "validation-fixture",
  "record-reader",
  "ledger-placement",
  "ledger-shards",
  "replica-failover",
  "latency-probing",
  "liveness-guard",
];

test("record labels never overlap at any settled lifecycle state", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const errors = await openPost(page);
  for (const width of testInfo.project.name.includes("mobile")
    ? [390, 320]
    : [1440]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const id of ids) {
      const figure = page.locator(`[data-proof-figure="${id}"]`);
      await approachProofScene(figure);
      for (const [step, tab] of (
        await figure.getByRole("tab").all()
      ).entries()) {
        await tab.click();
        const svg = scene(figure);
        await svg.scrollIntoViewIfNeeded();
        const overlaps = await svg.evaluate((element) => {
          const labels = Array.from(
            element.querySelectorAll<SVGTextElement>("[data-proof-label]"),
          )
            .filter(
              (label) => Number(label.getAttribute("opacity") ?? 1) >= 0.3,
            )
            .map((label) => ({
              id: label.dataset.proofLabel,
              box: label.getBoundingClientRect(),
            }));
          return labels.flatMap((a, index) =>
            labels.slice(index + 1).flatMap((b) => {
              const width =
                Math.min(a.box.right, b.box.right) -
                Math.max(a.box.left, b.box.left);
              const height =
                Math.min(a.box.bottom, b.box.bottom) -
                Math.max(a.box.top, b.box.top);
              return width > 0.5 && height > 0.5
                ? [`${a.id} overlaps ${b.id}`]
                : [];
            }),
          );
        });
        await svg.screenshot({
          path: testInfo.outputPath(`${id}-${width}-${step}.png`),
        });
        expect.soft(overlaps, `${id}, step ${step}, ${width}px`).toEqual([]);
      }
    }
  }
  expect(errors).toEqual([]);
});

test("record text has padding inside its projected glass surface", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openPost(page);
  if (testInfo.project.name.includes("mobile"))
    await page.setViewportSize({ width: 390, height: 1000 });
  const failures: string[] = [];
  for (const id of ids) {
    const figure = page.locator(`[data-proof-figure="${id}"]`);
    await approachProofScene(figure);
    for (const [step, tab] of (await figure.getByRole("tab").all()).entries()) {
      await tab.click();
      const violations = await scene(figure).evaluate((svg) =>
        Array.from(
          svg.querySelectorAll<SVGTextElement>("[data-proof-surface]"),
        ).flatMap((label) => {
          if (
            !label.textContent?.trim() ||
            Number(label.getAttribute("opacity") ?? 1) < 0.3
          )
            return [];
          const surface = svg.querySelector<SVGPathElement>(
            `[data-proof-path="${label.dataset.proofSurface}"]`,
          )!;
          const values = Array.from(
            surface.getAttribute("d")!.matchAll(/-?\d+(?:\.\d+)?/g),
            ([number]) => Number(number),
          );
          const points = Array.from(
            { length: values.length / 2 },
            (_, index) => [values[index * 2], values[index * 2 + 1]],
          );
          const box = label.getBBox();
          const transform = label.transform.baseVal.consolidate()?.matrix;
          const corners = [
            [box.x, box.y],
            [box.x + box.width, box.y],
            [box.x + box.width, box.y + box.height],
            [box.x, box.y + box.height],
          ].map(([x, y]) => {
            const point = new DOMPoint(x, y).matrixTransform(transform);
            return [point.x, point.y];
          });
          let clearance = Infinity;
          for (let index = 1; index < points.length; index++) {
            const [a, b] = [points[index - 1], points[index]];
            const dx = b[0] - a[0],
              dy = b[1] - a[1];
            for (const p of corners)
              clearance = Math.min(
                clearance,
                (dx * (p[1] - a[1]) - dy * (p[0] - a[0])) / Math.hypot(dx, dy),
              );
          }
          return clearance < 4
            ? [
                `${label.dataset.proofLabel}: ${clearance.toFixed(1)}px from ${label.dataset.proofSurface}`,
              ]
            : [];
        }),
      );
      failures.push(...violations.map((item) => `${id}/${step}: ${item}`));
    }
  }
  expect(failures).toEqual([]);
});

async function openPost(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  const response = await page.goto("/blog/agentic-proof-of-work");
  expect(response?.status()).toBe(200);
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator("[data-proof-figure]")).toHaveCount(10);
  return errors;
}

function scene(figure: Locator) {
  return figure.locator("[data-proof-scene]:visible");
}

function snapshot(svg: Locator) {
  return svg.evaluate((element) => element.innerHTML);
}

async function still(svg: Locator) {
  const before = await snapshot(svg);
  await new Promise((resolve) => setTimeout(resolve, 350));
  expect(await snapshot(svg)).toBe(before);
}

test("the renamed article retains its link, publication, and share metadata", async ({
  page,
  request,
}) => {
  const redirect = await request.get("/blog/what-counts-as-done", {
    maxRedirects: 0,
  });
  expect(redirect.status()).toBe(308);
  expect(redirect.headers().location).toBe("/blog/agentic-proof-of-work");
  const errors = await openPost(page);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Agentic Proof of Work",
  );
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    /\/blog\/agentic-proof-of-work$/,
  );
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
    "content",
    /Agentic Proof of Work/,
  );
  const share = await page
    .locator('meta[property="og:image"]')
    .getAttribute("content");
  expect(share).toBeTruthy();
  const url = new URL(share!);
  const image = await request.get(url.pathname + url.search);
  expect(image.status()).toBe(200);
  expect(image.headers()["content-type"]).toContain("image/png");
  expect((await image.body()).readUInt32BE(16)).toBe(1200);
  await expect(
    page.getByRole("heading", {
      name: "Validator Execution",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Meet the project/ }),
  ).toHaveCount(0);
  expect(
    await page
      .locator('a[href*="/626b1b59fa286ba4093e96f481afe38b8b061ede/"]')
      .count(),
  ).toBeGreaterThan(10);
  await page.goto("/blog");
  await expect(
    page.getByRole("heading", { name: "Agentic Proof of Work", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Announcing Hyperlight",
      exact: true,
    }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("all nine assemblies fit, use stable tab heights, and remain legible at narrow widths", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const errors = await openPost(page);
  const widths = testInfo.project.name.includes("mobile")
    ? [390, 320]
    : [1440, 1024];
  for (const width of widths) {
    await page.setViewportSize({ width, height: 1000 });
    for (const id of ids) {
      const figure = page.locator(`[data-proof-figure="${id}"]`);
      await approachProofScene(figure);
      const svg = scene(figure);
      await svg.scrollIntoViewIfNeeded();
      await expect(svg).toHaveCount(1);
      const original = await figure.boundingBox();
      const count = await svg.locator("[data-proof-path]").count();
      expect(count).toBeGreaterThan(100);
      for (const [index, tab] of (
        await figure.getByRole("tab").all()
      ).entries()) {
        await tab.click();
        await expect(tab).toHaveAttribute("aria-selected", "true");
        await expect(svg).toHaveAttribute(
          "data-proof-selection",
          index.toFixed(3),
        );
        await expect(figure.getByRole("tabpanel")).toHaveCount(1);
        expect((await figure.boundingBox())!.height).toBeCloseTo(
          original!.height,
          0,
        );
        await expect(svg.locator("[data-proof-path]")).toHaveCount(count);
        const bounds = await svg.evaluate((element) => {
          const svg = element as SVGSVGElement;
          const view = svg.viewBox.baseVal;
          return Array.from(
            svg.querySelectorAll<SVGGraphicsElement>(
              "[data-proof-path], [data-proof-label]",
            ),
            (node) => {
              const box = node.getBBox();
              const transform = node.transform.baseVal.consolidate()?.matrix;
              const corners = [
                [box.x, box.y],
                [box.x + box.width, box.y],
                [box.x + box.width, box.y + box.height],
                [box.x, box.y + box.height],
              ].map(([x, y]) => new DOMPoint(x, y).matrixTransform(transform));
              return {
                id:
                  node.getAttribute("data-proof-path") ??
                  node.getAttribute("data-proof-label"),
                d: node.getAttribute("d") ?? "",
                left: Math.min(...corners.map((p) => p.x)),
                top: Math.min(...corners.map((p) => p.y)),
                right: view.width - Math.max(...corners.map((p) => p.x)),
                bottom: view.height - Math.max(...corners.map((p) => p.y)),
              };
            },
          );
        });
        expect(
          bounds.filter(
            (bound) =>
              /NaN|Infinity/.test(bound.d) ||
              Math.min(bound.left, bound.top, bound.right, bound.bottom) < -0.1,
          ),
          `${id} at ${width}px`,
        ).toEqual([]);
        const box = (await tab.boundingBox())!;
        expect(box.width).toBeGreaterThanOrEqual(44);
        expect(box.height).toBeGreaterThanOrEqual(44);
      }
      await figure.getByRole("tab").first().click();
      await figure.screenshot({
        path: testInfo.outputPath(`${id}-${width}.png`),
      });
      await svg.screenshot({
        path: testInfo.outputPath(`${id}-art-${width}.png`),
      });
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    for (const table of await page.locator("article table").all()) {
      const widthDifference = await table.evaluate(
        (element) =>
          element.parentElement!.clientWidth -
          element.getBoundingClientRect().width,
      );
      expect(widthDifference).toBeLessThan(2);
    }
  }
  expect(errors).toEqual([]);
});

test("the visible outcomes distinguish mismatched evidence, failure, absence, and evaluator error", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const errors = await openPost(page);
  const fixture = page.locator('[data-proof-figure="validation-fixture"]');
  for (const [label, acceptance, tests, review] of [
    ["Same patch", "Satisfied", "Pass · patch A", "Pass · patch A"],
    ["Mixed patches", "Not satisfied", "Pass · patch A", "Pass · patch B"],
    ["Failed check", "Failed", "Fail · patch A", "Pass · patch A"],
    ["Missing", "Incomplete", "No artifact to check", "No artifact to check"],
    ["Tool error", "Errored", "Error · patch A", "Pass · patch A"],
  ]) {
    await fixture.getByRole("tab", { name: label, exact: true }).click();
    const panel = fixture.getByRole("tabpanel");
    await expect(panel.locator("dd")).toHaveText([tests, review, acceptance]);
    await fixture.screenshot({
      path: testInfo.outputPath(`fixture-${label.replaceAll(" ", "-")}.png`),
    });
  }
  const order = page.locator('[data-proof-figure="work-order"]');
  await approachProofScene(order);
  for (const tab of await order.getByRole("tab").all()) {
    await tab.click();
    await expect(order.getByRole("tabpanel")).toContainText("Not evaluated");
    await expect(
      scene(order).locator('[data-proof-label="claim-c17-title"]'),
    ).toHaveText("C17");
  }
  const history = page.locator('[data-proof-figure="record-reader"]');
  await approachProofScene(history);
  for (const tab of await history.getByRole("tab").all()) {
    await tab.click();
    await expect(history.getByRole("tabpanel").locator("dd")).toHaveText([
      "patch-a · Fail",
      "C17 · ValidationFailed",
      "C18 · new claim",
      "patch-b · not evaluated",
    ]);
  }
  expect(errors).toEqual([]);
});

test("keyboard controls and reduced-motion figures expose complete accessible explanations", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const errors = await openPost(page);
  for (const id of ids) {
    const figure = page.locator(`[data-proof-figure="${id}"]`);
    await approachProofScene(figure);
    const tabs = figure.getByRole("tab");
    await tabs.first().focus();
    await page.keyboard.press("ArrowRight");
    await expect(tabs.nth(1)).toBeFocused();
    await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
    await page.keyboard.press("End");
    await expect(tabs.last()).toBeFocused();
    await page.keyboard.press("Home");
    await expect(tabs.first()).toBeFocused();
    await expect(
      figure.getByRole("button", { name: /follows reduced motion/ }),
    ).toBeDisabled();
    await scene(figure).scrollIntoViewIfNeeded();
    await still(scene(figure));
  }
  const audit = await new AxeBuilder({ page })
    .include("article")
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(audit.violations).toEqual([]);
  expect(errors).toEqual([]);
});

test("actor names and claim status share one restrained typographic scale", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openPost(page);
  const figure = page.locator('[data-proof-figure="work-order"]');
  await approachProofScene(figure);
  const typography = await scene(figure).evaluate((svg) =>
    [
      "maintainer-name",
      "ledger-name",
      "parser-agent-name",
      "claim-state",
      "acceptance",
    ].map((id) => {
      const label = svg.querySelector<SVGTextElement>(
        `[data-proof-label="${id}"]`,
      )!;
      const style = getComputedStyle(label);
      return [style.fontFamily, style.fontSize, style.fontWeight];
    }),
  );
  for (const style of typography) expect(style).toEqual(typography[0]);
});

test("lifecycle playback stops at the receipt and replay visibly rebuilds the ledger", async ({
  page,
}) => {
  test.setTimeout(60000);
  const errors = await openPost(page);
  const order = page.locator('[data-proof-figure="work-order"]');
  await approachProofScene(order);
  await scene(order).scrollIntoViewIfNeeded();
  await expect(
    order.getByRole("tab", { name: "Post", exact: true }),
  ).toHaveAttribute("aria-selected", "true", { timeout: 8000 });
  await expect(
    order.getByRole("tab", { name: "Accept", exact: true }),
  ).toHaveAttribute("aria-selected", "true", { timeout: 8000 });
  await new Promise((resolve) => setTimeout(resolve, 5300));
  await expect(
    order.getByRole("tab", { name: "Accept", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  const history = page.locator('[data-proof-figure="record-reader"]');
  await approachProofScene(history);
  await history.getByRole("tab", { name: "Replay", exact: true }).click();
  const svg = scene(history);
  await svg.scrollIntoViewIfNeeded();
  const archive = await svg
    .locator('[data-proof-label^="ledger-entry-"]')
    .allTextContents();
  const cursor = svg.locator('[data-proof-path="read-window"]');
  const initial = await cursor.getAttribute("d");
  await expect.poll(() => cursor.getAttribute("d")).not.toEqual(initial);
  await expect(svg.locator('[data-proof-label="replay-prefix"]')).toHaveText(
    "04 / 04",
    { timeout: 10000 },
  );
  await expect(svg.locator('[data-proof-label="failed-state"]')).toHaveText(
    "Failed",
  );
  expect(
    await svg.locator('[data-proof-label^="ledger-entry-"]').allTextContents(),
  ).toEqual(archive);
  expect(errors).toEqual([]);
});

test("motion changes real geometry and respects pause, offscreen state, and live reduced motion", async ({
  page,
}) => {
  const errors = await openPost(page);
  for (const id of ids) {
    const figure = page.locator(`[data-proof-figure="${id}"]`);
    await approachProofScene(figure);
    const svg = scene(figure);
    await svg.scrollIntoViewIfNeeded();
    const geometry = () =>
      svg
        .locator("[data-proof-path]")
        .evaluateAll((paths) => paths.map((path) => path.getAttribute("d")));
    const initial = await geometry();
    await expect.poll(geometry).not.toEqual(initial);
    // Keep an actual node identity marker: selection and motion don't rebuild the scene.
    await svg
      .locator("[data-proof-path]")
      .first()
      .evaluate((node) => node.setAttribute("data-node-identity", "retained"));
    await figure.getByRole("tab").nth(1).click();
    await figure.getByRole("button", { name: /^Pause / }).click();
    await still(svg);
    await figure.getByRole("tab").last().click();
    await expect(svg).toHaveAttribute(
      "data-proof-selection",
      ((await figure.getByRole("tab").count()) - 1).toFixed(3),
    );
    await still(svg);
    await expect(svg.locator("[data-proof-path]").first()).toHaveAttribute(
      "data-node-identity",
      "retained",
    );
    await figure.getByRole("button", { name: /^Resume / }).click();
    await svg.scrollIntoViewIfNeeded();
    const resumed = await geometry();
    await expect.poll(geometry).not.toEqual(resumed);
    await page.evaluate(() => window.scrollTo(0, 0));
    await new Promise((resolve) => setTimeout(resolve, 350));
    await still(svg);
  }
  const figure = page.locator('[data-proof-figure="validation-fixture"]');
  await approachProofScene(figure);
  await scene(figure).scrollIntoViewIfNeeded();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(
    figure.getByRole("button", { name: /follows reduced motion/ }),
  ).toBeDisabled();
  await still(scene(figure));
  await figure.getByRole("tab", { name: "Mixed patches" }).click();
  await expect(scene(figure)).toHaveAttribute("data-proof-selection", "1.000");
  await still(scene(figure));
  expect(errors).toEqual([]);
});
