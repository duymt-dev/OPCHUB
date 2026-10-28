import {
  BUILTIN_BOT_CONVERSATION_TYPES,
  type BotBulkBatch,
  type BotBulkItem,
} from '@opchub/shared/api-domains';
import type { BotBulkInput } from '../bulk/request-replay';

export const BULK_ID = 'e76f554a-bc1e-454d-b3a1-22f3f0300aa1';
export const ITEM_ID = 'e76f554a-bc1e-454d-b3a1-22f3f0300aa2';
export const TYPE_ID = 'e76f554a-bc1e-454d-b3a1-22f3f0300aa3';
export const bulkInput = (): BotBulkInput => ({
  topics: ['AI'],
  typeId: 'builtin-qa',
  perTopic: 2,
  turns: 4,
  delayMinutes: 5,
  groupIds: ['g1'],
});
export const bulkFixture = (patch: Partial<BotBulkBatch> = {}): BotBulkBatch => ({
  id: BULK_ID,
  topics: ['AI'],
  typeName: 'Hỏi đáp',
  typeDescription: '',
  perTopic: 2,
  turns: 4,
  delayMinutes: 5,
  groupIds: ['g1'],
  status: 'running',
  total: 2,
  cursor: 0,
  error: null,
  selectedCount: 0,
  savedCount: 0,
  createdAt: '2026-10-28T12:00:00.000Z',
  updatedAt: '2026-10-28T12:00:00.000Z',
  ...patch,
});
export const bulkItem = (patch: Partial<BotBulkItem> = {}): BotBulkItem => ({
  id: ITEM_ID,
  ordinal: 0,
  topic: 'AI',
  selected: true,
  savedScriptId: null,
  lines: [
    { personaId: 'p1', body: 'Hỏi về AI' },
    { personaId: 'p2', body: 'Kinh nghiệm AI' },
  ],
  ...patch,
});
export const typeFixture = () => ({
  id: TYPE_ID,
  name: 'Kết nối',
  description: 'Trao đổi',
  custom: true,
});
export const typesPage = () => ({
  builtins: [...BUILTIN_BOT_CONVERSATION_TYPES],
  items: [],
  nextCursor: null,
});
