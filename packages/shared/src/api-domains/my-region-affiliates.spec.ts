import { expect, it } from 'vitest';
import {
  encodeMyRegionAffiliateCursor,
  myRegionAffiliateQuerySchema,
} from './my-region-affiliates';

it('SPEC16 rejects malformed and overflowing aggregate cursors before PostgreSQL bigint binding', () => {
  for (const share of ['9999999999999999999', '99999999999999999999', '-1', 'not-money']) {
    const cursor = encodeMyRegionAffiliateCursor({ share, name: '', id: 'fixture' });
    expect(myRegionAffiliateQuerySchema.safeParse({ cursor }).success).toBe(false);
  }
  const cursor = encodeMyRegionAffiliateCursor({
    share: '9223372036854775807',
    name: 'Hà Nội',
    id: 'fixture',
  });
  expect(myRegionAffiliateQuerySchema.parse({ cursor }).cursor).toEqual({
    share: '9223372036854775807',
    name: 'Hà Nội',
    id: 'fixture',
  });
});
