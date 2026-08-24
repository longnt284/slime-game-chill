import type { MobColors, MobKind } from "./sprites";
import { MOB_KINDS } from "./sprites";
import { bossStats } from "./balance";
export { gemValue, mobDmg, mobHp, mobSpeed, waveQuota, xpNeed } from "./balance";
export { MAX_SKILL_TIER, SHARD_NEED, shardNeed } from "./balance";

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
    name: "Đồng Hoa Dại",
    sub: "Phấn hoa ngọt lịm che giấu nanh vuốt",
    ground: ["#8fb85e", "#7ea551", "#a3cc72"],
    mob: P("#e86fa8", "#b23f78", "#fff0a0"),
    mobName: "Nhện Hoa",
    mobKind: "spider",
    ambient: { type: "petal", color: "#ffc6e0" },
    fog: "rgba(255,190,220,0.10)",
    decors: ["flower", "tuft", "vine"],
    bossPalettes: [P("#e86fa8", "#b23f78", "#fff0a0"), P("#c99ae8", "#9268b8", "#ffd94a"), P("#8fd06f", "#5fa042", "#ff8080")],
  },
  {
    name: "Bãi Đá Ngầm",
    sub: "Sóng ngầm nghiến vào đá đen",
    ground: ["#7f8c96", "#707d87", "#93a0aa"],
    mob: P("#f2793f", "#b8481c", "#ffe08a"),
    mobName: "Cua Đá",
    mobKind: "crab",
    ambient: { type: "bubble", color: "#cfeaff" },
    fog: "rgba(40,70,95,0.18)",
    decors: ["shell", "coral", "stone"],
    bossPalettes: [P("#f2793f", "#b8481c", "#ffe08a"), P("#4fb3bf", "#2f8a96", "#ffd23e"), P("#9b7fc4", "#6d5590", "#7fe0ff")],
  },
  {
    name: "Phế Tích Cổ",
    sub: "Đá tảng thức giấc sau ngàn năm",
    ground: ["#a89a80", "#988a70", "#bcae94"],
    mob: P("#8f9a86", "#5f6a58", "#7fe0ff"),
    mobName: "Golem Đá",
    mobKind: "golem",
    ambient: { type: "dust", color: "#e0d4b8" },
    fog: "rgba(90,80,60,0.16)",
    decors: ["obelisk", "stone", "crack"],
    bossPalettes: [P("#8f9a86", "#5f6a58", "#7fe0ff"), P("#c0a878", "#8f7a4c", "#ffd94a"), P("#7f8fd4", "#5560a3", "#b8ff8a")],
  },
  {
    name: "Rừng Nấm Lân",
    sub: "Bào tử phát sáng trong bóng tối ẩm",
    ground: ["#3d3a5c", "#34314f", "#4a476b"],
    mob: P("#5fe8c0", "#2fa88a", "#ff8ae0"),
    mobName: "Đom Đóm Ma",
    mobKind: "wisp",
    ambient: { type: "spore", color: "#8fffd8" },
    fog: "rgba(30,20,60,0.28)",
    decors: ["mushroom", "crystal", "vine"],
    bossPalettes: [P("#5fe8c0", "#2fa88a", "#ff8ae0"), P("#a86ad9", "#7a43a3", "#8fffd8"), P("#e8e05f", "#a8a02f", "#7fe0ff")],
  },
  {
    name: "Sa Mạc Muối",
    sub: "Trắng xóa tới tận chân trời",
    ground: ["#e6e2d4", "#d8d3c3", "#f2eee2"],
    mob: P("#c4a86f", "#8f7642", "#5fd0e8"),
    mobName: "Bọ Muối",
    mobKind: "beetle",
    ambient: { type: "sand", color: "#fffaf0" },
    fog: "rgba(230,225,200,0.16)",
    decors: ["bone", "crystal", "stone"],
    bossPalettes: [P("#c4a86f", "#8f7642", "#5fd0e8"), P("#d98e3f", "#a35f22", "#ffe08a"), P("#8fb0c4", "#5f7f92", "#ffd94a")],
  },
  {
    name: "Hang Rồng",
    sub: "Hơi thở lửa vọng từ lòng núi",
    ground: ["#5a3a2e", "#4c3026", "#6b483a"],
    mob: P("#e8c23f", "#b0871c", "#ff5a5a"),
    mobName: "Xà Long",
    mobKind: "serpent",
    ambient: { type: "ember", color: "#ffb03e" },
    fog: "rgba(90,40,10,0.22)",
    decors: ["crack", "obelisk", "crystal"],
    bossPalettes: [P("#e8c23f", "#b0871c", "#ff5a5a"), P("#e25822", "#a33413", "#ffd23e"), P("#c44f8f", "#8f2f62", "#ffe08a")],
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

/** Chia đều 100 màn cho toàn bộ biome, màn cuối luôn rơi vào bản đồ cuối. */
export const biomeOf = (stage: number): Biome => {
  const s = Math.max(1, Math.min(TOTAL_STAGES, Math.floor(stage) || 1));
  const span = TOTAL_STAGES / BIOMES.length;
  return BIOMES[Math.min(BIOMES.length - 1, Math.floor((s - 1) / span))];
};

/** Biome dùng làm nguồn quái "khách" trộn vào đợt spawn cho đỡ đơn điệu. */
export const altBiomeOf = (biome: Biome): Biome =>
  BIOMES[(BIOMES.indexOf(biome) + Math.floor(BIOMES.length / 2) + 1) % BIOMES.length];

/* ============================ SKILLS ============================ */

export type SkillId = "bolt" | "orbit" | "aura" | "zap" | "boom" | "frost";
export type PassiveId = "speed" | "heart" | "power" | "haste" | "magnet" | "regen";
export type MasteryId = "force" | "vitality" | "swiftness" | "vacuum";

export interface SkillDef {
  id: SkillId;
  name: string;
  evoName: string;
  icon: string;
  desc: string;
  evoDesc: string;
  /** Mô tả sức mạnh mở ra ở từng bậc 1..6, dùng cho thẻ nâng cấp và HUD. */
  tiers: string[];
}

export const SKILLS: SkillDef[] = [
  {
    id: "bolt",
    name: "Bùa Ánh Sáng",
    evoName: "Song Long Thiên Bùa",
    icon: "bolt",
    desc: "Phóng bùa vào kẻ địch gần nhất",
    evoDesc: "Hóa rồng truy đuổi, xuyên thủng mọi kẻ địch",
    tiers: [
      "Một tia bùa bắn thẳng vào địch gần nhất",
      "Bắn hai tia, quạt bùa xòe rộng gấp đôi",
      "Bùa xuyên qua một kẻ địch rồi bay tiếp",
      "Ba tia cùng lúc, xuyên hai kẻ địch",
      "Bốn tia phủ kín một góc rộng trước mặt",
      "Năm tia khổng lồ xuyên thủng cả hàng quái",
    ],
  },
  {
    id: "orbit",
    name: "Kiếm Hộ Mệnh",
    evoName: "Tử Thần Luân",
    icon: "orbit",
    desc: "Kiếm xoay quanh bảo vệ thân thể",
    evoDesc: "Lưỡi hái tử thần xé gió tầm xa",
    tiers: [
      "Hai lưỡi kiếm quét nửa vòng 180 độ trước mặt",
      "Kiếm khép kín trọn vòng 360 độ quanh thân",
      "Ba lưỡi, vòng quét rộng và chém nhanh hơn",
      "Bốn lưỡi kiếm, bán kính vươn xa hơn nữa",
      "Năm lưỡi kiếm rực sáng, nhịp chém dồn dập",
      "Sáu lưỡi khổng lồ dựng thành bão kiếm",
    ],
  },
  {
    id: "aura",
    name: "Hào Quang Nắng",
    evoName: "Mặt Trời Nhỏ",
    icon: "aura",
    desc: "Sát thương kẻ địch ở gần mỗi nhịp",
    evoDesc: "Thiêu đốt diện rộng, mạnh gấp bội",
    tiers: [
      "Quét nắng nửa vòng 180 độ, trúng 4 kẻ địch",
      "Mở trọn 360 độ, trúng tới 6 kẻ địch",
      "Vùng nắng rộng hơn, trúng 9 kẻ địch",
      "Nhịp quét nhanh hơn, trúng 13 kẻ địch",
      "Vầng nắng chói lòa, trúng 18 kẻ địch",
      "Bão nắng phủ kín màn hình, trúng 26 kẻ địch",
    ],
  },
  {
    id: "zap",
    name: "Sét Thiên",
    evoName: "Bão Sét Giận Dữ",
    icon: "zap",
    desc: "Gọi sét đánh kẻ địch ngẫu nhiên",
    evoDesc: "Sét lan truyền qua cả đám đông",
    tiers: [
      "Một tia sét giáng xuống một mục tiêu",
      "Hai tia sét, mỗi tia nổ lan ra xung quanh",
      "Vùng nổ rộng hơn sau mỗi cú sét",
      "Ba tia sét cùng lúc, nổ mạnh hơn",
      "Bốn tia sét xé toạc chiến trường",
      "Năm tia sét kèm vùng nổ khổng lồ",
    ],
  },
  {
    id: "boom",
    name: "Boomerang Gió",
    evoName: "Lưỡi Trăng Máu",
    icon: "boom",
    desc: "Ném boomerang xuyên địch, bay về tay",
    evoDesc: "Nguyệt đao kép khổng lồ càn quét",
    tiers: [
      "Một lưỡi bay thẳng, xuyên hết hàng quái",
      "Lưỡi to hơn và bay xa hơn",
      "Ném hai lưỡi tỏa thành hình quạt",
      "Quạt rộng hơn, lưỡi nặng đô hơn",
      "Ba lưỡi cùng bay, phủ kín một vùng rộng",
      "Ba nguyệt đao khổng lồ quét sạch lối đi",
    ],
  },
  {
    id: "frost",
    name: "Mưa Băng Giá",
    evoName: "Tuyệt Đỉnh Băng",
    icon: "frost",
    desc: "Rơi băng xuống đầu địch, làm chậm",
    evoDesc: "Bão băng hủy diệt đóng băng tất cả",
    tiers: [
      "Hai tảng băng rơi xuống, trúng 5 kẻ địch",
      "Ba tảng băng, vùng nổ rộng hơn",
      "Bốn tảng băng, trúng tới 10 kẻ địch",
      "Năm tảng băng phủ băng cả một vùng",
      "Sáu tảng băng, trúng 19 kẻ địch",
      "Bảy tảng băng khổng lồ, trúng 26 kẻ địch",
    ],
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

export interface MasteryDef {
  id: MasteryId;
  name: string;
  icon: string;
  desc: string;
  max: number;
}

export const MASTERY_DEFS: MasteryDef[] = [
  { id: "force", name: "Uy Lực", icon: "power", desc: "+3% sát thương", max: 30 },
  { id: "vitality", name: "Sinh Lực", icon: "heart", desc: "+6 máu tối đa và hồi 6", max: 30 },
  { id: "swiftness", name: "Thân Pháp", icon: "speed", desc: "+1% tốc độ", max: 30 },
  { id: "vacuum", name: "Hấp Lực", icon: "magnet", desc: "+6% phạm vi nhặt", max: 30 },
];

export const skillDef = (id: SkillId) => SKILLS.find((s) => s.id === id)!;
export const passiveDef = (id: PassiveId) => PASSIVES.find((p) => p.id === id)!;

/* ============================ LEVEL / CHOICES ============================ */

export interface Choice {
  kind: "new" | "up" | "evolve" | "passive" | "mastery" | "heal";
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
  const kind: MobKind = rnd() < 0.72 ? biome.mobKind : MOB_KINDS[Math.floor(rnd() * MOB_KINDS.length)];
  const colors = biome.bossPalettes[stage % 3];
  const king = stage % 10 === 0;
  const arch = king ? (stage / 10 - 1) % 5 : Math.floor(rnd() * 5);
  const name =
    stage >= 100
      ? "HOÀNG ĐẾ HƯ VÔ CUỐI CÙNG"
      : king
        ? `${PREFIX[stage % 8]} ${biome.mobName.toUpperCase()} ${SUFFIX[stage % 10]}`
        : `${PREFIX[Math.floor(rnd() * 8)]} ${["SỪNG GÃY", "MẮT ĐỎ", "VÂY THÉP", "XƯƠNG TRẮNG", "RÊU PHONG", "NANH ĐỘC", "LỬA TÀN", "BÓNG ĐÊM", "CÁNH CỤT", "GAI SẮT"][Math.floor(rnd() * 10)]}`;
  const stats = bossStats(stage, king);
  return {
    name,
    kind,
    colors,
    arch,
    king,
    hp: stats.hp,
    dmg: stats.dmg,
    speed: stats.speed,
    scale: king ? 6 : 4.6,
  };
}

/* ============================ MISC BALANCE ============================ */

export const WORLD = 2600;
export const TOTAL_STAGES = 100;
