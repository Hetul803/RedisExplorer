import { Router } from 'express';
import { listKeys, inspectKey, writeKey, deleteKey, safeError } from '../services/keys.js';
import { executeCommand } from '../services/commands.js';
import { createCacheService } from '../services/cache.js';
import { createMetrics } from '../services/metrics.js';

export function createApiRouter(redis, cacheOptions = {}) {
  const router = Router();
  const metrics = createMetrics();
  const getSample = createCacheService(redis, metrics, {
    defaultTtl: Number(process.env.CACHE_TTL_SECONDS) || 60,
    ...cacheOptions,
  });

  router.get('/health', async (_req, res, next) => {
    try {
      const pong = await redis.ping();
      res.json({ connected: pong === 'PONG', status: 'ok', server: 'Redis' });
    } catch (error) { next(error); }
  });
  router.get('/keys', async (req, res, next) => {
    try {
      const result = await listKeys(redis, req.query.cursor || '0', req.query.limit);
      metrics.recordOperation('LIST KEYS', 'Database');
      res.json(result);
    }
    catch (error) { next(error); }
  });
  router.get('/keys/:key', async (req, res, next) => {
    try {
      const result = await inspectKey(redis, req.params.key);
      metrics.recordOperation('READ KEY', req.params.key);
      res.json(result);
    }
    catch (error) { next(error); }
  });
  router.post('/keys', async (req, res, next) => {
    try {
      const result = await writeKey(redis, req.body);
      metrics.recordOperation('CREATE KEY', req.body.key);
      res.status(201).json(result);
    }
    catch (error) { next(error); }
  });
  router.put('/keys/:key', async (req, res, next) => {
    try {
      const body = req.body || {};
      if (body.key && body.key !== req.params.key) throw safeError('Body key must match URL key');
      const result = await writeKey(redis, { ...body, key: req.params.key });
      metrics.recordOperation('UPDATE KEY', req.params.key);
      res.json(result);
    } catch (error) { next(error); }
  });
  router.delete('/keys/:key', async (req, res, next) => {
    try {
      const deleted = await deleteKey(redis, req.params.key);
      if (!deleted) throw safeError('Key not found', 404);
      metrics.recordOperation('DELETE KEY', req.params.key);
      res.json({ deleted: true, key: req.params.key });
    } catch (error) { next(error); }
  });
  router.post('/commands', async (req, res, next) => {
    try {
      const command = req.body?.command;
      const result = await executeCommand(redis, command);
      const name = Array.isArray(command) ? command[0] : String(command || '').trim().split(/\s+/)[0];
      const key = Array.isArray(command) ? command[1] : String(command || '').trim().split(/\s+/)[1];
      metrics.recordOperation(`COMMAND ${String(name || '').toUpperCase()}`, key);
      res.json({ result });
    }
    catch (error) { next(error); }
  });
  router.post('/cache/demo', async (req, res, next) => {
    try {
      const defaultTtl = Number(process.env.CACHE_TTL_SECONDS) || 60;
      const result = await getSample({ ttl: req.body?.ttl ?? cacheOptions.defaultTtl ?? defaultTtl });
      metrics.recordOperation(result.cached ? 'CACHE HIT' : 'CACHE MISS', 'sample-catalog');
      res.json(result);
    } catch (error) { next(error); }
  });
  router.get('/metrics', async (_req, res, next) => {
    try { res.json({ ...metrics.snapshot(), keyCount: await redis.dbSize() }); }
    catch (error) { next(error); }
  });
  return router;
}
