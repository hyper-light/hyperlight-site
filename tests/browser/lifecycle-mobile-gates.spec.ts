import { approachProofScene } from "./proof-scene-helper";
import { expect, test } from "@playwright/test";

test("mobile autoplay clears return gates and opens claim gates before crossing", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 1000 });
  await page.clock.install();
  await page.goto("/blog/agentic-proof-of-work");
  await page.evaluate(() => document.fonts.ready);
  await page.clock.pauseAt(
    new Date(await page.evaluate(() => Date.now() + 1000)),
  );
  const explorer = page.locator("[data-lifecycle-explorer]");
  await approachProofScene(explorer);
  const scene = explorer.locator('[data-proof-scene][data-portrait="true"]');
  const show = async () => {
    await scene.scrollIntoViewIfNeeded();
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
  };
  await show();
  await explorer
    .getByRole("tab", { name: "Acquire", exact: true })
    .evaluate((el) => (el as HTMLButtonElement).click());
  await page.clock.runFor(1200);
  const fullyOpen = await scene.evaluate((svg) =>
    Object.fromEntries(
      ["posted", "holder"].map((id) => [
        id,
        svg
          .querySelector(`[data-proof-path="${id}-tooth-1-outline"]`)!
          .getAttribute("d"),
      ]),
    ),
  );
  await explorer
    .getByRole("button", {
      name: "Replay Claim and Response Lifecycles sequence",
    })
    .evaluate((el) => (el as HTMLButtonElement).click());
  await show();
  const crossed = new Set<string>();
  for (let tick = 0; tick < 150; tick++) {
    await page.clock.runFor(100);
    const result = await scene.evaluate((svg, open) => {
      const selection = Number(svg.getAttribute("data-proof-selection"));
      const issues: string[] = [];
      const gates: string[] = [];
      for (const [id, from, to] of [
        ["posted", 0.449, 0.562],
        ["holder", 0.577, 0.735],
      ] as const) {
        if (selection < from || selection > to) continue;
        gates.push(id);
        if (
          svg
            .querySelector(`[data-proof-path="${id}-tooth-1-outline"]`)!
            .getAttribute("d") !== open[id]
        )
          issues.push(`${id} shutter is not fully open at ${selection}`);
      }
      if (selection >= 0.18 && selection <= 0.85) {
        const paths = Array.from(
          svg.querySelectorAll<SVGPathElement>("[data-proof-path]"),
        );
        const ships = paths.filter((p) =>
          /^claim-ship-spacecraft-(hull|wing-[01])$/.test(p.dataset.proofPath!),
        );
        const closed = paths.filter((p) =>
          /^(response|ledger-return)-(post--?1|crossbar|threshold)-outline$/.test(
            p.dataset.proofPath!,
          ),
        );
        for (const ship of ships)
          for (const gate of closed) {
            const a = ship.getBBox(),
              b = gate.getBBox();
            if (
              a.x < b.x + b.width + 3 &&
              a.x + a.width > b.x - 3 &&
              a.y < b.y + b.height + 3 &&
              a.y + a.height > b.y - 3
            )
              issues.push(
                `${ship.dataset.proofPath} overlaps ${gate.dataset.proofPath} at ${selection}`,
              );
          }
      }
      return { issues, gates, selection };
    }, fullyOpen);
    expect(result.issues).toEqual([]);
    result.gates.forEach((gate) => crossed.add(gate));
    if (result.selection === 1) break;
  }
  expect([...crossed].sort()).toEqual(["holder", "posted"]);
});
