export const MAX_STAGE = 100;
export const MAX_MOB_SPEED = 138;
export const ELITE_RATE = 0.035;
export const ELITE_XP_MULTIPLIER = 6;
export const BOSS_XP_EQUIVALENTS = 32;

export type CombatSkillId = "bolt" | "orbit" | "aura" | "zap" | "boom" | "frost";

export interface SkillTuning {
  damage: number;
  cooldown: number;
  count: number;
  radius: number;
  range: number;
}

const finiteFloor = (value: number, fallback: number) =>
  Number.isFinite(value) ? Math.floor(value) : fallback;

const stageValue = (stage: number) =>
  Math.max(1, Math.min(MAX_STAGE, finiteFloor(stage, 1)));

const waveValue = (wave: number) => Math.max(1, finiteFloor(wave, 1));

export const xpNeed = (level: number) => {
  const lv = Math.max(1, finiteFloor(level, 1));
  return Math.floor(10 + lv * 6 + 1.7 * Math.pow(lv, 1.55));
};

export const mobHp = (stage: number, wave: number) => {
  const s = stageValue(stage);
  const base = 8 + s * 3.4 + Math.pow(s, 1.18) * 0.65;
  return Math.floor(base * (1 + (waveValue(wave) - 1) * 0.13));
};

export const mobDmg = (stage: number) => {
  const s = stageValue(stage);
  return Math.floor(6 + s * 0.62 + s * s * 0.0014);
};

export const mobSpeed = (stage: number) =>
  62 + Math.min(76, stageValue(stage) * 0.76);

export const enemySpeed = (stage: number, elite: boolean, variance: number) =>
  Math.min(
    MAX_MOB_SPEED,
    mobSpeed(stage) * (elite ? 0.85 : 1) * Math.max(0.88, Math.min(1.12, variance)),
  );

export const gemValue = (stage: number) =>
  1 + Math.floor(stageValue(stage) / 5);

export const enemyXp = (stage: number, elite: boolean, duringBoss: boolean) =>
  duringBoss ? 0 : gemValue(stage) * (elite ? ELITE_XP_MULTIPLIER : 1);

export const bossXp = (stage: number) => gemValue(stage) * BOSS_XP_EQUIVALENTS;

export const waveQuota = (stage: number, wave: number) =>
  Math.min(12 + Math.floor(stageValue(stage) * 1.15) + waveValue(wave) * 3, 54);

export interface BossStats {
  hp: number;
  dmg: number;
  speed: number;
}

export function bossStats(stage: number, king: boolean): BossStats {
  const s = stageValue(stage);
  return {
    hp: Math.floor(300 * s * (1 + s * 0.03) * (king ? 1.65 : 1)),
    dmg: Math.floor((10 + s * 0.72 + s * s * 0.0036) * (king ? 1 : 0.94)),
    speed: 52 + Math.min(52, s * 0.62) + (king ? 8 : 0),
  };
}

export const bossProjectileDamage = (stage: number, king: boolean) =>
  Math.floor(bossStats(stage, king).dmg * 0.5);

export const bossReward = (stage: number) => ({
  gold: 110 + stageValue(stage) * 4,
  cores: 1,
});

export function bossAttackTiming(stage: number, king: boolean, arch: number) {
  const cdMul = king ? 0.75 : 1;
  if (arch === 0) return { cooldown: 2.4 * cdMul, warning: 0.5, pulse: 0 };
  if (arch === 1) return { cooldown: Math.max(1.2, 2.4 - stageValue(stage) * 0.008) * cdMul, warning: 0.55, pulse: 0 };
  if (arch === 2) return { cooldown: 2.8 * cdMul, warning: 0, pulse: 0 };
  if (arch === 3) return { cooldown: 0, warning: 0, pulse: 0.13 };
  return { cooldown: 3.4 * cdMul, warning: 0.45, pulse: 0 };
}

export function skillTuning(id: CombatSkillId, level: number, evolved: boolean): SkillTuning {
  const lv = Math.max(1, Math.min(8, finiteFloor(level, 1)));
  switch (id) {
    case "bolt":
      return {
        damage: (8 + lv * 3.5) * (evolved ? 2.6 : 1),
        cooldown: Math.max(0.24, 0.8 - lv * 0.05),
        count: 1 + (lv >= 3 ? 1 : 0) + (lv >= 6 ? 1 : 0) + (evolved ? 2 : 0),
        radius: evolved ? 13 : 8,
        range: 560,
      };
    case "orbit":
      return {
        damage: (7 + lv * 3) * (evolved ? 2.3 : 1),
        cooldown: 0.28,
        count: 2 + (lv >= 3 ? 1 : 0) + (lv >= 5 ? 1 : 0) + (evolved ? 2 : 0),
        radius: 62 + lv * 5 + (evolved ? 26 : 0),
        range: 0,
      };
    case "aura":
      return {
        damage: (6 + lv * 3) * (evolved ? 2.4 : 1),
        cooldown: Math.max(0.45, 1 - lv * 0.05),
        count: 1,
        radius: 85 + lv * 12 + (evolved ? 55 : 0),
        range: 0,
      };
    case "zap":
      return {
        damage: (14 + lv * 6) * (evolved ? 2.2 : 1),
        cooldown: Math.max(0.5, 1.5 - lv * 0.08),
        count: 1 + Math.floor(lv / 2) + (evolved ? 3 : 0),
        radius: 0,
        range: 540,
      };
    case "boom":
      return {
        damage: (12 + lv * 5) * (evolved ? 2.3 : 1),
        cooldown: Math.max(0.7, 1.7 - lv * 0.09),
        count: 1 + (lv >= 4 ? 1 : 0) + (evolved ? 1 : 0),
        radius: evolved ? 22 : 15,
        range: 620,
      };
    case "frost":
      return {
        damage: (10 + lv * 4) * (evolved ? 2.2 : 1),
        cooldown: Math.max(0.6, 1.4 - lv * 0.06),
        count: 1 + Math.floor(lv / 2) + (evolved ? 3 : 0),
        radius: 70 + lv * 6 + (evolved ? 45 : 0),
        range: 600,
      };
  }
}

export function projectedMaxBuildDps(power: number, cooldownMultiplier: number): number {
  const ids: CombatSkillId[] = ["bolt", "orbit", "aura", "zap", "boom", "frost"];
  return ids.reduce((total, id) => {
    const tuning = skillTuning(id, 8, true);
    if (id === "orbit") return total + (tuning.damage * tuning.count * power) / tuning.cooldown;
    const singleTargetCount = id === "zap" || id === "aura" ? 1 : tuning.count;
    return total + (tuning.damage * singleTargetCount * power) / (tuning.cooldown * cooldownMultiplier);
  }, 0);
}

export function projectedLevelAtStage(targetStage: number): number {
  const lastStage = stageValue(targetStage);
  let level = 1;
  let xp = 0;

  for (let stage = 1; stage <= lastStage; stage += 1) {
    const waveEnemies = waveQuota(stage, 1) + waveQuota(stage, 2) + waveQuota(stage, 3);
    const expectedWaveXp = waveEnemies * (
      (1 - ELITE_RATE) * enemyXp(stage, false, false)
      + ELITE_RATE * enemyXp(stage, true, false)
    );
    xp += expectedWaveXp + bossXp(stage);
    while (xp >= xpNeed(level)) {
      xp -= xpNeed(level);
      level += 1;
    }
  }

  return level;
}
