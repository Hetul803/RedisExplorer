import express from 'express';
import cors from 'cors';
import { createApiRouter } from './routes/api.js';

export function createApp({ redis, cacheOptions = {}, clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173' }) {
  const app = express();
  const allowedOrigins = new Set([
    clientOrigin,
    'http://localhost:5173', 'http://127.0.0.1:5173',
    'http://localhost:4173', 'http://127.0.0.1:4173',
  ]);
  app.use(cors({ origin(origin, callback) { callback(null, !origin || allowedOrigins.has(origin)); } }));
  app.use(express.json({ limit: '32kb' }));
  app.use('/api', createApiRouter(redis, cacheOptions));
  app.use('/api', (_req, res) => res.status(404).json({ error: 'API route not found' }));
  app.use((err, _req, res, _next) => {
    const status = Number.isInteger(err.status) ? err.status : 500;
    if (status === 500) console.error(err);
    res.status(status).json({ error: status === 500 ? 'Something went wrong while accessing Redis' : err.message });
  });
  return app;
}
