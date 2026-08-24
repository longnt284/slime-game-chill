import { describe, expect, it } from "vitest";
import {
  MAX_SKILL_TIER,
  SHARD_NEED,
  bossAttackTiming,
  bossReward,
  bossProjectileDamage,
  bossStats,
  enemySpeed,
  enemyXp,
  projectedMaxBuildDps,
  mobDmg,
  mobHp,
  mobSpeed,
  projectedLevelAtStage,
  shardNeed,
  skillTuning,
  waveQuota,
} from "./balance";
import type { CombatSkillId } from "./balance";
import { HERO_SKINS, UPGRADES, addStats, upgradeStats } from "./shop";

describe("stage balance", () => {
  it("keeps late-game incoming damage survivable", () => {
    expect(mobDmg(1)).toBe(6);
    expect(mobDmg(100)).toBe(82);
    expect(bossStats(100, true).dmg).toBe(118);
  });

  it("caps chase speed and wave quota at the design limits", () => {
    expect(mobSpeed(100)).toBe(138);
    expect(enemySpeed(100, false, 1.12)).toBe(138);
    expect(enemySpeed(100, true, 1.12)).toBeLessThanOrEqual(138);
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
    expect(enemyXp(100, false, false)).toBe(21);
    expect(enemyXp(100, true, false)).toBe(126);
    expect(enemyXp(100, true, true)).toBe(0);
  });

  it.each([1, 10, 20, 50, 75, 100])("keeps milestone %i inside campaign constraints", (stage) => {
    expect(mobHp(stage, 1)).toBeGreaterThan(0);
    expect(mobDmg(stage)).toBeLessThanOrEqual(82);
    expect(enemySpeed(stage, false, 1.12)).toBeLessThanOrEqual(138);
    expect(waveQuota(stage, 3)).toBeLessThanOrEqual(54);
    expect(bossStats(stage, stage % 10 === 0).hp).toBeGreaterThan(mobHp(stage, 3));
  });

  it("centralizes skill output and keeps the final boss in a readable fight window", () => {
    expect(skillTuning("bolt", 1, false)).toMatchObject({ damage: 11, cooldown: 0.8, count: 1, radius: 8 });
    const frost = skillTuning("frost", MAX_SKILL_TIER, true);
    expect(frost).toMatchObject({ count: 9, maxTargets: 42 });
    expect(frost.damage).toBeCloseTo(90.2, 8);
    expect(frost.cooldown).toBeCloseTo(0.92, 8);
    expect(bossAttackTiming(100, true, 1)).toEqual({ cooldown: 1.2, warning: 0.55, pulse: 0 });

    const lateDps = projectedMaxBuildDps(2.6, Math.pow(0.92, 5));
    const finalBossSeconds = bossStats(100, true).hp / lateDps;
    expect(finalBossSeconds).toBeGreaterThan(25);
    expect(finalBossSeconds).toBeLessThan(45);
  });
});

describe("weapon tiers", () => {
  const ids: CombatSkillId[] = ["bolt", "orbit", "aura", "zap", "boom", "frost"];

  it("caps every weapon at six tiers and clamps anything outside that range", () => {
    expect(MAX_SKILL_TIER).toBe(6);
    for (const id of ids) {
      expect(skillTuning(id, 7, false)).toEqual(skillTuning(id, MAX_SKILL_TIER, false));
      expect(skillTuning(id, 0, false)).toEqual(skillTuning(id, 1, false));
      expect(skillTuning(id, Number.NaN, false)).toEqual(skillTuning(id, 1, false));
    }
  });

  it("makes each tier hit harder, reach wider and never shrink its coverage", () => {
    for (const id of ids) {
      for (let tier = 2; tier <= MAX_SKILL_TIER; tier += 1) {
        const previous = skillTuning(id, tier - 1, false);
        const current = skillTuning(id, tier, false);
        expect(current.damage).toBeGreaterThan(previous.damage);
        expect(current.cooldown).toBeLessThanOrEqual(previous.cooldown);
        expect(current.radius).toBeGreaterThanOrEqual(previous.radius);
        expect(current.arc).toBeGreaterThanOrEqual(previous.arc);
        expect(current.count).toBeGreaterThanOrEqual(previous.count);
        expect(current.maxTargets).toBeGreaterThanOrEqual(previous.maxTargets);
        expect(current.fx).toBeGreaterThan(previous.fx);
      }
    }
  });

  it("opens the sword and aura sweep from 180 degrees at tier 1 to a full circle at tier 2", () => {
    for (const id of ["orbit", "aura"] as CombatSkillId[]) {
      expect(skillTuning(id, 1, false).arc).toBeCloseTo(Math.PI, 8);
      for (let tier = 2; tier <= MAX_SKILL_TIER; tier += 1) {
        expect(skillTuning(id, tier, false).arc).toBeCloseTo(Math.PI * 2, 8);
      }
    }
  });

  it("widens the projectile fans without ever exceeding a full circle", () => {
    for (const id of ["bolt", "boom"] as CombatSkillId[]) {
      expect(skillTuning(id, MAX_SKILL_TIER, false).arc).toBeLessThan(Math.PI);
      expect(skillTuning(id, MAX_SKILL_TIER, true).arc).toBeLessThanOrEqual(Math.PI * 2);
    }
  });

  it("lets evolution beat the plain top tier on every weapon", () => {
    for (const id of ids) {
      const top = skillTuning(id, MAX_SKILL_TIER, false);
      const evolved = skillTuning(id, MAX_SKILL_TIER, true);
      expect(evolved.damage).toBeGreaterThan(top.damage);
      expect(evolved.radius).toBeGreaterThanOrEqual(top.radius);
      expect(evolved.count).toBeGreaterThanOrEqual(top.count);
      expect(evolved.pierce).toBe(99);
    }
  });

  it("asks for more shards at every tier and nothing at all once maxed", () => {
    expect(SHARD_NEED).toHaveLength(MAX_SKILL_TIER - 1);
    for (let tier = 2; tier < MAX_SKILL_TIER; tier += 1) {
      expect(shardNeed(tier)).toBeGreaterThan(shardNeed(tier - 1));
    }
    expect(shardNeed(MAX_SKILL_TIER)).toBe(0);
    expect(shardNeed(99)).toBe(0);
  });
});

describe("permanent buffs against the campaign", () => {
  const maxedBoard = Object.fromEntries(UPGRADES.map((def) => [def.id, def.max]));
  const legendary = HERO_SKINS.find((skin) => skin.tier === 3)!;
  const fullMeta = addStats(legendary.stats, upgradeStats(maxedBoard));

  const secondsToKillFinalBoss = (meta: { power: number; haste: number }) => {
    const power = 2.6 * (1 + meta.power);
    const cooldownMultiplier = Math.pow(0.92, 5) * (1 - meta.haste);
    return bossStats(100, true).hp / projectedMaxBuildDps(power, cooldownMultiplier);
  };

  it("keeps a fully geared player inside the same boss fight window as a bare one", () => {
    const bare = secondsToKillFinalBoss({ power: 0, haste: 0 });
    const geared = secondsToKillFinalBoss(fullMeta);

    expect(geared).toBeLessThan(bare);
    expect(geared).toBeGreaterThan(25);
    expect(geared).toBeLessThan(45);
  });

  it("caps the whole meta ladder at a deliberately gentle boost", () => {
    // Skin Huyền Thoại cộng bảng nâng cấp kịch cấp vẫn phải là con số khiêm tốn,
    // nếu không người chơi lâu năm sẽ đi xuyên chiến dịch mà không cần build.
    expect(fullMeta.power).toBeLessThanOrEqual(0.25);
    expect(fullMeta.haste).toBeLessThanOrEqual(0.15);
    expect(fullMeta.maxHp).toBeLessThanOrEqual(80);
    expect(fullMeta.speed).toBeLessThanOrEqual(0.15);
  });
});

describe("boss rewards", () => {
  it("awards exactly one guaranteed evolution core per boss", () => {
    expect(bossReward(1)).toEqual({ gold: 114, cores: 1 });
    expect(bossReward(37).cores).toBe(1);
    expect(bossReward(100)).toEqual({ gold: 510, cores: 1 });
  });

  it("keeps final-boss projectile damage below half of upgraded base health", () => {
    expect(bossProjectileDamage(100, true)).toBe(59);
  });
});
