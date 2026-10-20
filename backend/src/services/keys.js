const KEY_PATTERN = /^[\w:.-]{1,128}$/;
export const validateKey = (key) => typeof key === 'string' && KEY_PATTERN.test(key);
export const safeError = (message, status = 400) => Object.assign(new Error(message), { status });

export async function listKeys(redis, cursor = '0', limit = 100) {
  const result = await redis.scan(cursor, { MATCH: '*', COUNT: Math.min(Math.max(Number(limit) || 100, 1), 500) });
  const keys = await Promise.all(result.keys.map(async (key) => ({ key, type: await redis.type(key), ttl: await redis.ttl(key) })));
  return { cursor: result.cursor, keys };
}

export async function inspectKey(redis, key) {
  if (!validateKey(key)) throw safeError('Key must be 1–128 characters: letters, numbers, _, :, ., or -');
  const type = await redis.type(key);
  if (type === 'none') throw safeError('Key not found', 404);
  let value;
  if (type === 'string') value = await redis.get(key);
  else if (type === 'list') value = await redis.lRange(key, 0, -1);
  else if (type === 'set') value = await redis.sMembers(key);
  else if (type === 'hash') value = await redis.hGetAll(key);
  else throw safeError(`Viewing ${type} keys is not supported by this explorer`, 422);
  return { key, type, value, ttl: await redis.ttl(key) };
}

export async function writeKey(redis, { key, type = 'string', value, ttl }) {
  if (!validateKey(key)) throw safeError('Key must be 1–128 characters: letters, numbers, _, :, ., or -');
  if (!['string', 'list', 'set', 'hash'].includes(type)) throw safeError('Type must be string, list, set, or hash');
  if (value === undefined || value === null) throw safeError('A value is required');
  const ttlNumber = ttl === '' || ttl === undefined || ttl === null ? null : Number(ttl);
  if (ttlNumber !== null && (!Number.isInteger(ttlNumber) || ttlNumber < 1 || ttlNumber > 31536000)) throw safeError('Expiration must be a whole number between 1 and 31536000 seconds');
  if (type === 'string') {
    if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') throw safeError('String values must be text, number, or boolean');
    await redis.set(key, String(value));
  } else if (type === 'list' || type === 'set') {
    if (!Array.isArray(value) || !value.length || value.some((item) => typeof item !== 'string' && typeof item !== 'number')) throw safeError(`${type} values must be a non-empty array of strings or numbers`);
    const items = value.map(String);
    await redis.del(key);
    if (type === 'list') await redis.rPush(key, items); else await redis.sAdd(key, items);
  } else {
    if (!value || typeof value !== 'object' || Array.isArray(value) || !Object.keys(value).length || Object.values(value).some((v) => typeof v !== 'string' && typeof v !== 'number')) throw safeError('Hash values must be a non-empty object with string or number fields');
    await redis.del(key);
    await redis.hSet(key, Object.fromEntries(Object.entries(value).map(([field, fieldValue]) => [field, String(fieldValue)])));
  }
  if (ttlNumber !== null) await redis.expire(key, ttlNumber);
  return inspectKey(redis, key);
}

export async function deleteKey(redis, key) {
  if (!validateKey(key)) throw safeError('Key must be 1–128 characters: letters, numbers, _, :, ., or -');
  return redis.del(key);
}
