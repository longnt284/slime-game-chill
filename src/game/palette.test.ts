import { describe, expect, it } from "vitest";
import {
  MOOD_PERIOD,
  hexToHsl,
  hexToRgb,
  mixHex,
  rgbToHex,
  shiftPalette,
  weaponPaletteAt,
} from "./palette";
import type { WeaponPalette } from "./palette";

const BASE: WeaponPalette = {
  bolt: "#ffd94a",
  core: "#fff3d0",
  blade: "#e8dcc0",
  blade2: "#b5793a",
  aura: "#ffe08a",
  glow: "#ffb03e",
};

const isHex = (value: string) => /^#[0-9a-f]{6}$/.test(value);

describe("colour helpers", () => {
  it("round-trips a hex colour through rgb", () => {
    expect(rgbToHex(hexToRgb("#ffd94a"))).toBe("#ffd94a");
    expect(hexToRgb("#fff")).toEqual({ r: 255, g: 255, b: 255 });
  });

  it("falls back to black instead of NaN on a broken value", () => {
    expect(hexToRgb("nonsense")).toEqual({ r: 0, g: 0, b: 0 });
    expect(hexToRgb("")).toEqual({ r: 0, g: 0, b: 0 });
  });

  it("mixes two colours and clamps the ratio", () => {
    expect(mixHex("#000000", "#ffffff", 0.5)).toBe("#808080");
    expect(mixHex("#000000", "#ffffff", -4)).toBe("#000000");
    expect(mixHex("#000000", "#ffffff", 9)).toBe("#ffffff");
  });
});

describe("weapon palette shifting", () => {
  it("moves the whole palette toward a new hue while keeping light and dark apart", () => {
    const shifted = shiftPalette(BASE, "#4a3aff");

    for (const value of Object.values(shifted)) expect(isHex(value)).toBe(true);
    expect(hexToHsl(shifted.bolt).h).toBeCloseTo(hexToHsl("#4a3aff").h, 2);
    // Thứ tự sáng tối giữa lõi và sống kiếm phải giữ nguyên để hình không bị vỡ.
    expect(hexToHsl(shifted.core).l).toBeGreaterThan(hexToHsl(shifted.blade2).l);
  });

  it("still tints a palette that starts out nearly colourless", () => {
    const grey: WeaponPalette = {
      bolt: "#f0f0e8", core: "#ffffff", blade: "#f0efe8",
      blade2: "#a8a69c", aura: "#ffffff", glow: "#d8d6c8",
    };

    const shifted = shiftPalette(grey, "#8ad4ff");

    expect(hexToHsl(shifted.bolt).s).toBeGreaterThan(hexToHsl(grey.bolt).s);
    expect(shifted.bolt).not.toBe(grey.bolt);
  });
});

describe("palette over time", () => {
  const moods = [BASE, shiftPalette(BASE, "#4a3aff"), shiftPalette(BASE, "#3affc0")];

  it("holds the starting colour for a while before drifting", () => {
    expect(weaponPaletteAt(moods, 0)).toEqual(BASE);
    expect(weaponPaletteAt(moods, MOOD_PERIOD * 0.4)).toEqual(BASE);
    expect(weaponPaletteAt(moods, MOOD_PERIOD * 0.9).bolt).not.toBe(BASE.bolt);
  });

  it("walks through every mood and loops back to the first", () => {
    expect(weaponPaletteAt(moods, MOOD_PERIOD)).toEqual(moods[1]);
    expect(weaponPaletteAt(moods, MOOD_PERIOD * 2)).toEqual(moods[2]);
    expect(weaponPaletteAt(moods, MOOD_PERIOD * 3)).toEqual(moods[0]);
  });

  it("always returns usable colours, even for odd clock values", () => {
    for (const t of [-5, 0, 0.1, 1234.567, Number.NaN, Number.POSITIVE_INFINITY]) {
      const palette = weaponPaletteAt(moods, t);
      for (const value of Object.values(palette)) expect(isHex(value)).toBe(true);
    }
  });

  it("stays on the single palette a one-colour skin would have", () => {
    expect(weaponPaletteAt([BASE], 99)).toBe(BASE);
  });
});
