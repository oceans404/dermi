import { describe, it, expect } from "vitest";
import { normalize } from "../src/lib/normalize.js";

describe("normalize", () => {
  it("lowercases input", () => {
    expect(normalize("COCONUT OIL")).toBe("coconut oil");
  });

  it("strips parentheses", () => {
    expect(normalize("Cocos Nucifera (Coconut) Oil")).toBe(
      "cocos nucifera coconut oil",
    );
  });

  it("strips commas", () => {
    expect(normalize("a, b, c")).toBe("a b c");
  });

  it("strips hyphens", () => {
    expect(normalize("alpha-hydroxy")).toBe("alphahydroxy");
  });

  it("collapses multiple spaces", () => {
    expect(normalize("coconut   oil")).toBe("coconut oil");
  });

  it("trims whitespace", () => {
    expect(normalize("  coconut oil  ")).toBe("coconut oil");
  });

  it("strips filler words when enabled", () => {
    expect(normalize("algae extract", { stripFillerWords: true })).toBe(
      "algae",
    );
  });

  it("does not strip filler words by default", () => {
    expect(normalize("algae extract")).toBe("algae extract");
  });
});
