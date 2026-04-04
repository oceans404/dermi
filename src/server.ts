import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import dotenv from "dotenv";

dotenv.config();

import { PORT } from "./config.js";
import { createApp } from "./app.js";
import type { CompiledIndex } from "./types.js";

const dataPath = resolve(import.meta.dirname, "../data/compiled-index.json");
const index: CompiledIndex = JSON.parse(readFileSync(dataPath, "utf-8"));

const app = await createApp(index);

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT} — ${index.ingredients.length} ingredients loaded`);
});
