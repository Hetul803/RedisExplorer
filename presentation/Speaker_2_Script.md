# Speaker 2 script: RedisExplorer architecture and live demo

This script covers slides 7–9. Read only the timed script during the presentation. The study notes and demo recovery plan are for preparation.

## Timing plan

| Slide | Topic | Target |
| --- | --- | ---: |
| 7 | Application architecture | 1:00 |
| 8 | Data Explorer | 0:50 |
| 9 | Command console and live demo | 2:30 |
|  | **Total** | **4:20** |

## Timed spoken script

<!-- BEGIN SPOKEN SCRIPT -->

### Slide 7: RedisExplorer architecture

> RedisExplorer has three layers. The React and Vite frontend displays forms, keys, and results, but never connects directly to Redis. It sends JSON requests to an Express API.

> Express validates key names, values, command arguments, expiration ranges, and request sizes. It also uses a command allowlist. After validation, one shared Node.js client sends the Redis command, and Express returns the result as JSON.

> This separation matters for database security. A public browser should not receive database credentials or unrestricted command access. In local development, Vite proxies requests to Express, and Docker Compose starts Redis 7 with append-only persistence and a named volume.

### Slide 8: Data Explorer

> Data Explorer turns Redis commands into a visual editor. We choose a key and type. Strings accept simple values, lists and sets accept JSON arrays, and hashes accept a JSON object. We can also add a TTL.

> On the backend, a write becomes commands such as SET, RPUSH, SADD, or HSET, followed by EXPIRE when a TTL is present. When we inspect a key, the API first asks Redis for its type and then runs the matching read command.

> The key browser uses cursor-based SCAN instead of KEYS, avoiding one blocking request for the entire keyspace. SCAN can return duplicates while data changes, so clients still need careful iteration logic.

### Slide 9: Command console and live demo

> The command console shows each request and reply. I will connect six commands to Speaker 1's concepts.

> First, `PING`. Redis replies `PONG`, which confirms that the API can reach the database.

> Next, `SET class:topic Redis EX 60`. The key is `class:topic`, the value is the string `Redis`, and `EX 60` gives it a lifetime of 60 seconds. Redis replies `OK`.

> Now `GET class:topic`. Redis returns `Redis`. We know the key, so this is direct access rather than a table scan or join.

> Next, `TTL class:topic`. The number should be below 60 and continue decreasing. A result of `-1` would mean the key exists without an expiration. A result of `-2` would mean the key no longer exists.

> Finally, I will create a hash with `HSET class:student name Ada`. Redis returns the number of fields that were added. Then `HGETALL class:student` returns the field `name` and the value `Ada`. A hash lets an application update one field without replacing an entire serialized object.

> The console allows lesson commands and blocks administrative and scripting commands. It also limits arguments and input size. That reduces risk, although the deployment remains a shared database without user authentication.

> The complete path is browser, Express validation, Redis command, and JSON response. Speaker 3 will now show why Redis often sits in front of another source and how a cached copy becomes stale.

<!-- END SPOKEN SCRIPT -->

## Live demo checklist

Run these commands in order:

```text
PING
SET class:topic Redis EX 60
GET class:topic
TTL class:topic
HSET class:student name Ada
HGETALL class:student
```

Expected replies:

| Command | Expected result | Meaning |
| --- | --- | --- |
| `PING` | `PONG` | Redis connection works |
| `SET ... EX 60` | `OK` | String created with expiration |
| `GET class:topic` | `Redis` | Direct read by key |
| `TTL class:topic` | Integer from 0 to 60 | Seconds remaining |
| `HSET ...` | Usually `1` on first run | One new hash field added |
| `HGETALL ...` | Field-value result | Hash record returned |

If `HSET` returns `0`, the field already existed and Redis updated it. That is a valid result, not a failure. If `TTL` returns `-2`, the class key expired; run the `SET` command again.

## Demo recovery plan

If the deployed app or network is unavailable:

1. Stay on slide 9 and read the commands from the left side.
2. Point to the captured console screenshot on the right.
3. Explain each expected reply from the table above.
4. State that the deck contains a screenshot so the database interaction remains understandable without a live connection.
5. Continue to Speaker 3 on time.

Do not spend more than 20 seconds troubleshooting in front of the class.

## Presenter study notes: do not read aloud

### Why the browser does not connect directly to Redis

A Redis connection URL can contain a host, port, username, password, and TLS settings. Shipping that URL to browser JavaScript would expose credentials. It would also let a user bypass server-side validation and attempt any command allowed by the Redis account. The Express API keeps the connection on the server and exposes only purpose-built HTTP endpoints.

The backend also provides a stable JSON interface. The frontend does not need to understand RESP, the Redis Serialization Protocol, or maintain a raw database connection.

### What the API validates

- Keys must contain 1–128 letters, numbers, underscores, colons, periods, or hyphens.
- Data Explorer accepts only string, list, set, and hash values.
- Lists and sets must be non-empty arrays of strings or numbers.
- Hashes must be non-empty objects whose values are strings or numbers.
- Data Explorer TTL values range from 1 to 31,536,000 seconds.
- Cache Lab TTL values range from 1 to 3,600 seconds.
- JSON request bodies are limited to 32 KB.
- Command arguments are length-limited, and the command console uses an allowlist.

### How Data Explorer writes each type

| Selected type | Backend behavior | Important consequence |
| --- | --- | --- |
| String | `SET key value` | Replaces the previous value and clears an old TTL unless expiration is reapplied |
| List | Delete the key, then `RPUSH` all items | The visual editor replaces the whole list |
| Set | Delete the key, then `SADD` all members | Duplicate input members collapse because sets are unique |
| Hash | Delete the key, then `HSET` the fields | The visual editor replaces the whole hash; the console can update one field |
| Optional TTL | `EXPIRE key seconds` after the write | Expiration applies to the entire key |

The delete-then-recreate approach is easy to teach but creates a short window in which the key does not exist. A production design that requires atomic replacement could use a transaction, Lua/function, a temporary key plus rename, or a data-type-specific update strategy.

### SCAN versus KEYS

`KEYS *` walks the entire keyspace in one command and can block the Redis event loop on a large database. `SCAN` performs incremental cursor-based work. A full scan returns keys that remain present for the whole iteration, but it can return duplicates and gives limited guarantees for keys that change during the scan.

RedisExplorer calls `SCAN` with a bounded `COUNT`, then asks `TYPE` and `TTL` for every returned key. That is appropriate for a teaching database. At large scale, those extra round trips could be pipelined or replaced with a more specialized indexing strategy.

### What the command allowlist protects

The console supports learning commands such as `SET`, `GET`, `DEL`, `EXPIRE`, `TTL`, list, set, and hash operations. It excludes administrative and scripting commands. It also validates key formats and argument counts.

An allowlist reduces accidental damage, but it does not provide user isolation. The deployed learning app has no login, uses one shared Redis database, and includes a confirmed “Delete all keys” action. Those are important project boundaries to state honestly.

### Sources

- [Redis SCAN documentation](https://redis.io/docs/latest/commands/scan/)
- [Redis EXPIRE documentation](https://redis.io/docs/latest/commands/expire/)
- [Redis transactions](https://redis.io/docs/latest/develop/using-commands/transactions/)
- [Redis security](https://redis.io/docs/latest/operate/oss_and_stack/management/security/)
- [RedisExplorer key service](https://github.com/Hetul803/RedisExplorer/blob/dev/backend/src/services/keys.js)
- [RedisExplorer command service](https://github.com/Hetul803/RedisExplorer/blob/dev/backend/src/services/commands.js)
- [RedisExplorer Docker Compose file](https://github.com/Hetul803/RedisExplorer/blob/dev/docker-compose.yml)
