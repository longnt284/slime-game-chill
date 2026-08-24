export const MAX_STAGE = 100;
export const MAX_MOB_SPEED = 138;
export const ELITE_RATE = 0.035;
export const ELITE_XP_MULTIPLIER = 6;
export const BOSS_XP_EQUIVALENTS = 32;

export type CombatSkillId = "bolt" | "orbit" | "aura" | "zap" | "boom" | "frost";

/** Vũ khí có 6 bậc; mỗi bậc mạnh hơn về sát thương, độ phủ và số mục tiêu. */
export const MAX_SKILL_TIER = 6;

/** Số mảnh vũ khí cần để lên bậc kế tiếp: bậc 1→2, 2→3, ... 5→6. */
export const SHARD_NEED = [10, 16, 24, 34, 46];

export interface SkillTuning {
  damage: number;
  cooldown: number;
  /** Số đạn / lưỡi kiếm / tảng băng bắn ra mỗi nhịp. */
  count: number;
  /** Bán kính vùng sát thương (đơn vị pixel thế giới). */
  radius: number;
  /** Tầm khóa mục tiêu. */
  range: number;
  /** Độ phủ của chiêu tính bằng radian: PI là quét 180 độ, 2PI là trọn 360 độ. */
  arc: number;
  /** Số kẻ địch tối đa dính đòn trong một nhịp. */
  maxTargets: number;
  /** Số lần xuyên thấu của đạn (99 coi như vô hạn). */
  pierce: number;
  /** Hệ số phóng đại hiệu ứng hình ảnh theo bậc. */
  fx: number;
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
  const campaignHpScale = 1 + Math.max(0, s - 20) * 0.0375;
  const kingHpScale = king ? 1.65 - ((s - 1) / (MAX_STAGE - 1)) * 0.45 : 1;
  return {
    hp: Math.floor(300 * s * (1 + s * 0.03) * campaignHpScale * kingHpScale),
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

const FULL = Math.PI * 2;
const HALF = Math.PI;

/** Bảng chỉ số của từng vũ khí theo 6 bậc, cộng phần thưởng khi tiến hóa. */
interface TierTable {
  damage: number[];
  cooldown: number[];
  count: number[];
  radius: number[];
  range: number[];
  arc: number[];
  maxTargets: number[];
  pierce: number[];
  evo: { damage: number; count: number; radius: number; maxTargets: number };
}

const INFINITE_TARGETS = 99;

const TIER_TABLES: Record<CombatSkillId, TierTable> = {
  // Bùa bay: mỗi bậc thêm một tia và xòe rộng hơn, bậc 6 xuyên vô hạn.
  bolt: {
    damage: [11, 15, 19, 24, 29, 35],
    cooldown: [0.8, 0.72, 0.64, 0.56, 0.48, 0.42],
    count: [1, 2, 2, 3, 4, 5],
    radius: [8, 9, 10, 11, 12, 14],
    range: [540, 560, 580, 610, 640, 680],
    arc: [0.16, 0.3, 0.44, 0.6, 0.78, 1],
    maxTargets: Array(6).fill(INFINITE_TARGETS),
    pierce: [0, 0, 1, 2, 3, 99],
    evo: { damage: 2.5, count: 1, radius: 1.5, maxTargets: 1 },
  },
  // Kiếm hộ mệnh: bậc 1 chỉ quét nửa vòng trước mặt, từ bậc 2 khép kín 360 độ.
  orbit: {
    damage: [9, 12.5, 16, 20, 24, 28],
    cooldown: [0.36, 0.34, 0.32, 0.3, 0.29, 0.28],
    count: [2, 3, 3, 4, 5, 6],
    radius: [62, 72, 82, 94, 108, 124],
    range: [0, 0, 0, 0, 0, 0],
    arc: [HALF, FULL, FULL, FULL, FULL, FULL],
    maxTargets: Array(6).fill(INFINITE_TARGETS),
    pierce: Array(6).fill(99),
    evo: { damage: 2.3, count: 1, radius: 1.21, maxTargets: 1 },
  },
  // Hào quang: cũng quét 180 độ ở bậc 1 rồi mở trọn vòng, phủ và trúng nhiều địch hơn.
  aura: {
    damage: [8, 12, 16, 21, 26, 32],
    cooldown: [0.95, 0.87, 0.79, 0.71, 0.64, 0.58],
    count: [1, 1, 1, 1, 1, 1],
    radius: [86, 102, 120, 140, 162, 188],
    range: [0, 0, 0, 0, 0, 0],
    arc: [HALF, FULL, FULL, FULL, FULL, FULL],
    maxTargets: [4, 6, 9, 13, 18, 26],
    pierce: Array(6).fill(99),
    evo: { damage: 2.4, count: 0, radius: 1.28, maxTargets: 1.6 },
  },
  // Sét: thêm cú sét mỗi bậc, từ bậc 2 mỗi cú nổ lan ra một vùng nhỏ.
  zap: {
    damage: [15, 21, 28, 36, 45, 56],
    cooldown: [1.4, 1.26, 1.14, 1.03, 0.95, 0.88],
    count: [1, 2, 2, 3, 4, 5],
    radius: [0, 22, 32, 44, 56, 70],
    range: [520, 545, 570, 600, 640, 680],
    arc: Array(6).fill(FULL),
    maxTargets: [1, 2, 3, 4, 5, 6],
    pierce: Array(6).fill(99),
    evo: { damage: 2.2, count: 3, radius: 1.35, maxTargets: 1 },
  },
  // Boomerang: bậc càng cao càng ném nhiều lưỡi và xòe rộng thành hình quạt.
  boom: {
    damage: [13, 18, 24, 31, 39, 48],
    cooldown: [1.7, 1.55, 1.4, 1.25, 1.1, 0.98],
    count: [1, 1, 2, 2, 3, 3],
    radius: [15, 17, 20, 23, 27, 32],
    range: [560, 600, 640, 680, 720, 760],
    arc: [0, 0.42, 0.6, 0.78, 0.98, 1.2],
    maxTargets: Array(6).fill(INFINITE_TARGETS),
    pierce: Array(6).fill(99),
    evo: { damage: 2.3, count: 1, radius: 1.4, maxTargets: 1 },
  },
  // Mưa băng: thêm tảng băng và vùng nổ rộng dần, trúng được nhiều mục tiêu hơn.
  frost: {
    damage: [11, 15, 20, 26, 33, 41],
    cooldown: [1.35, 1.24, 1.14, 1.05, 0.98, 0.92],
    count: [2, 3, 4, 5, 6, 7],
    radius: [72, 86, 102, 120, 140, 162],
    range: [560, 585, 610, 645, 680, 720],
    arc: Array(6).fill(FULL),
    maxTargets: [5, 7, 10, 14, 19, 26],
    pierce: Array(6).fill(99),
    evo: { damage: 2.2, count: 2, radius: 1.3, maxTargets: 1.6 },
  },
};

export const skillTier = (level: number) =>
  Math.max(1, Math.min(MAX_SKILL_TIER, finiteFloor(level, 1)));

/** Số mảnh cần để rời khỏi bậc hiện tại; bậc tối đa trả 0 vì không còn gì để lên. */
export const shardNeed = (tier: number) => {
  const t = skillTier(tier);
  return t >= MAX_SKILL_TIER ? 0 : SHARD_NEED[t - 1];
};

export function skillTuning(id: CombatSkillId, level: number, evolved: boolean): SkillTuning {
  const tier = skillTier(level);
  const index = tier - 1;
  const table = TIER_TABLES[id];
  const evo = table.evo;
  const maxTargets = table.maxTargets[index];
  return {
    damage: table.damage[index] * (evolved ? evo.damage : 1),
    cooldown: table.cooldown[index],
    count: table.count[index] + (evolved ? evo.count : 0),
    radius: table.radius[index] * (evolved ? evo.radius : 1),
    range: table.range[index],
    // Tiến hóa mở trọn vòng cho chiêu quét, còn chiêu xòe quạt thì rộng thêm một nửa.
    arc: evolved
      ? (table.arc[index] >= HALF ? FULL : Math.min(FULL, table.arc[index] * 1.5))
      : table.arc[index],
    maxTargets: maxTargets >= INFINITE_TARGETS
      ? INFINITE_TARGETS
      : Math.round(maxTargets * (evolved ? evo.maxTargets : 1)),
    pierce: evolved ? 99 : table.pierce[index],
    fx: 1 + (tier - 1) * 0.18 + (evolved ? 0.4 : 0),
  };
}

export function projectedMaxBuildDps(power: number, cooldownMultiplier: number): number {
  const ids: CombatSkillId[] = ["bolt", "orbit", "aura", "zap", "boom", "frost"];
  return ids.reduce((total, id) => {
    const tuning = skillTuning(id, MAX_SKILL_TIER, true);
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
