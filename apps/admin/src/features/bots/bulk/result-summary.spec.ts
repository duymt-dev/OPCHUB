import { bulkItem } from '../tests/bulk-fixture';
import { summarizeBulkResults } from './result-summary';

it('D-112 result counters reflect actual normalized lines across loaded pages', () => {
  const items = [
    bulkItem(),
    bulkItem({
      lines: [
        { personaId: 'p3', body: ' HỎI về AI!!! ' },
        { personaId: 'p1', body: 'Một câu khác' },
      ],
    }),
  ];
  expect(summarizeBulkResults(items)).toEqual({ total: 4, unique: 3, duplicates: 1 });
});

it('D-112 result counters do not fabricate unseen pages or treat different accents as equal', () => {
  expect(summarizeBulkResults([])).toEqual({ total: 0, unique: 0, duplicates: 0 });
  expect(
    summarizeBulkResults([
      bulkItem({
        lines: [
          { personaId: 'p1', body: 'Thuế' },
          { personaId: 'p1', body: 'Thue' },
        ],
      }),
    ]),
  ).toEqual({ total: 2, unique: 2, duplicates: 0 });
});
