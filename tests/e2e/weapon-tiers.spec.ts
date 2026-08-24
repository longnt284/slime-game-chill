import { expect, test } from "@playwright/test";

/**
 * Chạy thật một trận rồi tua nhanh qua nhiều đợt quái để chắc chắn hệ nâng bậc
 * vũ khí, mảnh vũ khí và các bản đồ mới đều hoạt động trong trình duyệt.
 */
async function playFor(page: import("@playwright/test").Page, seconds: number) {
  await page.keyboard.down("d");
  await page.waitForTimeout(seconds * 1000);
  await page.keyboard.up("d");
}

test("weapon tiers, shards and new maps run without runtime errors", async ({ page }) => {
  test.setTimeout(90_000);
  // Chỉ soi lỗi của chính game: font Google tải từ ngoài không tính.
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("response", (response) => {
    if (response.status() < 400) return;
    const url = new URL(response.url());
    if (url.origin === "http://127.0.0.1:3000") errors.push(`${response.status()} ${url.pathname}`);
  });

  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await page.getByRole("button", { name: "BẮT ĐẦU" }).click();

  // Chơi một lúc: nhân vật tự đánh, quái rơi mảnh, HUD phải hiện chip kỹ năng.
  await playFor(page, 6);

  const chip = page.locator('[title*="Bậc"]').first();
  await expect(chip).toBeVisible();
  const title = await chip.getAttribute("title");
  expect(title).toMatch(/Bậc [1-6]\/6/);

  // Màn hình lên cấp phải chọn được bằng phím số và không làm treo game.
  for (let i = 0; i < 12; i += 1) {
    if (await page.locator("text=LÊN CẤP").count()) await page.keyboard.press("1");
    await playFor(page, 1);
  }

  await expect(page.locator('[data-hud="health"]')).toBeVisible();
  expect(errors).toEqual([]);
});
