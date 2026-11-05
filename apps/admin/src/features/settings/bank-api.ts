import {
  bankSettingsSchema,
  bankTxnPageSchema,
  bankKeyRotateResultSchema,
  bankTestResultSchema,
  bankSimulateResultSchema,
  feeExportResponseSchema,
} from '@opchub/shared/api-domains';
import { api } from '@/lib/api-client';
import { z } from 'zod';
export const bankKeys = {
  config: ['admin-settings', 'bank'] as const,
  list: ['admin-bank', 'transactions'] as const,
};
const BASE = '/admin/settings/bank';
export const fetchBank = () => api(BASE, { schema: bankSettingsSchema });
export const patchBank = (autoActivate: boolean) =>
  api(BASE, { method: 'PATCH', body: { autoActivate }, schema: bankSettingsSchema });
export const fetchBankTxns = (cursor?: string) =>
  api(`${BASE}/transactions?limit=20${cursor ? '&cursor=' + encodeURIComponent(cursor) : ''}`, {
    schema: bankTxnPageSchema,
  });
export const rotateBankKey = () =>
  api(`${BASE}/key`, { method: 'POST', schema: bankKeyRotateResultSchema });
export const testBank = () => api(`${BASE}/test`, { method: 'POST', schema: bankTestResultSchema });
export const simulateBank = () =>
  api(`${BASE}/simulate`, { method: 'POST', schema: bankSimulateResultSchema });
export const shortBank = (body: { id: string; note: string }) =>
  api(`${BASE}/transactions/${encodeURIComponent(body.id)}/short`, {
    method: 'POST',
    body: { note: body.note },
    schema: z.null(),
  });
export const exportBank = () =>
  api(`${BASE}/export`, { method: 'POST', schema: feeExportResponseSchema });
