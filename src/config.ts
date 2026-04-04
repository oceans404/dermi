import type { SourceConfig } from "./types.js";

export const PORT = parseInt(process.env.PORT || "3000", 10);
export const FUZZY_THRESHOLD = parseInt(process.env.FUZZY_THRESHOLD || "80", 10);
export const STRIP_FILLER_WORDS = process.env.STRIP_FILLER_WORDS === "true";
export const DATASET_VERSION = "1.0.0";

export const EVM_ADDRESS = process.env.EVM_ADDRESS || "";
export const STELLAR_ADDRESS = process.env.STELLAR_ADDRESS || "";
export const EVM_MAINNET_ADDRESS = process.env.EVM_MAINNET_ADDRESS || "";
export const STELLAR_MAINNET_ADDRESS = process.env.STELLAR_MAINNET_ADDRESS || "";
export const CHECK_PRICE = process.env.CHECK_PRICE || "$0.01";
export const OZ_FACILITATOR_URL = process.env.OZ_FACILITATOR_URL || "";
export const OZ_API_KEY = process.env.OZ_API_KEY || "";

export const SOURCES: SourceConfig[] = [
  { id: "fulton_1989", file: "sources/fulton.json", provides_rating: true },
  { id: "emme_diane", file: "sources/emme_diane.json", provides_rating: true },
  { id: "clearstem", file: "sources/clearstem.json", provides_rating: false },
];
