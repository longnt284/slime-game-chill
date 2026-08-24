/* Nhiệm vụ ngày: mỗi ngày rút ba nhiệm vụ theo hạt giống là chính ngày đó,
   nên cùng một ngày luôn ra cùng một bộ và sang ngày mới thì làm lại từ đầu.
   Phần thưởng là kim cương, thứ chỉ dùng để đổi skin Huyền Thoại. */

import { mulberry32 } from "./data";
import { EMPTY_QUEST_SAVE } from "./shop";
import type { QuestSave, SaveData } from "./shop";

/** Các chỉ số một trận đấu đóng góp cho nhiệm vụ. */
export interface RunTally {
  kills: number;
  elites: number;
  bosses: number;
  stages: number;
  shards: number;
  gold: number;
  seconds: number;
  bestStage: number;
  bestTier: number;
}

export const EMPTY_TALLY: RunTally = {
  kills: 0,
  elites: 0,
  bosses: 0,
  stages: 0,
  shards: 0,
  gold: 0,
  seconds: 0,
  bestStage: 0,
  bestTier: 0,
};

/** Chỉ số cộng dồn qua nhiều trận, khác với chỉ số chỉ lấy giá trị cao nhất. */
export type QuestMetric = keyof RunTally;

const CUMULATIVE: QuestMetric[] = ["kills", "elites", "bosses", "stages", "shards", "gold", "seconds"];

export interface QuestDef {
  id: string;
  metric: QuestMetric;
  target: number;
  gems: number;
  title: string;
  desc: string;
  icon: string;
}

interface QuestTemplate {
  id: string;
  metric: QuestMetric;
  targets: number[];
  gems: number;
  title: string;
  icon: string;
  desc: (target: number) => string;
}

/** Ba nhiệm vụ mỗi ngày, gom đủ được khoảng 12 kim cương. */
export const QUESTS_PER_DAY = 3;

const TEMPLATES: QuestTemplate[] = [
  {
    id: "hunt", metric: "kills", targets: [220, 320, 450], gems: 4, title: "Thợ Săn Thung Lũng", icon: "skull",
    desc: (t) => `Hạ ${t} quái trong ngày`,
  },
  {
    id: "elite", metric: "elites", targets: [8, 14, 20], gems: 5, title: "Diệt Tinh Anh", icon: "crown",
    desc: (t) => `Hạ ${t} quái tinh anh`,
  },
  {
    id: "boss", metric: "bosses", targets: [3, 5, 8], gems: 5, title: "Kẻ Đoạt Mệnh Trùm", icon: "crown",
    desc: (t) => `Hạ ${t} con trùm`,
  },
  {
    id: "clear", metric: "stages", targets: [4, 6, 9], gems: 4, title: "Đường Dài Không Nghỉ", icon: "arrow",
    desc: (t) => `Vượt ${t} màn`,
  },
  {
    id: "shard", metric: "shards", targets: [70, 110, 160], gems: 4, title: "Thợ Rèn Cần Mẫn", icon: "shard",
    desc: (t) => `Nhặt ${t} mảnh vũ khí`,
  },
  {
    id: "purse", metric: "gold", targets: [1600, 2600, 4000], gems: 3, title: "Túi Nặng Trĩu", icon: "coin",
    desc: (t) => `Kiếm ${t.toLocaleString("vi")} vàng`,
  },
  {
    id: "endure", metric: "seconds", targets: [600, 900, 1320], gems: 3, title: "Bền Bỉ", icon: "haste",
    desc: (t) => `Sống sót tổng cộng ${Math.round(t / 60)} phút`,
  },
  {
    id: "depth", metric: "bestStage", targets: [8, 12, 18], gems: 5, title: "Tiến Sâu", icon: "wave",
    desc: (t) => `Chạm tới màn ${t} trong một trận`,
  },
  {
    id: "forge", metric: "bestTier", targets: [3, 4, 5], gems: 5, title: "Tôi Luyện Vũ Khí", icon: "sword",
    desc: (t) => `Đưa một vũ khí lên bậc ${t}`,
  },
];

/** Khóa ngày theo giờ máy người chơi, dạng YYYY-MM-DD. */
export function dayKey(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = `${now.getMonth() + 1}`.padStart(2, "0");
  const d = `${now.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const seedOf = (key: string) => {
  let hash = 2166136261;
  for (let i = 0; i < key.length; i += 1) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

/** Bộ nhiệm vụ của một ngày; cùng ngày luôn cho ra cùng kết quả. */
export function dailyQuests(day: string): QuestDef[] {
  const rnd = mulberry32(seedOf(day));
  const pool = [...TEMPLATES];
  const picks: QuestDef[] = [];
  for (let i = 0; i < QUESTS_PER_DAY && pool.length > 0; i += 1) {
    const index = Math.floor(rnd() * pool.length);
    const template = pool.splice(index, 1)[0];
    const target = template.targets[Math.floor(rnd() * template.targets.length)];
    // Nhiệm vụ khó hơn thì thưởng nhiều hơn một chút.
    const stepUp = template.targets.indexOf(target);
    picks.push({
      id: template.id,
      metric: template.metric,
      target,
      gems: template.gems + stepUp,
      title: template.title,
      desc: template.desc(target),
      icon: template.icon,
    });
  }
  return picks;
}

/** Sang ngày mới thì dọn sạch tiến độ và danh sách đã nhận. */
export function questsForDay(saved: QuestSave, day: string): QuestSave {
  if (saved.day === day) return saved;
  return { day, progress: {}, claimed: [] };
}

/**
 * Cộng kết quả một chặng chơi vào tiến độ nhiệm vụ. Chỉ số cộng dồn thì
 * cộng thêm, còn chỉ số kiểu kỷ lục (màn sâu nhất, bậc vũ khí cao nhất)
 * thì chỉ giữ giá trị lớn nhất.
 */
export function applyTally(saved: QuestSave, day: string, tally: RunTally): QuestSave {
  const base = questsForDay(saved, day);
  const progress = { ...base.progress };
  for (const quest of dailyQuests(day)) {
    const gained = Math.max(0, Math.floor(tally[quest.metric] ?? 0));
    if (gained <= 0) continue;
    const current = progress[quest.id] ?? 0;
    progress[quest.id] = CUMULATIVE.includes(quest.metric)
      ? current + gained
      : Math.max(current, gained);
  }
  return { ...base, progress };
}

export interface QuestView extends QuestDef {
  done: number;
  complete: boolean;
  claimed: boolean;
}

export function questViews(saved: QuestSave, day: string): QuestView[] {
  const state = questsForDay(saved, day);
  return dailyQuests(day).map((quest) => {
    const done = Math.min(quest.target, state.progress[quest.id] ?? 0);
    return {
      ...quest,
      done,
      complete: done >= quest.target,
      claimed: state.claimed.includes(quest.id),
    };
  });
}

/** Số kim cương đang chờ nhận. */
export const claimableGems = (saved: QuestSave, day: string): number =>
  questViews(saved, day)
    .filter((quest) => quest.complete && !quest.claimed)
    .reduce((sum, quest) => sum + quest.gems, 0);

export interface ClaimResult {
  save: SaveData;
  gems: number;
}

/** Nhận thưởng một nhiệm vụ đã hoàn thành; nhiệm vụ chưa xong hoặc đã nhận thì bỏ qua. */
export function claimQuest(save: SaveData, id: string, day: string): ClaimResult {
  const quest = questViews(save.quests ?? EMPTY_QUEST_SAVE, day).find((item) => item.id === id);
  if (!quest || !quest.complete || quest.claimed) return { save, gems: 0 };
  const quests = questsForDay(save.quests, day);
  return {
    save: {
      ...save,
      gems: save.gems + quest.gems,
      quests: { ...quests, claimed: [...quests.claimed, id] },
    },
    gems: quest.gems,
  };
}
