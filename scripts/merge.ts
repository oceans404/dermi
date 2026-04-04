import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { resolve } from "path";
import { normalize } from "../src/lib/normalize.js";
import { SOURCES, DATASET_VERSION } from "../src/config.js";
import type {
  RawSourceEntry,
  MergedIngredient,
  IngredientsDataset,
  MergeConflict,
  MergeReport,
  RatingConfidence,
} from "../src/types.js";

const ROOT = resolve(import.meta.dirname, "..");

interface SourceEntry extends RawSourceEntry {
  _sourceId: string;
  _providesRating: boolean;
}

// Load all sources
const allEntries: SourceEntry[] = [];
for (const src of SOURCES) {
  const raw: RawSourceEntry[] = JSON.parse(
    readFileSync(resolve(ROOT, src.file), "utf-8")
  );
  for (const entry of raw) {
    allEntries.push({
      ...entry,
      _sourceId: src.id,
      _providesRating: src.provides_rating,
    });
  }
}

// Group by normalized name, collecting all names/aliases into a lookup
const normalizedMap = new Map<
  string,
  {
    canonicalName: string;
    aliases: Set<string>;
    ratings: Map<string, number | undefined>; // sourceId -> rating
    sources: Set<string>;
  }
>();

function getOrCreate(normalizedName: string, displayName: string) {
  let entry = normalizedMap.get(normalizedName);
  if (!entry) {
    entry = {
      canonicalName: displayName,
      aliases: new Set(),
      ratings: new Map(),
      sources: new Set(),
    };
    normalizedMap.set(normalizedName, entry);
  }
  return entry;
}

// First pass: build entries keyed by normalized primary name
for (const se of allEntries) {
  const normName = normalize(se.name);
  const entry = getOrCreate(normName, se.name);
  entry.sources.add(se._sourceId);

  if (se._providesRating && se.rating !== undefined) {
    entry.ratings.set(se._sourceId, se.rating);
  }

  for (const alias of se.aliases) {
    entry.aliases.add(alias);
  }
}

// Second pass: merge entries that share a normalized alias with a normalized primary name
// Build alias -> primary normalized name mapping
const aliasToPrimary = new Map<string, string>();
for (const [normName, entry] of normalizedMap) {
  aliasToPrimary.set(normName, normName);
  for (const alias of entry.aliases) {
    const normAlias = normalize(alias);
    if (normAlias !== normName) {
      // Check if this alias is also a primary name of another entry
      if (normalizedMap.has(normAlias) && normAlias !== normName) {
        // Merge the other entry into this one
        const other = normalizedMap.get(normAlias)!;
        for (const src of other.sources) entry.sources.add(src);
        for (const [srcId, rating] of other.ratings) {
          if (!entry.ratings.has(srcId)) entry.ratings.set(srcId, rating);
        }
        for (const a of other.aliases) entry.aliases.add(a);
        entry.aliases.add(other.canonicalName);
        normalizedMap.delete(normAlias);
      }
      aliasToPrimary.set(normAlias, normName);
    }
  }
}

// Also check if any primary names match as aliases of earlier entries
// (handles case where source B's primary name is source A's alias)
const primaryNames = [...normalizedMap.keys()];
for (const normName of primaryNames) {
  if (!normalizedMap.has(normName)) continue;
  const entry = normalizedMap.get(normName)!;
  for (const otherNorm of primaryNames) {
    if (otherNorm === normName || !normalizedMap.has(otherNorm)) continue;
    const otherEntry = normalizedMap.get(otherNorm)!;
    // Check if otherEntry's aliases contain normName
    const otherNormAliases = [...otherEntry.aliases].map((a) => normalize(a));
    if (otherNormAliases.includes(normName)) {
      // Merge entry into otherEntry
      for (const src of entry.sources) otherEntry.sources.add(src);
      for (const [srcId, rating] of entry.ratings) {
        if (!otherEntry.ratings.has(srcId))
          otherEntry.ratings.set(srcId, rating);
      }
      for (const a of entry.aliases) otherEntry.aliases.add(a);
      otherEntry.aliases.add(entry.canonicalName);
      normalizedMap.delete(normName);
      break;
    }
  }
}

// Resolve ratings and build final dataset
const conflicts: MergeConflict[] = [];
const ingredients: MergedIngredient[] = [];

for (const [, entry] of normalizedMap) {
  const ratedValues: number[] = [];
  for (const [, rating] of entry.ratings) {
    if (rating !== undefined) ratedValues.push(rating);
  }

  let rating: number | null = null;
  let ratingConfidence: RatingConfidence = null;

  if (ratedValues.length === 0) {
    rating = null;
    ratingConfidence = null;
  } else if (ratedValues.length === 1) {
    rating = ratedValues[0];
    ratingConfidence = "medium";
  } else {
    const allSame = ratedValues.every((v) => v === ratedValues[0]);
    if (allSame) {
      rating = ratedValues[0];
      ratingConfidence = "high";
    } else {
      rating = Math.round(
        ratedValues.reduce((a, b) => a + b, 0) / ratedValues.length
      );
      ratingConfidence = "low";

      const ratingsRecord: Record<string, number | undefined> = {};
      for (const [srcId, r] of entry.ratings) {
        ratingsRecord[srcId] = r;
      }
      conflicts.push({
        name: entry.canonicalName,
        ratings: ratingsRecord,
        resolved_rating: rating,
        resolved_confidence: ratingConfidence,
      });
    }
  }

  // Remove canonical name from aliases, dedupe aliases
  const aliasSet = new Set<string>();
  for (const alias of entry.aliases) {
    if (normalize(alias) !== normalize(entry.canonicalName)) {
      aliasSet.add(alias);
    }
  }

  ingredients.push({
    name: entry.canonicalName,
    aliases: [...aliasSet],
    rating,
    rating_confidence: ratingConfidence,
    sources: [...entry.sources],
  });
}

// Sort by name
ingredients.sort((a, b) => a.name.localeCompare(b.name));

const dataset: IngredientsDataset = {
  version: DATASET_VERSION,
  last_updated: new Date().toISOString().split("T")[0],
  ingredients,
};

mkdirSync(resolve(ROOT, "data"), { recursive: true });

writeFileSync(
  resolve(ROOT, "data/ingredients.json"),
  JSON.stringify(dataset, null, 2)
);

const report: MergeReport = {
  total_merged: ingredients.length,
  conflicts,
  generated_at: new Date().toISOString(),
};

writeFileSync(
  resolve(ROOT, "data/merge-report.json"),
  JSON.stringify(report, null, 2)
);

console.log(`Merged ${ingredients.length} ingredients from ${SOURCES.length} sources`);
console.log(`${conflicts.length} rating conflicts flagged in merge-report.json`);
