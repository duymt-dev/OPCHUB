import { normalizeBotBulkLine } from '../../../bot/bulk-plan';
import { botBulkItemSchema } from '../../../api-domains/bot-bulk';
import { auditMockBulk } from './audit';
import { mockDb, nextId } from '../store';
import { conflict, notFound, ok } from '../util';
import { mockBulkGroupsExist, mockBulkRecord, refreshMockBulk } from './state';

/** Validate all selected items before any insert; saved marker survives subsequent script deletion. */
export function saveMockBulk(id: string, actorId: string, now = Date.now()) {
  const record = mockBulkRecord(id);
  if (!record) return notFound('Không tìm thấy đợt tạo kịch bản');
  const batch = record.value;
  if (batch.status !== 'done') return conflict('Chờ AI tạo xong trước khi lưu kịch bản');
  const items = record.items.filter((item) => item.selected && !item.savedScriptId);
  if (!items.length)
    return batch.savedCount
      ? ok({ saved: 0, scriptIds: [] as string[] })
      : conflict('Chọn ít nhất 1 kịch bản để lưu');
  if (!mockBulkGroupsExist(batch.groupIds)) return conflict('Nhóm đích không còn khả dụng');
  for (const item of items) botBulkItemSchema.shape.lines.parse(item.lines);
  const db = mockDb();
  const hashes = new Set(
    db.scripts.flatMap((s) => s.lines.map((line) => normalizeBotBulkLine(line.body))),
  );
  if (items.some((item) => item.lines.some((line) => hashes.has(normalizeBotBulkLine(line.body)))))
    return conflict(
      'Nội dung đã trùng với kịch bản được lưu sau khi tạo. Bỏ chọn kết quả trùng hoặc tạo đợt mới.',
    );
  const planned = items.map((item) => ({
    item,
    script: {
      id: nextId('sc'),
      topic: item.topic,
      groupIds: [...batch.groupIds],
      lines: structuredClone(item.lines),
      enabled: true,
      type: batch.typeName,
      delayMinutes: batch.delayMinutes,
      runAt: null,
      inviteReal: true,
    },
  }));
  const scripts = planned.map(({ script }) => script);
  db.scripts.push(...scripts);
  for (const { item, script } of planned) {
    item.savedScriptId = script.id;
    auditMockBulk(
      actorId,
      'script.create',
      'script',
      script.id,
      `Thêm kịch bản AI ${script.topic}`,
    );
  }
  refreshMockBulk(record, now);
  return ok({ saved: scripts.length, scriptIds: scripts.map((script) => script.id) });
}
