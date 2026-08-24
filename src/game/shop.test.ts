import { describe, expect, it } from "vitest";
import { normalizeSave } from "./shop";

describe("save normalization", () => {
  it("removes invalid and duplicate ownership entries", () => {
    expect(normalizeSave({
      gold: -50,
      heroOwned: ["farmer_0", "farmer_0", "missing"],
      weaponOwned: ["w0", "missing", "w0"],
      hero: "missing",
      weapon: "missing",
    })).toEqual({
      gold: 0,
      heroOwned: ["farmer_0"],
      weaponOwned: ["w0"],
      hero: "farmer_0",
      weapon: "w0",
    });
  });

  it("does not equip a valid skin that is not owned", () => {
    expect(normalizeSave({ heroOwned: ["farmer_0"], hero: "knight_0" }).hero).toBe("farmer_0");
  });

  it("uses defaults when persisted data is not an object", () => {
    expect(normalizeSave("broken")).toEqual({
      gold: 100,
      heroOwned: ["farmer_0"],
      weaponOwned: ["w0"],
      hero: "farmer_0",
      weapon: "w0",
    });
  });
});
