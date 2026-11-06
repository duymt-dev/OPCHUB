/** Keep the historical dev target, plus the explicitly isolated TIP-812 runtime. */
export function assertDevCacheTarget(db, redisUrl, databaseUrl) {
  if (db === 1) return;
  if (db === 3) {
    try {
      const redis = new URL(redisUrl);
      const database = new URL(databaseUrl);
      if (
        ['redis:', 'rediss:'].includes(redis.protocol) &&
        ['localhost', '127.0.0.1'].includes(redis.hostname) &&
        redis.port === '6381' &&
        ['postgres:', 'postgresql:'].includes(database.protocol) &&
        ['localhost', '127.0.0.1'].includes(database.hostname) &&
        database.pathname === '/opchub_v46_812_dev'
      )
        return;
    } catch {
      // Malformed or missing URLs fail closed, without leaking credentials.
    }
  }
  throw new Error('flush:dev-cache target is not an authorized isolated dev runtime');
}
