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
    expect(projectedLevelAtStage(100)).toBe(127);
  });

  it("awards exactly one guaranteed evolution core per boss", () => {
    expect(bossReward(1)).toEqual({ gold: 114, cores: 1 });
    expect(bossReward(100)).toEqual({ gold: 510, cores: 1 });
  });
});
