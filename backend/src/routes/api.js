import { getConfig } from "../config/env.js";
import { Router } from "express";
import { createCacheService } from "../services/cache.js";
import { createMetrics } from "../services/metrics.js";
import { createHealthRouter } from "./healthRoutes.js";
import { createKeysRouter } from "./keysRoutes.js";
import { createCommandsRouter } from "./commandsRoutes.js";
import { createCacheRouter } from "./cacheRoutes.js";
import { createMetricsRouter } from "./metricsRoutes.js";

export function createApiRouter(redis, cacheOptions = {}) {
  const router = Router();
  const metrics = createMetrics();
  const getSample = createCacheService(redis, metrics, {
    defaultTtl: getConfig().cacheTtl,
    ...cacheOptions,
  });

  const dependencies = { redis, metrics, getSample };
  router.use("/health", createHealthRouter(dependencies));
  router.use("/keys", createKeysRouter(dependencies));
  router.use("/commands", createCommandsRouter(dependencies));
  router.use("/cache", createCacheRouter(dependencies));
  router.use("/metrics", createMetricsRouter(dependencies));
  return router;
}
