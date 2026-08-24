export const MAX_STAGE = 100;

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

export const gemValue = (stage: number) =>
  1 + Math.floor(stageValue(stage) / 5);

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

export function projectedLevelAtStage(targetStage: number): number {
  const lastStage = stageValue(targetStage);
  let level = 1;
  let xp = 0;

  for (let stage = 1; stage <= lastStage; stage += 1) {
    const waveEnemies = waveQuota(stage, 1) + waveQuota(stage, 2) + waveQuota(stage, 3);
    const bossGemEquivalents = 32;
    xp += (waveEnemies + bossGemEquivalents) * gemValue(stage);
    while (xp >= xpNeed(level)) {
      xp -= xpNeed(level);
      level += 1;
    }
  }

  return level;
}
