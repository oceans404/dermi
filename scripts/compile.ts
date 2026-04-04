import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";
import { normalize, tokenize } from "../src/lib/normalize.js";
import type { IngredientsDataset, CompiledIndex } from "../src/types.js";

const ROOT = resolve(import.meta.dirname, "..");

const dataset: IngredientsDataset = JSON.parse(
  readFileSync(resolve(ROOT, "data/ingredients.json"), "utf-8")
);

const exact: Record<string, number> = {};
const tokens: Record<string, number[]> = {};
const ingredients = dataset.ingredients;

for (let i = 0; i < ingredients.length; i++) {
  const entry = ingredients[i];

  // Map normalized name and all aliases to this index
  const allNames = [entry.name, ...entry.aliases];
  for (const name of allNames) {
    const norm = normalize(name);
    if (norm) {
      if (norm in exact && exact[norm] !== i) {
        console.warn(`Warning: duplicate normalized key "${norm}" — index ${exact[norm]} (${ingredients[exact[norm]].name}) kept, index ${i} (${entry.name}) skipped`);
        continue;
      }
      exact[norm] = i;

      // Tokenize and add to token map
      for (const token of tokenize(norm)) {
        if (!tokens[token]) tokens[token] = [];
        if (!tokens[token].includes(i)) {
          tokens[token].push(i);
        }
      }
    }
  }
}

const index: CompiledIndex = {
  exact,
  tokens,
  ingredients,
};

writeFileSync(
  resolve(ROOT, "data/compiled-index.json"),
  JSON.stringify(index, null, 2)
);

console.log(`Compiled index: ${ingredients.length} ingredients, ${Object.keys(exact).length} exact entries, ${Object.keys(tokens).length} tokens`);
