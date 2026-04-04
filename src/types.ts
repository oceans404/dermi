export interface RawSourceEntry {
  name: string;
  aliases: string[];
  rating?: number;
}

export interface SourceConfig {
  id: string;
  file: string;
  provides_rating: boolean;
}

export type RatingConfidence = "high" | "medium" | "low" | null;

export interface MergedIngredient {
  name: string;
  aliases: string[];
  rating: number | null;
  rating_confidence: RatingConfidence;
  sources: string[];
}

export interface IngredientsDataset {
  version: string;
  last_updated: string;
  ingredients: MergedIngredient[];
}

export interface CompiledIndex {
  exact: Record<string, number>;
  tokens: Record<string, number[]>;
  ingredients: MergedIngredient[];
}

export interface FlaggedIngredient {
  input: string;
  matched: string;
  rating: number | null;
  rating_confidence: RatingConfidence;
  fuzzy: boolean;
  sources: string[];
}

export interface CheckResponse {
  flagged: FlaggedIngredient[];
  total_checked: number;
}

export interface HealthResponse {
  status: "ok";
  timestamp: string;
}

export interface SourceMeta {
  id: string;
  name: string;
  provides_rating: boolean;
}

export interface MetaResponse {
  dataset_version: string;
  total_ingredients: number;
  rating_scale: { min: number; max: number; description: string };
  sources: SourceMeta[];
  fuzzy_match_threshold: number;
}

export interface ApiError {
  error: { code: "INVALID_INPUT" | "INTERNAL_ERROR"; message: string };
}

export interface NormalizeOptions {
  stripFillerWords?: boolean;
  fillerWords?: string[];
}

export interface MergeConflict {
  name: string;
  ratings: Record<string, number | undefined>;
  resolved_rating: number;
  resolved_confidence: RatingConfidence;
}

export interface MergeReport {
  total_merged: number;
  conflicts: MergeConflict[];
  generated_at: string;
}

export interface DedupePair {
  a: string;
  b: string;
  similarity: number;
  suggested_action: "merge" | "add_alias";
}

export interface DedupeReport {
  pairs: DedupePair[];
  generated_at: string;
}
