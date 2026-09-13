import { expect, test, type Locator, type Page } from "@playwright/test";

const figureSelector = '[data-proof-figure="slates-orbital-fleet"]';
const successStages = [
  "Base",
  "Provision",
  "Deploy",
  "Edit",
  "Submit",
  "Merge",
  "Replicate",
  "Ready",
];
const scenarios = [
  {
    value: "conflict",
    stages: [
      "Base",
      "Edit",
      "Accept 1",
      "Conflict",
      "Read head",
      "Revise",
      "Resubmit",
      "Accept 2",
    ],
    owner: "v2 · quality=85",
    worker: ["worker-2-edit", "W2 · 85 accepted v2"],
    home: "v2 · verified",
    footer: "v2 · QUALITY 85 · SOURCE DISK UNCHANGED",
  },
  {
    value: "missing",
    stages: [
      "Offer",
      "Missing",
      "Request",
      "Transfer",
      "Verify",
      "Acknowledge",
      "Commit",
      "Ready",
    ],
    owner: "SHARED v3",
    worker: ["worker-1-edit", "W1 · received v3"],
    home: "ABC verified ACK",
    footer: "SHARED v3 · SOURCE DISK UNCHANGED",
  },
  {
    value: "unavailable",
    stages: [
      "Offer",
      "Missing",
      "Request",
      "Retry",
      "Exhausted",
      "Refuse",
      "Keep head",
      "Unavailable",
    ],
    owner: "v0 · candidate refused",
    worker: ["worker-1-edit", "W1 · unavailable"],
    home: "B absent; no ACK",
    footer: "HEAD v0 KEPT · SOURCE DISK UNCHANGED",
  },
  {
    value: "reply-loss",
    stages: [
      "Send",
      "Execute",
      "Record",
      "Lose reply",
      "Reconnect",
      "Retry",
      "Recall",
      "Complete",
    ],
    owner: "R17 → S7 · saved",
    worker: ["worker-1-edit", "W1 · received S7"],
    home: "v3 · retained",
    footer: "ONE S7 · SOURCE DISK UNCHANGED",
  },
  {
    value: "owner-loss",
    stages: [
      "Committed",
      "Suspect",
      "Authorize",
      "Fence",
      "Promise",
      "Recover",
      "Recommit",
      "Serve",
      "Refuse",
    ],
    owner: "E4 rejected · StaleEpoch",
    worker: ["worker-1-edit", "W1 · route to B"],
    home: "E5 · serves v3",
    footer: "B SERVES v3 · A CANNOT COMMIT",
  },
] as const;

async function openScenarios(page: Page, reduced = true) {
  await page.emulateMedia({
    reducedMotion: reduced ? "reduce" : "no-preference",
  });
  const response = await page.goto("/blog/introducing-slates");
  expect(response?.status()).toBe(200);
  await page.evaluate(() => document.fonts.ready);
  const figure = page.locator(figureSelector);
  await figure.locator("[data-proof-stage]").scrollIntoViewIfNeeded();
  const svg = figure.locator("[data-proof-scene]:visible");
  const choice = figure.getByRole("combobox", {
    name: "Scenario",
    exact: true,
  });
  await expect(choice).toHaveValue("success");
  await expect(svg).toHaveCount(1);
  if (reduced)
    await expect(
      figure.getByRole("button", { name: /follows reduced motion/ }),
    ).toBeDisabled();
  return { figure, svg, choice };
}

async function snapshot(svg: Locator) {
  return svg
    .locator("[data-proof-path]")
    .evaluateAll((paths) =>
      paths.map((path) => [
        path.getAttribute("data-proof-path"),
        path.getAttribute("d"),
        path.getAttribute("opacity"),
        path.getAttribute("fill"),
        path.getAttribute("fill-opacity"),
        path.getAttribute("stroke-opacity"),
        path.getAttribute("style"),
        path.getAttribute("stroke-dashoffset"),
      ]),
    );
}

async function captionIssues(svg: Locator) {
  return svg.evaluate((element) => {
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
          polygon.some((point, edge) => {
            const next = polygon[(edge + 1) % polygon.length];
            const length = Math.hypot(next.x - point.x, next.y - point.y);
            const nx = -(next.y - point.y) / length,
              ny = (next.x - point.x) / length;
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
}

test("failure stories reset from late stages and preserve their distinct outcomes", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const { figure, svg, choice } = await openScenarios(page);
  await expect(choice.locator("option")).toHaveCount(6);
  await figure.getByRole("tab", { name: "Ready", exact: true }).click();
  await expect(svg).toHaveAttribute("data-proof-selection", "7.000");
  const finals: string[] = [];
  for (const scenario of scenarios) {
    await choice.selectOption(scenario.value);
    await expect(svg).toHaveAttribute("data-proof-selection", "0.000");
    await expect(figure.getByRole("tab")).toHaveText([...scenario.stages]);
    await expect(figure.getByRole("tab").first()).toHaveAttribute(
      "aria-selected",
      "true",
    );
    const ids = await svg
      .locator("[data-proof-path]")
      .evaluateAll((paths) =>
        paths.map((path) => path.getAttribute("data-proof-path")),
      );
    expect(new Set(ids).size).toBe(ids.length);
    const last = scenario.stages.length - 1;
    await figure.getByRole("tab").nth(last).click();
    await expect(svg).toHaveAttribute("data-proof-selection", last.toFixed(3));
    await expect(svg.locator('[data-proof-label="owner-head"]')).toHaveText(
      scenario.owner,
    );
    await expect(
      svg.locator('[data-proof-label="home-station-version"]'),
    ).toHaveText(scenario.home);
    await expect(
      svg.locator(`[data-proof-label="${scenario.worker[0]}"]`),
    ).toHaveText(scenario.worker[1]);
    await expect(svg.locator('[data-proof-label="orbital-result"]')).toHaveText(
      scenario.footer,
    );
    expect(
      await svg
        .locator("[data-proof-path]")
        .evaluateAll((paths) =>
          paths.map((path) => path.getAttribute("data-proof-path")),
        ),
    ).toEqual(ids);
    finals.push(JSON.stringify(await snapshot(svg)));
    if (scenario.value === "owner-loss") {
      await expect(
        svg.locator('[data-proof-label="home-station-title"]'),
      ).toHaveText("REPLACEMENT OWNER B");
      expect(
        Number(
          await svg
            .locator('[data-proof-path="scenario-owner-fence"]')
            .getAttribute("opacity"),
        ),
      ).toBeGreaterThan(0.5);
    }
  }
  expect(new Set(finals).size).toBe(scenarios.length);
  await choice.selectOption("success");
  await expect(svg).toHaveAttribute("data-proof-selection", "0.000");
  await expect(figure.getByRole("tab")).toHaveText(successStages);
  expect(errors).toEqual([]);
});

test("all failure-stage captions fit on phones without collisions or overflow", async ({
  page,
}, testInfo) => {
  test.setTimeout(180_000);
  const { figure, svg, choice } = await openScenarios(page);
  await expect(
    figure.getByRole("button", { name: /follows reduced motion/ }),
  ).toBeDisabled();
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 1100 });
    await expect(svg).toHaveAttribute("viewBox", "0 0 420 800");
    const control = await choice.boundingBox();
    expect(control?.height).toBeGreaterThanOrEqual(44);
    for (const scenario of scenarios) {
      await choice.selectOption(scenario.value);
      for (let stage = 0; stage < scenario.stages.length; stage++) {
        await figure.getByRole("tab").nth(stage).click();
        await expect(svg).toHaveAttribute(
          "data-proof-selection",
          stage.toFixed(3),
        );
        expect
          .soft(
            await captionIssues(svg),
            `${width}/${scenario.value}/${scenario.stages[stage]}`,
          )
          .toEqual([]);
      }
      if (width === 390)
        await svg.screenshot({
          path: testInfo.outputPath(`orbital-${scenario.value}-390-final.png`),
        });
      const frozen = await snapshot(svg);
      await page.waitForTimeout(80);
      expect(await snapshot(svg)).toEqual(frozen);
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
});

test("scenario switching and replay preserve the paused state", async ({
  page,
}) => {
  const { figure, svg, choice } = await openScenarios(page, false);
  await figure.getByRole("button", { name: /^Pause .* animation$/ }).click();
  for (const scenario of scenarios) {
    await choice.selectOption(scenario.value);
    await expect(svg).toHaveAttribute("data-proof-selection", "0.000");
    await expect(
      figure.getByRole("button", { name: /^Resume .* animation$/ }),
    ).toHaveAttribute("aria-pressed", "true");
    await figure
      .getByRole("tab")
      .nth(scenario.stages.length - 1)
      .click();
    const frozen = await snapshot(svg);
    await page.waitForTimeout(100);
    expect(await snapshot(svg)).toEqual(frozen);
    await figure.getByRole("button", { name: /^Replay .* sequence$/ }).click();
    await expect(svg).toHaveAttribute("data-proof-selection", "0.000");
    await expect(
      figure.getByRole("button", { name: /^Resume .* animation$/ }),
    ).toHaveAttribute("aria-pressed", "true");
  }
});
