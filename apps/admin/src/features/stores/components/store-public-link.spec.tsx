import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import stores from '../../../../messages/vi/stores.json';
import { StorePublicLink } from './store-public-link';

const toast = vi.hoisted(() => vi.fn());
vi.mock('@opchub/ui', async (original) => ({
  ...(await original<Record<string, unknown>>()),
  useToast: () => toast,
}));
vi.mock('@/lib/env', () => ({ env: { NEXT_PUBLIC_PORTAL_URL: 'https://opchub.community' } }));
const copy = vi.fn();
const view = (slug: string | null = 'ca-phe') =>
  render(
    <NextIntlClientProvider locale="vi" messages={{ stores }}>
      <StorePublicLink slug={slug} />
    </NextIntlClientProvider>,
  );
beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: copy.mockResolvedValue(undefined) },
  });
});
afterEach(cleanup);
describe('REQ-627 Admin public store link', () => {
  it('shows read-only public link and copies it without an SEO/slug editor', async () => {
    view();
    expect(screen.getByText(/Trang công khai/)).toBeDefined();
    expect(screen.getByRole('link').getAttribute('href')).toBe('https://opchub.community/g/ca-phe');
    expect(screen.queryByRole('textbox')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Sao chép' }));
    await waitFor(() => expect(copy).toHaveBeenCalledWith('https://opchub.community/g/ca-phe'));
    expect(toast).toHaveBeenCalledWith(stores.drawer.publicCopied);
  });
  it('does not invent a link for a nullable legacy fixture', () => {
    expect(view(null).container.innerHTML).toBe('');
  });
  it('reports clipboard failure', async () => {
    copy.mockRejectedValueOnce(new Error('denied'));
    view();
    fireEvent.click(screen.getByRole('button', { name: 'Sao chép' }));
    await waitFor(() => expect(toast).toHaveBeenCalledWith(stores.drawer.publicCopyError));
  });
});
