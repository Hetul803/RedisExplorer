export function createMetrics() {
  const state = { hits: 0, misses: 0, requests: [], operations: [] };
  return {
    recordCache(hit, durationMs) {
      hit ? state.hits++ : state.misses++;
      state.requests.push({ hit, durationMs: Number(durationMs.toFixed(2)), at: new Date().toISOString() });
      if (state.requests.length > 40) state.requests.shift();
    },
    recordOperation(action, key) {
      state.operations.push({ action, key: key || '—', at: new Date().toISOString() });
      if (state.operations.length > 12) state.operations.shift();
    },
    snapshot() {
      const hitTimes = state.requests.filter((r) => r.hit).map((r) => r.durationMs);
      const missTimes = state.requests.filter((r) => !r.hit).map((r) => r.durationMs);
      const average = (values) => values.length ? Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(2)) : 0;
      const total = state.hits + state.misses;
      return { hits: state.hits, misses: state.misses, total, hitRatio: total ? Number((state.hits / total * 100).toFixed(1)) : 0,
        averageHitMs: average(hitTimes), averageMissMs: average(missTimes), recent: [...state.requests].reverse(), operations: [...state.operations].reverse() };
    }
  };
}
