import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';

function fakeRedis() {
  const db = new Map();
  const type = (key) => db.get(key)?.type || 'none';
  const get = (key) => db.get(key)?.value ?? null;
  return {
    db,
    async ping() { return 'PONG'; }, async dbSize() { return db.size; }, async type(key) { return type(key); },
    async ttl(key) { return db.has(key) ? (db.get(key).ttl ?? -1) : -2; }, async get(key) { return get(key); },
    async set(key, value) { db.set(key, { type: 'string', value: String(value) }); return 'OK'; },
    async del(key) { return db.delete(key) ? 1 : 0; },
    async scan(cursor) { return { cursor: '0', keys: [...db.keys()] }; },
    async rPush(key, values) { db.set(key, { type: 'list', value: [...(db.get(key)?.value || []), ...values] }); return db.get(key).value.length; },
    async lPush(key, values) { db.set(key, { type: 'list', value: [...values.reverse(), ...(db.get(key)?.value || [])] }); return db.get(key).value.length; },
    async lRange(key, start, stop) { const values = db.get(key)?.value || []; const end = stop < 0 ? values.length + stop + 1 : stop + 1; return values.slice(start, end); },
    async sAdd(key, values) { db.set(key, { type: 'set', value: [...new Set([...(db.get(key)?.value || []), ...values])] }); return 1; },
    async sMembers(key) { return db.get(key)?.value || []; },
    async hSet(key, fields) { db.set(key, { type: 'hash', value: { ...(db.get(key)?.value || {}), ...fields } }); return 1; },
    async hGetAll(key) { return db.get(key)?.value || {}; }, async hGet(key, field) { return db.get(key)?.value?.[field] ?? null; },
    async expire(key, seconds) { if (db.has(key)) db.get(key).ttl = seconds; return 1; },
  };
}
async function setup(options = {}) {
  const redis = fakeRedis();
  const app = createApp({ redis, cacheOptions: { sourceDelayMs: 2, ...options } });
  const server = await new Promise((resolve) => { const s = app.listen(0, () => resolve(s)); });
  const base = `http://127.0.0.1:${server.address().port}`;
  return { redis, base, close: () => new Promise((resolve) => server.close(resolve)) };
}
async function request(base, path, method = 'GET', body) {
  const response = await fetch(base + path, { method, headers: body ? { 'content-type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined });
  return { status: response.status, body: await response.json() };
}

test('health endpoint confirms Redis connection', async () => { const s = await setup(); try { const r = await request(s.base, '/api/health'); assert.equal(r.status, 200); assert.equal(r.body.connected, true); } finally { await s.close(); } });
test('returns a clear JSON error for an unknown API route', async () => { const s = await setup(); try { const r = await request(s.base, '/api/not-a-route'); assert.equal(r.status, 404); assert.equal(r.body.error, 'API route not found'); } finally { await s.close(); } });
test('creates, reads, updates, lists, and deletes a string key', async () => {
  const s = await setup(); try {
    assert.equal((await request(s.base, '/api/keys', 'POST', { key: 'student:name', value: 'Ada' })).status, 201);
    assert.equal((await request(s.base, '/api/keys/student:name')).body.value, 'Ada');
    assert.equal((await request(s.base, '/api/keys/student:name', 'PUT', { type: 'string', value: 'Grace' })).body.value, 'Grace');
    assert.equal((await request(s.base, '/api/keys')).body.keys.length, 1);
    assert.equal((await request(s.base, '/api/keys/student:name', 'DELETE')).status, 200);
    assert.equal((await request(s.base, '/api/keys/student:name')).status, 404);
    const expiring = await request(s.base, '/api/keys', 'POST', { key: 'temporary', value: 'short-lived', ttl: 30 });
    assert.equal(expiring.body.ttl, 30);
  } finally { await s.close(); }
});
test('writes and inspects list, set, and hash values', async () => {
  const s = await setup(); try {
    for (const [key, type, value] of [['colors', 'list', ['red', 'blue']], ['tags', 'set', ['redis', 'nosql']], ['profile', 'hash', { name: 'Ada', role: 'student' }]]) {
      assert.equal((await request(s.base, '/api/keys', 'POST', { key, type, value })).status, 201);
      const result = await request(s.base, `/api/keys/${key}`); assert.equal(result.body.type, type); assert.deepEqual(result.body.value, value);
    }
  } finally { await s.close(); }
});
test('validates keys, values, and expiration inputs', async () => {
  const s = await setup(); try {
    assert.equal((await request(s.base, '/api/keys', 'POST', { key: 'bad key', value: 'x' })).status, 400);
    assert.equal((await request(s.base, '/api/keys', 'POST', { key: 'valid', value: 'x', ttl: 0 })).status, 400);
    assert.equal((await request(s.base, '/api/keys', 'POST', { key: 'list', type: 'list', value: 'not-array' })).status, 400);
    assert.equal((await request(s.base, '/api/keys', 'POST', {})).status, 400);
    assert.equal((await request(s.base, '/api/commands', 'POST', {})).status, 400);
  } finally { await s.close(); }
});
test('executes only approved Redis commands', async () => {
  const s = await setup(); try {
    assert.deepEqual((await request(s.base, '/api/commands', 'POST', { command: 'SET greeting "Hello Redis"' })).body.result, 'OK');
    assert.equal((await request(s.base, '/api/commands', 'POST', { command: 'GET greeting' })).body.result, 'Hello Redis');
    assert.equal((await request(s.base, '/api/commands', 'POST', { command: 'FLUSHALL' })).status, 400);
    assert.equal((await request(s.base, '/api/commands', 'POST', { command: 'GET' })).status, 400);
  } finally { await s.close(); }
});
test('records an actual cache miss then a hit', async () => {
  const s = await setup(); try {
    const miss = await request(s.base, '/api/cache/demo', 'POST', { ttl: 30 });
    const hit = await request(s.base, '/api/cache/demo', 'POST', { ttl: 30 });
    assert.equal(miss.body.cached, false); assert.equal(hit.body.cached, true);
    assert.equal((await request(s.base, '/api/metrics')).body.hits, 1);
    assert.equal((await request(s.base, '/api/metrics')).body.misses, 1);
  } finally { await s.close(); }
});
