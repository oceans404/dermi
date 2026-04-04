import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";
import { distance } from "fastest-levenshtein";
import { normalize, tokenize } from "../src/lib/normalize.js";
import { FUZZY_THRESHOLD } from "../src/config.js";
import type { IngredientsDataset, DedupePair, DedupeReport } from "../src/types.js";

const ROOT = resolve(import.meta.dirname, "..");

const dataset: IngredientsDataset = JSON.parse(
  readFileSync(resolve(ROOT, "data/ingredients.json"), "utf-8")
);

const entries = dataset.ingredients;
const pairs: DedupePair[] = [];

// Collect all normalized names and tokens per entry
const entryData: {
  idx: number;
  names: string[];
  tokenSet: Set<string>;
}[] = entries.map((entry, idx) => {
  const names = [
    normalize(entry.name),
    ...entry.aliases.map((a) => normalize(a)),
  ];
  const tokenSet = new Set<string>();
  for (const name of names) {
    for (const t of tokenize(name)) tokenSet.add(t);
  }
  return { idx, names, tokenSet };
});

// Build token -> entry indices map for candidate narrowing
const tokenToEntries = new Map<string, Set<number>>();
for (const ed of entryData) {
  for (const t of ed.tokenSet) {
    if (!tokenToEntries.has(t)) tokenToEntries.set(t, new Set());
    tokenToEntries.get(t)!.add(ed.idx);
  }
}

// Build candidate pairs: only compare entries that share at least one token
const candidatePairs = new Set<string>();
for (const [, indices] of tokenToEntries) {
  const arr = [...indices];
  for (let x = 0; x < arr.length; x++) {
    for (let y = x + 1; y < arr.length; y++) {
      const key = `${Math.min(arr[x], arr[y])},${Math.max(arr[x], arr[y])}`;
      candidatePairs.add(key);
    }
  }
}

// Build alias linkage set to skip already-linked entries
const aliasLinked = new Set<string>();
for (const ed of entryData) {
  for (const name of ed.names) {
    for (const other of entryData) {
      if (other.idx === ed.idx) continue;
      if (other.names.includes(name)) {
        const key = `${Math.min(ed.idx, other.idx)},${Math.max(ed.idx, other.idx)}`;
        aliasLinked.add(key);
      }
    }
  }
}

for (const pairKey of candidatePairs) {
  if (aliasLinked.has(pairKey)) continue;

  const [iStr, jStr] = pairKey.split(",");
  const i = parseInt(iStr, 10);
  const j = parseInt(jStr, 10);
  const a = entryData[i];
  const b = entryData[j];

  let bestSimilarity = 0;
  let bestA = "";
  let bestB = "";

  for (const nameA of a.names) {
    for (const nameB of b.names) {
      // Skip pairs where both names are under 5 chars
      if (nameA.length < 5 && nameB.length < 5) continue;

      const maxLen = Math.max(nameA.length, nameB.length);
      if (maxLen === 0) continue;

      const dist = distance(nameA, nameB);
      const similarity = Math.round(((maxLen - dist) / maxLen) * 100);

      if (similarity > bestSimilarity) {
        bestSimilarity = similarity;
        bestA = entries[i].name;
        bestB = entries[j].name;
      }
    }
  }

  if (bestSimilarity >= FUZZY_THRESHOLD && bestSimilarity < 100) {
    pairs.push({
      a: bestA,
      b: bestB,
      similarity: bestSimilarity,
      suggested_action: bestSimilarity >= 90 ? "merge" : "add_alias",
    });
  }
}

// Sort by similarity descending
pairs.sort((a, b) => b.similarity - a.similarity);

const report: DedupeReport = {
  pairs,
  generated_at: new Date().toISOString(),
};

writeFileSync(
  resolve(ROOT, "data/dedupe-report.json"),
  JSON.stringify(report, null, 2)
);

console.log(`Found ${pairs.length} potential duplicate pairs (threshold: ${FUZZY_THRESHOLD}%)`);
if (pairs.length > 0) {
  console.log("Top matches:");
  for (const p of pairs.slice(0, 10)) {
    console.log(`  ${p.similarity}% — "${p.a}" ↔ "${p.b}" (${p.suggested_action})`);
  }
}
