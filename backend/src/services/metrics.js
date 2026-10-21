export function createMetrics() {
  const state = {
    hits: 0,
    misses: 0,
    hitDuration: 0,
    missDuration: 0,
    requests: [],
    operations: [],
  };
  return {
    recordCache(hit, durationMs) {
      hit ? state.hits++ : state.misses++;
      if (hit) state.hitDuration += durationMs;
      else state.missDuration += durationMs;
      state.requests.push({
        hit,
        durationMs: Number(durationMs.toFixed(2)),
        at: new Date().toISOString(),
      });
      if (state.requests.length > 40) state.requests.shift();
    },
    recordOperation(action, key) {
      state.operations.push({
        action,
        key: (key || "—").replace(
          /^lab:[^:]+:(guided|custom)(?::(source|cache|history))?$/,
          (_, mode, kind) =>
            `${mode === "guided" ? "Guided example" : "Your own sample"} · ${kind || "Cache Lab"}`,
        ),
        at: new Date().toISOString(),
      });
      if (state.operations.length > 12) state.operations.shift();
    },
    snapshot() {
      const total = state.hits + state.misses;
      return {
        hits: state.hits,
        misses: state.misses,
        total,
        hitRatio: total ? Number(((state.hits / total) * 100).toFixed(1)) : 0,
        averageHitMs: state.hits
          ? Number((state.hitDuration / state.hits).toFixed(2))
          : 0,
        averageMissMs: state.misses
          ? Number((state.missDuration / state.misses).toFixed(2))
          : 0,
        recent: [...state.requests].reverse(),
        operations: [...state.operations].reverse(),
      };
    },
  };
}
