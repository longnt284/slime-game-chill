import { describe, expect, it } from "vitest";
import { aimVector, capFx, telegraphAlpha } from "./visuals";

describe("combat visual helpers", () => {
  it("keeps only the newest effects when a budget is exceeded", () => {
    expect(capFx([1, 2, 3, 4], 2)).toEqual([3, 4]);
  });

  it("fades telegraphs in and out around a readable peak", () => {
    expect(telegraphAlpha(1, 1)).toBe(0);
    expect(telegraphAlpha(0.5, 1)).toBeCloseTo(0.72, 2);
    expect(telegraphAlpha(0, 1)).toBe(0);
  });

  it("freezes a normalized aim vector for a boss telegraph and charge", () => {
    expect(aimVector(10, 20, 13, 24)).toEqual({ x: 0.6, y: 0.8 });
    expect(aimVector(4, 4, 4, 4)).toEqual({ x: 1, y: 0 });
  });
});
