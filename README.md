redis-explorer.vercel.app
# RedisExplorer

RedisExplorer is a visual, interactive learning platform for exploring Redis and core NoSQL concepts. It pairs a React + Vite student dashboard with a small Express API backed by a real Redis server. The cache lesson uses a labeled, in-memory sample catalog fixture as its source so the cache behavior is easy to reproduce without a second database.

## Features

- Redis health and connection status, total key count, recent keys, and cache performance dashboard.
- Create, inspect, update, filter, and delete Redis strings, lists, sets, and hashes. Optional TTL is expressed in seconds.
- Command playground with a fixed allowlist: `SET`, `GET`, `DEL`, `LPUSH`, `LRANGE`, `SADD`, `SMEMBERS`, `HSET`, `HGET`, `PING`, `EXPIRE`, and `TTL`. No arbitrary command execution is exposed.
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

## Project structure

```text
frontend/src/
  App.jsx                     # Composes the navigation and screens
  pages/                      # Overview, Explorer, Playground, CacheLab, Learning
  components/
    common/                   # PageHeading and Toast
    layout/                   # Sidebar and Topbar
    overview/                 # WalkthroughStep
  hooks/useRedisExplorer.js   # Shared state, polling, and user actions
  services/api.js             # HTTP requests and API error handling
  constants/                 # Navigation, Redis types, example commands
  utils/format.js             # Result formatting
  main.jsx
  styles.css
backend/src/
  routes/api.js               # Creates shared services and mounts feature routers
  routes/*Routes.js           # Endpoints and handlers grouped by feature
  services/                   # Redis operations, command validation, cache, metrics
  app.js                      # Express setup and error handling
  redis.js                    # Redis connection
  server.js                   # Server startup
backend/test/app.test.js       # Existing API regression tests
```

React component files use PascalCase; hooks use a `use` prefix. Backend route files use camelCase with a `Routes` suffix. Each feature file contains its endpoints and request handlers. Pages compose shared components, and the application hook keeps state alive when navigating between screens. All feature routers receive the same Redis client and metrics instance from `routes/api.js`; the existing shared Redis helpers stay in `services/`. There is no separate controller or model layer.

## Deployment configuration

Copy `.env.example` to `.env` in the repository root. Both Vite and the backend read this location. Hosting-provider environment variables also work. Only `VITE_` variables are exposed to browsers; never use that prefix for secrets.

For a single Node deployment, build the frontend, then run the backend with `NODE_ENV=production`, `REDIS_URL` set to your Redis connection, and `VITE_API_URL=/api` at build time. Express serves `frontend/dist` and the API from the same origin. Leave `CLIENT_ORIGIN` empty for this setup. Hashed assets receive long-lived cache headers; HTML is revalidated.

```bash
npm --prefix backend install
npm --prefix frontend install
npm run build
NODE_ENV=production npm start
```

For separate frontend and backend hosting, set `VITE_API_URL=https://your-api.example.com/api` on the frontend **before building** and `CLIENT_ORIGIN=https://your-frontend.example.com` on the backend. Rebuild after changing Vite variables. Origins contain scheme and host, with no path or trailing slash. Multiple origins can be comma-separated when actually required; localhost origins are not automatically added. CORS controls browser access and is not authentication. Use this unauthenticated teaching app with a dedicated demo Redis instance, not a database containing private data.

During local development, the browser calls `/api` on Vite, which proxies to `API_PROXY_TARGET` (default: `http://localhost:$PORT`, with port 3001 as fallback). The deployed browser never falls back to localhost. An unrelated API hostname cannot be automatically inferred: configure `VITE_API_URL` for split hosting.

## Shared state and performance

`frontend/src/store/RedisProvider.jsx` exposes shared React state. The existing hook owns the actions and lifecycle; `constants/config.js` stores UI defaults and timing settings. Backend environment parsing is centralized in `backend/src/config/env.js`.

Screens load on demand. Background refresh runs every 15 seconds after the previous refresh completes, skips hidden tabs, and shares in-flight refresh requests. Previously three requests ran every five seconds (about 36 requests/minute); the new steady-state rate is about 8/minute while visible after the initial key scan, excluding manual actions. Requests time out after ten seconds. These are scheduling estimates, not measured production throughput.

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

`CACHE_TTL_SECONDS` sets the default cache expiration. The Cache Lab lets you choose 1–3600 seconds per request. The API also accepts `VITE_API_URL` as a frontend build-time variable; it defaults to `/api`.

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

## Functional workflows

For local development with Docker Desktop running, install the root, backend, and frontend dependencies, then run `npm run dev:local`. This waits for Redis to be healthy before starting the API and Vite. Use `npm run dev` when connecting to an existing Redis service instead.

Pages use hash URLs (`#explorer`, `#playground`, `#cache`, `#learning`), supporting refresh and browser Back/Forward without hosting rewrite rules. Drafts persist when switching pages in the current session; reloading resets unsaved drafts. Failed connections show a retry banner and disable write actions.

Data Explorer loads keys in scan batches. Use **Load more keys** to continue; search and type filters apply to loaded keys. Refresh restarts the scan. Duplicate creation returns a conflict; updating an expired or deleted key returns an error and preserves the draft for creating it again. Delete asks for confirmation.

Cache Lab's **Clear demo cache** removes only the sample cache entry. Fetch twice to observe a miss and hit; set a short TTL, clear, fetch, wait for expiration, and fetch again for another miss. Counters remain cumulative until backend restart. Command Playground supports `SET key value EX seconds`, `EXPIRE key seconds`, and `TTL key`; the expiration lesson now uses a real expiry.

## Functional validation

`npm test` runs the fast API tests. To run the real Redis regression test, use a **dedicated test Redis database**, since the test clears the demo cache entry (other keys are removed only by unique test prefix):

```bash
TEST_REDIS_URL=redis://localhost:6379/15 npm run test:integration
```

The integration test covers all four data types, empty strings, duplicate creation, edits, deletion, expiration, stale updates, multiple SCAN pages, wrong-type command errors, and cache miss/hit/reset/expiration. Browser checks additionally exercised create/edit, a list value, Back navigation, and the learning-to-playground expiration example.

## Expanded Cache Lab and learning

Cache Lab now has Guided example and Your own sample modes, with separate tab-scoped experiment IDs. Save a source JSON object, fetch through the cache, update the source without invalidating the cache, inspect both copies, clear only the cached copy, and reset experiment statistics independently. Source records and history expire after 24 hours; cache TTL is configurable. History shows the latest 50 requests. The source is explicitly a Redis-backed teaching record, not an external database benchmark. Browser experiment IDs separate samples but are not authentication.

Learning sections provide multiple related commands and descriptions. Random Try avoids the immediately previous choice; the selected section supplies the playground reference. Commands are never executed automatically. Command history is local to the mounted playground.

The allowlist additionally supports string counters and lengths, list updates/removal, set membership and set algebra, and hash field deletion, inspection and increments. Administrative, scripting, blocking, and unrestricted key scans remain excluded. Limits apply to argument count and size; data-command results can still be large on large databases, so use a dedicated learning database.

## Command console

Commands now uses a session transcript (latest 50 results), preserved during page navigation and cleared on reload. Enter runs the input; Up/Down recalls previous commands and restores the draft. Clear console clears only local results, never database keys. The grouped reference documents the 48 supported commands with syntax, behavior and examples. Load example fills the editor without executing. Lesson navigation selects the relevant reference category and retains the lesson examples. Hash results are displayed as field/value tables; arrays as rows; missing values and errors receive explanatory text.
