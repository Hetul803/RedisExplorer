import { getConfig } from "./config/env.js";
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { createRedisClient, describeRedisError } from "./redis.js";
import { createApp } from "./app.js";

dotenv.config({ path: fileURLToPath(new URL("../../.env", import.meta.url)) });
const config = getConfig();
const redis = createRedisClient(config.redisUrl);
try {
  await redis.connect();
  const app = createApp({ redis, config });
  const port = config.port;
  app.listen(port, () =>
    console.log(`RedisExplorer listening on port ${port}`),
  );
} catch (error) {
  console.error(
    "Could not connect to Redis. Start Redis and check REDIS_URL.",
    describeRedisError(error),
  );
  process.exit(1);
}
