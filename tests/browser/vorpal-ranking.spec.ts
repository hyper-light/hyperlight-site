import { expect, test, type Locator, type Page } from "@playwright/test";

async function openRanking(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  const response = await page.goto("/blog/introducing-vorpal");
  expect(response?.status()).toBe(200);
  const figure = page.locator("[data-vorpal-ranking]");
  const svg = figure.locator("[data-ranking-art]:visible");
  await svg.scrollIntoViewIfNeeded();
  await expect(svg).toBeVisible();
  return { figure, svg, errors };
}

function geometry(svg: Locator) {
  return svg
    .locator("path[data-ranking-shape]")
    .evaluateAll((paths) => paths.map((path) => path.getAttribute("d")));
}

function prism(svg: Locator) {
  return svg
    .locator("[data-ranking-prism]")
    .evaluate((gradient) =>
      ["x1", "x2", "y1", "y2"].map((name) => gradient.getAttribute(name)),
    );
}

async function expectStill(svg: Locator) {
  const snapshot = await svg.evaluate((element) => element.innerHTML);
  await new Promise((resolve) => setTimeout(resolve, 350));
  expect(await svg.evaluate((element) => element.innerHTML)).toBe(snapshot);
}

test("ranking uses the worked RRF example and candidate controls explain each contribution", async ({
  page,
}, testInfo) => {
  const { figure, svg, errors } = await openRanking(page);
  await expect(
    figure.getByRole("heading", {
      name: "Different signals. One result order.",
    }),
  ).toBeVisible();
  await expect(figure.getByRole("table")).toHaveAccessibleName(
    "Illustrative ranks, starting at zero. Sorted by the computed RRF total.",
  );
  expect(
    await figure
      .locator("tbody tr")
      .evaluateAll((rows) =>
        rows.map((row) => Array.from(row.children, (cell) => cell.textContent)),
      ),
  ).toEqual([
    ["C", "1", "2", "0", "0.04919"],
    ["A", "0", "5", "1", "0.04844"],
    ["B", "—", "0", "—", "0.01667"],
  ]);

  const expected = {
    A: "A: 1/60 + 1/65 + 1/61 = 0.04844",
    B: "B: 0 + 1/60 + 0 = 0.01667",
    C: "C: 1/61 + 1/62 + 1/60 = 0.04919",
  };
  for (const candidate of ["A", "B", "C"] as const) {
    const button = figure.getByRole("button", {
      name: `Candidate ${candidate}`,
      exact: true,
    });
    await button.click();
    await expect(button).toHaveAttribute("aria-pressed", "true");
    await expect(figure.locator('[aria-live="polite"]')).toContainText(
      expected[candidate],
    );
    await expect(svg).toHaveAttribute("data-highlight", candidate);
    // Highlighting never removes the other candidates or changes the result data.
    await expect(figure.locator("tbody tr")).toHaveCount(3);
    await expect(figure.locator('[data-ranking-score="C"]')).toHaveText(
      "0.04919",
    );
  }
  const all = figure.getByRole("button", {
    name: "All candidates",
    exact: true,
  });
  await all.focus();
  await page.keyboard.press("Enter");
  await expect(all).toHaveAttribute("aria-pressed", "true");
  await expect(svg).toHaveAttribute("data-highlight", "all");

  if (testInfo.project.name.includes("mobile")) {
    await page.setViewportSize({ width: 320, height: 844 });
  }
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  for (const button of await figure.getByRole("button").all()) {
    const box = await button.boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(44);
    expect(box?.height).toBeGreaterThanOrEqual(44);
  }
  await figure.screenshot({ path: testInfo.outputPath("ranking.png") });
  expect(errors).toEqual([]);
});

test("ranking titles have a full line of clearance from neighboring input stacks", async ({
  page,
}) => {
  const { svg } = await openRanking(page);
  await page.evaluate(() => document.fonts.ready);
  await page.clock.install();
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  for (const elapsed of [0, 2000, 4000, 6000]) {
    await page.clock.runFor(elapsed);
    const clearances = await svg.evaluate((element) =>
      Array.from(
        element.querySelectorAll('[data-ranking-label^="channel-"]'),
        (label) => {
          const box = label.getBoundingClientRect();
          const gaps = Array.from(
            element.querySelectorAll('[data-ranking-shape^="slot-"]'),
          ).flatMap((slot) => {
            const row = slot.getBoundingClientRect();
            if (Math.min(box.right, row.right) <= Math.max(box.left, row.left))
              return [];
            return [
              box.top >= row.bottom
                ? box.top - row.bottom
                : row.top - box.bottom,
            ];
          });
          return {
            label: label.textContent,
            height: box.height,
            gap: Math.min(...gaps),
          };
        },
      ),
    );
    for (const item of clearances) {
      expect(
        item.gap,
        `${item.label} should have at least one text line of clear space`,
      ).toBeGreaterThanOrEqual(item.height);
    }
  }
});

test("the whole ranking assembly breathes, not just the connecting ribbons", async ({
  page,
}) => {
  const { svg } = await openRanking(page);
  await page.clock.install();
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  const frames: Record<string, number[]>[] = [];
  for (let frame = 0; frame <= 16; frame++) {
    frames.push(
      await svg.evaluate((element) =>
        Object.fromEntries(
          [
            "slot-0-0",
            "slot-1-0",
            "slot-2-0",
            "spindle-0",
            "spindle-2",
            "result-C",
            "result-A",
            "result-B",
          ].map((id) => [
            id,
            Array.from(
              element
                .querySelector(`[data-ranking-shape="${id}"]`)!
                .getAttribute("d")!
                .matchAll(/-?\d+(?:\.\d+)?/g),
              (match) => Number(match[0]),
            ),
          ]),
        ),
      ),
    );
    await page.clock.runFor(500);
  }
  for (const id of Object.keys(frames[0])) {
    const excursion = Math.max(
      ...frames[0][id].map((_, coordinate) => {
        const values = frames.map((frame) => frame[id][coordinate]);
        return Math.max(...values) - Math.min(...values);
      }),
    );
    expect(
      excursion,
      `${id} must visibly breathe with the assembly`,
    ).toBeGreaterThan(3);
  }
});

test("ranking identity labels stay clear of the open glass fins", async ({
  page,
}) => {
  const { svg } = await openRanking(page);
  await page.evaluate(() => document.fonts.ready);
  await page.clock.install();
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  for (const elapsed of [0, 2000, 4000, 6000]) {
    await page.clock.runFor(elapsed);
    const clearances = await svg.evaluate((element) => {
      const context = document.createElement("canvas").getContext("2d")!;
      const fins = Array.from(
        element.querySelectorAll<SVGPathElement>(
          '[data-ranking-shape^="slot-"], [data-ranking-shape="result-A"], [data-ranking-shape="result-B"], [data-ranking-shape="result-C"]',
        ),
        (path) => ({
          id: path.dataset.rankingShape,
          box: path.getBoundingClientRect(),
        }),
      );
      return Array.from(
        element.querySelectorAll<SVGTextElement>(
          '[data-ranking-label^="candidate-"], [data-ranking-label^="output-"]',
        ),
        (label) => {
          const style = getComputedStyle(label);
          context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
          const metrics = context.measureText(label.textContent!);
          const anchorOffset =
            style.textAnchor === "middle"
              ? metrics.width / 2
              : style.textAnchor === "end"
                ? metrics.width
                : 0;
          const x = Number(label.getAttribute("x")) - anchorOffset;
          const y = Number(label.getAttribute("y"));
          const matrix = label.getScreenCTM()!;
          const corners = [
            [
              x - metrics.actualBoundingBoxLeft,
              y - metrics.actualBoundingBoxAscent,
            ],
            [
              x + metrics.actualBoundingBoxRight,
              y - metrics.actualBoundingBoxAscent,
            ],
            [
              x + metrics.actualBoundingBoxRight,
              y + metrics.actualBoundingBoxDescent,
            ],
            [
              x - metrics.actualBoundingBoxLeft,
              y + metrics.actualBoundingBoxDescent,
            ],
          ].map(([px, py]) => new DOMPoint(px, py).matrixTransform(matrix));
          const ink = {
            left: Math.min(...corners.map((point) => point.x)),
            right: Math.max(...corners.map((point) => point.x)),
            top: Math.min(...corners.map((point) => point.y)),
            bottom: Math.max(...corners.map((point) => point.y)),
          };
          const id = label.dataset.rankingLabel!;
          const source = id.startsWith("candidate-");
          const finId = source
            ? id.replace("candidate-", "slot-")
            : `result-${id.split("-").at(-1)}`;
          const fin = fins.find((item) => item.id === finId)!;
          return {
            id,
            clearance: source
              ? fin.box.left - ink.right
              : fin.box.top - ink.bottom,
            overlaps: fins
              .filter(
                ({ box }) =>
                  Math.min(ink.right, box.right) >
                    Math.max(ink.left, box.left) &&
                  Math.min(ink.bottom, box.bottom) > Math.max(ink.top, box.top),
              )
              .map((item) => item.id),
          };
        },
      );
    });
    expect(clearances).toHaveLength(13);
    for (const { id, clearance, overlaps } of clearances) {
      expect(
        clearance,
        `${id} should sit outside its fin with clear space around the ink`,
      ).toBeGreaterThan(1);
      expect(overlaps, `${id} must not be stamped onto any glass fin`).toEqual(
        [],
      );
    }
  }
});

test("ranking flow lines leave clear space around the formula and output heading", async ({
  page,
}) => {
  const { svg } = await openRanking(page);
  await page.evaluate(() => document.fonts.ready);
  await page.clock.install();
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  for (const elapsed of [0, 2000, 4000, 6000]) {
    await page.clock.runFor(elapsed);
    const crossings = await svg.evaluate((element) => {
      const labels = Array.from(
        element.querySelectorAll(
          '[data-ranking-label="fusion"], [data-ranking-label="result"]',
        ),
      );
      return labels.flatMap((label) => {
        const box = label.getBoundingClientRect();
        return Array.from(
          element.querySelectorAll<SVGPathElement>(
            '[data-kind="contribution"]',
          ),
        ).flatMap((path) => {
          const length = path.getTotalLength();
          const matrix = path.getScreenCTM()!;
          for (let i = 0; i <= 160; i++) {
            const point = path
              .getPointAtLength((length * i) / 160)
              .matrixTransform(matrix);
            if (
              point.x > box.left - 2 &&
              point.x < box.right + 2 &&
              point.y > box.top - 2 &&
              point.y < box.bottom + 2
            )
              return [
                `${path.dataset.rankingShape} crosses ${label.textContent}`,
              ];
          }
          return [];
        });
      });
    });
    expect(crossings).toEqual([]);
  }
});

test("ranking contribution ribbons remain attached to their output fins", async ({
  page,
}) => {
  await page.clock.install();
  const { svg, errors } = await openRanking(page);
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  await page.clock.runFor(250);
  for (const elapsed of [0, 2000, 4000, 6000]) {
    await page.clock.runFor(elapsed);
    const attachments = await svg.evaluate((element) => {
      const vertices = (path: Element) =>
        Array.from(
          path.getAttribute("d")!.matchAll(/[ML](-?[\d.]+),(-?[\d.]+)/g),
          (match) => [Number(match[1]), Number(match[2])],
        );
      return Array.from(
        element.querySelectorAll<SVGPathElement>('[data-kind="contribution"]'),
        (path) => {
          const candidate = path.dataset.candidate!;
          const fin = element.querySelector(
            `[data-ranking-shape="result-${candidate}"]`,
          )!;
          const points = vertices(fin);
          const end = vertices(path).at(-1)!;
          // Portrait joins the upper contour at its 18/24 sample. Desktop
          // enters between the leading upper/lower vertices of the open fin.
          const target =
            element.getAttribute("data-portrait") === "true"
              ? points[18]
              : [
                  (points[0][0] + points.at(-1)![0]) / 2,
                  (points[0][1] + points.at(-1)![1]) / 2,
                ];
          return {
            id: path.dataset.rankingShape,
            candidate,
            distance: Math.hypot(end[0] - target[0], end[1] - target[1]),
          };
        },
      );
    });
    expect(attachments).toHaveLength(7);
    expect(attachments.map(({ candidate }) => candidate).sort()).toEqual([
      "A",
      "A",
      "A",
      "B",
      "C",
      "C",
      "C",
    ]);
    for (const { id, distance } of attachments) {
      // Allow two-decimal SVG rounding and the tiny perspective difference
      // between projecting a midpoint and averaging its projected ends.
      expect(distance, `${id} must meet the visible output fin`).toBeLessThan(
        0.05,
      );
    }
  }
  expect(errors).toEqual([]);
});

test("ranking ribbons and their lights stay continuous through a complete light cycle", async ({
  page,
}) => {
  // Install before mount so every animation request uses the same clock.
  // Replacing a live native rAF clock can carry a fractional frame forward.
  await page.clock.install();
  const { svg, errors } = await openRanking(page);
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  // Settle the initial visibility delivery before taking the baseline.
  await page.clock.runFor(250);
  const sample = () =>
    svg.evaluate((element) => {
      const paths = Array.from(
        element.querySelectorAll<SVGPathElement>("path[data-ranking-shape]"),
        (path) => ({
          id: path.dataset.rankingShape,
          d: path.getAttribute("d")!,
          coordinates: Array.from(
            path.getAttribute("d")!.matchAll(/-?\d+(?:\.\d+)?/g),
            (match) => Number(match[0]),
          ),
        }),
      );
      const lights = Array.from(
        element.querySelectorAll<SVGPathElement>("path[data-ranking-light]"),
        (path) => ({
          id: path.dataset.rankingLight,
          d: path.getAttribute("d"),
          offset: Number(path.getAttribute("stroke-dashoffset")),
        }),
      );
      return { paths, lights };
    });
  let previous = await sample();
  // 6 seconds crosses the 100/18-second light period. A 40-second sweep of
  // the breathing assembly measured a 2.07px maximum quarter-second step.
  for (let frame = 0; frame < 24; frame++) {
    await page.clock.runFor(250);
    const current = await sample();
    expect(current.paths.map((path) => path.id)).toEqual(
      previous.paths.map((path) => path.id),
    );
    for (let index = 0; index < current.paths.length; index++) {
      const next = current.paths[index];
      const last = previous.paths[index];
      expect(
        next.coordinates.length,
        `${next.id} should keep its topology`,
      ).toBe(last.coordinates.length);
      const displacement = Math.max(
        ...next.coordinates.map((value, coordinate) =>
          Math.abs(value - last.coordinates[coordinate]),
        ),
      );
      expect(displacement, `${next.id} jumped at sample ${frame}`).toBeLessThan(
        2.5,
      );
    }
    for (let index = 0; index < current.lights.length; index++) {
      const light = current.lights[index];
      expect(light.d, "light and ribbon must share the exact same curve").toBe(
        current.paths.find((path) => path.id === light.id)?.d,
      );
      const travel = previous.lights[index].offset - light.offset;
      expect(
        travel,
        "a light must advance continuously, not reset at a wrap",
      ).toBeGreaterThan(0);
      expect(travel).toBeLessThan(5);
    }
    previous = current;
  }
  expect(errors).toEqual([]);
});

test("ranking geometry and prismatic light move, pause together, and stop offscreen", async ({
  page,
}) => {
  const { figure, svg, errors } = await openRanking(page);
  await expect(page.locator("html")).toHaveAttribute("data-motion", "playing");
  const objectCount = await svg.locator("path[data-ranking-shape]").count();
  const beforeGeometry = await geometry(svg);
  const beforeColor = await prism(svg);
  await expect.poll(() => geometry(svg)).not.toEqual(beforeGeometry);
  await expect.poll(() => prism(svg)).not.toEqual(beforeColor);

  await figure.getByRole("button", { name: "Pause ranking animation" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-motion", "paused");
  await expectStill(svg);
  const pausedGeometry = await geometry(svg);
  const pausedColor = await prism(svg);
  await figure
    .getByRole("button", { name: "Resume ranking animation" })
    .click();
  await svg.scrollIntoViewIfNeeded();
  await expect.poll(() => geometry(svg)).not.toEqual(pausedGeometry);
  await expect.poll(() => prism(svg)).not.toEqual(pausedColor);

  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await expect
    .poll(() =>
      svg.evaluate(
        (element) => element.getBoundingClientRect().top > innerHeight + 32,
      ),
    )
    .toBe(true);
  // Let the native visibility delivery settle before checking the held pose.
  await page.waitForTimeout(150);
  await expectStill(svg);
  const hiddenGeometry = await geometry(svg);
  await svg.scrollIntoViewIfNeeded();
  await expect.poll(() => geometry(svg)).not.toEqual(hiddenGeometry);
  await expect(svg.locator("path[data-ranking-shape]")).toHaveCount(
    objectCount,
  );
  expect(errors).toEqual([]);
});

test("ranking respects initial and live reduced motion without disabling candidate controls", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const { figure, svg, errors } = await openRanking(page);
  await expect(page.locator("html")).toHaveAttribute("data-motion", "paused");
  await expect(
    figure.getByRole("button", {
      name: "Ranking animation follows reduced motion",
    }),
  ).toBeDisabled();
  await expectStill(svg);
  await figure
    .getByRole("button", { name: "Candidate B", exact: true })
    .click();
  await expect(figure.locator('[aria-live="polite"]')).toContainText(
    "B: 0 + 1/60 + 0 = 0.01667",
  );
  await expectStill(svg);

  await page.emulateMedia({ reducedMotion: "no-preference" });
  await svg.scrollIntoViewIfNeeded();
  await expect(page.locator("html")).toHaveAttribute("data-motion", "playing");
  const still = await geometry(svg);
  await expect.poll(() => geometry(svg)).not.toEqual(still);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator("html")).toHaveAttribute("data-motion", "paused");
  await expectStill(svg);
  expect(errors).toEqual([]);
});
