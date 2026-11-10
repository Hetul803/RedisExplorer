# Speaker 1 script: Redis foundations

Slides 1–6 · target time: **5 minutes 10 seconds**

Your job is to give the class a mental model before the project demo. Speak slowly enough that students can connect Redis concepts to familiar database ideas. The quoted text is the timed script. The study notes after it are for preparation and should not be read aloud.

## Timing plan

| Slide | Topic | Target |
| --- | --- | ---: |
| 1 | RedisExplorer introduction | 0:25 |
| 2 | Why Redis was created | 0:50 |
| 3 | Why teams use Redis | 1:00 |
| 4 | Redis inside NoSQL | 0:50 |
| 5 | Redis mental model | 1:00 |
| 6 | Four types in our app | 1:05 |
|  | **Total** | **5:10** |

## Timed spoken script

<!-- BEGIN SPOKEN SCRIPT -->

### Slide 1: RedisExplorer

> Good morning. Our project is RedisExplorer, a learning application connected to a real Redis database. I will begin with why Redis exists, where developers use it, and how its data model differs from a relational database. Then Speakers 2 and 3 will show our implementation, caching behavior, and production tradeoffs.

### Slide 2: Why Redis was created

> Redis began in 2009 with Salvatore Sanfilippo. He was building LLOOGG, a real-time log analysis tool, and traditional database scaling was becoming a problem. He created a server that kept working data in memory and offered simple operations on useful data structures. The prototype worked, so he released it as an open source project. Redis originally meant Remote Dictionary Server.

> The origin explains the design: Redis began with a need for fast access to rapidly changing data rather than tables and joins.

### Slide 3: Why teams use Redis

> Teams use Redis when an application needs data quickly, repeatedly, or temporarily. A cache reuses an expensive database result. A session stores login state and expires automatically. Counters track page views. Sorted sets maintain changing game rankings. Lists and streams can coordinate background work.

> In the 2026 Stack Overflow Developer Survey, 28.3 percent of respondents reported extensive Redis work in the previous year. Redis reports at least 100 Fortune 500 customers and more than 10 billion Docker pulls. Those company figures are not independent market-share estimates.

> In our app, Data Explorer shows keys and types, the command console lets us run safe Redis commands, and Cache Lab demonstrates hits, misses, expiration, and stale data.

### Slide 4: Where Redis fits in NoSQL

> NoSQL is a family of non-relational data models, not one design. MySQL normally stores related records in tables with columns, primary keys, and foreign keys. SQL can filter, aggregate, and join records.

> Redis starts from a different question: what key will the application use, and what operation should happen to the value at that key? Redis does not provide ordinary relational joins or foreign-key constraints. That makes direct access simple and fast, but the application must choose keys and access patterns carefully.

> Many production systems use MySQL and Redis together. MySQL remains the durable system of record, while Redis handles caching, sessions, counters, or other real-time state.

### Slide 5: The Redis mental model

> A Redis interaction has a command, key, value type, and response. Here the client sends HGETALL for student colon 42. Redis finds a hash and returns the fields name and major.

> The type matters. HGETALL works on a hash, but using it on a list produces a wrong-type error. A single Redis command is atomic because Redis completes that command without interleaving another client's command execution.

> The working dataset lives in memory. That gives Redis its fast access pattern, but in-memory does not automatically mean temporary. Redis can write RDB snapshots or an append-only log to disk.

### Slide 6: Four Redis types implemented in our app

> Our app teaches four core types. A string stores bytes, so it can represent text, a number, or serialized JSON. Strings also support atomic counters with commands such as INCR.

> A list preserves order and allows duplicates. A set stores unique members and supports membership and set operations. A hash stores field-value pairs, so we can update one field without replacing the entire record.

> Redis has additional types. Sorted sets add a numeric score and order members, which is ideal for leaderboards. Streams store an append-only event log with consumer groups. We limited RedisExplorer to strings, lists, sets, and hashes so students can see the key idea clearly: the value's type determines the commands and behavior available to the application.

> Speaker 2 will now show how our React and Express application turns these Redis operations into a visual workflow and a live command demo.

<!-- END SPOKEN SCRIPT -->

## Presenter study notes: do not read aloud

### The one-sentence definition

Redis is an in-memory data structure server that stores typed values under keys and exposes type-specific commands over a network connection.

Calling Redis only a cache is incomplete. Redis can act as a cache, database, message broker, stream processor, session store, counter service, rate limiter, leaderboard, and more. Whether it should hold primary data depends on durability, consistency, query, and recovery requirements.

### Why the comparison with MySQL matters

MySQL and Redis solve different default problems.

| Question | MySQL with InnoDB | Redis |
| --- | --- | --- |
| How is data modeled? | Tables, rows, columns, relationships | Keys mapped to typed values |
| How is data accessed? | SQL queries, indexes, filters, joins | Direct commands against known keys and types |
| How is integrity enforced? | Schema, data types, unique constraints, foreign keys | Command semantics plus application-level key design |
| What is the usual storage model? | Durable disk storage with memory caching | Working dataset in memory with configurable persistence |
| What is the transaction model? | Multi-statement ACID transactions with commit and rollback | Atomic commands; queued transactions and optimistic locking, without rollback |
| Where does it fit best? | Systems of record and relationship-heavy data | Fast state, caching, sessions, counters, rankings, queues, and direct-access workloads |

Avoid saying “NoSQL has no schema.” Redis has no relational table schema, but every key has a type and every command has rules. The application still creates a logical schema through key names, value types, validation, and conventions.

Avoid saying “Redis replaces MySQL.” A better statement is: Redis can be a primary database when its model fits, but many applications combine Redis with MySQL because each handles a different part of the workload well.

### The origin and adoption claims

- Salvatore Sanfilippo created Redis in 2009 to scale LLOOGG, a real-time log analysis tool.
- Redis stands for REmote DIctionary Server.
- The 2026 Stack Overflow Developer Survey reports 3,414 Redis users among 12,061 respondents, or 28.3%, for extensive work in the prior year.
- Redis reports at least 100 Fortune 500 customers and more than 10 billion Docker pulls.
- Do not convert those figures into “50 percent of corporations.” The sources do not support that claim.

### Commands to understand before presenting

```text
SET class:topic Redis EX 60
GET class:topic
TTL class:topic
HSET student:42 name Ada
HGETALL student:42
INCR page:views
RPUSH jobs email:123
SADD course:topics redis nosql
```

- `SET ... EX 60` writes a string and gives the key a 60-second lifetime.
- `TTL` returns seconds remaining, `-1` for a key without expiration, and `-2` for a missing key.
- `HSET` updates fields in a hash. `HGETALL` returns all fields and values.
- `INCR` is an atomic counter operation on a string containing an integer.
- `RPUSH` appends to a list.
- `SADD` adds unique members to a set and ignores duplicates.

### How these ideas appear in RedisExplorer

- Data Explorer validates key names and supports string, list, set, and hash values.
- The editor accepts text for strings, JSON arrays for lists and sets, and a JSON object for hashes.
- The backend converts those inputs into Redis commands. Lists use `RPUSH`, sets use `SADD`, and hashes use `HSET`.
- Optional expiration becomes an `EXPIRE` call after the value is written.
- Inspecting a key uses `TYPE` first, then a command appropriate for that type.
- The command console exposes a teaching allowlist instead of arbitrary administrative or scripting commands.

### Sources

- [Redis history and design](https://redis.io/blog/redis-then-and-now-adapting-with-developers-through-every-era/)
- [Redis name and project origin](https://github.com/redis/redis-doc/blob/master/docs/get-started/faq.md)
- [Redis data types](https://redis.io/docs/latest/develop/data-types/)
- [Redis use cases](https://redis.io/docs/latest/develop/use-cases/)
- [Redis persistence](https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/)
- [MySQL InnoDB overview](https://dev.mysql.com/doc/refman/8.4/en/innodb-introduction.html)
- [2026 Stack Overflow database survey](https://survey.stackoverflow.co/2026/technology/data/databases-timeseries)
- [Redis adoption figures](https://redis.io/)
- [RedisExplorer README](https://github.com/Hetul803/RedisExplorer/blob/dev/README.md)
