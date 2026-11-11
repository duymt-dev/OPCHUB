import { Component, startTransition, useEffect, useState, type ReactNode } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AdminIntlReady } from './admin-intl-ready';
import { AdminIntlResourceError } from '@/i18n/intl/resource-error';
import commonLo from '../../messages/lo/common.json';
import commonEn from '../../messages/en/common.json';

const state = vi.hoisted(() => ({ pending: new Map<string, Promise<void>>() }));
vi.mock('@/i18n/intl/runtime', () => ({
  prepareAdminIntl: (locale: string) => state.pending.get(locale),
  resetFailedAdminIntl: (locale: string) => state.pending.delete(locale),
}));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn() } }));
afterEach(() => {
  cleanup();
  state.pending.clear();
});

function deferred(locale: string) {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<void>((ok, fail) => {
    resolve = ok;
    reject = fail;
  });
  state.pending.set(locale, promise);
  return {
    resolve: () => {
      state.pending.delete(locale);
      resolve();
    },
    reject,
  };
}

function Draft({ mount }: { mount: () => void }) {
  const [value, setValue] = useState('');
  useEffect(mount, [mount]);
  return (
    <input
      aria-label="draft fixture"
      value={value}
      onChange={(event) => setValue(event.target.value)}
    />
  );
}

function Frame({ locale, children }: { locale: string; children: ReactNode }) {
  return (
    <NextIntlClientProvider
      locale={locale}
      timeZone="Asia/Ho_Chi_Minh"
      messages={{ common: locale === 'lo' ? commonLo : commonEn }}
    >
      <AdminIntlReady>{children}</AdminIntlReady>
    </NextIntlClientProvider>
  );
}

class FailureBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override render() {
    return this.state.failed ? <p role="alert">Resource failed fixture</p> : this.props.children;
  }
}

describe('D-141 AC824-05/08 scoped Intl readiness, not a keyed remount', () => {
  it('waits before first descendant formatting rather than displaying English fallback', async () => {
    const ready = deferred('lo');
    const mount = vi.fn();
    await act(async () => {
      render(
        <Frame locale="lo">
          <Draft mount={mount} />
        </Frame>,
      );
      await Promise.resolve();
    });
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.getByRole('status').textContent).toBe(commonLo.state.loading);
    expect(mount).not.toHaveBeenCalled();
    await act(() => Promise.resolve(ready.resolve()));
    expect(await screen.findByRole('textbox')).toBeTruthy();
    expect(mount).toHaveBeenCalledTimes(1);
  });

  it('retains an existing unsaved draft/subtree across a deferred locale transition and back', async () => {
    const mount = vi.fn();
    const view = render(
      <Frame locale="en">
        <Draft mount={mount} />
      </Frame>,
    );
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'unchanged draft' } });
    const ready = deferred('lo');
    await act(() =>
      Promise.resolve(
        startTransition(() =>
          view.rerender(
            <Frame locale="lo">
              <Draft mount={mount} />
            </Frame>,
          ),
        ),
      ),
    );
    expect(screen.getByDisplayValue('unchanged draft')).toBeTruthy();
    await act(() => Promise.resolve(ready.resolve()));
    expect(screen.getByDisplayValue('unchanged draft')).toBeTruthy();
    view.rerender(
      <Frame locale="en">
        <Draft mount={mount} />
      </Frame>,
    );
    expect(screen.getByDisplayValue('unchanged draft')).toBeTruthy();
    expect(mount).toHaveBeenCalledTimes(1);
  });

  it('surfaces rejected readiness to the error boundary, never silently renders unsupported descendants', async () => {
    const ready = deferred('lo');
    const mount = vi.fn();
    await act(async () => {
      render(
        <FailureBoundary>
          <Frame locale="lo">
            <Draft mount={mount} />
          </Frame>
        </FailureBoundary>,
      );
      await Promise.resolve();
    });
    await act(() => Promise.resolve(ready.reject(new Error('Expected resource failure fixture'))));
    expect((await screen.findByRole('alert')).textContent).toBe('Resource failed fixture');
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(mount).not.toHaveBeenCalled();
  });

  it('shows a readable selected-language resource error and retries only on user action', async () => {
    const ready = deferred('lo');
    const mount = vi.fn();
    await act(async () => {
      render(
        <Frame locale="lo">
          <Draft mount={mount} />
        </Frame>,
      );
      await Promise.resolve();
    });
    await act(() =>
      Promise.resolve(
        ready.reject(
          new AdminIntlResourceError('lo', new Error('Private technical failure fixture')),
        ),
      ),
    );
    expect(await screen.findByText(commonLo.state.error, { exact: true })).toBeTruthy();
    expect(screen.queryByText('Admin Intl resources unavailable')).toBeNull();
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(mount).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: commonLo.state.retry }));
    expect(await screen.findByRole('textbox')).toBeTruthy();
    expect(mount).toHaveBeenCalledTimes(1);
  });
});
