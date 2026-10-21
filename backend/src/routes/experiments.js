import { Router } from "express";
import { safeError } from "../services/keys.js";
export function experiments(redis, metrics) {
  const router = Router();
  router.all("/:session/:mode/:action", async (req, res, next) => {
    try {
      if (
        !/^[a-zA-Z0-9-]{8,80}$/.test(req.params.session) ||
        !["guided", "custom"].includes(req.params.mode)
      )
        throw safeError("Invalid experiment");
      const key = `lab:${req.params.session}:${req.params.mode}`,
        sk = key + ":source",
        ck = key + ":cache",
        hk = key + ":history";
      let source = JSON.parse((await redis.get(sk)) || "null");
      if (!source) {
        source = { name: "Redis Handbook", price: 25, stock: 18 };
        await redis.set(sk, JSON.stringify(source), { EX: 86400 });
      }
      const action = req.params.action;
      if (req.method === "PUT" && action === "source") {
        const data = req.body?.data;
        if (
          !data ||
          typeof data !== "object" ||
          Array.isArray(data) ||
          JSON.stringify(data).length > 8192
        )
          throw safeError("Enter a JSON object up to 8 KB");
        source = data;
        await redis.set(sk, JSON.stringify(data), { EX: 86400 });
      } else if (req.method === "DELETE" && action === "cache")
        await redis.del(ck);
      else if (req.method === "DELETE" && action === "stats")
        await redis.del(hk);
      else if (req.method === "POST" && action === "fetch") {
        const ttl = Number(req.body?.ttl);
        if (!Number.isInteger(ttl) || ttl < 1 || ttl > 3600)
          throw safeError("TTL must be 1–3600 seconds");
        const start = performance.now();
        const cached = await redis.get(ck);
        const hit = cached !== null;
        if (!hit) await redis.set(ck, JSON.stringify(source), { EX: ttl });
        const result = {
          data: hit ? JSON.parse(cached) : source,
          hit,
          durationMs: Number((performance.now() - start).toFixed(2)),
          at: new Date().toISOString(),
        };
        await redis.lPush(hk, JSON.stringify(result));
        await redis.lTrim(hk, 0, 49);
        await redis.expire(hk, 86400);
        metrics.recordCache(hit, result.durationMs);
        metrics.recordOperation(hit ? "CACHE HIT" : "CACHE MISS", key);
      } else if (!(req.method === "GET" && action === "state"))
        throw safeError("Unknown experiment action", 404);
      const cached = await redis.get(ck);
      res.json({
        source,
        cached: cached === null ? null : JSON.parse(cached),
        ttl: await redis.ttl(ck),
        history: (await redis.lRange(hk, 0, 49)).map(JSON.parse),
      });
    } catch (error) {
      next(error);
    }
  });
  return router;
}
