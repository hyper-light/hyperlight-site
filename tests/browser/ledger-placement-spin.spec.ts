import { expect, test, type Locator, type Page } from "@playwright/test";
import { WORLD_GEOGRAPHY_METADATA } from "../../components/proof-work/world-geography";

async function globeState(scene: Locator) {
  return scene.evaluate((element) => {
    const paths = Array.from(
      element.querySelectorAll<SVGPathElement>('[data-proof-path^="coast-"]'),
      (path) => {
        const point = path.getPointAtLength(0);
        return {
          id: path.dataset.proofPath!,
          d: path.getAttribute("d"),
          x: point.x,
          y: point.y,
          opacity: Number(path.getAttribute("opacity")),
        };
      },
    );
    const markers = [0, 1, 2].map((index) => {
      const box = element
        .querySelector<SVGPathElement>(`[data-proof-path="hub-${index}-0"]`)!
        .getBBox();
      return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    });
    const labels = Array.from(
      element.querySelectorAll<SVGTextElement>("[data-proof-label]"),
      (label) => ({
        id: label.dataset.proofLabel,
        x: label.getAttribute("x"),
        y: label.getAttribute("y"),
        transform: label.getAttribute("transform"),
      }),
    );
    return { paths, markers, labels };
  });
}

async function startVisibleClock(page: Page, scene: Locator) {
  await scene.scrollIntoViewIfNeeded();
  const coast = scene.locator('[data-proof-path^="coast-"]').first();
  const before = await coast.getAttribute("d");
  // IntersectionObserver delivery is real, even when animation time is mocked.
  await expect
    .poll(async () => {
      await page.clock.runFor(32);
      return coast.getAttribute("d");
    })
    .not.toBe(before);
}

async function expectAttachedRoutes(scene: Locator) {
  const errors = await scene.evaluate((element) => {
    const path = (id: string) =>
      element.querySelector<SVGPathElement>(`[data-proof-path="${id}"]`)!;
    const center = (id: string) => {
      const box = path(id).getBBox();
      return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    };
    const distance = (
      a: { x: number; y: number },
      b: { x: number; y: number },
    ) => Math.hypot(a.x - b.x, a.y - b.y);
    const failures: string[] = [];
    for (let index = 0; index < 3; index++) {
      const leader = path(`region-leader-${index}`);
      if (
        distance(
          leader.getPointAtLength(leader.getTotalLength()),
          center(`hub-${index}-0`),
        ) > 0.025
      )
        failures.push(
          `Region ${index} label leader detached from its rotating marker`,
        );
    }
    for (const destination of [1, 2]) {
      const route = path(`replication-route-${destination}`);
      const length = route.getTotalLength();
      if (distance(route.getPointAtLength(0), center("hub-0-0")) > 0.025)
        failures.push(`Route ${destination} detached from source`);
      if (
        distance(
          route.getPointAtLength(length),
          center(`hub-${destination}-0`),
        ) > 0.025
      )
        failures.push(`Route ${destination} detached from destination`);
      const packet = center(`packet-${destination}`);
      const nearest = Math.min(
        ...Array.from({ length: 257 }, (_, i) =>
          distance(packet, route.getPointAtLength((length * i) / 256)),
        ),
      );
      if (nearest > 1.5)
        failures.push(`Packet ${destination} left its rotating route`);
    }
    return failures;
  });
  expect(errors).toEqual([]);
}

test("detailed geography and network traffic stay legible through a full rotation", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.clock.install();
  await page.goto("/blog/agentic-proof-of-work");
  await page.evaluate(() => document.fonts.ready);
  const figure = page.locator('[data-proof-figure="ledger-placement"]');
  const scene = figure.locator("[data-proof-scene]:visible");
  await scene.scrollIntoViewIfNeeded();
  await page.clock.pauseAt(
    new Date(await page.evaluate(() => Date.now() + 1000)),
  );
  await startVisibleClock(page, scene);
  await expect(scene.locator('[data-proof-path^="coast-"]')).toHaveCount(WORLD_GEOGRAPHY_METADATA.coastChunks);
  await expect(scene.locator('[data-proof-path^="border-"]')).toHaveCount(WORLD_GEOGRAPHY_METADATA.borderChunks);
  expect(
    await scene
      .locator('[data-proof-path^="border-"][stroke-dasharray="2 3"]')
      .count(),
  ).toBeGreaterThan(0);
  const localActivity = () =>
    scene.evaluate(
      (element) =>
        Array.from(
          element.querySelectorAll('[data-proof-path^="local-"]'),
        ).filter(
          (path) =>
            /-(request|response|hub-arrival|site-arrival)$/.test(
              path.getAttribute("data-proof-path") ?? "",
            ) && Number(path.getAttribute("opacity")) > 0.15,
        ).length,
    );
  let activity = 0;
  for (let step = 0; step < 8; step++) {
    await page.clock.runFor(500);
    activity = Math.max(activity, await localActivity());
  }
  expect(
    activity,
    "workload traffic is visible even without cross-region replication",
  ).toBeGreaterThan(1);
  await figure.getByRole("tab", { name: "Replication", exact: true }).click();
  await page.clock.runFor(2_000);
  for (const name of [
    "atlantic",
    "americas",
    "pacific-islands",
    "asia-oceania",
  ]) {
    await expectAttachedRoutes(scene);
    await scene.screenshot({
      path: testInfo.outputPath(`detailed-globe-${name}.png`),
    });
    await page.clock.runFor(22_500);
  }
  await figure.getByRole("tab", { name: "Residency", exact: true }).click();
  await page.clock.runFor(2_000);
  for (let step = 0; step < 16; step++) {
    await page.clock.runFor(500);
    await expect(
      scene.locator('[data-proof-path="replication-ack-2"]'),
    ).toHaveAttribute("opacity", "0.000");
    const blockedActivity = await scene.evaluate(
      (element) =>
        Array.from(
          element.querySelectorAll('[data-proof-path^="local-2-"]'),
        ).filter(
          (path) =>
            /-(request|response|hub-arrival|site-arrival)$/.test(
              path.getAttribute("data-proof-path") ?? "",
            ) && Number(path.getAttribute("opacity")) > 0,
        ).length,
    );
    expect(blockedActivity).toBe(0);
  }
  await scene.screenshot({
    path: testInfo.outputPath("detailed-globe-residency.png"),
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});

test("Global Ledger Placement gently spins its geography without moving labels or resetting on selection", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.clock.install();
  const response = await page.goto("/blog/agentic-proof-of-work");
  expect(response?.status()).toBe(200);
  await page.evaluate(() => document.fonts.ready);
  const figure = page.locator('[data-proof-figure="ledger-placement"]');
  const scene = figure.locator("[data-proof-scene]:visible");
  await expect(scene).toHaveCount(1);
  await scene.scrollIntoViewIfNeeded();
  await page.clock.pauseAt(
    new Date(await page.evaluate(() => Date.now() + 1000)),
  );
  await startVisibleClock(page, scene);
  const coastNode = await scene
    .locator('[data-proof-path^="coast-"]')
    .first()
    .elementHandle();
  const count = await scene.locator("*").count();
  const initial = await globeState(scene);
  expect(initial.paths.length).toBeGreaterThan(50);
  await scene.screenshot({
    path: testInfo.outputPath("ledger-globe-initial.png"),
  });

  await page.clock.runFor(10_000);
  const turned = await globeState(scene);
  expect(turned.paths.map(({ id }) => id)).toEqual(
    initial.paths.map(({ id }) => id),
  );
  const displacements = turned.paths.map((point, index) =>
    Math.hypot(
      point.x - initial.paths[index].x,
      point.y - initial.paths[index].y,
    ),
  );
  // Ten seconds of a gentle revolution moves recognizable coastlines, not
  // just their color or a few pixels of ambient wobble.
  expect(Math.max(...displacements)).toBeGreaterThan(45);
  expect(Math.max(...displacements)).toBeLessThan(140);
  expect(
    Math.max(
      ...turned.markers.map((point, index) =>
        Math.hypot(
          point.x - initial.markers[index].x,
          point.y - initial.markers[index].y,
        ),
      ),
    ),
  ).toBeGreaterThan(35);
  expect(turned.labels).toEqual(initial.labels);
  expect(
    Math.max(
      ...turned.paths.map((point, index) =>
        Math.abs(point.opacity - initial.paths[index].opacity),
      ),
    ),
  ).toBeGreaterThan(0.1);
  await expectAttachedRoutes(scene);
  await scene.screenshot({
    path: testInfo.outputPath("ledger-globe-after-10s.png"),
  });

  await page.clock.runFor(32);
  const nextFrame = await globeState(scene);
  expect(
    Math.max(
      ...nextFrame.paths.map((point, index) =>
        Math.hypot(
          point.x - turned.paths[index].x,
          point.y - turned.paths[index].y,
        ),
      ),
    ),
    "No coastline jumps between adjacent paints",
  ).toBeLessThan(1.1);
  expect(
    Math.max(
      ...nextFrame.paths.map((point, index) =>
        Math.abs(point.opacity - turned.paths[index].opacity),
      ),
    ),
    "Front/back shading crosses the limb smoothly",
  ).toBeLessThan(0.04);

  const poseBeforeSelection = nextFrame.paths.map(({ d }) => d);
  await figure.getByRole("tab", { name: "Replication", exact: true }).click();
  await expect(scene).toHaveAttribute("data-proof-target", "1");
  expect((await globeState(scene)).paths.map(({ d }) => d)).toEqual(
    poseBeforeSelection,
  );
  await startVisibleClock(page, scene);
  await page.clock.runFor(10_000);
  const continued = await globeState(scene);
  expect(
    Math.max(
      ...continued.paths.map((point, index) =>
        Math.hypot(
          point.x - turned.paths[index].x,
          point.y - turned.paths[index].y,
        ),
      ),
    ),
    "Rotation continues after selecting replication",
  ).toBeGreaterThan(45);
  expect(continued.labels).toEqual(initial.labels);
  await expect(scene).toHaveAttribute("data-proof-selection", "1.000");
  await expectAttachedRoutes(scene);
  expect(await scene.locator("*").count()).toBe(count);
  expect(await coastNode!.evaluate((element) => element.isConnected)).toBe(
    true,
  );

  await figure
    .getByRole("button", {
      name: "Pause Global Ledger Placement animation",
      exact: true,
    })
    .click();
  await expect(page.locator("html")).toHaveAttribute("data-motion", "paused");
  const paused = await scene.evaluate((element) => element.innerHTML);
  await page.clock.runFor(2_000);
  expect(await scene.evaluate((element) => element.innerHTML)).toBe(paused);
  const frozenPose = await globeState(scene);
  for (const [index, name] of [
    "Sessions",
    "Replication",
    "Residency",
  ].entries()) {
    await figure.getByRole("tab", { name, exact: true }).click();
    await expect(scene).toHaveAttribute("data-proof-selection", `${index}.000`);
    const selected = await globeState(scene);
    expect(selected.paths.map(({ d }) => d)).toEqual(
      frozenPose.paths.map(({ d }) => d),
    );
    expect(selected.markers).toEqual(frozenPose.markers);
    expect(selected.labels).toEqual(initial.labels);
    await expectAttachedRoutes(scene);
  }
  await figure
    .getByRole("button", {
      name: "Resume Global Ledger Placement animation",
      exact: true,
    })
    .click();
  await startVisibleClock(page, scene);
  expect((await globeState(scene)).paths.map(({ d }) => d)).not.toEqual(
    frozenPose.paths.map(({ d }) => d),
  );

  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(
    figure.getByRole("button", {
      name: "Global Ledger Placement follows reduced motion",
    }),
  ).toBeDisabled();
  const reduced = await scene.evaluate((element) => element.innerHTML);
  await page.clock.runFor(2_000);
  expect(await scene.evaluate((element) => element.innerHTML)).toBe(reduced);
  const reducedPose = await globeState(scene);
  await figure.getByRole("tab", { name: "Sessions", exact: true }).click();
  await expect(scene).toHaveAttribute("data-proof-selection", "0.000");
  expect((await globeState(scene)).paths.map(({ d }) => d)).toEqual(
    reducedPose.paths.map(({ d }) => d),
  );
  expect(
    await scene.evaluate((element) => /NaN|Infinity/.test(element.innerHTML)),
  ).toBe(false);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
