import { describe, expect, it } from "vitest";
import {
  applyChoice,
  createInitialProgression,
  grantShard,
  pickShardTarget,
  rollChoices,
  shardTargets,
} from "./progression";
import { MAX_SKILL_TIER, SHARD_NEED } from "./balance";

describe("upgrade choices", () => {
  it("offers three distinct choices at the start of a run", () => {
    const state = createInitialProgression();
    expect(state.masteries).toEqual({ force: 0, vitality: 0, swiftness: 0, vacuum: 0 });

    const choices = rollChoices(state, () => 0.25);

    expect(choices).toHaveLength(3);
    expect(new Set(choices.map((choice) => `${choice.kind}:${choice.id}`)).size).toBe(3);
  });

  it("offers evolution before ordinary upgrades when a core is available", () => {
    const state = createInitialProgression();
    state.skills.bolt.lv = 5;
    state.cores = 1;

    expect(rollChoices(state, () => 0)[0]).toMatchObject({ kind: "evolve", id: "bolt" });
  });

  it("offers three masteries after the finite tree is complete", () => {
    const state = createInitialProgression();
    for (const skill of Object.values(state.skills)) {
      skill.lv = 6;
      skill.evolved = true;
    }
    for (const id of Object.keys(state.passives) as (keyof typeof state.passives)[]) {
      state.passives[id] = 5;
    }

    const choices = rollChoices(state, () => 0.4);

    expect(choices).toHaveLength(3);
    expect(choices.every((choice) => choice.kind === "mastery")).toBe(true);
  });

  it.each([2, 1, 0])("keeps three useful cards with %i mastery tracks remaining", (remaining) => {
    const state = createInitialProgression();
    for (const skill of Object.values(state.skills)) {
      skill.lv = 6;
      skill.evolved = true;
    }
    for (const id of Object.keys(state.passives) as (keyof typeof state.passives)[]) state.passives[id] = 5;
    const masteryIds = Object.keys(state.masteries) as (keyof typeof state.masteries)[];
    masteryIds.forEach((id, index) => {
      state.masteries[id] = index < masteryIds.length - remaining ? 30 : 29;
    });

    const choices = rollChoices(state, () => 0.2);

    expect(choices).toHaveLength(3);
    expect(new Set(choices.map((choice) => `${choice.kind}:${choice.id}`)).size).toBe(3);
  });

  it("never offers an upgrade past the sixth tier", () => {
    const state = createInitialProgression();
    state.skills.bolt.lv = MAX_SKILL_TIER;

    const choices = rollChoices(state, () => 0.5);

    expect(choices.some((choice) => choice.kind === "up" && choice.id === "bolt")).toBe(false);
    expect(applyChoice(state, {
      kind: "up",
      id: "bolt",
      name: "Bùa Ánh Sáng",
      desc: "",
      icon: "bolt",
      tag: "",
    }).skills.bolt.lv).toBe(MAX_SKILL_TIER);
  });

  it("applies a mastery without mutating the previous progression state", () => {
    const state = createInitialProgression();

    const next = applyChoice(state, {
      kind: "mastery",
      id: "force",
      name: "Uy Lực",
      desc: "+3% sát thương",
      icon: "power",
      tag: "Tinh thông 0 → 1",
    });

    expect(next.masteries.force).toBe(1);
    expect(state.masteries.force).toBe(0);
  });
});

describe("weapon shards", () => {
  it("turns a full stack of shards into exactly one new tier", () => {
    let state = createInitialProgression();
    const need = SHARD_NEED[0];

    for (let i = 1; i < need; i += 1) {
      const step = grantShard(state, "bolt");
      expect(step.tierUp).toBeNull();
      state = step.state;
    }

    const last = grantShard(state, "bolt");
    expect(last.tierUp).toBe(2);
    expect(last.state.skills.bolt.lv).toBe(2);
    expect(last.state.shards.bolt).toBe(0);
  });

  it("carries leftover shards into the next tier instead of dropping them", () => {
    const state = createInitialProgression();
    const overshoot = SHARD_NEED[0] + 3;

    const result = grantShard(state, "bolt", overshoot);

    expect(result.tierUp).toBe(2);
    expect(result.state.shards.bolt).toBe(3);
  });

  it("climbs several tiers at once when handed a huge pile of shards", () => {
    const state = createInitialProgression();
    const everything = SHARD_NEED.reduce((sum, need) => sum + need, 0);

    const result = grantShard(state, "bolt", everything);

    expect(result.tierUp).toBe(MAX_SKILL_TIER);
    expect(result.state.skills.bolt.lv).toBe(MAX_SKILL_TIER);
    expect(result.state.shards.bolt).toBe(0);
  });

  it("does not mutate the state it was handed", () => {
    const state = createInitialProgression();

    grantShard(state, "bolt", SHARD_NEED[0]);

    expect(state.shards.bolt).toBe(0);
    expect(state.skills.bolt.lv).toBe(1);
  });

  it("ignores skills that are not owned or already maxed", () => {
    const state = createInitialProgression();
    state.skills.frost.lv = MAX_SKILL_TIER;

    expect(shardTargets(state)).toEqual(["bolt"]);
    expect(grantShard(state, "orbit", 99).state.shards.orbit).toBe(0);
    expect(grantShard(state, "frost", 99).state.skills.frost.lv).toBe(MAX_SKILL_TIER);
  });

  it("aims shards at the weakest weapon in the build", () => {
    const state = createInitialProgression();
    state.skills.bolt.lv = 4;
    state.skills.orbit.lv = 1;

    expect(pickShardTarget(state, () => 0)).toBe("orbit");
    expect(pickShardTarget(createInitialProgression(), () => 0)).toBe("bolt");
  });

  it("has nothing to aim at once every owned weapon is maxed", () => {
    const state = createInitialProgression();
    state.skills.bolt.lv = MAX_SKILL_TIER;

    expect(pickShardTarget(state, () => 0)).toBeNull();
  });
});
