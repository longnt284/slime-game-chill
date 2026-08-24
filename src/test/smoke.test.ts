import { describe, expect, it } from "vitest";
import { TOTAL_STAGES } from "../game/data";

describe("game configuration", () => {
  it("ships the complete 100-stage campaign", () => {
    expect(TOTAL_STAGES).toBe(100);
  });
});
