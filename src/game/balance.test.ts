import { describe, expect, it } from "vitest";
import {
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
  skillTuning,
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
    expect(skillTuning("bolt", 1, false)).toMatchObject({ damage: 11.5, cooldown: 0.75, count: 1, radius: 8 });
    const frost = skillTuning("frost", 8, true);
    expect(frost).toMatchObject({ damage: 92.4, count: 8, radius: 163 });
    expect(frost.cooldown).toBeCloseTo(0.92, 8);
    expect(bossAttackTiming(100, true, 1)).toEqual({ cooldown: 1.2, warning: 0.55, pulse: 0 });

    const lateDps = projectedMaxBuildDps(2, Math.pow(0.92, 5));
    const finalBossSeconds = bossStats(100, true).hp / lateDps;
    expect(finalBossSeconds).toBeGreaterThan(12);
    expect(finalBossSeconds).toBeLessThan(45);
  });

  it("awards exactly one guaranteed evolution core per boss", () => {
    expect(bossReward(1)).toEqual({ gold: 114, cores: 1 });
    expect(bossReward(37).cores).toBe(1);
    expect(bossReward(100)).toEqual({ gold: 510, cores: 1 });
  });

  it("keeps final-boss projectile damage below half of upgraded base health", () => {
    expect(bossProjectileDamage(100, true)).toBe(59);
  });
});
