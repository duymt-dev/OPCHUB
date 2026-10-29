import { botReplySettingsSchema } from '../../api-domains/bot-replies';
import { compareMockMessages } from './bot-message-store';
import { chatState } from './chat-store';
import { mockDb } from './store';

export interface MockReplyCandidateGroup {
  groupId: string;
  groupName: string;
  roomId: string;
  pending: number;
  messageIds: string[];
}

/** D-112: latest N first, then eligibility. Do not backfill with older human messages. */
export function scanMockReplyCandidates(sampleSize: number): MockReplyCandidateGroup[] {
  const size = botReplySettingsSchema.shape.sampleSize.parse(sampleSize);
  const db = mockDb();
  const ext = chatState().ext;
  const groups = new Map(db.groups.map((group) => [group.id, group.name]));
  // Publication metadata survives hidden messages and the120-row display retention.
  const answered = new Set([...db.botMessageMeta.values()].map((row) => row.replyToId));
  const candidates: MockReplyCandidateGroup[] = [];
  for (const room of db.rooms) {
    const groupName = groups.get(room.groupId);
    if (!room.isDefault || groupName === undefined) continue;
    const recent = [...(db.messages.get(room.id) ?? [])].sort(compareMockMessages).slice(-size);
    const messageIds = recent
      .filter((message) => {
        const meta = ext.get(message.id);
        return (
          meta?.kind === 'text' &&
          !!meta.senderId &&
          !message.isSimulated &&
          !message.hiddenAt &&
          message.body !== '' &&
          !answered.has(message.id)
        );
      })
      .map((message) => message.id);
    if (messageIds.length)
      candidates.push({
        groupId: room.groupId,
        groupName,
        roomId: room.id,
        pending: messageIds.length,
        messageIds,
      });
  }
  return candidates.sort(
    (a, b) => b.pending - a.pending || (a.groupId < b.groupId ? -1 : a.groupId > b.groupId ? 1 : 0),
  );
}

/** Only the final10 groups / latest8 candidates carry display bodies, as in native. */
export function mockReplyScanOverview(sampleSize: number) {
  const candidates = scanMockReplyCandidates(sampleSize);
  const db = mockDb();
  const counts = new Map<string, number>();
  for (const persona of db.personas)
    if (persona.enabled)
      for (const groupId of new Set(persona.groupIds))
        counts.set(groupId, (counts.get(groupId) ?? 0) + 1);
  return {
    pendingTotal: candidates.reduce((total, group) => total + group.pending, 0),
    groupCount: candidates.length,
    groups: candidates.slice(0, 10).map(({ messageIds, ...group }) => {
      const messages = new Map((db.messages.get(group.roomId) ?? []).map((row) => [row.id, row]));
      return {
        ...group,
        personaCount: counts.get(group.groupId) ?? 0,
        preview: messageIds
          .slice(-8)
          .reverse()
          .flatMap((id) => {
            const row = messages.get(id);
            return row
              ? [{ id, senderName: row.sender.name, body: row.body, createdAt: row.createdAt }]
              : [];
          }),
      };
    }),
  };
}
