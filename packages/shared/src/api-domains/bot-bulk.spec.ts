import { describe, expect, it } from 'vitest';
import {
  botBulkCreateSchema,
  botBulkItemsQuerySchema,
  botBulkSelectionSchema,
  botBulkTopics,
} from './bot-bulk';

const input = {
  requestId: '019a1b25-0000-7000-8000-000000000001',
  topics: ['Chủ đề'],
  groupIds: ['g1'],
};
describe('D-112 bulk input contract', () => {
  it('deduplicates newline topics without changing first spelling or inventing a title', () => {
    expect(botBulkTopics(' Thuế \r\n\nTHUẾ\n Kế toán\nthuế ')).toEqual(['Thuế', 'Kế toán']);
    expect(
      botBulkCreateSchema.parse({ ...input, topics: [' A ', '', 'a'], groupIds: ['g1', ' g1 '] }),
    ).toEqual({
      ...input,
      topics: ['A'],
      typeId: 'builtin-qa',
      perTopic: 2,
      turns: 4,
      delayMinutes: 5,
    });
  });
  it('accepts both edges of the prototype ranges and the maximum explicit batch', () => {
    expect(
      botBulkCreateSchema.parse({ ...input, perTopic: 1, turns: 2, delayMinutes: 1 }).turns,
    ).toBe(2);
    const result = botBulkCreateSchema.parse({
      ...input,
      topics: Array.from({ length: 100 }, (_, i) => `Topic ${i}`),
      perTopic: 5,
      turns: 8,
      delayMinutes: 60,
    });
    expect(result.topics.length * result.perTopic).toBe(500);
  });
  it.each([
    { topics: [] },
    { topics: [' ', ''] },
    { topics: ['x'.repeat(201)] },
    { topics: Array.from({ length: 101 }, (_, i) => `t${i}`) },
    { groupIds: [] },
    { groupIds: [''] },
    { requestId: 'invalid' },
    { perTopic: 0 },
    { perTopic: 6 },
    { perTopic: 1.5 },
    { turns: 1 },
    { turns: 9 },
    { delayMinutes: 0 },
    { delayMinutes: 61 },
    { fake: true },
  ])('rejects invalid/unbounded input %j without truncating it', (patch) => {
    expect(botBulkCreateSchema.safeParse({ ...input, ...patch }).success).toBe(false);
  });
  it('bounds result pagination and validates explicit persisted selection', () => {
    expect(botBulkItemsQuerySchema.parse({})).toEqual({ after: -1, limit: 20 });
    expect(botBulkItemsQuerySchema.parse({ after: '20', limit: '50' })).toEqual({
      after: 20,
      limit: 50,
    });
    expect(botBulkItemsQuerySchema.safeParse({ limit: 51 }).success).toBe(false);
    expect(
      botBulkSelectionSchema.parse({ itemIds: [input.requestId, input.requestId], selected: false })
        .itemIds,
    ).toEqual([input.requestId]);
    expect(botBulkSelectionSchema.safeParse({ itemIds: [], selected: true }).success).toBe(false);
  });
});
