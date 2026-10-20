import { createClient } from 'redis';

export function createRedisClient(url = process.env.REDIS_URL || 'redis://localhost:6379') {
  const client = createClient({ url });
  client.on('error', (error) => console.error('Redis client error:', error.message));
  return client;
}
