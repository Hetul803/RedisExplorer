import { getConfig } from "./config/env.js";
import { createClient } from "redis";

export function describeRedisError(error) {
  if (error.errors?.length) {
    return error.errors.map(describeRedisError).join("; ");
  }
  return error.message || error.code || "Unknown Redis connection error";
}

export function createRedisClient(url = getConfig().redisUrl) {
  const client = createClient({
    url,
    disableOfflineQueue: true,
    socket: {
      connectTimeout: 5000,
      reconnectStrategy(retries) {
        if (retries >= 3)
          return new Error(
            "Redis connection failed after 4 attempts. Check that Redis is running and REDIS_URL is correct.",
          );
        return Math.min((retries + 1) * 500, 1500);
      },
    },
  });
  client.on("error", (error) =>
    console.error("Redis client error:", describeRedisError(error)),
  );
  return client;
}
