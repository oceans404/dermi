import type { NormalizeOptions } from "../types.js";

const DEFAULT_FILLER_WORDS = ["extract", "powder", "leaf"];

export function normalize(input: string, options?: NormalizeOptions): string {
  let result = input.toLowerCase();
  result = result.replace(/[^\w\s]/g, "");
  result = result.replace(/\s+/g, " ").trim();

  if (options?.stripFillerWords) {
    const fillers = options.fillerWords || DEFAULT_FILLER_WORDS;
    const words = result.split(" ");
    result = words.filter((w) => !fillers.includes(w)).join(" ");
  }

  return result;
}

export function tokenize(normalized: string): string[] {
  return [...new Set(normalized.split(" ").filter(Boolean))];
}
