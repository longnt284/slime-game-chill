import { describe, expect, it } from "vitest";
import {
  EMPTY_QUEST_SAVE,
  HERO_SKINS,
  HERO_TIER_STATS,
  UPGRADES,
  WEAPON_SKINS,
  metaStatsOf,
  normalizeSave,
  upgradeCost,
  upgradeStats,
} from "./shop";
import { MOOD_PERIOD, weaponPaletteAt } from "./palette";

const BLANK = {
  gems: 0,
  upgrades: {},
  quests: EMPTY_QUEST_SAVE,
};

describe("save normalization", () => {
  it("removes invalid and duplicate ownership entries", () => {
    expect(normalizeSave({
      gold: -50,
      heroOwned: ["farmer_0", "farmer_0", "missing"],
      weaponOwned: ["w0", "missing", "w0"],
      hero: "missing",
      weapon: "missing",
    })).toEqual({
      ...BLANK,
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

  it("uses defaults when persisted data is not an object", () => {
    expect(normalizeSave("broken")).toEqual({
      ...BLANK,
      gold: 100,
      heroOwned: ["farmer_0"],
      weaponOwned: ["w0"],
      hero: "farmer_0",
      weapon: "w0",
    });
  });

  it("carries an old save forward with the new currencies zeroed out", () => {
    const old = { gold: 900, heroOwned: ["farmer_0", "knight_1"], weaponOwned: ["w0", "w5"], hero: "knight_1", weapon: "w5" };

    const migrated = normalizeSave(old);

    expect(migrated.gold).toBe(900);
    expect(migrated.hero).toBe("knight_1");
    expect(migrated.weaponOwned).toEqual(["w0", "w5"]);
    expect(migrated.gems).toBe(0);
    expect(migrated.upgrades).toEqual({});
    expect(migrated.quests).toEqual(EMPTY_QUEST_SAVE);
  });

  it("clamps upgrade levels and drops unknown tracks", () => {
    const save = normalizeSave({ upgrades: { might: 99, lure: 2, madeUp: 5, vigor: -3 } });

    expect(save.upgrades).toEqual({ might: 5, lure: 2 });
  });

  it("keeps quest progress but throws away broken entries", () => {
    const save = normalizeSave({
      gems: 12.7,
      quests: { day: "2026-08-24", progress: { hunt: 40, bad: -1, worse: "x" }, claimed: ["hunt", "hunt", 7] },
    });

    expect(save.gems).toBe(12);
    expect(save.quests).toEqual({ day: "2026-08-24", progress: { hunt: 40 }, claimed: ["hunt"] });
  });
});

describe("hero skins", () => {
  it("charges more and gives more stats as the tier climbs", () => {
    for (let tier = 1; tier < HERO_TIER_STATS.length; tier += 1) {
      expect(HERO_TIER_STATS[tier].power).toBeGreaterThan(HERO_TIER_STATS[tier - 1].power);
      expect(HERO_TIER_STATS[tier].maxHp).toBeGreaterThan(HERO_TIER_STATS[tier - 1].maxHp);
    }
    expect(HERO_TIER_STATS[0]).toMatchObject({ power: 0, maxHp: 0, speed: 0 });
  });

  it("leaves the free starter skin without any stat edge", () => {
    const starter = HERO_SKINS.find((skin) => skin.id === "farmer_0")!;
    expect(starter.price).toBe(0);
    expect(starter.gemPrice).toBe(0);
    expect(starter.stats).toEqual(HERO_TIER_STATS[0]);
  });

  it("sells legendary skins for gems and everything else for gold", () => {
    for (const skin of HERO_SKINS) {
      if (skin.tier === 3) {
        expect(skin.gemPrice).toBeGreaterThan(0);
        expect(skin.price).toBe(0);
      } else {
        expect(skin.gemPrice).toBe(0);
        // Chỉ skin khởi đầu được miễn phí, còn lại đều phải có giá vàng.
        if (skin.id === "farmer_0") expect(skin.price).toBe(0);
        else expect(skin.price).toBeGreaterThan(0);
      }
    }
  });
});

describe("weapon skins", () => {
  it("ships thirty weapons with unique ids and names", () => {
    expect(WEAPON_SKINS).toHaveLength(30);
    expect(new Set(WEAPON_SKINS.map((skin) => skin.id)).size).toBe(30);
    expect(new Set(WEAPON_SKINS.map((skin) => skin.name)).size).toBe(30);
  });

  it("gives every weapon at least one extra colour to drift into", () => {
    for (const skin of WEAPON_SKINS) {
      expect(skin.moods.length).toBeGreaterThanOrEqual(2);
      const first = skin.moods[0];
      // Các tông sau phải khác tông gốc, nếu không hiệu ứng đứng im một màu.
      for (const mood of skin.moods.slice(1)) {
        expect(mood.bolt).not.toBe(first.bolt);
      }
      expect(skin.mood.length).toBeGreaterThan(0);
    }
  });

  it("actually changes the effect colour as the fight goes on", () => {
    for (const skin of WEAPON_SKINS) {
      const start = weaponPaletteAt(skin.moods, 0);
      const later = weaponPaletteAt(skin.moods, MOOD_PERIOD);
      expect(later.bolt).not.toBe(start.bolt);
    }
  });

  it("puts legendary weapons behind gems and the rest behind gold", () => {
    for (const skin of WEAPON_SKINS) {
      if (skin.tier === 3) expect(skin.gemPrice).toBeGreaterThan(0);
      else expect(skin.gemPrice).toBe(0);
    }
    expect(WEAPON_SKINS.find((skin) => skin.id === "w0")!.price).toBe(0);
  });
});

describe("permanent upgrades", () => {
  it("charges more for each level and nothing once maxed", () => {
    for (const def of UPGRADES) {
      let previous = 0;
      for (let level = 0; level < def.max; level += 1) {
        const cost = upgradeCost(def, level);
        expect(cost).toBeGreaterThan(previous);
        previous = cost;
      }
      expect(upgradeCost(def, def.max)).toBe(0);
      expect(upgradeCost(def, def.max + 10)).toBe(0);
    }
  });

  it("keeps the fully maxed board to a deliberately modest buff", () => {
    const maxed = Object.fromEntries(UPGRADES.map((def) => [def.id, def.max]));

    const stats = upgradeStats(maxed);

    expect(stats.power).toBeCloseTo(0.1, 8);
    expect(stats.maxHp).toBe(40);
    expect(stats.speed).toBeCloseTo(0.075, 8);
    expect(stats.haste).toBeCloseTo(0.075, 8);
    expect(stats.gold).toBeCloseTo(0.25, 8);
  });

  it("ignores levels beyond the cap and unknown ids", () => {
    expect(upgradeStats({ might: 99, nonsense: 4 }).power).toBeCloseTo(0.1, 8);
    expect(upgradeStats({}).power).toBe(0);
  });

  it("adds the equipped skin bonus on top of the upgrade board", () => {
    const legendary = HERO_SKINS.find((skin) => skin.tier === 3)!;
    const save = normalizeSave({
      heroOwned: ["farmer_0", legendary.id],
      hero: legendary.id,
      upgrades: { might: 5 },
    });

    expect(metaStatsOf(save).power).toBeCloseTo(legendary.stats.power + 0.1, 8);
  });
});
