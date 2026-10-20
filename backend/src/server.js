import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { createRedisClient } from './redis.js';
import { createApp } from './app.js';

dotenv.config({ path: fileURLToPath(new URL('../../.env', import.meta.url)) });
const redis = createRedisClient();
try {
  await redis.connect();
  const app = createApp({ redis });
  const port = Number(process.env.PORT) || 3001;
  app.listen(port, () => console.log(`RedisExplorer API listening on http://localhost:${port}`));
} catch (error) {
  console.error('Could not connect to Redis. Start Redis and check REDIS_URL.', error.message);
  process.exit(1);
}
