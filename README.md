# RedisExplorer

RedisExplorer is a visual, interactive learning platform for exploring Redis and core NoSQL concepts. It pairs a React + Vite student dashboard with a small Express API backed by a real Redis server. The cache lesson uses a labeled, in-memory sample catalog fixture as its source so the cache behavior is easy to reproduce without a second database.

## Features

- Redis health and connection status, total key count, recent keys, and cache performance dashboard.
- Create, inspect, update, filter, and delete Redis strings, lists, sets, and hashes. Optional TTL is expressed in seconds.
- Command playground with a fixed allowlist: `SET`, `GET`, `DEL`, `LPUSH`, `LRANGE`, `SADD`, `SMEMBERS`, `HSET`, `HGET`, and `PING`. No arbitrary command execution is exposed.
- Cache Lab that reads a sample item from an identified in-memory source on misses, caches it in Redis, and reports measured hit/miss request duration and TTL.
- Learning Center with practical examples that can be loaded into the command playground.
- Redis runs locally with Docker Compose and a persistent volume. No password or credential is checked in.

## Technology and architecture

- **Frontend:** React 18, Vite, plain CSS
- **Backend:** Node.js, Express, JavaScript
- **Database:** Redis 7, connected through `node-redis`
- **Communication:** JSON REST endpoints

The browser calls the Express API. Express validates request shapes and the safe command allowlist before calling Redis. Cache metrics are measured from actual requests and kept in backend memory for the lifetime of the server process; restarting the API resets those counters. Redis data itself is persisted in the Compose volume.

```text
frontend (Vite :5173) ── REST/JSON ── backend (Express :3001) ── Redis (:6379)
                                                          └──── sample fixture (cache demo misses)
```

## Prerequisites

- Node.js 18 or newer and npm
- Docker Desktop / Docker Engine with the Compose plugin, or a separately running Redis 7 instance

## Start Redis

From the project root:

```bash
docker compose up -d redis
docker compose ps
```

The service listens on `localhost:6379`, checks health with `redis-cli ping`, and stores data in the `redis_data` named volume. Stop the container with:

```bash
docker compose down
```

To stop and remove the saved Redis data as well, use `docker compose down -v`.

If using your own Redis instance, make sure it is reachable from the backend and set `REDIS_URL` accordingly. For local Compose the URL is `redis://localhost:6379`. The backend can also connect to an authenticated or remote Redis URL via the environment; do not put real credentials in source control.

## Environment configuration

Copy `.env.example` to `.env` in the project root and adjust values if needed:

```dotenv
PORT=3001
REDIS_URL=redis://localhost:6379
CACHE_TTL_SECONDS=60
CLIENT_ORIGIN=http://localhost:5173
```

`CACHE_TTL_SECONDS` sets the default cache expiration. The Cache Lab lets you choose 1–3600 seconds per request. The API also accepts `VITE_API_URL` as a frontend build-time variable; it defaults to `http://localhost:3001/api`.

## Install and run

In one terminal, from the project root:

```bash
npm install
npm --prefix backend install
npm --prefix frontend install
Copy-Item .env.example .env   # PowerShell; on macOS/Linux: cp .env.example .env
docker compose up -d redis
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). The API runs at [http://localhost:3001](http://localhost:3001). The frontend and backend can also be started separately with `npm run dev:client` and `npm run dev:server` from the root. The API exits with a clear message if it cannot connect to Redis.

For a production frontend bundle, run `npm run build`. Start the API with `npm start`.

## REST API

All endpoints use the `/api` prefix and JSON request/response bodies. Errors have the form `{ "error": "..." }`.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/health` | Redis connection status (`connected`, `status`, `server`) |
| `GET` | `/api/keys?cursor=0&limit=100` | Scan a page of keys, each with key name, type, and TTL |
| `GET` | `/api/keys/:key` | Inspect key type, value, and TTL |
| `POST` | `/api/keys` | Create/upsert a key. Body: `{ "key", "type", "value", "ttl?" }` |
| `PUT` | `/api/keys/:key` | Replace a key value. Body: `{ "type", "value", "ttl?" }` |
| `DELETE` | `/api/keys/:key` | Delete a key; returns 404 if absent |
| `POST` | `/api/commands` | Execute one allowlisted command. Body: `{ "command": "GET greeting" }` |
| `POST` | `/api/cache/demo` | Fetch/cache the sample record. Body: `{ "ttl": 60 }` |
| `GET` | `/api/metrics` | Cache hits/misses, hit ratio, average timings, recent timings, and key count |

Supported key types are `string` (text, number, or boolean), `list` and `set` (JSON arrays of strings/numbers), and `hash` (JSON object with string/number fields). Key names are limited to letters, numbers, `_`, `:`, `.`, and `-`, up to 128 characters. TTL is optional and must be a whole number of seconds. The key scan endpoint uses Redis `SCAN`, not the blocking `KEYS` command.

The command endpoint accepts only these commands and argument forms:

```text
SET key value       GET key             DEL key
LPUSH key value...  LRANGE key start stop
SADD key member...  SMEMBERS key
HSET key field value  HGET key field    PING
```

Command arguments may be quoted, for example `SET greeting "Hello Redis"`. Server-side administrative commands such as `FLUSHALL`, `CONFIG`, and `EVAL` are rejected.

## Cache measurement notes

`POST /api/cache/demo` checks `cache:demo:sample-catalog` in Redis. On a miss, it waits briefly to model a source lookup, returns the clearly labeled in-memory sample fixture, and stores the result for the requested TTL. On a hit, it reads the cached JSON. The response includes `cached`, `durationMs`, `ttl`, and `data`; durations are measured by the API around the real request path. The sample-source delay is a teaching aid, not an external service benchmark. Counters and recent request timings reset when the backend restarts.

## Tests

Run the backend API tests from the root:

```bash
npm test
```

Tests use an in-memory Redis-compatible test double and Node's built-in test runner, so the validation, REST behavior, command allowlist, CRUD/structure paths, cache hit/miss accounting, and errors can be tested without Docker. The running application itself still requires Redis.

## Example Redis commands

```text
SET greeting "Hello Redis"
GET greeting
LPUSH queue task-1 task-2
LRANGE queue 0 -1
SADD tags redis nosql
SMEMBERS tags
HSET user:1 name Ada
HGET user:1 name
```

## Screenshots

Add screenshots of the dashboard, data explorer, command playground, Cache Lab, and Learning Center here when capturing them for a project presentation.

```text
![Dashboard](docs/screenshots/dashboard.png)
![Data Explorer](docs/screenshots/explorer.png)
![Command Playground](docs/screenshots/playground.png)
![Cache Lab](docs/screenshots/cache-lab.png)
```
