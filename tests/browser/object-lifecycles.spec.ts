import { approachProofScene } from "./proof-scene-helper";
import { expect, test, type Locator } from "@playwright/test";

const outcomes = ["pass", "fail", "error", "missing"];

async function showScene(scene: Locator) {
  await scene.scrollIntoViewIfNeeded();
  // Visibility callbacks use the real browser clock, not Playwright's clock.
  await scene.evaluate(
    (element) =>
      new Promise<void>((resolve) => {
        const observer = new IntersectionObserver(
          (entries) => {
            if (entries.some((entry) => entry.intersectionRatio >= 0.25)) {
              observer.disconnect();
              resolve();
            }
          },
          { threshold: 0.25 },
        );
        observer.observe(element);
      }),
  );
}

test("distant stage jumps settle promptly in both directions", async ({
  page,
}) => {
  await page.clock.install();
  await page.goto("/blog/agentic-proof-of-work");
  await page.evaluate(() => document.fonts.ready);
  await page.clock.pauseAt(
    new Date(await page.evaluate(() => Date.now() + 1000)),
  );
  const explorer = page.locator("[data-lifecycle-explorer]");
  await approachProofScene(explorer);
  const scene = explorer.locator("[data-proof-scene]:visible");
  const tabs = explorer.locator("[data-proof-steps]").getByRole("tab");
  await showScene(scene);
  // DOM activation keeps the scene visible on narrow screens, where the tabs
  // sit below it. The same click handler is exercised without viewport churn.
  for (const stage of [9, 0, 7, 2]) {
    const previous = Number(await scene.getAttribute("data-proof-selection"));
    await tabs
      .nth(stage)
      .evaluate((element) => (element as HTMLButtonElement).click());
    await page.clock.runFor(300);
    const moving = Number(await scene.getAttribute("data-proof-selection"));
    expect(moving).not.toBe(previous);
    expect(moving).not.toBe(stage);
    await page.clock.runFor(900);
    expect(Number(await scene.getAttribute("data-proof-selection"))).toBe(
      stage,
    );
  }
  await tabs
    .last()
    .evaluate((element) => (element as HTMLButtonElement).click());
  await page.clock.runFor(300);
  const interrupted = Number(await scene.getAttribute("data-proof-selection"));
  await tabs
    .first()
    .evaluate((element) => (element as HTMLButtonElement).click());
  expect(Number(await scene.getAttribute("data-proof-selection"))).toBe(
    interrupted,
  );
  await page.clock.runFor(300);
  const reversing = Number(await scene.getAttribute("data-proof-selection"));
  expect(reversing).toBeGreaterThan(0);
  expect(reversing).toBeLessThan(interrupted);
  await page.clock.runFor(900);
  expect(Number(await scene.getAttribute("data-proof-selection"))).toBe(0);
});

test("one continuous journey keeps its frame stable across outcomes", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/blog/agentic-proof-of-work");
  await page.evaluate(() => document.fonts.ready);
  const explorer = page.locator("[data-lifecycle-explorer]");
  await approachProofScene(explorer);
  await expect(explorer.getByRole("tablist")).toHaveCount(1);
  await expect(
    explorer.getByRole("tablist", { name: "Object family" }),
  ).toHaveCount(0);
  const measure = () =>
    explorer.evaluate((element) => {
      const root = element.getBoundingClientRect();
      const figure = element.querySelector("figure")!;
      const svg = Array.from(
        figure.querySelectorAll("[data-proof-scene]"),
      ).find((el) => el.getBoundingClientRect().width > 0)!;
      const scene = svg.getBoundingClientRect();
      return {
        height: root.height,
        top: scene.top - root.top,
        sceneHeight: scene.height,
        controlsInside: !!figure.querySelector("select"),
      };
    });
  const baseline = await measure();
  expect(baseline.controlsInside).toBe(true);
  for (const outcome of outcomes) {
    await explorer.getByLabel("Evaluation outcome").selectOption(outcome);
    const current = await measure();
    expect(current.height, outcome).toBeCloseTo(baseline.height, 0);
    expect(current.top, outcome).toBeCloseTo(baseline.top, 0);
    expect(current.sceneHeight, outcome).toBeCloseTo(baseline.sceneHeight, 0);
    const tabs = explorer.locator("[data-proof-steps]").getByRole("tab");
    await expect(tabs).toHaveCount(outcome === "missing" ? 7 : 10);
    await tabs.first().focus();
    await page.keyboard.press("End");
    await expect(tabs.last()).toBeFocused();
    await page.keyboard.press("Home");
    await expect(tabs.first()).toBeFocused();
  }
});

test("the complete journey and all outcomes have readable labels and a shared scene", async ({
  page,
}, testInfo) => {
  test.setTimeout(180_000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/blog/agentic-proof-of-work");
  await page.evaluate(() => document.fonts.ready);
  const explorer = page.locator("[data-lifecycle-explorer]");
  await approachProofScene(explorer);
  const topologies: string[][] = [];
  for (const outcome of outcomes) {
    await explorer.getByLabel("Evaluation outcome").selectOption(outcome);
    const scene = explorer.locator("[data-proof-scene]:visible");
    const tabs = await explorer
      .locator("[data-proof-steps]")
      .getByRole("tab")
      .all();
    for (const [step, tab] of tabs.entries()) {
      await tab.click();
      await scene.scrollIntoViewIfNeeded();
      const issues = await scene.evaluate((svg) => {
        const bounds = svg.getBoundingClientRect();
        const labels = Array.from(
          svg.querySelectorAll<SVGTextElement>("[data-proof-label]"),
        )
          .filter(
            (el) =>
              Number(el.getAttribute("opacity") ?? 1) > 0.3 &&
              el.textContent?.trim(),
          )
          .map((el) => ({
            id: el.dataset.proofLabel,
            box: el.getBoundingClientRect(),
          }));
        const errors = labels
          .filter(
            ({ box }) =>
              box.left < bounds.left - 1 ||
              box.right > bounds.right + 1 ||
              box.top < bounds.top - 1 ||
              box.bottom > bounds.bottom + 1,
          )
          .map(({ id }) => id + " outside SVG");
        for (let i = 0; i < labels.length; i++)
          for (let j = i + 1; j < labels.length; j++) {
            const a = labels[i],
              b = labels[j];
            if (
              Math.min(a.box.right, b.box.right) -
                Math.max(a.box.left, b.box.left) >
                1 &&
              Math.min(a.box.bottom, b.box.bottom) -
                Math.max(a.box.top, b.box.top) >
                1
            )
              errors.push(a.id + " overlaps " + b.id);
          }
        for (const ship of ["claim-ship", "testament-ship"]) {
          const caption = labels.find(
            (label) => label.id === ship + "-message-id",
          );
          const hull = svg
            .querySelector('[data-proof-path="' + ship + '-spacecraft-hull"]')
            ?.getBoundingClientRect();
          if (
            caption &&
            hull &&
            caption.box.bottom > hull.top - 2 &&
            caption.box.top < hull.bottom + 2
          )
            errors.push(ship + " caption lacks clearance from hull");
        }
        return errors;
      });
      expect.soft(issues, outcome + "/" + step).toEqual([]);
      if (
        (outcome === "pass" && [0, 3, 5, 6, 7, 9].includes(step)) ||
        step === tabs.length - 1
      )
        await scene.screenshot({
          path: testInfo.outputPath(outcome + "-" + step + ".png"),
        });
    }
    topologies.push(
      await scene
        .locator("[data-proof-path]")
        .evaluateAll((paths) =>
          paths.map((p) => p.getAttribute("data-proof-path")!),
        ),
    );
  }
  for (const topology of topologies) expect(topology).toEqual(topologies[0]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});

test("every adjacent stage animates and pause/replay preserve the journey", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await page.clock.install();
  await page.goto("/blog/agentic-proof-of-work");
  await page.evaluate(() => document.fonts.ready);
  await page.clock.pauseAt(
    new Date(await page.evaluate(() => Date.now() + 1000)),
  );
  const explorer = page.locator("[data-lifecycle-explorer]");
  await approachProofScene(explorer);
  const scene = explorer.locator("[data-proof-scene]:visible");
  const tabs = explorer.locator("[data-proof-steps]").getByRole("tab");
  const read = () =>
    scene.evaluate((svg) => ({
      paths: Array.from(svg.querySelectorAll("[data-proof-path]"), (p) => ({
        id: p.getAttribute("data-proof-path"),
        d: p.getAttribute("d"),
        opacity: p.getAttribute("opacity"),
      })),
      selection: Number(svg.getAttribute("data-proof-selection")),
    }));
  await showScene(scene);
  for (let stage = 1; stage < 10; stage++) {
    const before = await read();
    await tabs
      .nth(stage)
      .evaluate((element) => (element as HTMLButtonElement).click());
    await page.clock.runFor(300);
    const halfway = await read();
    expect(halfway.selection).toBeGreaterThan(stage - 1);
    expect(halfway.selection).toBeLessThan(stage);
    expect(halfway.paths.map((p) => p.id)).toEqual(
      before.paths.map((p) => p.id),
    );
    expect(
      halfway.paths.filter(
        (p, i) =>
          p.d !== before.paths[i].d || p.opacity !== before.paths[i].opacity,
      ).length,
    ).toBeGreaterThan(3);
    await page.clock.runFor(900);
    expect((await read()).selection).toBe(stage);
  }
  await explorer.getByRole("button", { name: /^Pause .* animation$/ }).click();
  const paused = await scene.evaluate((el) => el.innerHTML);
  await page.clock.runFor(1500);
  expect(await scene.evaluate((el) => el.innerHTML)).toBe(paused);
  await explorer.getByRole("button", { name: /^Replay .* sequence$/ }).click();
  expect((await read()).selection).toBe(0);
  await tabs.nth(6).click();
  expect((await read()).selection).toBe(6);
  await explorer.getByRole("button", { name: /^Resume .* animation$/ }).click();
});

test("the continuous journey plays automatically while in view", async ({
  page,
}) => {
  await page.clock.install();
  await page.goto("/blog/agentic-proof-of-work");
  await page.evaluate(() => document.fonts.ready);
  await page.clock.pauseAt(
    new Date(await page.evaluate(() => Date.now() + 1000)),
  );
  const explorer = page.locator("[data-lifecycle-explorer]");
  await approachProofScene(explorer);
  const scene = explorer.locator("[data-proof-scene]:visible");
  await expect(
    explorer.getByRole("button", { name: /^Pause .* animation$/ }),
  ).toBeEnabled();
  await showScene(scene);
  await page.clock.runFor(100);
  await page.clock.runFor(6000);
  await expect(
    explorer.locator("[data-proof-steps]").getByRole("tab").nth(1),
  ).toHaveAttribute("aria-selected", "true");
  const selection = Number(await scene.getAttribute("data-proof-selection"));
  expect(selection).toBeGreaterThan(0);
  expect(selection).toBeLessThan(0.25);
  // Flight has time to finish, then the receipt remains readable before work.
  await page.clock.runFor(6000);
  expect(Number(await scene.getAttribute("data-proof-selection"))).toBe(1);
  await expect(
    explorer.locator("[data-proof-steps]").getByRole("tab").nth(1),
  ).toHaveAttribute("aria-selected", "true");
});

test("autoplay visibly acknowledges T1 and returns its ledger confirmation", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.clock.install();
  await page.goto("/blog/agentic-proof-of-work");
  await page.evaluate(() => document.fonts.ready);
  await page.clock.pauseAt(
    new Date(await page.evaluate(() => Date.now() + 1000)),
  );
  const explorer = page.locator("[data-lifecycle-explorer]");
  await approachProofScene(explorer);
  const scene = explorer.locator("[data-proof-scene]:visible");
  await showScene(scene);
  const ack = scene.locator('[data-proof-path="testament-delivery-ack"]');
  const confirmation = scene.locator(
    '[data-proof-path="testament-delivery-confirmation"]',
  );
  await expect(ack).toHaveAttribute("opacity", "0.000");
  await expect(confirmation).toHaveAttribute("opacity", "0.000");
  await page.clock.runFor(24000);
  await expect(
    explorer.getByRole("tab", { name: "Post", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  const ackPositions = new Set<string>();
  const confirmationPositions = new Set<string>();
  for (let sample = 0; sample < 68; sample++) {
    await page.clock.runFor(250);
    const state = await scene.evaluate((svg) => {
      const read = (id: string) => {
        const path = svg.querySelector(`[data-proof-path="${id}"]`)!;
        return {
          d: path.getAttribute("d")!,
          opacity: Number(path.getAttribute("opacity")),
        };
      };
      return {
        selection: Number(svg.getAttribute("data-proof-selection")),
        ack: read("testament-delivery-ack"),
        confirmation: read("testament-delivery-confirmation"),
      };
    });
    if (state.ack.opacity > 0.4) ackPositions.add(state.ack.d);
    if (state.confirmation.opacity > 0.4)
      confirmationPositions.add(state.confirmation.d);
    if (state.selection < 5) expect(state.confirmation.opacity).toBe(0);
  }
  expect(ackPositions.size).toBeGreaterThan(3);
  expect(confirmationPositions.size).toBeGreaterThan(3);
  await expect(ack).toHaveAttribute("opacity", "0.000");
  await expect(confirmation).toHaveAttribute("opacity", /0\.[5-9]/);
});
