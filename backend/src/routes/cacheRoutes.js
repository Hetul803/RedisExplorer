import { experiments } from "./experiments.js";
import { CACHE_KEY } from "../services/cache.js";
import { Router } from "express";
export function createCacheRouter({ redis, getSample, metrics }) {
  const router = Router();

  router.post("/demo", async (req, res, next) => {
    try {
      const result = await getSample({
        ttl: req.body?.ttl,
      });
      metrics.recordOperation(
        result.cached ? "CACHE HIT" : "CACHE MISS",
        "sample-catalog",
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  router.delete("/demo", async (_req, res, next) => {
    try {
      await redis.del(CACHE_KEY);
      metrics.recordOperation("RESET CACHE", "sample-catalog");
      res.json({ cleared: true });
    } catch (error) {
      next(error);
    }
  });
  router.use("/experiment", experiments(redis, metrics));
  return router;
}
