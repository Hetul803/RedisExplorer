const sampleSource = {
  id: 'sample-catalog', name: 'Redis for Beginners', category: 'Learning', stock: 18,
  description: 'A sample catalog record served by the backend source fixture for the cache demonstration.',
  source: 'In-memory sample fixture (not an external database)',
};
export function createCacheService(redis, metrics, { sourceDelayMs = 140, defaultTtl = 60 } = {}) {
  return async function getSample({ ttl = defaultTtl } = {}) {
    const start = performance.now();
    const requestedTtl = Number(ttl);
    if (!Number.isInteger(requestedTtl) || requestedTtl < 1 || requestedTtl > 3600) throw Object.assign(new Error('Cache expiration must be 1–3600 seconds'), { status: 400 });
    const cacheKey = 'cache:demo:sample-catalog';
    const cached = await redis.get(cacheKey);
    if (cached !== null) {
      const durationMs = performance.now() - start;
      metrics.recordCache(true, durationMs);
      return { data: JSON.parse(cached), cached: true, durationMs: Number(durationMs.toFixed(2)), ttl: await redis.ttl(cacheKey) };
    }
    await new Promise((resolve) => setTimeout(resolve, sourceDelayMs));
    await redis.set(cacheKey, JSON.stringify(sampleSource), { EX: requestedTtl });
    const durationMs = performance.now() - start;
    metrics.recordCache(false, durationMs);
    return { data: sampleSource, cached: false, durationMs: Number(durationMs.toFixed(2)), ttl: requestedTtl };
  };
}
