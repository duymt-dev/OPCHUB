import { botBulkCreateSchema, type BotBulkCreate } from '../../../api-domains/bot-bulk';
import { createMockBulk } from './create';
import { mockBulkRecord } from './state';
import { advanceMockBulk } from './worker';

export const BULK_NOW = Date.parse('2026-10-29T01:00:00Z');
export const bulkInput = (patch: Partial<BotBulkCreate> = {}) =>
  botBulkCreateSchema.parse({
    requestId: crypto.randomUUID(),
    topics: ['Thuế', 'Marketing'],
    perTopic: 2,
    turns: 4,
    delayMinutes: 6,
    groupIds: ['c1'],
    ...patch,
  });
export function createBulkFixture(patch: Partial<BotBulkCreate> = {}, actor = 'admin') {
  const input = bulkInput(patch);
  const result = createMockBulk(actor, input, BULK_NOW);
  if (!result.ok) throw new Error(result.message);
  const record = mockBulkRecord(result.data.id);
  if (!record) throw new Error('Missing mock batch');
  return { input, record, id: record.value.id };
}
export function finishBulkFixture(id: string) {
  const record = mockBulkRecord(id);
  if (!record) throw new Error('Missing batch');
  for (let i = 0; i < record.value.total && record.value.status === 'running'; i++)
    advanceMockBulk(BULK_NOW + i);
  if (record.value.status !== 'done') throw new Error('Fixture did not finish');
  return record;
}
