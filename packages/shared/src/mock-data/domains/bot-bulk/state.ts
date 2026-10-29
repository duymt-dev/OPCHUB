import type { BotBulkItemsQuery } from '../../../api-domains/bot-bulk';
import { botState } from '../bot-state';
import { mockDb } from '../store';
import { notFound, ok } from '../util';
import type { MockBulkRecord } from './schema';

export const mockBulkRecord = (id: string) => botState().bulk.find((r) => r.value.id === id);
export function readMockBulk(id: string) {
  const record = mockBulkRecord(id);
  return record ? ok(structuredClone(record.value)) : notFound('Không tìm thấy đợt tạo kịch bản');
}
export function latestMockBulk(actorId: string) {
  const record = botState()
    .bulk.filter((r) => r.actorId === actorId)
    .sort(
      (a, b) =>
        b.value.createdAt.localeCompare(a.value.createdAt) || b.value.id.localeCompare(a.value.id),
    )[0];
  return { batch: record ? structuredClone(record.value) : null };
}
export function listMockBulkItems(id: string, query: BotBulkItemsQuery) {
  const record = mockBulkRecord(id);
  if (!record) return notFound('Không tìm thấy đợt tạo kịch bản');
  const rows = record.items.filter((item) => item.ordinal > query.after);
  const items = structuredClone(rows.slice(0, query.limit));
  return ok({
    items,
    nextCursor: rows.length > query.limit ? (items.at(-1)?.ordinal ?? null) : null,
  });
}
export function refreshMockBulk(record: MockBulkRecord, now: number) {
  record.value.selectedCount = record.items.filter((item) => item.selected).length;
  record.value.savedCount = record.items.filter((item) => item.savedScriptId !== null).length;
  record.value.updatedAt = new Date(now).toISOString();
}
export const mockBulkGroupsExist = (ids: string[]) =>
  ids.every((id) => mockDb().groups.some((group) => group.id === id));
/** Same bounded preferred/fallback candidate pool as native repository. */
export function mockBulkPersonas(ids: string[]) {
  return mockDb()
    .personas.filter((p) => p.enabled)
    .sort((a, b) => {
      const priority = (groups: string[]) => (groups.some((id) => ids.includes(id)) ? 0 : 1);
      return priority(a.groupIds) - priority(b.groupIds) || a.id.localeCompare(b.id);
    })
    .slice(0, 8);
}
