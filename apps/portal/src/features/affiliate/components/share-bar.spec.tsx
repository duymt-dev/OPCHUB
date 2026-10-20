import { ToastProvider } from '@opchub/ui';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import affiliate from '../../../../messages/vi/affiliate.json';
import { ShareBar } from './share-bar';

const link = 'https://opchub.community/r/HAOPC';
const write = vi.fn<(text: string) => Promise<void>>();
let previous: PropertyDescriptor | undefined;
beforeEach(() => {
  previous = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: write },
  });
  write.mockReset().mockResolvedValue(undefined);
});
afterEach(() => {
  cleanup();
  if (previous) Object.defineProperty(navigator, 'clipboard', previous);
  else Reflect.deleteProperty(navigator, 'clipboard');
});
function show() {
  render(
    <NextIntlClientProvider locale="vi" messages={{ affiliate }}>
      <ToastProvider>
        <ShareBar link={link} code="HAOPC" />
      </ToastProvider>
    </NextIntlClientProvider>,
  );
}

describe('Affiliate copy actions', () => {
  it('REQ-311 localized action names exclude decorative icon labels; copies exact link/code with toast', async () => {
    show();
    fireEvent.click(screen.getByRole('button', { name: /^Sao chép$/ }));
    await waitFor(() => expect(write).toHaveBeenLastCalledWith(link));
    expect(await screen.findByText('Đã sao chép link giới thiệu')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: /^Sao chép mã$/ }));
    await waitFor(() => expect(write).toHaveBeenLastCalledWith('HAOPC'));
    expect(await screen.findByText('Đã sao chép mã giới thiệu')).toBeDefined();
  });
  it('REQ-311 denied clipboard permission shows a failure rather than false success', async () => {
    write.mockRejectedValue(new Error('denied'));
    show();
    fireEvent.click(screen.getByRole('button', { name: /^Sao chép mã$/ }));
    expect(await screen.findByText(affiliate.share.failed)).toBeDefined();
    expect(screen.queryByText('Đã sao chép mã giới thiệu')).toBeNull();
  });
});
