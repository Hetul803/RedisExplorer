export const lessons = [
  {
    title: "Strings and key-value storage",
    description:
      "Redis addresses each value by a unique key rather than a table row. Strings hold text, serialized JSON, or counters. SET replaces the previous value; GET returns null if the key is missing. Use descriptive names with colons to group related records.",
    commands: [
      'SET learn:greeting "Hello Redis"',
      "GET learn:greeting",
      "STRLEN learn:greeting",
      "INCR learn:visits",
      "EXISTS learn:greeting",
    ],
    tip: "Start with SET to create a value. Repeated INCR calls demonstrate a counter.",
  },
  {
    title: "Lists: ordered work queues",
    description:
      "Lists preserve order and allow repeated values. LPUSH adds at the front, RPUSH at the end. LRANGE reads a range without removing anything; LPOP removes the first item. Index zero means the first element and -1 means the last.",
    commands: [
      "RPUSH learn:queue email report backup",
      "LRANGE learn:queue 0 -1",
      "LLEN learn:queue",
      "LPOP learn:queue",
      "LINDEX learn:queue 0",
    ],
    tip: "Add a few items before reading or removing them. Compare the order after LPUSH and RPUSH.",
  },
  {
    title: "Sets: unique membership",
    description:
      "Sets store unique values without guaranteed ordering. Adding the same tag twice does not create a duplicate. Membership tests are useful for tags and permissions. Union, intersection, and difference compare groups.",
    commands: [
      "SADD learn:tags redis database redis",
      "SMEMBERS learn:tags",
      "SCARD learn:tags",
      "SISMEMBER learn:tags redis",
      "SREM learn:tags database",
    ],
    tip: "Run SADD twice and observe the returned count of newly added members.",
  },
  {
    title: "Hashes: editable records",
    description:
      "A hash groups fields under one key. HSET changes a field without replacing the whole record. HGETALL reads the record. HINCRBY supports negative increments for numeric fields. HDEL deletes individual fields; deleting the last field removes the key.",
    commands: [
      "HSET learn:product name Book",
      "HSET learn:product stock 10",
      "HGETALL learn:product",
      "HINCRBY learn:product stock -1",
      "HDEL learn:product name",
      "HEXISTS learn:product stock",
    ],
    tip: "Create stock before decrementing it. A missing numeric field starts at zero; text values cannot be incremented.",
  },
  {
    title: "Expiration and caching",
    description:
      "TTL is the remaining lifetime of a key in seconds. -1 means no expiry and -2 means the key is absent. Expiration removes data automatically. A cache is a copy of source data: updating the source does not update the copy unless the application invalidates or refreshes it.",
    commands: [
      "SET learn:temporary hello EX 30",
      "TTL learn:temporary",
      "EXPIRE learn:temporary 60",
      "PERSIST learn:temporary",
      "GET learn:temporary",
    ],
    tip: "Create the expiring key first, inspect TTL, then explore stale source data in Cache Lab.",
  },
];
