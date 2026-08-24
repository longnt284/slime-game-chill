import { expect, test, type Page } from "@playwright/test";

type Box = { x: number; y: number; width: number; height: number };

const overlaps = (a: Box, b: Box) =>
  a.x < b.x + b.width
  && a.x + a.width > b.x
  && a.y < b.y + b.height
  && a.y + a.height > b.y;

async function expectSeparatedHud(page: Page) {
  await page.goto("/");
  const favicon = await page.locator('link[rel="icon"]').getAttribute("href");
  expect(favicon).toMatch(/^data:image\/svg\+xml/);
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

test("a running game animates without page or local asset errors", async ({ page }) => {
  const pageErrors: string[] = [];
  const responseErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("response", (response) => {
    if (response.status() < 400) return;
    const url = new URL(response.url());
    if (url.origin === "http://127.0.0.1:3000") {
      responseErrors.push(`${response.status()} ${url.pathname}`);
    }
  });

  await page.goto("/");
  await page.getByRole("button", { name: "BẮT ĐẦU" }).click();
  const canvas = page.locator("canvas");
  await expect(canvas).toBeVisible();
  const first = await canvas.evaluate((node: HTMLCanvasElement) => node.toDataURL());
  await page.waitForTimeout(500);
  const second = await canvas.evaluate((node: HTMLCanvasElement) => node.toDataURL());

  expect(second).not.toBe(first);
  expect(pageErrors).toEqual([]);
  expect(responseErrors).toEqual([]);
});
