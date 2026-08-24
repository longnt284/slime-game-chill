import { expect, test, type Page } from "@playwright/test";

type Box = { x: number; y: number; width: number; height: number };

const overlaps = (a: Box, b: Box) =>
  a.x < b.x + b.width
  && a.x + a.width > b.x
  && a.y < b.y + b.height
  && a.y + a.height > b.y;

async function expectSeparatedHud(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "BẮT ĐẦU" }).click();
  const health = await page.locator('[data-hud="health"]').boundingBox();
  const progress = await page.locator('[data-hud="progress"]').boundingBox();
  const stats = await page.locator('[data-hud="stats"]').boundingBox();

  expect(health).not.toBeNull();
  expect(progress).not.toBeNull();
  expect(stats).not.toBeNull();
  expect(overlaps(health!, progress!)).toBe(false);
  expect(overlaps(progress!, stats!)).toBe(false);
  expect(overlaps(health!, stats!)).toBe(false);
}

test("desktop HUD regions stay separate", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await expectSeparatedHud(page);
});

test("mobile HUD regions stay separate", async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  await expectSeparatedHud(page);
  await context.close();
});
