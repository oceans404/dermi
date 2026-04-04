import type { Request, Response, NextFunction } from "express";
import type { ApiError } from "../types.js";

export function validateCheck(req: Request, res: Response, next: NextFunction): void {
  const { ingredients } = req.body;

  if (!ingredients) {
    res.status(400).json({
      error: { code: "INVALID_INPUT", message: "ingredients is required" },
    } satisfies ApiError);
    return;
  }

  if (!Array.isArray(ingredients)) {
    res.status(400).json({
      error: { code: "INVALID_INPUT", message: "ingredients must be an array" },
    } satisfies ApiError);
    return;
  }

  if (ingredients.length === 0) {
    res.status(400).json({
      error: { code: "INVALID_INPUT", message: "ingredients must not be empty" },
    } satisfies ApiError);
    return;
  }

  if (!ingredients.every((item: unknown) => typeof item === "string")) {
    res.status(400).json({
      error: { code: "INVALID_INPUT", message: "every ingredient must be a string" },
    } satisfies ApiError);
    return;
  }

  next();
}
