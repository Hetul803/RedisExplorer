const configuredApi = (import.meta.env.VITE_API_URL || "/api")
  .trim()
  .replace(/\/+$/, "");
if (
  !(configuredApi.startsWith("/") && !configuredApi.startsWith("//")) &&
  !/^https?:\/\//.test(configuredApi)
) {
  throw new Error("VITE_API_URL must be a relative path or an HTTP(S) URL");
}
export const API_BASE_URL = configuredApi;
export const REFRESH_INTERVAL_MS = 15000;
export const REQUEST_TIMEOUT_MS = 10000;
export const NOTICE_DURATION_MS = 3400;
export const DEFAULT_CACHE_TTL = 60;
export const EMPTY_EDITOR = { key: "", type: "string", value: "", ttl: "" };
export const INITIAL_METRICS = {
  hits: 0,
  misses: 0,
  hitRatio: 0,
  averageHitMs: 0,
  averageMissMs: 0,
  recent: [],
  keyCount: 0,
};
