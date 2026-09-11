import { test, expect, type Locator } from "@playwright/test";
import { projects } from "../../lib/projects";
import { studies } from "../../lib/studies";

const additions = [
  { slug: "grid", name: "Grid", title: "Connection" },
  { slug: "ergo", name: "Ergo", title: "Distribution" },
];

test("Slates inherits the ecosystem icon colors at rest and on hover", async ({
  page,
  isMobile,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const strip = page.locator(".ecosystem-projects");
  const slates = strip.getByRole("link", { name: "Slates", exact: true });
  const vorpal = strip.getByRole("link", { name: "Vorpal", exact: true });
  const icon = slates.locator("svg[data-project-mark=slates]");
  const peerIcon = vorpal.locator("svg[data-project-mark=vorpal]");
  await slates.scrollIntoViewIfNeeded();
  await expect(icon).toHaveCSS("color", "rgb(161, 163, 170)");
  await expect(icon).toHaveCSS("stroke", "rgb(161, 163, 170)");
  await expect(peerIcon).toHaveCSS("stroke", "rgb(161, 163, 170)");
  await expect(icon).toHaveAttribute("stroke-width", "1.4");
  if (!isMobile) {
    await slates.hover();
    await expect(icon).toHaveCSS("stroke", "rgb(238, 238, 238)");
    await vorpal.hover();
    await expect(peerIcon).toHaveCSS("stroke", "rgb(238, 238, 238)");
    await expect(icon).toHaveCSS("stroke", "rgb(161, 163, 170)");
    await page.mouse.move(0, 0);
  }
  await strip.screenshot({ path: testInfo.outputPath("ecosystem-icons.png") });
});

async function geometry(art: Locator) {
  return art.locator("path").evaluateAll((paths) => {
    const value = paths.map((path) => path.getAttribute("d")).join("|");
    let hash = 0;
    for (let i = 0; i < value.length; i++)
      hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
    return hash;
  });
}

async function expectFrameFit(art: Locator) {
  const fit = await art.evaluate((element) => {
    if (!(element instanceof SVGSVGElement)) throw new Error("Expected SVG");
    const frame = element.closest(".project-visual, .study-artwork")!;
    const rect = frame.getBoundingClientRect();
    const box = element.getBBox();
    const matrix = element.getScreenCTM()!;
    const start = new DOMPoint(box.x, box.y).matrixTransform(matrix);
    const end = new DOMPoint(
      box.x + box.width,
      box.y + box.height,
    ).matrixTransform(matrix);
    return {
      left: start.x - rect.left,
      top: start.y - rect.top,
      right: rect.right - end.x,
      bottom: rect.bottom - end.y,
      width: (end.x - start.x) / rect.width,
      height: (end.y - start.y) / rect.height,
    };
  });
  for (const edge of [fit.left, fit.top, fit.right, fit.bottom])
    expect(edge, JSON.stringify(fit)).toBeGreaterThanOrEqual(-2);
  expect(fit.width).toBeGreaterThan(0.35);
  expect(fit.height).toBeGreaterThan(0.35);
}

for (const { slug, name, title } of additions) {
  test(`${name} homepage study is responsive and follows motion controls`, async ({
    page,
    isMobile,
  }, testInfo) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/");
    const project = page
      .locator(".ecosystem-projects")
      .getByRole("link", { name, exact: true });
    await expect(project).toHaveAttribute("href", `/projects/${slug}`);
    await expect(
      project.locator(`[data-project-mark="${slug}"] path`).first(),
    ).toBeAttached();
    const previous =
      studies.length - studies.findIndex((study) => study.id === slug);
    for (let i = 0; i < previous; i++)
      await page.getByRole("button", { name: "Previous study" }).click();
    const art = page.locator(`[data-study="${slug}"] svg`);
    await expect(art).toBeVisible();
    await expect(page.locator(".study-title")).toHaveText(title);
    await expect(page.locator(".study-index")).toHaveText(
      `${String(studies.findIndex((study) => study.id === slug) + 1).padStart(2, "0")} / ${String(studies.length).padStart(2, "0")}`,
    );
    await art.scrollIntoViewIfNeeded();
    const initial = await geometry(art);
    await expect.poll(() => geometry(art)).not.toBe(initial);

    await page.getByRole("button", { name: "Pause ambient animation" }).click();
    const paused = await geometry(art);
    await page.waitForTimeout(250);
    expect(await geometry(art)).toBe(paused);
    for (const width of isMobile ? [320, 390, 768, 900] : [1024, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      await art.scrollIntoViewIfNeeded();
      await expectFrameFit(art);
      expect(
        await page.evaluate(
          () =>
            document.documentElement.scrollWidth >
            document.documentElement.clientWidth,
        ),
      ).toBe(false);
    }
    await page.setViewportSize({ width: isMobile ? 390 : 1440, height: 1000 });
    await page
      .locator(".study-gallery")
      .screenshot({ path: testInfo.outputPath(`${slug}-homepage.png`) });
    await page
      .getByRole("button", { name: "Resume ambient animation" })
      .click();
    await expect.poll(() => geometry(art)).not.toBe(paused);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(
      page.getByRole("button", {
        name: "Reduced motion follows your device setting",
      }),
    ).toBeDisabled();
    const reduced = await geometry(art);
    await page.waitForTimeout(250);
    expect(await geometry(art)).toBe(reduced);
    expect(errors).toEqual([]);
  });

  test(`${name} appears in the project catalog and opens its detail page`, async ({
    page,
    isMobile,
  }, testInfo) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: isMobile ? 320 : 1440, height: 1000 });
    await page.goto("/projects");
    await expect(page.locator(".project-card")).toHaveCount(projects.length);
    await page.getByRole("tab", { name: /^In design/ }).click();
    await page.getByRole("searchbox", { name: "Search projects" }).fill(name);
    const card = page.locator(".project-card");
    await expect(card).toHaveCount(1);
    await expect(
      card.getByRole("heading", { name, exact: true }),
    ).toBeVisible();
    await expect(card.getByText("In design", { exact: true })).toBeVisible();
    await expect(
      card.getByRole("link", { name: `${name} repository on GitHub` }),
    ).toHaveAttribute("href", `https://github.com/hyper-light/${slug}`);
    await card.scrollIntoViewIfNeeded();
    const visual = card.locator(".project-visual");
    await expect(visual).toHaveCSS("position", "relative");
    const visualBox = await visual.boundingBox();
    expect(visualBox).not.toBeNull();
    expect(visualBox!.width / visualBox!.height).toBeCloseTo(
      isMobile ? 1.9 : 1.8,
      1,
    );
    const preview = card.locator(`[data-project-study="${slug}"] > svg`);
    await expect(preview).toBeVisible();
    await expectFrameFit(preview);
    await card.screenshot({ path: testInfo.outputPath(`${slug}-card.png`) });
    await card.getByRole("link", { name: `Explore ${name}` }).click();
    await expect(page).toHaveURL(`/projects/${slug}`);
    await expect(
      page.getByRole("heading", { name, exact: true, level: 1 }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "View repository" }),
    ).toHaveAttribute("href", `https://github.com/hyper-light/${slug}`);
    const detail = page.locator(`[data-project-study="${slug}"] > svg`);
    await expect(
      page.locator(".project-detail-hero .project-visual"),
    ).toHaveCSS("position", "relative");
    await expect(detail).toBeVisible();
    await detail.scrollIntoViewIfNeeded();
    await expectFrameFit(detail);
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth,
      ),
    ).toBe(false);
  });
}
