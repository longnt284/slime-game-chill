/* Sprite pixel-art vẽ thủ công bằng lưới ký tự, render ra canvas offscreen rồi cache. */

export type MobKind =
  | "slime"
  | "bat"
  | "yeti"
  | "scorpion"
  | "mushroom"
  | "imp"
  | "fish"
  | "ghost"
  | "bird"
  | "demon";

export interface MobColors {
  M: string; // màu chính
  D: string; // màu tối
  W: string; // sáng / bụng
  E: string; // mắt
  X: string; // điểm nhấn
}

const DEF_W = "#ffffff";
const DEF_E = "#1e1b18";

const HERO_LEGEND: Record<string, string> = {
  H: "#e8b04b",
  h: "#b37e2c",
  S: "#f6c9a0",
  E: "#2f2a26",
  R: "#8a4a26",
  B: "#3e76c6",
  b: "#2c569c",
  P: "#5d452c",
  O: "#3c2a18",
};

const HERO_A = [
  "............",
  "...HHHHHH...",
  "..HHHHHHHH..",
  ".HHHHHHHHHH.",
  ".hhhhhhhhhh.",
  "..RRRRRRRR..",
  "..SEESSEES..",
  "...SSSSSS...",
  "..BBBBBBBB..",
  ".BBbBBBBbBB.",
  "..SBBBBBBS..",
  "...PPPPPP...",
  "...PP..PP...",
  "...OO..OO...",
  "............",
];

const HERO_B = [
  "............",
  "...HHHHHH...",
  "..HHHHHHHH..",
  ".HHHHHHHHHH.",
  ".hhhhhhhhhh.",
  "..RRRRRRRR..",
  "..SEESSEES..",
  "...SSSSSS...",
  "..BBBBBBBB..",
  ".BBbBBBBbBB.",
  "..SBBBBBBS..",
  "...PPPPPP...",
  "..PP....PP..",
  "..OO....OO..",
  "............",
];

interface MobDef {
  a: string[];
  b: string[];
}

const MOBS: Record<MobKind, MobDef> = {
  slime: {
    a: [
      "............",
      "............",
      "....MMMM....",
      "..MMMMMMMM..",
      ".MMMMMMMMMM.",
      ".MEWMMMMEWM.",
      ".MMMMMMMMMM.",
      "MMMMMMMMMMMM",
      "DDDDDDDDDDDD",
    ],
    b: [
      "............",
      "............",
      "............",
      "...MMMMMM...",
      ".MMMMMMMMMM.",
      ".MEWMMMMEWM.",
      "MMMMMMMMMMMM",
      "DDDDDDDDDDDD",
      "DDDDDDDDDDDD",
    ],
  },
  bat: {
    a: [
      "............",
      "M...MMMM...M",
      "MM.MMMMMM.MM",
      "MMM.EXXE.MMM",
      ".MMMMMMMMMM.",
      ".MMMMMMMMMM.",
      "..MWMMMMWM..",
      "...MMMMMM...",
      "............",
    ],
    b: [
      "............",
      "............",
      "M..........M",
      "MMM..MM..MMM",
      "MMMM.EXXE.MM",
      ".MMMMMMMMMM.",
      "..MM.MM.MM..",
      "...MMMMMM...",
      "............",
    ],
  },
  yeti: {
    a: [
      "............",
      "...MMMMMM...",
      "..MMMMMMMM..",
      ".MMMEEEMMMM.",
      ".MMMMMMMMMM.",
      "MMMMMMMMMMMM",
      "MMMWWWWWWMMM",
      "MMMMMMMMMMMM",
      ".MMMMMMMMMM.",
    ],
    b: [
      "............",
      "............",
      "...MMMMMM...",
      "..MMMMMMMM..",
      ".MMMEEEMMMM.",
      "MMMMMMMMMMMM",
      "MMMWWWWWWMMM",
      "MMMMMMMMMMMM",
      ".MMMMMMMMMM.",
    ],
  },
  scorpion: {
    a: [
      "..........XX",
      ".........XM.",
      "MMXMM...XM..",
      "MMMMMMMMM...",
      "EEMMMMMMD...",
      "MMMMMMMMMD..",
      ".M.MM.MM.D..",
      "..........D.",
      "............",
    ],
    b: [
      "..........XX",
      ".........XM.",
      "MMXMM...XM..",
      "MMMMMMMMM...",
      "EEMMMMMMD...",
      "MMMMMMMMMD..",
      ".MM.MM.MMD..",
      "..........D.",
      "............",
    ],
  },
  mushroom: {
    a: [
      "....MMMM....",
      "..MMMMMMMM..",
      ".MMWMMMMWMM.",
      ".MMMMMMMMMM.",
      "MMMMMMMMMMMM",
      "...WWWWWW...",
      "...WWWWWW...",
      "....WWWW....",
      "............",
    ],
    b: [
      "............",
      "....MMMM....",
      "..MMMMMMMM..",
      ".MMWMMMMWMM.",
      ".MMMMMMMMMM.",
      "MMMMMMMMMMMM",
      "...WWWWWW...",
      "....WWWW....",
      "............",
    ],
  },
  imp: {
    a: [
      "X..........X",
      "XX........XX",
      "..MMMMMMMM..",
      ".MMEXMMEXMM.",
      ".MMMMMMMMMM.",
      "..MMMMMMMM..",
      "..MMM..MMM..",
      "...M....M...",
      "............",
    ],
    b: [
      "X..........X",
      "XX........XX",
      "..MMMMMMMM..",
      ".MMEXMMEXMM.",
      ".MMMMMMMMMM.",
      "..MMMMMMMM..",
      "..MMM..MMM..",
      "..M......M..",
      "............",
    ],
  },
  fish: {
    a: [
      "...MMMMMM...",
      "..MMMMMMMM..",
      ".MMEEMMEEMM.",
      ".MMMMMMMMMM.",
      "..WWWWWWWW..",
      ".MMMMMMMMMM.",
      ".MMMMMMMMMM.",
      "..MMM..MMM..",
      "............",
    ],
    b: [
      "............",
      "...MMMMMM...",
      "..MMMMMMMM..",
      ".MMEEMMEEMM.",
      ".MMMMMMMMMM.",
      "..WWWWWWWW..",
      ".MMMMMMMMMM.",
      "..MMM..MMM..",
      "............",
    ],
  },
  ghost: {
    a: [
      "...MMMMMM...",
      "..MMMMMMMM..",
      ".MMMEEMEEMM.",
      ".MMMMMMMMMM.",
      ".MMMMMMMMMM.",
      ".MMMMMMMMMM.",
      ".MMMMMMMMMM.",
      ".MM.MMM.MM..",
      "..M..MM..M..",
    ],
    b: [
      "............",
      "...MMMMMM...",
      "..MMMMMMMM..",
      ".MMMEEMEEMM.",
      ".MMMMMMMMMM.",
      ".MMMMMMMMMM.",
      ".MMMMMMMMMM.",
      ".MM.MMM.MM..",
      "...M.MM.M...",
    ],
  },
  bird: {
    a: [
      "..M......M..",
      ".MMM....MMM.",
      ".MMMMMMMMMM.",
      "..MEEMMEEM..",
      "MMMMMXXMMMMM",
      ".MMMMMMMMMM.",
      "..MMMMMMMM..",
      "...MM..MM...",
      "............",
    ],
    b: [
      ".M........M.",
      "MMM......MMM",
      ".MMMMMMMMMM.",
      "..MEEMMEEM..",
      "MMMMMXXMMMMM",
      ".MMMMMMMMMM.",
      "..MMMMMMMM..",
      "...MM..MM...",
      "............",
    ],
  },
  demon: {
    a: [
      "XX........XX",
      "MM..MMMM..MM",
      ".MMMMMMMMMM.",
      ".MMEXMMEXMM.",
      ".MMMMMMMMMM.",
      "..MMMMMMMM..",
      "..MMMMMMMM..",
      "...MM..MM...",
      "............",
    ],
    b: [
      "XX........XX",
      "MM..MMMM..MM",
      ".MMMMMMMMMM.",
      ".MMEXMMEXMM.",
      ".MMMMMMMMMM.",
      "..MMMMMMMM..",
      "..MMMMMMMM..",
      "..MM....MM..",
      "............",
    ],
  },
};

const CROWN = ["Y...YY...Y", "YY..YY..YY", "YYYYYYYYYY", "yYYYYYYYYy"];
const CROWN_LEGEND: Record<string, string> = { Y: "#ffd94a", y: "#d9a520" };

const GEM = ["...GG...", "..GGGG..", ".GWGGGG.", ".GGGGGG.", "..GGGG..", "...gg..."];
const GEM_LEGEND: Record<string, string> = { G: "#63e6ff", g: "#2fa8d5", W: "#d8fbff" };

const CORE = ["...CC...", "..CCCC..", ".CCWWCC.", ".CCCCCC.", ".CcCCcC.", "..cccc..", "...cc..."];
const CORE_LEGEND: Record<string, string> = { C: "#ff9d2e", c: "#e2571b", W: "#ffe9b8" };

const HEART = [".RR..RR.", "RRRWRRRR", "RRRRRRRR", "RRRRRRRR", ".RRRRRR.", "..RRRR..", "...RR..."];
const HEART_LEGEND: Record<string, string> = { R: "#ff4d6d", W: "#ffb3c1" };

function makeSprite(rows: string[], legend: Record<string, string>): HTMLCanvasElement {
  const h = rows.length;
  const w = rows[0].length;
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext("2d")!;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const ch = rows[y][x];
      if (ch === ".") continue;
      const col = legend[ch];
      if (!col) continue;
      ctx.fillStyle = col;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  return cv;
}

const cache = new Map<string, HTMLCanvasElement>();

export function getHeroSprite(frame: number): HTMLCanvasElement {
  const key = `hero${frame}`;
  let c = cache.get(key);
  if (!c) {
    c = makeSprite(frame % 2 === 0 ? HERO_A : HERO_B, HERO_LEGEND);
    cache.set(key, c);
  }
  return c;
}

export function getMobSprite(kind: MobKind, frame: number, col: MobColors): HTMLCanvasElement {
  const key = `${kind}|${frame % 2}|${col.M}${col.D}${col.W}${col.E}${col.X}`;
  let c = cache.get(key);
  if (!c) {
    const def = MOBS[kind];
    const legend: Record<string, string> = {
      M: col.M,
      D: col.D,
      W: col.W || DEF_W,
      E: col.E || DEF_E,
      X: col.X,
    };
    c = makeSprite(frame % 2 === 0 ? def.a : def.b, legend);
    cache.set(key, c);
  }
  return c;
}

export type ItemKind = "gem" | "core" | "heart" | "crown";

export function getItemSprite(kind: ItemKind): HTMLCanvasElement {
  const key = `item_${kind}`;
  let c = cache.get(key);
  if (!c) {
    if (kind === "gem") c = makeSprite(GEM, GEM_LEGEND);
    else if (kind === "core") c = makeSprite(CORE, CORE_LEGEND);
    else if (kind === "heart") c = makeSprite(HEART, HEART_LEGEND);
    else c = makeSprite(CROWN, CROWN_LEGEND);
    cache.set(key, c);
  }
  return c;
}
