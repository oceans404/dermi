# Pore-Clogging Ingredient Checker API Spec

## Agent Assignments

This spec is split across three agents working in parallel. Two are TypeScript engineers, one is a researcher. Each agent has a clearly scoped lane. There is one synchronization point where the researcher hands off data to Agent TS-2 before they can proceed -- everything else is non-blocking.

### Agent R-1: Researcher

Owns the dataset. Works entirely in parallel with both TS agents until the handoff.

**Deliverables:**
- `sources/fulton.json`
- `sources/emme_diane.json`
- `sources/incidecoder.json` (if obtainable)
- `sources/cosdna.json` (if obtainable)
- `data/ingredients.json` (merged, deduplicated, reviewed)
- `data/compiled-index.json`

**Steps:** Follow the Research Steps and Data Pipeline sections of this spec. Run `merge.ts` and `dedupe.ts` once TS-1 has delivered the build scripts, resolve the review reports manually, then run `compile.ts` to produce `compiled-index.json`.

**Handoff:** When `compiled-index.json` and `ingredients.json` are ready, notify TS-2. These are the only two files TS-2 needs to complete integration and testing.

---

### Agent TS-1: Core API and Build Scripts

Owns the Express app and the build pipeline. Does not need to wait on anyone.

**Deliverables:**
- Full Express/TypeScript project scaffold
- `lib/normalize.ts` -- shared normalization function
- `scripts/merge.ts`
- `scripts/dedupe.ts`
- `scripts/compile.ts`
- `GET /health`
- `GET /meta`
- `POST /check` -- fully implemented, loads `compiled-index.json` at startup
- OpenAPI spec served at `GET /docs`
- `README.md` with setup instructions and example curl commands

**Notes:**
- `POST /check` should work with a stub `compiled-index.json` (a small hand-written sample of 5-10 ingredients) so the endpoint is testable before R-1 delivers the real dataset
- `lib/normalize.ts` must be imported by both the build scripts and the API -- never duplicated
- Include a `npm run build:index` script that runs merge, dedupe, and compile in sequence

---

### Agent TS-2: Integration, Testing, and Validation

Owns correctness verification. Waits on TS-1 for the project scaffold, then can begin writing tests against the stub dataset. Waits on R-1 for `compiled-index.json` before final validation.

**Deliverables:**
- Test suite covering `POST /check`, `GET /health`, `GET /meta`
- Validation that fuzzy matching works correctly against real ingredient names
- Validation that `total_checked` is correct when >20 ingredients are sent
- Validation that `rating: null` ingredients are still flagged correctly
- Validation that `rating_confidence` values are assigned correctly
- A `test-inputs.json` file with a range of real-world ingredient list examples for manual spot-checking

**Notes:**
- Can begin writing tests against TS-1's stub dataset immediately -- tests should pass on stub and on real data without modification
- Once R-1 delivers the compiled index, run the full suite and flag any ingredients in the real dataset that are producing unexpected fuzzy match results back to R-1 for review

---

### Synchronization Points

```
TS-1 ──────────────────────────────────────► done
       │
       └─ scaffold + stub index ──► TS-2 ──► tests pass on stub
                                        │
R-1 ──────────────────────────────► compiled-index.json
                                        │
                                    TS-2 ──► full validation, done
```

The only hard dependency is TS-2 waiting on R-1's compiled index for final validation. Everything else runs in parallel.

---

## Overview

A REST API that accepts a list of skincare/cosmetic ingredients and returns any that are known or suspected to clog pores, along with their comedogenic rating where available.

---

## Stack

- **Runtime:** Node.js
- **Framework:** Express
- **Language:** TypeScript
- **Docs:** OpenAPI 3.0 (served at `/docs`)

---

## Endpoints

### `POST /check`

The core endpoint. Accepts up to 20 ingredients. If more than 20 are provided, only the first 20 are evaluated -- no error is thrown.

**Request**
```json
{
  "ingredients": ["coconut oil", "niacinamide", "cocoa butter"]
}
```

**Response**
```json
{
  "flagged": [
    {
      "input": "coconut oil",
      "matched": "Coconut Oil",
      "rating": 4,
      "rating_confidence": "high",
      "fuzzy": false,
      "sources": ["fulton_1989", "emme_diane"]
    },
    {
      "input": "cocoa butter",
      "matched": "Cocoa Butter",
      "rating": null,
      "rating_confidence": null,
      "fuzzy": false,
      "sources": ["emme_diane"]
    }
  ],
  "total_checked": 3
}
```

**Rules**
- `total_checked` is `min(ingredients.length, 20)`
- No `clean` list is returned
- Ingredients are checked in order, first 20 only
- Empty strings in the array are skipped but still count toward the 20

---

### `GET /health`

Returns service status. Useful for agents to verify the API is reachable before making requests.

**Response**
```json
{
  "status": "ok",
  "timestamp": "2026-04-03T12:00:00Z"
}
```

---

### `GET /meta`

Returns metadata about the dataset so agents can understand what they're working with.

**Response**
```json
{
  "dataset_version": "1.0.0",
  "total_ingredients": 312,
  "rating_scale": {
    "min": 0,
    "max": 5,
    "description": "0 = non-comedogenic, 5 = highly comedogenic"
  },
  "sources": [
    {
      "id": "fulton_1989",
      "name": "Fulton 1989 Study",
      "provides_rating": true
    },
    {
      "id": "emme_diane",
      "name": "Emme Diane Ingredient List",
      "provides_rating": false
    }
  ],
  "fuzzy_match_threshold": 80
}
```

---

### `GET /docs`

Serves the OpenAPI spec (Swagger UI).

---

## Fuzzy Matching

Matching happens in two passes:

1. **Exact match** after normalization (lowercase, strip punctuation, collapse whitespace). If found, `fuzzy: false`.
2. **Levenshtein distance** against all dataset entries. If the best match scores above the threshold (default: 80% similarity), it's returned with `fuzzy: true`. If nothing clears the threshold, the ingredient is not flagged.

The threshold is configurable via environment variable (`FUZZY_THRESHOLD`, default `80`).

---

## Dataset

### Structure

Each entry in the dataset is a JSON object:

```json
{
  "name": "Coconut Oil",
  "aliases": ["Cocos Nucifera Oil", "Cocos Nucifera (Coconut) Oil"],
  "rating": 4,
  "sources": ["fulton_1989", "emme_diane"]
}
```

- `name` — canonical INCI name
- `aliases` — alternate names or brand/common names that should match to this entry
- `rating` — integer 0–5, or `null` if no source provides one
- `sources` — which sources list this ingredient

### Handling Multiple Sources

When compiling the dataset from multiple sources, use this reconciliation strategy:

**If all rated sources agree:** use that rating, set `rating_confidence: "high"`

**If rated sources disagree:** average them and round, set `rating_confidence: "low"` -- and flag it for manual review

**If no source provides a rating:** set `rating: null` and `rating_confidence: null` -- the ingredient is still flagged as a known pore-clogger, just without a numeric rating

**If only one source provides a rating:** use it, set `rating_confidence: "medium"`

This means an ingredient can appear in the flagged list even with `rating: null`. The presence in the dataset is itself the signal.

### Recommended Sources

| Source | Has Ratings | Notes |
|---|---|---|
| Fulton 1989 (published paper) | Yes | Gold standard, but old and rabbit-ear based |
| INCIDecoder | Yes | More modern, science-forward |
| Emme Diane list | No | Broad coverage, no ratings |
| CosDNA | Yes | Community-sourced, lower reliability |

Compile these manually or semi-manually into a single `ingredients.json` file. Treat it as a versioned artifact -- bump the version in `/meta` whenever it changes.

### Versioning the Dataset

Keep `ingredients.json` versioned (e.g. `1.0.0`) and include a `last_updated` field. This lets agents and consumers know how fresh the data is and gives you a clean upgrade path as you add sources over time.

---

## Error Handling

All errors return a consistent shape:

```json
{
  "error": {
    "code": "INVALID_INPUT",
    "message": "ingredients must be a non-empty array of strings"
  }
}
```

**Error codes**

| Code | HTTP Status | When |
|---|---|---|
| `INVALID_INPUT` | 400 | `ingredients` is missing, not an array, or contains non-strings |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

Note: sending more than 20 ingredients is not an error -- the first 20 are silently processed.

---

## Agent-Friendliness Notes

- The OpenAPI spec at `/docs` is the primary way agents should discover this API
- `/meta` tells an agent the rating scale and sources before it interprets results
- `rating_confidence` lets an agent communicate uncertainty downstream rather than treating all ratings as equally reliable
- `sources` on each flagged ingredient lets an agent cite provenance if needed
- Error messages are human-readable but also machine-parseable via `code`

---

## Data Pipeline

### Source Files

Raw data from each source lives in `sources/` as individual JSON files. Each follows the same shape:

```json
[
  {
    "name": "Coconut Oil",
    "aliases": ["Cocos Nucifera Oil"],
    "rating": 4
  }
]
```

Sources that don't provide ratings omit the `rating` field entirely (not `null`) so the merge step can distinguish "this source doesn't rate" from "this source says unrated."

### Recommended Sources and How to Get Them

| Source | Has Ratings | How to Get |
|---|---|---|
| Fulton 1989 | Yes | Transcribe manually or find a GitHub repo that has done it already -- see research steps below |
| INCIDecoder | Yes | No public API or bulk download -- scrape individual ingredient pages (check ToS first), or pull ratings from product pages which are more accessible |
| Emme Diane | No | Full list is on a single webpage as plain HTML -- easy to scrape with Cheerio or copy-paste into a spreadsheet |
| CosDNA | Yes | More database-like structure, has been scraped before -- check ToS, treat ratings as low-reliability |

### Research Steps

Before building the dataset, use a combination of GitHub search and parallel web search to find existing work. This will save significant time -- the Fulton data in particular has likely already been compiled by someone.

**GitHub search (use GitHub MCP)**

Run the following searches and collect any repos that contain ingredient lists, CSVs, or JSON files with comedogenic data. For each result, check the license before using the data.

- `comedogenic ingredients dataset`
- `comedogenic ingredients JSON`
- `comedogenic ingredients CSV`
- `fulton 1989 comedogenic`
- `pore clogging ingredients list`
- `acne safe ingredients database`

For any promising repo, look for: how many ingredients are covered, whether ratings are included, when it was last updated, and what sources it cites. Prefer repos that cite Fulton 1989 directly.

**Parallel web search (use web search MCP)**

Run these searches in parallel to find transcriptions, scraped data, and community-compiled lists:

- `"fulton 1989" comedogenic ingredients list site:github.com`
- `comedogenic rating list filetype:csv`
- `comedogenic ingredients JSON download`
- `cosdna comedogenic database scraper`
- `incidecoder comedogenic scraper github`
- `emme diane pore clogging ingredients list`
- `acne clinic nyc pore clogging ingredients list`

**What to do with results**

For each source found, record: the URL or repo, the license, whether it has ratings, the approximate ingredient count, and which primary sources it draws from. Compile this into a short inventory before deciding which to use. If a repo already has clean JSON with Fulton ratings, that becomes your `sources/fulton.json` starting point and saves the manual transcription entirely.

If no clean existing dataset is found, fall back to manual transcription of Fulton 1989 (the paper is widely cited and excerpts are easy to find) and manual copy of the Emme Diane HTML list.

### Build Scripts

```
sources/
  fulton.json
  emme_diane.json
  incidecoder.json
  cosdna.json
        ↓
scripts/
  merge.ts        ← reconcile sources, handle conflicts, set rating_confidence
  dedupe.ts       ← fuzzy match dataset against itself, output review report
  compile.ts      ← generate compiled-index.json
        ↓
data/
  ingredients.json        ← human-readable canonical dataset (versioned, commit this)
  compiled-index.json     ← what the API loads at runtime (can be gitignored, generated at build)
```

**`merge.ts`**

Combines all source files into `ingredients.json`. For each ingredient:
- If the same name appears in multiple sources, merge their aliases and reconcile ratings using the confidence rules defined in the Dataset section above
- Flag any ingredient where sources disagree on rating for manual review -- output these to a `merge-report.json` rather than auto-resolving
- Deduplicate aliases within each entry

**`dedupe.ts`**

Runs fuzzy matching on the merged dataset against itself to catch near-duplicates before the index is compiled. For every pair of entries that scores above the fuzzy threshold but isn't already linked:
- Outputs a `dedupe-report.json` with the pair, their scores, and suggested action (merge or add alias)
- Never auto-merges -- always surfaces for manual review

You should run this and resolve the report before running `compile.ts`. This is your one-time cleanup pass and should be re-run whenever new sources are added.

**`compile.ts`**

Takes `ingredients.json` and generates `compiled-index.json`. This is what the API actually loads at runtime. The compiled index has three parts:

```json
{
  "exact": {
    "coconut oil": 0,
    "cocos nucifera oil": 0,
    "cocoa butter": 1
  },
  "tokens": {
    "coconut": [0],
    "oil": [0, 1, 3, 7],
    "cocoa": [1],
    "butter": [1, 4]
  },
  "ingredients": [ ...full dataset array... ]
}
```

- `exact` maps every normalized name and alias to its index in `ingredients`
- `tokens` maps individual words to which ingredient indices contain them -- used to narrow fuzzy match candidates
- `ingredients` is the full dataset array

### Normalization

Every ingredient name runs through the same normalization function in both the build step and at runtime:

1. Lowercase
2. Strip punctuation
3. Collapse whitespace
4. Optionally strip common filler words ("extract", "powder", "leaf") -- configurable, off by default

The same function must be used in both places or the index won't match incoming queries.

### Runtime Matching

At runtime, `/check` loads `compiled-index.json` once on startup. For each ingredient in the request:

1. Normalize the input
2. Check `exact` map -- if found, `fuzzy: false`, done
3. If not found, tokenize the input and look up each token in the `tokens` map to get a set of candidate indices
4. Run Levenshtein only against those candidates (not the full dataset)
5. If the best candidate clears the threshold, return it with `fuzzy: true`
6. If nothing clears the threshold, the ingredient is not flagged

This keeps runtime matching fast even as the dataset grows.

### Updating the Dataset

1. Edit or add to the relevant file in `sources/`
2. Run `merge.ts` -- review `merge-report.json` and resolve any conflicts manually in `ingredients.json`
3. Run `dedupe.ts` -- review `dedupe-report.json` and resolve manually
4. Run `compile.ts` to regenerate `compiled-index.json`
5. Bump the version in `ingredients.json` and in `/meta`

---

## Future Considerations

- **x402 payment middleware** can wrap `/check` without touching the core logic
- **Batch endpoint** (`POST /check/batch`) for multiple products at once, if needed
- **`/ingredients` endpoint** to expose the full dataset for download or browsing