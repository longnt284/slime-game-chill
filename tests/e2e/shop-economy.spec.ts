import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

/** Nạp sẵn một save để không phải cày vàng và kim cương trong test. */
async function seedSave(page: Page, save: Record<string, unknown>) {
  await page.addInitScript((data) => {
    window.localStorage.setItem("tvqv_save_v1", JSON.stringify(data));
  }, save);
}

const RICH = {
  gold: 50_000,
  gems: 500,
  heroOwned: ["farmer_0"],
  weaponOwned: ["w0"],
  hero: "farmer_0",
  weapon: "w0",
  upgrades: {},
  quests: { day: "", progress: {}, claimed: [] },
};

test("shop splits gold and gems across skins, upgrades and quests", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  await seedSave(page, RICH);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page.getByRole("button", { name: "CỬA HÀNG" }).click();

  // Bốn tab đều mở được.
  for (const tab of ["NHÂN VẬT", "VŨ KHÍ", "NÂNG CẤP", "NHIỆM VỤ"]) {
    await page.getByRole("button", { name: new RegExp(`^${tab}`) }).click();
  }

  // Nâng cấp chỉ số trừ đúng vàng và tăng đúng một cấp.
  await page.getByRole("button", { name: /^NÂNG CẤP/ }).click();
  const buyUpgrade = page.getByRole("button", { name: /^260$/ }).first();
  await expect(buyUpgrade).toBeVisible();
  await buyUpgrade.click();
  await expect(page.getByText("1/5").first()).toBeVisible();

  // Skin Huyền Thoại phải trả bằng kim cương chứ không phải vàng.
  await page.getByRole("button", { name: /^VŨ KHÍ/ }).click();
  const legendary = page.locator("div").filter({ hasText: /^Thánh Quang Giáng Thế$/ }).first();
  await expect(legendary).toBeVisible();

  await page.getByRole("button", { name: "ĐÓNG" }).click();
  expect(errors).toEqual([]);
});

test("a finished daily quest pays out gems exactly once", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  // Nhồi tiến độ thật lớn cho mọi mã nhiệm vụ nên bộ nào được rút ra hôm nay cũng đã xong.
  await page.addInitScript(() => {
    const now = new Date();
    const day = `${now.getFullYear()}-${`${now.getMonth() + 1}`.padStart(2, "0")}-${`${now.getDate()}`.padStart(2, "0")}`;
    const ids = ["hunt", "elite", "boss", "clear", "shard", "purse", "endure", "depth", "forge"];
    const progress: Record<string, number> = {};
    for (const id of ids) progress[id] = 99_999;
    window.localStorage.setItem("tvqv_save_v1", JSON.stringify({
      gold: 1000,
      gems: 0,
      heroOwned: ["farmer_0"],
      weaponOwned: ["w0"],
      hero: "farmer_0",
      weapon: "w0",
      upgrades: {},
      quests: { day, progress, claimed: [] },
    }));
  });

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page.getByRole("button", { name: "CỬA HÀNG" }).click();
  await page.getByRole("button", { name: /^NHIỆM VỤ/ }).click();

  const claim = page.getByRole("button", { name: "NHẬN KIM CƯƠNG" });
  await expect(claim.first()).toBeEnabled();
  const claimable = await claim.count();
  expect(claimable).toBe(3);

  await claim.first().click();

  // Nhận xong thì nút chuyển sang đã nhận và số kim cương phải tăng lên.
  await expect(page.getByRole("button", { name: "ĐÃ NHẬN" })).toHaveCount(1);
  const gems = await page.evaluate(() =>
    JSON.parse(window.localStorage.getItem("tvqv_save_v1")!).gems as number);
  expect(gems).toBeGreaterThan(0);

  // Bấm lại nhiệm vụ đã nhận không cộng thêm lần nữa.
  await expect(page.getByRole("button", { name: "ĐÃ NHẬN" })).toBeDisabled();
  const gemsAgain = await page.evaluate(() =>
    JSON.parse(window.localStorage.getItem("tvqv_save_v1")!).gems as number);
  expect(gemsAgain).toBe(gems);

  expect(errors).toEqual([]);
});
