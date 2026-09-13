import { expect, type Locator } from "@playwright/test";

/** Approach the reserved stage, not an SVG that intentionally does not exist yet. */
export async function approachProofScene(figure: Locator) {
  await figure.locator("[data-proof-stage]").scrollIntoViewIfNeeded();
  const scene = figure.locator("[data-proof-scene]:visible");
  await expect(scene).toBeVisible();
  return scene;
}
