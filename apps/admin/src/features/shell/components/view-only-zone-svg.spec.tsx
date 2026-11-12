import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, expect, it, vi } from 'vitest';
import { ViewOnlyZone } from './view-only-zone';

const toast = vi.hoisted(() => vi.fn());
vi.mock('@opchub/ui', () => ({ useToast: () => toast }));
afterEach(() => {
  cleanup();
  toast.mockClear();
});

it.each([true, false])(
  'D-141 AC824-11 SVG-path targets retain semantic write/safe policy readonly=%s',
  (readOnly) => {
    const write = vi.fn(),
      safe = vi.fn(),
      roleName = 'raw-role';
    render(
      <NextIntlClientProvider
        locale="en"
        messages={{
          common: {
            rbac: {
              viewOnly: 'Read only {role}',
              viewOnlyToast: 'Denied {role}',
            },
          },
        }}
      >
        <ViewOnlyZone readOnly={readOnly} role={roleName}>
          <button data-act="write" onClick={write} aria-label="Export fixture">
            <svg aria-hidden="true">
              <path data-testid="write-path" d="M0 0h10v10Z" />
            </svg>
          </button>
          <button data-ro-ok="1" onClick={safe} aria-label="Safe fixture">
            <svg aria-hidden="true">
              <path data-testid="safe-path" d="M0 0h10v10Z" />
            </svg>
          </button>
        </ViewOnlyZone>
      </NextIntlClientProvider>,
    );
    fireEvent.click(screen.getByTestId('write-path'));
    expect(write).toHaveBeenCalledTimes(readOnly ? 0 : 1);
    expect(toast).toHaveBeenCalledTimes(readOnly ? 1 : 0);
    fireEvent.click(screen.getByTestId('safe-path'));
    expect(safe).toHaveBeenCalledOnce();
  },
);
