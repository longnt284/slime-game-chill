import {
  MASTERY_DEFS,
  PASSIVES,
  SKILLS,
  passiveDef,
  skillDef,
} from "./data";
import type {
  Choice,
  MasteryId,
  PassiveId,
  SkillId,
} from "./data";

export interface ProgressionState {
  skills: Record<SkillId, { lv: number; evolved: boolean }>;
  passives: Record<PassiveId, number>;
  masteries: Record<MasteryId, number>;
  cores: number;
}

interface WeightedChoice {
  choice: Choice;
  weight: number;
}

export function createInitialProgression(): ProgressionState {
  return {
    skills: {
      bolt: { lv: 1, evolved: false },
      orbit: { lv: 0, evolved: false },
      aura: { lv: 0, evolved: false },
      zap: { lv: 0, evolved: false },
      boom: { lv: 0, evolved: false },
      frost: { lv: 0, evolved: false },
    },
    passives: { speed: 0, heart: 0, power: 0, haste: 0, magnet: 0, regen: 0 },
    masteries: { force: 0, vitality: 0, swiftness: 0, vacuum: 0 },
    cores: 0,
  };
}

const weightedIndex = (pool: WeightedChoice[], rng: () => number) => {
  const total = pool.reduce((sum, item) => sum + item.weight, 0);
  let cursor = Math.max(0, Math.min(0.999999999, rng())) * total;
  for (let index = 0; index < pool.length; index += 1) {
    cursor -= pool[index].weight;
    if (cursor < 0) return index;
  }
  return pool.length - 1;
};

const masteryChoice = (id: MasteryId, level: number): Choice => {
  const def = MASTERY_DEFS.find((item) => item.id === id)!;
  return {
    kind: "mastery",
    id,
    name: def.name,
    desc: def.desc,
    icon: def.icon,
    tag: `Tinh thông ${level} → ${level + 1}`,
  };
};

export function rollChoices(state: ProgressionState, rng: () => number = Math.random): Choice[] {
  const picks: Choice[] = [];
  const used = new Set<string>();
  const add = (choice: Choice) => {
    const key = `${choice.kind}:${choice.id}`;
    if (used.has(key) || picks.length >= 3) return;
    used.add(key);
    picks.push(choice);
  };

  if (state.cores > 0) {
    for (const id of Object.keys(state.skills) as SkillId[]) {
      const skill = state.skills[id];
      if (skill.lv >= 5 && !skill.evolved) {
        const def = skillDef(id);
        add({
          kind: "evolve",
          id,
          name: def.evoName,
          desc: def.evoDesc,
          icon: def.icon,
          tag: "TIẾN HÓA",
        });
      }
    }
  }

  const finitePool: WeightedChoice[] = [];
  for (const id of Object.keys(state.skills) as SkillId[]) {
    const skill = state.skills[id];
    if (skill.lv > 0 && skill.lv < 8 && !used.has(`evolve:${id}`)) {
      const def = skillDef(id);
      finitePool.push({
        choice: {
          kind: "up",
          id,
          name: skill.evolved ? def.evoName : def.name,
          desc: def.desc,
          icon: def.icon,
          tag: `Cấp ${skill.lv} → ${skill.lv + 1}`,
        },
        weight: 3,
      });
    }
  }

  for (const def of PASSIVES) {
    const level = state.passives[def.id];
    if (level < 5) {
      finitePool.push({
        choice: {
          kind: "passive",
          id: def.id,
          name: def.name,
          desc: def.desc,
          icon: def.icon,
          tag: `Cấp ${level} → ${level + 1}`,
        },
        weight: 2,
      });
    }
  }

  const ownedSkills = SKILLS.filter((skill) => state.skills[skill.id].lv > 0).length;
  if (ownedSkills < SKILLS.length) {
    for (const def of SKILLS) {
      if (state.skills[def.id].lv === 0) {
        finitePool.push({
          choice: {
            kind: "new",
            id: def.id,
            name: def.name,
            desc: def.desc,
            icon: def.icon,
            tag: "KỸ NĂNG MỚI",
          },
          weight: 4,
        });
      }
    }
  }

  while (picks.length < 3 && finitePool.length > 0) {
    const index = weightedIndex(finitePool, rng);
    add(finitePool[index].choice);
    finitePool.splice(index, 1);
  }

  const masteryPool = MASTERY_DEFS
    .filter((def) => state.masteries[def.id] < def.max)
    .map((def) => masteryChoice(def.id, state.masteries[def.id]));
  while (picks.length < 3 && masteryPool.length > 0) {
    const index = Math.floor(Math.max(0, Math.min(0.999999999, rng())) * masteryPool.length);
    add(masteryPool[index]);
    masteryPool.splice(index, 1);
  }

  if (picks.length === 0) {
    add({
      kind: "heal",
      id: "heal",
      name: "Bữa Ăn Thịnh Soạn",
      desc: "Hồi 50% máu tối đa",
      icon: "heart",
      tag: "HỒI PHỤC",
    });
  }

  return picks;
}

export function applyChoice(state: ProgressionState, choice: Choice): ProgressionState {
  const next: ProgressionState = {
    skills: Object.fromEntries(
      Object.entries(state.skills).map(([id, skill]) => [id, { ...skill }]),
    ) as ProgressionState["skills"],
    passives: { ...state.passives },
    masteries: { ...state.masteries },
    cores: state.cores,
  };

  if (choice.kind === "new") next.skills[choice.id as SkillId].lv = 1;
  if (choice.kind === "up") next.skills[choice.id as SkillId].lv += 1;
  if (choice.kind === "evolve") {
    next.skills[choice.id as SkillId].evolved = true;
    next.cores = Math.max(0, next.cores - 1);
  }
  if (choice.kind === "passive") next.passives[choice.id as PassiveId] += 1;
  if (choice.kind === "mastery") next.masteries[choice.id as MasteryId] += 1;

  return next;
}
