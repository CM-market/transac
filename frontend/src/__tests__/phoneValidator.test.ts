import { describe, it, expect } from "vitest";
import { isValidCameroonPhone } from "../utils/phoneValidator";

describe("isValidCameroonPhone", () => {
  it("accepts a valid +237 number", () => {
    expect(isValidCameroonPhone("+237612345678")).toBe(true);
    expect(isValidCameroonPhone("+237 612 345 678")).toBe(true);
    expect(isValidCameroonPhone("+237-612-345-678")).toBe(true);
  });

  it("accepts a number with the 237 country code and no plus", () => {
    expect(isValidCameroonPhone("237612345678")).toBe(true);
  });

  it("rejects a bare local number without the country code", () => {
    expect(isValidCameroonPhone("612345678")).toBe(false);
  });

  it("rejects numbers of the wrong length", () => {
    expect(isValidCameroonPhone("")).toBe(false);
    expect(isValidCameroonPhone("+23761234567")).toBe(false); // too short
    expect(isValidCameroonPhone("+2376123456789")).toBe(false); // too long
  });

  it("rejects numbers with a different country code", () => {
    expect(isValidCameroonPhone("+33612345678")).toBe(false); // France
    expect(isValidCameroonPhone("+234612345678")).toBe(false); // Nigeria
  });

  it("ignores spaces, dashes and parentheses", () => {
    expect(isValidCameroonPhone("+237 (612) 345-678")).toBe(true);
  });
});
