import { expect, test, type Locator, type Page } from "@playwright/test";

const figureSelector = '[data-proof-figure="slates-orbital-fleet"]';
const stages = [
  "Base",
  "Provision",
  "Deploy",
  "Edit",
  "Submit",
  "Merge",
  "Replicate",
  "Ready",
];
const existingFigures = [
  "slates-namespace",
  "slates-workspace",
  "slates-operation-map",
  "slates-merge",
  "slates-ownership",
  "slates-recovery",
  "slates-fleet",
  "slates-authority",
  "slates-transport",
  "slates-landing",
  "slates-conflict-resolution",
];
const stationPrefixes = [
  "owner-station-",
  "worker-station-1-",
  "worker-station-2-",
  "worker-station-3-",
  "home-station-",
  "mirror-station-",
];
const craftPrefixes = ["vfs-craft-1-", "vfs-craft-2-", "vfs-craft-3-"];

async function openFleet(page: Page, reduced = true) {
  await page.emulateMedia({
    reducedMotion: reduced ? "reduce" : "no-preference",
  });
  const response = await page.goto("/blog/introducing-slates");
  expect(response?.status()).toBe(200);
  await page.evaluate(() => document.fonts.ready);
  const figure = page.locator(figureSelector);
  await expect(figure).toHaveCount(1);
  const svg = figure.locator("[data-proof-scene]:visible");
  await expect(svg).toHaveCount(1);
  return { figure, svg };
}

async function seek(figure: Locator, svg: Locator, stage: number) {
  await figure.getByRole("tab", { name: stages[stage], exact: true }).click();
  await expect(svg).toHaveAttribute("data-proof-selection", stage.toFixed(3));
}

async function geometry(svg: Locator) {
  return svg.locator("[data-proof-path]").evaluateAll((paths) =>
    paths.map((path) => ({
      id: path.getAttribute("data-proof-path"),
      d: path.getAttribute("d"),
      opacity: path.getAttribute("opacity"),
      fill: path.getAttribute("fill-opacity"),
      fillColor: path.getAttribute("fill"),
      strokeOpacity: path.getAttribute("stroke-opacity"),
      tone: path.getAttribute("style"),
      dash: path.getAttribute("stroke-dashoffset"),
    })),
  );
}

async function hardware(svg: Locator) {
  // Ignore the shared dashed-route animation: it cannot prove that the
  // station machinery or spacecraft themselves react to the lifecycle.
  return (await geometry(svg))
    .filter((path) =>
      [...stationPrefixes, ...craftPrefixes].some((prefix) =>
        path.id?.startsWith(prefix),
      ),
    )
    .map(({ id, d, opacity, fill, fillColor, strokeOpacity, tone }) => ({
      id,
      d,
      opacity,
      fill,
      fillColor,
      strokeOpacity,
      tone,
    }));
}

async function assemblyCradleLabelIssues(svg: Locator) {
  return svg.evaluate((element) => {
    const scene = element as SVGSVGElement;
    const inverse = scene.getScreenCTM()!.inverse();
    const bounds = (item: SVGGraphicsElement) => {
      const box = item.getBBox();
      const matrix = inverse.multiply(item.getScreenCTM()!);
      const corners = [
        [box.x, box.y],
        [box.x + box.width, box.y],
        [box.x + box.width, box.y + box.height],
        [box.x, box.y + box.height],
      ].map(([x, y]) => new DOMPoint(x, y).matrixTransform(matrix));
      return {
        left: Math.min(...corners.map((point) => point.x)),
        right: Math.max(...corners.map((point) => point.x)),
        top: Math.min(...corners.map((point) => point.y)),
        bottom: Math.max(...corners.map((point) => point.y)),
      };
    };
    const labels = Array.from(
      scene.querySelectorAll<SVGTextElement>("[data-proof-label]"),
    )
      .filter(
        (label) =>
          Number(label.getAttribute("opacity") ?? 1) > 0.1 &&
          label.textContent?.trim(),
      )
      .map((label) => ({ id: label.dataset.proofLabel, ...bounds(label) }));
    // Empty provisioning berths are still visible physical objects before
    // any craft exists. Their collision coverage must not depend on craft opacity.
    const faces = Array.from(
      scene.querySelectorAll<SVGPathElement>(
        '[data-proof-path^="assembly-cradle-"]',
      ),
    )
      .filter(
        (path) =>
          Number(path.getAttribute("opacity") ?? 1) > 0.02 &&
          /-(deck|depth|clamp--?1)$/.test(path.dataset.proofPath ?? ""),
      )
      .map((path) => ({ id: path.dataset.proofPath, ...bounds(path) }));
    return faces.flatMap((face) =>
      labels
        .filter(
          (label) =>
            !(
              label.right + 2 <= face.left ||
              face.right + 2 <= label.left ||
              label.bottom + 2 <= face.top ||
              face.bottom + 2 <= label.top
            ),
        )
        .map((label) => `${face.id} touches ${label.id}`),
    );
  });
}

test("the orbital opener precedes EdenFS without replacing any Slates explanation", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const { figure, svg } = await openFleet(page);
  await expect(page.locator("[data-proof-figure]")).toHaveCount(12);
  for (const id of existingFigures)
    await expect(page.locator(`[data-proof-figure="${id}"]`)).toHaveCount(1);
  expect(
    await figure.evaluate((element) => {
      const heading = Array.from(document.querySelectorAll("h2")).find(
        (candidate) => candidate.textContent === "Building on EdenFS",
      );
      return (
        !!heading &&
        !!(
          element.compareDocumentPosition(heading) &
          Node.DOCUMENT_POSITION_FOLLOWING
        ) &&
        !Array.from(document.querySelectorAll("h2")).some(
          (candidate) =>
            element.compareDocumentPosition(candidate) &
            Node.DOCUMENT_POSITION_PRECEDING,
        )
      );
    }),
  ).toBe(true);
  await expect(figure.getByRole("tab")).toHaveText(stages);
  expect(await svg.locator("[data-proof-path]").count()).toBeGreaterThan(100);
  for (const prefix of [...stationPrefixes, ...craftPrefixes])
    expect(
      await svg.locator(`[data-proof-path^="${prefix}"]`).count(),
      `${prefix} should contain detailed physical geometry`,
    ).toBeGreaterThan(20);
  const ids = (await geometry(svg)).map((path) => path.id);
  expect(new Set(ids).size).toBe(ids.length);
  expect(errors).toEqual([]);
});

test("the fleet has eight materially different lifecycle frames", async ({
  page,
}) => {
  const { figure, svg } = await openFleet(page);
  const signatures: string[] = [];
  const initialIds = (await geometry(svg)).map((path) => path.id);
  const meanings = [
    /base|snapshot|starting version|captured/i,
    /private|copy.on.write|workspace|volume/i,
    /region|worker|station|remote/i,
    /edit|change|private/i,
    /operation|submit|owner/i,
    /accept|merge|combine|conflict/i,
    /verif|replic|holder|cop/i,
    /version|accepted|shared/i,
  ];
  for (let stage = 0; stage < stages.length; stage++) {
    await seek(figure, svg, stage);
    const panel = figure.locator('[role="tabpanel"][data-active="true"]');
    await expect(panel).toContainText(meanings[stage]);
    signatures.push(JSON.stringify(await geometry(svg)));
    expect((await geometry(svg)).map((path) => path.id)).toEqual(initialIds);
  }
  expect(new Set(signatures).size).toBe(stages.length);
  await expect(figure.locator("figcaption")).toContainText(/disk|approval/i);
});

test("all fleet captions stay separated and inside the canvas at every screen width", async ({
  page,
}, testInfo) => {
  test.setTimeout(180_000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const { figure, svg } = await openFleet(page);
  for (const width of [320, 390, 700, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1100 });
    await expect(svg).toHaveCount(1);
    const portrait = await svg.getAttribute("data-portrait");
    await expect(svg).toHaveAttribute(
      "viewBox",
      portrait === "true" ? "0 0 420 800" : "0 0 800 720",
    );
    for (let stage = 0; stage < stages.length; stage++) {
      await seek(figure, svg, stage);
      const issues = await svg.evaluate((element) => {
        const scene = element as SVGSVGElement;
        const bounds = scene.viewBox.baseVal;
        const inverse = scene.getScreenCTM()!.inverse();
        const labels = Array.from(
          scene.querySelectorAll<SVGTextElement>("[data-proof-label]"),
        )
          .filter(
            (label) =>
              Number(label.getAttribute("opacity") ?? 1) > 0.1 &&
              label.textContent?.trim(),
          )
          .map((label) => {
            const box = label.getBBox();
            const matrix = inverse.multiply(label.getScreenCTM()!);
            const corners = [
              [box.x, box.y],
              [box.x + box.width, box.y],
              [box.x + box.width, box.y + box.height],
              [box.x, box.y + box.height],
            ].map(([x, y]) => new DOMPoint(x, y).matrixTransform(matrix));
            return { id: label.dataset.proofLabel, corners };
          });
        const failures: string[] = [];
        for (let i = 0; i < labels.length; i++) {
          const first = labels[i];
          if (
            first.corners.some(
              ({ x, y }) =>
                x < 4 || y < 4 || x > bounds.width - 4 || y > bounds.height - 4,
            )
          )
            failures.push(`${first.id}: outside canvas`);
          for (let j = i + 1; j < labels.length; j++) {
            const second = labels[j];
            const separated = [first.corners, second.corners].some((polygon) =>
              polygon.some((point, index) => {
                const next = polygon[(index + 1) % polygon.length];
                const length = Math.hypot(next.x - point.x, next.y - point.y);
                const nx = -(next.y - point.y) / length;
                const ny = (next.x - point.x) / length;
                const a = first.corners.map((p) => p.x * nx + p.y * ny);
                const b = second.corners.map((p) => p.x * nx + p.y * ny);
                return (
                  Math.max(...a) + 2 <= Math.min(...b) ||
                  Math.max(...b) + 2 <= Math.min(...a)
                );
              }),
            );
            if (!separated) failures.push(`${first.id} overlaps ${second.id}`);
          }
        }
        return failures;
      });
      expect.soft(issues, `${width}/${stages[stage]}`).toEqual([]);
      expect
        .soft(
          await assemblyCradleLabelIssues(svg),
          `${width}/${stages[stage]} provisioning berths`,
        )
        .toEqual([]);
      if (
        ([390, 1440].includes(width) && [0, 2, 3, 5, 7].includes(stage)) ||
        (width === 1440 && stage === 4)
      ) {
        await svg.screenshot({
          path: testInfo.outputPath(`orbital-${width}-${stages[stage]}.png`),
        });
      }
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }
  expect(errors).toEqual([]);
});

test("mobile copies stay above the owner and staggered workers in a compact scene", async ({
  page,
}, testInfo) => {
  const { figure, svg } = await openFleet(page);
  await expect(
    figure.getByRole("button", { name: /follows reduced motion/ }),
  ).toBeDisabled();
  const choice = figure.getByRole("combobox", {
    name: "Scenario",
    exact: true,
  });
  for (const viewport of [
    { width: 320, height: 740 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    for (const scenario of [
      "success",
      "conflict",
      "missing",
      "unavailable",
      "reply-loss",
      "owner-loss",
    ]) {
      await choice.selectOption(scenario);
      const tabs = figure.getByRole("tab");
      for (const stage of [0, (await tabs.count()) - 1]) {
        await tabs.nth(stage).click();
        await expect(svg).toHaveAttribute(
          "data-proof-selection",
          stage.toFixed(3),
        );
        await svg.evaluate((element) => {
          const header = document.querySelector(".site-header")!;
          window.scrollTo({
            top:
              scrollY +
              element.getBoundingClientRect().top -
              header.getBoundingClientRect().height -
              8,
            behavior: "instant",
          });
        });
        const layout = await svg.evaluate((element) => {
          const scene = element as SVGSVGElement;
          const figure = scene.closest("figure")!;
          const sceneBounds = scene.getBoundingClientRect();
          const rail = figure.querySelector('[role="tablist"]')!;
          const railBounds = rail.getBoundingClientRect();
          const header = document
            .querySelector(".site-header")!
            .getBoundingClientRect();
          const hardwareBounds = (prefix: string) => {
            const paths = Array.from(
              scene.querySelectorAll<SVGPathElement>(
                `[data-proof-path^="${prefix}"]`,
              ),
            ).filter((path) => Number(path.getAttribute("opacity") ?? 1) > 0.1);
            const boxes = paths.map((path) => path.getBoundingClientRect());
            return {
              count: boxes.length,
              top: Math.min(...boxes.map((box) => box.top)),
              bottom: Math.max(...boxes.map((box) => box.bottom)),
              centerX:
                (Math.min(...boxes.map((box) => box.left)) +
                  Math.max(...boxes.map((box) => box.right))) /
                2,
            };
          };
          return {
            sceneTop: sceneBounds.top,
            sceneBottom: sceneBounds.bottom,
            railTop: railBounds.top,
            headerBottom: header.bottom,
            sceneHeight: scene.viewBox.baseVal.height,
            bodyWidth: document.documentElement.scrollWidth,
            viewportWidth: innerWidth,
            owner: hardwareBounds("owner-station-"),
            copies: ["home-station-", "mirror-station-"].map(hardwareBounds),
            workers: [
              "worker-station-1-",
              "worker-station-2-",
              "worker-station-3-",
            ].map((prefix, index) => {
              const hardware = hardwareBounds(prefix);
              const title = scene.querySelector<SVGTextElement>(
                `[data-proof-label="worker-${index + 1}-name"]`,
              )!;
              const status = scene.querySelector<SVGTextElement>(
                `[data-proof-label="worker-${index + 1}-edit"]`,
              )!;
              return {
                ...hardware,
                centeredPair:
                  title.getAttribute("x") === status.getAttribute("x") &&
                  title.getAttribute("text-anchor") === "middle" &&
                  status.getAttribute("text-anchor") === "middle",
                statusGap:
                  (hardware.top - status.getBoundingClientRect().bottom) /
                  (sceneBounds.width / scene.viewBox.baseVal.width),
              };
            }),
          };
        });
        const context = `${viewport.width}/${scenario}/${stage}`;
        expect(layout.sceneTop, context).toBeGreaterThanOrEqual(
          layout.headerBottom + 4,
        );
        expect(layout.sceneBottom, context).toBeLessThanOrEqual(layout.railTop);
        expect(
          layout.railTop - layout.sceneBottom,
          context,
        ).toBeLessThanOrEqual(8);
        expect(layout.sceneHeight, context).toBeLessThanOrEqual(840);
        expect(layout.bodyWidth, context).toBeLessThanOrEqual(
          layout.viewportWidth,
        );
        expect(layout.owner.count, context).toBeGreaterThan(20);
        for (const copy of layout.copies) {
          expect(copy.count, context).toBeGreaterThan(20);
          expect(copy.bottom, context).toBeLessThan(layout.owner.top);
        }
        for (const worker of layout.workers) {
          expect(worker.count, context).toBeGreaterThan(20);
          expect(layout.owner.bottom, context).toBeLessThan(worker.top);
          expect(worker.centeredPair, context).toBe(true);
          expect(worker.statusGap, context).toBeGreaterThanOrEqual(8);
          expect(worker.statusGap, context).toBeLessThanOrEqual(22);
        }
        const workerCenters = layout.workers.map((worker) => worker.centerX);
        expect(
          Math.max(...workerCenters) - Math.min(...workerCenters),
          context,
        ).toBeGreaterThan(layout.viewportWidth * 0.15);
        if (scenario === "success" && stage === 0)
          await page.screenshot({
            path: testInfo.outputPath(
              `orbital-${viewport.width}-whole-scene.png`,
            ),
          });
      }
    }
  }
});

test("reduced motion still exposes every stage and supports keyboard seeking and replay", async ({
  page,
}) => {
  const { figure, svg } = await openFleet(page);
  await expect(
    figure.getByRole("button", { name: /follows reduced motion/ }),
  ).toBeDisabled();
  const first = figure.getByRole("tab", { name: stages[0], exact: true });
  await first.focus();
  await first.press("End");
  await expect(svg).toHaveAttribute("data-proof-selection", "7.000");
  await expect(
    figure.getByRole("tab", { name: "Ready", exact: true }),
  ).toBeFocused();
  const paused = await geometry(svg);
  await page.waitForTimeout(250);
  expect(await geometry(svg)).toEqual(paused);
  await figure.getByRole("button", { name: /^Replay / }).click();
  await expect(svg).toHaveAttribute("data-proof-selection", "0.000");
  await expect(first).toHaveAttribute("aria-selected", "true");
});

test("the hardware remains alive at held stages and pause freezes the entire fleet", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const { figure, svg } = await openFleet(page, false);
  for (const stage of [1, 3, 5, 6, 7]) {
    await figure.getByRole("tab", { name: stages[stage], exact: true }).click();
    await svg.scrollIntoViewIfNeeded();
    await expect(svg).toHaveAttribute("data-proof-selection", stage.toFixed(3));
    const before = await hardware(svg);
    await expect
      .poll(async () => JSON.stringify(await hardware(svg)), {
        message: `The ${stages[stage]} stage should animate physical hardware`,
      })
      .not.toBe(JSON.stringify(before));
  }
  await figure.getByRole("button", { name: /^Pause .* animation$/ }).click();
  await expect(
    figure.getByRole("button", { name: /^Resume .* animation$/ }),
  ).toHaveAttribute("aria-pressed", "true");
  const paused = await geometry(svg);
  await page.waitForTimeout(300);
  expect(await geometry(svg)).toEqual(paused);
  await figure.getByRole("button", { name: /^Resume .* animation$/ }).click();
  await svg.scrollIntoViewIfNeeded();
  await expect
    .poll(async () => JSON.stringify(await geometry(svg)))
    .not.toBe(JSON.stringify(paused));
});

test.describe("touch navigation", () => {
  test.use({ hasTouch: true });

  test("every stage is tappable and stays inside the mobile rail", async ({
    page,
  }) => {
    const { figure, svg } = await openFleet(page);
    const rail = figure.getByRole("tablist");
    for (const width of [320, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      await expect(rail).toHaveAttribute("data-mobile-stage-rail", "true");
      expect(
        await rail.evaluate((element) => getComputedStyle(element).overflowX),
      ).toBe("auto");
      for (let stage = 0; stage < stages.length; stage++) {
        const tab = figure.getByRole("tab", {
          name: stages[stage],
          exact: true,
        });
        const hitArea = await tab.boundingBox();
        expect(hitArea?.width).toBeGreaterThanOrEqual(44);
        expect(hitArea?.height).toBeGreaterThanOrEqual(44);
        await tab.tap();
        await expect(svg).toHaveAttribute(
          "data-proof-selection",
          stage.toFixed(3),
        );
        expect(
          await rail.evaluate((element) => {
            const bounds = element.getBoundingClientRect();
            const active = element
              .querySelector('[aria-selected="true"]')!
              .getBoundingClientRect();
            // Scroll widths round to whole CSS pixels while glyph-sized tabs
            // retain fractional widths (Ready ends 0.047px beyond the rail).
            return (
              active.left >= bounds.left - 0.5 &&
              active.right <= bounds.right + 0.5
            );
          }),
        ).toBe(true);
      }

      // Keyboard jumps exercise the rail's own scroll management. Touch taps
      // alone could pass because the test driver first reveals their target.
      await figure
        .getByRole("tab", { name: "Ready", exact: true })
        .press("Home");
      const scrollBefore = await page.evaluate(() => window.scrollY);
      await figure.getByRole("tab", { name: "Base", exact: true }).press("End");
      await expect(svg).toHaveAttribute("data-proof-selection", "7.000");
      expect(await page.evaluate(() => window.scrollY)).toBe(scrollBefore);
      expect(
        await rail.evaluate((element) => {
          const bounds = element.getBoundingClientRect();
          const active = element
            .querySelector('[aria-selected="true"]')!
            .getBoundingClientRect();
          return (
            active.left >= bounds.left - 0.5 &&
            active.right <= bounds.right + 0.5
          );
        }),
      ).toBe(true);
      for (const control of await figure.locator("header button").all()) {
        const hitArea = await control.boundingBox();
        expect(hitArea?.width).toBeGreaterThanOrEqual(44);
        expect(hitArea?.height).toBeGreaterThanOrEqual(44);
      }
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
    }
  });
});

test("provisioning and deployment remain inspectable between their endpoints", async ({
  page,
}, testInfo) => {
  test.setTimeout(120_000);
  const { figure, svg } = await openFleet(page, false);
  await figure.getByRole("button", { name: /^Pause .* animation$/ }).click();
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 1100 });
    for (const progress of [0.25, 0.5, 0.75, 1.08, 1.25, 1.5, 1.75]) {
      const from = progress < 1 ? 0 : 1;
      const to = from + 1;
      // A paused in-flight pose can already target the next sample's start
      // tab. Replay gives each sample a fresh origin without injecting state.
      await figure
        .getByRole("button", { name: /^Replay .* sequence$/ })
        .click();
      await expect(svg).toHaveAttribute("data-proof-selection", "0.000");
      await seek(figure, svg, from);
      await svg.scrollIntoViewIfNeeded();
      // Dispatch the same UI controls without scrolling the scene offscreen
      // during a short transition. No geometry state or clock is injected.
      await figure
        .getByRole("button", { name: /^Resume .* animation$/ })
        .dispatchEvent("click");
      await figure
        .getByRole("tab", { name: stages[to], exact: true })
        .dispatchEvent("click");
      await page.waitForFunction(
        ({ selector, progress }) =>
          Array.from(
            document.querySelectorAll<SVGSVGElement>(
              `${selector} [data-proof-scene]`,
            ),
          ).some(
            (scene) =>
              scene.getClientRects().length > 0 &&
              Number(scene.dataset.proofSelection) >= progress,
          ),
        { selector: figureSelector, progress },
      );
      await figure
        .getByRole("button", { name: /^Pause .* animation$/ })
        .dispatchEvent("click");
      const actual = Number(await svg.getAttribute("data-proof-selection"));
      expect(actual).toBeGreaterThanOrEqual(progress);
      expect(actual).toBeLessThan(to);
      expect(
        await assemblyCradleLabelIssues(svg),
        `The provisioning berths must clear native labels at ${width}px / ${actual}`,
      ).toEqual([]);
      expect(
        await svg.evaluate((element) => {
          const scene = element as SVGSVGElement;
          const caption = scene.querySelector<SVGTextElement>(
            '[data-proof-label="orbital-stage"]',
          )!;
          const box = caption.getBBox();
          return (
            box.x >= 4 &&
            box.y >= 4 &&
            box.x + box.width <= scene.viewBox.baseVal.width - 4 &&
            box.y + box.height <= scene.viewBox.baseVal.height - 4
          );
        }),
        `The in-flight caption must fit at ${width}px / ${actual}`,
      ).toBe(true);
      await svg.screenshot({
        path: testInfo.outputPath(`orbital-${width}-flight-${progress}.png`),
      });
      const frame = await geometry(svg);
      await page.waitForTimeout(100);
      expect(await geometry(svg)).toEqual(frame);
    }
  }
});
