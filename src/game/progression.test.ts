import { describe, expect, it } from "vitest";
import { applyChoice, createInitialProgression, rollChoices } from "./progression";

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
      skill.lv = 8;
      skill.evolved = true;
    }
    for (const id of Object.keys(state.passives) as (keyof typeof state.passives)[]) {
      state.passives[id] = 5;
    }

    const choices = rollChoices(state, () => 0.4);

    expect(choices).toHaveLength(3);
    expect(choices.every((choice) => choice.kind === "mastery")).toBe(true);
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
