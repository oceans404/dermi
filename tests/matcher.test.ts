import { describe, it, expect } from "vitest";
import { matchIngredient } from "../src/services/matcher.js";
import { stubIndex } from "./setup.js";

describe("matchIngredient", () => {
  it("returns exact match with fuzzy false", () => {
    const result = matchIngredient("coconut oil", stubIndex, 80);
    expect(result).not.toBeNull();
    expect(result!.matched).toBe("Coconut Oil");
    expect(result!.fuzzy).toBe(false);
  });

  it("returns fuzzy match with fuzzy true for misspelling", () => {
    const result = matchIngredient("cocunut oil", stubIndex, 80);
    expect(result).not.toBeNull();
    expect(result!.matched).toBe("Coconut Oil");
    expect(result!.fuzzy).toBe(true);
  });

  it("returns null for no match", () => {
    const result = matchIngredient("xyzzyplugh", stubIndex, 80);
    expect(result).toBeNull();
  });

  it("matches by alias", () => {
    const result = matchIngredient("Cocos Nucifera Oil", stubIndex, 80);
    expect(result).not.toBeNull();
    expect(result!.matched).toBe("Coconut Oil");
    expect(result!.fuzzy).toBe(false);
  });

  it("returns correct rating and confidence", () => {
    const result = matchIngredient("lauric acid", stubIndex, 80);
    expect(result).not.toBeNull();
    expect(result!.rating).toBe(4);
    expect(result!.rating_confidence).toBe("low");
  });

  it("handles null-rated ingredient", () => {
    const result = matchIngredient("cocoa butter", stubIndex, 80);
    expect(result).not.toBeNull();
    expect(result!.rating).toBeNull();
    expect(result!.rating_confidence).toBeNull();
  });
});
