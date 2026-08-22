import type { MobColors, MobKind } from "./sprites";

/* ============================ BIOMES ============================ */

export interface Biome {
  name: string;
  sub: string;
  ground: [string, string, string];
  mob: MobColors;
  mobName: string;
  mobKind: MobKind;
  ambient: { type: string; color: string };
  fog: string;
  decors: string[];
  bossPalettes: MobColors[];
}

const P = (M: string, D: string, X: string): MobColors => ({ M, D, W: "#ffffff", E: "#1e1b18", X });

export const BIOMES: Biome[] = [
  {
    name: "Rừng Xanh",
    sub: "Đồng cỏ yên bình... từng yên bình",
    ground: ["#4e9a47", "#458a3f", "#57a650"],
    mob: P("#5fd068", "#2f9e44", "#ff8080"),
    mobName: "Slime Lá",
    mobKind: "slime",
    ambient: { type: "firefly", color: "#ffe08a" },
    fog: "rgba(20,60,30,0.10)",
    decors: ["tuft", "flower", "stone"],
    bossPalettes: [P("#5fd068", "#2f9e44", "#ffd94a"), P("#8ed148", "#57a12c", "#ff8080"), P("#3fbf8f", "#1f8f66", "#ffe08a")],
  },
  {
    name: "Hang Sâu",
    sub: "Tiếng cánh đập trong bóng tối",
    ground: ["#6b5f52", "#61564a", "#756859"],
    mob: P("#9b7fc4", "#6d5590", "#ff5a5a"),
    mobName: "Dơi Hang",
    mobKind: "bat",
    ambient: { type: "dust", color: "#c9b8a0" },
    fog: "rgba(10,8,20,0.30)",
    decors: ["stone", "crystal", "crack"],
    bossPalettes: [P("#9b7fc4", "#6d5590", "#ff5a5a"), P("#7f8fd4", "#5560a3", "#ffe08a"), P("#c47fae", "#905580", "#7fe0ff")],
  },
  {
    name: "Đỉnh Tuyết",
    sub: "Gió rít qua từng khe núi",
    ground: ["#dfe9ee", "#cfdde4", "#eef5f8"],
    mob: P("#f2f7fa", "#b9cdd8", "#7fd4ff"),
    mobName: "Người Tuyết",
    mobKind: "yeti",
    ambient: { type: "snow", color: "#ffffff" },
    fog: "rgba(180,210,230,0.14)",
    decors: ["snowpile", "tree", "stone"],
    bossPalettes: [P("#f2f7fa", "#b9cdd8", "#7fd4ff"), P("#a8d8f0", "#6fa8c8", "#ffffff"), P("#c8b8f0", "#9080c0", "#7fe0ff")],
  },
  {
    name: "Hoang Mạc",
    sub: "Cát cháy dưới mặt trời đỏ",
    ground: ["#dcbd72", "#d0ae5f", "#e6c981"],
    mob: P("#d98e3f", "#a35f22", "#ffe08a"),
    mobName: "Bọ Cạp Cát",
    mobKind: "scorpion",
    ambient: { type: "sand", color: "#e6c981" },
    fog: "rgba(230,180,90,0.12)",
    decors: ["cactus", "stone", "bone"],
    bossPalettes: [P("#d98e3f", "#a35f22", "#ffe08a"), P("#e0b03f", "#a87c1f", "#ff8080"), P("#c96a3f", "#934322", "#ffd94a")],
  },
  {
    name: "Đầm Lầy",
    sub: "Sương độc phủ mặt nước đen",
    ground: ["#5d7a4e", "#526d44", "#67865a"],
    mob: P("#d95763", "#a3333f", "#ffe9b8"),
    mobName: "Nấm Độc",
    mobKind: "mushroom",
    ambient: { type: "mist", color: "#b8e0a0" },
    fog: "rgba(40,70,40,0.24)",
    decors: ["mushroom", "puddle", "tuft"],
    bossPalettes: [P("#d95763", "#a3333f", "#ffe9b8"), P("#a86ad9", "#7a43a3", "#b8ff8a"), P("#57c4d9", "#338fa3", "#ffd94a")],
  },
  {
    name: "Núi Lửa",
    sub: "Dung nham sục sôi dưới chân",
    ground: ["#4a3430", "#402b28", "#543d38"],
    mob: P("#e25822", "#a33413", "#ffd23e"),
    mobName: "Quỷ Lửa",
    mobKind: "imp",
    ambient: { type: "ember", color: "#ff9d2e" },
    fog: "rgba(120,30,10,0.20)",
    decors: ["crack", "stone", "crystal"],
    bossPalettes: [P("#e25822", "#a33413", "#ffd23e"), P("#e2a022", "#a36a13", "#ff5a5a"), P("#d9435f", "#a32040", "#ffd23e")],
  },
  {
    name: "Vịnh San Hô",
    sub: "Thủy triều mang theo móng vuốt",
    ground: ["#d8c084", "#cbb173", "#e2cb92"],
    mob: P("#4fb3bf", "#2f8a96", "#ffd23e"),
    mobName: "Người Cá",
    mobKind: "fish",
    ambient: { type: "bubble", color: "#bff3ff" },
    fog: "rgba(30,90,110,0.12)",
    decors: ["shell", "puddle", "stone"],
    bossPalettes: [P("#4fb3bf", "#2f8a96", "#ffd23e"), P("#6f8fd9", "#4360a3", "#7fe0ff"), P("#5fc48f", "#338f60", "#ff8080")],
  },
  {
    name: "Rừng Đêm",
    sub: "Trăng mờ, bóng trắng vật vờ",
    ground: ["#2e4a3a", "#274031", "#355444"],
    mob: P("#bfd8d0", "#8fb3a8", "#9be8ff"),
    mobName: "Bóng Ma",
    mobKind: "ghost",
    ambient: { type: "wisp", color: "#9be8ff" },
    fog: "rgba(5,20,30,0.32)",
    decors: ["mushroom", "tuft", "bone"],
    bossPalettes: [P("#bfd8d0", "#8fb3a8", "#9be8ff"), P("#a8b8f0", "#7080c0", "#ffd94a"), P("#d0bfd8", "#a88fb3", "#8affc1")],
  },
  {
    name: "Chín Tầng Mây",
    sub: "Gió trời và những cú mổ trời giáng",
    ground: ["#b8d4e4", "#a9c8da", "#c6dfee"],
    mob: P("#f5f0e6", "#c9bfa8", "#ffb03e"),
    mobName: "Điểu Nhân",
    mobKind: "bird",
    ambient: { type: "sparkle", color: "#ffffff" },
    fog: "rgba(120,160,220,0.10)",
    decors: ["cloudpuff", "flower", "crystal"],
    bossPalettes: [P("#f5f0e6", "#c9bfa8", "#ffb03e"), P("#f0d8f5", "#c0a0c9", "#ffd94a"), P("#d8f0f5", "#a0c0c9", "#ff8080")],
  },
  {
    name: "Địa Ngục",
    sub: "Cửa ải cuối cùng của 100 màn",
    ground: ["#3b2026", "#321a20", "#45262e"],
    mob: P("#d13350", "#8f1f38", "#ffd23e"),
    mobName: "Tiểu Quỷ",
    mobKind: "demon",
    ambient: { type: "ash", color: "#ff6b6b" },
    fog: "rgba(80,10,20,0.26)",
    decors: ["bone", "crack", "crystal"],
    bossPalettes: [P("#d13350", "#8f1f38", "#ffd23e"), P("#e06a2f", "#a34318", "#ffd23e"), P("#b03fd9", "#7a20a3", "#ff5a5a")],
  },
];

export const biomeOf = (stage: number): Biome => BIOMES[Math.min(9, Math.floor((stage - 1) / 10))];

/* ============================ SKILLS ============================ */

export type SkillId = "bolt" | "orbit" | "aura" | "zap" | "boom" | "frost";
export type PassiveId = "speed" | "heart" | "power" | "haste" | "magnet" | "regen";

export interface SkillDef {
  id: SkillId;
  name: string;
  evoName: string;
  icon: string;
  desc: string;
  evoDesc: string;
}

export const SKILLS: SkillDef[] = [
  {
    id: "bolt",
    name: "Bùa Ánh Sáng",
    evoName: "Song Long Thiên Bùa",
    icon: "bolt",
    desc: "Phóng bùa vào kẻ địch gần nhất",
    evoDesc: "Hóa rồng truy đuổi, xuyên thủng mọi kẻ địch",
  },
  {
    id: "orbit",
    name: "Kiếm Hộ Mệnh",
    evoName: "Tử Thần Luân",
    icon: "orbit",
    desc: "Kiếm xoay quanh bảo vệ thân thể",
    evoDesc: "Lưỡi hái tử thần xé gió tầm xa",
  },
  {
    id: "aura",
    name: "Hào Quang Nắng",
    evoName: "Mặt Trời Nhỏ",
    icon: "aura",
    desc: "Sát thương kẻ địch ở gần mỗi nhịp",
    evoDesc: "Thiêu đốt diện rộng, mạnh gấp bội",
  },
  {
    id: "zap",
    name: "Sét Thiên",
    evoName: "Bão Sét Giận Dữ",
    icon: "zap",
    desc: "Gọi sét đánh kẻ địch ngẫu nhiên",
    evoDesc: "Sét lan truyền sang 6 mục tiêu",
  },
  {
    id: "boom",
    name: "Boomerang Gió",
    evoName: "Lưỡi Trăng Máu",
    icon: "boom",
    desc: "Ném boomerang xuyên địch, bay về tay",
    evoDesc: "Nguyệt đao kép khổng lồ càn quét",
  },
  {
    id: "frost",
    name: "Mưa Băng Giá",
    evoName: "Tuyệt Đỉnh Băng",
    icon: "frost",
    desc: "Rơi băng xuống đầu địch, làm chậm",
    evoDesc: "Bão băng hủy diệt đóng băng tất cả",
  },
];

export interface PassiveDef {
  id: PassiveId;
  name: string;
  icon: string;
  desc: string;
}

export const PASSIVES: PassiveDef[] = [
  { id: "speed", name: "Giày Gió", icon: "speed", desc: "+9% tốc độ chạy" },
  { id: "heart", name: "Trái Tim Khổng Lồ", icon: "heart", desc: "+22 máu tối đa & hồi 22" },
  { id: "power", name: "Sách Cổ Xưa", icon: "power", desc: "+14% sát thương" },
  { id: "haste", name: "Đồng Hồ Cát", icon: "haste", desc: "-8% hồi chiêu kỹ năng" },
  { id: "magnet", name: "Nam Châm Cổ", icon: "magnet", desc: "+40% phạm vi nhặt" },
  { id: "regen", name: "Thuốc Tiên", icon: "regen", desc: "+0.7 hồi máu mỗi giây" },
];

export const skillDef = (id: SkillId) => SKILLS.find((s) => s.id === id)!;
export const passiveDef = (id: PassiveId) => PASSIVES.find((p) => p.id === id)!;

/* ============================ LEVEL / CHOICES ============================ */

export const xpNeed = (lv: number) => Math.floor(7 + lv * 4 + Math.pow(lv, 1.5));

export interface Choice {
  kind: "new" | "up" | "evolve" | "passive" | "heal";
  id: string;
  name: string;
  desc: string;
  icon: string;
  tag: string;
}

/* ============================ BOSSES ============================ */

export interface BossInfo {
  name: string;
  kind: MobKind;
  colors: MobColors;
  arch: number; // 0..4
  king: boolean;
  hp: number;
  dmg: number;
  speed: number;
  scale: number;
}

const PREFIX = ["VUA", "CHÚA TỂ", "BẠO CHÚA", "HOÀNG ĐẾ", "QUỶ VƯƠNG", "TỔ SƯ", "ĐẠI ĐẾ", "MA VƯƠNG"];
const SUFFIX = [
  "HẮC ÁM",
  "BẤT TỬ",
  "CUỒNG NỘ",
  "HỦY DIỆT",
  "CỔ ĐẠI",
  "TỐI THƯỢNG",
  "BĂNG GIÁ",
  "SẤM SÉT",
  "HỖN LOẠN",
  "ĐỊA NGỤC",
];
export const ARCH_NAMES = ["Xung Kích", "Bắn Phá", "Triệu Hồi", "Xoáy Ốc", "Động Đất"];

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeBoss(stage: number): BossInfo {
  const biome = biomeOf(stage);
  const rnd = mulberry32(stage * 9973 + 17);
  const kind: MobKind = rnd() < 0.72 ? biome.mobKind : (["slime", "bat", "yeti", "scorpion", "mushroom", "imp", "fish", "ghost", "bird", "demon"] as MobKind[])[Math.floor(rnd() * 10)];
  const colors = biome.bossPalettes[stage % 3];
  const king = stage % 10 === 0;
  const arch = king ? (stage / 10 - 1) % 5 : Math.floor(rnd() * 5);
  const name =
    stage >= 100
      ? "HOÀNG ĐẾ HƯ VÔ CUỐI CÙNG"
      : king
        ? `${PREFIX[stage % 8]} ${biome.mobName.toUpperCase()} ${SUFFIX[stage % 10]}`
        : `${PREFIX[Math.floor(rnd() * 8)]} ${["SỪNG GÃY", "MẮT ĐỎ", "VÂY THÉP", "XƯƠNG TRẮNG", "RÊU PHONG", "NANH ĐỘC", "LỬA TÀN", "BÓNG ĐÊM", "CÁNH CỤT", "GAI SẮT"][Math.floor(rnd() * 10)]}`;
  const hp = Math.floor(260 * stage * (1 + stage * 0.045) * (king ? 1.9 : 1));
  return {
    name,
    kind,
    colors,
    arch,
    king,
    hp,
    dmg: 10 + stage * 1.4,
    speed: 52 + Math.min(60, stage * 0.8) + (king ? 8 : 0),
    scale: king ? 6 : 4.6,
  };
}

/* ============================ MISC BALANCE ============================ */

export const WORLD = 2600;
export const TOTAL_STAGES = 100;

export const mobHp = (stage: number, wave: number) =>
  Math.floor((7 + stage * 4.2) * (1 + (wave - 1) * 0.14));
export const mobDmg = (stage: number) => Math.floor(6 + stage * 1.15);
export const mobSpeed = (stage: number) => 62 + Math.min(85, stage * 0.85);
export const gemValue = (stage: number) => 1 + Math.floor(stage / 4);
export const waveQuota = (stage: number, wave: number) =>
  Math.min(10 + Math.floor(stage * 1.1) + wave * 3, 46);
