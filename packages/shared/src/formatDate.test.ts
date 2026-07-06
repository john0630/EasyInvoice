import { describe, expect, it } from "vitest";
import { formatDate } from "./formatDate";

describe("formatDate", () => {
  it("formats as day month year", () => {
    expect(formatDate("2026-07-06")).toBe("6 July 2026");
  });

  it("returns empty string for empty input", () => {
    expect(formatDate("")).toBe("");
  });
});
