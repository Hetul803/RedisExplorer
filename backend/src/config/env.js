export function getConfig(env = process.env) {
  const production = env.NODE_ENV === "production";
  const port = env.PORT ? Number(env.PORT) : undefined;
  const cacheTtl = Number(env.CACHE_TTL_SECONDS || 60);
  if (port !== undefined && (!Number.isInteger(port) || port < 1 || port > 65535))
    throw new Error("PORT must be between 1 and 65535");
  if (!Number.isInteger(cacheTtl) || cacheTtl < 1 || cacheTtl > 3600)
    throw new Error("CACHE_TTL_SECONDS must be between 1 and 3600");
  if (production && !env.REDIS_URL) throw new Error("REDIS_URL is required in production");
  const origins = (env.CLIENT_ORIGIN || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  for (const origin of origins) {
    const url = new URL(origin);
    if (!["http:", "https:"].includes(url.protocol) || url.origin !== origin)
      throw new Error(
        "CLIENT_ORIGIN must contain exact HTTP(S) origins without paths or trailing slashes",
      );
  }
  return {
    production,
    port,
    cacheTtl,
    origins,
    redisUrl: env.REDIS_URL,
  };
}
