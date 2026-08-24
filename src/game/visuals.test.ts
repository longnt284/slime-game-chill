import { describe, expect, it } from "vitest";
import { capFx, telegraphAlpha } from "./visuals";

describe("combat visual helpers", () => {
  it("keeps only the newest effects when a budget is exceeded", () => {
    expect(capFx([1, 2, 3, 4], 2)).toEqual([3, 4]);
  });

  it("fades telegraphs in and out around a readable peak", () => {
    expect(telegraphAlpha(1, 1)).toBe(0);
    expect(telegraphAlpha(0.5, 1)).toBeCloseTo(0.72, 2);
    expect(telegraphAlpha(0, 1)).toBe(0);
  });
});
