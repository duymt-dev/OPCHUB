import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterAll, beforeAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextIntlClientProvider } from 'next-intl';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from '@opchub/ui';
import { emptyAiProviders } from '@opchub/shared/mock-domains';
import settings from '../../../../../messages/vi/settings.json';
import common from '../../../../../messages/vi/common.json';
import * as api from '../../ai-api';
import { AiTab } from './ai-tab';
vi.mock('../../ai-api', async (original) => ({
  ...(await original<typeof api>()),
  fetchAiSettings: vi.fn(),
  saveAiSettings: vi.fn(),
  verifyAiProvider: vi.fn(),
}));
const mount = () =>
  render(
    <NextIntlClientProvider locale="vi" timeZone="Asia/Ho_Chi_Minh" messages={{ settings, common }}>
      <QueryClientProvider
        client={
          new QueryClient({
            defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
          })
        }
      >
        <ToastProvider>
          <AiTab />
        </ToastProvider>
      </QueryClientProvider>
    </NextIntlClientProvider>,
  );
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.fetchAiSettings).mockResolvedValue(emptyAiProviders());
  vi.mocked(api.saveAiSettings).mockResolvedValue(emptyAiProviders());
  vi.mocked(api.verifyAiProvider).mockResolvedValue({ ok: true, message: 'verified' });
});
afterEach(cleanup);
beforeAll(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {
        return undefined;
      }
      unobserve() {
        return undefined;
      }
      disconnect() {
        return undefined;
      }
    },
  );
});
afterAll(() => vi.unstubAllGlobals());
describe('REQ-628 AI provider UI', () => {
  it('D-138 purpose model stays draft until explicit save', async () => {
    const data = emptyAiProviders();
    data.use.content = 'claude';
    data.providers = data.providers.map((p) =>
      p.id === 'claude' ? { ...p, enabled: true, hasKey: true, model: 'saved-legacy-model' } : p,
    );
    vi.mocked(api.fetchAiSettings).mockResolvedValue(data);
    mount();
    const input = await screen.findByRole('combobox', { name: 'Mô hình (content)' });
    expect(screen.getByRole<HTMLSelectElement>('combobox', { name: settings.ai.model }).value).toBe(
      'saved-legacy-model',
    );
    fireEvent.change(input, { target: { value: 'owner-purpose-model' } });
    expect(api.saveAiSettings).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: settings.ai.save }));
    await waitFor(() =>
      expect(vi.mocked(api.saveAiSettings).mock.calls[0]?.[0]).toEqual(
        expect.objectContaining({ models: { content: 'owner-purpose-model' } }),
      ),
    );
  });
  it('six providers, four purposes and fallback; no assistant row; switches are drafts', async () => {
    mount();
    await screen.findByRole('heading', { name: settings.ai.heading });
    expect(screen.getAllByRole('button', { pressed: false })).toHaveLength(5);
    expect(screen.queryByText('Trợ lý OPC Hub (widget)')).toBeNull();
    expect(screen.getByRole('combobox', { name: settings.ai.bot })).toBeTruthy();
    expect(screen.getByRole('combobox', { name: settings.ai.mod })).toBeTruthy();
    fireEvent.click(screen.getByRole('switch', { name: settings.ai.enabled }));
    expect(api.saveAiSettings).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: settings.ai.save }));
    await waitFor(() => expect(api.saveAiSettings).toHaveBeenCalledTimes(1));
  });
  it('saved key is not restored to input; verifies draft and shows status, hiding key on save', async () => {
    const data = emptyAiProviders();
    data.providers = data.providers.map((p) =>
      p.id === 'claude' ? { ...p, hasKey: true, keyLast4: '1234', enabled: true } : p,
    );
    vi.mocked(api.fetchAiSettings).mockResolvedValue(data);
    mount();
    await screen.findByLabelText(settings.ai.key);
    expect(screen.getByLabelText<HTMLInputElement>(settings.ai.key).value).toBe('');
    expect(screen.getByText('Khóa đã lưu: ••••1234')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: settings.ai.verify }));
    await waitFor(() => expect(api.verifyAiProvider).toHaveBeenCalledTimes(1));
    expect(api.saveAiSettings).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getAllByText(/Kết nối tốt/).length).toBeGreaterThan(0));
  });
});
