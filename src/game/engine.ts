import { sfx } from "./audio";
import { getHeroSprite, getMobSprite, getItemSprite, getShardSprite } from "./sprites";
import type { MobColors, MobKind } from "./sprites";
import { EMPTY_STATS, HERO_SKINS, WEAPON_SKINS } from "./shop";
import type { HeroSkinDef, MetaStats, WeaponSkinDef } from "./shop";
import { weaponPaletteAt } from "./palette";
import type { WeaponPalette } from "./palette";
import type { RunTally } from "./quests";
import {
  MAX_SKILL_TIER,
  bossAttackTiming,
  bossProjectileDamage,
  bossReward,
  bossXp,
  enemySpeed,
  enemyXp,
  shardNeed,
  skillTuning,
} from "./balance";
import type { SkillTuning } from "./balance";
import {
  applyChoice as applyProgressionChoice,
  createInitialProgression,
  grantShard,
  pickShardTarget,
  rollChoices as buildChoices,
  shardTargets,
} from "./progression";
import type { ProgressionState } from "./progression";
import { aimVector, capFx, telegraphAlpha } from "./visuals";
import {
  BIOMES,
  WORLD,
  TOTAL_STAGES,
  altBiomeOf,
  biomeOf,
  makeBoss,
  mulberry32,
  xpNeed,
  mobHp,
  mobDmg,
  waveQuota,
  skillDef,
  ARCH_NAMES,
} from "./data";
import type { BossInfo, Choice, SkillId, PassiveId, MasteryId, Biome } from "./data";

export type Phase = "menu" | "playing" | "paused" | "levelup" | "stageclear" | "gameover" | "victory";

export interface HudSkill {
  id: string;
  name: string;
  icon: string;
  /** Bậc hiện tại của vũ khí, tối đa MAX_SKILL_TIER. */
  lv: number;
  maxLv: number;
  evolved: boolean;
  /** Số mảnh đang gom và số mảnh cần để lên bậc kế (0 khi đã tối đa). */
  shards: number;
  shardNeed: number;
}
export interface HudData {
  hp: number;
  maxHp: number;
  lv: number;
  xp: number;
  xpNeed: number;
  stage: number;
  biomeName: string;
  wave: number;
  waveKills: number;
  waveQuota: number;
  bossActive: boolean;
  bossName: string;
  bossHp: number;
  bossMaxHp: number;
  kills: number;
  cores: number;
  goldRun: number;
  time: string;
  muted: boolean;
  skills: HudSkill[];
  banner: { text: string; sub: string; key: number } | null;
}
export interface GameStats {
  stage: number;
  kills: number;
  time: string;
  level: number;
  goldEarned: number;
  bossName?: string;
  /** Mã riêng của mỗi lần chốt sổ, để lớp UI không cộng trùng một chặng hai lần. */
  id: number;
  /** Thành tích của chặng vừa rồi, dùng để tính tiến độ nhiệm vụ ngày. */
  tally: RunTally;
}
export interface OverData {
  choices?: Choice[];
  stats?: GameStats;
}
export interface Hooks {
  onPhase: (p: Phase, data?: OverData) => void;
  onHud: (h: HudData) => void;
}

/* ================= helpers ================= */
const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
const dist2 = (ax: number, ay: number, bx: number, by: number) => {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
};
const rand = (a: number, b: number) => a + Math.random() * (b - a);
function hexToRgba(hex: string, a: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}
function fmtTime(s: number): string {
  const m = Math.floor(s / 60);
  const ss = Math.floor(s % 60);
  return `${m}:${ss.toString().padStart(2, "0")}`;
}

/* ================= entity types ================= */
interface Enemy {
  kind: MobKind;
  colors: MobColors;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  r: number;
  speed: number;
  dmg: number;
  xp: number;
  flash: number;
  frameT: number;
  elite: boolean;
  boss: BossInfo | null;
  slow: number;
  bladeCd: number;
  state: string;
  stateT: number;
  tx: number;
  ty: number;
  spiralA: number;
  dead: boolean;
}
interface Shot {
  kind: "bolt" | "boom";
  x: number;
  y: number;
  vx: number;
  vy: number;
  dmg: number;
  pierce: number;
  life: number;
  homing: boolean;
  r: number;
  spin: number;
  t: number;
  dur: number;
  sx: number;
  sy: number;
  tx: number;
  ty: number;
  evolved: boolean;
  /** Hệ số hiệu ứng theo bậc: đạn bậc cao to và rực hơn. */
  fx: number;
  hitIds: Set<Enemy>;
}
interface EBullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  dmg: number;
  life: number;
  color: string;
}
interface Pickup {
  x: number;
  y: number;
  vx: number;
  vy: number;
  kind: "xp" | "core" | "heart" | "shard";
  val: number;
  t: number;
  /** Chiêu thức mà mảnh này thuộc về (chỉ có với kind "shard"). */
  skill?: SkillId;
}
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  grav: number;
}
interface DmgNum {
  x: number;
  y: number;
  vy: number;
  life: number;
  text: string;
  color: string;
  size: number;
}
interface Zap {
  pts: { x: number; y: number }[];
  life: number;
}
interface Ring {
  x: number;
  y: number;
  r: number;
  maxR: number;
  life: number;
  color: string;
  width: number;
  /** Số vòng vẽ chồng lên nhau, càng cao bậc càng dày và rực. */
  layers: number;
}
/** Vệt quét hình rẻ quạt của hào quang và kiếm: thể hiện đúng độ phủ theo bậc. */
interface Sweep {
  x: number;
  y: number;
  angle: number;
  arc: number;
  radius: number;
  life: number;
  maxLife: number;
  color: string;
  glow: string;
  fx: number;
}
interface Trail {
  x: number;
  y: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}
interface Telegraph {
  x: number;
  y: number;
  tx?: number;
  ty?: number;
  radius: number;
  life: number;
  maxLife: number;
  color: string;
  kind: "charge" | "burst" | "slam";
}
interface Frost {
  x: number;
  y: number;
  ty: number;
  t: number;
  dur: number;
  dmg: number;
  aoe: number;
  maxTargets: number;
  fx: number;
}
interface Decor {
  x: number;
  y: number;
  type: string;
  c1: string;
  c2: string;
}
interface Ambient {
  x: number;
  y: number;
  vx: number;
  vy: number;
  ph: number;
}

/* ================= ENGINE ================= */
export class Engine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private hooks: Hooks;
  private raf = 0;
  private last = 0;
  private vw = 0;
  private vh = 0;
  private destroyed = false;

  phase: Phase = "menu";

  // player
  private px = WORLD / 2;
  private py = WORLD / 2;
  private hp = 100;
  private maxHp = 100;
  private face = 1;
  private walkT = 0;
  private moving = false;
  private iframes = 0;
  private hurtFx = 0;
  private regenAcc = 0;
  private goldRun = 0;
  private goldBanked = 0;
  private goldT = 0;
  private joy = { x: 0, y: 0, active: false };
  private heroSkin: HeroSkinDef = HERO_SKINS[0];
  private weaponSkin: WeaponSkinDef = WEAPON_SKINS[0];
  /** Chỉ số vĩnh viễn từ skin nhân vật và bảng nâng cấp đã mua. */
  private meta: MetaStats = EMPTY_STATS;
  /** Bảng màu vũ khí của khung hình hiện tại, trôi dần giữa các tông màu của skin. */
  private wc: WeaponPalette = WEAPON_SKINS[0].moods[0];
  /** Đồng hồ riêng cho vòng đổi màu, chạy cả khi tạm dừng để menu vẫn sống động. */
  private paletteT = 0;
  private orbitPts: { x: number; y: number; ev: boolean; fx: number }[] = [];

  // progression
  private stage = 1;
  private level = 1;
  private xp = 0;
  private pendingLv = 0;
  private kills = 0;
  private eliteKills = 0;
  private bossKills = 0;
  private stagesCleared = 0;
  private shardsTaken = 0;
  private cores = 0;
  private totalTime = 0;
  private stageTime = 0;
  /** Mốc thành tích đã chốt sổ ở lần qua màn hoặc kết thúc trận gần nhất. */
  private banked = { kills: 0, elites: 0, bosses: 0, stages: 0, shards: 0, seconds: 0 };
  private statsId = 0;

  // skills
  private skills: Record<SkillId, { lv: number; evolved: boolean }> = {
    bolt: { lv: 0, evolved: false },
    orbit: { lv: 0, evolved: false },
    aura: { lv: 0, evolved: false },
    zap: { lv: 0, evolved: false },
    boom: { lv: 0, evolved: false },
    frost: { lv: 0, evolved: false },
  };
  private passives: Record<PassiveId, number> = { speed: 0, heart: 0, power: 0, haste: 0, magnet: 0, regen: 0 };
  private masteries: Record<MasteryId, number> = { force: 0, vitality: 0, swiftness: 0, vacuum: 0 };
  private shards: Record<SkillId, number> = { bolt: 0, orbit: 0, aura: 0, zap: 0, boom: 0, frost: 0 };
  private cds: Record<SkillId, number> = { bolt: 0, orbit: 0, aura: 0, zap: 0, boom: 0, frost: 0 };
  private orbitT = 0;
  /** Hướng nhân vật đang nhắm, dùng cho các chiêu quét theo cung. */
  private aimA = 0;
  private choices: Choice[] = [];

  // waves
  private wave = 1;
  private waveKills = 0;
  private spawnT = 0;
  private bossIncoming = -1;
  private stageClearT = -1;

  // world
  private biome: Biome = BIOMES[0];
  private enemies: Enemy[] = [];
  private shots: Shot[] = [];
  private ebullets: EBullet[] = [];
  private pickups: Pickup[] = [];
  private particles: Particle[] = [];
  private dmgs: DmgNum[] = [];
  private zaps: Zap[] = [];
  private rings: Ring[] = [];
  private sweeps: Sweep[] = [];
  private trails: Trail[] = [];
  private telegraphs: Telegraph[] = [];
  private frosts: Frost[] = [];
  private decors: Decor[] = [];
  private ambients: Ambient[] = [];
  private shake = 0;
  private hitStop = 0;
  private camX = 0;
  private camY = 0;
  private menuT = 0;
  private bannerObj: { text: string; sub: string; key: number } | null = null;
  private hudT = 0;

  private keys = new Set<string>();
  private onKeyDown: (e: KeyboardEvent) => void;
  private onKeyUp: (e: KeyboardEvent) => void;
  private onResize: () => void;
  private onBlur: () => void;

  constructor(canvas: HTMLCanvasElement, hooks: Hooks) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.hooks = hooks;

    this.onKeyDown = (e) => {
      const k = e.key.toLowerCase();
      if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(k)) e.preventDefault();
      this.keys.add(k);
      if (k === "m") this.toggleMute();
      if (k === "p" || k === "escape") {
        if (this.phase === "playing") this.setPhase("paused");
        else if (this.phase === "paused") this.setPhase("playing");
      }
      if (this.phase === "levelup" && ["1", "2", "3"].includes(k)) {
        const i = parseInt(k, 10) - 1;
        if (this.choices[i]) this.choose(i);
      }
    };
    this.onKeyUp = (e) => this.keys.delete(e.key.toLowerCase());
    this.onResize = () => {
      this.vw = window.innerWidth;
      this.vh = window.innerHeight;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      this.canvas.width = Math.floor(this.vw * dpr);
      this.canvas.height = Math.floor(this.vh * dpr);
      this.canvas.style.width = this.vw + "px";
      this.canvas.style.height = this.vh + "px";
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.ctx.imageSmoothingEnabled = false;
    };
    this.onBlur = () => {
      if (this.phase === "playing") this.setPhase("paused");
    };
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("resize", this.onResize);
    window.addEventListener("blur", this.onBlur);
    this.onResize();
    this.buildStage();
    this.spawnMenuMobs();

    this.last = performance.now();
    const loop = (t: number) => {
      if (this.destroyed) return;
      const dt = clamp((t - this.last) / 1000, 0, 0.05);
      this.last = t;
      this.update(dt);
      this.draw();
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  destroy() {
    this.destroyed = true;
    cancelAnimationFrame(this.raf);
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("resize", this.onResize);
    window.removeEventListener("blur", this.onBlur);
  }

  /* ============ public API ============ */
  start() {
    sfx.unlock();
    const progression = createInitialProgression();
    this.stage = 1;
    this.level = 1;
    this.xp = 0;
    this.pendingLv = 0;
    this.kills = 0;
    this.eliteKills = 0;
    this.bossKills = 0;
    this.stagesCleared = 0;
    this.shardsTaken = 0;
    this.banked = { kills: 0, elites: 0, bosses: 0, stages: 0, shards: 0, seconds: 0 };
    this.cores = 0;
    this.goldRun = 0;
    this.goldBanked = 0;
    this.goldT = 0;
    this.joy = { x: 0, y: 0, active: false };
    this.totalTime = 0;
    this.skills = progression.skills;
    this.passives = progression.passives;
    this.masteries = progression.masteries;
    this.shards = progression.shards;
    this.cds = { bolt: 0, orbit: 0, aura: 0, zap: 0, boom: 0, frost: 0 };
    this.regenAcc = 0;
    this.orbitT = 0;
    this.orbitPts = [];
    this.keys.clear();
    this.hudT = 0;
    this.iframes = 0;
    this.hurtFx = 0;
    this.shake = 0;
    this.hitStop = 0;
    this.moving = false;
    this.maxHp = 100 + Math.round(this.meta.maxHp);
    this.hp = this.maxHp;
    this.px = WORLD / 2;
    this.py = WORLD / 2;
    this.enemies = [];
    this.clearFx();
    this.buildStage();
    this.wave = 1;
    this.waveKills = 0;
    this.spawnT = 0.4;
    this.bossIncoming = -1;
    this.stageClearT = -1;
    this.stageTime = 0;
    this.banner(`MÀN 1 / ${TOTAL_STAGES}`, `${this.biome.name} — ${this.biome.sub}`);
    this.setPhase("playing");
    sfx.wave();
  }

  resume() {
    if (this.phase === "paused") this.setPhase("playing");
  }
  togglePause() {
    if (this.phase === "playing") this.setPhase("paused");
    else if (this.phase === "paused") this.setPhase("playing");
  }
  toMenu() {
    this.enemies = [];
    this.clearFx();
    this.stage = 1;
    this.biome = BIOMES[0];
    this.buildStage();
    this.spawnMenuMobs();
    this.px = WORLD / 2;
    this.py = WORLD / 2;
    this.setPhase("menu");
  }
  toggleMute() {
    sfx.toggleMute();
    this.pushHud();
  }
  /**
   * Trang bị skin và chỉ số vĩnh viễn. Chỉ số áp dụng ngay cho trận sau; máu
   * cộng thêm chỉ đổi trần máu ở lần bắt đầu trận kế tiếp để tránh hồi máu lậu
   * bằng cách đổi skin giữa trận.
   */
  applyLoadout(hero: HeroSkinDef, weapon: WeaponSkinDef, stats: MetaStats = EMPTY_STATS) {
    this.heroSkin = hero;
    this.weaponSkin = weapon;
    this.meta = stats;
  }
  setJoystick(x: number, y: number) {
    if (x === 0 && y === 0) {
      this.joy.active = false;
      this.joy.x = 0;
      this.joy.y = 0;
      return;
    }
    this.joy.active = true;
    this.joy.x = clamp(x, -1, 1);
    this.joy.y = clamp(y, -1, 1);
  }
  /** Chốt sổ mọi thành tích của chặng vừa rồi để chặng sau tính lại từ 0. */
  bankGold() {
    this.statsId++;
    this.goldBanked = this.goldRun;
    this.banked = {
      kills: this.kills,
      elites: this.eliteKills,
      bosses: this.bossKills,
      stages: this.stagesCleared,
      shards: this.shardsTaken,
      seconds: this.totalTime,
    };
  }
  nextStage() {
    this.stage++;
    this.buildStage();
    this.px = WORLD / 2;
    this.py = WORLD / 2;
    this.enemies = [];
    // Dọn sạch mọi hiệu ứng của màn cũ, nếu không vòng cảnh báo hay vệt đạn
    // của trùm vừa chết sẽ còn treo lại giữa bản đồ mới.
    this.clearFx();
    this.shake = 0;
    this.hitStop = 0;
    this.wave = 1;
    this.waveKills = 0;
    this.spawnT = 0.5;
    this.bossIncoming = -1;
    this.stageClearT = -1;
    this.stageTime = 0;
    this.hp = clamp(this.hp + this.maxHp * 0.3, 1, this.maxHp);
    this.banner(`MÀN ${this.stage} / ${TOTAL_STAGES}`, `${this.biome.name} — ${this.biome.sub}`);
    this.setPhase("playing");
    sfx.wave();
  }

  /** Gói toàn bộ tiến trình thành một state thuần để các hàm trong progression.ts xử lý. */
  private progressionState(): ProgressionState {
    return {
      skills: this.skills,
      passives: this.passives,
      masteries: this.masteries,
      shards: this.shards,
      cores: this.cores,
    };
  }

  private applyProgression(state: ProgressionState) {
    this.skills = state.skills;
    this.passives = state.passives;
    this.masteries = state.masteries;
    this.shards = state.shards;
    this.cores = state.cores;
  }

  choose(i: number) {
    const c = this.choices[i];
    if (!c) return;
    sfx.click();
    this.applyProgression(applyProgressionChoice(this.progressionState(), c));

    if (c.kind === "up") {
      this.tierUpFx(c.id as SkillId, this.skills[c.id as SkillId].lv);
    } else if (c.kind === "evolve") {
      sfx.evolve();
      this.ring(this.px, this.py, 10, 160, 0.6, "#ffd94a", 6, 3);
      this.burst(this.px, this.py, 26, "#ffd94a", 220);
      this.shake = Math.max(this.shake, 6);
    } else if (c.kind === "passive" && c.id === "heart") {
      this.maxHp += 22;
      this.hp = clamp(this.hp + 22, 1, this.maxHp);
    } else if (c.kind === "mastery" && c.id === "vitality") {
      this.maxHp += 6;
      this.hp = clamp(this.hp + 6, 1, this.maxHp);
    } else if (c.kind === "heal" && c.id === "fortify") {
      this.maxHp += 8;
      this.hp = clamp(this.hp + 8, 1, this.maxHp);
      sfx.heal();
    } else if (c.kind === "heal" && c.id === "fortune") {
      this.earnGold(120 + this.stage * 3);
      sfx.core();
    } else if (c.kind === "heal") {
      this.hp = clamp(this.hp + this.maxHp * 0.5, 1, this.maxHp);
      sfx.heal();
    }
    this.pendingLv--;
    if (this.pendingLv > 0) {
      this.rollChoices();
      this.setPhase("levelup", { choices: this.choices });
    } else {
      this.setPhase("playing");
    }
  }

  /* ============ phase / hud ============ */
  private setPhase(p: Phase, data?: OverData) {
    this.phase = p;
    this.hooks.onPhase(p, data);
    this.pushHud();
  }

  private stats(): GameStats {
    const banked = this.banked;
    return {
      stage: this.stage,
      kills: this.kills,
      time: fmtTime(this.totalTime),
      level: this.level,
      goldEarned: this.goldRun - this.goldBanked,
      id: this.statsId,
      // Chỉ tính phần phát sinh kể từ lần chốt sổ trước, nếu không mỗi lần qua
      // màn sẽ cộng lại toàn bộ thành tích của cả trận vào nhiệm vụ ngày.
      tally: {
        kills: this.kills - banked.kills,
        elites: this.eliteKills - banked.elites,
        bosses: this.bossKills - banked.bosses,
        stages: this.stagesCleared - banked.stages,
        shards: this.shardsTaken - banked.shards,
        gold: this.goldRun - this.goldBanked,
        seconds: Math.floor(this.totalTime - banked.seconds),
        bestStage: this.stage,
        bestTier: Math.max(...(Object.keys(this.skills) as SkillId[]).map((id) => this.skills[id].lv)),
      },
    };
  }

  private pushHud() {
    const boss = this.enemies.find((e) => e.boss);
    const skills: HudSkill[] = (Object.keys(this.skills) as SkillId[])
      .filter((id) => this.skills[id].lv > 0)
      .map((id) => {
        const d = skillDef(id);
        const s = this.skills[id];
        return {
          id,
          icon: d.icon,
          lv: s.lv,
          maxLv: MAX_SKILL_TIER,
          evolved: s.evolved,
          shards: this.shards[id],
          shardNeed: shardNeed(s.lv),
          name: s.evolved ? d.evoName : d.name,
        };
      });
    this.hooks.onHud({
      hp: Math.ceil(this.hp),
      maxHp: this.maxHp,
      lv: this.level,
      xp: this.xp,
      xpNeed: xpNeed(this.level),
      stage: this.stage,
      biomeName: this.biome.name,
      wave: Math.min(this.wave, 4),
      waveKills: this.waveKills,
      waveQuota: waveQuota(this.stage, Math.min(this.wave, 3)),
      bossActive: !!boss,
      bossName: boss?.boss?.name ?? "",
      bossHp: boss ? Math.max(0, boss.hp) : 0,
      bossMaxHp: boss ? boss.maxHp : 1,
      kills: this.kills,
      cores: this.cores,
      goldRun: this.goldRun,
      time: fmtTime(this.totalTime),
      muted: sfx.muted,
      skills,
      banner: this.bannerObj,
    });
  }

  private banner(text: string, sub: string) {
    this.bannerObj = { text, sub, key: Math.random() };
    this.pushHud();
  }

  /* ============ derived stats ============ */
  // Chỉ số vĩnh viễn nhân lên trên chỉ số kiếm được trong trận, nên nó nâng đều
  // cả build yếu lẫn build mạnh thay vì chỉ có ích ở một giai đoạn.
  private power() {
    return (1 + 0.14 * this.passives.power + 0.03 * this.masteries.force) * (1 + this.meta.power);
  }
  private cdr() {
    return Math.pow(0.92, this.passives.haste) * (1 - this.meta.haste);
  }
  private magnetR() {
    return 95 * (1 + 0.4 * this.passives.magnet + 0.06 * this.masteries.vacuum) * (1 + this.meta.magnet);
  }
  private moveSpeed() {
    return 252 * (1 + 0.09 * this.passives.speed + 0.01 * this.masteries.swiftness) * (1 + this.meta.speed);
  }
  /** Vàng luôn cộng theo bội số của chỉ số Vận Vàng, làm tròn lên để không bao giờ mất phần thưởng. */
  private earnGold(amount: number) {
    const total = Math.ceil(amount * (1 + this.meta.gold));
    this.goldRun += total;
    return total;
  }

  /* ============ stage build ============ */
  private buildStage() {
    this.biome = biomeOf(this.stage);
    const rnd = mulberry32(this.stage * 777 + 5);
    this.decors = [];
    const n = 150;
    for (let i = 0; i < n; i++) {
      const type = this.biome.decors[Math.floor(rnd() * this.biome.decors.length)];
      this.decors.push({
        x: 60 + rnd() * (WORLD - 120),
        y: 60 + rnd() * (WORLD - 120),
        type,
        c1: this.biome.ground[1],
        c2: this.biome.ground[2],
      });
    }
    this.ambients = [];
    for (let i = 0; i < 60; i++) {
      this.ambients.push({ x: Math.random() * WORLD, y: Math.random() * WORLD, vx: rand(-14, 14), vy: rand(-10, 18), ph: Math.random() * 6.28 });
    }
  }

  private spawnMenuMobs() {
    this.enemies = [];
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      this.enemies.push(this.makeEnemy(BIOMES[0].mobKind, BIOMES[0].mob, WORLD / 2 + Math.cos(a) * 320, WORLD / 2 + Math.sin(a) * 240, 1, 1, false));
    }
  }

  /* ============ enemies ============ */
  private makeEnemy(kind: MobKind, colors: MobColors, x: number, y: number, stage: number, wave: number, elite: boolean, duringBoss = false): Enemy {
    const hpv = mobHp(stage, wave) * (elite ? 6 : 1);
    return {
      kind,
      colors,
      x: clamp(x, 40, WORLD - 40),
      y: clamp(y, 40, WORLD - 40),
      hp: hpv,
      maxHp: hpv,
      r: elite ? 20 : 15,
      speed: enemySpeed(stage, elite, rand(0.88, 1.12)),
      dmg: mobDmg(stage) * (elite ? 1.6 : 1),
      xp: enemyXp(stage, elite, duringBoss),
      flash: 0,
      frameT: Math.random() * 2,
      elite,
      boss: null,
      slow: 0,
      bladeCd: 0,
      state: "",
      stateT: rand(1.5, 3.5),
      tx: 0,
      ty: 0,
      spiralA: 0,
      dead: false,
    };
  }

  private spawnGroup() {
    const cap = this.wave >= 4 ? 46 : 120;
    if (this.enemies.length >= cap) return;
    const size = 3 + Math.floor(Math.random() * 4) + Math.floor(this.stage / 12);
    const baseA = Math.random() * Math.PI * 2;
    const kind2 = Math.random() < 0.22;
    const alt = altBiomeOf(this.biome);
    for (let i = 0; i < size; i++) {
      const a = baseA + rand(-0.7, 0.7);
      const d = rand(460, 640);
      const elite = Math.random() < 0.035;
      const kind = kind2 ? alt.mobKind : this.biome.mobKind;
      const col = kind === this.biome.mobKind ? this.biome.mob : alt.mob;
      const e = this.makeEnemy(kind, col, this.px + Math.cos(a) * d, this.py + Math.sin(a) * d, this.stage, Math.min(this.wave, 3), elite, this.wave >= 4);
      this.enemies.push(e);
      this.puff(e.x, e.y, col.M);
    }
  }

  private spawnBoss() {
    const info = makeBoss(this.stage);
    const a = Math.random() * Math.PI * 2;
    const e: Enemy = {
      kind: info.kind,
      colors: info.colors,
      x: clamp(this.px + Math.cos(a) * 420, 80, WORLD - 80),
      y: clamp(this.py + Math.sin(a) * 420, 80, WORLD - 80),
      hp: info.hp,
      maxHp: info.hp,
      r: info.scale * 6,
      speed: info.speed,
      dmg: info.dmg,
      xp: bossXp(this.stage),
      flash: 0,
      frameT: 0,
      elite: false,
      boss: info,
      slow: 0,
      bladeCd: 0,
      state: "",
      stateT: 2.2,
      tx: 0,
      ty: 0,
      spiralA: 0,
      dead: false,
    };
    this.enemies.push(e);
    this.banner(`TRÙM: ${info.name}`, `${this.biome.name} • Kiểu ${ARCH_NAMES[info.arch]}${info.king ? " • VUA MÀN" : ""}`);
    sfx.bossRoar();
    this.shake = 12;
    this.ring(e.x, e.y, 20, 190, 0.7, info.colors.X, 5);
    this.pushHud();
  }

  /* ============ combat helpers ============ */
  private burst(x: number, y: number, n: number, color: string, sp = 160) {
    if (this.particles.length > 420) return;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = rand(sp * 0.3, sp);
      const life = rand(0.3, 0.7);
      this.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, life, maxLife: life, size: rand(2, 5), color, grav: 260 });
    }
  }
  private puff(x: number, y: number, color: string) {
    this.burst(x, y, 6, color, 90);
  }
  private ring(x: number, y: number, r: number, maxR: number, life: number, color: string, width: number, layers = 1) {
    this.rings.push({ x, y, r, maxR, life, color, width, layers });
  }

  /** Vệt quét hình rẻ quạt: arc >= 2PI thì vẽ trọn vòng. */
  private sweep(angle: number, arc: number, radius: number, life: number, color: string, glow: string, fx: number) {
    this.sweeps.push({ x: this.px, y: this.py - 6, angle, arc, radius, life, maxLife: life, color, glow, fx });
  }
  private dmgNum(x: number, y: number, text: string, color: string, size = 15) {
    if (this.dmgs.length > 90) this.dmgs.shift();
    this.dmgs.push({ x: x + rand(-8, 8), y: y - 10, vy: -52, life: 0.75, text, color, size });
  }

  private damageEnemy(e: Enemy, dmg: number, knockX = 0, knockY = 0) {
    if (e.dead) return;
    const d = Math.max(1, Math.round(dmg));
    e.hp -= d;
    e.flash = 0.1;
    e.x = clamp(e.x + knockX, 30, WORLD - 30);
    e.y = clamp(e.y + knockY, 30, WORLD - 30);
    this.burst(e.x, e.y - e.r * 0.35, e.boss ? 3 : 2, "#fff3d0", 95);
    this.burst(e.x, e.y - e.r * 0.35, 1, e.colors.X, 75);
    this.dmgNum(e.x, e.y - e.r, String(d), e.boss ? "#ffd94a" : "#ffffff", e.boss ? 19 : 14);
    if (e.hp <= 0) this.killEnemy(e);
  }

  private killEnemy(e: Enemy) {
    if (e.dead) return;
    e.dead = true;
    this.kills++;
    if (e.elite) this.eliteKills++;
    if (e.boss) this.bossKills++;
    if (!e.boss) this.earnGold(e.elite ? 6 : 1);
    this.burst(e.x, e.y, e.boss ? 46 : 10, e.colors.M, e.boss ? 260 : 150);
    this.burst(e.x, e.y, e.boss ? 20 : 0, e.colors.X, 200);
    sfx.kill();
    if (e.boss) {
      this.onBossKilled(e);
      return;
    }
    if (e.xp > 0) this.dropPickup(e.x, e.y, "xp", e.xp);
    this.dropShards(e.x, e.y, e.elite ? 3 : 1, e.elite ? 0.85 : 0.14);
    if (e.elite) {
      if (Math.random() < 0.65) this.dropPickup(e.x + rand(-14, 14), e.y + rand(-10, 10), "core", 1);
    } else if (Math.random() < 0.02) {
      this.dropPickup(e.x, e.y, "heart", 20);
    }
    if (this.wave < 4) {
      this.waveKills++;
      if (this.waveKills >= waveQuota(this.stage, this.wave)) {
        this.wave++;
        this.waveKills = 0;
        const g = this.earnGold(15 + this.stage * 2);
        this.dmgNum(this.px, this.py - 34, `+${g} vàng`, "#ffd94a", 15);
        if (this.wave >= 4) {
          this.banner("CẢNH BÁO!", "Trùm đang tới...");
          this.bossIncoming = 1.5;
          sfx.wave();
        } else {
          this.banner(`ĐỢT ${this.wave} / 3`, "Quái kéo đến đông hơn!");
          sfx.wave();
        }
        this.pushHud();
      }
    }
  }

  private dropPickup(x: number, y: number, kind: Pickup["kind"], val: number, skill?: SkillId) {
    if (this.pickups.length > 220) return;
    this.pickups.push({ x: x + rand(-8, 8), y: y + rand(-8, 8), vx: rand(-30, 30), vy: rand(-50, -20), kind, val, t: Math.random() * 2, skill });
  }

  /**
   * Rơi mảnh vũ khí. Mảnh chỉ rơi cho chiêu đang sở hữu và chưa tối đa bậc,
   * nên người chơi không bao giờ nhặt được thứ vô dụng.
   */
  private dropShards(x: number, y: number, count: number, chance: number) {
    const state = this.progressionState();
    if (shardTargets(state).length === 0) return;
    for (let i = 0; i < count; i++) {
      if (Math.random() >= chance) continue;
      const id = pickShardTarget(state);
      if (!id) return;
      this.dropPickup(x + rand(-12, 12), y + rand(-10, 10), "shard", 1, id);
    }
  }

  /** Màu của mảnh vũ khí lấy theo bảng màu skin vũ khí đang trang bị. */
  private shardColors(id: SkillId): [string, string] {
    const w = this.wc;
    switch (id) {
      case "bolt": return [w.bolt, w.core];
      case "orbit": return [w.blade, w.blade2];
      case "aura": return [w.aura, w.glow];
      case "zap": return ["#cfefff", "#5c8eff"];
      case "boom": return [w.glow, w.blade2];
      default: return ["#bff3ff", "#4ab0e8"];
    }
  }

  /** Ăn mừng một bậc vũ khí mới: banner, vòng sáng và tiếng tiến hóa. */
  private tierUpFx(id: SkillId, tier: number) {
    const def = skillDef(id);
    const [bright] = this.shardColors(id);
    this.banner(`${def.name.toUpperCase()} — BẬC ${tier}`, def.tiers[tier - 1] ?? "Sức mạnh mới được khai mở");
    this.ring(this.px, this.py, 12, 150 + tier * 12, 0.55, bright, 5, tier >= 4 ? 3 : 2);
    this.burst(this.px, this.py, 18 + tier * 3, bright, 210);
    this.shake = Math.max(this.shake, 4);
    sfx.evolve();
  }

  private collectShard(id: SkillId) {
    this.shardsTaken++;
    const result = grantShard(this.progressionState(), id);
    this.applyProgression(result.state);
    if (result.tierUp !== null) this.tierUpFx(id, result.tierUp);
    else sfx.gem();
  }

  private onBossKilled(e: Enemy) {
    this.hitStop = 0.14;
    this.shake = 16;
    sfx.bossDie();
    const reward = bossReward(this.stage);
    const goldGained = this.earnGold(reward.gold);
    this.cores += reward.cores;
    this.dmgNum(e.x, e.y - e.r - 10, `+${goldGained} vàng`, "#ffd94a", 19);
    for (let i = 0; i < 8; i++) this.dropPickup(e.x + rand(-50, 50), e.y + rand(-50, 50), "xp", Math.ceil(e.xp / 8));
    this.dropShards(e.x, e.y, 6 + Math.floor(this.stage / 20), 1);
    if (Math.random() < 0.5) this.dropPickup(e.x, e.y + 20, "heart", 30);
    this.ebullets = [];
    this.stageClearT = 1.5;
  }

  private damagePlayer(d: number) {
    if (this.iframes > 0 || this.phase !== "playing") return;
    this.hp -= d;
    this.iframes = 0.85;
    this.hurtFx = 0.45;
    this.shake = Math.max(this.shake, 9);
    sfx.hurt();
    this.burst(this.px, this.py, 10, "#ff4d6d", 170);
    this.dmgNum(this.px, this.py - 26, `-${Math.round(d)}`, "#ff4d6d", 17);
    if (this.hp <= 0) {
      this.hp = 0;
      this.burst(this.px, this.py, 34, "#ffd94a", 240);
      sfx.gameover();
      const st = this.stats();
      this.bankGold();
      this.setPhase("gameover", { stats: st });
      const best = parseInt(localStorage.getItem("tvqv_best") || "0", 10);
      if (this.stage > best) localStorage.setItem("tvqv_best", String(this.stage));
    }
    this.pushHud();
  }

  /* ============ choices ============ */
  private rollChoices() {
    this.choices = buildChoices(this.progressionState());
  }

  private gainXp(v: number) {
    this.xp += v;
    while (this.xp >= xpNeed(this.level)) {
      this.xp -= xpNeed(this.level);
      this.level++;
      this.pendingLv++;
    }
    if (this.pendingLv > 0 && this.phase === "playing") {
      sfx.levelUp();
      this.rollChoices();
      this.setPhase("levelup", { choices: this.choices });
    }
  }

  /* ============ skills firing ============ */
  /** Một lượt quét không cấp phát, dùng cho những chỗ chạy mỗi khung hình. */
  private nearestEnemy(x: number, y: number, maxD: number): Enemy | null {
    let best: Enemy | null = null;
    let bestD = maxD * maxD;
    for (const e of this.enemies) {
      if (e.dead) continue;
      const d = dist2(e.x, e.y, x, y);
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }
    return best;
  }

  private nearestEnemies(n: number, maxD: number): Enemy[] {
    const list: { e: Enemy; d: number }[] = [];
    for (const e of this.enemies) {
      if (e.dead) continue;
      const d = dist2(e.x, e.y, this.px, this.py);
      if (d < maxD * maxD) list.push({ e, d });
    }
    list.sort((a, b) => a.d - b.d);
    return list.slice(0, n).map((l) => l.e);
  }

  /** Chênh lệch góc tuyệt đối, quy về khoảng [0, PI]. */
  private static angleGap(a: number, b: number): number {
    let diff = (a - b) % (Math.PI * 2);
    if (diff > Math.PI) diff -= Math.PI * 2;
    if (diff < -Math.PI) diff += Math.PI * 2;
    return Math.abs(diff);
  }

  /**
   * Kẻ địch nằm trong tầm và trong cung quét, sắp xếp theo khoảng cách và
   * cắt bớt theo giới hạn số mục tiêu của bậc hiện tại.
   */
  private targetsInArc(
    cx: number,
    cy: number,
    radius: number,
    arc: number,
    angle: number,
    maxTargets: number,
  ): Enemy[] {
    const full = arc >= Math.PI * 2;
    const half = arc / 2;
    const list: { e: Enemy; d: number }[] = [];
    for (const e of this.enemies) {
      if (e.dead) continue;
      const reach = radius + e.r;
      const d = dist2(e.x, e.y, cx, cy);
      if (d > reach * reach) continue;
      if (!full && Engine.angleGap(Math.atan2(e.y - cy, e.x - cx), angle) > half) continue;
      list.push({ e, d });
    }
    list.sort((a, b) => a.d - b.d);
    return list.slice(0, Math.max(1, maxTargets)).map((item) => item.e);
  }

  /** Góc của tia thứ i trong một chùm gồm count tia trải đều trên cung arc. */
  private static fanAngle(base: number, index: number, count: number, arc: number): number {
    if (count <= 1 || arc <= 0) return base;
    return base + (index - (count - 1) / 2) * (arc / (count - 1));
  }

  private fireSkills(dt: number) {
    const P = this.power();
    const C = this.cdr();
    (Object.keys(this.cds) as SkillId[]).forEach((k) => (this.cds[k] = Math.max(0, this.cds[k] - dt)));
    this.orbitT += dt * 1.5;

    // ---- BOLT ----
    const bolt = this.skills.bolt;
    if (bolt.lv > 0 && this.cds.bolt <= 0) {
      const tuning = skillTuning("bolt", bolt.lv, bolt.evolved);
      const targets = this.nearestEnemies(6, tuning.range);
      if (targets.length) {
        const ev = bolt.evolved;
        const dmg = tuning.damage * P;
        const t = targets[0];
        const aim = Math.atan2(t.y - this.py, t.x - this.px);
        for (let i = 0; i < tuning.count; i++) {
          const base = Engine.fanAngle(aim, i, tuning.count, tuning.arc);
          const sp = 480 + tuning.fx * 40;
          this.shots.push({
            kind: "bolt", x: this.px, y: this.py - 14, vx: Math.cos(base) * sp, vy: Math.sin(base) * sp,
            dmg, pierce: tuning.pierce, life: 1.4, homing: ev, r: tuning.radius, spin: 0, t: 0, dur: 1,
            sx: 0, sy: 0, tx: 0, ty: 0, evolved: ev, fx: tuning.fx, hitIds: new Set(),
          });
        }
        this.cds.bolt = tuning.cooldown * C;
        sfx.shoot();
      }
    }

    // ---- ZAP ----
    const zap = this.skills.zap;
    if (zap.lv > 0 && this.cds.zap <= 0) {
      const ev = zap.evolved;
      const tuning = skillTuning("zap", zap.lv, ev);
      const dmg = tuning.damage * P;
      const targets = this.nearestEnemies(tuning.count + 8, tuning.range);
      if (targets.length) {
        const chosen: Enemy[] = [];
        const poolZ = [...targets];
        for (let i = 0; i < Math.min(tuning.count, poolZ.length); i++) {
          const idx = Math.floor(Math.random() * poolZ.length);
          chosen.push(poolZ.splice(idx, 1)[0]);
        }
        // Một kẻ địch chỉ ăn một lần trong cùng nhịp sét, kể cả khi sét lan qua lại.
        const struck = new Set<Enemy>(chosen);
        for (const t of chosen) {
          this.strikeZap(t, dmg, this.px, this.py - 20, tuning);
          if (!ev) continue;
          let from = t;
          let chainDmg = dmg * 0.6;
          for (let c = 0; c < tuning.maxTargets; c++) {
            const next = this.nearestTo(from, 190, struck);
            if (!next) break;
            struck.add(next);
            this.strikeZap(next, chainDmg, from.x, from.y, tuning);
            chainDmg *= 0.8;
            from = next;
          }
        }
        this.cds.zap = tuning.cooldown * C;
        sfx.zap();
        this.shake = Math.max(this.shake, 2);
      }
    }

    // ---- AURA ----
    const aura = this.skills.aura;
    if (aura.lv > 0 && this.cds.aura <= 0) {
      const ev = aura.evolved;
      const tuning = skillTuning("aura", aura.lv, ev);
      const dmg = tuning.damage * P;
      const hits = this.targetsInArc(this.px, this.py, tuning.radius, tuning.arc, this.aimA, tuning.maxTargets);
      for (const e of hits) this.damageEnemy(e, dmg);
      const color = ev ? this.wc.glow : this.wc.aura;
      this.sweep(this.aimA, tuning.arc, tuning.radius, 0.34, color, this.wc.glow, tuning.fx);
      this.ring(this.px, this.py, 20, tuning.radius, 0.35, color, 3 + tuning.fx, tuning.fx >= 1.6 ? 2 : 1);
      if (hits.length) sfx.hit();
      this.cds.aura = tuning.cooldown * C;
    }

    // ---- BOOM ----
    const boom = this.skills.boom;
    if (boom.lv > 0 && this.cds.boom <= 0) {
      const ev = boom.evolved;
      const tuning = skillTuning("boom", boom.lv, ev);
      const t = this.nearestEnemies(1, tuning.range)[0];
      if (t) {
        const dmg = tuning.damage * P;
        const aim = Math.atan2(t.y - this.py, t.x - this.px);
        const d = clamp(Math.sqrt(dist2(t.x, t.y, this.px, this.py)), 140, tuning.range * 0.7);
        for (let i = 0; i < tuning.count; i++) {
          const a = Engine.fanAngle(aim, i, tuning.count, tuning.arc);
          this.shots.push({
            kind: "boom", x: this.px, y: this.py - 10, vx: 0, vy: 0, dmg, pierce: 99, life: 3, homing: false,
            r: tuning.radius, spin: Math.random() * 6, t: 0, dur: 0.5, sx: this.px, sy: this.py - 10,
            tx: this.px + Math.cos(a) * d, ty: this.py + Math.sin(a) * d, evolved: ev, fx: tuning.fx, hitIds: new Set(),
          });
        }
        this.cds.boom = tuning.cooldown * C;
        sfx.throwSound();
      }
    }

    // ---- FROST ----
    const frost = this.skills.frost;
    if (frost.lv > 0 && this.cds.frost <= 0) {
      const ev = frost.evolved;
      const tuning = skillTuning("frost", frost.lv, ev);
      const targets = this.nearestEnemies(14, tuning.range);
      if (targets.length) {
        const dmg = tuning.damage * P;
        for (let i = 0; i < tuning.count; i++) {
          const t = targets[Math.floor(Math.random() * targets.length)];
          this.frosts.push({
            x: t.x + rand(-20, 20), y: t.y - 300, ty: t.y, t: 0, dur: 0.45,
            dmg, aoe: tuning.radius, maxTargets: tuning.maxTargets, fx: tuning.fx,
          });
        }
        this.cds.frost = tuning.cooldown * C;
        sfx.frost();
      }
    }
  }

  /** Kẻ địch còn sống gần nhất quanh một điểm, bỏ qua những kẻ đã bị đánh dấu. */
  private nearestTo(from: Enemy, maxD: number, skip: Set<Enemy>): Enemy | null {
    let best: Enemy | null = null;
    let bestD = maxD * maxD;
    for (const e of this.enemies) {
      if (e.dead || e === from || skip.has(e)) continue;
      const d = dist2(e.x, e.y, from.x, from.y);
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }
    return best;
  }

  private strikeZap(e: Enemy, dmg: number, ox: number, oy: number, tuning: SkillTuning) {
    const pts: { x: number; y: number }[] = [];
    const steps = 5;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      pts.push({
        x: ox + (e.x - ox) * t + (i > 0 && i < steps ? rand(-22, 22) : 0),
        y: oy + (e.y - oy) * t + (i > 0 && i < steps ? rand(-16, 16) : 0),
      });
    }
    this.zaps.push({ pts, life: 0.16 });
    this.burst(e.x, e.y, Math.round(4 * tuning.fx), "#cfefff", 130);
    this.damageEnemy(e, dmg);
    // Từ bậc 2, mỗi cú sét còn nổ lan ra quanh điểm đánh.
    if (tuning.radius <= 0) return;
    this.ring(e.x, e.y, 6, tuning.radius, 0.3, "#9bd0ff", 2 + tuning.fx, tuning.fx >= 1.6 ? 2 : 1);
    const splash = this.targetsInArc(e.x, e.y, tuning.radius, Math.PI * 2, 0, tuning.maxTargets + 1);
    for (const other of splash) {
      if (other === e) continue;
      this.damageEnemy(other, dmg * 0.55);
    }
  }

  /* ============ update ============ */
  private update(rawDt: number) {
    this.paletteT += rawDt;
    let dt = rawDt;
    if (this.hitStop > 0) {
      this.hitStop -= rawDt;
      dt *= 0.12;
    }
    this.shake = Math.max(0, this.shake - rawDt * 26);
    this.hurtFx = Math.max(0, this.hurtFx - rawDt);
    this.iframes = Math.max(0, this.iframes - dt);

    // ambient & fx always tick (trừ khi pause cứng)
    if (this.phase !== "paused" && this.phase !== "levelup") {
      this.updateFx(dt);
    }

    if (this.phase === "menu") {
      this.menuT += dt;
      for (const e of this.enemies) {
        e.stateT -= dt;
        if (e.stateT <= 0) {
          e.stateT = rand(1.2, 3);
          e.tx = Math.cos(rand(0, 6.28));
          e.ty = Math.sin(rand(0, 6.28));
        }
        e.x = clamp(e.x + e.tx * 36 * dt, WORLD / 2 - 460, WORLD / 2 + 460);
        e.y = clamp(e.y + e.ty * 36 * dt, WORLD / 2 - 340, WORLD / 2 + 340);
        e.frameT += dt;
      }
      return;
    }

    if (this.phase !== "playing") return;

    this.totalTime += dt;
    this.stageTime += dt;

    /* --- player move --- */
    let mx = 0;
    let my = 0;
    if (this.keys.has("a") || this.keys.has("arrowleft")) mx -= 1;
    if (this.keys.has("d") || this.keys.has("arrowright")) mx += 1;
    if (this.keys.has("w") || this.keys.has("arrowup")) my -= 1;
    if (this.keys.has("s") || this.keys.has("arrowdown")) my += 1;
    if (this.joy.active) {
      const mag = Math.hypot(this.joy.x, this.joy.y);
      if (mag > 0.15) {
        mx = this.joy.x / mag;
        my = this.joy.y / mag;
      }
    }
    this.moving = mx !== 0 || my !== 0;
    if (this.moving) {
      const l = Math.hypot(mx, my);
      mx /= l;
      my /= l;
      this.px = clamp(this.px + mx * this.moveSpeed() * dt, 30, WORLD - 30);
      this.py = clamp(this.py + my * this.moveSpeed() * dt, 30, WORLD - 30);
      if (mx !== 0) this.face = mx > 0 ? 1 : -1;
      this.walkT += dt;
      if (Math.random() < dt * 7) this.puff(this.px + rand(-6, 6), this.py + 14, hexToRgba("#8a6a44", 0.9));
    }

    // Hướng nhắm cho các chiêu quét theo cung: đang chạy thì quét theo hướng chạy,
    // đứng yên thì quay về phía kẻ địch gần nhất.
    if (this.moving) {
      this.aimA = Math.atan2(my, mx);
    } else {
      const near = this.nearestEnemy(this.px, this.py, 900);
      if (near) this.aimA = Math.atan2(near.y - this.py, near.x - this.px);
    }
    // regen
    this.regenAcc += 0.7 * this.passives.regen * dt;
    if (this.regenAcc >= 1) {
      const h = Math.floor(this.regenAcc);
      this.regenAcc -= h;
      this.hp = clamp(this.hp + h, 0, this.maxHp);
    }
    // vàng sinh tồn: cứ mỗi giây lại có tiền
    this.goldT += dt;
    if (this.goldT >= 1) {
      this.goldT -= 1;
      this.earnGold(1 + Math.floor(this.stage / 4));
    }

    /* --- waves & spawn --- */
    const quota = waveQuota(this.stage, Math.min(this.wave, 3));
    if (this.wave <= 3) {
      this.spawnT -= dt;
      const interval = Math.max(0.3, 1.15 - this.stage * 0.007 - (this.wave - 1) * 0.12);
      if (this.spawnT <= 0) {
        this.spawnGroup();
        this.spawnT = interval;
      }
    } else if (this.bossIncoming > 0) {
      this.bossIncoming -= dt;
      if (this.bossIncoming <= 0) {
        this.spawnBoss();
        this.bossIncoming = -1;
      }
    } else {
      // trickle during boss
      this.spawnT -= dt;
      if (this.spawnT <= 0 && !this.enemies.some((e) => e.boss?.arch === 2)) {
        this.spawnT = Math.max(1.6, 3.4 - this.stage * 0.01);
        this.spawnGroup();
      }
    }
    void quota;

    /* --- skills --- */
    this.fireSkills(dt);

    /* --- shots --- */
    for (const s of this.shots) {
      s.life -= dt;
      s.spin += dt * 14;
      if (s.kind === "bolt") {
        if (s.homing) {
          const t = this.nearestEnemies(1, 700)[0];
          if (t) {
            const want = Math.atan2(t.y - s.y, t.x - s.x);
            const cur = Math.atan2(s.vy, s.vx);
            let diff = want - cur;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            const turn = clamp(diff, -6 * dt, 6 * dt);
            const sp = Math.hypot(s.vx, s.vy);
            const na = cur + turn;
            s.vx = Math.cos(na) * sp;
            s.vy = Math.sin(na) * sp;
          }
        }
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        if (s.evolved && Math.random() < dt * 30) this.particles.push({ x: s.x, y: s.y, vx: rand(-20, 20), vy: rand(-20, 20), life: 0.3, maxLife: 0.3, size: 3, color: "#ffd94a", grav: 0 });
      } else {
        // sx/sy là điểm ném ban đầu và phải giữ nguyên: nếu gán lại theo vị trí
        // hiện tại thì độ vồng sin bị cộng dồn mỗi khung hình và boomerang bay lệch.
        s.t += dt / s.dur;
        if (s.t <= 1) {
          s.x = s.sx + (s.tx - s.sx) * s.t;
          s.y = s.sy + (s.ty - s.sy) * s.t - Math.sin(s.t * Math.PI) * 26;
        } else if (s.t <= 2) {
          const k = s.t - 1;
          s.x = s.tx + (this.px - s.tx) * k;
          s.y = s.ty + (this.py - 10 - s.ty) * k - Math.sin(k * Math.PI) * 26;
        } else {
          s.life = 0;
        }
      }
      if (Math.random() < Math.min(1, dt * 48)) {
        const maxLife = s.kind === "bolt" ? 0.18 : 0.26;
        this.trails.push({
          x: s.x,
          y: s.y,
          life: maxLife,
          maxLife,
          size: (s.kind === "bolt" ? 5 : 7) * s.fx,
          color: s.evolved ? this.wc.glow : s.kind === "bolt" ? this.wc.bolt : this.wc.blade,
        });
      }
      if (s.x < 20 || s.x > WORLD - 20 || s.y < 20 || s.y > WORLD - 20) s.life = 0;
      // hits
      for (const e of this.enemies) {
        if (e.dead || s.hitIds.has(e)) continue;
        if (dist2(e.x, e.y, s.x, s.y) < (e.r + s.r) * (e.r + s.r)) {
          s.hitIds.add(e);
          const kx = e.boss ? 0 : (s.vx !== 0 || s.vy !== 0 ? Math.sign(s.vx) * 6 : 0);
          this.damageEnemy(e, s.dmg, kx, 0);
          if (s.pierce > 0 && s.pierce < 90) s.pierce--;
          else if (s.pierce === 0) {
            s.life = 0;
            break;
          }
        }
      }
    }
    this.shots = this.shots.filter((s) => s.life > 0);

    /* --- orbit blades --- */
    const orbit = this.skills.orbit;
    if (orbit.lv > 0) {
      const ev = orbit.evolved;
      const tuning = skillTuning("orbit", orbit.lv, ev);
      const dmg = tuning.damage * this.power();
      const bspd = 2.4 + orbit.lv * 0.15;
      // Ở bậc 1 các lưỡi chỉ trải trên nửa vòng nên vệt quét là một cung 180 độ
      // đang xoay; từ bậc 2 arc bằng 2PI nên khoảng cách đều nhau thành vòng kín.
      const spacing = tuning.arc / tuning.count;
      const bladeR = 12 + 5 * tuning.fx;
      this.orbitPts = [];
      for (let i = 0; i < tuning.count; i++) {
        const a = this.orbitT * bspd + (i - (tuning.count - 1) / 2) * spacing;
        const bx = this.px + Math.cos(a) * tuning.radius;
        const by = this.py - 8 + Math.sin(a) * tuning.radius * 0.82;
        this.orbitPts.push({ x: bx, y: by, ev, fx: tuning.fx });
        for (const e of this.enemies) {
          if (e.dead || e.bladeCd > 0) continue;
          if (dist2(e.x, e.y, bx, by) < (e.r + bladeR) * (e.r + bladeR)) {
            e.bladeCd = tuning.cooldown;
            const ka = Math.atan2(e.y - this.py, e.x - this.px);
            this.damageEnemy(e, dmg, e.boss ? 0 : Math.cos(ka) * 10, e.boss ? 0 : Math.sin(ka) * 10);
          }
        }
      }
      // Từ bậc 4 lưỡi kiếm kéo theo vệt sáng cho đòn quét dày và bắt mắt hơn.
      if (tuning.fx >= 1.5 && Math.random() < dt * 26) {
        const p = this.orbitPts[Math.floor(Math.random() * this.orbitPts.length)];
        this.trails.push({
          x: p.x, y: p.y, life: 0.2, maxLife: 0.2,
          size: 4 * tuning.fx, color: ev ? this.wc.glow : this.wc.blade,
        });
      }
    } else {
      this.orbitPts = [];
    }

    /* --- frosts --- */
    for (const f of this.frosts) {
      f.t += dt / f.dur;
      if (f.t >= 1) {
        this.ring(f.x, f.ty, 8, f.aoe, 0.35, "#7fd4ff", 3 + f.fx, f.fx >= 1.6 ? 2 : 1);
        this.burst(f.x, f.ty, Math.round(7 * f.fx), "#bff3ff", 140);
        for (const e of this.targetsInArc(f.x, f.ty, f.aoe, Math.PI * 2, 0, f.maxTargets)) {
          this.damageEnemy(e, f.dmg);
          e.slow = Math.max(e.slow, this.skills.frost.evolved ? 3 : 1.8);
        }
        sfx.hit();
      }
    }
    this.frosts = this.frosts.filter((f) => f.t < 1);

    /* --- enemies --- */
    for (const e of this.enemies) {
      if (e.dead) continue;
      e.flash = Math.max(0, e.flash - dt);
      e.bladeCd = Math.max(0, e.bladeCd - dt);
      e.slow = Math.max(0, e.slow - dt);
      e.frameT += dt;
      const slowMul = e.slow > 0 ? 0.55 : 1;

      if (e.boss) {
        this.updateBoss(e, dt);
      } else {
        const a = Math.atan2(this.py - e.y, this.px - e.x);
        e.x += Math.cos(a) * e.speed * slowMul * dt;
        e.y += Math.sin(a) * e.speed * slowMul * dt;
      }

      // separation nhẹ
      for (const o of this.enemies) {
        if (o === e || o.dead || o.boss) continue;
        const d2 = dist2(e.x, e.y, o.x, o.y);
        const min = e.r + o.r - 6;
        if (d2 < min * min && d2 > 0.01) {
          const d = Math.sqrt(d2);
          const push = ((min - d) / d) * 0.5;
          e.x += (e.x - o.x) * push * 0.4;
          e.y += (e.y - o.y) * push * 0.4;
        }
      }
      e.x = clamp(e.x, 30, WORLD - 30);
      e.y = clamp(e.y, 30, WORLD - 30);

      // chạm người chơi
      if (this.iframes <= 0 && dist2(e.x, e.y, this.px, this.py) < (e.r + 13) * (e.r + 13)) {
        this.damagePlayer(e.dmg);
      }
    }
    this.enemies = this.enemies.filter((e) => !e.dead);

    /* --- enemy bullets --- */
    for (const b of this.ebullets) {
      b.life -= dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (Math.random() < Math.min(1, dt * 24)) {
        this.trails.push({ x: b.x, y: b.y, life: 0.16, maxLife: 0.16, size: b.r * 1.2, color: b.color });
      }
      if (b.x < 20 || b.x > WORLD - 20 || b.y < 20 || b.y > WORLD - 20) b.life = 0;
      if (this.iframes <= 0 && dist2(b.x, b.y, this.px, this.py) < (b.r + 12) * (b.r + 12)) {
        b.life = 0;
        this.damagePlayer(b.dmg);
      }
    }
    this.ebullets = this.ebullets.filter((b) => b.life > 0);
    if (this.ebullets.length > 260) this.ebullets.splice(0, this.ebullets.length - 260);

    /* --- pickups --- */
    const mr = this.magnetR();
    for (const p of this.pickups) {
      p.t += dt;
      const d2 = dist2(p.x, p.y, this.px, this.py);
      if (d2 < mr * mr) {
        const d = Math.sqrt(d2) || 1;
        const pull = 540 * (1 - Math.min(1, d / mr)) + 160;
        p.vx += ((this.px - p.x) / d) * pull * dt * 3;
        p.vy += ((this.py - p.y) / d) * pull * dt * 3;
      }
      p.vx *= 0.92;
      p.vy *= 0.92;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (d2 < 24 * 24) {
        p.t = -99;
        if (p.kind === "xp") {
          this.gainXp(p.val);
          sfx.gem();
        } else if (p.kind === "core") {
          this.cores += p.val;
          sfx.core();
          this.dmgNum(p.x, p.y, "LÕI TIẾN HÓA!", "#ff9d2e", 15);
          this.ring(p.x, p.y, 6, 60, 0.4, "#ff9d2e", 4);
        } else if (p.kind === "shard" && p.skill) {
          const [bright] = this.shardColors(p.skill);
          this.dmgNum(p.x, p.y, `+1 mảnh ${skillDef(p.skill).name}`, bright, 13);
          this.collectShard(p.skill);
        } else {
          this.hp = clamp(this.hp + p.val, 1, this.maxHp);
          sfx.heal();
          this.dmgNum(p.x, p.y, `+${p.val}`, "#7ce06a", 16);
        }
      }
    }
    this.pickups = this.pickups.filter((p) => p.t > -50);

    /* --- stage clear timer --- */
    if (this.stageClearT > 0) {
      this.stageClearT -= dt;
      if (this.stageClearT <= 0) {
        this.stageClearT = -1;
        this.stagesCleared++;
        const best = parseInt(localStorage.getItem("tvqv_best") || "0", 10);
        if (this.stage > best) localStorage.setItem("tvqv_best", String(this.stage));
        const st = this.stats();
        this.bankGold();
        if (this.stage >= TOTAL_STAGES) {
          sfx.victory();
          this.setPhase("victory", { stats: st });
        } else {
          this.setPhase("stageclear", { stats: st });
        }
      }
    }

    /* --- hud throttle --- */
    this.particles = capFx(this.particles, 420);
    this.dmgs = capFx(this.dmgs, 90);
    this.zaps = capFx(this.zaps, 36);
    this.rings = capFx(this.rings, 80);
    this.trails = capFx(this.trails, 180);
    this.telegraphs = capFx(this.telegraphs, 24);
    this.hudT -= dt;
    if (this.hudT <= 0) {
      this.hudT = 0.1;
      this.pushHud();
    }
  }

  private updateBoss(e: Enemy, dt: number) {
    const info = e.boss!;
    const bulletDamage = bossProjectileDamage(this.stage, info.king);
    const timing = bossAttackTiming(this.stage, info.king, info.arch);
    const a = Math.atan2(this.py - e.y, this.px - e.x);
    e.stateT -= dt;
    const cdMul = info.king ? 0.75 : 1;

    switch (info.arch) {
      case 0: {
        // xung kích
        if (e.state === "tele") {
          if (e.stateT <= 0) {
            e.state = "charge";
            e.stateT = 0.65;
            sfx.throwSound();
          }
        } else if (e.state === "charge") {
          e.x += e.tx * e.speed * 5.2 * dt;
          e.y += e.ty * e.speed * 5.2 * dt;
          if (Math.random() < dt * 40) this.puff(e.x + rand(-20, 20), e.y + rand(-20, 20), info.colors.M);
          if (e.stateT <= 0) {
            e.state = "";
            e.stateT = timing.cooldown + rand(0, 0.8) * cdMul;
          }
        } else {
          e.x += Math.cos(a) * e.speed * dt;
          e.y += Math.sin(a) * e.speed * dt;
          if (e.stateT <= 0) {
            e.state = "tele";
            e.stateT = timing.warning;
            e.flash = 0.4;
            const aim = aimVector(e.x, e.y, this.px, this.py);
            e.tx = aim.x;
            e.ty = aim.y;
            this.telegraphs.push({
              x: e.x, y: e.y, tx: this.px, ty: this.py, radius: 74,
              life: timing.warning, maxLife: timing.warning, color: info.colors.X, kind: "charge",
            });
            sfx.wave();
          }
        }
        break;
      }
      case 1: {
        // bắn phá
        e.x += Math.cos(a) * e.speed * 0.8 * dt;
        e.y += Math.sin(a) * e.speed * 0.8 * dt;
        if (e.state === "tele") {
          if (e.stateT > 0) break;
          e.state = "";
          e.stateT = timing.cooldown;
          const n = 10 + Math.floor(this.stage / 8);
          for (let i = 0; i < n; i++) {
            const ba = (i / n) * Math.PI * 2 + e.spiralA;
            this.ebullets.push({ x: e.x, y: e.y, vx: Math.cos(ba) * 165, vy: Math.sin(ba) * 165, r: 7, dmg: bulletDamage, life: 4, color: info.colors.X });
          }
          e.spiralA += 0.35;
          sfx.shoot();
        } else if (e.stateT <= 0) {
          e.state = "tele";
          e.stateT = timing.warning;
          e.flash = 0.35;
          this.telegraphs.push({
            x: e.x, y: e.y, radius: 118,
            life: timing.warning, maxLife: timing.warning, color: info.colors.X, kind: "burst",
          });
          sfx.wave();
        }
        break;
      }
      case 2: {
        // triệu hồi
        e.x += Math.cos(a) * e.speed * 0.6 * dt;
        e.y += Math.sin(a) * e.speed * 0.6 * dt;
        if (e.stateT <= 0) {
          e.stateT = timing.cooldown;
          for (let i = 0; i < 3 + Math.floor(this.stage / 25); i++) {
            const sa = Math.random() * Math.PI * 2;
            const m = this.makeEnemy(this.biome.mobKind, this.biome.mob, e.x + Math.cos(sa) * 90, e.y + Math.sin(sa) * 90, this.stage, 3, false, true);
            this.enemies.push(m);
            this.puff(m.x, m.y, info.colors.M);
          }
          this.ring(e.x, e.y, 30, 130, 0.5, info.colors.M, 4);
          sfx.bossRoar();
        }
        break;
      }
      case 3: {
        // xoáy ốc
        e.x += Math.cos(a) * e.speed * 0.7 * dt;
        e.y += Math.sin(a) * e.speed * 0.7 * dt;
        e.spiralA += dt * 3.2;
        e.tx += dt; // tx dùng làm accumulator nhịp bắn
        if (e.tx > timing.pulse) {
          e.tx = 0;
          for (const off of [0, Math.PI]) {
            this.ebullets.push({ x: e.x, y: e.y, vx: Math.cos(e.spiralA + off) * 185, vy: Math.sin(e.spiralA + off) * 185, r: 6, dmg: bulletDamage, life: 3.4, color: info.colors.X });
          }
          if (Math.random() < 0.2) sfx.shoot();
        }
        break;
      }
      default: {
        // động đất: nhảy nghiền
        if (e.state === "tele") {
          if (e.stateT <= 0) {
            e.state = "jump";
            e.stateT = 0.4;
          }
        } else if (e.state === "jump") {
          const k = 1 - e.stateT / 0.4;
          e.x += (e.tx - e.x) * Math.min(1, k * 1.6) * dt * 8;
          e.y += (e.ty - e.y) * Math.min(1, k * 1.6) * dt * 8;
          if (e.stateT <= 0) {
            e.state = "";
            e.stateT = timing.cooldown;
            this.shake = 14;
            sfx.bossRoar();
            const n = 14;
            for (let i = 0; i < n; i++) {
              const ba = (i / n) * Math.PI * 2;
              this.ebullets.push({ x: e.x, y: e.y, vx: Math.cos(ba) * 210, vy: Math.sin(ba) * 210, r: 7, dmg: bulletDamage, life: 3, color: info.colors.X });
            }
            this.ring(e.x, e.y, 20, 170, 0.5, info.colors.X, 6);
            this.burst(e.x, e.y, 16, info.colors.D, 220);
          }
        } else {
          e.x += Math.cos(a) * e.speed * dt;
          e.y += Math.sin(a) * e.speed * dt;
          if (e.stateT <= 0) {
            e.state = "tele";
            e.stateT = timing.warning;
            e.tx = this.px;
            e.ty = this.py;
            e.flash = 0.4;
            this.telegraphs.push({
              x: e.tx, y: e.ty, radius: 170,
              life: timing.warning, maxLife: timing.warning, color: info.colors.X, kind: "slam",
            });
            sfx.wave();
          }
        }
        break;
      }
    }
  }

  private updateFx(dt: number) {
    for (const p of this.particles) {
      p.life -= dt;
      p.vy += p.grav * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    this.particles = capFx(this.particles.filter((p) => p.life > 0), 420);
    for (const d of this.dmgs) {
      d.life -= dt;
      d.y += d.vy * dt;
      d.vy *= 0.94;
    }
    this.dmgs = capFx(this.dmgs.filter((d) => d.life > 0), 90);
    for (const z of this.zaps) z.life -= dt;
    this.zaps = capFx(this.zaps.filter((z) => z.life > 0), 36);
    for (const r of this.rings) {
      r.life -= dt;
      r.r += (r.maxR - r.r) * Math.min(1, dt * 12);
    }
    this.rings = capFx(this.rings.filter((r) => r.life > 0), 80);
    for (const s of this.sweeps) s.life -= dt;
    this.sweeps = capFx(this.sweeps.filter((s) => s.life > 0), 24);
    for (const trail of this.trails) trail.life -= dt;
    this.trails = capFx(this.trails.filter((trail) => trail.life > 0), 180);
    for (const telegraph of this.telegraphs) telegraph.life -= dt;
    this.telegraphs = capFx(this.telegraphs.filter((telegraph) => telegraph.life > 0), 24);
    // ambient
    const type = this.biome.ambient.type;
    for (const a of this.ambients) {
      a.ph += dt;
      if (type === "snow" || type === "ash") {
        a.y += (16 + a.ph % 8) * dt;
        a.x += Math.sin(a.ph * 1.4) * 12 * dt;
      } else if (type === "ember" || type === "bubble" || type === "spore") {
        a.y -= 22 * dt;
        a.x += Math.sin(a.ph * 2) * 14 * dt;
      } else if (type === "sand") {
        a.x += 60 * dt;
      } else if (type === "petal") {
        // Cánh hoa rơi chậm và đảo qua lại như bị gió cuốn.
        a.y += 26 * dt;
        a.x += Math.sin(a.ph * 1.1) * 34 * dt;
      } else {
        a.x += a.vx * dt;
        a.y += a.vy * dt + Math.sin(a.ph * 2) * 6 * dt;
      }
      if (a.x < 0) a.x += WORLD;
      if (a.x > WORLD) a.x -= WORLD;
      if (a.y < 0) a.y += WORLD;
      if (a.y > WORLD) a.y -= WORLD;
    }
  }

  private clearFx() {
    this.shots = [];
    this.ebullets = [];
    this.pickups = [];
    this.particles = [];
    this.dmgs = [];
    this.zaps = [];
    this.rings = [];
    this.sweeps = [];
    this.trails = [];
    this.telegraphs = [];
    this.frosts = [];
    this.bannerObj = null;
  }

  /* ============ draw ============ */
  private draw() {
    const ctx = this.ctx;
    const vw = this.vw;
    const vh = this.vh;
    // Bảng màu vũ khí trôi theo thời gian thật nên hiệu ứng luôn đang đổi tông.
    this.wc = weaponPaletteAt(this.weaponSkin.moods, this.paletteT);
    ctx.fillStyle = this.biome.ground[1];
    ctx.fillRect(0, 0, vw, vh);

    // camera
    let cx: number;
    let cy: number;
    if (this.phase === "menu") {
      cx = WORLD / 2 - vw / 2 + Math.cos(this.menuT * 0.12) * 90;
      cy = WORLD / 2 - vh / 2 + Math.sin(this.menuT * 0.09) * 60;
    } else {
      cx = this.px - vw / 2;
      cy = this.py - vh / 2;
    }
    cx = vw >= WORLD ? (WORLD - vw) / 2 : clamp(cx, 0, WORLD - vw);
    cy = vh >= WORLD ? (WORLD - vh) / 2 : clamp(cy, 0, WORLD - vh);
    this.camX = cx;
    this.camY = cy;
    const shx = this.shake > 0 ? rand(-this.shake, this.shake) * 0.6 : 0;
    const shy = this.shake > 0 ? rand(-this.shake, this.shake) * 0.6 : 0;

    ctx.save();
    ctx.translate(-Math.round(cx + shx), -Math.round(cy + shy));

    this.drawGround(ctx, cx, cy, vw, vh);
    this.drawDecors(ctx, cx, cy, vw, vh);
    this.drawTelegraphs(ctx);
    this.drawPickups(ctx, cx, cy, vw, vh);

    // y-sorted entities
    const drawList: { y: number; fn: () => void }[] = [];
    for (const e of this.enemies) {
      if (e.x < cx - 120 || e.x > cx + vw + 120 || e.y < cy - 120 || e.y > cy + vh + 120) continue;
      drawList.push({ y: e.y, fn: () => this.drawEnemy(ctx, e) });
    }
    if (this.phase !== "menu") {
      drawList.push({ y: this.py, fn: () => this.drawPlayer(ctx) });
    } else {
      drawList.push({ y: WORLD / 2, fn: () => this.drawIdleHero(ctx) });
    }
    drawList.sort((a, b) => a.y - b.y);
    for (const d of drawList) d.fn();

    this.drawSweeps(ctx);
    this.drawTrails(ctx);
    this.drawShots(ctx);
    this.drawOrbit(ctx);
    this.drawZaps(ctx);
    this.drawRings(ctx);
    this.drawFrosts(ctx);
    this.drawParticles(ctx, cx, cy, vw, vh);
    this.drawAmbient(ctx, cx, cy, vw, vh);
    this.drawDmgs(ctx);

    ctx.restore();

    // fog / mood
    ctx.fillStyle = this.biome.fog;
    ctx.fillRect(0, 0, vw, vh);

    // hurt vignette
    if (this.hurtFx > 0) {
      const g = ctx.createRadialGradient(vw / 2, vh / 2, Math.min(vw, vh) * 0.32, vw / 2, vh / 2, Math.max(vw, vh) * 0.7);
      g.addColorStop(0, "rgba(255,40,60,0)");
      g.addColorStop(1, `rgba(255,40,60,${(0.5 * this.hurtFx) / 0.45})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, vw, vh);
    }
    if (this.phase === "playing" && this.hp / this.maxHp < 0.3) {
      const p = 0.095 + Math.sin(performance.now() / 240) * 0.035;
      const g = ctx.createRadialGradient(vw / 2, vh / 2, Math.min(vw, vh) * 0.36, vw / 2, vh / 2, Math.max(vw, vh) * 0.72);
      g.addColorStop(0, "rgba(200,20,40,0)");
      g.addColorStop(1, `rgba(200,20,40,${p})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, vw, vh);
    }
  }

  private drawGround(ctx: CanvasRenderingContext2D, cx: number, cy: number, vw: number, vh: number) {
    const T = 32;
    const x0 = Math.max(0, Math.floor(cx / T));
    const y0 = Math.max(0, Math.floor(cy / T));
    const x1 = Math.min(WORLD / T, Math.ceil((cx + vw) / T));
    const y1 = Math.min(WORLD / T, Math.ceil((cy + vh) / T));
    const g = this.biome.ground;
    for (let ty = y0; ty < y1; ty++) {
      for (let tx = x0; tx < x1; tx++) {
        const h = (tx * 73856093) ^ (ty * 19349663);
        const v = ((h >>> 0) % 100) / 100;
        ctx.fillStyle = v < 0.14 ? g[1] : v > 0.86 ? g[2] : g[0];
        ctx.fillRect(tx * T, ty * T, T, T);
        if (v > 0.45 && v < 0.5) {
          ctx.fillStyle = g[1];
          ctx.fillRect(tx * T + ((h >>> 3) % 20) + 4, ty * T + ((h >>> 7) % 20) + 4, 3, 3);
        }
      }
    }
    // Mảng màu lớn giúp từng vùng sinh cảnh có chiều sâu nhưng vẫn giữ nét pixel-art.
    const P = 160;
    const px0 = Math.max(0, Math.floor(cx / P));
    const py0 = Math.max(0, Math.floor(cy / P));
    const px1 = Math.min(Math.ceil(WORLD / P), Math.ceil((cx + vw) / P));
    const py1 = Math.min(Math.ceil(WORLD / P), Math.ceil((cy + vh) / P));
    for (let py = py0; py < py1; py++) {
      for (let px = px0; px < px1; px++) {
        const h = ((px * 83492791) ^ (py * 297657976)) >>> 0;
        if (h % 3 === 0) continue;
        const inset = 18 + (h % 28);
        ctx.fillStyle = hexToRgba(h % 2 ? g[1] : g[2], 0.075);
        ctx.fillRect(px * P + inset, py * P + inset, P - inset * 1.35, P - inset * 1.5);
        ctx.fillStyle = hexToRgba(g[2], 0.11);
        ctx.fillRect(px * P + inset + 10, py * P + inset + 8, 18 + (h % 34), 3);
      }
    }
    // hàng rào biên
    ctx.fillStyle = "#6e441f";
    const post = 48;
    ctx.fillRect(8, 8, WORLD - 16, 6);
    ctx.fillRect(8, WORLD - 14, WORLD - 16, 6);
    ctx.fillRect(8, 8, 6, WORLD - 16);
    ctx.fillRect(WORLD - 14, 8, 6, WORLD - 16);
    ctx.fillStyle = "#8a5a2b";
    for (let i = 0; i < WORLD / post; i++) {
      const p = i * post;
      if (p > cx - 40 && p < cx + vw + 40) {
        ctx.fillRect(p, 2, 8, 16);
        ctx.fillRect(p, WORLD - 18, 8, 16);
      }
      if (p > cy - 40 && p < cy + vh + 40) {
        ctx.fillRect(2, p, 16, 8);
        ctx.fillRect(WORLD - 18, p, 16, 8);
      }
    }
  }

  private drawDecors(ctx: CanvasRenderingContext2D, cx: number, cy: number, vw: number, vh: number) {
    for (const d of this.decors) {
      if (d.x < cx - 60 || d.x > cx + vw + 60 || d.y < cy - 60 || d.y > cy + vh + 60) continue;
      const x = Math.round(d.x);
      const y = Math.round(d.y);
      switch (d.type) {
        case "tuft":
          ctx.fillStyle = d.c1;
          ctx.fillRect(x - 4, y - 6, 3, 7);
          ctx.fillRect(x, y - 9, 3, 10);
          ctx.fillRect(x + 4, y - 5, 3, 6);
          break;
        case "flower": {
          ctx.fillStyle = "#3f7a3a";
          ctx.fillRect(x - 1, y - 6, 3, 7);
          const cols = ["#ff8095", "#ffd94a", "#c08aff"];
          ctx.fillStyle = cols[(x + y) % 3];
          ctx.fillRect(x - 3, y - 10, 7, 6);
          ctx.fillStyle = "#fff3d0";
          ctx.fillRect(x - 1, y - 8, 3, 2);
          break;
        }
        case "stone":
          ctx.fillStyle = "#9a938a";
          ctx.fillRect(x - 7, y - 5, 14, 8);
          ctx.fillStyle = "#b5aea4";
          ctx.fillRect(x - 5, y - 7, 9, 4);
          break;
        case "crystal":
          ctx.fillStyle = hexToRgba("#9be8ff", 0.9);
          ctx.fillRect(x - 3, y - 14, 6, 14);
          ctx.fillStyle = hexToRgba("#d8fbff", 0.9);
          ctx.fillRect(x - 1, y - 12, 2, 8);
          break;
        case "snowpile":
          ctx.fillStyle = "#f4fafc";
          ctx.fillRect(x - 10, y - 4, 20, 6);
          ctx.fillRect(x - 6, y - 7, 12, 4);
          break;
        case "tree":
          ctx.fillStyle = "#6e4a26";
          ctx.fillRect(x - 2, y - 10, 5, 12);
          ctx.fillStyle = "#2f7a4a";
          ctx.fillRect(x - 10, y - 26, 20, 12);
          ctx.fillRect(x - 7, y - 33, 14, 9);
          ctx.fillStyle = "#3f9a5e";
          ctx.fillRect(x - 5, y - 30, 8, 5);
          break;
        case "cactus":
          ctx.fillStyle = "#4a9a4f";
          ctx.fillRect(x - 3, y - 20, 7, 20);
          ctx.fillRect(x - 9, y - 14, 6, 4);
          ctx.fillRect(x + 4, y - 17, 6, 4);
          ctx.fillStyle = "#ffd94a";
          ctx.fillRect(x - 1, y - 23, 3, 3);
          break;
        case "mushroom":
          ctx.fillStyle = "#e8dcc0";
          ctx.fillRect(x - 2, y - 6, 4, 6);
          ctx.fillStyle = "#d95763";
          ctx.fillRect(x - 5, y - 11, 10, 6);
          ctx.fillStyle = "#fff3d0";
          ctx.fillRect(x - 3, y - 9, 2, 2);
          break;
        case "puddle":
          ctx.fillStyle = hexToRgba("#4f8fbf", 0.55);
          ctx.fillRect(x - 11, y - 4, 22, 8);
          ctx.fillStyle = hexToRgba("#9bd0f0", 0.5);
          ctx.fillRect(x - 7, y - 2, 8, 3);
          break;
        case "crack":
          ctx.fillStyle = hexToRgba("#1c100c", 0.7);
          ctx.fillRect(x - 10, y, 8, 3);
          ctx.fillRect(x - 3, y - 3, 9, 3);
          ctx.fillRect(x + 4, y + 2, 8, 3);
          break;
        case "shell":
          ctx.fillStyle = "#f0d8c0";
          ctx.fillRect(x - 4, y - 4, 8, 6);
          ctx.fillStyle = "#e0a8a0";
          ctx.fillRect(x - 2, y - 2, 4, 3);
          break;
        case "bone":
          ctx.fillStyle = "#e8e0d0";
          ctx.fillRect(x - 8, y - 2, 16, 4);
          ctx.fillRect(x - 10, y - 4, 4, 8);
          ctx.fillRect(x + 6, y - 4, 4, 8);
          break;
        case "vine":
          ctx.fillStyle = "#3f7a3a";
          ctx.fillRect(x - 1, y - 22, 3, 22);
          ctx.fillStyle = "#5aa04f";
          ctx.fillRect(x - 7, y - 18, 6, 3);
          ctx.fillRect(x + 2, y - 13, 6, 3);
          ctx.fillRect(x - 7, y - 8, 6, 3);
          break;
        case "coral":
          ctx.fillStyle = "#e8607f";
          ctx.fillRect(x - 2, y - 14, 4, 14);
          ctx.fillRect(x - 8, y - 10, 4, 10);
          ctx.fillRect(x + 4, y - 12, 4, 12);
          ctx.fillStyle = "#ffa0b8";
          ctx.fillRect(x - 1, y - 16, 2, 3);
          ctx.fillRect(x + 5, y - 14, 2, 3);
          break;
        case "obelisk":
          ctx.fillStyle = "#6a6258";
          ctx.fillRect(x - 6, y - 30, 12, 30);
          ctx.fillStyle = "#8a8177";
          ctx.fillRect(x - 4, y - 28, 5, 26);
          ctx.fillStyle = hexToRgba("#9be8ff", 0.75);
          ctx.fillRect(x - 2, y - 22, 4, 6);
          break;
        default:
          // cloudpuff
          ctx.fillStyle = hexToRgba("#ffffff", 0.75);
          ctx.fillRect(x - 12, y - 4, 24, 8);
          ctx.fillRect(x - 7, y - 8, 14, 6);
          break;
      }
    }
  }

  private drawPickups(ctx: CanvasRenderingContext2D, cx: number, cy: number, vw: number, vh: number) {
    for (const p of this.pickups) {
      if (p.x < cx - 40 || p.x > cx + vw + 40 || p.y < cy - 40 || p.y > cy + vh + 40) continue;
      const bob = Math.sin(p.t * 5) * 3;
      const y = Math.round(p.y + bob);
      const x = Math.round(p.x);
      ctx.fillStyle = "rgba(0,0,0,0.2)";
      ctx.fillRect(x - 5, Math.round(p.y) + 7, 10, 3);
      if (p.kind === "xp") {
        ctx.drawImage(getItemSprite("gem"), x - 7, y - 8, 14, 14);
      } else if (p.kind === "shard" && p.skill) {
        const [bright, dark] = this.shardColors(p.skill);
        const spin = Math.sin(p.t * 3) * 0.5;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(spin);
        ctx.fillStyle = hexToRgba(bright, 0.22);
        ctx.beginPath();
        ctx.arc(0, 0, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.drawImage(getShardSprite(bright, dark), -8, -8, 16, 16);
        ctx.restore();
      } else if (p.kind === "core") {
        const pulse = 1 + Math.sin(p.t * 7) * 0.14;
        const s = 20 * pulse;
        const beacon = ctx.createLinearGradient(x, y - 52, x, y + 5);
        beacon.addColorStop(0, "rgba(255,157,46,0)");
        beacon.addColorStop(1, "rgba(255,157,46,0.28)");
        ctx.fillStyle = beacon;
        ctx.fillRect(x - 4, y - 52, 8, 56);
        ctx.drawImage(getItemSprite("core"), x - s / 2, y - s / 2 - 2, s, s);
      } else {
        ctx.drawImage(getItemSprite("heart"), x - 9, y - 8, 18, 16);
      }
    }
  }

  private drawEnemy(ctx: CanvasRenderingContext2D, e: Enemy) {
    const scale = e.boss ? e.boss.scale : e.elite ? 4 : 3;
    const spr = getMobSprite(e.kind, Math.floor(e.frameT * 4) % 2, e.colors);
    const w = spr.width * scale;
    const h = spr.height * scale;
    const x = Math.round(e.x - w / 2);
    let y = Math.round(e.y - h + 8);
    if (e.boss) {
      // aura
      const R = w * 0.9;
      const g = ctx.createRadialGradient(e.x, e.y - h / 2, 8, e.x, e.y - h / 2, R);
      g.addColorStop(0, hexToRgba(e.colors.M, 0.3));
      g.addColorStop(1, hexToRgba(e.colors.M, 0));
      ctx.fillStyle = g;
      ctx.fillRect(e.x - R, e.y - h / 2 - R, R * 2, R * 2);
      y -= Math.abs(Math.sin(e.frameT * 2)) * 4;
    }
    if (e.state === "tele") y -= 3;
    // bóng
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ctx.beginPath();
    ctx.ellipse(e.x, e.y + 8, w * 0.34, w * 0.13, 0, 0, Math.PI * 2);
    ctx.fill();
    if (e.elite && !e.boss) {
      ctx.strokeStyle = hexToRgba("#ffd94a", 0.8);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(e.x, e.y + 8, w * 0.42, w * 0.17, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.drawImage(spr, x, y, w, h);
    if (e.boss) {
      const crown = getItemSprite("crown");
      const cw = crown.width * (scale * 0.55);
      ctx.drawImage(crown, Math.round(e.x - cw / 2), Math.round(y - crown.height * (scale * 0.55)) + 6, cw, crown.height * (scale * 0.55));
    }
    // hiệu ứng flash / slow
    if (e.flash > 0) {
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = Math.min(0.8, e.flash * 7);
      ctx.drawImage(spr, x, y, w, h);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
    }
    if (e.slow > 0) {
      ctx.fillStyle = "rgba(127,212,255,0.3)";
      ctx.fillRect(x, y, w, h);
    }
    // hp bar quái thường
    if (!e.boss && e.hp < e.maxHp) {
      const bw = w * 0.8;
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(e.x - bw / 2, y - 8, bw, 4);
      ctx.fillStyle = e.elite ? "#ffd94a" : "#7ce06a";
      ctx.fillRect(e.x - bw / 2, y - 8, bw * clamp(e.hp / e.maxHp, 0, 1), 4);
    }
  }

  private drawPlayer(ctx: CanvasRenderingContext2D) {
    if (this.iframes > 0 && Math.floor(this.iframes * 12) % 2 === 0) return;
    const spr = getHeroSprite(this.moving ? Math.floor(this.walkT * 9) % 2 : 0, this.heroSkin);
    const scale = 3;
    const bob = this.moving ? Math.abs(Math.sin(this.walkT * 9)) * 2.5 : Math.sin(performance.now() / 450) * 1.2;
    const w = spr.width * scale;
    const h = spr.height * scale;
    const x = Math.round(this.px);
    const y = Math.round(this.py - h + 10 - bob);
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.beginPath();
    ctx.ellipse(x, this.py + 9, 15, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(this.face, 1);
    ctx.drawImage(spr, -w / 2, 0, w, h);
    ctx.restore();
  }

  private drawIdleHero(ctx: CanvasRenderingContext2D) {
    const spr = getHeroSprite(0, this.heroSkin);
    const scale = 3;
    const bob = Math.sin(performance.now() / 450) * 1.4;
    const w = spr.width * scale;
    const h = spr.height * scale;
    const x = WORLD / 2;
    const y = WORLD / 2 - h + 10 - bob;
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.beginPath();
    ctx.ellipse(x, WORLD / 2 + 9, 15, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.drawImage(spr, x - w / 2, y, w, h);
  }

  private drawTrails(ctx: CanvasRenderingContext2D) {
    for (const trail of this.trails) {
      const alpha = clamp(trail.life / trail.maxLife, 0, 1);
      const size = Math.max(2, trail.size * alpha);
      ctx.fillStyle = hexToRgba(trail.color, alpha * 0.2);
      ctx.fillRect(trail.x - size, trail.y - size, size * 2, size * 2);
      ctx.fillStyle = hexToRgba(trail.color, alpha * 0.62);
      ctx.fillRect(trail.x - size * 0.45, trail.y - size * 0.45, size * 0.9, size * 0.9);
    }
  }

  private drawTelegraphs(ctx: CanvasRenderingContext2D) {
    for (const telegraph of this.telegraphs) {
      const alpha = telegraphAlpha(telegraph.life, telegraph.maxLife);
      const progress = 1 - telegraph.life / telegraph.maxLife;
      const radius = telegraph.radius * (0.72 + progress * 0.28);
      ctx.save();
      ctx.strokeStyle = hexToRgba(telegraph.color, alpha);
      ctx.fillStyle = hexToRgba(telegraph.color, alpha * 0.13);
      ctx.lineWidth = telegraph.kind === "slam" ? 5 : 4;
      ctx.setLineDash(telegraph.kind === "burst" ? [10, 8] : [18, 10]);
      ctx.beginPath();
      ctx.arc(telegraph.x, telegraph.y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      if (telegraph.kind === "charge" && telegraph.tx !== undefined && telegraph.ty !== undefined) {
        ctx.setLineDash([16, 12]);
        ctx.lineWidth = 10;
        ctx.strokeStyle = hexToRgba(telegraph.color, alpha * 0.22);
        ctx.beginPath();
        ctx.moveTo(telegraph.x, telegraph.y);
        ctx.lineTo(telegraph.tx, telegraph.ty);
        ctx.stroke();
        ctx.lineWidth = 2;
        ctx.strokeStyle = hexToRgba("#fff3d0", alpha * 0.82);
        ctx.stroke();
      } else if (telegraph.kind === "slam") {
        ctx.setLineDash([]);
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(telegraph.x - radius * 0.45, telegraph.y);
        ctx.lineTo(telegraph.x + radius * 0.45, telegraph.y);
        ctx.moveTo(telegraph.x, telegraph.y - radius * 0.45);
        ctx.lineTo(telegraph.x, telegraph.y + radius * 0.45);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  private drawShots(ctx: CanvasRenderingContext2D) {
    const wc = this.wc;
    for (const s of this.shots) {
      const x = Math.round(s.x);
      const y = Math.round(s.y);
      if (s.kind === "bolt") {
        const size = 9 * s.fx;
        const thick = 2 + s.fx;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(Math.atan2(s.vy, s.vx));
        if (s.fx >= 1.5) {
          ctx.fillStyle = hexToRgba(s.evolved ? wc.glow : wc.bolt, 0.22);
          ctx.fillRect(-size * 1.25, -thick * 1.9, size * 2.5, thick * 3.8);
        }
        ctx.fillStyle = s.evolved ? wc.glow : wc.bolt;
        ctx.fillRect(-size, -thick, size * 2, thick * 2);
        ctx.fillStyle = s.evolved ? "#fff3d0" : wc.core;
        ctx.fillRect(-size + 3, -thick * 0.5, size * 1.4, thick);
        if (s.evolved) {
          ctx.fillStyle = "#ff8080";
          ctx.fillRect(size - 6, -6, 6, 12);
        }
        ctx.restore();
      } else {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(s.spin);
        const L = 14 * s.fx;
        const thick = 2 + s.fx;
        if (s.fx >= 1.5) {
          ctx.fillStyle = hexToRgba(s.evolved ? wc.glow : wc.blade, 0.2);
          ctx.beginPath();
          ctx.arc(0, 0, L * 0.95, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = s.evolved ? wc.glow : wc.blade;
        ctx.fillRect(-L, -thick, L, thick * 2);
        ctx.fillRect(3, -L, L, thick * 2);
        ctx.fillStyle = wc.blade2;
        ctx.fillRect(-4, -4, 8, 8);
        ctx.restore();
      }
    }
    // enemy bullets
    for (const b of this.ebullets) {
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.beginPath();
      ctx.arc(b.x + 2, b.y + 3, b.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.75)";
      ctx.beginPath();
      ctx.arc(b.x - 2, b.y - 2, b.r * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawOrbit(ctx: CanvasRenderingContext2D) {
    const wc = this.wc;
    const t = performance.now() / 90;
    for (const p of this.orbitPts) {
      if (p.ev || p.fx >= 1.5) {
        ctx.fillStyle = hexToRgba(p.ev ? wc.glow : wc.aura, 0.2);
        ctx.beginPath();
        ctx.arc(p.x, p.y, 10 * p.fx, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(t + p.x * 0.04);
      const L = 10 * p.fx;
      const thick = 2 + p.fx;
      ctx.fillStyle = wc.blade;
      ctx.fillRect(-L, -thick, L * 2, thick * 2);
      ctx.fillRect(-thick, -L, thick * 2, L * 2);
      ctx.fillStyle = wc.blade2;
      ctx.fillRect(-L + 3, -thick * 0.5, L * 2 - 6, thick);
      ctx.restore();
    }
  }

  private drawZaps(ctx: CanvasRenderingContext2D) {
    for (const z of this.zaps) {
      const a = clamp(z.life / 0.16, 0, 1);
      ctx.strokeStyle = `rgba(92,142,255,${a * 0.42})`;
      ctx.lineWidth = 12;
      ctx.beginPath();
      ctx.moveTo(z.pts[0].x, z.pts[0].y);
      for (let i = 1; i < z.pts.length; i++) ctx.lineTo(z.pts[i].x, z.pts[i].y);
      ctx.stroke();
      ctx.strokeStyle = `rgba(207,239,255,${a})`;
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  }

  private drawRings(ctx: CanvasRenderingContext2D) {
    for (const r of this.rings) {
      const a = clamp(r.life * 2.4, 0, 1);
      // Bậc càng cao vòng càng nhiều lớp: một quầng ngoài mờ và các vòng trong đậm dần.
      for (let layer = r.layers - 1; layer >= 0; layer--) {
        const spread = layer * 7;
        ctx.strokeStyle = hexToRgba(r.color, a * 0.9 * (layer === 0 ? 1 : 0.32 / layer));
        ctx.lineWidth = r.width + layer * 3;
        ctx.beginPath();
        ctx.arc(r.x, r.y, Math.max(1, r.r + spread), 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  /**
   * Vệt quét rẻ quạt của hào quang: bậc 1 chỉ là nửa vòng trước mặt, bậc cao hơn
   * khép kín 360 độ và có thêm quầng sáng bên trong.
   */
  private drawSweeps(ctx: CanvasRenderingContext2D) {
    for (const s of this.sweeps) {
      const k = clamp(s.life / s.maxLife, 0, 1);
      const radius = s.radius * (0.82 + (1 - k) * 0.18);
      const from = s.angle - s.arc / 2;
      const to = s.angle + s.arc / 2;
      ctx.save();
      const grad = ctx.createRadialGradient(s.x, s.y, Math.max(1, radius * 0.15), s.x, s.y, radius);
      grad.addColorStop(0, hexToRgba(s.glow, 0.05 * k));
      grad.addColorStop(0.62, hexToRgba(s.color, 0.2 * k * s.fx));
      grad.addColorStop(1, hexToRgba(s.color, 0.04 * k));
      ctx.fillStyle = grad;
      ctx.beginPath();
      if (s.arc >= Math.PI * 2) {
        ctx.arc(s.x, s.y, radius, 0, Math.PI * 2);
      } else {
        ctx.moveTo(s.x, s.y);
        ctx.arc(s.x, s.y, radius, from, to);
        ctx.closePath();
      }
      ctx.fill();
      ctx.strokeStyle = hexToRgba(s.glow, 0.55 * k);
      ctx.lineWidth = 2 + s.fx;
      ctx.beginPath();
      ctx.arc(s.x, s.y, radius, from, to);
      ctx.stroke();
      // Từ bậc 4 thêm những nan quạt sáng cho đòn quét dày và có nhịp hơn.
      if (s.fx >= 1.5) {
        const spokes = Math.round(4 + s.fx * 3);
        ctx.strokeStyle = hexToRgba(s.glow, 0.3 * k);
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < spokes; i++) {
          const a = from + ((to - from) * i) / Math.max(1, spokes - 1);
          ctx.moveTo(s.x + Math.cos(a) * radius * 0.42, s.y + Math.sin(a) * radius * 0.42);
          ctx.lineTo(s.x + Math.cos(a) * radius, s.y + Math.sin(a) * radius);
        }
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  private drawFrosts(ctx: CanvasRenderingContext2D) {
    for (const f of this.frosts) {
      const y = f.y + (f.ty - f.y) * f.t;
      // bóng mục tiêu
      ctx.strokeStyle = "rgba(127,212,255,0.6)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(f.x, f.ty + 6, 12, 5, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.save();
      ctx.translate(f.x, y);
      ctx.rotate(f.t * 6);
      ctx.fillStyle = "#7fd4ff";
      ctx.fillRect(-5, -9, 10, 18);
      ctx.fillRect(-9, -5, 18, 10);
      ctx.fillStyle = "#d8fbff";
      ctx.fillRect(-2, -6, 4, 12);
      ctx.restore();
    }
  }

  private drawParticles(ctx: CanvasRenderingContext2D, cx: number, cy: number, vw: number, vh: number) {
    for (const p of this.particles) {
      if (p.x < cx - 20 || p.x > cx + vw + 20 || p.y < cy - 20 || p.y > cy + vh + 20) continue;
      ctx.globalAlpha = clamp(p.life / p.maxLife, 0, 1);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  private drawAmbient(ctx: CanvasRenderingContext2D, cx: number, cy: number, vw: number, vh: number) {
    const col = this.biome.ambient.color;
    const type = this.biome.ambient.type;
    for (const a of this.ambients) {
      if (a.x < cx - 20 || a.x > cx + vw + 20 || a.y < cy - 20 || a.y > cy + vh + 20) continue;
      const twinkles = type === "firefly" || type === "sparkle" || type === "wisp" || type === "spore";
      const tw = twinkles ? 0.4 + 0.6 * Math.abs(Math.sin(a.ph * 2)) : 0.7;
      ctx.globalAlpha = 0.65 * tw;
      ctx.fillStyle = col;
      const s = type === "mist" ? 26 : type === "petal" ? 5 : type === "snow" || type === "ash" ? 4 : 3;
      if (type === "petal") {
        // Cánh hoa vẽ hơi dẹt và nghiêng theo pha dao động.
        ctx.fillRect(a.x - s / 2, a.y - s / 4 + Math.sin(a.ph) * 1.5, s, s / 2);
      } else {
        ctx.fillRect(a.x - s / 2, a.y - s / 2, s, s);
      }
    }
    ctx.globalAlpha = 1;
  }

  private drawDmgs(ctx: CanvasRenderingContext2D) {
    for (const d of this.dmgs) {
      const a = clamp(d.life / 0.75, 0, 1);
      ctx.globalAlpha = a;
      ctx.font = `700 ${d.size}px "Chakra Petch", sans-serif`;
      ctx.textAlign = "center";
      ctx.lineWidth = 4;
      ctx.strokeStyle = "rgba(20,10,5,0.85)";
      ctx.strokeText(d.text, d.x, d.y);
      ctx.fillStyle = d.color;
      ctx.fillText(d.text, d.x, d.y);
    }
    ctx.globalAlpha = 1;
  }
}
