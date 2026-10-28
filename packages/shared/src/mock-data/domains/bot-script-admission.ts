import type { BotScript, BotThread } from '../../api-domains';
import { reserveMockBotThread } from './bot-retention';
import { botState } from './bot-state';
import { mockDb, nextId } from './store';
import { conflict, iso, ok, type MockResult } from './util';
import { mockBotScheduleAllows } from './bot-schedule';

/** Single synchronous mock admission transaction, shared by manual and tick paths. */
export function admitMockScript(
  script: BotScript,
  now: number,
  groupId?: string,
): MockResult<{ threadId: string; status: BotThread['status'] }> {
  if (!mockBotScheduleAllows(now)) return conflict('Bot đang tạm dừng hoặc ngoài lịch chạy');
  const db = mockDb();
  const state = botState();
  const existing = state.threads.find(
    (row) =>
      row.scriptId === script.id &&
      row.status !== 'done' &&
      (!groupId || row.snapshot.groupIds.includes(groupId)),
  );
  if (existing) return ok({ threadId: existing.id, status: existing.status });
  if (!reserveMockBotThread()) return conflict('Đã đạt giới hạn 30 hội thoại đang hoạt động');
  const id = nextId('th');
  const createdAt = iso(now);
  const snapshot = structuredClone(script);
  if (groupId) snapshot.groupIds = [groupId];
  state.threads.unshift({
    id,
    scriptId: script.id,
    kind: 'script',
    status: 'scheduled',
    createdAt,
    cursor: 0,
    nextAt: now,
    snapshot,
  });
  db.botLog.unshift({
    id,
    scriptId: script.id,
    topic: script.topic,
    groupNames: snapshot.groupIds.map(
      (group) => db.groups.find((row) => row.id === group)?.name ?? group,
    ),
    status: 'scheduled',
    createdAt,
  });
  return ok({ threadId: id, status: 'scheduled' });
}
