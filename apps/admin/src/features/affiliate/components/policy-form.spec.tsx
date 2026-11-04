import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { affiliatePolicySchema } from '@opchub/shared/api-domains';
import { useGrants } from '@/lib/permissions';
import * as api from '../api';
import { affiliateTestContext, setupAffiliateBrowser } from '../tests/context';
import { PolicyForm } from './policy-form';
vi.mock('@/lib/permissions', () => ({ useGrants: vi.fn() }));
vi.mock('@/lib/use-prices', () => ({
  usePrices: () => ({ per: { y: 1200000 }, biz: { y: 3600000 }, fund: { p: 15000000 } }),
}));
vi.mock('../api', async (original) => ({
  ...(await original<typeof api>()),
  saveAffiliatePolicy: vi.fn(),
}));
beforeAll(setupAffiliateBrowser);
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useGrants).mockReturnValue({
    keys: ['affiliate.view', 'affiliate.action'],
    roleName: 'Any',
    previewing: false,
  });
  vi.mocked(api.saveAffiliatePolicy).mockImplementation((body) => Promise.resolve(body));
});
afterEach(cleanup);
const value = affiliatePolicySchema.parse({
  defaultRate: 27,
  fundraisingRate: 12,
  cookieDays: 30,
  terms: 'Terms',
  renewalRate: 15,
  renewalMaxYear: 4,
});
const submit = () => fireEvent.submit(screen.getByRole('form', { name: 'Chính sách' }));
describe('REQ-619 D-132 policy form', () => {
  it('keeps hidden rates and renewal policy, renders configured plan amounts', async () => {
    render(<PolicyForm value={value} />, affiliateTestContext());
    expect(screen.queryByRole('spinbutton', { name: 'Tỷ lệ hoa hồng mặc định (%)' })).toBeNull();
    expect(screen.queryByRole('group', { name: 'Hoa hồng Gói Gọi vốn (%)' })).toBeNull();
    expect(screen.getAllByRole('spinbutton')).toHaveLength(4);
    expect(screen.getByRole('table', { name: 'Phần GĐ Vùng theo từng gói' }).textContent).toContain(
      '600.000đ',
    );
    fireEvent.change(screen.getByLabelText('GĐ Vùng năm 1'), { target: { value: '60' } });
    submit();
    await waitFor(() =>
      expect(api.saveAffiliatePolicy).toHaveBeenCalledWith({ ...value, regionalFirstYear: 60 }),
    );
  });
  it('D-91 editable terms stay in the saved policy', async () => {
    render(<PolicyForm value={value} />, affiliateTestContext());
    fireEvent.click(screen.getByRole('button', { name: 'Sửa điều khoản' }));
    const terms = await screen.findByRole('textbox', { name: 'Điều khoản chương trình' });
    fireEvent.change(terms, { target: { value: 'Updated' } });
    fireEvent.click(screen.getByRole('button', { name: 'Xong' }));
    submit();
    await waitFor(() =>
      expect(api.saveAffiliatePolicy).toHaveBeenCalledWith({ ...value, terms: 'Updated' }),
    );
  });
  it('invalid floor and empty policy values block saving and preview gracefully', async () => {
    render(<PolicyForm value={value} />, affiliateTestContext());
    fireEvent.change(screen.getByLabelText('GĐ Vùng năm 1'), { target: { value: '10' } });
    submit();
    await waitFor(() =>
      expect(screen.getByText('Mức tối thiểu không được vượt năm đầu')).toBeDefined(),
    );
    expect(api.saveAffiliatePolicy).not.toHaveBeenCalled();
    expect(screen.getByRole('table', { name: 'Năm của khách' }).textContent).toContain('—');
  });
  it('view-only cannot submit even through form events', async () => {
    vi.mocked(useGrants).mockReturnValue({
      keys: ['affiliate.view'],
      roleName: 'Any',
      previewing: false,
    });
    render(<PolicyForm value={value} />, affiliateTestContext());
    submit();
    await waitFor(() => expect(screen.getByRole('status')).toBeDefined());
    expect(api.saveAffiliatePolicy).not.toHaveBeenCalled();
  });
  it('failed save retains draft for retry without resetting hidden values', async () => {
    vi.mocked(api.saveAffiliatePolicy).mockRejectedValueOnce(new Error('Failed'));
    render(<PolicyForm value={value} />, affiliateTestContext());
    fireEvent.change(screen.getByLabelText('Thời gian ghi nhận link (ngày)'), {
      target: { value: '45' },
    });
    submit();
    await waitFor(() => expect(api.saveAffiliatePolicy).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Lưu chính sách' }).hasAttribute('disabled')).toBe(
        false,
      ),
    );
    submit();
    await waitFor(() => expect(api.saveAffiliatePolicy).toHaveBeenCalledTimes(2));
    expect(vi.mocked(api.saveAffiliatePolicy).mock.calls[1]).toEqual(
      vi.mocked(api.saveAffiliatePolicy).mock.calls[0],
    );
  });
});
