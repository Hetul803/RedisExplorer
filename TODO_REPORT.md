# RedisExplorer: run-through and remaining steps

Updated 20 October 2026.

## Current state

The project is implemented as a local React/Vite frontend, Express API, and Redis service. The screens cover key browsing and CRUD, strings/lists/sets/hashes, a restricted Redis command console, a cache experiment, session metrics, and short lessons. Docker Compose and `.env.example` are included. Backend tests cover the main API behavior.

The local setup does **not** need Redis credentials. `REDIS_URL=redis://localhost:6379` is enough for a Redis server on the same computer. Credentials are only needed if you choose an authenticated remote Redis provider; that is an optional deployment choice, not a blocker for the classroom demo. On this computer, Docker is unavailable, so the live demo is using the already accepted Redis-compatible Memurai server on port 6379.

At the time of this report, the local frontend, API, and Redis-compatible server have been started and the API health check reports connected. They are local processes; after a reboot, start Redis, the API, and Vite again using the setup steps below.

The cache experiment uses a clearly identified in-memory sample fixture, not a second database. A deliberate 140 ms pause is added on cache misses so the request path is visible. The API measures actual request duration, but the miss timing is a teaching illustration and should not be presented as a production benchmark. Cache counters reset when the backend restarts.

## Fresh machine: remaining startup checklist

- [ ] Install Node.js 18+ and Docker Desktop (or Docker Engine with Compose).
- [ ] Clone the repository and open a terminal in its root folder.
- [ ] Install the root, backend, and frontend dependencies:

  ```powershell
  npm install
  npm --prefix backend install
  npm --prefix frontend install
  ```

- [ ] Create the local environment file and start Redis:

  ```powershell
  Copy-Item .env.example .env
  docker compose up -d redis
  docker compose ps
  ```

  Wait for Redis to report healthy. If you already have Redis running on port 6379, use that instead of starting another service.

- [ ] Run the API tests, then start the frontend and backend:

  ```powershell
  npm test
  npm run dev
  ```

- [ ] Open <http://localhost:5173>. Confirm the sidebar says the server is reachable. The API health check is <http://localhost:3001/api/health>.
- [ ] When finished, stop the development process with `Ctrl+C`; stop the Redis container with `docker compose down`. Use `docker compose down -v` only when you intend to delete the saved Redis data too.

## Suggested 6-minute student demonstration

1. **Trace the architecture.** On Request Path, follow the diagram: browser → Express API → Redis → response. Explain that the API checks inputs before sending an allowlisted command to Redis.
2. **Create a value.** In Key Workbench, create `class:greeting` as a string with `Hello Redis`, then inspect its value, type, and expiration.
3. **Show data structures.** Create a list such as `class:queue`, a set such as `class:topics`, and a hash such as `class:student`. Compare order, uniqueness, and field/value behavior.
4. **Show commands.** Run `GET class:greeting`, then try `LPUSH class:queue task-1` and `LRANGE class:queue 0 -1`. Point out that administrative or arbitrary commands are rejected.
5. **Demonstrate caching.** In Cache Experiment, choose a short TTL and fetch the sample twice. The first request should be a miss and write the fixture to Redis; the second should be a hit. Show the key, counters, ratio, and measured response times.
6. **Explain expiration.** Wait for the chosen TTL to pass and fetch again. The request should miss after Redis expires the key. The cache key is `cache:demo:sample-catalog`.
7. **Reset the workspace if desired.** Delete the teaching keys in Key Workbench. Avoid `FLUSHALL` in the console; it is intentionally blocked.

## Optional work before a public/student deployment

- [ ] Choose a hosting provider for the API, frontend, and Redis, then set secure environment variables there. No credentials belong in `.env.example` or Git.
- [ ] Use a Redis endpoint with TLS/authentication for remote hosting and verify the provider's IP/firewall rules.
- [ ] Add screenshots to the README after capturing the redesigned screens.
- [ ] If students need shared or persistent classroom data, add authentication and per-class namespaces before exposing the app outside localhost.
- [ ] If a real source-system comparison is required, replace the labeled sample fixture with a real API/database and report its measured source latency separately from the Redis hit path.

## Completion criteria

The local classroom version is ready when Redis health reports connected, `npm test` passes, students can create/read/update/delete each supported type, the first and second cache requests show miss then hit, and the dashboard updates its counters. A remote Redis URL or credentials are not required for this local path.
