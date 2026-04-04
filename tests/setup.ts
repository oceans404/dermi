import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createApp } from "../src/app.js";
import type { CompiledIndex } from "../src/types.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

export const stubIndex: CompiledIndex = JSON.parse(
  readFileSync(resolve(__dirname, "fixtures/stub-index.json"), "utf-8"),
);

export async function getTestApp() {
  return createApp(stubIndex);
}
