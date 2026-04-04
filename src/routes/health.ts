import { Router } from "express";
import type { HealthResponse } from "../types.js";

export function healthRouter(): Router {
  const router = Router();

  router.get("/", (_req, res) => {
    const response: HealthResponse = {
      status: "ok",
      timestamp: new Date().toISOString(),
    };
    res.json(response);
  });

  return router;
}
