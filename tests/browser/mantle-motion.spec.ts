import { expect, test } from "@playwright/test";
import type { Locator } from "@playwright/test";

async function seamPosition(art: Locator) {
  return art
    .locator("[data-mantle-seam]")
    .first()
    .evaluate((element) => {
      if (!(element instanceof SVGPathElement))
        throw new Error("Expected the Mantle seam");
      const matrix = element.getScreenCTM();
      if (!matrix) throw new Error("The Mantle seam must be rendered");
      const point = element
        .getPointAtLength(element.getTotalLength() / 2)
        .matrixTransform(matrix);
      return { x: point.x, y: point.y };
    });
}

async function fingerprint(art: Locator) {
  return art.evaluate((element) => {
    let hash = 0;
    for (const character of element.innerHTML)
      hash = ((hash << 5) - hash + character.charCodeAt(0)) | 0;
    return hash;
  });
}

async function ringGeometry(art: Locator) {
  return art.locator("[data-mantle-stratum]").evaluateAll((rings) => {
    const hash = (value: string) => {
      let result = 0;
      for (const character of value)
        result = ((result << 5) - result + character.charCodeAt(0)) | 0;
      return result;
    };
    const shapes: string[] = [];
    const matrices: string[] = [];
    for (const ring of rings) {
      if (!(ring instanceof SVGGraphicsElement))
        throw new Error("Expected a rendered inner ring");
      const matrix = ring.getScreenCTM();
      if (!matrix)
        throw new Error("The inner rings must have a screen transform");
      shapes.push(
        [
          ring.tagName,
          ...["d", "cx", "cy", "r", "rx", "ry", "points", "transform"].map(
            (attribute) => ring.getAttribute(attribute) || "",
          ),
        ].join(";"),
      );
      matrices.push(
        [matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f]
          .map((value) => value.toFixed(5))
          .join(","),
      );
    }
    // Intentionally exclude opacity and color: illumination may move, geometry may not.
    return {
      count: rings.length,
      shapes: hash(shapes.join("|")),
      matrices: hash(matrices.join("|")),
    };
  });
}

async function expectStill(art: Locator) {
  await art.page().waitForTimeout(100);
  const paused = await fingerprint(art);
  await art.page().waitForTimeout(350);
  expect(
    await fingerprint(art),
    "Mantle's geometry and lighting should hold their pose",
  ).toBe(paused);
  return paused;
}

test("Mantle has clear short-interval motion at mobile card size and honors pause preferences", async ({
  page,
  isMobile,
}) => {
  // Keep the same mobile card size when comparing Chrome, Firefox, and WebKit.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/projects");
  await expect(page.locator("html")).toHaveAttribute("data-motion", "playing");
  await page.getByRole("searchbox", { name: "Search projects" }).fill("mantle");
  const card = page.locator(".project-card");
  await expect(card).toHaveCount(1);
  await card.scrollIntoViewIfNeeded();
  const art = card.locator('[data-project-study="mantle"] > svg');
  await expect(art).toBeVisible();
  await art.scrollIntoViewIfNeeded();
  await expect(card).toHaveAttribute("data-active", "true");

  const ringsBefore = await ringGeometry(art);
  expect(
    ringsBefore.count,
    "The anchored inner rings must be present",
  ).toBeGreaterThan(0);
  const first = await seamPosition(art);
  let last = first;
  let displacement = 0;
  for (let sample = 0; sample < 4; sample++) {
    await page.waitForTimeout(300);
    const next = await seamPosition(art);
    last = next;
    displacement = Math.max(
      displacement,
      Math.hypot(next.x - first.x, next.y - first.y),
    );
  }
  // The original 348px card moved its luminous seam only 1.71 CSS px in 1.2s.
  // Five CSS pixels protects visible travel, not merely changed SVG decimals.
  expect(
    displacement,
    "Mantle's luminous seam should visibly travel within 1.2 seconds",
  ).toBeGreaterThanOrEqual(5);
  expect(last.x, "The near-side seam should travel east").toBeGreaterThan(
    first.x,
  );
  expect(last.y, "The near-side seam should travel north").toBeLessThan(
    first.y,
  );
  expect(
    await ringGeometry(art),
    "Inner rings must preserve their geometry and screen transforms while the crust orbits",
  ).toEqual(ringsBefore);

  const pause = page.getByRole("button", { name: "Pause motion", exact: true });
  if (isMobile) await pause.tap();
  else await pause.click();
  await art.scrollIntoViewIfNeeded();
  await expect(card).toHaveAttribute("data-active", "false");
  const paused = await expectStill(art);
  const resume = page.getByRole("button", {
    name: "Resume motion",
    exact: true,
  });
  if (isMobile) await resume.tap();
  else await resume.click();
  await art.scrollIntoViewIfNeeded();
  await expect(card).toHaveAttribute("data-active", "true");
  await expect.poll(() => fingerprint(art)).not.toBe(paused);

  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(card).toHaveAttribute("data-active", "false");
  await expectStill(art);
  await page.locator(".site-footer").scrollIntoViewIfNeeded();
  await art.scrollIntoViewIfNeeded();
  await expectStill(art);
});

test("Mantle's northeast orbit passes behind the anchored core and returns to the front", async ({
  page,
}) => {
  test.setTimeout(90000);
  const start = new Date("2026-09-10T12:00:00Z");
  await page.clock.install({ time: start });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/projects");
  await expect(page.locator("html")).toHaveAttribute("data-motion", "playing");
  await page.getByRole("searchbox", { name: "Search projects" }).fill("mantle");
  const card = page.locator(".project-card");
  await expect(card).toHaveCount(1);
  await card.scrollIntoViewIfNeeded();
  const art = card.locator('[data-project-study="mantle"] > svg');
  await expect(art).toBeVisible();
  await art.scrollIntoViewIfNeeded();
  await expect(card).toHaveAttribute("data-active", "true");

  // Load normally first; runFor then executes every rAF update rather than
  // jumping past frames and triggering the shared clock's hidden-tab clamp.
  await page.clock.pauseAt(new Date(start.getTime() + 60000));
  await page.clock.runFor(64);
  const pose = () =>
    art.evaluate((svg) => {
      const back = svg.querySelector('[data-mantle-layer="back"]');
      const front = svg.querySelector('[data-mantle-layer="front"]');
      const core = svg.querySelector("[data-mantle-anchor]");
      const frontEdge = svg.querySelector(
        '[data-mantle-rims="front"] [data-mantle-seam]',
      );
      const backEdge = svg.querySelector(
        '[data-mantle-rims="back"] [data-mantle-edge]',
      );
      if (
        !back ||
        !front ||
        !(core instanceof SVGCircleElement) ||
        !(frontEdge instanceof SVGPathElement) ||
        !(backEdge instanceof SVGPathElement)
      )
        throw new Error(
          "Mantle must render separate front/rear layers and an anchored core",
        );
      const edgeMatrix = frontEdge.getScreenCTM();
      const coreMatrix = core.getScreenCTM();
      if (!edgeMatrix || !coreMatrix)
        throw new Error("Mantle must be rendered");
      const edge = frontEdge
        .getPointAtLength(frontEdge.getTotalLength() / 2)
        .matrixTransform(edgeMatrix);
      const center = new DOMPoint(
        core.cx.baseVal.value,
        core.cy.baseVal.value,
      ).matrixTransform(coreMatrix);
      return {
        frontLength: frontEdge.getTotalLength(),
        backLength: backEdge.getTotalLength(),
        edgeX: edge.x,
        edgeY: edge.y,
        centerX: center.x,
        centerY: center.y,
        coreRadius: core.r.baseVal.value,
        depthOrder:
          Boolean(
            back.compareDocumentPosition(core) &
            Node.DOCUMENT_POSITION_FOLLOWING,
          ) &&
          Boolean(
            core.compareDocumentPosition(front) &
            Node.DOCUMENT_POSITION_FOLLOWING,
          ),
      };
    });
  const samples = [await pose()];
  for (let quarter = 0; quarter < 4; quarter++) {
    await page.clock.runFor(7000);
    samples.push(await pose());
  }
  const first = samples[0];
  const halfway = samples[2];
  const last = samples[4];
  expect(
    first.frontLength,
    "The main seam should begin on the near side",
  ).toBeGreaterThan(200);
  expect(first.backLength).toBeLessThan(1);
  expect(
    halfway.frontLength,
    "The near-side seam must disappear when it passes behind the core",
  ).toBeLessThan(1);
  expect(
    halfway.backLength,
    "The matching seam must continue on the far side",
  ).toBeGreaterThan(200);
  expect(
    last.frontLength,
    "The seam should return to the near side after one revolution",
  ).toBeGreaterThan(200);
  expect(last.backLength).toBeLessThan(1);
  expect(
    Math.hypot(last.edgeX - first.edgeX, last.edgeY - first.edgeY),
    "The seam should close its projected orbit after 28 seconds",
  ).toBeLessThan(0.5);
  for (const sample of samples) {
    expect(
      sample.depthOrder,
      "Rear material must be painted behind the core and near material in front",
    ).toBe(true);
    expect(sample.coreRadius).toBe(first.coreRadius);
    expect(
      Math.hypot(
        sample.centerX - first.centerX,
        sample.centerY - first.centerY,
      ),
      "The inner sphere must remain anchored throughout the orbit",
    ).toBeLessThan(0.05);
  }
});

test("Mantle's rendered material stays continuous across the major horizon crossings", async ({
  page,
}) => {
  test.setTimeout(90000);
  const start = new Date("2026-09-10T12:00:00Z");
  await page.clock.install({ time: start });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/projects");
  await expect(page.locator("html")).toHaveAttribute("data-motion", "playing");
  await page.getByRole("searchbox", { name: "Search projects" }).fill("mantle");
  const card = page.locator(".project-card");
  await expect(card).toHaveCount(1);
  await card.scrollIntoViewIfNeeded();
  const art = card.locator('[data-project-study="mantle"] > svg');
  await expect(art).toBeVisible();
  await art.scrollIntoViewIfNeeded();
  await expect(card).toHaveAttribute("data-active", "true");
  const visual = card.locator(".project-visual");
  // Read the renderer's elapsed time from its continuous 12-degree/second light sweep.
  const elapsed = async () => {
    const transform = await art
      .locator("[data-mantle-spectrum]")
      .getAttribute("gradientTransform");
    const angle = transform?.match(/^rotate\(([-\d.]+)/)?.[1];
    if (!angle)
      throw new Error("Mantle must expose its rendered light rotation");
    return Number(angle) / 12;
  };
  await page.clock.pauseAt(new Date(start.getTime() + 60000));
  await page.clock.runFor(64);
  const horizons = [
    ((Math.PI / 2 - 1.3) * 28) / (2 * Math.PI),
    (((3 * Math.PI) / 2 + 0.29) * 28) / (2 * Math.PI),
  ];
  for (const horizon of horizons) {
    await page.clock.runFor(
      Math.max(0, (horizon - 0.064 - (await elapsed())) * 1000),
    );
    let previousTime = await elapsed();
    expect(previousTime).toBeLessThan(horizon);
    let previous = await visual.screenshot({ scale: "css" });
    for (let sample = 0; sample < 4; sample++) {
      await page.clock.runFor(32);
      const currentTime = await elapsed();
      const current = await visual.screenshot({ scale: "css" });
      const difference = await page.evaluate(
        async ({ before, after }) => {
          const decode = async (base64: string) => {
            const image = new Image();
            image.src = `data:image/png;base64,${base64}`;
            await image.decode();
            const canvas = document.createElement("canvas");
            canvas.width = image.width;
            canvas.height = image.height;
            const context = canvas.getContext("2d");
            if (!context)
              throw new Error("Pixel comparison requires a canvas context");
            context.drawImage(image, 0, 0);
            return context.getImageData(0, 0, canvas.width, canvas.height);
          };
          const [first, last] = await Promise.all([
            decode(before),
            decode(after),
          ]);
          if (first.width !== last.width || first.height !== last.height)
            throw new Error(
              "The card frame must stay the same size between samples",
            );
          let total = 0;
          for (let pixel = 0; pixel < first.data.length; pixel += 4)
            for (let channel = 0; channel < 3; channel++)
              total += Math.abs(
                last.data[pixel + channel] - first.data[pixel + channel],
              );
          return total / (first.width * first.height * 3);
        },
        {
          before: previous.toString("base64"),
          after: current.toString("base64"),
        },
      );
      // Native captures of the bug jumped 0.74–0.76 RGB levels; ordinary nearby
      // moving frames measured 0.26–0.40 at this exact card size.
      if (difference > 0.6) {
        await test.info().attach(`before-${previousTime.toFixed(3)}`, {
          body: previous,
          contentType: "image/png",
        });
        await test.info().attach(`after-${currentTime.toFixed(3)}`, {
          body: current,
          contentType: "image/png",
        });
      }
      expect(
        difference,
        `Material should not flash between ${previousTime.toFixed(3)}s and ${currentTime.toFixed(3)}s at the ${horizon.toFixed(3)}s horizon`,
      ).toBeLessThanOrEqual(0.6);
      previous = current;
      previousTime = currentTime;
    }
    expect(
      previousTime,
      "The samples must actually cross the horizon, not inspect a frozen pose",
    ).toBeGreaterThan(horizon);
  }
});
