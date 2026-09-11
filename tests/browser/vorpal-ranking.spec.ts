import { expect, test, type Locator, type Page } from "@playwright/test";

const totals = { A: "0.04844", B: "0.01667", C: "0.04919" } as const;
const symbols = { A: "parseConfig", B: "readFile", C: "loadConfig" } as const;
type Candidate = keyof typeof totals;
const visits = [
  ["A-0", 0, "0.01667", "0.01667"],
  ["A-1", 5, "0.01538", "0.03205"],
  ["A-2", 1, "0.01639", "0.04844"],
  ["B-0", null, "0.00000", "0.00000"],
  ["B-1", 0, "0.01667", "0.01667"],
  ["B-2", null, "0.00000", "0.01667"],
  ["C-0", 1, "0.01639", "0.01639"],
  ["C-1", 2, "0.01613", "0.03252"],
  ["C-2", 0, "0.01667", "0.04919"],
] as const;
const originalInputs = [
  { id: "A-0", rank: "0", symbol: "parseConfig" },
  { id: "C-0", rank: "1", symbol: "loadConfig" },
  { id: "B-1", rank: "0", symbol: "readFile" },
  { id: "C-1", rank: "2", symbol: "loadConfig" },
  { id: "A-1", rank: "5", symbol: "parseConfig" },
  { id: "C-2", rank: "0", symbol: "loadConfig" },
  { id: "A-2", rank: "1", symbol: "parseConfig" },
];

const scene = (art: Locator) => art.locator("[data-ranking-scene]:visible");
const time = async (art: Locator) =>
  Number(await art.getAttribute("data-time"));
const operation = (art: Locator) =>
  scene(art).locator("[data-ranking-operation]");
const register = (art: Locator, id: Candidate) =>
  scene(art).locator(`[data-register-total="${id}"]`);
const total = (art: Locator, id: Candidate) =>
  scene(art).locator(`[data-ranking-total="${id}"]`);
const row = (art: Locator, id: Candidate) =>
  scene(art).locator(`[data-trace-row="${id}"]`);
const packet = (art: Locator, kind: "read" | "write") =>
  scene(art).locator(`[data-ranking-packet="${kind}"]`);

async function openRanking(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.clock.install();
  const response = await page.goto("/blog/introducing-vorpal");
  expect(response?.status()).toBe(200);
  await page.evaluate(() => document.fonts.ready);
  const figure = page.locator("[data-vorpal-ranking]");
  const art = figure.locator("[data-ranking-art]");
  await expect(art).toHaveCount(1);
  await art.scrollIntoViewIfNeeded();
  await expect(art).toBeVisible();
  const browserTime = await page.evaluate(() => Date.now());
  await page.clock.pauseAt(new Date(browserTime + 1000));
  await expect(scene(art)).toHaveCount(1);
  return { figure, art, errors };
}

async function inputs(art: Locator) {
  return scene(art)
    .locator("[data-source-entry]")
    .evaluateAll((entries) =>
      entries.map((entry) => ({
        id: entry.getAttribute("data-source-entry"),
        rank: entry.children[0].textContent,
        symbol: entry.children[1].textContent,
      })),
    );
}

async function runVisibleFor(page: Page, art: Locator, milliseconds: number) {
  const before = await time(art);
  // IntersectionObserver belongs to the real browser, not the mocked clock.
  await expect
    .poll(async () => {
      await page.clock.runFor(32);
      return time(art);
    })
    .toBeGreaterThan(before);
  const elapsed = (await time(art)) - before;
  await page.clock.runFor(
    Math.max(0, Math.ceil(milliseconds - elapsed * 1000)),
  );
}

async function advanceTo(page: Page, art: Locator, seconds: number) {
  const current = await time(art);
  expect(current, `cannot advance backwards to ${seconds}s`).toBeLessThan(
    seconds,
  );
  await runVisibleFor(page, art, Math.ceil((seconds - current) * 1000) + 40);
}

async function expectHeld(page: Page, art: Locator, milliseconds = 1600) {
  const before = await art.evaluate((element) => element.outerHTML);
  await page.clock.runFor(milliseconds);
  expect(await art.evaluate((element) => element.outerHTML)).toBe(before);
}

async function expectRegisters(art: Locator) {
  for (const id of ["A", "B", "C"] as const)
    await expect(register(art, id)).toHaveText(totals[id]);
}

async function expectWrittenTotals(art: Locator) {
  await expectRegisters(art);
  for (const id of ["A", "B", "C"] as const) {
    await expect(row(art, id)).toHaveAttribute("data-written", "true");
    await expect(total(art, id)).toHaveText(totals[id]);
  }
}

async function expectReset(art: Locator) {
  await expect(art).toHaveAttribute("data-time", "0.000");
  await expect(operation(art)).toHaveAttribute("data-math-phase", "idle");
  await expect(operation(art)).toHaveText("");
  await expect(scene(art).locator("[data-ranking-score-segment]")).toHaveCount(
    0,
  );
  for (const id of ["A", "B", "C"] as const) {
    await expect(register(art, id)).toHaveText("0.00000");
    await expect(row(art, id)).toHaveAttribute("data-written", "false");
    await expect(total(art, id)).toHaveText("—");
  }
  await expect(scene(art).locator("[data-ranking-packet]")).toHaveCount(0);
}

// Measure in the board plane: projected screen rectangles can overlap even
// when the actual three-quarter-view result records remain separate.
async function positions(art: Locator) {
  return scene(art)
    .locator("[data-trace-row]")
    .evaluateAll((elements) =>
      elements.map((element) => {
        const row = element as SVGGElement;
        const parent = row.parentElement as unknown as SVGGraphicsElement;
        const matrix = parent.getCTM()!.inverse().multiply(row.getCTM()!);
        const box = row.getBBox();
        const corners = [
          new DOMPoint(box.x, box.y),
          new DOMPoint(box.x + box.width, box.y),
          new DOMPoint(box.x, box.y + box.height),
          new DOMPoint(box.x + box.width, box.y + box.height),
        ].map((point) => point.matrixTransform(matrix));
        return {
          id: row.getAttribute("data-trace-row")!,
          symbol: row.querySelector("[data-ranking-label]")!.textContent,
          score: row.querySelector("[data-ranking-total]")!.textContent,
          top: Math.min(...corners.map((point) => point.y)),
          bottom: Math.max(...corners.map((point) => point.y)),
          transform: row.getAttribute("transform"),
        };
      }),
    );
}

test("hardware preserves the original ranks and exact RRF results with an accessible calculation table", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const { figure, art, errors } = await openRanking(page);
  await expect(
    figure.getByRole("heading", {
      name: "From ranked lists to one result order.",
    }),
  ).toBeVisible();
  await expect(art).toHaveAttribute("data-stage", "3");
  await expect(art).toHaveAttribute("data-time", "24.000");
  await expect(
    scene(art).locator('[data-ranking-hardware="memory"]'),
  ).toHaveCount(3);
  await expect(
    scene(art).locator('[data-ranking-hardware="processor"]'),
  ).toHaveCount(1);
  await expect(
    scene(art).locator('[data-ranking-hardware="output"]'),
  ).toHaveCount(1);
  await expect(
    scene(art).locator('[data-hardware-contacts="keyed-memory"]'),
  ).toHaveCount(3);
  await expect(
    scene(art).locator('[data-hardware-contacts="keyed-output"]'),
  ).toHaveCount(1);
  const pinSides = await scene(art)
    .locator("[data-hardware-pins] > g")
    .evaluateAll((pins) =>
      Array.from(
        new Set(
          pins.map(
            (pin) =>
              pin.getAttribute("transform")!.match(/rotate\(([-\d]+)\)/)![1],
          ),
        ),
      ).sort(),
    );
  expect(pinSides).toEqual(["-90", "0", "180", "90"]);
  await expectWrittenTotals(art);
  expect(await inputs(art)).toEqual(originalInputs);
  await expect(
    scene(art).locator('[data-source-entry="B-0"], [data-source-entry="B-2"]'),
  ).toHaveCount(0);
  await expect(scene(art).locator("[data-ranking-packet]")).toHaveCount(0);
  await expect(art).toContainText(
    "A hardware metaphor for the RRF calculation.",
  );
  await expect(figure.getByRole("table")).toBeHidden();
  await figure.locator("summary").click();
  await expect(figure.getByRole("table")).toHaveAccessibleName(
    "Illustrative ranks, starting at zero. Sorted by the computed RRF total.",
  );
  expect(
    await figure
      .locator("tbody tr")
      .evaluateAll((rows) =>
        rows.map((row) => Array.from(row.children, (item) => item.textContent)),
      ),
  ).toEqual([
    ["loadConfig (C)", "1", "2", "0", "0.04919"],
    ["parseConfig (A)", "0", "5", "1", "0.04844"],
    ["readFile (B)", "—", "0", "—", "0.01667"],
  ]);
  for (const equation of [
    "1/61 + 1/62 + 1/60 = 0.04919",
    "1/60 + 1/65 + 1/61 = 0.04844",
    "0 + 1/60 + 0 = 0.01667",
  ])
    await expect(figure.locator("details")).toContainText(equation);
  await expect(figure.locator("details")).toContainText(
    "totals use the unrounded contributions",
  );
  await figure.screenshot({
    path: testInfo.outputPath("ranking-hardware-example.png"),
  });
  expect(errors).toEqual([]);
});

test("rank reads, CPU contributions and completed-row writebacks occur in causal order", async ({
  page,
}, testInfo) => {
  const { figure, art, errors } = await openRanking(page);
  await figure.locator('[data-ranking-select="1"]').click();
  await expect(art).toHaveAttribute("data-time", "4.000");
  for (const [index, [id, rank, , sum]] of visits.entries()) {
    const start = 4 + (index * 4) / 3;
    const candidate = id[0] as Candidate;
    const channel = index % 3;
    await advanceTo(page, art, start + 0.04);
    await expect(
      scene(art).locator("[data-ranking-current-symbol]"),
    ).toHaveText(symbols[candidate]);
    await expect(
      scene(art).locator(`[data-ranking-register="${candidate}"]`),
    ).toHaveAttribute("data-active", "true");
    await expect(
      scene(art).locator('[data-ranking-register][data-active="true"]'),
    ).toHaveCount(1);
    await expect(operation(art)).toHaveAttribute(
      "data-math-phase",
      rank === null ? "absent" : "read",
    );
    await expect(packet(art, "write")).toHaveCount(0);
    const previousTotal = await register(art, candidate).textContent();
    if (rank === null) {
      await expect(packet(art, "read")).toHaveCount(0);
      await expect(
        scene(art).locator('[data-source-entry][data-active="true"]'),
      ).toHaveCount(0);
    } else {
      await expect(packet(art, "read")).toHaveCount(1);
      await expect(
        scene(art).locator(`[data-source-entry="${id}"]`),
      ).toHaveAttribute("data-active", "true");
      const first = await packet(art, "read").getAttribute("d");
      await advanceTo(page, art, start + 0.2);
      expect(await packet(art, "read").getAttribute("d")).not.toBe(first);
      await expect(
        scene(art).locator(
          `[data-ranking-bus="${channel}"] [data-ranking-packet="read"]`,
        ),
      ).toHaveCount(1);
    }
    await advanceTo(page, art, start + 0.36);
    const segment = scene(art).locator("[data-ranking-contribution]");
    const formingOpacity =
      rank === null ? 0 : Number(await segment.getAttribute("fill-opacity"));
    const trackWidth = Number(
      await scene(art)
        .locator(`[data-ranking-score-track="${candidate}"]`)
        .getAttribute("width"),
    );
    const expectedWidth =
      rank === null ? 0 : trackWidth / ((60 + rank) * (3 / 60));
    await advanceTo(page, art, start + 0.55);
    await expect(operation(art)).toHaveAttribute(
      "data-math-phase",
      rank === null ? "absent" : "form",
    );
    await expect(operation(art)).toHaveText("");
    await expect(scene(art).locator("[data-ranking-packet]")).toHaveCount(0);
    if (rank !== null) {
      expect(
        Number(await segment.getAttribute("fill-opacity")),
      ).toBeGreaterThan(formingOpacity);
      expect(Number(await segment.getAttribute("width"))).toBeCloseTo(
        expectedWidth,
        8,
      );
    }
    await advanceTo(page, art, start + 0.74);
    await expect(operation(art)).toHaveAttribute(
      "data-math-phase",
      rank === null ? "absent" : "transfer",
    );
    const firstPosition =
      rank === null ? null : await segment.getAttribute("y");
    await advanceTo(page, art, start + 0.89);
    await expect(register(art, candidate)).toHaveText(previousTotal!);
    await expect(segment).toHaveCount(rank === null ? 0 : 1);
    if (rank !== null) {
      expect(await segment.getAttribute("y")).not.toBe(firstPosition);
      expect(Number(await segment.getAttribute("width"))).toBeCloseTo(
        expectedWidth,
        8,
      );
      if (index === 2)
        await art.screenshot({
          path: testInfo.outputPath("ranking-weighted-transfer.png"),
          style:
            "header, body > a, nextjs-portal { visibility: hidden !important; }",
        });
    }
    await advanceTo(page, art, start + 1.08);
    await expect(operation(art)).toHaveAttribute(
      "data-math-phase",
      rank === null ? "absent" : "add",
    );
    await expect(register(art, candidate)).toHaveText(sum);
    await expect(segment).toHaveCount(0);
    const committedSegment = scene(art).locator(
      `[data-ranking-score-segment="${id}"]`,
    );
    await expect(committedSegment).toHaveCount(rank === null ? 0 : 1);
    if (rank !== null)
      expect(Number(await committedSegment.getAttribute("width"))).toBeCloseTo(
        expectedWidth,
        8,
      );
    await expect(row(art, candidate)).toHaveAttribute("data-written", "false");
    await expect(total(art, candidate)).toHaveText("—");
    await expect(packet(art, "write")).toHaveCount(channel === 2 ? 1 : 0);
    if (channel === 2) {
      const first = await packet(art, "write").getAttribute("d");
      await advanceTo(page, art, start + 1.23);
      expect(await packet(art, "write").getAttribute("d")).not.toBe(first);
    }
    await expect(
      scene(art).locator('[data-trace-row][data-written="true"]'),
    ).toHaveCount(Math.floor(index / 3));
  }
  await page.clock.runFor(2500);
  await expect(art).toHaveAttribute("data-time", "15.999");
  await expectRegisters(art);
  await expect(total(art, "C")).toHaveText("—");
  expect(await inputs(art)).toEqual(originalInputs);
  await expectHeld(page, art);
  await figure.locator('[data-ranking-select="2"]').click();
  await expectWrittenTotals(art);
  await expect(scene(art).locator("[data-ranking-packet]")).toHaveCount(0);
  expect(errors).toEqual([]);
});

for (const reducedMotion of ["no-preference", "reduce"] as const) {
  test(`Step exposes CPU operations and announces register sums with ${reducedMotion} motion`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion });
    const { figure, art, errors } = await openRanking(page);
    const step = figure.getByRole("button", {
      name: "Step ranking calculation",
    });
    await figure
      .getByRole("button", { name: "Replay ranking calculation" })
      .click();
    await expectReset(art);
    for (const [index, [id, rank, value, sum]] of visits.entries()) {
      const candidate = id[0] as Candidate;
      await step.click();
      await expect(operation(art)).toHaveAttribute(
        "data-math-phase",
        rank === null ? "absent" : "transfer",
      );
      await expect(
        scene(art).locator("[data-ranking-current-symbol]"),
      ).toHaveText(symbols[candidate]);
      await expect(figure.getByRole("status")).toContainText(
        symbols[candidate],
      );
      await expect(figure.getByRole("status")).toContainText(
        `Contribution ${value}.`,
      );
      if (index === 0)
        await expect(figure.getByRole("status")).toContainText(
          "Running total 0.00000.",
        );
      await expectHeld(page, art, 250);
      await step.click();
      await expect(operation(art)).toHaveAttribute(
        "data-math-phase",
        rank === null ? "absent" : "add",
      );
      await expect(register(art, candidate)).toHaveText(sum);
      await expect(figure.getByRole("status")).toContainText(
        `Running total ${sum}.`,
      );
      await expect(row(art, candidate)).toHaveAttribute(
        "data-written",
        "false",
      );
      await expect(
        scene(art).locator('[data-trace-row][data-written="true"]'),
      ).toHaveCount(Math.floor(index / 3));
      await expectHeld(page, art, 250);
    }
    await expectRegisters(art);
    await step.click();
    await expect(art).toHaveAttribute("data-time", "16.000");
    await expectWrittenTotals(art);
    await expectHeld(page, art, 500);
    await step.click();
    await expect(art).toHaveAttribute("data-time", "24.000");
    await expectWrittenTotals(art);
    await expectHeld(page, art, 500);
    await step.click();
    await expectReset(art);
    await expectHeld(page, art, 500);
    expect(errors).toEqual([]);
  });
}

test("sorting moves full output records without changing their identities or scores and holds the finite result", async ({
  page,
}, testInfo) => {
  const { figure, art, errors } = await openRanking(page);
  await figure.locator('[data-ranking-select="2"]').click();
  await runVisibleFor(page, art, 4500);
  await expect(art).toHaveAttribute("data-time", "19.999");
  await expectWrittenTotals(art);
  await expectHeld(page, art);
  const before = await positions(art);
  expect([...before].sort((a, b) => a.top - b.top).map(({ id }) => id)).toEqual(
    ["A", "B", "C"],
  );
  await figure.locator('[data-ranking-select="3"]').click();
  await runVisibleFor(page, art, 1100);
  const during = await positions(art);
  for (const start of before) {
    const moving = during.find((row) => row.id === start.id)!;
    expect(moving.transform).not.toBe(start.transform);
    expect(
      Math.abs(moving.top - start.top),
      `${start.id} moves in the board plane`,
    ).toBeGreaterThan(10);
  }
  await page.clock.runFor(3400);
  await expect(art).toHaveAttribute("data-time", "24.000");
  const final = await positions(art);
  expect(final.map(({ id, symbol, score }) => ({ id, symbol, score }))).toEqual(
    before.map(({ id, symbol, score }) => ({ id, symbol, score })),
  );
  expect([...final].sort((a, b) => a.top - b.top).map(({ id }) => id)).toEqual([
    "C",
    "A",
    "B",
  ]);
  await expectWrittenTotals(art);
  await expectHeld(page, art, 6000);
  await art.screenshot({
    path: testInfo.outputPath("ranking-hardware-sorted.png"),
  });
  await figure
    .getByRole("button", { name: "Replay ranking calculation" })
    .click();
  await expectReset(art);
  await runVisibleFor(page, art, 700);
  expect(await time(art)).toBeGreaterThan(0.4);
  expect(errors).toEqual([]);
});

test("stage boundaries and pause, seek and resume preserve the CPU operation", async ({
  page,
}) => {
  const { figure, art, errors } = await openRanking(page);
  await figure.locator('[data-ranking-select="0"]').click();
  await runVisibleFor(page, art, 4500);
  await expect(art).toHaveAttribute("data-time", "3.999");
  await expectHeld(page, art);
  await figure
    .getByRole("button", { name: "Resume ranking animation" })
    .click();
  await runVisibleFor(page, art, 600);
  await expect(art).toHaveAttribute("data-stage", "1");
  await expect(operation(art)).toHaveAttribute("data-math-phase", "form");
  await figure.getByRole("button", { name: "Pause ranking animation" }).click();
  await expectHeld(page, art);
  await figure.locator('[data-ranking-select="1"]').click();
  await expect(art).toHaveAttribute("data-time", "4.700");
  await expect(operation(art)).toHaveAttribute("data-math-phase", "transfer");
  await expectHeld(page, art);
  await figure
    .getByRole("button", { name: "Resume ranking animation" })
    .click();
  await runVisibleFor(page, art, 550);
  await expect(operation(art)).toHaveAttribute("data-math-phase", "add");
  await expect(register(art, "A")).toHaveText("0.01667");
  await expect(total(art, "A")).toHaveText("—");
  expect(errors).toEqual([]);
});

test("pausing a sort locally or globally leaves every output record separate and readable", async ({
  page,
}) => {
  const { figure, art, errors } = await openRanking(page);
  for (const control of ["Pause ranking animation", "Pause motion"]) {
    await figure
      .getByRole("button", { name: "Replay ranking calculation" })
      .click();
    await figure.locator('[data-ranking-select="3"]').click();
    await runVisibleFor(page, art, 1100);
    expect(await time(art)).toBeGreaterThan(20.5);
    expect(await time(art)).toBeLessThan(22.4);
    await page.getByRole("button", { name: control, exact: true }).click();
    await expect(art).toHaveAttribute("data-time", "24.000");
    await expectWrittenTotals(art);
    const rows = (await positions(art)).sort((a, b) => a.top - b.top);
    expect(rows.map(({ id }) => id)).toEqual(["C", "A", "B"]);
    for (let index = 0; index < rows.length - 1; index++)
      expect(
        rows[index].bottom,
        `${control}: full records do not overlap`,
      ).toBeLessThanOrEqual(rows[index + 1].top + 0.5);
    await expectHeld(page, art);
  }
  expect(errors).toEqual([]);
});

test("hardware and calculation freeze offscreen and continue from the held operation", async ({
  page,
}) => {
  const { figure, art, errors } = await openRanking(page);
  await figure.locator('[data-ranking-select="1"]').click();
  await runVisibleFor(page, art, 500);
  await expect(operation(art)).toHaveAttribute("data-math-phase", "form");
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await expect
    .poll(() =>
      art.evaluate(
        (element) => element.getBoundingClientRect().top > innerHeight + 32,
      ),
    )
    .toBe(true);
  await page.clock.runFor(200);
  const held = await time(art);
  await expectHeld(page, art, 2400);
  await art.scrollIntoViewIfNeeded();
  await runVisibleFor(page, art, 600);
  expect(await time(art)).toBeGreaterThan(held + 0.3);
  expect(await time(art)).toBeLessThan(held + 0.8);
  await expect(art).toHaveAttribute("data-stage", "1");
  expect(errors).toEqual([]);
});

test("responsive hardware scenes share one calculation and preserve its paused phase", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const { figure, art, errors } = await openRanking(page);
  await expect(scene(art)).toHaveAttribute("data-ranking-scene", "landscape");
  await figure.locator('[data-ranking-select="1"]').click();
  await advanceTo(page, art, 6);
  await figure.getByRole("button", { name: "Pause ranking animation" }).click();
  const held = await time(art);
  for (const width of [768, 650, 390, 320, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await art.scrollIntoViewIfNeeded();
    await expect(scene(art)).toHaveCount(1);
    if (width <= 390)
      await expect(scene(art)).toHaveAttribute(
        "data-ranking-scene",
        "portrait",
      );
    expect(await time(art)).toBe(held);
    await expect(operation(art)).toHaveAttribute("data-math-phase", "transfer");
    await expect(
      scene(art).locator("[data-ranking-current-symbol]"),
    ).toHaveText("parseConfig");
    expect(await inputs(art)).toEqual(originalInputs);
    await expect(art.locator('[data-register-total="A"]')).toHaveText([
      "0.01667",
      "0.01667",
    ]);
    await expectHeld(page, art, 500);
  }
  await figure
    .getByRole("button", { name: "Resume ranking animation" })
    .click();
  await runVisibleFor(page, art, 500);
  expect(await time(art)).toBeGreaterThan(held + 0.3);
  await expect(operation(art)).toHaveAttribute("data-math-phase", "add");
  await expect(register(art, "A")).toHaveText("0.03205");
  expect(errors).toEqual([]);
});

test("reduced motion exposes the finished hardware and keeps keyboard stages and replay usable", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const { figure, art, errors } = await openRanking(page);
  await expect(art).toHaveAttribute("data-time", "24.000");
  await expectWrittenTotals(art);
  await expect(
    figure.getByRole("button", {
      name: "Ranking animation follows reduced motion",
    }),
  ).toBeDisabled();
  await expectHeld(page, art);
  for (const [stage, seconds] of [
    [0, "0.000"],
    [1, "4.700"],
    [2, "16.000"],
    [3, "24.000"],
  ] as const) {
    const button = figure.locator(`[data-ranking-select="${stage}"]`);
    await button.focus();
    await page.keyboard.press("Enter");
    await expect(button).toHaveAttribute("aria-pressed", "true");
    await expect(art).toHaveAttribute("data-stage", String(stage));
    await expect(art).toHaveAttribute("data-time", seconds);
    await expectHeld(page, art, 500);
  }
  await figure
    .getByRole("button", { name: "Replay ranking calculation" })
    .click();
  await expectReset(art);
  await expectHeld(page, art);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await art.scrollIntoViewIfNeeded();
  await runVisibleFor(page, art, 600);
  expect(await time(art)).toBeGreaterThan(0.3);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(
    figure.getByRole("button", {
      name: "Ranking animation follows reduced motion",
    }),
  ).toBeDisabled();
  await expect(art).toHaveAttribute("data-time", "24.000");
  await expectWrittenTotals(art);
  await expectHeld(page, art);
  expect(errors).toEqual([]);
});

test("hardware poses stay finite and continuous while the original data remains attached", async ({
  page,
}) => {
  const { figure, art, errors } = await openRanking(page);
  await figure.locator('[data-ranking-select="0"]').click();
  const poses = () =>
    scene(art)
      .locator("[data-ranking-board]")
      .evaluateAll((boards) =>
        boards.map((element) => {
          const board = element as SVGGElement;
          const matrix = board.transform.baseVal.getItem(0).matrix;
          return {
            id: board.getAttribute("data-ranking-board"),
            values: [
              matrix.a,
              matrix.b,
              matrix.c,
              matrix.d,
              matrix.e,
              matrix.f,
            ],
          };
        }),
      );
  const initial = await poses();
  let previous = initial;
  for (let index = 0; index < 12; index++) {
    await runVisibleFor(page, art, 64);
    const current = await poses();
    expect(current.map(({ id }) => id)).toEqual(initial.map(({ id }) => id));
    for (const [boardIndex, board] of current.entries()) {
      expect(board.values.every(Number.isFinite)).toBe(true);
      for (const [x, y] of [
        [0, 0],
        [340, 0],
        [0, 250],
        [340, 250],
      ]) {
        const [a, b, c, d, e, f] = board.values;
        const [aa, bb, cc, dd, ee, ff] = previous[boardIndex].values;
        expect(
          Math.hypot(
            (a - aa) * x + (c - cc) * y + e - ee,
            (b - bb) * x + (d - dd) * y + f - ff,
          ),
        ).toBeLessThan(2);
      }
    }
    expect(
      await scene(art).evaluate((element) =>
        /NaN|Infinity/.test(element.outerHTML),
      ),
    ).toBe(false);
    if (index === 0 || index === 11) {
      const connections = await scene(art).evaluate((element) => {
        const svg = element as SVGSVGElement;
        const links = [
          ...[0, 1, 2].map((channel) => ({
            bus: String(channel),
            from: `input-${channel}`,
            to: "processor",
            fromContacts: "[data-hardware-contacts] path",
            toContacts: "[data-hardware-pins] path",
          })),
          {
            bus: "output",
            from: "processor",
            to: "output",
            fromContacts: "[data-hardware-pins] path",
            toContacts: "[data-hardware-contacts] path",
          },
        ];
        return links.flatMap((link) => {
          const tracks = Array.from(
            svg.querySelectorAll<SVGPathElement>(
              `[data-ranking-bus="${link.bus}"] > path:not([data-ranking-packet])`,
            ),
          );
          return ["from", "to"].map((end) => {
            const points = tracks.map((track) =>
              track.getPointAtLength(
                end === "from" ? 0 : track.getTotalLength(),
              ),
            );
            const endpoint = new DOMPoint(
              points.reduce((sum, point) => sum + point.x, 0) / points.length,
              points.reduce((sum, point) => sum + point.y, 0) / points.length,
            );
            const board = end === "from" ? link.from : link.to;
            const contacts =
              end === "from" ? link.fromContacts : link.toContacts;
            const distances = Array.from(
              svg.querySelectorAll<SVGGraphicsElement>(
                `[data-ranking-board="${board}"] ${contacts}`,
              ),
              (contact) => {
                const local = endpoint.matrixTransform(
                  contact.getCTM()!.inverse().multiply(svg.getCTM()!),
                );
                const box = contact.getBBox();
                return Math.hypot(
                  Math.max(box.x - local.x, 0, local.x - box.x - box.width),
                  Math.max(box.y - local.y, 0, local.y - box.y - box.height),
                );
              },
            );
            return { bus: link.bus, end, board, gap: Math.min(...distances) };
          });
        });
      });
      expect(connections).toHaveLength(8);
      for (const connection of connections)
        expect(
          connection.gap,
          `${connection.bus} ${connection.end} meets ${connection.board} contacts`,
        ).toBeLessThanOrEqual(6);
    }
    previous = current;
  }
  for (const [index, board] of previous.entries())
    expect(board.values).not.toEqual(initial[index].values);
  expect(await inputs(art)).toEqual(originalInputs);
  expect(errors).toEqual([]);
});

test("hardware inscriptions clear the inner die, components and contacts without narrow overflow", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const { figure, art, errors } = await openRanking(page);
  for (const width of testInfo.project.name.includes("mobile")
    ? [390, 320]
    : [1440, 768, 650]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const stage of [0, 1, 2, 3]) {
      await figure.locator(`[data-ranking-select="${stage}"]`).click();
      await expect(scene(art)).toHaveCount(1);
      const failures = await scene(art).evaluate((element) => {
        const failures: string[] = [];
        for (const hardware of element.querySelectorAll<SVGGElement>(
          "[data-ranking-hardware]",
        )) {
          const inverse = hardware.getCTM()!.inverse();
          const bounds = (item: SVGGraphicsElement) => {
            const box = item.getBBox();
            const transform = inverse.multiply(item.getCTM()!);
            const corners = [
              new DOMPoint(box.x, box.y),
              new DOMPoint(box.x + box.width, box.y),
              new DOMPoint(box.x, box.y + box.height),
              new DOMPoint(box.x + box.width, box.y + box.height),
            ].map((point) => point.matrixTransform(transform));
            return {
              left: Math.min(...corners.map((p) => p.x)),
              right: Math.max(...corners.map((p) => p.x)),
              top: Math.min(...corners.map((p) => p.y)),
              bottom: Math.max(...corners.map((p) => p.y)),
            };
          };
          const face = bounds(
            hardware.querySelector<SVGGraphicsElement>(
              "[data-hardware-front]",
            )!,
          );
          const die = hardware.querySelector<SVGGraphicsElement>(
            "[data-hardware-die]",
          );
          const surface = die ? bounds(die) : face;
          const safe = {
            left: surface.left + (die ? 6 : 20),
            right: surface.right - (die ? 6 : 20),
            top: surface.top + 6,
            bottom: surface.bottom - 6,
          };
          const packages = Array.from(
            hardware.querySelectorAll<SVGGraphicsElement>("[data-hardware-ic]"),
            bounds,
          );
          for (const component of packages) {
            if (component.bottom < (face.top + face.bottom) / 2)
              safe.top = Math.max(safe.top, component.bottom + 2);
            else safe.bottom = Math.min(safe.bottom, component.top - 2);
          }
          if (hardware.dataset.rankingHardware === "memory") {
            const contacts = Array.from(
              hardware.querySelectorAll<SVGGraphicsElement>(
                "[data-hardware-contacts] path",
              ),
              bounds,
            );
            safe.bottom = Math.min(
              safe.bottom,
              ...contacts.map((contact) => contact.top - 8),
            );
          }
          const labels = Array.from(
            hardware.querySelectorAll<SVGTextElement>(
              "[data-hardware-inscription] text",
            ),
            (text) => ({ text: text.textContent, ...bounds(text) }),
          );
          for (const label of labels)
            if (
              label.left < safe.left - 0.5 ||
              label.right > safe.right + 0.5 ||
              label.top < safe.top - 0.5 ||
              label.bottom > safe.bottom + 0.5
            )
              failures.push(
                `outside clear ${hardware.dataset.rankingHardware} inscription: ${label.text} (${JSON.stringify({ label, safe })})`,
              );
          for (let i = 0; i < labels.length; i++)
            for (let j = i + 1; j < labels.length; j++) {
              const a = labels[i],
                b = labels[j];
              const width =
                Math.min(a.right, b.right) - Math.max(a.left, b.left);
              const height =
                Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
              if (width > 0.5 && height > 0.5)
                failures.push(
                  `overlap on ${hardware.dataset.rankingHardware}: ${a.text} / ${b.text} (${width.toFixed(2)}×${height.toFixed(2)})`,
                );
            }
        }
        const svg = element as SVGSVGElement;
        const box = svg.getBBox(),
          view = svg.viewBox.baseVal;
        if (
          box.x < view.x - 1 ||
          box.y < view.y - 1 ||
          box.x + box.width > view.x + view.width + 1 ||
          box.y + box.height > view.y + view.height + 1
        )
          failures.push("hardware extends beyond its viewport");
        return failures;
      });
      expect(failures, `stage ${stage} at ${width}px`).toEqual([]);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
    for (const button of await figure.getByRole("button").all()) {
      const box = await button.boundingBox();
      expect(box?.width).toBeGreaterThanOrEqual(44);
      expect(box?.height).toBeGreaterThanOrEqual(44);
    }
    await art.screenshot({
      path: testInfo.outputPath(`ranking-hardware-${width}.png`),
    });
  }
  expect(errors).toEqual([]);
});
