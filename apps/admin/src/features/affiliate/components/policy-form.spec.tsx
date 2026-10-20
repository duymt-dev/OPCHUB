import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AffiliatePolicy } from '@opchub/shared/api-domains';
import { ApiError } from '@/lib/api-client';
import { useGrants } from '@/lib/permissions';
import * as api from '../api';
import { affiliateTestContext, setupAffiliateBrowser } from '../tests/context';
import { PolicyForm } from './policy-form';

vi.mock('@/lib/permissions', () => ({ useGrants: vi.fn() }));
vi.mock('../api', async (original) => ({
  ...(await original<typeof api>()),
  saveAffiliatePolicy: vi.fn(),
  fetchAffiliatePolicyPreview: vi.fn(),
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
  vi.mocked(api.fetchAffiliatePolicyPreview).mockImplementation((rate) =>
    Promise.resolve({ rate, feeAmount: 600000, commission: rate === 27 ? 162000 : 120000 }),
  );
});
afterEach(cleanup);

const value: AffiliatePolicy = { defaultRate: 20, cookieDays: 30, terms: 'Điều khoản từ API' };
const form = () => screen.getByRole('form', { name: /^Chính sách$/ });
const rate = () =>
  screen.getByRole<HTMLInputElement>('spinbutton', { name: /^Tỷ lệ hoa hồng mặc định \(%\)$/ });
const days = () =>
  screen.getByRole<HTMLInputElement>('spinbutton', { name: /^Thời gian ghi nhận link \(ngày\)$/ });
const terms = () =>
  screen.getByRole<HTMLTextAreaElement>('textbox', { name: /^Điều khoản chương trình$/ });

describe('REQ-308 REQ-312 policy form preserves ver2 rules and editable API terms', () => {
  it('renders supplied values and the complete static rules separately from editable terms', () => {
    render(<PolicyForm value={value} />, affiliateTestContext());
    expect(rate().value).toBe('20');
    expect(days().value).toBe('30');
    expect(terms().value).toBe(value.terms);
    expect(screen.getByText(/không cần quản trị duyệt/).textContent).toContain(
      'không tạo đại lý thủ công',
    );
    expect(terms().maxLength).toBe(5000);
    expect(
      screen.getByText(/không cần quản trị duyệt/).compareDocumentPosition(terms()) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('submits all three validated fields without constructing a monetary example', async () => {
    render(<PolicyForm value={value} />, affiliateTestContext());
    fireEvent.change(rate(), { target: { value: '27' } });
    fireEvent.change(days(), { target: { value: '45' } });
    fireEvent.change(terms(), { target: { value: 'Điều khoản đã sửa' } });
    fireEvent.submit(form());
    await waitFor(() => expect(api.saveAffiliatePolicy).toHaveBeenCalledTimes(1));
    expect(api.saveAffiliatePolicy).toHaveBeenCalledWith({
      defaultRate: 27,
      cookieDays: 45,
      terms: 'Điều khoản đã sửa',
    });
  });

  it.each([
    ['rate', { ...value, defaultRate: 51 }],
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
        key === 'rate' ? '50' : key === 'days' ? '365' : '5000',
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

  it.each(['defaultRate', 'cookieDays', 'terms'] as const)(
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
      const field = key === 'defaultRate' ? rate() : key === 'cookieDays' ? days() : terms();
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
        defaultRate: 27,
        cookieDays: 45,
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
