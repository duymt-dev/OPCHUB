import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { ToastProvider } from '@opchub/ui';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import settings from '../../../../messages/vi/settings.json';
import * as api from '../api';
import { AuditLogTab } from './audit-log-tab';

const run = vi.hoisted(() => vi.fn());
vi.mock('@/lib/use-export-job', () => ({ useExportJob: () => run }));
vi.mock('../api', async (original) => ({
  ...(await original<typeof api>()),
  fetchAuditLog: vi.fn(),
  exportAuditLog: vi.fn(),
}));
const row = (id: string) => ({
  id,
  actorName: 'Admin fixture',
  actorAvatarUrl: null,
  summary: `Action ${id}`,
  tag: 'settings' as const,
  at: new Date().toISOString(),
});
const clients: QueryClient[] = [];
function mount() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  clients.push(client);
  return render(
    <NextIntlClientProvider locale="vi" timeZone="Asia/Ho_Chi_Minh" messages={{ settings }}>
      <QueryClientProvider client={client}>
        <ToastProvider>
          <AuditLogTab />
        </ToastProvider>
      </QueryClientProvider>
    </NextIntlClientProvider>,
  );
}
beforeEach(() => {
  vi.mocked(api.fetchAuditLog)
    .mockReset()
    .mockResolvedValue({ items: [row('1')], nextCursor: null });
  run.mockReset().mockResolvedValue({ kind: 'done', rows: 2, url: 'https://example.invalid/file' });
});
afterEach(() => {
  cleanup();
  clients.splice(0).forEach((c) => c.clear());
});
describe('REQ-624 AuditLogTab', () => {
  it('shows90-day copy, export under heading and more appends without dropping page1', async () => {
    vi.mocked(api.fetchAuditLog)
      .mockResolvedValueOnce({ items: [row('1')], nextCursor: 'next' })
      .mockResolvedValueOnce({ items: [row('2')], nextCursor: null });
    mount();
    await screen.findByText('Action 1');
    expect(screen.getByText(settings.log.headingSub)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Xem thêm' }));
    await screen.findByText('Action 2');
    expect(screen.getByText('Action 1')).toBeTruthy();
    expect(api.fetchAuditLog).toHaveBeenLastCalledWith('next');
  });
  it('starts actual export-job hook with exact filename', async () => {
    vi.mocked(api.exportAuditLog).mockResolvedValue({ jobId: 'job', status: 'queued' });
    mount();
    await screen.findByText('Action 1');
    fireEvent.click(screen.getByRole('button', { name: 'Xuất CSV' }));
    await waitFor(() => expect(run).toHaveBeenCalledWith('job', 'nhat-ky-hoat-dong.csv'));
  });
  it('error offers retry; empty list is explicit', async () => {
    vi.mocked(api.fetchAuditLog)
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce({ items: [], nextCursor: null });
    mount();
    await screen.findByRole('alert');
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    await screen.findByText('Chưa có hoạt động nào');
  });
});
