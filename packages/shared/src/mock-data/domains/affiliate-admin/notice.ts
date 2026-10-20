import { mockDb, nextId } from '../store';
import { iso, MOCK_NOW } from '../util';

/** Fake consumer effect; timestamp uses inbox seed clock convention, not payout financial time. */
export function mockAffiliateNotice(userId: string, title: string, body: string) {
  const db = mockDb();
  db.notifications.set(userId, [
    {
      id: nextId('af-notice'),
      type: 'affiliate',
      title,
      body,
      link: '/affiliate',
      read: false,
      createdAt: iso(MOCK_NOW),
    },
    ...(db.notifications.get(userId) ?? []),
  ]);
}
