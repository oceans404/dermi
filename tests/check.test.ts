import { describe, it, expect } from "vitest";
import request from "supertest";
import { getTestApp } from "./setup.js";

const app = await getTestApp();

describe("POST /check", () => {
  describe("basic functionality", () => {
    it("flags a known ingredient", async () => {
      const res = await request(app)
        .post("/check")
        .send({ ingredients: ["coconut oil"] });
      expect(res.status).toBe(200);
      expect(res.body.flagged).toHaveLength(1);
      expect(res.body.flagged[0].matched).toBe("Coconut Oil");
    });

    it("does not flag an unknown ingredient", async () => {
      const res = await request(app)
        .post("/check")
        .send({ ingredients: ["niacinamide"] });
      expect(res.body.flagged).toHaveLength(0);
    });

    it("reports correct total_checked", async () => {
      const res = await request(app)
        .post("/check")
        .send({ ingredients: ["coconut oil", "niacinamide", "water"] });
      expect(res.body.total_checked).toBe(3);
    });
  });

  describe("input validation", () => {
    it("rejects missing ingredients field", async () => {
      const res = await request(app).post("/check").send({});
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("INVALID_INPUT");
    });

    it("rejects ingredients as string", async () => {
      const res = await request(app)
        .post("/check")
        .send({ ingredients: "coconut oil" });
      expect(res.status).toBe(400);
    });

    it("rejects ingredients as number", async () => {
      const res = await request(app)
        .post("/check")
        .send({ ingredients: 42 });
      expect(res.status).toBe(400);
    });

    it("rejects ingredients as object", async () => {
      const res = await request(app)
        .post("/check")
        .send({ ingredients: { a: 1 } });
      expect(res.status).toBe(400);
    });

    it("rejects non-string element in array", async () => {
      const res = await request(app)
        .post("/check")
        .send({ ingredients: ["coconut oil", 123] });
      expect(res.status).toBe(400);
    });

    it("rejects empty array", async () => {
      const res = await request(app)
        .post("/check")
        .send({ ingredients: [] });
      expect(res.status).toBe(400);
    });
  });

  describe("truncation to 20", () => {
    it("caps total_checked at 20 for 25 ingredients", async () => {
      const ingredients = Array.from({ length: 25 }, (_, i) => `filler${i}`);
      const res = await request(app).post("/check").send({ ingredients });
      expect(res.body.total_checked).toBe(20);
    });

    it("does not evaluate ingredients beyond position 20", async () => {
      const ingredients = Array.from({ length: 25 }, (_, i) => `filler${i}`);
      ingredients[22] = "coconut oil";
      const res = await request(app).post("/check").send({ ingredients });
      const matched = res.body.flagged.find(
        (f: { matched: string }) => f.matched === "Coconut Oil",
      );
      expect(matched).toBeUndefined();
    });
  });

  describe("empty strings", () => {
    it("skips empty strings but counts toward 20", async () => {
      const ingredients = Array.from({ length: 20 }, () => "");
      const res = await request(app).post("/check").send({ ingredients });
      expect(res.body.total_checked).toBe(20);
      expect(res.body.flagged).toHaveLength(0);
    });
  });

  describe("exact matching", () => {
    it("matches by canonical name with fuzzy false", async () => {
      const res = await request(app)
        .post("/check")
        .send({ ingredients: ["Coconut Oil"] });
      expect(res.body.flagged[0].fuzzy).toBe(false);
      expect(res.body.flagged[0].matched).toBe("Coconut Oil");
    });

    it("matches by alias with fuzzy false", async () => {
      const res = await request(app)
        .post("/check")
        .send({ ingredients: ["cocos nucifera oil"] });
      expect(res.body.flagged[0].fuzzy).toBe(false);
      expect(res.body.flagged[0].matched).toBe("Coconut Oil");
    });

    it("matches case insensitively", async () => {
      const res = await request(app)
        .post("/check")
        .send({ ingredients: ["COCONUT OIL"] });
      expect(res.body.flagged[0].fuzzy).toBe(false);
    });

    it("matches with punctuation stripped", async () => {
      const res = await request(app)
        .post("/check")
        .send({ ingredients: ["Cocos Nucifera (Coconut) Oil"] });
      expect(res.body.flagged[0].fuzzy).toBe(false);
      expect(res.body.flagged[0].matched).toBe("Coconut Oil");
    });
  });

  describe("fuzzy matching", () => {
    it("matches a slight misspelling with fuzzy true", async () => {
      const res = await request(app)
        .post("/check")
        .send({ ingredients: ["cocunut oil"] });
      expect(res.body.flagged).toHaveLength(1);
      expect(res.body.flagged[0].fuzzy).toBe(true);
      expect(res.body.flagged[0].matched).toBe("Coconut Oil");
    });

    it("does not flag a completely different word", async () => {
      const res = await request(app)
        .post("/check")
        .send({ ingredients: ["xyzzyplugh"] });
      expect(res.body.flagged).toHaveLength(0);
    });
  });

  describe("rating and confidence", () => {
    it("returns high confidence for coconut oil", async () => {
      const res = await request(app)
        .post("/check")
        .send({ ingredients: ["coconut oil"] });
      expect(res.body.flagged[0].rating_confidence).toBe("high");
    });

    it("returns medium confidence for algae extract", async () => {
      const res = await request(app)
        .post("/check")
        .send({ ingredients: ["algae extract"] });
      expect(res.body.flagged[0].rating_confidence).toBe("medium");
    });

    it("returns low confidence for lauric acid", async () => {
      const res = await request(app)
        .post("/check")
        .send({ ingredients: ["lauric acid"] });
      expect(res.body.flagged[0].rating_confidence).toBe("low");
    });

    it("flags null-rated ingredient with rating null and confidence null", async () => {
      const res = await request(app)
        .post("/check")
        .send({ ingredients: ["cocoa butter"] });
      expect(res.body.flagged).toHaveLength(1);
      expect(res.body.flagged[0].rating).toBeNull();
      expect(res.body.flagged[0].rating_confidence).toBeNull();
    });
  });

  describe("sources", () => {
    it("returns correct sources for flagged ingredient", async () => {
      const res = await request(app)
        .post("/check")
        .send({ ingredients: ["coconut oil"] });
      expect(res.body.flagged[0].sources).toEqual([
        "fulton_1989",
        "emme_diane",
      ]);
    });
  });
});
