import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { ToastProvider } from '@opchub/ui';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { messages as sourceMessages } from '@/i18n/messages';
const settings = sourceMessages.settings;
import * as api from '../api';
import { AuditLogTab } from './audit-log-tab';

const run = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', async () => {
  const { useSyncExternalStore } = await import('react');
  return {
    usePathname: () => '/settings',
    useSearchParams: () =>
      new URLSearchParams(
        useSyncExternalStore(
          (notify) => {
            window.addEventListener('audit-url-change', notify);
            return () => window.removeEventListener('audit-url-change', notify);
          },
          () => window.location.search,
        ),
      ),
  };
});
vi.mock('@/lib/use-export-job', () => ({ useExportJob: () => run }));
vi.mock('../api', async (original) => ({
  ...(await original<typeof api>()),
  fetchAuditLog: vi.fn(),
  fetchAuditLogActors: vi.fn().mockResolvedValue([{ id: 'a', name: 'Admin A' }]),
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
  window.history.replaceState(null, '', '/settings?tab=audit-log');
  const replace = window.history.replaceState.bind(window.history);
  vi.spyOn(window.history, 'replaceState').mockImplementation((...args) => {
    replace(...args);
    window.dispatchEvent(new Event('audit-url-change'));
  });
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: () => false,
  }));
  vi.mocked(api.fetchAuditLog)
    .mockReset()
    .mockResolvedValue({ items: [row('1')], nextCursor: null });
  run.mockReset().mockResolvedValue({ kind: 'done', rows: 2, url: 'https://example.invalid/file' });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  clients.splice(0).forEach((c) => c.clear());
});
describe('REQ-624 AuditLogTab', () => {
  it('hydrates shared URL filters without sending Settings or unknown URL keys to the audit API', async () => {
    window.history.replaceState(
      null,
      '',
      '/settings?tab=audit-log&tag=member&actorId=system&scope=all&other=retained',
    );
    mount();
    await screen.findByText('Action 1');
    expect(api.fetchAuditLog).toHaveBeenLastCalledWith(undefined, {
      tag: 'member',
      actorId: 'system',
    });
    expect(new URLSearchParams(window.location.search).get('other')).toBe('retained');
  });
  it('filter changes reset cursor; filtered CSV and clear use the same query state', async () => {
    vi.mocked(api.fetchAuditLog).mockImplementation((cursor, filters) =>
      Promise.resolve({
        items: filters?.tag ? [] : [row(cursor ? '2' : '1')],
        nextCursor: !cursor && !filters?.tag ? 'next' : null,
      }),
    );
    vi.mocked(api.exportAuditLog).mockResolvedValue({ jobId: 'filtered', status: 'queued' });
    mount();
    await screen.findByText('Action 1');
    fireEvent.click(screen.getByRole('button', { name: 'Xem thêm' }));
    await screen.findByText('Action 2');
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Nhóm' }));
    fireEvent.click(await screen.findByText('Thành viên'));
    await screen.findByText('Không có thao tác phù hợp');
    expect(api.fetchAuditLog).toHaveBeenLastCalledWith(undefined, { tag: 'member' });
    expect(new URLSearchParams(window.location.search).get('tag')).toBe('member');
    expect(screen.queryByText('Action 2')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Xuất CSV' }));
    await waitFor(() => expect(api.exportAuditLog).toHaveBeenCalledWith({ tag: 'member' }));
    fireEvent.click(screen.getByRole('button', { name: 'Xóa lọc' }));
    await screen.findByText('Action 1');
    expect(screen.queryByText('Action 2')).toBeNull();
    expect(api.fetchAuditLog).toHaveBeenLastCalledWith(undefined, {});
    expect(window.location.search).toBe('?tab=audit-log');
    expect(screen.queryByText('Không có thao tác phù hợp')).toBeNull();
  });
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
    expect(api.fetchAuditLog).toHaveBeenLastCalledWith('next', {});
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
