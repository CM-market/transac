// Dummy test to prevent test command from failing when no real tests exist
import { describe, it, expect } from "vitest";

describe("Dummy Test Suite", () => {
  it("should pass a dummy test", () => {
    expect(true).toBe(true);
  });

  it("should verify basic math", () => {
    expect(1 + 1).toBe(2);
  });
});
