import { bulkFieldName, initialBulkValues, parseBulkForm } from './form-model';

it('D-112 bulk form preserves defaults but requires topics and groups', () => {
  expect(parseBulkForm(initialBulkValues).success).toBe(false);
  expect(
    parseBulkForm({ ...initialBulkValues, topicsText: ' AI\r\nai\n\nB ', groupIds: ['g1', 'g1'] }),
  ).toEqual({
    success: true,
    data: {
      topics: ['AI', 'B'],
      typeId: 'builtin-qa',
      perTopic: 2,
      turns: 4,
      delayMinutes: 5,
      groupIds: ['g1'],
    },
  });
});
it('D-112 rejects bounds without truncating topics, groups or numbers', () => {
  const valid = { ...initialBulkValues, topicsText: 'AI', groupIds: ['g1'] };
  for (const patch of [
    { topicsText: Array.from({ length: 101 }, (_, i) => `Topic${i}`).join('\n') },
    { topicsText: 'x'.repeat(201) },
    { perTopic: 6 },
    { turns: 1 },
    { turns: 2.5 },
    { delayMinutes: 0 },
    { delayMinutes: 61 },
    { groupIds: Array.from({ length: 101 }, (_, i) => `g${i}`) },
  ])
    expect(parseBulkForm({ ...valid, ...patch }).success).toBe(false);
});
it('D-112 maps nested transport errors to actual form fields', () => {
  expect(bulkFieldName('topics.0')).toBe('topicsText');
  expect(bulkFieldName('groupIds[1]')).toBe('groupIds');
  expect(bulkFieldName('perTopic')).toBe('perTopic');
});
