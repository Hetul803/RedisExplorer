export const types = [
  {
    id: "string",
    name: "Strings",
    description: "Simple text, numbers, or serialized data",
    symbol: "S",
    tint: "mint",
  },
  {
    id: "list",
    name: "Lists",
    description: "Ordered collections of values",
    symbol: "L",
    tint: "blue",
  },
  {
    id: "set",
    name: "Sets",
    description: "Unique, unordered members",
    symbol: "∪",
    tint: "violet",
  },
  {
    id: "hash",
    name: "Hashes",
    description: "Field and value records",
    symbol: "H",
    tint: "amber",
  },
];
export const starterCommands = [
  'SET greeting "Hello Redis"',
  "GET greeting",
  "LPUSH queue task-1",
  "LRANGE queue 0 -1",
  "SADD tags redis nosql",
  "SMEMBERS tags",
  "HSET user:1 name Ada",
  "HGET user:1 name",
];
