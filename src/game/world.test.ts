import { describe, expect, it } from "vitest";
import { BIOMES, TOTAL_STAGES, altBiomeOf, biomeOf, makeBoss } from "./data";
import { MOB_KINDS } from "./sprites";

describe("world maps", () => {
  it("ships more than the original ten maps and ends the campaign in the last one", () => {
    expect(BIOMES.length).toBeGreaterThan(10);
    expect(biomeOf(1)).toBe(BIOMES[0]);
    expect(biomeOf(TOTAL_STAGES)).toBe(BIOMES[BIOMES.length - 1]);
    expect(BIOMES[BIOMES.length - 1].name).toBe("Địa Ngục");
  });

  it("gives every stage a real map and never runs off the end of the list", () => {
    for (let stage = 1; stage <= TOTAL_STAGES; stage += 1) {
      expect(BIOMES).toContain(biomeOf(stage));
    }
    // Save cũ hoặc dữ liệu hỏng vẫn phải trả về bản đồ hợp lệ thay vì undefined.
    expect(BIOMES).toContain(biomeOf(0));
    expect(BIOMES).toContain(biomeOf(TOTAL_STAGES + 50));
    expect(BIOMES).toContain(biomeOf(Number.NaN));
  });

  it("visits every map at least once across the campaign", () => {
    const seen = new Set<string>();
    for (let stage = 1; stage <= TOTAL_STAGES; stage += 1) seen.add(biomeOf(stage).name);
    expect(seen.size).toBe(BIOMES.length);
  });

  it("keeps names, palettes and decors unique and complete for every map", () => {
    const names = BIOMES.map((biome) => biome.name);
    expect(new Set(names).size).toBe(BIOMES.length);
    for (const biome of BIOMES) {
      expect(MOB_KINDS).toContain(biome.mobKind);
      expect(biome.ground).toHaveLength(3);
      expect(biome.bossPalettes).toHaveLength(3);
      expect(biome.decors.length).toBeGreaterThan(0);
    }
  });

  it("always picks a different map as the guest-monster source", () => {
    for (const biome of BIOMES) {
      const alt = altBiomeOf(biome);
      expect(BIOMES).toContain(alt);
      expect(alt).not.toBe(biome);
    }
  });

  it("only ever builds bosses out of monster kinds that have sprites", () => {
    for (let stage = 1; stage <= TOTAL_STAGES; stage += 1) {
      const boss = makeBoss(stage);
      expect(MOB_KINDS).toContain(boss.kind);
      expect(boss.colors).toBeTruthy();
      expect(boss.arch).toBeGreaterThanOrEqual(0);
      expect(boss.arch).toBeLessThan(5);
    }
    expect(makeBoss(TOTAL_STAGES).king).toBe(true);
  });
});
