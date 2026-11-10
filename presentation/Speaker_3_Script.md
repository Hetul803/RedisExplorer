# Speaker 3 script: caching, performance, and production Redis

This script covers slides 10–13 and closes the presentation. Read only the timed script aloud. Use the study notes to prepare for questions.

## Timing plan

| Slide | Topic | Target |
| --- | --- | ---: |
| 10 | Cache-aside behavior | 1:20 |
| 11 | Why Redis feels fast | 1:00 |
| 12 | Production choices | 1:25 |
| 13 | Takeaways and boundaries | 0:45 |
|  | **Total** | **4:30** |

## Timed spoken script

<!-- BEGIN SPOKEN SCRIPT -->

### Slide 10: Cache-aside behavior in Cache Lab

> A cache stores a copy so the application avoids repeating slower work. Cache Lab demonstrates the cache-aside pattern.

> First, the application checks Redis. A value means a cache hit, so the application returns it immediately. Null means a miss. The application reads the source, stores a serialized copy with TTL, and returns it. The next request can use that copy.

> The database problem is freshness. Changing the source does not update the copy. The old value remains until deletion, overwrite, or expiration. A short TTL limits staleness but causes more misses. A long TTL improves hit rate but can return older data longer.

> In our learning app, the source record and cached copy are separate Redis keys so students can observe this behavior. The source is teaching data, not MySQL. A production cache-aside system would often read the source from MySQL or another durable database and use Redis for the temporary copy.

### Slide 11: Why Redis feels fast

> Redis feels fast for three reasons. The working dataset is in memory, ordinary command execution is sequential, and pipelining can reduce network waiting by sending several commands before receiving all replies. Sequential execution also makes each command atomic.

> Redis operations are not automatically cheap. A large key, broad scan, or slow script can block other work. Good design bounds data, checks command complexity, avoids production use of `KEYS`, and monitors latency.

### Slide 12: Production Redis choices

> Production Redis requires explicit choices that our classroom app does not fully implement.

> For durability, RDB creates snapshots and AOF records replayable writes. Teams can use either, both, or no persistence for a disposable cache. Our Docker setup enables AOF and a named volume.

> For availability, a primary can replicate to other instances. Redis replication is asynchronous by default, so a failover can lose some acknowledged writes. Sentinel monitors a non-clustered deployment and can promote a replica. Redis Cluster adds sharding and distributes keys across 16,384 hash slots.

> For memory control, TTL expresses how long a key should exist. Eviction is different: it happens under memory pressure after `maxmemory` is reached and follows a policy such as LRU-like or LFU-like eviction.

> Security starts with network isolation. Production also needs TLS, authentication, least-privilege ACLs, backups, monitoring, and tested recovery.

### Slide 13: Takeaways and project boundaries

> Remember three ideas. A Redis key points to a typed value. TTL automates temporary data, but the application owns cache freshness. Redis is fast, but production still requires durability, availability, memory, and security choices.

> RedisExplorer demonstrates CRUD across four types, a restricted command console, and visible cache hits, misses, TTL, and stale data. It remains a learning project: the deployment shares one database, has no user authentication, and is not a production multi-user design.

> Thank you. We are ready for questions.

<!-- END SPOKEN SCRIPT -->

## Cache Lab demonstration option

If time permits, demonstrate these actions while discussing slide 10:

1. Clear the cached copy.
2. Set the cache lifetime to 30 seconds.
3. Fetch once and point out “cache miss.”
4. Fetch again and point out “cache hit.”
5. Change the source product name and save it.
6. Fetch again and show that the cached copy is stale.
7. Clear the cache or wait for TTL, then fetch to receive the updated source.

Do not add this interaction if Speaker 2’s demo has already used the time buffer. The slide and screenshot can carry the explanation without a second live demonstration.

## Presenter study notes: do not read aloud

### Cache-aside in pseudocode

```text
value = redis.GET(cacheKey)
if value exists:
    return value                 # hit

value = sourceDatabase.read(id)  # miss
redis.SET(cacheKey, value, EX=60)
return value
```

Cache-aside places the cache logic in the application. Redis does not know which MySQL row produced a cached value and cannot invalidate that copy automatically when the row changes.

Common freshness strategies:

- **TTL only:** Simple and bounded, but stale data can remain until expiration.
- **Delete on write:** After updating MySQL, delete the related Redis key. A later read repopulates it.
- **Update on write:** Update the source and cached copy. This can introduce partial-failure and ordering problems.
- **Event-driven invalidation:** Publish source changes and let a worker delete or refresh affected keys.
- **Versioned keys:** Include a version in the cache key, then switch readers to the new version.

The classic cache-aside race occurs when one request reads old source data while another request updates the source and deletes the cache. The first request can then write the old value back into Redis. Production systems may use ordering, version checks, delayed double deletion, locks, or change events depending on the risk.

### TTL versus eviction

TTL is an application statement: “this key should stop existing after this deadline.” Eviction is a server memory policy: “Redis needs space, so remove a key according to the configured policy.”

A key can expire before Redis reaches its memory limit. A key without a TTL can still be evicted under an `allkeys` policy. With `noeviction`, Redis rejects writes that need more memory instead of removing keys.

`TTL key` results:

- Positive integer: seconds remaining.
- `-1`: key exists but has no expiration.
- `-2`: key does not exist.

### Why sequential execution helps and hurts

Redis completes ordinary commands sequentially on the main execution path. This makes each command atomic and avoids locks between ordinary commands. Modern Redis can use other threads for network I/O and background tasks, so “Redis is entirely single-threaded” is inaccurate.

Sequential execution also means one expensive command can delay other clients. Command complexity, collection size, key size, scripts, and response size all matter. Pipelining reduces network round trips but does not make a command cheaper and does not make the group atomic.

### Persistence choices

| Option | What it records | Main strength | Main limitation |
| --- | --- | --- | --- |
| RDB | Point-in-time snapshots | Compact backups and fast restart | Writes after the latest snapshot can be lost |
| AOF | Write operations | Smaller data-loss window depending on fsync policy | More disk space and rewrite work |
| RDB and AOF | Both forms | Backup flexibility plus a detailed write history | More operational and resource cost |
| None | Nothing durable | Maximum simplicity for disposable cache data | All data disappears after loss or restart |

RedisExplorer uses `redis:7-alpine` with `--appendonly yes` and a Docker volume. The major version tag is not pinned to a patch version or image digest, which is acceptable for class development but weaker for reproducible production deployment.

### Replication, Sentinel, and Cluster

- **Replication:** Copies the primary’s data to replicas. It is asynchronous by default.
- **Sentinel:** Monitors a non-clustered primary-replica deployment, notifies operators, and coordinates failover.
- **Cluster:** Shards keys across 16,384 hash slots and supports failover. Multi-key operations generally require the keys to share a slot, often through a hash tag such as `{user:42}:profile` and `{user:42}:settings`.
- **`WAIT`:** Waits for a number of replica acknowledgements and reduces replication risk, but does not turn Redis into a strongly consistent CP database.

### Project boundaries you should say honestly

- No user authentication or per-user Redis namespace.
- One shared learning database for all visitors.
- A confirmed “Delete all keys” action can clear the connected database.
- Dashboard metrics live in API memory and reset after server restart.
- Cache Lab stores both the teaching source and cached copy in Redis. It models cache behavior but does not integrate MySQL.
- The console allowlist reduces risk but does not replace real authorization and isolation.
- The project uses one Redis instance, not Sentinel or Cluster.
- AOF and a Docker volume improve local persistence but do not replace off-host backups or disaster recovery.

### Sources

- [Redis cache-aside use case](https://redis.io/docs/latest/develop/use-cases/)
- [Redis expiration](https://redis.io/docs/latest/commands/expire/)
- [Redis eviction](https://redis.io/docs/latest/develop/reference/eviction/)
- [Redis persistence](https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/)
- [Redis replication](https://redis.io/docs/latest/operate/oss_and_stack/management/replication/)
- [Redis Sentinel](https://redis.io/docs/latest/operate/oss_and_stack/management/sentinel/)
- [Redis Cluster](https://redis.io/docs/latest/management/scaling/)
- [Redis security](https://redis.io/docs/latest/operate/oss_and_stack/management/security/)
- [RedisExplorer Cache Lab service](https://github.com/Hetul803/RedisExplorer/blob/dev/backend/src/routes/experiments.js)
- [RedisExplorer Docker Compose file](https://github.com/Hetul803/RedisExplorer/blob/dev/docker-compose.yml)
