import { distance } from "fastest-levenshtein";
import { normalize, tokenize } from "../lib/normalize.js";
import type { CompiledIndex, FlaggedIngredient } from "../types.js";

export function matchIngredient(
  input: string,
  index: CompiledIndex,
  threshold: number,
): FlaggedIngredient | null {
  const normalized = normalize(input);

  // Exact lookup
  if (normalized in index.exact) {
    const idx = index.exact[normalized];
    const ingredient = index.ingredients[idx];
    return {
      input,
      matched: ingredient.name,
      rating: ingredient.rating,
      rating_confidence: ingredient.rating_confidence,
      fuzzy: false,
      sources: ingredient.sources,
    };
  }

  // Token-based fuzzy matching
  const tokens = tokenize(normalized);
  const candidateSet = new Set<number>();
  for (const token of tokens) {
    const indices = index.tokens[token];
    if (indices) {
      for (const i of indices) candidateSet.add(i);
    }
  }

  const minSimilarity = threshold / 100;
  let bestSimilarity = 0;
  let bestIdx = -1;

  for (const idx of candidateSet) {
    const ingredient = index.ingredients[idx];
    const candidateName = normalize(ingredient.name);
    const names = [candidateName, ...ingredient.aliases.map((a) => normalize(a))];

    for (const name of names) {
      const maxLen = Math.max(normalized.length, name.length);
      if (maxLen === 0) continue;
      const similarity = 1 - distance(normalized, name) / maxLen;
      if (similarity > bestSimilarity) {
        bestSimilarity = similarity;
        bestIdx = idx;
      }
    }
  }

  if (bestIdx >= 0 && bestSimilarity >= minSimilarity) {
    const ingredient = index.ingredients[bestIdx];
    return {
      input,
      matched: ingredient.name,
      rating: ingredient.rating,
      rating_confidence: ingredient.rating_confidence,
      fuzzy: true,
      sources: ingredient.sources,
    };
  }

  return null;
}
