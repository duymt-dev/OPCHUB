/** Redis Pub/Sub ignores SELECT database. Namespace every channel, including Socket.IO.
 * DB 1 (native demo) and DB 2 (integration) must never exchange packets.
 */
export const redisPubSubChannel = (base: string, database: number): string =>
  `${base}:db:${database}`;
