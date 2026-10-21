import { safeError, validateKey } from "./keys.js";
const stringArg = (value, label) => {
  if (typeof value !== "string" || value.length > 4096)
    throw safeError(`${label} must be text (maximum 4096 characters)`);
  return value;
};
export async function executeCommand(redis, input) {
  const words = Array.isArray(input)
    ? input
    : (
        String(input || "").match(
          /(?:[^\s"']+|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')+/g,
        ) || []
      ).map((word) =>
        word.replace(
          /^(?:"(.*)"|'(.*)')$/,
          (_match, doubleQuoted, singleQuoted) =>
            (doubleQuoted ?? singleQuoted).replace(/\\(["'\\])/g, "$1"),
        ),
      );
  if (!words.length || !words[0]) throw safeError("Enter a command to run");
  const command = String(words[0]).toUpperCase();
  const args = words.slice(1);
  const key = args[0];
  if (command === "PING" && args.length === 0) return redis.ping();
  const extra = {
    EXISTS: [1, 32],
    TYPE: [1, 1],
    PERSIST: [1, 1],
    PTTL: [1, 1],
    STRLEN: [1, 1],
    APPEND: [2, 2],
    INCR: [1, 1],
    DECR: [1, 1],
    INCRBY: [2, 2],
    DECRBY: [2, 2],
    MGET: [1, 32],
    RPUSH: [2, 100],
    LPOP: [1, 1],
    RPOP: [1, 1],
    LLEN: [1, 1],
    LINDEX: [2, 2],
    LSET: [3, 3],
    LREM: [3, 3],
    LTRIM: [3, 3],
    SREM: [2, 100],
    SCARD: [1, 1],
    SISMEMBER: [2, 2],
    SPOP: [1, 1],
    SRANDMEMBER: [1, 1],
    SUNION: [1, 16],
    SINTER: [1, 16],
    SDIFF: [1, 16],
    HDEL: [2, 100],
    HGETALL: [1, 1],
    HEXISTS: [2, 2],
    HLEN: [1, 1],
    HKEYS: [1, 1],
    HVALS: [1, 1],
    HMGET: [2, 100],
    HINCRBY: [3, 3],
    HINCRBYFLOAT: [3, 3],
  };
  if (extra[command]) {
    const [min, max] = extra[command];
    if (args.length < min || args.length > max)
      throw safeError(`${command} expects ${min}–${max} arguments`);
    if (!validateKey(key)) throw safeError("Invalid key");
    args.forEach((arg) => stringArg(arg, "Argument"));
    if (
      ["EXISTS", "MGET", "SUNION", "SINTER", "SDIFF"].includes(command) &&
      args.some((arg) => !validateKey(arg))
    )
      throw safeError("Invalid key");
    try {
      return await redis.sendCommand([command, ...args]);
    } catch (error) {
      throw safeError(error.message);
    }
  }
  if (
    ![
      "SET",
      "GET",
      "DEL",
      "LPUSH",
      "LRANGE",
      "SADD",
      "SMEMBERS",
      "HSET",
      "HGET",
      "EXPIRE",
      "TTL",
    ].includes(command)
  )
    throw safeError(
      "Command is not allowed. Try SET, GET, DEL, LPUSH, LRANGE, SADD, SMEMBERS, HSET, HGET, EXPIRE, TTL, or PING",
    );
  if (!validateKey(key))
    throw safeError(
      "Use a valid key (letters, numbers, _, :, ., or -; maximum 128 characters)",
    );
  switch (command) {
    case "SET": {
      if (args.length === 2) return redis.set(key, stringArg(args[1], "Value"));
      if (
        args.length === 4 &&
        String(args[2]).toUpperCase() === "EX" &&
        Number.isInteger(Number(args[3])) &&
        Number(args[3]) > 0 &&
        Number(args[3]) <= 31536000
      )
        return redis.set(key, stringArg(args[1], "Value"), {
          EX: Number(args[3]),
        });
      throw safeError("Usage: SET key value [EX seconds]");
    }
    case "TTL":
      if (args.length !== 1) throw safeError("Usage: TTL key");
      return redis.ttl(key);
    case "EXPIRE":
      if (
        args.length !== 2 ||
        !Number.isInteger(Number(args[1])) ||
        Number(args[1]) < 1 ||
        Number(args[1]) > 31536000
      )
        throw safeError("Usage: EXPIRE key seconds (1–31536000)");
      return redis.expire(key, Number(args[1]));
    case "GET":
      if (args.length !== 1) throw safeError("Usage: GET key");
      return redis.get(key);
    case "DEL":
      if (args.length !== 1) throw safeError("Usage: DEL key");
      return redis.del(key);
    case "LPUSH":
      if (args.length < 2)
        throw safeError("Usage: LPUSH key value [value ...]");
      return redis.lPush(
        key,
        args.slice(1).map((v) => stringArg(v, "Value")),
      );
    case "LRANGE":
      if (
        args.length !== 3 ||
        !Number.isInteger(Number(args[1])) ||
        !Number.isInteger(Number(args[2]))
      )
        throw safeError("Usage: LRANGE key start stop (integer indexes)");
      return redis.lRange(key, Number(args[1]), Number(args[2]));
    case "SADD":
      if (args.length < 2)
        throw safeError("Usage: SADD key member [member ...]");
      return redis.sAdd(
        key,
        args.slice(1).map((v) => stringArg(v, "Member")),
      );
    case "SMEMBERS":
      if (args.length !== 1) throw safeError("Usage: SMEMBERS key");
      return redis.sMembers(key);
    case "HSET":
      if (args.length !== 3) throw safeError("Usage: HSET key field value");
      return redis.hSet(key, args[1], stringArg(args[2], "Value"));
    case "HGET":
      if (args.length !== 2) throw safeError("Usage: HGET key field");
      return redis.hGet(key, args[1]);
  }
}
