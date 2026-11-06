import { describe, expect, it } from 'vitest';
import { needMatchesSchema } from '../api-domains/needs';
import {
  matchKeywords,
  scoreNeedMatch,
  selectNeedMatches,
  type NeedMatchCandidate,
} from './need-match';

const store = {
  field: 'Food',
  province: 'Dak Lak',
  intro: '',
  productNames: ['Robusta organic arabica'],
};
const need: NeedMatchCandidate = {
  id: 'a',
  type: 'buy',
  title: 'Robusta organic arabica',
  description: '',
  field: 'Food',
  fieldCustom: false,
  province: 'Dak Lak',
  updatedAt: '2026-11-01T00:00:00Z',
};
describe('BR-478 rule-based need matches', () => {
  it('all reasons:100 raw score,98 displayed, stable reason order', () => {
    expect(scoreNeedMatch(store, need)).toEqual({
      score: 100,
      pct: 98,
      reasons: ['field', 'province', 'product'],
    });
  });
  it('field and one word57; province alone30; words alone below threshold', () => {
    expect(scoreNeedMatch(store, { ...need, title: 'Robusta', province: '' }).pct).toBe(57);
    expect(scoreNeedMatch(store, { ...need, field: '', title: '' }).pct).toBe(30);
    expect(selectNeedMatches(store, [{ ...need, field: '', province: '' }])).toEqual([]);
  });
  it('custom or empty fields never score50; empty province never scores30', () => {
    expect(
      scoreNeedMatch(store, { ...need, fieldCustom: true, title: '', province: '' }).score,
    ).toBe(0);
    expect(
      scoreNeedMatch(
        { ...store, field: '', province: '' },
        { ...need, field: '', province: '', title: '' },
      ).score,
    ).toBe(0);
  });
  it('unaccent matches rang from Cà phê rang mộc, ignores short words and duplicate words', () => {
    expect(matchKeywords('Cà phê rang mộc mua bán RANG ĐỒNG đồng')).toEqual(['rang', 'dong']);
    expect(
      scoreNeedMatch(
        { ...store, intro: 'Cà phê rang mộc', productNames: ['rang', 'RANG'] },
        { ...need, title: 'cần mua ca phe rang', province: '' },
      ).pct,
    ).toBe(57);
  });
  it('bounds unique keywords at50 and accepts empty/null products', () => {
    expect(matchKeywords(Array.from({ length: 60 }, (_, i) => `word${i}`).join(' '))).toHaveLength(
      50,
    );
    expect(scoreNeedMatch({ ...store, productNames: null }, { ...need, title: '' }).score).toBe(80);
  });
  it('top3 by raw score, then updatedAt, then id; response omits private payload', () => {
    const rows = selectNeedMatches(store, [
      { ...need, id: 'd', title: '', updatedAt: '2026-11-05' },
      { ...need, id: 'c' },
      { ...need, id: 'b' },
      { ...need, id: 'a' },
    ]);
    expect(rows.map((row) => row.id)).toEqual(['a', 'b', 'c']);
    expect(rows[0]).not.toHaveProperty('description');
    expect(needMatchesSchema.parse({ hasStore: true, storeField: 'Food', rows }).rows).toEqual(
      rows,
    );
  });
  it('response contract enforces3 rows, threshold and cap', () => {
    const row = selectNeedMatches(store, [need])[0];
    expect(
      needMatchesSchema.safeParse({ hasStore: true, storeField: null, rows: Array(4).fill(row) })
        .success,
    ).toBe(false);
    expect(
      needMatchesSchema.safeParse({ hasStore: true, storeField: '', rows: [{ ...row, pct: 99 }] })
        .success,
    ).toBe(false);
  });
});
