import { Router } from "express";
import {
  listKeys,
  inspectKey,
  writeKey,
  deleteKey,
  safeError,
} from "../services/keys.js";

export function createKeysRouter({ redis, metrics }) {
  const router = Router();

  router.get("/", async (req, res, next) => {
    try {
      const result = await listKeys(
        redis,
        req.query.cursor || "0",
        req.query.limit,
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  router.get("/:key", async (req, res, next) => {
    try {
      const result = await inspectKey(redis, req.params.key);
      metrics.recordOperation("READ KEY", req.params.key);
      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  router.post("/", async (req, res, next) => {
    try {
      if ((await redis.type(req.body?.key || "")) !== "none")
        throw safeError("This key already exists. Select it to edit.", 409);
      const result = await writeKey(redis, req.body || {});
      metrics.recordOperation("CREATE KEY", req.body.key);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  });

  router.put("/:key", async (req, res, next) => {
    try {
      if ((await redis.type(req.params.key)) === "none")
        throw safeError(
          "Key expired or was deleted. Create it again if needed.",
          404,
        );
      const body = req.body || {};
      if (body.key && body.key !== req.params.key)
        throw safeError("Body key must match URL key");
      const result = await writeKey(redis, { ...body, key: req.params.key });
      metrics.recordOperation("UPDATE KEY", req.params.key);
      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  router.delete('/', async(req,res,next)=>{
    try {
      if(req.body?.confirmation !== 'DELETE ALL') throw safeError('Explicit DELETE ALL confirmation is required');
      await redis.flushDb();
      metrics.recordOperation('DELETE ALL','Connected database');
      res.json({deleted:true});
    } catch(error){next(error);}
  });

  router.delete("/:key", async (req, res, next) => {
    try {
      const deleted = await deleteKey(redis, req.params.key);
      if (!deleted) throw safeError("Key not found", 404);
      metrics.recordOperation("DELETE KEY", req.params.key);
      res.json({ deleted: true, key: req.params.key });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
