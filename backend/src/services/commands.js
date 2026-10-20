import { safeError, validateKey } from './keys.js';
const stringArg = (value, label) => { if (typeof value !== 'string' || value.length > 4096) throw safeError(`${label} must be text (maximum 4096 characters)`); return value; };
export async function executeCommand(redis, input) {
  const words = Array.isArray(input) ? input : (String(input || '').match(/(?:[^\s"']+|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')+/g) || []).map((word) => word.replace(/^(?:"(.*)"|'(.*)')$/, (_match, doubleQuoted, singleQuoted) => (doubleQuoted ?? singleQuoted).replace(/\\(["'\\])/g, '$1')));
  if (!words.length || !words[0]) throw safeError('Enter a command to run');
  const command = String(words[0]).toUpperCase();
  const args = words.slice(1);
  const key = args[0];
  if (command === 'PING' && args.length === 0) return redis.ping();
  if (!['SET','GET','DEL','LPUSH','LRANGE','SADD','SMEMBERS','HSET','HGET'].includes(command)) throw safeError('Command is not allowed. Try SET, GET, DEL, LPUSH, LRANGE, SADD, SMEMBERS, HSET, HGET, or PING');
  if (!validateKey(key)) throw safeError('Use a valid key (letters, numbers, _, :, ., or -; maximum 128 characters)');
  switch (command) {
    case 'SET': if (args.length !== 2) throw safeError('Usage: SET key value'); return redis.set(key, stringArg(args[1], 'Value'));
    case 'GET': if (args.length !== 1) throw safeError('Usage: GET key'); return redis.get(key);
    case 'DEL': if (args.length !== 1) throw safeError('Usage: DEL key'); return redis.del(key);
    case 'LPUSH': if (args.length < 2) throw safeError('Usage: LPUSH key value [value ...]'); return redis.lPush(key, args.slice(1).map((v) => stringArg(v, 'Value')));
    case 'LRANGE': if (args.length !== 3 || !Number.isInteger(Number(args[1])) || !Number.isInteger(Number(args[2]))) throw safeError('Usage: LRANGE key start stop (integer indexes)'); return redis.lRange(key, Number(args[1]), Number(args[2]));
    case 'SADD': if (args.length < 2) throw safeError('Usage: SADD key member [member ...]'); return redis.sAdd(key, args.slice(1).map((v) => stringArg(v, 'Member')));
    case 'SMEMBERS': if (args.length !== 1) throw safeError('Usage: SMEMBERS key'); return redis.sMembers(key);
    case 'HSET': if (args.length !== 3) throw safeError('Usage: HSET key field value'); return redis.hSet(key, args[1], stringArg(args[2], 'Value'));
    case 'HGET': if (args.length !== 2) throw safeError('Usage: HGET key field'); return redis.hGet(key, args[1]);
  }
}
