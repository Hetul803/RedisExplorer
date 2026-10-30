import path from "node:path";
import { fileURLToPath } from "node:url";
import { getConfig } from "./config/env.js";
import express from "express";
import cors from "cors";
import { createApiRouter } from "./routes/api.js";

export function createApp({
  redis,
  cacheOptions = {},
  clientOrigin,
  config = getConfig(),
}) {
  const app = express();
  app.disable("x-powered-by");
  const allowedOrigins = new Set(
    clientOrigin === undefined
      ? config.origins
      : clientOrigin
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
  );
  app.use(
    cors({
      origin(origin, callback) {
        callback(null, Boolean(origin && allowedOrigins.has(origin)));
      },
    }),
  );
  app.use(express.json({ limit: "32kb" }));
  app.use("/api", (_req, res, next) => {
    if (redis.isReady === false)
      return res
        .status(503)
        .json({ error: "Redis is disconnected. Check the service and retry." });
    next();
  });
  app.use("/api", createApiRouter(redis, cacheOptions));
  app.use("/api", (_req, res) =>
    res.status(404).json({ error: "API route not found" }),
  );
  if (config.production) {
    const frontendDist = fileURLToPath(
      new URL("../../frontend/dist/", import.meta.url),
    );
    app.use(
      "/assets",
      express.static(path.join(frontendDist, "assets"), {
        immutable: true,
        maxAge: "1y",
      }),
    );
    app.use(express.static(frontendDist, { maxAge: 0 }));
    app.get("*", (_req, res) =>
      res.sendFile(path.join(frontendDist, "index.html")),
    );
  }
  app.use((err, _req, res, _next) => {
    const status = Number.isInteger(err.status) ? err.status : 500;
    if (status === 500) console.error(err);
    res.status(status).json({
      error:
        status === 500
          ? "Something went wrong while accessing Redis"
          : err.message,
    });
  });
  return app;
}
