import { describe, it, expect } from "vitest";
import request from "supertest";
import { getTestApp } from "./setup.js";

const app = await getTestApp();

describe("GET /meta", () => {
  it("returns 200", async () => {
    const res = await request(app).get("/meta");
    expect(res.status).toBe(200);
  });

  it("has dataset_version as string", async () => {
    const res = await request(app).get("/meta");
    expect(typeof res.body.dataset_version).toBe("string");
  });

  it("has total_ingredients matching stub count", async () => {
    const res = await request(app).get("/meta");
    expect(res.body.total_ingredients).toBe(8);
  });

  it("has rating_scale with min 0 and max 5", async () => {
    const res = await request(app).get("/meta");
    expect(res.body.rating_scale.min).toBe(0);
    expect(res.body.rating_scale.max).toBe(5);
  });

  it("has sources array with 3 entries", async () => {
    const res = await request(app).get("/meta");
    expect(res.body.sources).toHaveLength(3);
  });

  it("has fuzzy_match_threshold as number", async () => {
    const res = await request(app).get("/meta");
    expect(typeof res.body.fuzzy_match_threshold).toBe("number");
  });
});
