import type { Message } from '../../api-domains';
import { compareMockMessages } from './bot-message-store';
import type { MockDb } from './store-types';

/** Native demo already stores rpt-<case> messages hidden at this exact timestamp. */
export function seedMockReportHistory(db: MockDb): void {
  for (const report of db.reports) {
    const group = db.groups.find((row) => row.name === report.groupName);
    const room = db.rooms.find((row) => row.groupId === group?.id && row.isDefault);
    if (!room) continue;
    const message: Message = {
      id: `rpt-${report.id}`,
      roomId: room.id,
      sender: { name: report.senderName, avatarUrl: null },
      body: report.body,
      attachment: null,
      reactions: [],
      pinned: false,
      isSimulated: false,
      createdAt: report.createdAt,
      hiddenAt: '2026-10-16T08:00:00.000Z',
    };
    db.reportMessageIds.set(report.id, message.id);
    db.messages.set(
      room.id,
      [...(db.messages.get(room.id) ?? []), message].sort(compareMockMessages),
    );
  }
}
