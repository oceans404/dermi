import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import dotenv from "dotenv";

dotenv.config();

import { PORT } from "./config.js";
import { createApp } from "./app.js";
import type { CompiledIndex } from "./types.js";

// Works from both src/ (dev) and dist/src/ (production)
const dataPath = [
  resolve(import.meta.dirname, "../data/compiled-index.json"),
  resolve(import.meta.dirname, "../../data/compiled-index.json"),
].find(p => existsSync(p))!;
const index: CompiledIndex = JSON.parse(readFileSync(dataPath, "utf-8"));

const app = await createApp(index);

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT} — ${index.ingredients.length} ingredients loaded`);
});
