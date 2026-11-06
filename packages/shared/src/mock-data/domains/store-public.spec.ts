import { beforeEach, describe, expect, it } from 'vitest';
import { storePublicPageSchema } from '../../api-domains/store-public';
import { resetMockDb } from './store';
import { mockStores } from './stores';
import { MOCK_NOW } from './util';
import {
  mockStorePublicPage,
  myMockStorePublic,
  patchMockStorePublic,
  mockStorePublicCookie,
} from './store-public';

beforeEach(() => resetMockDb());
describe('REQ-627 BR-494 public mock', () => {
  it('public dto: whitelist, no private fields and no view count changes', () => {
    const row = mockStores()[0];
    if (!row?.slug) throw new Error('Missing fixture');
    const views = row.views;
    const result = mockStorePublicPage(row.slug, undefined, undefined, MOCK_NOW);
    if (!result.ok) throw new Error('Expected published fixture');
    expect(Object.keys(result.data).sort()).toEqual(
      Object.keys(storePublicPageSchema.shape).sort(),
    );
    expect(result.data).not.toHaveProperty('docs');
    expect(result.data).not.toHaveProperty('ownerName');
    expect(row.views).toBe(views);
  });
  it('TC-494 cookie SSR config is request-local and noindex does not block guests', () => {
    const result = myMockStorePublic('m1', 'https://opchub.community');
    if (!result.ok) throw new Error('Missing own store');
    const cookie = mockStorePublicCookie(undefined, result.data.slug, {
      seoIndex: false,
      title: 'Custom',
    });
    const raw = cookie.split(';')[0]?.split('=').slice(1).join('=');
    const page = mockStorePublicPage(result.data.slug, raw, undefined, MOCK_NOW);
    expect(page).toMatchObject({ ok: true, data: { seo: { index: false, title: 'Custom' } } });
    expect(mockStorePublicPage(result.data.slug, undefined, undefined, MOCK_NOW)).toMatchObject({
      ok: true,
      data: { seo: { index: true } },
    });
  });
  it('visibility, stable slug and access follow the owner/store rules', () => {
    const row = mockStores()[0];
    if (!row?.slug) throw new Error('Missing fixture');
    const slug = row.slug;
    row.name = 'Changed name';
    expect(myMockStorePublic('m1', 'https://example.test')).toMatchObject({
      ok: true,
      data: { slug },
    });
    expect(myMockStorePublic('m2', 'https://example.test')).toMatchObject({
      ok: false,
      status: 403,
    });
    row.status = 'hidden';
    expect(mockStorePublicPage(slug, undefined, undefined, MOCK_NOW)).toMatchObject({
      ok: false,
      status: 404,
    });
    expect(patchMockStorePublic('m1', 'https://example.test', { seoIndex: false })).toMatchObject({
      ok: false,
      status: 409,
    });
  });
});
