import { NEED_DESC_MIN, needCreateSchema } from '@opchub/shared/api-domains';
import { describe, expect, it } from 'vitest';
import { needQuery } from './api';
import {
  budgetText,
  draftIssue,
  dueText,
  emptyDraft,
  locationOf,
  type NeedDraft,
  storeInitials,
  suggestionHref,
  telLink,
  toCreate,
  toggleIn,
  zaloLink,
} from './model';

const ok: NeedDraft = {
  ...emptyDraft({ province: 'Đắk Lắk', contactName: 'An', email: '' }),
  title: 'Cần 50 kg cà phê Robusta rang mộc mỗi tháng',
  field: 'Chế biến thực phẩm',
  description: 'Ưu tiên xưởng rang có truy xuất nguồn gốc, giao hằng tháng.',
  phone: '0912345678',
};

describe('needs model (V4-609)', () => {
  it('kiểm form đúng thứ tự prototype — lỗi đầu tiên', () => {
    expect(draftIssue({ ...ok, title: ' ', field: '' }, NEED_DESC_MIN)).toBe('title');
    expect(draftIssue({ ...ok, field: '' }, NEED_DESC_MIN)).toBe('field');
    expect(draftIssue({ ...ok, field: 'Khác', fieldCustom: ' ' }, NEED_DESC_MIN)).toBe(
      'fieldCustom',
    );
    expect(draftIssue({ ...ok, description: 'ngắn' }, NEED_DESC_MIN)).toBe('desc');
    expect(draftIssue({ ...ok, phone: '', email: '' }, NEED_DESC_MIN)).toBe('contact');
    expect(
      draftIssue({ ...ok, budgetMin: '3.000.000', budgetMax: '1.000.000' }, NEED_DESC_MIN),
    ).toBe('budget');
    // "Thỏa thuận" bỏ qua ngân sách
    expect(
      draftIssue({ ...ok, budgetMin: '3', budgetMax: '1', negotiable: true }, NEED_DESC_MIN),
    ).toBeNull();
    expect(draftIssue(ok, NEED_DESC_MIN)).toBeNull();
  });

  it('bản nháp → body hợp lệ với needCreateSchema; quy mô ghép số + đơn vị', () => {
    const body = toCreate({
      ...ok,
      qty: '50',
      unit: 'kg / tháng',
      budgetMin: '1.000.000',
      budgetMax: '3.000.000',
      dueDate: '2026-12-01',
      cooperation: ['Mua đứt'],
      standards: ['VietGAP'],
    });
    expect(body).toMatchObject({
      quantity: '50 kg / tháng',
      budgetMin: 1_000_000,
      budgetMax: 3_000_000,
      dueDate: '2026-12-01',
      fieldCustom: '',
    });
    expect(needCreateSchema.safeParse(body).success).toBe(true);
    const neg = toCreate({
      ...ok,
      budgetMin: '5',
      negotiable: true,
      field: 'Khác',
      fieldCustom: 'Bao bì sinh học',
    });
    expect(neg).toMatchObject({ budgetMin: null, budgetMax: null, fieldCustom: 'Bao bì sinh học' });
    expect(toCreate(ok).dueDate).toBeNull();
  });

  it('hiển thị: hạn, khu vực, ngân sách, gợi ý → link Khám phá gian hàng', () => {
    const labels = { due: 'Hạn', none: 'Không thời hạn' };
    expect(dueText({ dueAt: null }, labels)).toBe('Không thời hạn');
    // 00:00 giờ VN = 17:00 UTC hôm trước
    expect(dueText({ dueAt: '2026-11-30T17:00:00.000Z' }, labels)).toBe('Hạn 01/12/2026');
    expect(locationOf({ ward: '', province: 'Hà Nội' })).toBe('Hà Nội');
    expect(locationOf({ ward: 'Phường Hoàn Kiếm', province: 'Hà Nội' })).toBe(
      'Phường Hoàn Kiếm, Hà Nội',
    );
    expect(budgetText({ budgetMin: null, budgetMax: null })).toBeNull();
    expect(budgetText({ budgetMin: 1_000_000, budgetMax: 3_000_000 })).toBe(
      '1.000.000 – 3.000.000 đ',
    );
    const base = { field: 'Nông sản', province: 'Lâm Đồng' };
    expect(suggestionHref({ ...base, suggestion: { count: 2, sameProvince: true } })).toBe(
      `/stores?field=${encodeURIComponent('Nông sản').replace(/%20/g, '+')}&province=${encodeURIComponent('Lâm Đồng').replace(/%20/g, '+')}`,
    );
    expect(
      suggestionHref({ ...base, suggestion: { count: 2, sameProvince: false } }),
    ).not.toContain('province');
  });

  it('liên hệ + tiện ích', () => {
    expect(zaloLink('+84 912 345 678')).toBe('https://zalo.me/0912345678');
    expect(zaloLink('123')).toBeNull();
    expect(telLink('0912 345 678')).toBe('tel:0912345678');
    expect(storeInitials('Mộc Coffee')).toBe('MC');
    expect(toggleIn(['a'], 'b')).toEqual(['a', 'b']);
    expect(toggleIn(['a', 'b'], 'a')).toEqual(['b']);
  });

  it('bộ lọc → query string (bỏ khoá rỗng)', () => {
    expect(needQuery({ q: '  ', page: 1 })).toBe('page=1');
    const qs = new URLSearchParams(
      needQuery({ q: 'cà phê', page: 2, type: 'buy', province: 'Đắk Lắk', field: 'Nông sản' }),
    );
    expect(Object.fromEntries(qs)).toEqual({
      page: '2',
      q: 'cà phê',
      type: 'buy',
      province: 'Đắk Lắk',
      field: 'Nông sản',
    });
  });
});
