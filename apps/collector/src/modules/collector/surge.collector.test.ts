import { describe, expect, it } from "vitest";

import { calculateSampleDurationMs } from "./surge.collector.js";

describe("calculateSampleDurationMs", () => {
  it("preserves the elapsed polling interval between Surge samples", () => {
    expect(calculateSampleDurationMs(12_000, 10_000)).toBe(2_000);
  });

  it("clamps non-positive durations to 1ms", () => {
    expect(calculateSampleDurationMs(10_000, 10_000)).toBe(1);
    expect(calculateSampleDurationMs(9_999, 10_000)).toBe(1);
  });
});
