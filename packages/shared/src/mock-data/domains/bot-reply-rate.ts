import { mockDb } from './store';

/** Atomic synchronous mock publication check; no budget is spent on a failed write. */
export function mockReplyRateAllows(groupId: string, now: number): boolean {
  const db = mockDb();
  const rooms = new Set(db.rooms.filter((room) => room.groupId === groupId).map((room) => room.id));
  let group = 0;
  let system = 0;
  for (const meta of db.botMessageMeta.values()) {
    const at = Date.parse(meta.createdAt);
    if (meta.kind !== 'reply' || at <= now - 60000 || at > now) continue;
    system++;
    if (rooms.has(meta.roomId)) group++;
  }
  return group < 12 && system < 60;
}
