import { outboxEvents } from '../../outbox/events';
import {
  moderationWarningContent,
  moderationWarningId,
} from '../../moderation/warning-notification';
import type { OutboxPayload } from '../../outbox/events';
import type { MockDb } from './store-types';
import { mockDb } from './store';
import { mockReportSource } from './report-context';
import { publishMockNotification } from './notification-runtime';
import { iso } from './util';

interface State {
  pending: Map<string, OutboxPayload<'moderation.warned'>>;
  queued: Set<string>;
}
const states = new WeakMap<MockDb, State>();
function state() {
  const db = mockDb();
  let value = states.get(db);
  if (!value) {
    value = { pending: new Map(), queued: new Set() };
    states.set(db, value);
  }
  return value;
}

/** Same action commit; capture the sender/room even when the message is later deleted. */
export function enqueueMockModerationWarning(reportId: string): boolean {
  const source = mockReportSource(reportId);
  if (!source?.userId || state().queued.has(reportId)) return false;
  const payload = outboxEvents['moderation.warned'].parse({ ...source, reportId });
  state().pending.set(reportId, payload);
  state().queued.add(reportId);
  return true;
}

export function drainMockModerationWarnings(now = Date.now()): number {
  const db = mockDb();
  const jobs = state();
  let handled = 0;
  for (const [reportId, payload] of jobs.pending) {
    const room = db.rooms.find((row) => row.id === payload.roomId);
    if (room)
      publishMockNotification(db, payload.userId, {
        id: moderationWarningId(reportId),
        ...moderationWarningContent({ ...room, slug: room.id.slice(room.groupId.length + 1) }),
        read: false,
        createdAt: iso(now),
      });
    jobs.pending.delete(reportId);
    handled++;
  }
  return handled;
}
export const pendingMockModerationWarnings = () => state().pending.size;
