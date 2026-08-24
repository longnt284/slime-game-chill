# Gameplay, Visual, and Balance Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sửa các lỗi gameplay/UI đã xác minh, nâng cấp hiệu ứng pixel-art và tạo đường cong combat/progression hợp lý từ màn 1 đến màn 100.

**Architecture:** Tách toàn bộ công thức cân bằng và lựa chọn nâng cấp thành các hàm thuần có test, sau đó để `Engine` tiêu thụ các hàm này. Giữ Canvas 2D hiện tại, bổ sung các collection hiệu ứng có giới hạn và tổ chức lại HUD bằng layout responsive theo desktop/touch.

**Tech Stack:** React 18, TypeScript 5.7, Vite 6, Canvas 2D, Tailwind CSS 4, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-08-24-gameplay-visual-balance-upgrade-design.md`

## Global Constraints

- Giữ phong cách pixel-art hiện tại và không thêm image asset hoặc dịch vụ ngoài.
- Mục tiêu ít nhất 60 FPS ở desktop 1440 × 900 và mobile 390 × 844.
- Mọi collection hiệu ứng mới phải có hard cap và được dọn khi đổi lượt/màn.
- Sát thương quái thường màn 100 không vượt 82; boss không vượt 118; tốc độ quái không vượt 138.
- Wave quota tối đa 54; level dự kiến ở màn 100 nằm trong khoảng 115–135 khi nhặt XP tốt.
- Sau khi tối đa cây nâng cấp, mỗi level-up vẫn phải đưa ba lựa chọn hữu ích.
- Không tự merge PR.

## File Structure

- Create `src/game/balance.ts`: các hàm thuần cho stage curve, skill tuning và reward.
- Create `src/game/balance.test.ts`: kiểm tra mốc và invariant của màn 1–100.
- Create `src/game/progression.ts`: tạo lựa chọn skill/passive/evolution/mastery bằng RNG được truyền vào.
- Create `src/game/progression.test.ts`: kiểm tra lựa chọn đầu game, tiến hóa và late-game mastery.
- Modify `src/game/data.ts`: bổ sung kiểu mastery và chuyển các export balance sang module mới.
- Modify `src/game/engine.ts`: dùng balance/progression mới, sửa core/reset và thêm trạng thái FX/telegraph.
- Modify `src/game/shop.ts`: chuẩn hóa save bằng hàm thuần.
- Create `src/game/shop.test.ts`: regression test save hỏng và loadout trái phép.
- Modify `src/App.tsx`: ổn định callback input và thêm class root có ý nghĩa cho smoke test.
- Modify `src/ui/screens.tsx`: HUD responsive, mastery card và bỏ điều khiển touch trùng.
- Modify `src/index.css`: token/layout responsive và polish hiệu ứng UI.
- Create `playwright.config.ts`: chạy Vite và smoke test trên desktop/mobile.
- Create `tests/e2e/game.spec.ts`: kiểm tra menu, shop, start, pause và HUD không chồng.
- Modify `package.json` and `package-lock.json`: thêm test scripts/dev tools, bỏ dependency runtime không sử dụng.

---

### Task 1: Test Harness and Dependency Cleanup

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `vitest.config.ts`
- Create: `src/test/smoke.test.ts`

**Interfaces:**
- Consumes: Vite TypeScript configuration hiện tại.
- Produces: `npm run test:run`, `npm run test:e2e`, và Vitest environment `node`.

- [ ] **Step 1: Add a failing smoke test**

```ts
import { describe, expect, it } from "vitest";
import { TOTAL_STAGES } from "../game/data";

describe("game configuration", () => {
  it("ships the complete 100-stage campaign", () => {
    expect(TOTAL_STAGES).toBe(100);
  });
});
```

- [ ] **Step 2: Run the missing test command and verify RED**

Run: `npm run test:run`

Expected: FAIL because `test:run`/Vitest is not configured.

- [ ] **Step 3: Install only required runtime and test dependencies**

Run:

```bash
npm uninstall @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities @supabase/supabase-js canvas-confetti date-fns framer-motion lucide-react react-router-dom recharts uuid
npm install --save-dev vitest @playwright/test
```

Set package scripts to:

```json
{
  "test": "vitest",
  "test:run": "vitest run",
  "test:e2e": "playwright test"
}
```

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
```

- [ ] **Step 4: Verify GREEN and dependency health**

Run: `npm run test:run && npm run typecheck && npm audit --omit=dev`

Expected: smoke test PASS, typecheck exit 0, production audit reports 0 vulnerabilities.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json vitest.config.ts src/test/smoke.test.ts
git commit -m "test: add game test harness"
```

---

### Task 2: Data-Driven Stage Balance

**Files:**
- Create: `src/game/balance.ts`
- Create: `src/game/balance.test.ts`
- Modify: `src/game/data.ts`

**Interfaces:**
- Produces: `xpNeed(level)`, `mobHp(stage, wave)`, `mobDmg(stage)`, `mobSpeed(stage)`, `gemValue(stage)`, `waveQuota(stage, wave)`, `bossStats(stage, king)`, `bossReward(stage)`, và `projectedLevelAtStage(stage)`.
- Consumes: chỉ number primitives; module không đọc DOM hoặc engine state.

- [ ] **Step 1: Write failing boundary tests with literal expectations**

```ts
import { describe, expect, it } from "vitest";
import {
  bossReward,
  bossStats,
  mobDmg,
  mobHp,
  mobSpeed,
  projectedLevelAtStage,
  waveQuota,
} from "./balance";

describe("stage balance", () => {
  it("keeps late-game incoming damage survivable", () => {
    expect(mobDmg(1)).toBe(6);
    expect(mobDmg(100)).toBe(82);
    expect(bossStats(100, true).dmg).toBe(118);
  });

  it("caps chase speed and wave quota at the design limits", () => {
    expect(mobSpeed(100)).toBe(138);
    expect(waveQuota(100, 3)).toBe(54);
  });

  it("grows health monotonically across the full campaign", () => {
    let previous = mobHp(1, 1);
    for (let stage = 2; stage <= 100; stage += 1) {
      const current = mobHp(stage, 1);
      expect(current).toBeGreaterThan(previous);
      previous = current;
    }
  });

  it("lands a high-collection run inside the target level window", () => {
    expect(projectedLevelAtStage(100)).toBeGreaterThanOrEqual(115);
    expect(projectedLevelAtStage(100)).toBeLessThanOrEqual(135);
  });

  it("awards exactly one guaranteed evolution core per boss", () => {
    expect(bossReward(1)).toEqual({ gold: 114, cores: 1 });
    expect(bossReward(100)).toEqual({ gold: 510, cores: 1 });
  });
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm run test:run -- src/game/balance.test.ts`

Expected: FAIL because `balance.ts` does not exist.

- [ ] **Step 3: Implement the pure balance functions**

```ts
const clampStage = (stage: number) => Math.max(1, Math.min(100, Math.floor(stage)));

export const xpNeed = (level: number) =>
  Math.floor(10 + level * 6 + 1.7 * Math.pow(level, 1.55));

export const mobHp = (stage: number, wave: number) => {
  const s = clampStage(stage);
  const base = 8 + s * 3.4 + Math.pow(s, 1.18) * 0.65;
  return Math.floor(base * (1 + (Math.max(1, wave) - 1) * 0.13));
};

export const mobDmg = (stage: number) => {
  const s = clampStage(stage);
  return Math.floor(6 + s * 0.62 + s * s * 0.0014);
};

export const mobSpeed = (stage: number) =>
  62 + Math.min(76, clampStage(stage) * 0.76);

export const gemValue = (stage: number) =>
  1 + Math.floor(clampStage(stage) / 5);

export const waveQuota = (stage: number, wave: number) =>
  Math.min(12 + Math.floor(clampStage(stage) * 1.15) + Math.max(1, wave) * 3, 54);

export function bossStats(stage: number, king: boolean) {
  const s = clampStage(stage);
  return {
    hp: Math.floor(300 * s * (1 + s * 0.03) * (king ? 1.65 : 1)),
    dmg: Math.floor((10 + s * 0.72 + s * s * 0.0036) * (king ? 1 : 0.94)),
    speed: 52 + Math.min(52, s * 0.62) + (king ? 8 : 0),
  };
}

export const bossReward = (stage: number) => ({
  gold: 110 + clampStage(stage) * 4,
  cores: 1,
});
```

Implement `projectedLevelAtStage` using the same public formulas, three wave quotas per stage, 32 boss-gem equivalents per stage, and a literal 100% pickup assumption. Move the old exports out of `data.ts` and re-export the new functions from `balance.ts` only where compatibility is needed.

- [ ] **Step 4: Verify GREEN and inspect the curve table**

Run: `npm run test:run -- src/game/balance.test.ts`

Then run a one-off table for stages `1, 10, 20, 50, 75, 100` and confirm all design limits from the spec.

- [ ] **Step 5: Commit**

```bash
git add src/game/balance.ts src/game/balance.test.ts src/game/data.ts
git commit -m "feat: rebalance the 100-stage campaign"
```

---

### Task 3: Late-Game Mastery and Deterministic Choices

**Files:**
- Modify: `src/game/data.ts`
- Create: `src/game/progression.ts`
- Create: `src/game/progression.test.ts`

**Interfaces:**
- Produces: `MasteryId`, `MASTERY_DEFS`, `ProgressionState`, `rollChoices(state, rng)`, `applyChoice(state, choice)`.
- Consumes: `Choice`, `SkillId`, `PassiveId`, `SKILLS`, `PASSIVES`.

- [ ] **Step 1: Write failing choice-contract tests**

```ts
import { describe, expect, it } from "vitest";
import { createInitialProgression, rollChoices } from "./progression";

describe("upgrade choices", () => {
  it("offers three distinct choices at the start of a run", () => {
    const state = createInitialProgression();
    expect(state.masteries).toEqual({ force: 0, vitality: 0, swiftness: 0, vacuum: 0 });
    const choices = rollChoices(state, () => 0.25);
    expect(choices).toHaveLength(3);
    expect(new Set(choices.map((choice) => `${choice.kind}:${choice.id}`)).size).toBe(3);
  });

  it("offers evolution before ordinary upgrades when a core is available", () => {
    const state = createInitialProgression();
    state.skills.bolt.lv = 5;
    state.cores = 1;
    expect(rollChoices(state, () => 0)[0]).toMatchObject({ kind: "evolve", id: "bolt" });
  });

  it("offers three masteries after the finite tree is complete", () => {
    const state = createInitialProgression();
    Object.values(state.skills).forEach((skill) => Object.assign(skill, { lv: 8, evolved: true }));
    Object.keys(state.passives).forEach((id) => { state.passives[id as keyof typeof state.passives] = 5; });
    const choices = rollChoices(state, () => 0.4);
    expect(choices).toHaveLength(3);
    expect(choices.every((choice) => choice.kind === "mastery")).toBe(true);
  });
});
```

- [ ] **Step 2: Run focused tests and verify RED**

Run: `npm run test:run -- src/game/progression.test.ts`

Expected: FAIL because the progression module and mastery choice kind do not exist.

- [ ] **Step 3: Add mastery types and deterministic selection**

Extend `Choice["kind"]` with `"mastery"`. Add:

```ts
export type MasteryId = "force" | "vitality" | "swiftness" | "vacuum";

export const MASTERY_DEFS = [
  { id: "force", name: "Uy Lực", icon: "power", desc: "+3% sát thương", max: 30 },
  { id: "vitality", name: "Sinh Lực", icon: "heart", desc: "+6 máu tối đa và hồi 6", max: 30 },
  { id: "swiftness", name: "Thân Pháp", icon: "speed", desc: "+1% tốc độ", max: 30 },
  { id: "vacuum", name: "Hấp Lực", icon: "magnet", desc: "+6% phạm vi nhặt", max: 30 },
] as const;
```

`rollChoices` must:

1. Add eligible evolutions first.
2. Add weighted finite upgrades without duplicate `kind:id` pairs.
3. Fill remaining slots from non-maxed mastery choices.
4. Return exactly three choices while at least three mastery tracks remain eligible.

- [ ] **Step 4: Verify GREEN**

Run: `npm run test:run -- src/game/progression.test.ts`

Expected: all progression tests PASS with no mocks.

- [ ] **Step 5: Commit**

```bash
git add src/game/data.ts src/game/progression.ts src/game/progression.test.ts
git commit -m "feat: add late-game mastery progression"
```

---

### Task 4: Save Normalization

**Files:**
- Modify: `src/game/shop.ts`
- Create: `src/game/shop.test.ts`

**Interfaces:**
- Produces: `normalizeSave(value: unknown): SaveData`.
- Consumes: `HERO_SKINS`, `WEAPON_SKINS`, default IDs `farmer_0` and `w0`.

- [ ] **Step 1: Write failing malformed-save tests**

```ts
import { describe, expect, it } from "vitest";
import { normalizeSave } from "./shop";

describe("save normalization", () => {
  it("removes invalid and duplicate ownership entries", () => {
    expect(normalizeSave({
      gold: -50,
      heroOwned: ["farmer_0", "farmer_0", "missing"],
      weaponOwned: ["w0", "missing", "w0"],
      hero: "missing",
      weapon: "missing",
    })).toEqual({
      gold: 0,
      heroOwned: ["farmer_0"],
      weaponOwned: ["w0"],
      hero: "farmer_0",
      weapon: "w0",
    });
  });

  it("does not equip a valid skin that is not owned", () => {
    expect(normalizeSave({ heroOwned: ["farmer_0"], hero: "knight_0" }).hero).toBe("farmer_0");
  });
});
```

- [ ] **Step 2: Run focused tests and verify RED**

Run: `npm run test:run -- src/game/shop.test.ts`

Expected: FAIL because `normalizeSave` is not exported.

- [ ] **Step 3: Implement normalization and route `loadSave` through it**

```ts
export function normalizeSave(value: unknown): SaveData {
  const input = value && typeof value === "object" ? value as Partial<SaveData> : {};
  const heroIds = new Set(HERO_SKINS.map((skin) => skin.id));
  const weaponIds = new Set(WEAPON_SKINS.map((skin) => skin.id));
  const heroOwned = [...new Set(["farmer_0", ...(Array.isArray(input.heroOwned) ? input.heroOwned : [])])]
    .filter((id): id is string => typeof id === "string" && heroIds.has(id));
  const weaponOwned = [...new Set(["w0", ...(Array.isArray(input.weaponOwned) ? input.weaponOwned : [])])]
    .filter((id): id is string => typeof id === "string" && weaponIds.has(id));
  const hero = typeof input.hero === "string" && heroOwned.includes(input.hero) ? input.hero : "farmer_0";
  const weapon = typeof input.weapon === "string" && weaponOwned.includes(input.weapon) ? input.weapon : "w0";
  return {
    gold: Number.isFinite(input.gold) ? Math.max(0, Math.floor(input.gold as number)) : 100,
    heroOwned,
    weaponOwned,
    hero,
    weapon,
  };
}
```

- [ ] **Step 4: Verify GREEN**

Run: `npm run test:run -- src/game/shop.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/game/shop.ts src/game/shop.test.ts
git commit -m "fix: normalize persisted game saves"
```

---

### Task 5: Engine Integration and Combat Regression Fixes

**Files:**
- Modify: `src/game/engine.ts`
- Modify: `src/game/progression.test.ts`
- Modify: `src/game/balance.test.ts`

**Interfaces:**
- Consumes: all public functions from `balance.ts` and `progression.ts`.
- Produces: unchanged public `Engine` API; `HudSkill`/`HudData` remain compatible except mastery choices flow through `Choice`.

- [ ] **Step 1: Add failing reward and state-reset assertions to pure contracts**

Add these assertions to `balance.test.ts`:

```ts
import { bossProjectileDamage, bossReward } from "./balance";

expect(bossReward(37).cores).toBe(1);
expect(bossProjectileDamage(100, true)).toBe(59);
```

- [ ] **Step 2: Verify RED against the not-yet-integrated engine helpers**

Run: `npm run test:run -- src/game/balance.test.ts src/game/progression.test.ts`

Expected: FAIL because `bossProjectileDamage` does not exist yet.

- [ ] **Step 3: Integrate one source of truth**

In `Engine.start()` reset:

```ts
this.cds = { bolt: 0, orbit: 0, aura: 0, zap: 0, boom: 0, frost: 0 };
this.regenAcc = 0;
this.orbitT = 0;
this.orbitPts = [];
this.keys.clear();
this.hudT = 0;
this.masteries = { force: 0, vitality: 0, swiftness: 0, vacuum: 0 };
```

Replace inline progression selection with `rollChoices`. Handle mastery choices:

```ts
case "mastery":
  this.masteries[c.id as MasteryId] += 1;
  if (c.id === "vitality") {
    this.maxHp += 6;
    this.hp = Math.min(this.maxHp, this.hp + 6);
  }
  break;
```

Update derived stats so force, swiftness and vacuum contribute their documented percentages. Replace boss kill reward with:

```ts
const reward = bossReward(this.stage);
this.goldRun += reward.gold;
this.cores += reward.cores;
```

Remove the boss core pickup. Use `bossStats` in `makeBoss`; use the exported projectile multiplier in all boss bullet patterns. Keep public Engine methods unchanged.

- [ ] **Step 4: Verify GREEN plus TypeScript**

Run: `npm run test:run && npm run typecheck`

Expected: all unit tests PASS and TypeScript exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/game/engine.ts src/game/balance.test.ts src/game/progression.test.ts
git commit -m "fix: integrate stable combat progression"
```

---

### Task 6: Responsive HUD and Stable Touch Input

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/ui/screens.tsx`
- Modify: `src/index.css`
- Create: `playwright.config.ts`
- Create: `tests/e2e/game.spec.ts`

**Interfaces:**
- Produces: stable `onMove`, `onPause`, `onMute`; semantic selectors `[data-hud="health"]`, `[data-hud="progress"]`, `[data-hud="stats"]`.
- Consumes: existing `HudData` and Engine public methods.

- [ ] **Step 1: Write failing desktop/mobile overlap tests**

```ts
import { expect, test } from "@playwright/test";

for (const project of ["desktop", "mobile"]) {
  test.describe(project, () => {
    test.use(project === "mobile"
      ? { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }
      : { viewport: { width: 1440, height: 900 } });

    test("starts and keeps primary HUD regions separate", async ({ page }) => {
      await page.goto("/");
      await page.getByRole("button", { name: "BẮT ĐẦU" }).click();
      const boxes = await Promise.all(["health", "progress", "stats"].map(async (name) =>
        page.locator(`[data-hud="${name}"]`).boundingBox()));
      expect(boxes.every(Boolean)).toBe(true);
      const overlap = (a: NonNullable<typeof boxes[0]>, b: NonNullable<typeof boxes[0]>) =>
        a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
      expect(overlap(boxes[0]!, boxes[1]!)).toBe(false);
      expect(overlap(boxes[1]!, boxes[2]!)).toBe(false);
    });
  });
}
```

Add the projectile helper to `balance.ts`:

```ts
export const bossProjectileDamage = (stage: number, king: boolean) =>
  Math.floor(bossStats(stage, king).dmg * 0.5);
```

Configure Playwright `webServer.command` as `npm run dev -- --host 127.0.0.1`, port `3000`, and base URL `http://127.0.0.1:3000`.

- [ ] **Step 2: Run the mobile test and verify RED**

Run: `npm run test:e2e -- --project=chromium --grep "primary HUD"`

Expected: FAIL because selectors do not exist and the current mobile HUD regions overlap.

- [ ] **Step 3: Stabilize callbacks and redesign the touch HUD**

Use `useCallback` in `App.tsx` for move/pause/mute handlers. In `TouchControls`, keep the unmount reset through a ref so a callback identity change cannot end movement:

```ts
const onMoveRef = useRef(onMove);
onMoveRef.current = onMove;
useEffect(() => () => onMoveRef.current(0, 0), []);
```

For touch layout:

- Health block: top 12px, left 12px, width `calc(100vw - 96px)`.
- Stage block: second row below health.
- Wave/boss block: third row, full safe width.
- Stats: compact strip aligned below stage without intersecting progress.
- Skill chips: begin below HUD stack.
- Keep the bottom mute button and hide the duplicate HUD mute button on touch.

Add `env(safe-area-inset-*)` padding for notched devices and extend `TAG_STYLE` with mastery styling.

- [ ] **Step 4: Verify GREEN on both viewports**

Run: `npm run test:e2e -- --project=chromium --grep "primary HUD"`

Expected: desktop and mobile assertions PASS.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/ui/screens.tsx src/index.css playwright.config.ts tests/e2e/game.spec.ts
git commit -m "fix: make touch controls and HUD responsive"
```

---

### Task 7: Combat Visuals and Boss Telegraphs

**Files:**
- Create: `src/game/visuals.ts`
- Create: `src/game/visuals.test.ts`
- Modify: `src/game/engine.ts`
- Modify: `src/game/data.ts`
- Modify: `src/index.css`
- Modify: `tests/e2e/game.spec.ts`

**Interfaces:**
- Produces: `capFx(items, limit)`, `telegraphAlpha(life, maxLife)`, capped `trails` and `telegraphs` collections, biome background accents, observable canvas activity during combat.
- Consumes: weapon/biome colors and existing draw/update loop.

- [ ] **Step 1: Add failing visual-state tests and a runtime smoke contract**

Create `src/game/visuals.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { capFx, telegraphAlpha } from "./visuals";

describe("combat visual state", () => {
  it("keeps only the newest effects within the hard cap", () => {
    expect(capFx([1, 2, 3, 4], 2)).toEqual([3, 4]);
  });

  it("pulses telegraphs without exceeding readable opacity", () => {
    expect(telegraphAlpha(1, 1)).toBe(0);
    expect(telegraphAlpha(0.5, 1)).toBeCloseTo(0.72, 2);
    expect(telegraphAlpha(0, 1)).toBe(0);
  });
});
```

Add an e2e test that starts the game, waits for combat, samples the canvas twice 500 ms apart, and asserts both data URLs differ. Also listen for `pageerror` and failed same-origin responses; the test must finish with empty error arrays.

```ts
test("animates combat without runtime errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.getByRole("button", { name: "BẮT ĐẦU" }).click();
  const canvas = page.locator("canvas").first();
  const first = await canvas.evaluate((node) => (node as HTMLCanvasElement).toDataURL());
  await page.waitForTimeout(500);
  const second = await canvas.evaluate((node) => (node as HTMLCanvasElement).toDataURL());
  expect(second).not.toBe(first);
  expect(errors).toEqual([]);
});
```

- [ ] **Step 2: Run focused tests and verify RED**

Run: `npm run test:run -- src/game/visuals.test.ts`

Expected: FAIL because `visuals.ts` does not exist.

- [ ] **Step 3: Implement pure helpers and capped visual layers**

Create `src/game/visuals.ts`:

```ts
export function capFx<T>(items: T[], limit: number): T[] {
  return items.length <= limit ? items : items.slice(items.length - limit);
}

export function telegraphAlpha(life: number, maxLife: number): number {
  if (maxLife <= 0 || life <= 0 || life >= maxLife) return 0;
  return Math.sin((life / maxLife) * Math.PI) * 0.72;
}
```

Add types:

```ts
interface Trail { x: number; y: number; life: number; maxLife: number; size: number; color: string; }
interface Telegraph { x: number; y: number; radius: number; life: number; maxLife: number; color: string; kind: "charge" | "burst" | "slam"; }
```

Rules:

- `trails` hard cap 180; `telegraphs` hard cap 24.
- Update/filter both in `updateFx`; clear both in `clearFx`.
- Add bolt/boomerang trails at a frame-rate-independent probability using `dt`.
- Add two-color hit sparks in `damageEnemy` and layered death burst in `killEnemy`.
- Spawn charge, radial-shot and slam telegraphs when boss states enter their warning phase.
- Draw background patches after tiles; draw trail before projectiles; draw telegraphs before entities; draw hit particles after entities.
- Draw sét glow with thick colored stroke first, then thin white stroke.
- Reduce low-health vignette maximum alpha from the current value to at most `0.14`.

- [ ] **Step 4: Verify GREEN and inspect screenshots**

Run:

```bash
npm run test:run -- src/game/visuals.test.ts
npm run test:e2e -- --project=chromium --grep "animates combat"
```

Capture desktop/mobile screenshots after 5 seconds of combat and inspect sprite readability, HUD separation, trails, telegraphs, and vignette intensity.

- [ ] **Step 5: Commit**

```bash
git add src/game/visuals.ts src/game/visuals.test.ts src/game/engine.ts src/game/data.ts src/index.css tests/e2e/game.spec.ts
git commit -m "feat: enrich combat effects and boss telegraphs"
```

---

### Task 8: Full Verification, Documentation, and Pull Request

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: completed implementation and all verification scripts.
- Produces: reviewable pushed branch and GitHub pull request into `main`.

- [ ] **Step 1: Update README with controls and test commands**

Document:

```md
## Chạy local

`npm ci` rồi `npm run dev`.

## Kiểm tra

- `npm run test:run`
- `npm run typecheck`
- `npm run build`
- `npm run test:e2e`
```

- [ ] **Step 2: Run fresh full verification**

Run in this order:

```bash
npm run test:run
npm run typecheck
npm run build
npm run test:e2e
npm audit --omit=dev
git diff --check
```

Expected: all commands exit 0, all tests pass, production audit reports 0 vulnerabilities, and Git reports no whitespace errors.

- [ ] **Step 3: Review requirements and repository diff**

Check each spec criterion against an implementation/test. Run:

```bash
git status --short
git diff --stat main...HEAD
git diff main...HEAD
```

Confirm no generated screenshots, `dist`, browser binaries, secrets, or unrelated files are staged.

- [ ] **Step 4: Commit documentation and any verified root-cause fixes**

```bash
git add README.md
git commit -m "docs: document game verification workflow"
```

- [ ] **Step 5: Push and create the PR**

```bash
git push -u origin codex/gameplay-visual-balance-upgrade
gh pr create --base main --head codex/gameplay-visual-balance-upgrade --title "Nâng cấp gameplay, đồ họa và cân bằng 100 màn" --body-file .github/pr-body.md
```

PR body must include:

- Bug fixes with root causes.
- Visual/effect changes.
- Balance targets and milestone values.
- Exact output summaries for unit tests, typecheck, build, e2e and audit.
- Desktop/mobile before-and-after screenshots if repository policy permits attaching them; otherwise describe where they were inspected locally.
