/* Cửa hàng: 40 skin nhân vật (10 kiểu mũ × 4 bảng màu) + 30 skin vũ khí.
   Vàng kiếm trong trận mua skin thường và nâng cấp chỉ số vĩnh viễn;
   kim cương từ nhiệm vụ ngày dành riêng cho skin Huyền Thoại. */

import { shiftPalette } from "./palette";
import type { WeaponPalette } from "./palette";

/** Chỉ số cộng thêm từ skin nhân vật và từ bảng nâng cấp vĩnh viễn. */
export interface MetaStats {
  /** Hệ số nhân sát thương, 0.06 nghĩa là +6%. */
  power: number;
  /** Máu tối đa cộng thẳng. */
  maxHp: number;
  /** Hệ số nhân tốc chạy. */
  speed: number;
  /** Hệ số nhân phạm vi nhặt. */
  magnet: number;
  /** Hệ số giảm hồi chiêu. */
  haste: number;
  /** Hệ số nhân vàng kiếm được. */
  gold: number;
}

export const EMPTY_STATS: MetaStats = { power: 0, maxHp: 0, speed: 0, magnet: 0, haste: 0, gold: 0 };

export const addStats = (a: MetaStats, b: MetaStats): MetaStats => ({
  power: a.power + b.power,
  maxHp: a.maxHp + b.maxHp,
  speed: a.speed + b.speed,
  magnet: a.magnet + b.magnet,
  haste: a.haste + b.haste,
  gold: a.gold + b.gold,
});

export interface HeroSkinDef {
  id: string;
  name: string;
  price: number;
  /** Giá kim cương; skin Huyền Thoại chỉ đổi được bằng kim cương. */
  gemPrice: number;
  tier: number; // 0 Thường, 1 Hiếm, 2 Quý, 3 Huyền Thoại
  /** Chỉ số cộng thêm khi mặc skin này. */
  stats: MetaStats;
  pal: { B: string; b: string; P: string; O: string; H: string; h: string; R: string };
  hatA: string;
  hatA2: string;
  hat: string[];
}

export interface WeaponSkinDef {
  id: string;
  name: string;
  /** Mô tả ngắn về tông màu, hiện trên thẻ trong cửa hàng. */
  mood: string;
  price: number;
  gemPrice: number;
  tier: number;
  /** Các bảng màu mà hiệu ứng vũ khí trôi qua lại trong trận. */
  moods: WeaponPalette[];
}

export interface QuestSave {
  /** Ngày của bộ nhiệm vụ đang tính, dạng YYYY-MM-DD theo giờ máy. */
  day: string;
  progress: Record<string, number>;
  claimed: string[];
}

export interface SaveData {
  gold: number;
  gems: number;
  heroOwned: string[];
  weaponOwned: string[];
  hero: string;
  weapon: string;
  upgrades: Record<string, number>;
  quests: QuestSave;
}

export const TIER_NAMES = ["Thường", "Hiếm", "Quý", "Huyền Thoại"];
export const TIER_COLORS = ["#d9bd8a", "#63e6ff", "#c9a0e8", "#ffd94a"];
const PRICES = [150, 400, 900, 0];
/** Skin Huyền Thoại đổi bằng kim cương chứ không mua bằng vàng. */
const HERO_GEM_PRICE = 55;

/** Skin càng hiếm càng đắt và cộng thêm một chút chỉ số, đủ để thấy nhưng không phá cân bằng. */
export const HERO_TIER_STATS: MetaStats[] = [
  { ...EMPTY_STATS },
  { power: 0.03, maxHp: 6, speed: 0, magnet: 0.05, haste: 0, gold: 0.03 },
  { power: 0.06, maxHp: 12, speed: 0.02, magnet: 0.1, haste: 0.02, gold: 0.06 },
  { power: 0.1, maxHp: 20, speed: 0.04, magnet: 0.15, haste: 0.04, gold: 0.1 },
];

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
    gemPrice: v[1] === 3 ? HERO_GEM_PRICE : 0,
    tier: v[1],
    stats: HERO_TIER_STATS[v[1]],
    pal: { B: v[2], b: v[3], P: v[4], O: v[5], H: v[6], h: v[7], R: v[9] },
    hatA: v[8],
    hatA2: v[9],
    hat: t.hat,
  })),
);

/* ------------------------------ 30 SKIN VŨ KHÍ ------------------------------ */

/** Dữ liệu thô của một skin: bảng màu gốc cộng 1-2 tông màu mà nó sẽ trôi qua. */
interface WeaponSeed {
  id: string;
  name: string;
  mood: string;
  price: number;
  tier: number;
  base: WeaponPalette;
  /** Các tông màu chuyển tiếp; bảng màu gốc luôn là tông đầu tiên. */
  shifts: string[];
}

const WEAPON_GEM_PRICES = [0, 0, 0, 70];

const SEEDS: WeaponSeed[] = [
  {
    id: "w0", name: "Tia Vàng", mood: "Vàng nắng chuyển cam lửa", price: 0, tier: 0,
    base: { bolt: "#ffd94a", core: "#fff3d0", blade: "#e8dcc0", blade2: "#b5793a", aura: "#ffe08a", glow: "#ffb03e" },
    shifts: ["#ff9d2e"],
  },
  {
    id: "w1", name: "Lam Điện", mood: "Lam điện chuyển tím sấm", price: 200, tier: 0,
    base: { bolt: "#5ac8ff", core: "#e0f7ff", blade: "#cfe8f0", blade2: "#7090a8", aura: "#9fe8ff", glow: "#2ea0f0" },
    shifts: ["#7a6aff"],
  },
  {
    id: "w2", name: "Lục Độc", mood: "Lục non chuyển vàng chanh", price: 200, tier: 0,
    base: { bolt: "#7ce06a", core: "#eaffe0", blade: "#d0e8c0", blade2: "#7a9a68", aura: "#c0ff9a", glow: "#3ab84a" },
    shifts: ["#c0f040"],
  },
  {
    id: "w3", name: "Hồng Phấn", mood: "Hồng phấn chuyển tím mộng", price: 450, tier: 1,
    base: { bolt: "#ff8ac0", core: "#ffe0f0", blade: "#f0d0e0", blade2: "#a87890", aura: "#ffb0d8", glow: "#f0509a" },
    shifts: ["#c98aff", "#ff6a8a"],
  },
  {
    id: "w4", name: "Băng Giá", mood: "Băng lam chuyển bạc trắng", price: 450, tier: 1,
    base: { bolt: "#7fd4ff", core: "#eaf9ff", blade: "#d8f0fa", blade2: "#7aa0b8", aura: "#c0ecff", glow: "#4ab0e8" },
    shifts: ["#8affe8"],
  },
  {
    id: "w5", name: "Lửa Cam", mood: "Cam lửa chuyển đỏ than", price: 700, tier: 1,
    base: { bolt: "#ff9d2e", core: "#ffe9b8", blade: "#f0dcc0", blade2: "#b08a60", aura: "#ffc060", glow: "#ff6a20" },
    shifts: ["#ff4d3a", "#ffd23e"],
  },
  {
    id: "w6", name: "Huyết Nguyệt", mood: "Đỏ máu chuyển tím sẫm", price: 700, tier: 1,
    base: { bolt: "#ff4d6d", core: "#ffd0d8", blade: "#f0d0d0", blade2: "#b07070", aura: "#ff8095", glow: "#c9184a" },
    shifts: ["#a03add"],
  },
  {
    id: "w7", name: "Tử Linh", mood: "Tím linh hồn chuyển lam ma", price: 1000, tier: 2,
    base: { bolt: "#c9a0e8", core: "#f0e0ff", blade: "#e0d0f0", blade2: "#9a7ab0", aura: "#e0c0ff", glow: "#9a4ae0" },
    shifts: ["#6aa8ff", "#ff7ad0"],
  },
  {
    id: "w8", name: "Ngọc Bích", mood: "Ngọc lục chuyển lam biển", price: 1000, tier: 2,
    base: { bolt: "#4ae8b0", core: "#e0fff4", blade: "#d0f0e4", blade2: "#70b098", aura: "#90ffd8", glow: "#20c890" },
    shifts: ["#3ad0e8"],
  },
  {
    id: "w9", name: "Sao Băng", mood: "Trắng sao chuyển lam đêm", price: 1400, tier: 2,
    base: { bolt: "#eaf4ff", core: "#ffffff", blade: "#e8e8f0", blade2: "#98a0b8", aura: "#ffffff", glow: "#b0d0ff" },
    shifts: ["#7f9dff", "#ffd9a8"],
  },
  {
    id: "w10", name: "Thủy Triều", mood: "Xanh ngọc chuyển lam sâu", price: 1400, tier: 2,
    base: { bolt: "#2ee8d0", core: "#e0fffa", blade: "#c8f0e8", blade2: "#60a89c", aura: "#90ffe8", glow: "#10c0a8" },
    shifts: ["#2e9dff"],
  },
  {
    id: "w11", name: "Ma Hồng", mood: "Hồng ma chuyển tím quỷ", price: 1800, tier: 2,
    base: { bolt: "#ff40d0", core: "#ffe0f8", blade: "#f0c8e8", blade2: "#b060a0", aura: "#ff9df0", glow: "#d010a0" },
    shifts: ["#9b3aff", "#ff4d6d"],
  },
  {
    id: "w12", name: "Chanh Non", mood: "Chanh non chuyển lục rừng", price: 1800, tier: 2,
    base: { bolt: "#c0f040", core: "#f4ffd8", blade: "#e4f0c0", blade2: "#90a850", aura: "#e0ff90", glow: "#90c810" },
    shifts: ["#3ad06a"],
  },
  {
    id: "w13", name: "Lam Sẫm", mood: "Lam sẫm chuyển tím hoàng hôn", price: 0, tier: 3,
    base: { bolt: "#5070ff", core: "#d8e4ff", blade: "#c8d4f0", blade2: "#7080b8", aura: "#9db0ff", glow: "#2040e0" },
    shifts: ["#a04aff", "#3ad0ff"],
  },
  {
    id: "w14", name: "Đồng Thau", mood: "Đồng cổ chuyển vàng ròng", price: 0, tier: 3,
    base: { bolt: "#c89050", core: "#f4e4c8", blade: "#e8d8b8", blade2: "#9a7848", aura: "#f0c890", glow: "#a06820" },
    shifts: ["#ffd94a", "#c05a2a"],
  },
  {
    id: "w15", name: "Bạch Kim", mood: "Bạch kim ánh cầu vồng nhạt", price: 0, tier: 3,
    base: { bolt: "#f0f0e8", core: "#ffffff", blade: "#f0efe8", blade2: "#a8a69c", aura: "#ffffff", glow: "#d8d6c8" },
    shifts: ["#8ad4ff", "#ffb0d8"],
  },
  {
    id: "w16", name: "Huyết Tím", mood: "Huyết tím chuyển đỏ thẫm", price: 0, tier: 3,
    base: { bolt: "#c02878", core: "#f8d0e8", blade: "#e8c0d8", blade2: "#a05888", aura: "#f078b8", glow: "#901058" },
    shifts: ["#e02840", "#7a28c0"],
  },
  {
    id: "w17", name: "Dạ Tím", mood: "Tím đêm chuyển lam thẳm", price: 0, tier: 3,
    base: { bolt: "#7a48e0", core: "#e8dcff", blade: "#d8c8f0", blade2: "#8a70b0", aura: "#b090ff", glow: "#5020b0" },
    shifts: ["#4060e0", "#c04ae0"],
  },
  {
    id: "w18", name: "Thép Lạnh", mood: "Thép xám chuyển lam băng", price: 0, tier: 3,
    base: { bolt: "#90a8c0", core: "#e8f0f8", blade: "#dce4ec", blade2: "#78889c", aura: "#c0d8f0", glow: "#5878a0" },
    shifts: ["#5ad0e0"],
  },
  {
    id: "w19", name: "Hư Vô Chí Tôn", mood: "Vàng hư vô chuyển tím hủy diệt", price: 0, tier: 3,
    base: { bolt: "#fff0a0", core: "#ffffff", blade: "#ffd94a", blade2: "#c040ff", aura: "#ff9df0", glow: "#c040ff" },
    shifts: ["#c040ff", "#40ffd0"],
  },

  /* --------- 10 vũ khí mới: tông màu mạnh và chuyển màu rõ rệt --------- */
  {
    id: "w20", name: "Lôi Đình Thiên Chuyên", mood: "Trắng sét chuyển tím lôi", price: 2200, tier: 2,
    base: { bolt: "#dff4ff", core: "#ffffff", blade: "#cfe4ff", blade2: "#6a7fb0", aura: "#a8d8ff", glow: "#4a7dff" },
    shifts: ["#a04aff", "#ffe94a"],
  },
  {
    id: "w21", name: "Hắc Diệm Ma Đao", mood: "Lửa đen chuyển than hồng", price: 2600, tier: 2,
    base: { bolt: "#6a3a9a", core: "#d8b0ff", blade: "#4a2a6a", blade2: "#241436", aura: "#a86ad9", glow: "#ff6a20" },
    shifts: ["#ff5a1a", "#2a1840"],
  },
  {
    id: "w22", name: "Độc Vụ Xà Nha", mood: "Lục độc chuyển tím kịch độc", price: 2600, tier: 2,
    base: { bolt: "#8aff3a", core: "#e8ffd0", blade: "#b0f070", blade2: "#4a7a24", aura: "#c0ff8a", glow: "#5ac81a" },
    shifts: ["#a03aff", "#3affb0"],
  },
  {
    id: "w23", name: "Thiên Hà Lưu Ly", mood: "Chàm ngân hà chuyển hồng tinh vân", price: 0, tier: 3,
    base: { bolt: "#4a3aff", core: "#e0dcff", blade: "#8a7aff", blade2: "#2a1f6a", aura: "#b0a0ff", glow: "#7a4aff" },
    shifts: ["#ff4ac8", "#3ad0ff"],
  },
  {
    id: "w24", name: "Nham Thạch Cuồng Nộ", mood: "Đỏ nham chuyển vàng dung nham", price: 0, tier: 3,
    base: { bolt: "#ff3a1a", core: "#ffd8a0", blade: "#ff8a3a", blade2: "#6a2410", aura: "#ffab5a", glow: "#ffd23e" },
    shifts: ["#ffd23e", "#8a1a0a"],
  },
  {
    id: "w25", name: "Băng Hỏa Song Sinh", mood: "Băng lam đối cực lửa cam", price: 0, tier: 3,
    base: { bolt: "#3ad8ff", core: "#eaffff", blade: "#a0ecff", blade2: "#2a6a8a", aura: "#8ae8ff", glow: "#1aa8e0" },
    shifts: ["#ff7a1a", "#ffffff"],
  },
  {
    id: "w26", name: "Cực Quang Vũ Khúc", mood: "Lục cực quang chuyển tím trời bắc", price: 0, tier: 3,
    base: { bolt: "#3affc0", core: "#e0fff4", blade: "#8affd8", blade2: "#2a8a6a", aura: "#a0ffe0", glow: "#1ad8a0" },
    shifts: ["#7a5aff", "#3ad0ff"],
  },
  {
    id: "w27", name: "Long Ngâm Thánh Kiếm", mood: "Ngọc rồng chuyển vàng đế vương", price: 0, tier: 3,
    base: { bolt: "#3ae8a0", core: "#e8fff0", blade: "#ffd94a", blade2: "#2a6a4a", aura: "#a0ffc8", glow: "#20c878" },
    shifts: ["#ffd94a", "#ff5a3a"],
  },
  {
    id: "w28", name: "Hắc Động Thôn Phệ", mood: "Đen hư không chuyển trắng chói", price: 0, tier: 3,
    base: { bolt: "#3a2a5a", core: "#c0a8ff", blade: "#5a4a8a", blade2: "#1a1028", aura: "#8a6ad0", glow: "#6a3aff" },
    shifts: ["#ffffff", "#ff3ad0"],
  },
  {
    id: "w29", name: "Thánh Quang Giáng Thế", mood: "Vàng thánh chuyển hồng và lam thiên đàng", price: 0, tier: 3,
    base: { bolt: "#fff0b0", core: "#ffffff", blade: "#ffe08a", blade2: "#b08a3a", aura: "#fff8d0", glow: "#ffc84a" },
    shifts: ["#ffa0d0", "#8ad8ff"],
  },
];

export const WEAPON_SKINS: WeaponSkinDef[] = SEEDS.map((seed) => ({
  id: seed.id,
  name: seed.name,
  mood: seed.mood,
  price: seed.price,
  gemPrice: WEAPON_GEM_PRICES[seed.tier],
  tier: seed.tier,
  moods: [seed.base, ...seed.shifts.map((hue) => shiftPalette(seed.base, hue))],
}));

/* --------------------- NÂNG CẤP CHỈ SỐ VĨNH VIỄN --------------------- */

export type UpgradeId = "might" | "vigor" | "stride" | "tempo" | "lure" | "fortune";

export interface UpgradeDef {
  id: UpgradeId;
  name: string;
  desc: string;
  icon: string;
  max: number;
  /** Giá vàng của cấp đầu tiên; các cấp sau đắt dần. */
  baseCost: number;
  /** Chỉ số cộng thêm cho mỗi cấp. */
  perLevel: MetaStats;
}

const step = (partial: Partial<MetaStats>): MetaStats => ({ ...EMPTY_STATS, ...partial });

/**
 * Buff cố tình để nhẹ tay: gom hết 5 cấp của cả 6 nhánh cũng chỉ vào khoảng
 * +10% sát thương, +40 máu, +7,5% tốc chạy — đủ để thấy tiến bộ qua nhiều
 * trận mà không biến trùm cuối thành bù nhìn.
 */
export const UPGRADES: UpgradeDef[] = [
  { id: "might", name: "Uy Vũ", desc: "+2% sát thương mỗi cấp", icon: "power", max: 5, baseCost: 260, perLevel: step({ power: 0.02 }) },
  { id: "vigor", name: "Thể Chất", desc: "+8 máu tối đa mỗi cấp", icon: "heart", max: 5, baseCost: 220, perLevel: step({ maxHp: 8 }) },
  { id: "stride", name: "Sải Chân", desc: "+1,5% tốc chạy mỗi cấp", icon: "speed", max: 5, baseCost: 240, perLevel: step({ speed: 0.015 }) },
  { id: "tempo", name: "Nhịp Chiêu", desc: "-1,5% hồi chiêu mỗi cấp", icon: "haste", max: 5, baseCost: 300, perLevel: step({ haste: 0.015 }) },
  { id: "lure", name: "Lực Hút", desc: "+8% phạm vi nhặt mỗi cấp", icon: "magnet", max: 5, baseCost: 180, perLevel: step({ magnet: 0.08 }) },
  { id: "fortune", name: "Vận Vàng", desc: "+5% vàng kiếm được mỗi cấp", icon: "coin", max: 5, baseCost: 280, perLevel: step({ gold: 0.05 }) },
];

export const upgradeDef = (id: UpgradeId): UpgradeDef | undefined =>
  UPGRADES.find((item) => item.id === id);

/** Giá của cấp kế tiếp; trả về 0 khi đã kịch cấp. */
export function upgradeCost(def: UpgradeDef, level: number): number {
  const lv = Math.max(0, Math.floor(level));
  if (lv >= def.max) return 0;
  return Math.round((def.baseCost * Math.pow(1.55, lv)) / 10) * 10;
}

/** Tổng chỉ số từ bảng nâng cấp đã mua. */
export function upgradeStats(levels: Record<string, number>): MetaStats {
  return UPGRADES.reduce((total, def) => {
    const lv = Math.max(0, Math.min(def.max, Math.floor(levels[def.id] ?? 0)));
    if (lv === 0) return total;
    return addStats(total, {
      power: def.perLevel.power * lv,
      maxHp: def.perLevel.maxHp * lv,
      speed: def.perLevel.speed * lv,
      magnet: def.perLevel.magnet * lv,
      haste: def.perLevel.haste * lv,
      gold: def.perLevel.gold * lv,
    });
  }, { ...EMPTY_STATS });
}

/** Chỉ số tổng của người chơi: skin nhân vật đang mặc cộng bảng nâng cấp. */
export function metaStatsOf(save: SaveData): MetaStats {
  return addStats(heroSkinById(save.hero).stats, upgradeStats(save.upgrades));
}

/* ------------------------------ LƯU TRỮ ------------------------------ */

/* Vẫn đọc từ khóa cũ để người chơi cũ không mất skin và vàng đã có. */
const KEY = "tvqv_save_v1";

export const EMPTY_QUEST_SAVE: QuestSave = { day: "", progress: {}, claimed: [] };

const DEFAULT_SAVE: SaveData = {
  gold: 100,
  gems: 0,
  heroOwned: ["farmer_0"],
  weaponOwned: ["w0"],
  hero: "farmer_0",
  weapon: "w0",
  upgrades: {},
  quests: EMPTY_QUEST_SAVE,
};

const wholeNumber = (value: unknown, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : fallback;

function normalizeUpgrades(value: unknown): Record<string, number> {
  const input = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const levels: Record<string, number> = {};
  for (const def of UPGRADES) {
    const lv = wholeNumber(input[def.id], 0);
    if (lv > 0) levels[def.id] = Math.min(def.max, lv);
  }
  return levels;
}

function normalizeQuests(value: unknown): QuestSave {
  const input = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const rawProgress = input.progress && typeof input.progress === "object"
    ? input.progress as Record<string, unknown>
    : {};
  const progress: Record<string, number> = {};
  for (const [id, amount] of Object.entries(rawProgress)) {
    const done = wholeNumber(amount, 0);
    if (done > 0) progress[id] = done;
  }
  const claimed = Array.isArray(input.claimed)
    ? [...new Set(input.claimed.filter((id): id is string => typeof id === "string"))]
    : [];
  return {
    day: typeof input.day === "string" ? input.day : "",
    progress,
    claimed,
  };
}

export function normalizeSave(value: unknown): SaveData {
  const input = value && typeof value === "object"
    ? value as Record<string, unknown>
    : {};
  const heroIds = new Set(HERO_SKINS.map((skin) => skin.id));
  const weaponIds = new Set(WEAPON_SKINS.map((skin) => skin.id));
  const savedHeroes = Array.isArray(input.heroOwned) ? input.heroOwned : [];
  const savedWeapons = Array.isArray(input.weaponOwned) ? input.weaponOwned : [];
  const heroOwned = [...new Set(["farmer_0", ...savedHeroes])]
    .filter((id): id is string => typeof id === "string" && heroIds.has(id));
  const weaponOwned = [...new Set(["w0", ...savedWeapons])]
    .filter((id): id is string => typeof id === "string" && weaponIds.has(id));
  const hero = typeof input.hero === "string" && heroOwned.includes(input.hero)
    ? input.hero
    : DEFAULT_SAVE.hero;
  const weapon = typeof input.weapon === "string" && weaponOwned.includes(input.weapon)
    ? input.weapon
    : DEFAULT_SAVE.weapon;

  return {
    gold: wholeNumber(input.gold, DEFAULT_SAVE.gold),
    gems: wholeNumber(input.gems, DEFAULT_SAVE.gems),
    heroOwned,
    weaponOwned,
    hero,
    weapon,
    upgrades: normalizeUpgrades(input.upgrades),
    quests: normalizeQuests(input.quests),
  };
}

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    return normalizeSave(raw ? JSON.parse(raw) : null);
  } catch {
    return normalizeSave(null);
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
