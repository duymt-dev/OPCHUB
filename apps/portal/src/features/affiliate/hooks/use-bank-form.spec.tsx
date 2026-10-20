import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import affiliate from '../../../../messages/vi/affiliate.json';
import common from '../../../../messages/vi/common.json';
import { ApiError } from '@/lib/api-client';
import * as api from '../api';
import { useBankForm } from './use-bank-form';

let client: QueryClient;
const bank = { bankName: 'ACB', bankNo: '123456789', bankHolder: 'NGUYEN VAN AN' } as const;
function Wrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={client}>
      <NextIntlClientProvider locale="vi" messages={{ affiliate, common }}>
        {children}
      </NextIntlClientProvider>
    </QueryClientProvider>
  );
}
beforeEach(() => {
  client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
});
afterEach(() => {
  cleanup();
  client.clear();
  vi.restoreAllMocks();
});

describe('Affiliate bank form', () => {
  it('REQ-309 mở từ snapshot, sửa tên/số được chuẩn hóa; hủy không gửi API', () => {
    const save = vi.spyOn(api, 'saveBank');
    const { result } = renderHook(useBankForm, { wrapper: Wrapper });
    act(() => result.current.edit(bank));
    act(() => {
      result.current.set('bankHolder', 'đặng  thu hà');
      result.current.set('bankNo', '12 x34-56');
    });
    expect(result.current.draft).toMatchObject({ bankHolder: 'DANG  THU HA', bankNo: '123456' });
    act(() => result.current.cancel());
    expect(result.current.draft).toBeNull();
    expect(save).not.toHaveBeenCalled();
    expect(bank.bankHolder).toBe('NGUYEN VAN AN');
  });
  it('REQ-309 trống báo tại cả ba ô, không gửi; sửa ô thì xóa đúng lỗi', async () => {
    const save = vi.spyOn(api, 'saveBank');
    const { result } = renderHook(useBankForm, { wrapper: Wrapper });
    act(() => result.current.edit(null));
    await act(() => result.current.save());
    for (const key of ['bankName', 'bankNo', 'bankHolder'] as const)
      expect(result.current.err(key)?.text).toBeTruthy();
    expect(save).not.toHaveBeenCalled();
    act(() => result.current.set('bankNo', '123456'));
    expect(result.current.err('bankNo')).toBeUndefined();
    expect(result.current.err('bankName')).toBeDefined();
  });
  it('REQ-309 lưu thành công invalidate profile, đóng form; trong lúc gửi không hủy được', async () => {
    let finish: (v: typeof bank) => void = () => undefined;
    const save = vi.spyOn(api, 'saveBank').mockImplementation(
      () =>
        new Promise((r) => {
          finish = r;
        }),
    );
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(useBankForm, { wrapper: Wrapper });
    act(() => result.current.edit(bank));
    let pending: Promise<void>;
    act(() => {
      pending = result.current.save();
    });
    await waitFor(() => expect(result.current.busy).toBe(true));
    act(() => result.current.cancel());
    expect(result.current.draft).not.toBeNull();
    await act(async () => {
      finish(bank);
      await pending;
    });
    expect(save).toHaveBeenCalledWith(bank, expect.anything());
    expect(invalidate).toHaveBeenCalledWith({ queryKey: api.affiliateKeys.mine });
    expect(result.current.draft).toBeNull();
  });
  it('REQ-309 lỗi server tại ô giữ bản nháp để sửa, không đóng form', async () => {
    vi.spyOn(api, 'saveBank').mockRejectedValue(
      new ApiError('VALIDATION_ERROR', 400, 'Invalid', [
        { path: 'bankNo', message: 'Số tài khoản không hợp lệ' },
      ]),
    );
    const { result } = renderHook(useBankForm, { wrapper: Wrapper });
    act(() => result.current.edit(bank));
    await act(() => result.current.save());
    expect(result.current.err('bankNo')?.text).toBe('Số tài khoản không hợp lệ');
    expect(result.current.draft).toEqual(bank);
    expect(result.current.busy).toBe(false);
  });
});
