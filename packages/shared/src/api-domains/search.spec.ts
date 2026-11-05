import { describe, expect, it } from 'vitest';
import { globalSearchQuerySchema, globalSearchResultSchema } from './search';

describe('BR-491 global search contract', () => {
  it('trims input, accepts literal wildcard characters and caps at 100', () => {
    expect(globalSearchQuerySchema.parse({ q: '  cà phê  ' })).toEqual({ q: 'cà phê' });
    expect(globalSearchQuerySchema.parse({ q: '%_\\' }).q).toBe('%_\\');
    expect(globalSearchQuerySchema.safeParse({ q: 'a'.repeat(100) }).success).toBe(true);
  });
  it.each(['', ' ', ' a ', 'a'.repeat(101)])('rejects invalid length %s', (q) => {
    expect(globalSearchQuerySchema.safeParse({ q }).success).toBe(false);
  });
  it('rejects unexpected input keys', () => {
    expect(globalSearchQuerySchema.safeParse({ q: 'aa', scope: 'admin' }).success).toBe(false);
  });
  it('caps hits and groups and strips private response fields', () => {
    const hit = { id: 'id', title: 'Title', sub: '', passwordHash: 'secret' };
    const result = globalSearchResultSchema.parse({ groups: [{ kind: 'store', items: [hit] }] });
    expect(result.groups[0]?.items[0]).toEqual({ id: 'id', title: 'Title', sub: '' });
    expect(
      globalSearchResultSchema.safeParse({ groups: [{ kind: 'store', items: Array(5).fill(hit) }] })
        .success,
    ).toBe(false);
    expect(
      globalSearchResultSchema.safeParse({ groups: Array(6).fill({ kind: 'group', items: [] }) })
        .success,
    ).toBe(false);
  });
});
