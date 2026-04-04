import { Router } from "express";
import { validateCheck } from "../middleware/validateCheck.js";
import { matchIngredient } from "../services/matcher.js";
import { FUZZY_THRESHOLD } from "../config.js";
import type { CompiledIndex, CheckResponse, FlaggedIngredient } from "../types.js";

export function checkRouter(index: CompiledIndex): Router {
  const router = Router();

  router.post("/", validateCheck, (req, res) => {
    const ingredients: string[] = req.body.ingredients;
    const totalChecked = Math.min(ingredients.length, 20);
    const sliced = ingredients.slice(0, 20);
    const flagged: FlaggedIngredient[] = [];

    for (const ingredient of sliced) {
      if (ingredient === "") continue;
      const result = matchIngredient(ingredient, index, FUZZY_THRESHOLD);
      if (result) flagged.push(result);
    }

    const response: CheckResponse = { flagged, total_checked: totalChecked };
    res.json(response);
  });

  return router;
}
