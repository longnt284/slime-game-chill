import { sfx } from "./audio";
import { getHeroSprite, getMobSprite, getItemSprite } from "./sprites";
import type { MobColors, MobKind } from "./sprites";
import {
  BIOMES,
  SKILLS,
  PASSIVES,
  WORLD,
  TOTAL_STAGES,
  biomeOf,
  makeBoss,
  mulberry32,
  xpNeed,
  mobHp,
  mobDmg,
  mobSpeed,
  gemValue,
  waveQuota,
  skillDef,
  passiveDef,
  ARCH_NAMES,
} from "./data";
import type { BossInfo, Choice, SkillId, PassiveId, Biome } from "./data";

export type Phase = "menu" | "playing" | "paused" | "levelup" | "stageclear" | "gameover" | "victory";

export interface HudSkill {
  id: string;
  name: string;
  icon: string;
  lv: number;
  evolved: boolean;
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
  bossName?: string;
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
  kind: "xp" | "core" | "heart";
  val: number;
  t: number;
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
}
interface Frost {
  x: number;
  y: number;
  ty: number;
  t: number;
  dur: number;
  dmg: number;
  aoe: number;
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

  // progression
  private stage = 1;
  private level = 1;
  private xp = 0;
  private pendingLv = 0;
  private kills = 0;
  private cores = 0;
  private totalTime = 0;
  private stageTime = 0;

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
  private cds: Record<SkillId, number> = { bolt: 0, orbit: 0, aura: 0, zap: 0, boom: 0, frost: 0 };
  private orbitT = 0;
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
    this.stage = 1;
    this.level = 1;
    this.xp = 0;
    this.pendingLv = 0;
    this.kills = 0;
    this.cores = 0;
    this.totalTime = 0;
    this.passives = { speed: 0, heart: 0, power: 0, haste: 0, magnet: 0, regen: 0 };
    (Object.keys(this.skills) as SkillId[]).forEach((k) => {
      this.skills[k] = { lv: 0, evolved: false };
    });
    this.skills.bolt = { lv: 1, evolved: false };
    this.maxHp = 100;
    this.hp = 100;
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
  nextStage() {
    this.stage++;
    this.buildStage();
    this.px = WORLD / 2;
    this.py = WORLD / 2;
    this.enemies = [];
    this.shots = [];
    this.ebullets = [];
    this.frosts = [];
    this.pickups = [];
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

  choose(i: number) {
    const c = this.choices[i];
    if (!c) return;
    sfx.click();
    if (c.kind === "new") {
      this.skills[c.id as SkillId].lv = 1;
    } else if (c.kind === "up") {
      this.skills[c.id as SkillId].lv++;
    } else if (c.kind === "evolve") {
      this.skills[c.id as SkillId].evolved = true;
      this.cores = Math.max(0, this.cores - 1);
      sfx.evolve();
      this.ring(this.px, this.py, 10, 160, 0.6, "#ffd94a", 6);
      this.burst(this.px, this.py, 26, "#ffd94a", 220);
      this.shake = Math.max(this.shake, 6);
    } else if (c.kind === "passive") {
      this.passives[c.id as PassiveId]++;
      if (c.id === "heart") {
        this.maxHp += 22;
        this.hp = clamp(this.hp + 22, 1, this.maxHp);
      }
    } else if (c.kind === "heal") {
      this.hp = clamp(this.hp + this.maxHp * 0.5, 1, this.maxHp);
      sfx.heal();
    }
    this.pendingLv--;
    if (this.pendingLv > 0) {
      this.rollChoices();
      this.pushHud();
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
    return { stage: this.stage, kills: this.kills, time: fmtTime(this.totalTime), level: this.level };
  }

  private pushHud() {
    const boss = this.enemies.find((e) => e.boss);
    const skills: HudSkill[] = (Object.keys(this.skills) as SkillId[])
      .filter((id) => this.skills[id].lv > 0)
      .map((id) => {
        const d = skillDef(id);
        const s = this.skills[id];
        return { id, icon: d.icon, lv: s.lv, evolved: s.evolved, name: s.evolved ? d.evoName : d.name };
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
  private power() {
    return 1 + 0.14 * this.passives.power;
  }
  private cdr() {
    return Math.pow(0.92, this.passives.haste);
  }
  private magnetR() {
    return 95 * (1 + 0.4 * this.passives.magnet);
  }
  private moveSpeed() {
    return 252 * (1 + 0.09 * this.passives.speed);
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
  private makeEnemy(kind: MobKind, colors: MobColors, x: number, y: number, stage: number, wave: number, elite: boolean): Enemy {
    const hpv = mobHp(stage, wave) * (elite ? 6 : 1);
    return {
      kind,
      colors,
      x: clamp(x, 40, WORLD - 40),
      y: clamp(y, 40, WORLD - 40),
      hp: hpv,
      maxHp: hpv,
      r: elite ? 20 : 15,
      speed: mobSpeed(stage) * (elite ? 0.85 : 1) * rand(0.88, 1.12),
      dmg: mobDmg(stage) * (elite ? 1.6 : 1),
      xp: gemValue(stage) * (elite ? 6 : 1),
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
    const altKind = BIOMES[(BIOMES.indexOf(this.biome) + 9) % 10].mobKind;
    for (let i = 0; i < size; i++) {
      const a = baseA + rand(-0.7, 0.7);
      const d = rand(460, 640);
      const elite = Math.random() < 0.035;
      const kind = kind2 ? altKind : this.biome.mobKind;
      const col = kind === this.biome.mobKind ? this.biome.mob : BIOMES[(BIOMES.indexOf(this.biome) + 9) % 10].mob;
      const e = this.makeEnemy(kind, col, this.px + Math.cos(a) * d, this.py + Math.sin(a) * d, this.stage, Math.min(this.wave, 3), elite);
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
      xp: gemValue(this.stage) * 30,
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
      this.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, life: rand(0.3, 0.7), maxLife: 0.7, size: rand(2, 5), color, grav: 260 });
    }
  }
  private puff(x: number, y: number, color: string) {
    this.burst(x, y, 6, color, 90);
  }
  private ring(x: number, y: number, r: number, maxR: number, life: number, color: string, width: number) {
    this.rings.push({ x, y, r, maxR, life, color, width });
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
    this.dmgNum(e.x, e.y - e.r, String(d), e.boss ? "#ffd94a" : "#ffffff", e.boss ? 19 : 14);
    if (e.hp <= 0) this.killEnemy(e);
  }

  private killEnemy(e: Enemy) {
    if (e.dead) return;
    e.dead = true;
    this.kills++;
    this.burst(e.x, e.y, e.boss ? 46 : 10, e.colors.M, e.boss ? 260 : 150);
    this.burst(e.x, e.y, e.boss ? 20 : 0, e.colors.X, 200);
    sfx.kill();
    if (e.boss) {
      this.onBossKilled(e);
      return;
    }
    this.dropPickup(e.x, e.y, "xp", e.xp);
    if (e.elite) {
      if (Math.random() < 0.65) this.dropPickup(e.x + rand(-14, 14), e.y + rand(-10, 10), "core", 1);
      this.dropPickup(e.x, e.y + 12, "xp", e.xp);
    } else if (Math.random() < 0.02) {
      this.dropPickup(e.x, e.y, "heart", 20);
    }
    if (this.wave < 4) {
      this.waveKills++;
      if (this.waveKills >= waveQuota(this.stage, this.wave)) {
        this.wave++;
        this.waveKills = 0;
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

  private dropPickup(x: number, y: number, kind: Pickup["kind"], val: number) {
    if (this.pickups.length > 220) return;
    this.pickups.push({ x: x + rand(-8, 8), y: y + rand(-8, 8), vx: rand(-30, 30), vy: rand(-50, -20), kind, val, t: Math.random() * 2 });
  }

  private onBossKilled(e: Enemy) {
    this.hitStop = 0.14;
    this.shake = 16;
    sfx.bossDie();
    this.cores++;
    this.dropPickup(e.x, e.y, "core", 1);
    for (let i = 0; i < 8; i++) this.dropPickup(e.x + rand(-50, 50), e.y + rand(-50, 50), "xp", Math.ceil(e.xp / 6));
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
      this.setPhase("gameover", { stats: this.stats() });
      const best = parseInt(localStorage.getItem("tvqv_best") || "0", 10);
      if (this.stage > best) localStorage.setItem("tvqv_best", String(this.stage));
    }
    this.pushHud();
  }

  /* ============ choices ============ */
  private rollChoices() {
    const pool: { c: Choice; w: number }[] = [];
    // tiến hóa (ưu tiên)
    const evos: Choice[] = [];
    if (this.cores > 0) {
      (Object.keys(this.skills) as SkillId[]).forEach((id) => {
        const s = this.skills[id];
        if (s.lv >= 5 && !s.evolved) {
          const d = skillDef(id);
          evos.push({ kind: "evolve", id, name: d.evoName, desc: d.evoDesc, icon: d.icon, tag: "TIẾN HÓA" });
        }
      });
    }
    (Object.keys(this.skills) as SkillId[]).forEach((id) => {
      const s = this.skills[id];
      if (s.lv > 0 && s.lv < 8) {
        const d = skillDef(id);
        pool.push({ c: { kind: "up", id, name: s.evolved ? d.evoName : d.name, desc: d.desc, icon: d.icon, tag: `Cấp ${s.lv} → ${s.lv + 1}` }, w: 3 });
      }
    });
    (Object.keys(this.passives) as PassiveId[]).forEach((id) => {
      if (this.passives[id] < 5) {
        const d = passiveDef(id);
        pool.push({ c: { kind: "passive", id, name: d.name, desc: d.desc, icon: d.icon, tag: `Cấp ${this.passives[id]} → ${this.passives[id] + 1}` }, w: 2 });
      }
    });
    const owned = (Object.keys(this.skills) as SkillId[]).filter((k) => this.skills[k].lv > 0).length;
    if (owned < 6) {
      SKILLS.filter((s) => this.skills[s.id].lv === 0).forEach((s) => {
        pool.push({ c: { kind: "new", id: s.id, name: s.name, desc: s.desc, icon: s.icon, tag: "KỸ NĂNG MỚI" }, w: 4 });
      });
    }
    // shuffle weighted
    const picks: Choice[] = [];
    const ev = [...evos].sort(() => Math.random() - 0.5);
    while (picks.length < 3 && ev.length) picks.push(ev.pop()!);
    const bag = [...pool];
    while (picks.length < 3 && bag.length) {
      const total = bag.reduce((s, b) => s + b.w, 0);
      let r = Math.random() * total;
      let idx = 0;
      for (let i = 0; i < bag.length; i++) {
        r -= bag[i].w;
        if (r <= 0) {
          idx = i;
          break;
        }
      }
      picks.push(bag[idx].c);
      bag.splice(idx, 1);
    }
    if (picks.length === 0) picks.push({ kind: "heal", id: "heal", name: "Bữa Ăn Thịnh Soạn", desc: "Hồi 50% máu tối đa", icon: "heart", tag: "HỒI PHỤC" });
    this.choices = picks;
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

  private fireSkills(dt: number) {
    const P = this.power();
    const C = this.cdr();
    (Object.keys(this.cds) as SkillId[]).forEach((k) => (this.cds[k] = Math.max(0, this.cds[k] - dt)));
    this.orbitT += dt * 1.5;

    // ---- BOLT ----
    const bolt = this.skills.bolt;
    if (bolt.lv > 0 && this.cds.bolt <= 0) {
      const targets = this.nearestEnemies(6, 560);
      if (targets.length) {
        const lv = bolt.lv;
        const ev = bolt.evolved;
        const count = 1 + (lv >= 3 ? 1 : 0) + (lv >= 6 ? 1 : 0) + (ev ? 2 : 0);
        const dmg = (8 + lv * 3.5) * (ev ? 2.6 : 1) * P;
        for (let i = 0; i < count; i++) {
          const t = targets[i % targets.length];
          const base = Math.atan2(t.y - this.py, t.x - this.px) + (i - (count - 1) / 2) * 0.16;
          const sp = 480;
          this.shots.push({
            kind: "bolt", x: this.px, y: this.py - 14, vx: Math.cos(base) * sp, vy: Math.sin(base) * sp,
            dmg, pierce: lv >= 5 || ev ? 99 : 0, life: 1.4, homing: ev, r: ev ? 13 : 8, spin: 0, t: 0, dur: 1, sx: 0, sy: 0, tx: 0, ty: 0, evolved: ev, hitIds: new Set(),
          });
        }
        this.cds.bolt = Math.max(0.24, 0.8 - lv * 0.05) * C;
        sfx.shoot();
      }
    }

    // ---- ZAP ----
    const zap = this.skills.zap;
    if (zap.lv > 0 && this.cds.zap <= 0) {
      const lv = zap.lv;
      const ev = zap.evolved;
      const count = 1 + Math.floor(lv / 2) + (ev ? 3 : 0);
      const dmg = (14 + lv * 6) * (ev ? 2.2 : 1) * P;
      const targets = this.nearestEnemies(count + 8, 540);
      if (targets.length) {
        const chosen: Enemy[] = [];
        const poolZ = [...targets];
        for (let i = 0; i < Math.min(count, poolZ.length); i++) {
          const idx = Math.floor(Math.random() * poolZ.length);
          chosen.push(poolZ.splice(idx, 1)[0]);
        }
        for (const t of chosen) {
          this.strikeZap(t, dmg, this.px, this.py - 20);
          if (ev) {
            let from = t;
            let chainDmg = dmg * 0.6;
            for (let c = 0; c < 6; c++) {
              const next = this.enemies.filter((e) => !e.dead && e !== from && !chosen.includes(e) && dist2(e.x, e.y, from.x, from.y) < 170 * 170)[0];
              if (!next) break;
              this.strikeZap(next, chainDmg, from.x, from.y);
              chainDmg *= 0.8;
              from = next;
            }
          }
        }
        this.cds.zap = Math.max(0.5, 1.5 - lv * 0.08) * C;
        sfx.zap();
        this.shake = Math.max(this.shake, 2);
      }
    }

    // ---- AURA ----
    const aura = this.skills.aura;
    if (aura.lv > 0 && this.cds.aura <= 0) {
      const lv = aura.lv;
      const ev = aura.evolved;
      const radius = 85 + lv * 12 + (ev ? 55 : 0);
      const dmg = (6 + lv * 3) * (ev ? 2.4 : 1) * P;
      let hitAny = false;
      for (const e of this.enemies) {
        if (!e.dead && dist2(e.x, e.y, this.px, this.py) < (radius + e.r) * (radius + e.r)) {
          this.damageEnemy(e, dmg);
          hitAny = true;
        }
      }
      this.ring(this.px, this.py, 20, radius, 0.35, ev ? "#ffb03e" : "#ffe08a", ev ? 6 : 4);
      if (hitAny) sfx.hit();
      this.cds.aura = Math.max(0.45, 1.0 - lv * 0.05) * C;
    }

    // ---- BOOM ----
    const boom = this.skills.boom;
    if (boom.lv > 0 && this.cds.boom <= 0) {
      const lv = boom.lv;
      const ev = boom.evolved;
      const t = this.nearestEnemies(1, 620)[0];
      if (t) {
        const n = 1 + (lv >= 4 ? 1 : 0) + (ev ? 1 : 0);
        const dmg = (12 + lv * 5) * (ev ? 2.3 : 1) * P;
        for (let i = 0; i < n; i++) {
          const off = (i - (n - 1) / 2) * 0.5;
          const a = Math.atan2(t.y - this.py, t.x - this.px) + off;
          const d = clamp(Math.sqrt(dist2(t.x, t.y, this.px, this.py)), 120, 420);
          this.shots.push({
            kind: "boom", x: this.px, y: this.py - 10, vx: 0, vy: 0, dmg, pierce: 99, life: 3, homing: false,
            r: ev ? 22 : 15, spin: Math.random() * 6, t: 0, dur: 0.5, sx: this.px, sy: this.py - 10,
            tx: this.px + Math.cos(a) * d, ty: this.py + Math.sin(a) * d, evolved: ev, hitIds: new Set(),
          });
        }
        this.cds.boom = Math.max(0.7, 1.7 - lv * 0.09) * C;
        sfx.throwSound();
      }
    }

    // ---- FROST ----
    const frost = this.skills.frost;
    if (frost.lv > 0 && this.cds.frost <= 0) {
      const lv = frost.lv;
      const ev = frost.evolved;
      const targets = this.nearestEnemies(14, 600);
      if (targets.length) {
        const count = 1 + Math.floor(lv / 2) + (ev ? 3 : 0);
        const dmg = (10 + lv * 4) * (ev ? 2.2 : 1) * P;
        const aoe = 70 + lv * 6 + (ev ? 45 : 0);
        for (let i = 0; i < count; i++) {
          const t = targets[Math.floor(Math.random() * targets.length)];
          this.frosts.push({ x: t.x + rand(-20, 20), y: t.y - 300, ty: t.y, t: 0, dur: 0.45, dmg, aoe });
        }
        this.cds.frost = Math.max(0.6, 1.4 - lv * 0.06) * C;
        sfx.frost();
      }
    }
  }

  private strikeZap(e: Enemy, dmg: number, ox: number, oy: number) {
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
    this.burst(e.x, e.y, 5, "#cfefff", 130);
    this.damageEnemy(e, dmg);
  }

  /* ============ update ============ */
  private update(rawDt: number) {
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
    // regen
    this.regenAcc += 0.7 * this.passives.regen * dt;
    if (this.regenAcc >= 1) {
      const h = Math.floor(this.regenAcc);
      this.regenAcc -= h;
      this.hp = clamp(this.hp + h, 0, this.maxHp);
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
        s.sx = s.x;
        s.sy = s.y;
      }
      if (s.x < 20 || s.x > WORLD - 20 || s.y < 20 || s.y > WORLD - 20) s.life = 0;
      // hits
      for (const e of this.enemies) {
        if (e.dead || s.hitIds.has(e)) continue;
        if (dist2(e.x, e.y, s.x, s.y) < (e.r + s.r) * (e.r + s.r)) {
          s.hitIds.add(e);
          const kx = e.boss ? 0 : (s.vx !== 0 || s.vy !== 0 ? Math.sign(s.vx) * 6 : 0);
          this.damageEnemy(e, s.dmg, kx, 0);
          if (s.kind === "boom") e.bladeCd = 0.25;
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
      const lv = orbit.lv;
      const ev = orbit.evolved;
      const n = 2 + (lv >= 3 ? 1 : 0) + (lv >= 5 ? 1 : 0) + (ev ? 2 : 0);
      const radius = 62 + lv * 5 + (ev ? 26 : 0);
      const dmg = (7 + lv * 3) * (ev ? 2.3 : 1) * this.power();
      const bspd = 2.4 + lv * 0.15;
      this.orbitBlades = { n, radius, dmg, bspd, ev };
      for (let i = 0; i < n; i++) {
        const a = this.orbitT * bspd + (i * Math.PI * 2) / n;
        const bx = this.px + Math.cos(a) * radius;
        const by = this.py - 8 + Math.sin(a) * radius * 0.82;
        for (const e of this.enemies) {
          if (e.dead || e.bladeCd > 0) continue;
          if (dist2(e.x, e.y, bx, by) < (e.r + (ev ? 22 : 15)) * (e.r + (ev ? 22 : 15))) {
            e.bladeCd = 0.28;
            const ka = Math.atan2(e.y - this.py, e.x - this.px);
            this.damageEnemy(e, dmg, e.boss ? 0 : Math.cos(ka) * 10, e.boss ? 0 : Math.sin(ka) * 10);
          }
        }
      }
    } else {
      this.orbitBlades = null;
    }

    /* --- frosts --- */
    for (const f of this.frosts) {
      f.t += dt / f.dur;
      if (f.t >= 1) {
        this.ring(f.x, f.ty, 8, f.aoe, 0.35, "#7fd4ff", 4);
        this.burst(f.x, f.ty, 8, "#bff3ff", 140);
        for (const e of this.enemies) {
          if (!e.dead && dist2(e.x, e.y, f.x, f.ty) < (f.aoe + e.r) * (f.aoe + e.r)) {
            this.damageEnemy(e, f.dmg);
            e.slow = Math.max(e.slow, this.skills.frost.evolved ? 3 : 1.8);
          }
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
        const best = parseInt(localStorage.getItem("tvqv_best") || "0", 10);
        if (this.stage > best) localStorage.setItem("tvqv_best", String(this.stage));
        if (this.stage >= TOTAL_STAGES) {
          sfx.victory();
          this.setPhase("victory", { stats: this.stats() });
        } else {
          this.setPhase("stageclear", { stats: this.stats() });
        }
      }
    }

    /* --- hud throttle --- */
    this.hudT -= dt;
    if (this.hudT <= 0) {
      this.hudT = 0.1;
      this.pushHud();
    }
  }

  private orbitBlades: { n: number; radius: number; dmg: number; bspd: number; ev: boolean } | null = null;

  private updateBoss(e: Enemy, dt: number) {
    const info = e.boss!;
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
            e.tx = Math.cos(a);
            e.ty = Math.sin(a);
            sfx.throwSound();
          }
        } else if (e.state === "charge") {
          e.x += e.tx * e.speed * 5.2 * dt;
          e.y += e.ty * e.speed * 5.2 * dt;
          if (Math.random() < dt * 40) this.puff(e.x + rand(-20, 20), e.y + rand(-20, 20), info.colors.M);
          if (e.stateT <= 0) {
            e.state = "";
            e.stateT = rand(2.4, 3.2) * cdMul;
          }
        } else {
          e.x += Math.cos(a) * e.speed * dt;
          e.y += Math.sin(a) * e.speed * dt;
          if (e.stateT <= 0) {
            e.state = "tele";
            e.stateT = 0.5;
            e.flash = 0.4;
            sfx.wave();
          }
        }
        break;
      }
      case 1: {
        // bắn phá
        e.x += Math.cos(a) * e.speed * 0.8 * dt;
        e.y += Math.sin(a) * e.speed * 0.8 * dt;
        if (e.stateT <= 0) {
          e.stateT = Math.max(1.2, 2.4 - this.stage * 0.008) * cdMul;
          const n = 10 + Math.floor(this.stage / 8);
          for (let i = 0; i < n; i++) {
            const ba = (i / n) * Math.PI * 2 + e.spiralA;
            this.ebullets.push({ x: e.x, y: e.y, vx: Math.cos(ba) * 165, vy: Math.sin(ba) * 165, r: 7, dmg: info.dmg * 0.55, life: 4, color: info.colors.X });
          }
          e.spiralA += 0.35;
          sfx.shoot();
        }
        break;
      }
      case 2: {
        // triệu hồi
        e.x += Math.cos(a) * e.speed * 0.6 * dt;
        e.y += Math.sin(a) * e.speed * 0.6 * dt;
        if (e.stateT <= 0) {
          e.stateT = 2.8 * cdMul;
          for (let i = 0; i < 3 + Math.floor(this.stage / 25); i++) {
            const sa = Math.random() * Math.PI * 2;
            const m = this.makeEnemy(this.biome.mobKind, this.biome.mob, e.x + Math.cos(sa) * 90, e.y + Math.sin(sa) * 90, this.stage, 3, false);
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
        if (e.tx > 0.13) {
          e.tx = 0;
          for (const off of [0, Math.PI]) {
            this.ebullets.push({ x: e.x, y: e.y, vx: Math.cos(e.spiralA + off) * 185, vy: Math.sin(e.spiralA + off) * 185, r: 6, dmg: info.dmg * 0.5, life: 3.4, color: info.colors.X });
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
            e.tx = this.px;
            e.ty = this.py;
          }
        } else if (e.state === "jump") {
          const k = 1 - e.stateT / 0.4;
          e.x += (e.tx - e.x) * Math.min(1, k * 1.6) * dt * 8;
          e.y += (e.ty - e.y) * Math.min(1, k * 1.6) * dt * 8;
          if (e.stateT <= 0) {
            e.state = "";
            e.stateT = 3.4 * cdMul;
            this.shake = 14;
            sfx.bossRoar();
            const n = 14;
            for (let i = 0; i < n; i++) {
              const ba = (i / n) * Math.PI * 2;
              this.ebullets.push({ x: e.x, y: e.y, vx: Math.cos(ba) * 210, vy: Math.sin(ba) * 210, r: 7, dmg: info.dmg * 0.6, life: 3, color: info.colors.X });
            }
            this.ring(e.x, e.y, 20, 170, 0.5, info.colors.X, 6);
            this.burst(e.x, e.y, 16, info.colors.D, 220);
          }
        } else {
          e.x += Math.cos(a) * e.speed * dt;
          e.y += Math.sin(a) * e.speed * dt;
          if (e.stateT <= 0) {
            e.state = "tele";
            e.stateT = 0.45;
            e.flash = 0.4;
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
    this.particles = this.particles.filter((p) => p.life > 0);
    for (const d of this.dmgs) {
      d.life -= dt;
      d.y += d.vy * dt;
      d.vy *= 0.94;
    }
    this.dmgs = this.dmgs.filter((d) => d.life > 0);
    for (const z of this.zaps) z.life -= dt;
    this.zaps = this.zaps.filter((z) => z.life > 0);
    for (const r of this.rings) {
      r.life -= dt;
      r.r += (r.maxR - r.r) * Math.min(1, dt * 12);
    }
    this.rings = this.rings.filter((r) => r.life > 0);
    // ambient
    const type = this.biome.ambient.type;
    for (const a of this.ambients) {
      a.ph += dt;
      if (type === "snow" || type === "ash") {
        a.y += (16 + a.ph % 8) * dt;
        a.x += Math.sin(a.ph * 1.4) * 12 * dt;
      } else if (type === "ember" || type === "bubble") {
        a.y -= 22 * dt;
        a.x += Math.sin(a.ph * 2) * 14 * dt;
      } else if (type === "sand") {
        a.x += 60 * dt;
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
    this.frosts = [];
    this.bannerObj = null;
  }

  /* ============ draw ============ */
  private draw() {
    const ctx = this.ctx;
    const vw = this.vw;
    const vh = this.vh;
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

    this.drawShots(ctx);
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
      const p = 0.12 + Math.sin(performance.now() / 240) * 0.06;
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
      } else if (p.kind === "core") {
        const pulse = 1 + Math.sin(p.t * 7) * 0.14;
        const s = 20 * pulse;
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
    const spr = getHeroSprite(this.moving ? Math.floor(this.walkT * 9) % 2 : 0);
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
    const spr = getHeroSprite(0);
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

  private drawShots(ctx: CanvasRenderingContext2D) {
    for (const s of this.shots) {
      const x = Math.round(s.x);
      const y = Math.round(s.y);
      if (s.kind === "bolt") {
        const size = s.evolved ? 16 : 10;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(Math.atan2(s.vy, s.vx));
        ctx.fillStyle = s.evolved ? "#ffb03e" : "#ffd94a";
        ctx.fillRect(-size, -3, size * 2, 6);
        ctx.fillStyle = s.evolved ? "#ffe9b8" : "#fff3d0";
        ctx.fillRect(-size + 3, -1.5, size * 1.4, 3);
        if (s.evolved) {
          ctx.fillStyle = "#ff8080";
          ctx.fillRect(size - 6, -6, 6, 12);
        }
        ctx.restore();
      } else {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(s.spin);
        const L = s.evolved ? 24 : 16;
        ctx.fillStyle = s.evolved ? "#ff5a5a" : "#e8dcc0";
        ctx.fillRect(-L, -3, L, 6);
        ctx.fillRect(3, -L, L, 6);
        ctx.fillStyle = s.evolved ? "#ffd94a" : "#b5793a";
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

  private drawZaps(ctx: CanvasRenderingContext2D) {
    for (const z of this.zaps) {
      const a = clamp(z.life / 0.16, 0, 1);
      ctx.strokeStyle = `rgba(207,239,255,${a})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(z.pts[0].x, z.pts[0].y);
      for (let i = 1; i < z.pts.length; i++) ctx.lineTo(z.pts[i].x, z.pts[i].y);
      ctx.stroke();
      ctx.strokeStyle = `rgba(120,180,255,${a * 0.7})`;
      ctx.lineWidth = 9;
      ctx.stroke();
    }
  }

  private drawRings(ctx: CanvasRenderingContext2D) {
    for (const r of this.rings) {
      const a = clamp(r.life * 2.4, 0, 1);
      ctx.strokeStyle = hexToRgba(r.color, a * 0.9);
      ctx.lineWidth = r.width;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
      ctx.stroke();
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
      const tw = type === "firefly" || type === "sparkle" || type === "wisp" ? 0.4 + 0.6 * Math.abs(Math.sin(a.ph * 2)) : 0.7;
      ctx.globalAlpha = 0.65 * tw;
      ctx.fillStyle = col;
      const s = type === "mist" ? 26 : type === "snow" || type === "ash" ? 4 : 3;
      ctx.fillRect(a.x - s / 2, a.y - s / 2, s, s);
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
