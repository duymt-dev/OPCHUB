import { describe, expect, it } from 'vitest';
import { defaultStoreSeo, storePublicPatchSchema, storePublicSlugSchema } from './store-public';

describe('BR-494 public configuration', () => {
  it('seo fields: strict nonempty patch and length limits', () => {
    for (const value of [
      {},
      { ownerId: 'x' },
      { title: 'a'.repeat(71) },
      { desc: 'a'.repeat(161) },
    ])
      expect(storePublicPatchSchema.safeParse(value).success).toBe(false);
    expect(storePublicPatchSchema.parse({ title: '  ', desc: '', seoIndex: false })).toEqual({
      title: '',
      desc: '',
      seoIndex: false,
    });
  });
  it('uses defaults, omitting empty title segments', () => {
    expect(defaultStoreSeo({ name: 'A', field: '', province: '', slogan: '', intro: 'B' })).toEqual(
      { defaultTitle: 'A', defaultDesc: 'B' },
    );
    expect(
      defaultStoreSeo({ name: 'A', field: 'Cà phê', province: 'Đà Nẵng', slogan: 'C', intro: 'B' })
        .defaultTitle,
    ).toBe('A – Cà phê tại Đà Nẵng');
  });
  it.each(['../a', 'A', 'a--b', '-a', 'a-', '', 'a'.repeat(65)])('rejects malformed slug %s', (s) =>
    expect(storePublicSlugSchema.safeParse(s).success).toBe(false),
  );
});
