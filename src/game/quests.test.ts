import { describe, expect, it } from "vitest";
import {
  EMPTY_TALLY,
  QUESTS_PER_DAY,
  applyTally,
  claimQuest,
  claimableGems,
  dailyQuests,
  dayKey,
  questViews,
  questsForDay,
} from "./quests";
import type { RunTally } from "./quests";
import { EMPTY_QUEST_SAVE, normalizeSave } from "./shop";
import type { QuestSave, SaveData } from "./shop";

const DAY = "2026-08-24";
const NEXT_DAY = "2026-08-25";

const tally = (partial: Partial<RunTally>): RunTally => ({ ...EMPTY_TALLY, ...partial });

const saveWith = (quests: QuestSave, gems = 0): SaveData => ({
  ...normalizeSave(null),
  gems,
  quests,
});

describe("daily quest rotation", () => {
  it("formats the day key from local time", () => {
    expect(dayKey(new Date(2026, 7, 24, 23, 59))).toBe("2026-08-24");
    expect(dayKey(new Date(2026, 0, 5, 0, 1))).toBe("2026-01-05");
  });

  it("hands out the same three quests all day and a different set tomorrow", () => {
    const today = dailyQuests(DAY);

    expect(today).toHaveLength(QUESTS_PER_DAY);
    expect(dailyQuests(DAY)).toEqual(today);
    expect(new Set(today.map((quest) => quest.id)).size).toBe(QUESTS_PER_DAY);
    for (const quest of today) {
      expect(quest.target).toBeGreaterThan(0);
      expect(quest.gems).toBeGreaterThan(0);
      expect(quest.desc.length).toBeGreaterThan(0);
    }
  });

  it("keeps the daily haul worth chasing but never trivial", () => {
    for (const day of ["2026-01-01", "2026-06-15", DAY, NEXT_DAY, "2027-12-31"]) {
      const total = dailyQuests(day).reduce((sum, quest) => sum + quest.gems, 0);
      expect(total).toBeGreaterThanOrEqual(9);
      expect(total).toBeLessThanOrEqual(21);
    }
  });

  it("wipes progress and claims when the day rolls over", () => {
    const yesterday: QuestSave = { day: DAY, progress: { hunt: 90 }, claimed: ["hunt"] };

    expect(questsForDay(yesterday, DAY)).toBe(yesterday);
    expect(questsForDay(yesterday, NEXT_DAY)).toEqual({ day: NEXT_DAY, progress: {}, claimed: [] });
  });
});

describe("quest progress", () => {
  /** Bộ nhiệm vụ mỗi ngày một khác, nên tìm ngày thật sự có mục cần kiểm tra. */
  const dayWith = (metric: RunTally extends never ? never : keyof RunTally) => {
    for (let offset = 0; offset < 400; offset += 1) {
      const date = new Date(2026, 0, 1 + offset);
      const key = dayKey(date);
      const quest = dailyQuests(key).find((item) => item.metric === metric);
      if (quest) return { key, quest };
    }
    throw new Error(`Không có ngày nào ra nhiệm vụ theo chỉ số ${metric}`);
  };

  it("adds up counting quests across several runs", () => {
    const { key, quest } = dayWith("kills");

    let quests = applyTally(EMPTY_QUEST_SAVE, key, tally({ kills: 50 }));
    quests = applyTally(quests, key, tally({ kills: 70 }));

    expect(quests.progress[quest.id]).toBe(120);
  });

  it("keeps only the best result for record-style quests", () => {
    const { key, quest } = dayWith("bestStage");

    let quests = applyTally(EMPTY_QUEST_SAVE, key, tally({ bestStage: 9 }));
    quests = applyTally(quests, key, tally({ bestStage: 4 }));

    expect(quests.progress[quest.id]).toBe(9);
  });

  it("covers every quest metric somewhere in the rotation", () => {
    const metrics: (keyof RunTally)[] = [
      "kills", "elites", "bosses", "stages", "shards", "gold", "seconds", "bestStage", "bestTier",
    ];
    for (const metric of metrics) expect(dayWith(metric).quest.metric).toBe(metric);
  });

  it("starts a fresh sheet when a run is banked on a new day", () => {
    const yesterday: QuestSave = { day: DAY, progress: { hunt: 300 }, claimed: ["hunt"] };

    const rolled = applyTally(yesterday, NEXT_DAY, tally({ kills: 10 }));

    expect(rolled.day).toBe(NEXT_DAY);
    expect(rolled.claimed).toEqual([]);
    expect(rolled.progress.hunt ?? 0).toBeLessThanOrEqual(10);
  });

  it("caps the shown progress at the target and flags completion", () => {
    const quest = dailyQuests(DAY)[0];
    const quests = applyTally(EMPTY_QUEST_SAVE, DAY, tally({ [quest.metric]: quest.target * 3 } as Partial<RunTally>));

    const view = questViews(quests, DAY).find((item) => item.id === quest.id)!;

    expect(view.done).toBe(quest.target);
    expect(view.complete).toBe(true);
    expect(view.claimed).toBe(false);
  });
});

describe("claiming rewards", () => {
  const finished = (): QuestSave => {
    let quests = EMPTY_QUEST_SAVE;
    for (const quest of dailyQuests(DAY)) {
      quests = applyTally(quests, DAY, tally({ [quest.metric]: quest.target } as Partial<RunTally>));
    }
    return quests;
  };

  it("pays the gems once and then marks the quest as claimed", () => {
    const quest = dailyQuests(DAY)[0];
    const save = saveWith(finished());

    const first = claimQuest(save, quest.id, DAY);
    expect(first.gems).toBe(quest.gems);
    expect(first.save.gems).toBe(quest.gems);
    expect(first.save.quests.claimed).toContain(quest.id);

    const second = claimQuest(first.save, quest.id, DAY);
    expect(second.gems).toBe(0);
    expect(second.save.gems).toBe(quest.gems);
  });

  it("refuses to pay for an unfinished or unknown quest", () => {
    const save = saveWith(EMPTY_QUEST_SAVE);

    expect(claimQuest(save, dailyQuests(DAY)[0].id, DAY).gems).toBe(0);
    expect(claimQuest(save, "no-such-quest", DAY).gems).toBe(0);
    expect(claimQuest(save, dailyQuests(DAY)[0].id, DAY).save.gems).toBe(0);
  });

  it("does not mutate the save it was handed", () => {
    const save = saveWith(finished());

    claimQuest(save, dailyQuests(DAY)[0].id, DAY);

    expect(save.gems).toBe(0);
    expect(save.quests.claimed).toEqual([]);
  });

  it("reports how many gems are still waiting to be collected", () => {
    const quests = finished();
    const total = dailyQuests(DAY).reduce((sum, quest) => sum + quest.gems, 0);

    expect(claimableGems(quests, DAY)).toBe(total);
    expect(claimableGems(EMPTY_QUEST_SAVE, DAY)).toBe(0);
    // Sang ngày mới thì tiến độ hôm qua không còn nhận được nữa.
    expect(claimableGems(quests, NEXT_DAY)).toBe(0);
  });
});
