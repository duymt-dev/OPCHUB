import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AffiliatePolicy } from '@opchub/shared/api-domains';
import { ApiError } from '@/lib/api-client';
import { useGrants } from '@/lib/permissions';
import * as api from '../api';
import { affiliateTestContext, setupAffiliateBrowser } from '../tests/context';
import { PolicyForm } from './policy-form';

vi.mock('@/lib/permissions', () => ({ useGrants: vi.fn() }));
// D-94 5A: giá gói từ Cấu hình bảng giá (`GET /public/price-config`) — giá mặc định §27.2
vi.mock('@/lib/use-prices', async () => {
  const { PRICE_DEFAULTS } = await import('@opchub/shared/fixtures');
  return { usePricesQuery: () => ({ data: PRICE_DEFAULTS, isError: false }) };
});
vi.mock('../api', async (original) => ({
  ...(await original<typeof api>()),
  saveAffiliatePolicy: vi.fn(),
}));
beforeAll(setupAffiliateBrowser);
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useGrants).mockReturnValue({
    keys: ['affiliate.view', 'affiliate.action'],
    roleName: 'Any name',
    previewing: false,
  });
  vi.mocked(api.saveAffiliatePolicy).mockImplementation((body) => Promise.resolve(body));
});
afterEach(cleanup);

const value: AffiliatePolicy = {
  defaultRate: 20,
  yearOneRate: 50,
  annualDecrease: 10,
  minimumRate: 20,
  cookieDays: 30,
  fundraisingRate: 10,
  terms: 'Điều khoản từ API',
};
const form = () => screen.getByRole('form', { name: /^Chính sách$/ });
const rate = () => screen.getByRole<HTMLInputElement>('spinbutton', { name: /^GĐ Vùng năm 1$/ });
const days = () =>
  screen.getByRole<HTMLInputElement>('spinbutton', { name: /^Thời gian ghi nhận link \(ngày\)$/ });
// D-91 (2): ô điều khoản nằm trong hộp thoại "Sửa điều khoản" nhưng vẫn thuộc form (forceRender)
const terms = () =>
  screen.getByRole<HTMLTextAreaElement>('textbox', {
    name: /^Điều khoản chương trình$/,
    hidden: true,
  });
const openTerms = () => fireEvent.click(screen.getByRole('button', { name: 'Sửa điều khoản' }));

describe('REQ-617 REQ-312 D-91 policy form sharing rules and editable API terms', () => {
  it('renders supplied values and the complete static rules separately from editable terms', () => {
    render(<PolicyForm value={value} />, affiliateTestContext());
    expect(rate().value).toBe('50');
    expect(days().value).toBe('30');
    expect(terms().value).toBe(value.terms);
    expect(screen.getByText(/^Quy tắc: Media Soft chỉ chia sẻ/).textContent).toContain(
      'tham khảo và đối soát',
    );
    expect(terms().maxLength).toBe(5000);
    expect(
      screen.getByText(/^Quy tắc: Media Soft chỉ chia sẻ/).compareDocumentPosition(terms()) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('D-91 điều khoản mở bằng nút "Sửa điều khoản" thành hộp thoại; bản nháp lưu cùng chính sách', async () => {
    render(<PolicyForm value={value} />, affiliateTestContext());
    // Dựng sẵn (forceRender) nhưng ẩn: không có hộp thoại nào truy cập được trước khi bấm nút
    expect(screen.queryByRole('dialog')).toBeNull();
    openTerms();
    const dialog = await screen.findByRole('dialog', { name: 'Điều khoản chương trình' });
    expect(dialog.contains(terms())).toBe(true);
    fireEvent.change(terms(), { target: { value: 'Bản nháp trong hộp thoại' } });
    // Đóng hộp thoại (antd jsdom giữ DOM khi đóng) — kiểm ở e2e affiliate-policy-responsive
    fireEvent.click(screen.getByRole('button', { name: 'Xong' }));
    fireEvent.submit(form());
    await waitFor(() => expect(api.saveAffiliatePolicy).toHaveBeenCalledTimes(1));
    expect(api.saveAffiliatePolicy).toHaveBeenCalledWith({
      ...value,
      terms: 'Bản nháp trong hộp thoại',
    });
  });

  it('submits the validated fields (fundraising rate carried unchanged) without a monetary example', async () => {
    render(<PolicyForm value={value} />, affiliateTestContext());
    fireEvent.change(rate(), { target: { value: '27' } });
    fireEvent.change(days(), { target: { value: '45' } });
    fireEvent.change(terms(), { target: { value: 'Điều khoản đã sửa' } });
    fireEvent.submit(form());
    await waitFor(() => expect(api.saveAffiliatePolicy).toHaveBeenCalledTimes(1));
    expect(api.saveAffiliatePolicy).toHaveBeenCalledWith({
      defaultRate: 20,
      yearOneRate: 27,
      annualDecrease: 10,
      minimumRate: 20,
      cookieDays: 45,
      fundraisingRate: 10,
      terms: 'Điều khoản đã sửa',
    });
  });

  it('D-119 renders sharing matrices for all plans and preserves legacy values without old payout controls', () => {
    render(<PolicyForm value={value} />, affiliateTestContext());
    expect(
      screen.getByRole('region', { name: 'Phần GĐ Vùng theo từng gói' }).textContent,
    ).toContain('7.500.000đ');
    expect(
      screen.getByRole('region', { name: 'Tỷ lệ chia sẻ theo năm của khách' }).textContent,
    ).toContain('80 / 20');
    expect(screen.queryAllByRole('spinbutton')).toHaveLength(4);
    expect(screen.queryByRole('spinbutton', { name: 'Tỷ lệ hoa hồng mặc định (%)' })).toBeNull();
    expect(screen.queryByText(/cuối tháng Admin chi trả riêng từng đại lý/)).toBeNull();
  });

  it.each([
    ['rate', { ...value, yearOneRate: 101 }],
    ['days', { ...value, cookieDays: 366 }],
    ['terms', { ...value, terms: 'x'.repeat(5001) }],
  ] as const)('rejects invalid %s without sending a mutation', async (key, invalid) => {
    render(<PolicyForm value={invalid} />, affiliateTestContext());
    fireEvent.submit(form());
    const field = key === 'rate' ? rate() : key === 'days' ? days() : terms();
    await waitFor(() => expect(field.getAttribute('aria-invalid')).toBe('true'));
    const helpId = field
      .getAttribute('aria-describedby')
      ?.split(' ')
      .find((id) => id.endsWith('_help'));
    expect(helpId).toBeTruthy();
    await waitFor(() =>
      expect(document.getElementById(helpId ?? '')?.textContent).toContain(
        key === 'rate' ? '100' : key === 'days' ? '365' : '5000',
      ),
    );
    expect(api.saveAffiliatePolicy).not.toHaveBeenCalled();
  });

  it('retains the draft after an API failure and retries the same policy', async () => {
    vi.mocked(api.saveAffiliatePolicy).mockRejectedValueOnce(
      new ApiError('CONFLICT', 409, 'Policy conflict'),
    );
    render(<PolicyForm value={value} />, affiliateTestContext());
    fireEvent.change(terms(), { target: { value: 'Draft after conflict' } });
    fireEvent.submit(form());
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('Policy conflict'));
    expect(terms().value).toBe('Draft after conflict');
    fireEvent.submit(form());
    await waitFor(() => expect(api.saveAffiliatePolicy).toHaveBeenCalledTimes(2));
    expect(api.saveAffiliatePolicy).toHaveBeenLastCalledWith({
      ...value,
      terms: 'Draft after conflict',
    });
  });

  it('rechecks a revoked action permission at submit without calling the API', async () => {
    const view = render(<PolicyForm value={value} />, affiliateTestContext());
    vi.mocked(useGrants).mockReturnValue({
      keys: ['affiliate.view'],
      roleName: 'Viewer',
      previewing: false,
    });
    view.rerender(<PolicyForm value={value} />);
    fireEvent.submit(form());
    await waitFor(() =>
      expect(screen.getByRole('status').textContent).toContain('chỉ có quyền xem'),
    );
    expect(api.saveAffiliatePolicy).not.toHaveBeenCalled();
  });

  it.each(['yearOneRate', 'cookieDays', 'terms'] as const)(
    'REQ-312 maps server 400 %s errors to the field and retains the retry draft',
    async (key) => {
      const message = `Server rejected ${key}`;
      vi.mocked(api.saveAffiliatePolicy).mockRejectedValueOnce(
        new ApiError('VALIDATION_ERROR', 400, 'Policy validation failed', [
          { path: key, message },
          { path: key, message: 'Duplicate message must not replace the first' },
          { path: 'unknownField', message: 'Unrelated field must not appear' },
        ]),
      );
      render(<PolicyForm value={value} />, affiliateTestContext());
      fireEvent.change(rate(), { target: { value: '27' } });
      fireEvent.change(days(), { target: { value: '45' } });
      fireEvent.change(terms(), { target: { value: 'Draft after validation failure' } });
      fireEvent.submit(form());
      const field = key === 'yearOneRate' ? rate() : key === 'cookieDays' ? days() : terms();
      await waitFor(() => expect(field.getAttribute('aria-invalid')).toBe('true'));
      await waitFor(() => {
        const ids = field.getAttribute('aria-describedby')?.split(' ') ?? [];
        expect(ids.some((id) => document.getElementById(id)?.textContent === message)).toBe(true);
      });
      expect(screen.queryByText(/Duplicate message must not replace/)).toBeNull();
      expect(screen.queryByText(/Unrelated field must not appear/)).toBeNull();
      expect(screen.getAllByRole('status')).toHaveLength(1);
      expect(rate().value).toBe('27');
      expect(days().value).toBe('45');
      expect(terms().value).toBe('Draft after validation failure');
      fireEvent.submit(form());
      await waitFor(() => expect(api.saveAffiliatePolicy).toHaveBeenCalledTimes(2));
      expect(api.saveAffiliatePolicy).toHaveBeenLastCalledWith({
        defaultRate: 20,
        yearOneRate: 27,
        annualDecrease: 10,
        minimumRate: 20,
        cookieDays: 45,
        fundraisingRate: 10,
        terms: 'Draft after validation failure',
      });
      await waitFor(() => expect(field.getAttribute('aria-invalid')).not.toBe('true'));
    },
  );

  it('disables editing while saving and unlocks only after the response', async () => {
    let resolve: ((result: AffiliatePolicy) => void) | undefined;
    const pending = new Promise<AffiliatePolicy>((done) => {
      resolve = done;
    });
    vi.mocked(api.saveAffiliatePolicy).mockReturnValue(pending);
    render(<PolicyForm value={value} />, affiliateTestContext());
    fireEvent.submit(form());
    await waitFor(() => expect(rate().disabled).toBe(true));
    expect(days().disabled).toBe(true);
    expect(terms().disabled).toBe(true);
    await act(async () => {
      resolve?.(value);
      await pending;
    });
    await waitFor(() => expect(rate().disabled).toBe(false));
    expect(terms().value).toBe(value.terms);
  });
});
