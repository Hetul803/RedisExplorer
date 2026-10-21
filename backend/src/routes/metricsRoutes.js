import { Router } from "express";
export function createMetricsRouter({ redis, metrics }) {
  const router = Router();

  router.get("/", async (_req, res, next) => {
    try {
      res.json({ ...metrics.snapshot(), keyCount: await redis.dbSize() });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
