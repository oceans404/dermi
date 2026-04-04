import { Router } from "express";
import { DATASET_VERSION, FUZZY_THRESHOLD } from "../config.js";
import type { CompiledIndex, MetaResponse } from "../types.js";

export function metaRouter(index: CompiledIndex): Router {
  const router = Router();

  router.get("/", (_req, res) => {
    const response: MetaResponse = {
      dataset_version: DATASET_VERSION,
      total_ingredients: index.ingredients.length,
      rating_scale: {
        min: 0,
        max: 5,
        description: "0 = non-comedogenic, 5 = highly comedogenic",
      },
      sources: [
        { id: "fulton_1989", name: "Fulton 1989 Study", provides_rating: true },
        { id: "emme_diane", name: "Emme Diane Ingredient List", provides_rating: true },
        { id: "clearstem", name: "ClearStem Pore-Clogging List", provides_rating: false },
      ],
      fuzzy_match_threshold: FUZZY_THRESHOLD,
    };
    res.json(response);
  });

  return router;
}
