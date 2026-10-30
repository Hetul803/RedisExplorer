import { Router } from "express";
export function createHealthRouter({ redis }) {
  const router = Router();

  router.get("/", async (_req, res, next) => {
    try {
      const pong = await redis.ping();
      res.json({ connected: pong === "PONG", status: "ok", server: "Redis" });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
