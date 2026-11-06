import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { StorePublicConfig, StorePublicPatch } from '@opchub/shared/api-domains';
import stores from '../../../../../messages/vi/stores.json';
import { fetchStorePublic, patchStorePublic } from '../../api';
import type * as StoreApi from '../../api';
import { PublicPageCard } from './public-page-card';

const toast = vi.hoisted(() => vi.fn());
vi.mock('@opchub/ui', async (original) => ({
  ...(await original<Record<string, unknown>>()),
  useToast: () => toast,
}));
vi.mock('../../api', async (original) => ({
  ...(await original<typeof StoreApi>()),
  fetchStorePublic: vi.fn(),
  patchStorePublic: vi.fn(),
}));
vi.mock('@/lib/auth-store', () => ({
  useAuthStore: (select: (s: { me: { id: string } }) => unknown) => select({ me: { id: 'm1' } }),
}));
let client: QueryClient;
let data: StorePublicConfig;
const copy = vi.fn();
const view = () =>
  render(
    <QueryClientProvider client={client}>
      <NextIntlClientProvider locale="vi" messages={{ stores }}>
        <PublicPageCard />
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
beforeEach(() => {
  vi.clearAllMocks();
  client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  data = {
    slug: 'test-store',
    url: 'https://opchub.community/g/test-store',
    seoIndex: true,
    title: '',
    desc: '',
    defaultTitle: 'Default title',
    defaultDesc: 'Default description',
    status: 'published',
  };
  vi.mocked(fetchStorePublic).mockImplementation(() => Promise.resolve(data));
  vi.mocked(patchStorePublic).mockImplementation((input: StorePublicPatch) => {
    data = {
      ...data,
      seoIndex: input.seoIndex ?? data.seoIndex,
      title: input.title ?? data.title,
      desc: input.desc ?? data.desc,
    };
    return Promise.resolve(data);
  });
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: copy.mockResolvedValue(undefined) },
  });
});
afterEach(() => {
  cleanup();
  client.clear();
});

describe('REQ-627 BR-494 public page card', () => {
  it('TC-494 toggle saves immediately, changes explanation, rollback on error', async () => {
    view();
    await screen.findByText('Trang công khai');
    const toggle = screen.getByRole('switch', { name: 'Hiển thị trên Google' });
    fireEvent.click(toggle);
    await waitFor(() =>
      expect(patchStorePublic).toHaveBeenCalledWith({ seoIndex: false }, expect.anything()),
    );
    expect(screen.getByText('Chỉ người có link mới xem được')).toBeDefined();
    vi.mocked(patchStorePublic).mockRejectedValueOnce(new Error('offline'));
    await waitFor(() => expect(toggle).not.toHaveProperty('disabled', true));
    fireEvent.click(toggle);
    await waitFor(() => expect(toast).toHaveBeenCalledWith(stores.publicPage.saveError));
    expect(toggle.getAttribute('aria-checked')).toBe('false');
  });
  it('seo fields: placeholders, max lengths, counter160, blur and debounced save', async () => {
    view();
    const title = await screen.findByPlaceholderText('Default title');
    const desc = screen.getByPlaceholderText('Default description');
    expect(title.getAttribute('maxlength')).toBe('70');
    expect(desc.getAttribute('maxlength')).toBe('160');
    fireEvent.change(desc, { target: { value: 'x'.repeat(160) } });
    expect(screen.getByText('160/160')).toBeDefined();
    fireEvent.blur(desc);
    await waitFor(() =>
      expect(patchStorePublic).toHaveBeenCalledWith({ desc: 'x'.repeat(160) }, expect.anything()),
    );
    fireEvent.change(title, { target: { value: 'Custom title' } });
    await waitFor(
      () =>
        expect(patchStorePublic).toHaveBeenCalledWith({ title: 'Custom title' }, expect.anything()),
      { timeout: 2000 },
    );
    expect(toast).not.toHaveBeenCalled();
  });
  it('copy and view: full URL, new tab, selected link on clipboard error', async () => {
    view();
    await screen.findByText('Trang công khai');
    const viewLink = screen.getByRole('link', { name: 'Xem như khách' });
    expect(viewLink.getAttribute('href')).toBe('/g/test-store');
    expect(viewLink.getAttribute('target')).toBe('_blank');
    fireEvent.click(screen.getByRole('button', { name: 'Sao chép link' }));
    await waitFor(() => expect(copy).toHaveBeenCalledWith(data.url));
    expect(toast).toHaveBeenCalledWith(stores.publicPage.copied);
    copy.mockRejectedValueOnce(new Error('denied'));
    fireEvent.click(screen.getByRole('button', { name: 'Sao chép link' }));
    await waitFor(() => expect(toast).toHaveBeenCalledWith(stores.publicPage.copyError));
    const input = screen.getByRole<HTMLInputElement>('textbox', { name: 'Link trang công khai' });
    expect(input.selectionEnd).toBe(input.value.length);
  });
  it.each(['draft', 'hidden'] as const)(
    'visibility: %s warning, hidden configuration disabled',
    async (status) => {
      data.status = status;
      view();
      await screen.findByText(stores.publicPage[status]);
      if (status === 'hidden') expect(screen.getByRole('switch')).toHaveProperty('disabled', true);
      expect(screen.getByRole('link', { name: 'Xem như khách' }).getAttribute('href')).toBe(
        '/g/test-store',
      );
    },
  );
  it('load failure exposes a retry, not an editable phantom configuration', async () => {
    vi.mocked(fetchStorePublic).mockRejectedValueOnce(new Error('offline'));
    view();
    await screen.findByRole('alert');
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    await screen.findByText('Trang công khai');
  });
});
