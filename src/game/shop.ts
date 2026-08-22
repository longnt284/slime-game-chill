/* Cửa hàng: 40 skin nhân vật (10 kiểu mũ × 4 bảng màu) + 20 skin vũ khí.
   Tiền vàng kiếm được trong trận (sinh tồn, diệt quái, qua đợt, hạ trùm). */

export interface HeroSkinDef {
  id: string;
  name: string;
  price: number;
  tier: number; // 0 Thường, 1 Hiếm, 2 Quý, 3 Huyền Thoại
  pal: { B: string; b: string; P: string; O: string; H: string; h: string; R: string };
  hatA: string;
  hatA2: string;
  hat: string[];
}

export interface WeaponSkinDef {
  id: string;
  name: string;
  price: number;
  tier: number;
  bolt: string;
  core: string;
  blade: string;
  blade2: string;
  aura: string;
  glow: string;
}

export interface SaveData {
  gold: number;
  heroOwned: string[];
  weaponOwned: string[];
  hero: string;
  weapon: string;
}

export const TIER_NAMES = ["Thường", "Hiếm", "Quý", "Huyền Thoại"];
export const TIER_COLORS = ["#d9bd8a", "#63e6ff", "#c9a0e8", "#ffd94a"];
const PRICES = [150, 400, 900, 2000];

/* ---------- Mũ: lưới 12×6 pixel (A = màu chính, a = màu tối, Y = vàng) ---------- */
const HAT = {
  straw: ["....AAAA....", "..AAAAAAAA..", ".AAAAAAAAAA.", "aaaaaaaaaaaa", "AAAAAAAAAAAA", ".aAAAAAAAAa."],
  helm: ["...YYYYYY...", "..AAAAAAAA..", ".AAaaaaaaAA.", ".AAAAAAAAAA.", ".AAA.AA.AAA.", "..AA.AA.AA.."],
  ninja: ["............", "............", "aaaaaaaaaaaa", "AAAAAAAAAaAa", ".........AAa", "..........aA"],
  witch: [".....YY.....", ".....AA.....", "....AAAA....", "...AAAAAA...", ".AAAAAAAAAA.", "aaaaaaaaaaaa"],
  pirate: ["............", "..AAAAAAAA..", ".AAAAAAAAAA.", ".AAAAAAAAaa.", "..a.......Aa", "..........aA"],
  kabuto: ["....Y..Y....", "...AYYYA....", "..AAAAAAAA..", ".AaAAAAAAaA.", ".AAAAAAAAAA.", "..AA.AA.AA.."],
  robot: [".....YY.....", ".....AA.....", "..aaaaaaaa..", ".AAAAAAAAAA.", ".AAaAAAAaAA.", "aaaaaaaaaaaa"],
  hood: ["...AAAAAA...", "..AAAAAAAA..", ".AAAAAAAAAA.", ".AAaaaaaaAA.", ".AA......AA.", ".A........A."],
  crown: [".A..AYYA..A.", ".AA.AAAA.AA.", ".AAAAAAAAAA.", ".aYYYYYYYYa.", "............", "............"],
  horns: [".AA......AA.", ".AAA....AAA.", "..AA....AA..", "...AAAAAA...", "............", "............"],
};

type Variant = [string, number, string, string, string, string, string, string, string, string];
// [tên, bậc, B, b, P, O, H, h, hatA, hatA2]

interface Theme {
  key: string;
  name: string;
  hat: string[];
  variants: Variant[];
}

const THEMES: Theme[] = [
  {
    key: "farmer", name: "Nông Dân", hat: HAT.straw,
    variants: [
      ["Xanh Lá", 0, "#3e76c6", "#2c569c", "#5d452c", "#3c2a18", "#e8b04b", "#b37e2c", "#e8b04b", "#b37e2c"],
      ["Đỏ Đô", 1, "#c64f3e", "#9c352c", "#4a3a2a", "#2e2318", "#6b4a2a", "#4a3018", "#e0a04b", "#a8742e"],
      ["Tím Than", 2, "#7a5ac6", "#5a3e9c", "#3a3550", "#26223a", "#3a3050", "#262038", "#d8c070", "#a08a44"],
      ["Hoàng Kim", 3, "#e8b83e", "#c08a24", "#6a4a1e", "#422e10", "#f0d080", "#c0a050", "#ffd94a", "#c8a020"],
    ],
  },
  {
    key: "knight", name: "Hiệp Sĩ", hat: HAT.helm,
    variants: [
      ["Bạc", 0, "#9aa5b5", "#707a8a", "#5a6270", "#3c424c", "#d8dce2", "#a8aeb8", "#c8d2de", "#8a94a2"],
      ["Huyết Đỏ", 1, "#c64545", "#9c2f2f", "#4a4a55", "#2e2e38", "#e0e0e0", "#b0b0b0", "#d05050", "#9c3535"],
      ["Rồng Lục", 2, "#3e9a5a", "#2c7040", "#3a4a3a", "#243024", "#c8e0c8", "#98b898", "#4ab06a", "#307a48"],
      ["Hoàng Kim", 3, "#e0b030", "#b08020", "#6a5a30", "#443a1c", "#f0e0a0", "#c0b060", "#ffd94a", "#c8a020"],
    ],
  },
  {
    key: "ninja", name: "Ninja", hat: HAT.ninja,
    variants: [
      ["Bóng Đêm", 0, "#3a3a42", "#26262c", "#2a2a30", "#1a1a1e", "#26262c", "#1a1a1e", "#4a4a55", "#303038"],
      ["Huyết Nguyệt", 1, "#8a2a35", "#601c24", "#3a2a2c", "#241a1c", "#4a3034", "#301e22", "#c64545", "#8a2a35"],
      ["Độc Nhện", 2, "#4a8a3a", "#33602a", "#2e3a2a", "#1e261c", "#c0e0a0", "#90b878", "#6ac050", "#4a8a3a"],
      ["Bão Tố", 3, "#4a6a9a", "#334a70", "#2e3648", "#1e2430", "#b0c8e8", "#8098b8", "#6a9ad0", "#4a6a9a"],
    ],
  },
  {
    key: "witch", name: "Phù Thủy", hat: HAT.witch,
    variants: [
      ["Tím Mộng", 0, "#7a4ab5", "#563286", "#4a3a62", "#30243e", "#e8d0ff", "#b898d8", "#9a6ad0", "#6a42a0"],
      ["Rừng Thiêng", 1, "#3a8a5a", "#276040", "#2e4a3c", "#1e3028", "#d0f0d8", "#a0c8a8", "#50b878", "#3a8a5a"],
      ["Hỏa Ngục", 2, "#c6603a", "#9c4426", "#5a3a2c", "#3c261c", "#ffd8a0", "#d0a870", "#f08048", "#c6603a"],
      ["Băng Giá", 3, "#4a9ac6", "#32709c", "#35485a", "#22303c", "#d8f0ff", "#a8c8e0", "#6ac0e8", "#4a9ac6"],
    ],
  },
  {
    key: "pirate", name: "Hải Tặc", hat: HAT.pirate,
    variants: [
      ["Đỏ Thắm", 0, "#b8433a", "#8a2e28", "#4a3a30", "#30251e", "#3a2a20", "#261a12", "#d05045", "#9c3530"],
      ["Biển Sâu", 1, "#3a7a9a", "#285870", "#3a4450", "#262e38", "#d8c8a0", "#a89868", "#4a9ac0", "#35708c"],
      ["Đen Bạc", 2, "#4a4440", "#322e2a", "#2e2a26", "#1e1b18", "#8a8278", "#5a544c", "#6a625a", "#4a4440"],
      ["Kho Báu", 3, "#c89a30", "#9c7420", "#5a4a2a", "#3c301a", "#f0e0b0", "#c0b078", "#ffd94a", "#c8a020"],
    ],
  },
  {
    key: "samurai", name: "Samurai", hat: HAT.kabuto,
    variants: [
      ["Son Đỏ", 0, "#b8432e", "#8a2e1e", "#4a3a34", "#302520", "#e8e0d8", "#b8b0a8", "#d05038", "#9c3524"],
      ["Bạch Tuyết", 1, "#d8d4cc", "#aaa69e", "#5a5850", "#3c3a34", "#3a3a3a", "#262626", "#f0ece4", "#c0bcb2"],
      ["Lam Lôi", 2, "#3a5aa8", "#28407c", "#34405a", "#222a3c", "#d0d8e8", "#a0a8b8", "#4a70cc", "#35519c"],
      ["Hắc Kiếm", 3, "#3a3a3e", "#26262a", "#26262a", "#18181c", "#8a2030", "#5c1520", "#4a4a52", "#303038"],
    ],
  },
  {
    key: "robot", name: "Robot", hat: HAT.robot,
    variants: [
      ["Thép Xám", 0, "#8a95a5", "#626d7d", "#55606e", "#383f4a", "#c0cad6", "#8d97a5", "#aeb9c9", "#7d8898"],
      ["Neon Lam", 1, "#3a8ac6", "#28629c", "#35485c", "#223040", "#d0f4ff", "#90c4d8", "#4ad0f0", "#2ea0c0"],
      ["Gạch Nung", 2, "#c65a3a", "#9c4026", "#5c4038", "#3e2a24", "#ffd0b0", "#d0a080", "#f07850", "#c65a3a"],
      ["Vàng Óng", 3, "#d8b030", "#a88420", "#665a30", "#443c1e", "#f8e8b0", "#c8b870", "#ffd94a", "#d0a828"],
    ],
  },
  {
    key: "rogue", name: "Đạo Tặc", hat: HAT.hood,
    variants: [
      ["Lục Lâm", 0, "#557a3a", "#3b5628", "#3e4430", "#282d1e", "#c8d8a8", "#98a878", "#6a9a4a", "#4a7034"],
      ["Tro Tàn", 1, "#6a6f76", "#4a4e54", "#3e4146", "#282b2e", "#b0b4ba", "#808488", "#8a8f96", "#62666c"],
      ["Hồng Sát", 2, "#96403a", "#6a2c28", "#4a3230", "#30201e", "#d8b0a8", "#a88078", "#b85048", "#8a3a34"],
      ["Dạ Tím", 3, "#6a4a8a", "#4a3262", "#403650", "#2a2234", "#c8b0e0", "#9880b0", "#8a62ac", "#62467e"],
    ],
  },
  {
    key: "prince", name: "Hoàng Tử", hat: HAT.crown,
    variants: [
      ["Lam Ngọc", 0, "#3a6ac6", "#284c9c", "#35406a", "#222a44", "#6a4a2a", "#4a3018", "#ffd94a", "#c8a020"],
      ["Đỏ Vương", 1, "#b84343", "#8a2e2e", "#5a3a3a", "#3c2626", "#e8d0a0", "#b8a070", "#ffd94a", "#c8a020"],
      ["Lục Lâm Viên", 2, "#3a8a62", "#286246", "#345044", "#22342c", "#3a2a1a", "#261a10", "#ffd94a", "#c8a020"],
      ["Hắc Vương", 3, "#3a3a44", "#26262e", "#2a2a32", "#1c1c22", "#8a2030", "#5c1520", "#ffd94a", "#c8a020"],
    ],
  },
  {
    key: "demon", name: "Tiểu Quỷ", hat: HAT.horns,
    variants: [
      ["Lửa Ngục", 0, "#8a3a30", "#602820", "#4a3028", "#301e18", "#e06040", "#a84028", "#d05040", "#9c352a"],
      ["Tà Tím", 1, "#6a3a8a", "#4a2862", "#403050", "#2a1e34", "#b060d0", "#7d4098", "#9a50c0", "#6a3a8a"],
      ["Rêu Độc", 2, "#4a7a3a", "#345628", "#384430", "#242d1e", "#70c050", "#4c8a34", "#60a848", "#427a30"],
      ["Dạ Quỷ", 3, "#3a3a52", "#28283a", "#2c2c3e", "#1e1e2a", "#8080c0", "#54548a", "#5a5a8a", "#3e3e5e"],
    ],
  },
];

export const HERO_SKINS: HeroSkinDef[] = THEMES.flatMap((t) =>
  t.variants.map((v, i) => ({
    id: `${t.key}_${i}`,
    name: `${t.name} ${v[0]}`,
    price: t.key === "farmer" && i === 0 ? 0 : PRICES[v[1]],
    tier: v[1],
    pal: { B: v[2], b: v[3], P: v[4], O: v[5], H: v[6], h: v[7], R: v[9] },
    hatA: v[8],
    hatA2: v[9],
    hat: t.hat,
  })),
);

/* ------------------------------ 20 SKIN VŨ KHÍ ------------------------------ */

export const WEAPON_SKINS: WeaponSkinDef[] = [
  { id: "w0", name: "Tia Vàng", price: 0, tier: 0, bolt: "#ffd94a", core: "#fff3d0", blade: "#e8dcc0", blade2: "#b5793a", aura: "#ffe08a", glow: "#ffb03e" },
  { id: "w1", name: "Lam Điện", price: 200, tier: 0, bolt: "#5ac8ff", core: "#e0f7ff", blade: "#cfe8f0", blade2: "#7090a8", aura: "#9fe8ff", glow: "#2ea0f0" },
  { id: "w2", name: "Lục Độc", price: 200, tier: 0, bolt: "#7ce06a", core: "#eaffe0", blade: "#d0e8c0", blade2: "#7a9a68", aura: "#c0ff9a", glow: "#3ab84a" },
  { id: "w3", name: "Hồng Phấn", price: 450, tier: 1, bolt: "#ff8ac0", core: "#ffe0f0", blade: "#f0d0e0", blade2: "#a87890", aura: "#ffb0d8", glow: "#f0509a" },
  { id: "w4", name: "Băng Giá", price: 450, tier: 1, bolt: "#7fd4ff", core: "#eaf9ff", blade: "#d8f0fa", blade2: "#7aa0b8", aura: "#c0ecff", glow: "#4ab0e8" },
  { id: "w5", name: "Lửa Cam", price: 700, tier: 1, bolt: "#ff9d2e", core: "#ffe9b8", blade: "#f0dcc0", blade2: "#b08a60", aura: "#ffc060", glow: "#ff6a20" },
  { id: "w6", name: "Huyết Nguyệt", price: 700, tier: 1, bolt: "#ff4d6d", core: "#ffd0d8", blade: "#f0d0d0", blade2: "#b07070", aura: "#ff8095", glow: "#c9184a" },
  { id: "w7", name: "Tử Linh", price: 1000, tier: 2, bolt: "#c9a0e8", core: "#f0e0ff", blade: "#e0d0f0", blade2: "#9a7ab0", aura: "#e0c0ff", glow: "#9a4ae0" },
  { id: "w8", name: "Ngọc Bích", price: 1000, tier: 2, bolt: "#4ae8b0", core: "#e0fff4", blade: "#d0f0e4", blade2: "#70b098", aura: "#90ffd8", glow: "#20c890" },
  { id: "w9", name: "Sao Băng", price: 1400, tier: 2, bolt: "#eaf4ff", core: "#ffffff", blade: "#e8e8f0", blade2: "#98a0b8", aura: "#ffffff", glow: "#b0d0ff" },
  { id: "w10", name: "Thủy Triều", price: 1400, tier: 2, bolt: "#2ee8d0", core: "#e0fffa", blade: "#c8f0e8", blade2: "#60a89c", aura: "#90ffe8", glow: "#10c0a8" },
  { id: "w11", name: "Ma Hồng", price: 1800, tier: 2, bolt: "#ff40d0", core: "#ffe0f8", blade: "#f0c8e8", blade2: "#b060a0", aura: "#ff9df0", glow: "#d010a0" },
  { id: "w12", name: "Chanh Non", price: 1800, tier: 2, bolt: "#c0f040", core: "#f4ffd8", blade: "#e4f0c0", blade2: "#90a850", aura: "#e0ff90", glow: "#90c810" },
  { id: "w13", name: "Lam Sẫm", price: 2400, tier: 3, bolt: "#5070ff", core: "#d8e4ff", blade: "#c8d4f0", blade2: "#7080b8", aura: "#9db0ff", glow: "#2040e0" },
  { id: "w14", name: "Đồng Thau", price: 2400, tier: 3, bolt: "#c89050", core: "#f4e4c8", blade: "#e8d8b8", blade2: "#9a7848", aura: "#f0c890", glow: "#a06820" },
  { id: "w15", name: "Bạch Kim", price: 3000, tier: 3, bolt: "#f0f0e8", core: "#ffffff", blade: "#f0efe8", blade2: "#a8a69c", aura: "#ffffff", glow: "#d8d6c8" },
  { id: "w16", name: "Huyết Tím", price: 3000, tier: 3, bolt: "#c02878", core: "#f8d0e8", blade: "#e8c0d8", blade2: "#a05888", aura: "#f078b8", glow: "#901058" },
  { id: "w17", name: "Dạ Tím", price: 3800, tier: 3, bolt: "#7a48e0", core: "#e8dcff", blade: "#d8c8f0", blade2: "#8a70b0", aura: "#b090ff", glow: "#5020b0" },
  { id: "w18", name: "Thép Lạnh", price: 3800, tier: 3, bolt: "#90a8c0", core: "#e8f0f8", blade: "#dce4ec", blade2: "#78889c", aura: "#c0d8f0", glow: "#5878a0" },
  { id: "w19", name: "Hư Vô Chí Tôn", price: 5000, tier: 3, bolt: "#fff0a0", core: "#ffffff", blade: "#ffd94a", blade2: "#c040ff", aura: "#ff9df0", glow: "#c040ff" },
];

/* ------------------------------ LƯU TRỮ ------------------------------ */

const KEY = "tvqv_save_v1";

export function loadSave(): SaveData {
  const def: SaveData = { gold: 100, heroOwned: ["farmer_0"], weaponOwned: ["w0"], hero: "farmer_0", weapon: "w0" };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return def;
    const p = JSON.parse(raw) as Partial<SaveData>;
    return {
      gold: typeof p.gold === "number" ? p.gold : def.gold,
      heroOwned: Array.isArray(p.heroOwned) && p.heroOwned.includes("farmer_0") ? p.heroOwned : def.heroOwned,
      weaponOwned: Array.isArray(p.weaponOwned) && p.weaponOwned.includes("w0") ? p.weaponOwned : def.weaponOwned,
      hero: typeof p.hero === "string" ? p.hero : def.hero,
      weapon: typeof p.weapon === "string" ? p.weapon : def.weapon,
    };
  } catch {
    return def;
  }
}

export function saveSave(s: SaveData) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* bỏ qua */
  }
}

export function heroSkinById(id: string): HeroSkinDef {
  return HERO_SKINS.find((s) => s.id === id) ?? HERO_SKINS[0];
}
export function weaponSkinById(id: string): WeaponSkinDef {
  return WEAPON_SKINS.find((s) => s.id === id) ?? WEAPON_SKINS[0];
}
