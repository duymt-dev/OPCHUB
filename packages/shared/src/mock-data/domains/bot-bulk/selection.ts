import { botBulkSelectionSchema, type BotBulkSelection } from '../../../api-domains/bot-bulk';
import { conflict, notFound, ok } from '../util';
import { mockBulkRecord, refreshMockBulk } from './state';

export function selectMockBulk(id: string, input: BotBulkSelection, now = Date.now()) {
  const clean = botBulkSelectionSchema.parse(input);
  const record = mockBulkRecord(id);
  if (!record) return notFound('Không tìm thấy đợt tạo kịch bản');
  const ids = new Set(clean.itemIds);
  const items = record.items.filter((item) => ids.has(item.id));
  if (items.length !== ids.size) return notFound('Không tìm thấy kết quả trong đợt tạo này');
  if (items.some((item) => item.savedScriptId))
    return conflict('Kịch bản đã lưu không thể bỏ chọn để xoá');
  for (const item of items) item.selected = clean.selected;
  refreshMockBulk(record, now);
  return ok(structuredClone(record.value));
}
