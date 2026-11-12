import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { DEFAULT_RICH_TEXT_LABELS } from './labels';
import { LinkDialog } from './link-dialog';

afterEach(cleanup);

it.each([undefined, 'Close link dialog'])(
  'D-141 AC824-09 preserves default close label or opts into %s',
  async (close) => {
    const onClose = vi.fn();
    render(
      <LinkDialog
        open
        initial={null}
        onClose={onClose}
        onInsert={vi.fn()}
        onRemove={vi.fn()}
        labels={{ ...DEFAULT_RICH_TEXT_LABELS, ...(close === undefined ? {} : { close }) }}
      />,
    );
    const button = await screen.findByRole('button', { name: close ?? 'Đóng' });
    fireEvent.click(button);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText<HTMLInputElement>(DEFAULT_RICH_TEXT_LABELS.linkUrl).value).toBe(
      '',
    );
  },
);
