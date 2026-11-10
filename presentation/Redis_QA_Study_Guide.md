# Redis, NoSQL, MySQL, and RedisExplorer Q&A study guide

Use this document to prepare for database-class questions. The short answer under each question is suitable for class. The detail that follows explains the reasoning.

## The answer to memorize first

Redis is an in-memory data structure server. It stores typed values under unique keys and provides commands that operate directly on each type. It is commonly used for caching, sessions, counters, leaderboards, queues, streams, rate limiting, and real-time state. It can persist data, replicate to other instances, and shard data across a cluster, but production durability and consistency depend on configuration.

RedisExplorer is a teaching application. React provides the interface, Express validates requests, and the Node.js Redis client sends commands to Redis. The app demonstrates strings, lists, sets, hashes, TTL, a restricted command console, and cache-aside behavior.

## MySQL, NoSQL, and Redis at a glance

| Dimension | MySQL with InnoDB | Redis | What to say in class |
| --- | --- | --- | --- |
| Database family | Relational SQL database | NoSQL data structure server | They begin with different data models |
| Core model | Tables, rows, columns, relationships | Keys mapped to typed values | MySQL models relationships; Redis models direct operations |
| Query interface | SQL with filters, joins, aggregation, ordering | Type-specific commands such as `GET`, `HSET`, and `ZRANGE` | Redis does not offer ordinary relational joins |
| Schema and integrity | Defined columns, data types, unique constraints, foreign keys | Key naming and types, with most domain rules in application code | “NoSQL” does not mean “no design” |
| Transactions | Multi-statement ACID transactions with commit and rollback | Atomic commands; `MULTI`/`EXEC`, `WATCH`, scripts/functions; no transaction rollback | The word “transaction” has different guarantees |
| Storage | Durable storage with buffer pools and caches | Working dataset primarily in memory, optional RDB/AOF persistence | Redis can be durable, but durability is configurable |
| Access pattern | Flexible queries and indexed lookups | Known-key access and structure-specific operations | Redis rewards planned access patterns |
| Scaling | Read replicas, partitioning, and other MySQL deployment options | Replication, Sentinel, and Redis Cluster sharding | The exact consistency model depends on deployment |
| Expiration | Usually implemented by application logic or scheduled work | Built-in key and field expiration features | TTL is a major Redis strength |
| Typical role | Durable system of record | Cache or real-time data layer; sometimes primary database | Many systems use both |

## Fundamentals

### 1. What is Redis?

**Short answer:** Redis is an in-memory data structure server that stores typed values under keys.

The server exposes commands over a network protocol. A key such as `student:42` can point to a string, hash, list, set, sorted set, stream, or another supported type. Redis understands the type and performs operations inside the server. For example, `HSET` updates a hash field and `SISMEMBER` tests set membership.

### 2. What does Redis stand for?

**Short answer:** REmote DIctionary Server.

The name reflects the original key-dictionary model, but modern Redis supports many data structures beyond simple strings.

### 3. Who created Redis and why?

**Short answer:** Salvatore Sanfilippo created Redis in 2009 while trying to scale LLOOGG, a real-time log analysis tool.

Traditional database performance was a problem for that real-time workload. The first prototype kept working data in memory and exposed direct operations on data structures. Sanfilippo later released it as an open source project.

### 4. Is Redis only a cache?

**Short answer:** No. Caching is common, but Redis can also store primary data and implement sessions, counters, rankings, queues, streams, rate limits, and messaging patterns.

Calling Redis “only a cache” hides the data structures, persistence, replication, clustering, and messaging capabilities. Whether Redis should hold primary data depends on required queries, durability, consistency, backup, and recovery guarantees.

### 5. Is Redis a database?

**Short answer:** Yes. It stores and retrieves application data, supports persistence, and can act as a primary database when its access model fits.

Redis differs from a relational database because it does not organize ordinary data into relational tables or provide normal SQL joins and foreign-key constraints.

### 6. Why is Redis considered NoSQL?

**Short answer:** Redis uses a non-relational key and data-structure model instead of relational tables and joins.

NoSQL is an umbrella term. Document databases, wide-column stores, graph databases, and key-value or data-structure stores use different models. Redis belongs primarily to the key-value and data-structure category.

### 7. Does NoSQL mean “no schema”?

**Short answer:** No. It means the database does not require the relational schema model.

Redis still has structure. Each key has a type. Commands enforce type rules. Applications define key naming, required fields, value formats, TTL, and validation. That is an application-level schema even though Redis does not enforce relational columns and foreign keys.

### 8. What does “in-memory” mean?

**Short answer:** The working dataset is kept in RAM so commands usually avoid disk access on the request path.

Redis can still write RDB snapshots or an append-only file to disk. “In-memory” describes the primary working-data path, not an absolute promise that the data is temporary.

### 9. Why is Redis fast?

**Short answer:** Memory access, efficient data structures, sequential command execution, and a lightweight protocol reduce storage and coordination overhead.

Actual latency still depends on network distance, payload size, command complexity, key size, hardware, persistence settings, and concurrent work. Avoid promising a universal latency number.

### 10. Is Redis single-threaded?

**Short answer:** Ordinary command execution is sequential on the main execution path, but modern Redis can use other threads for network I/O and background work.

The safe class statement is “Redis executes ordinary commands sequentially.” Saying “the whole Redis program has only one thread” is inaccurate.

### 11. Are Redis commands atomic?

**Short answer:** A single command is atomic.

Redis completes one ordinary command without interleaving another client’s command. A sequence of separate commands is not automatically atomic. Use a purpose-built command, transaction, script/function, or optimistic locking when several steps must behave as one operation.

### 12. What protocol and port does Redis use?

**Short answer:** Redis clients use RESP over a network connection, and the default TCP port is 6379.

RESP means Redis Serialization Protocol. RESP2 is common, while RESP3 supports richer reply types and server push messages.

## MySQL versus Redis and SQL versus NoSQL

### 13. What is the biggest difference between MySQL and Redis?

**Short answer:** MySQL organizes durable relational data and supports flexible SQL queries; Redis organizes typed values under keys and optimizes direct operations on known access paths.

MySQL with InnoDB supports tables, joins, indexes, constraints, multi-statement ACID transactions, rollback, and crash recovery. Redis provides direct commands, built-in expiration, and specialized structures such as sets and sorted sets.

### 14. Is MySQL slower than Redis?

**Short answer:** That comparison is too broad. Redis is often faster for direct in-memory key operations, while MySQL solves richer relational queries and durability requirements.

An indexed MySQL primary-key lookup can be fast. A Redis command that scans a huge collection can be slow. Performance depends on the operation, data size, network, configuration, and required guarantees. Compare equivalent workloads and correctness requirements.

### 15. Can Redis replace MySQL?

**Short answer:** Sometimes, but not automatically.

Redis can be the primary database when the application mostly uses known keys and supported data structures, and when its durability and consistency configuration meets the requirements. MySQL remains a better default when relationships, joins, foreign keys, flexible reporting, and rollback-heavy transactions are central.

### 16. Can MySQL and Redis be used together?

**Short answer:** Yes. This is a common architecture.

MySQL can act as the system of record. Redis can cache frequently read results, hold sessions, enforce rate limits, maintain counters, or serve real-time rankings. The application must define how cache entries are populated, invalidated, and recovered.

### 17. What is a “system of record”?

**Short answer:** It is the authoritative source whose data the organization trusts as the final record.

If MySQL is the system of record and Redis is a cache, deleting Redis data should affect performance but not permanently destroy the authoritative business record. The cache can be rebuilt from MySQL.

### 18. Does Redis support joins?

**Short answer:** Redis does not provide ordinary relational joins.

Applications usually design keys around access paths, fetch several keys, use sets or sorted sets for relationships, denormalize data, or use Redis Search where appropriate. Cross-key work can require extra application logic and may be limited by cluster hash-slot placement.

### 19. Does Redis support foreign keys?

**Short answer:** No. Redis does not enforce relational foreign-key constraints.

The application must maintain references and clean up related keys. Keyspace notifications or background jobs can help, but they do not become a relational constraint system.

### 20. How do indexes differ?

**Short answer:** MySQL uses indexes to locate rows for many query patterns. Redis usually accesses values directly by key and uses data structures as indexes.

A Redis set can index membership, a sorted set can index score and rank, and a hash can index fields within one record. Redis 8 also includes query and search capabilities, but the core mental model remains key and type based.

### 21. How do transactions differ?

**Short answer:** MySQL InnoDB offers multi-statement ACID transactions with commit and rollback. Redis guarantees atomic commands and can queue command groups with `MULTI` and `EXEC`, but Redis transactions do not provide rollback.

`WATCH` adds optimistic locking. If a watched key changes before `EXEC`, the transaction aborts and the client can retry. Server-side scripts or functions can also perform atomic logic.

### 22. Is Redis ACID?

**Short answer:** Do not answer with a simple yes or no. Redis provides atomic operations, but durability and multi-command behavior depend on commands and configuration.

Atomicity: a command is atomic; a `MULTI`/`EXEC` group executes without interleaving. Consistency: Redis enforces command and type rules, while application invariants remain the application’s responsibility. Isolation: transaction command groups execute sequentially, but Redis transactions differ from SQL isolation levels. Durability: RDB, AOF, fsync, replication, and failure timing determine what can be lost.

### 23. Which database is better?

**Short answer:** The correct choice depends on the access pattern and guarantees.

Choose MySQL when relational integrity, joins, flexible queries, and durable multi-row transactions lead the design. Choose Redis when known-key access, expiration, real-time counters, rankings, queues, or caching lead the design. Use both when both sets of requirements exist.

### 24. What are the disadvantages of Redis compared with MySQL?

**Short answer:** Redis has no ordinary relational joins or foreign keys, memory is more expensive than disk, and durability requires explicit configuration.

Other tradeoffs include key-design complexity, limited ad hoc queries in the core model, large-key risks, asynchronous replication by default, and operational choices around memory, eviction, persistence, failover, and cluster hash slots.

## Data types and modeling

### 25. What is a Redis key?

**Short answer:** A key is the unique name used to find a value in a Redis database.

Examples include `student:42`, `session:a84f`, and `course:db:topics`. Colons are a naming convention, not real folders. A predictable namespace makes keys easier to inspect and manage.

### 26. What is a Redis string?

**Short answer:** A binary-safe sequence of bytes used for text, numbers, serialized objects, counters, bitmaps, and other simple values.

Useful commands include `SET`, `GET`, `MGET`, `APPEND`, and `INCR`. An integer counter is stored in the string type, and Redis performs the numeric operation atomically.

### 27. What is a Redis list?

**Short answer:** An ordered sequence of string values that allows duplicates.

Lists support push and pop operations at the ends, so they can implement simple queues, stacks, or bounded histories. Large range operations can be O(N), so list size and access patterns matter.

### 28. What is a Redis set?

**Short answer:** An unordered collection of unique string members.

Sets support membership testing and operations such as union, intersection, and difference. They fit tags, unique visitors, permissions, and relationship membership when ordering is unnecessary.

### 29. What is a Redis hash?

**Short answer:** A field-value record stored under one key.

A hash can represent a user profile or product summary. `HSET` updates selected fields without replacing the whole record. The app’s Data Explorer represents a hash as a JSON object, then sends those fields to Redis.

### 30. What is a sorted set?

**Short answer:** A collection of unique members ordered by numeric score.

Sorted sets support efficient rank and score-range queries. Common uses include leaderboards, priority queues, delayed jobs, and sliding-window rate limits. RedisExplorer does not implement sorted sets, but they are a likely next lesson.

### 31. What is a Redis Stream?

**Short answer:** An append-only log of entries with IDs and field-value data.

Streams support consumer groups, acknowledgements, pending-entry tracking, retention, and replay. They are more durable and stateful than Pub/Sub, but the application still needs a processing and retry design.

### 32. How is Pub/Sub different from Streams?

**Short answer:** Pub/Sub broadcasts ephemeral messages to currently connected subscribers; Streams retain entries for later reading and processing.

An offline Pub/Sub subscriber misses messages. A stream consumer can resume from an ID and work through retained entries. Use Pub/Sub for transient notifications and Streams when replay or delivery tracking matters.

### 33. Why not store everything as a JSON string?

**Short answer:** A JSON string is easy, but Redis cannot use type-specific operations inside an opaque string.

Updating one field normally requires reading, parsing, changing, and rewriting the whole JSON string. A hash supports field updates and numeric increments. Sets enforce uniqueness, sorted sets maintain rank, and streams manage ordered events. Redis JSON is another option when native nested documents and querying are needed.

### 34. What happens when a command does not match the key’s type?

**Short answer:** Redis returns a `WRONGTYPE` error.

For example, `HGETALL` cannot read a list. Redis does not silently convert the value. This is one way Redis enforces a type-level schema.

### 35. How should keys be named?

**Short answer:** Use stable namespaces that identify the entity and purpose, such as `user:42:profile`.

Avoid unbounded or extremely long names. Think about cluster hash tags when multi-key operations must share a slot. Do not put secrets in key names because monitoring and logs may expose them.

## Commands, concurrency, and performance

### 36. What is the difference between `GET` and `HGET`?

**Short answer:** `GET` reads a string value. `HGET` reads one field from a hash.

The correct command depends on the key’s type. `TYPE key` reports that type.

### 37. What is the difference between `DEL` and `UNLINK`?

**Short answer:** `DEL` removes keys and performs memory reclamation synchronously. `UNLINK` detaches keys and reclaims memory asynchronously.

For very large values, `UNLINK` can reduce blocking on the main execution path. The key becomes unavailable immediately even though background memory cleanup continues.

### 38. Why should production code avoid `KEYS *`?

**Short answer:** `KEYS` scans the whole keyspace in one blocking command.

On a large database, that can delay all other clients. `SCAN` spreads work across cursor calls. `SCAN` can return duplicates and gives limited guarantees for keys that change during the iteration, so clients must handle those cases.

### 39. Does `SCAN` return a perfect snapshot?

**Short answer:** No.

A full iteration returns elements that remained present for the entire iteration, but a key can appear more than once. Keys added or removed during the scan have undefined inclusion behavior. The cursor reaches `0` when the iteration finishes.

### 40. What is pipelining?

**Short answer:** Pipelining sends multiple commands without waiting for each individual reply.

It reduces network round trips and improves throughput. It does not make the commands atomic and does not reduce the computational complexity of each command.

### 41. What is a Redis transaction?

**Short answer:** `MULTI` starts a transaction queue and `EXEC` runs the queued commands sequentially without interleaving another client’s command.

`DISCARD` clears the queue before execution. Redis does not roll back commands after `EXEC` because of a runtime error. Clients should validate operations and understand command error behavior.

### 42. What does `WATCH` do?

**Short answer:** `WATCH` provides optimistic locking.

If a watched key changes before `EXEC`, Redis aborts the transaction and the client can retry. This prevents a read-modify-write race without holding a blocking lock.

### 43. Are pipelines and transactions the same?

**Short answer:** No.

A pipeline reduces network waiting. A transaction controls execution ordering and isolation from other clients during the command group. A client can combine both ideas, but they solve different problems.

### 44. What is a big key?

**Short answer:** A key whose value contains a large amount of data or many elements.

Big keys can create long command execution, large responses, replication bursts, persistence overhead, and slow deletion. Split data where appropriate, bound collection sizes, use incremental commands, and monitor memory and latency.

### 45. What is a hot key?

**Short answer:** A key that receives a disproportionate amount of traffic.

In a cluster, one hot key still belongs to one hash slot and one primary, so sharding alone does not divide that key’s work. Possible solutions include local caching, read replicas when stale reads are acceptable, key partitioning, batching, or redesigning the workload.

## TTL, caching, and memory

### 46. What is TTL?

**Short answer:** Time to live, the remaining lifetime of a key.

`EXPIRE key seconds` sets a deadline. `TTL key` reports remaining seconds. `PTTL` reports milliseconds.

### 47. What do TTL results `-1` and `-2` mean?

**Short answer:** `-1` means the key exists without expiration. `-2` means the key does not exist.

This is useful during the class demo because the key may expire before a second attempt.

### 48. How does Redis remove expired keys?

**Short answer:** Redis uses passive and active expiration.

Passive expiration removes a timed-out key when a client accesses it. Active expiration periodically samples keys with deadlines and deletes expired ones that may never be accessed again.

### 49. Is expiration the same as eviction?

**Short answer:** No.

Expiration follows a key’s deadline. Eviction happens under memory pressure after the configured `maxmemory` limit is reached. The eviction policy decides which keys can be removed.

### 50. What eviction policies exist?

**Short answer:** Redis supports policies such as no eviction, all-keys or volatile LRU-like policies, LFU-like policies, random policies, and shortest-TTL selection.

`noeviction` rejects writes that need more memory. `allkeys-lru` can remove any key according to the LRU approximation. `volatile` policies consider only keys with expiration. Choose a policy based on whether the instance holds disposable cache data, persistent data, or a mix.

### 51. What is cache-aside?

**Short answer:** The application checks the cache, reads the source after a miss, then stores the result in the cache.

The flow is: `GET` the cache key; on miss, query MySQL or another source; `SET` the result with TTL; return it. On a hit, return the cached copy without calling the slower source.

### 52. What is a cache hit and a cache miss?

**Short answer:** A hit finds the requested value in the cache. A miss requires another source and usually repopulates the cache.

Hit ratio measures hits divided by total cache lookups. A high ratio can reduce source load, but it does not prove that cached values are fresh or useful.

### 53. What is stale data?

**Short answer:** A cached value is stale when the source has changed but the cached copy has not.

TTL bounds how long stale data can remain if the cache is not explicitly invalidated. Business risk determines the acceptable stale window.

### 54. What is cache invalidation?

**Short answer:** Removing or updating a cached copy when it should no longer be used.

Strategies include TTL-only expiration, delete-on-write, write-through updates, events, versioned keys, and manual clearing. Each strategy has race conditions and failure cases.

### 55. What is a cache stampede?

**Short answer:** Many requests miss the same popular key and simultaneously call the source.

Mitigations include single-flight locking, request coalescing, stale-while-revalidate, TTL jitter, prewarming, and limiting source concurrency.

### 56. What is TTL jitter?

**Short answer:** Adding controlled randomness to expiration times.

If thousands of keys receive the same TTL at the same time, they can expire together and create a burst of misses. Jitter spreads that work over time.

### 57. Should a cache contain the only copy of important data?

**Short answer:** Usually no.

Disposable cache data should be recoverable from a durable source. Redis can hold primary data, but then the architecture must treat it as a database with persistence, backups, replication, recovery testing, memory controls, and data-loss objectives.

## Persistence, availability, and scaling

### 58. What is RDB persistence?

**Short answer:** RDB creates point-in-time snapshots of the dataset.

RDB files are compact and useful for backup and fast restart. Data written after the latest completed snapshot can be lost after a failure.

### 59. What is AOF persistence?

**Short answer:** AOF logs write operations so Redis can replay them during startup.

Durability depends on the fsync policy. AOF usually has more disk and rewrite overhead than snapshots but can provide a smaller loss window.

### 60. Can Redis use both RDB and AOF?

**Short answer:** Yes.

Using both provides snapshot backups and a detailed write history. It also creates more resource and operational work. Backup and restore procedures still need testing.

### 61. What persistence does RedisExplorer use locally?

**Short answer:** Docker Compose starts `redis:7-alpine` with `--appendonly yes` and stores data in a named Docker volume.

That improves survival across normal container restarts. It does not provide off-host backup, multi-node availability, or disaster recovery. `docker compose down -v` deletes the volume and saved local data.

### 62. What is Redis replication?

**Short answer:** A primary sends its data and write stream to one or more replicas.

Replication is asynchronous by default. Replicas can improve availability and sometimes serve reads, but stale reads and write-loss windows must be considered.

### 63. What is Redis Sentinel?

**Short answer:** Sentinel provides monitoring, notification, configuration discovery, and automatic failover for non-clustered Redis.

When a primary fails, Sentinels can agree on failure, promote a replica, and reconfigure the remaining replicas. A robust deployment normally uses multiple independently placed Sentinel processes.

### 64. What is Redis Cluster?

**Short answer:** Redis Cluster shards keys across 16,384 hash slots and supports failover.

Each primary owns a subset of slots. A cluster-aware client maps keys to the correct node. Multi-key operations generally require all involved keys to share a slot.

### 65. What is a hash tag in Redis Cluster?

**Short answer:** Text inside braces determines the hash-slot input.

Keys such as `{user:42}:profile` and `{user:42}:settings` share the same slot because the cluster hashes `user:42`. This enables related multi-key operations but can create imbalance if overused.

### 66. Does `WAIT` make Redis strongly consistent?

**Short answer:** No.

`WAIT` asks for a number of replica acknowledgements and reduces the probability of losing a write. Redis documentation explicitly warns that it does not turn a deployment into a strongly consistent CP system, and acknowledged writes can still be lost depending on failure and persistence configuration.

### 67. Is Redis AP or CP under the CAP theorem?

**Short answer:** Do not label all Redis deployments with one CAP category.

CAP applies to distributed behavior during a network partition. A standalone instance is not a partitioned distributed system. Sentinel and Cluster make different availability and consistency tradeoffs, and asynchronous replication allows acknowledged-write loss in some failures. State the exact topology and failure behavior instead of using a one-word label.

### 68. How do backups differ from replication?

**Short answer:** Replication copies current state and can copy mistakes. Backups preserve recoverable historical state.

Deleting or corrupting data on the primary can propagate to replicas. Keep independent, tested backups even when replicas exist.

## Security and operations

### 69. How should Redis be secured?

**Short answer:** Restrict network access, use TLS, authenticate clients, apply least-privilege ACLs, protect secrets, and disable unnecessary commands or access paths.

Do not expose an unauthenticated Redis port to the public internet. Monitor commands, memory, latency, persistence, replication, and failed authentication.

### 70. What are Redis ACLs?

**Short answer:** Access control lists define which users may connect, which commands they may run, and which keys or channels they may access.

Use separate users for applications and operators. Grant only required command categories and key patterns.

### 71. Why is TLS needed if Redis has a password?

**Short answer:** Authentication proves identity, while TLS protects data in transit.

Without encryption, a network observer may capture credentials and application data. Redis supports TLS for client connections and other communication channels when configured.

### 72. What should be monitored?

**Short answer:** Latency, memory, evictions, expirations, hit ratio, command rates, slow commands, connections, persistence status, replication lag, and failover events.

Also monitor application-level correctness. A high cache hit ratio is not useful if values are stale or the wrong keys are being cached.

### 73. Is Redis open source?

**Short answer:** Redis 8 offers AGPLv3 as an OSI-approved open source option, alongside RSALv2 and SSPLv1 source-available options. Older versions have different licenses.

Redis 7.2 and earlier remain under BSD-3-Clause. Redis 7.4 through 7.8 use RSALv2 or SSPLv1. Licensing is version-specific, so check the exact image or package instead of making a blanket statement.

### 74. What version does this project use?

**Short answer:** Docker Compose uses the major-version tag `redis:7-alpine`.

That tag can move to a newer Redis 7 patch release. For reproducible production deployments, pin an exact version and preferably an image digest. The class project intentionally uses a simpler major-version tag.

## RedisExplorer project questions

### 75. What problem does RedisExplorer solve?

**Short answer:** It helps students learn Redis by seeing and changing real keys, typed values, commands, TTL, and cache behavior.

The UI connects abstract database ideas to visible actions. Students can create data, inspect results, run commands, and compare a source record with a cached copy.

### 76. What is the project architecture?

**Short answer:** React and Vite in the browser, Express as the HTTP API, the official Node.js Redis client, and Redis as the database.

The browser sends JSON to Express. Express validates the request and calls a service. The service sends Redis commands. Results return as JSON and update React state.

### 77. Why does the frontend not connect to Redis directly?

**Short answer:** Direct browser access would expose credentials and bypass server-side validation and authorization.

The API keeps `REDIS_URL` on the server and restricts what the client can do. Only environment variables beginning with `VITE_` enter frontend code, so Redis credentials remain server-side.

### 78. Which Redis data types does the app support?

**Short answer:** String, list, set, and hash.

Data Explorer provides create, read, update, and delete flows for all four. The command console exposes additional operations on those types.

### 79. How does Data Explorer write values?

**Short answer:** It validates the input, runs a type-specific write, then applies `EXPIRE` when a TTL is present.

Strings use `SET`. Lists and sets are replaced by deleting the old key and pushing or adding the supplied items. Hashes are replaced by deleting the old key and setting supplied fields. This is easy to understand but is not an atomic whole-value replacement.

### 80. Why does Data Explorer use `SCAN`?

**Short answer:** It lists keys incrementally instead of blocking Redis with a full `KEYS` scan.

The app requests up to a bounded count, then looks up the type and TTL of each returned key. Search and filters apply to loaded keys, not necessarily the entire keyspace.

### 81. How is the command console made safer?

**Short answer:** The backend uses a command allowlist, validates key formats and argument counts, limits text size, and excludes administrative and scripting commands.

This prevents many unsafe inputs but does not create user isolation. Every visitor still shares the connected learning database.

### 82. What exactly does Cache Lab store?

**Short answer:** It stores a source record, a cached copy, and recent experiment history under separate Redis keys.

The separation lets a source update leave the cached copy unchanged, which visibly demonstrates stale data. Source and history keys expire after 24 hours. The cached copy uses the selected TTL from 1 to 3,600 seconds.

### 83. Does Cache Lab use MySQL as its source?

**Short answer:** No. Both the teaching source and cached copy are stored in Redis under different keys.

The lab accurately demonstrates the cache-aside sequence and staleness concept, but it does not measure Redis against MySQL or integrate a second database. State this boundary clearly.

### 84. Where are dashboard metrics stored?

**Short answer:** Cache counters and recent-operation metrics are stored in Express process memory.

They reset when the API restarts and are not shared across multiple API instances. Production observability should use a durable metrics system.

### 85. What happens if Redis disconnects?

**Short answer:** The API returns HTTP 503 for `/api` requests when the Redis client reports that it is not ready.

The Node.js client disables the offline queue, so the app does not silently accumulate commands while disconnected. The UI can show the unavailable state and ask the user to retry.

### 86. Is RedisExplorer production-ready?

**Short answer:** No. It is intentionally a learning project.

It has one shared database, no user authentication, no per-user namespace, and a Delete all action. It runs one Redis instance and has no Sentinel, Cluster, off-host backup, or production monitoring design. The allowlist and validation are useful controls, but they do not make the deployment a safe public multi-user database product.

### 87. What would you improve first?

**Short answer:** Add authentication and user isolation, then strengthen deployment, testing, monitoring, and recovery.

Useful next steps include per-user key namespaces or separate databases, least-privilege Redis ACLs, rate limiting, exact container version pinning, durable metrics, automated integration tests, an external source database for Cache Lab, backups, and a managed high-availability Redis deployment.

### 88. Why is this a database project rather than only a frontend project?

**Short answer:** The core behavior comes from Redis data modeling and commands.

The project chooses value types, key conventions, TTL, command semantics, persistence, cache behavior, and data access patterns. React visualizes those concepts, while Express protects and translates the database operations.

## Rapid-fire facts

- Default Redis port: `6379`.
- Sentinel default port: `26379`.
- `TTL` returns seconds; `PTTL` returns milliseconds.
- `TTL = -1`: key exists without expiration.
- `TTL = -2`: key is missing.
- `TYPE key`: reports the value type.
- `DEL`: synchronous deletion and memory reclamation.
- `UNLINK`: asynchronous memory reclamation.
- `SCAN`: cursor-based iteration; duplicates are possible.
- `KEYS`: full keyspace operation that can block.
- `MULTI` / `EXEC`: queue and execute a transaction group.
- `WATCH`: optimistic locking.
- `DISCARD`: abandon the transaction queue before execution.
- Pipeline: reduce network round trips, not atomicity.
- RDB: point-in-time snapshots.
- AOF: write-operation log.
- Replication: asynchronous by default.
- Sentinel: high availability for non-clustered Redis.
- Cluster: sharding across 16,384 hash slots plus failover.
- Pub/Sub: ephemeral broadcast messaging.
- Streams: retained append-only event log with consumer groups.
- Expiration: application deadline on a key.
- Eviction: server response to memory pressure.
- RedisExplorer types: string, list, set, hash.
- RedisExplorer local persistence: AOF plus a Docker volume.
- RedisExplorer limitations: shared database, no authentication, learning use only.

## Questions the class may ask during the demo

### Why did `HSET` return 0 instead of 1?

The field already existed, so Redis updated it instead of adding a new field. The command still succeeded.

### Why did `TTL` return `-2`?

The key expired or was deleted. Run the `SET ... EX 60` command again.

### Why did the set remove duplicate items?

Uniqueness is part of the set data type. `SADD` ignores members already present.

### Why did list order and set order look different?

Lists preserve insertion order. Sets are unordered, so their returned order should not be treated as meaningful.

### Why does saving a string remove its old TTL?

`SET` overwrites the key and clears its previous timeout. RedisExplorer reapplies a TTL when the user supplies one. Leaving the TTL blank intentionally produces a persistent key.

### Why can the cache be fast but wrong?

The cache returns its stored copy without consulting the source. That is why cache invalidation and TTL are correctness choices, not only performance choices.

## Primary references

- [Redis data types](https://redis.io/docs/latest/develop/data-types/)
- [Redis data type comparison](https://redis.io/docs/latest/develop/data-types/compare-data-types/)
- [Redis use cases](https://redis.io/docs/latest/develop/use-cases/)
- [Redis transactions](https://redis.io/docs/latest/develop/using-commands/transactions/)
- [Redis SCAN](https://redis.io/docs/latest/commands/scan/)
- [Redis EXPIRE](https://redis.io/docs/latest/commands/expire/)
- [Redis eviction](https://redis.io/docs/latest/develop/reference/eviction/)
- [Redis persistence](https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/)
- [Redis replication](https://redis.io/docs/latest/operate/oss_and_stack/management/replication/)
- [Redis Sentinel](https://redis.io/docs/latest/operate/oss_and_stack/management/sentinel/)
- [Redis Cluster](https://redis.io/docs/latest/management/scaling/)
- [Redis security](https://redis.io/docs/latest/operate/oss_and_stack/management/security/)
- [Redis licensing](https://redis.io/legal/licenses/)
- [MySQL InnoDB overview](https://dev.mysql.com/doc/refman/8.4/en/innodb-introduction.html)
- [MySQL InnoDB and ACID](https://dev.mysql.com/doc/refman/8.4/en/mysql-acid.html)
- [MySQL InnoDB best practices](https://dev.mysql.com/doc/refman/8.4/en/innodb-best-practices.html)
- [RedisExplorer README](https://github.com/Hetul803/RedisExplorer/blob/dev/README.md)
