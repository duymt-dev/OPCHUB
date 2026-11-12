import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { Sheet } from './sheet';

afterEach(cleanup);

it('D-141 AC824-09 keeps nested Escape from discarding the outer event draft', () => {
  const onClose = vi.fn();
  render(
    <Sheet open title="Event" closeLabel="Close event" width="wide" onClose={onClose}>
      <input aria-label="Draft" defaultValue="raw draft" />
      <div role="dialog" aria-label="Link">
        <input aria-label="URL" />
      </div>
    </Sheet>,
  );
  fireEvent.keyDown(screen.getByLabelText('URL'), { key: 'Escape' });
  expect(onClose).not.toHaveBeenCalled();
  expect(screen.getByLabelText<HTMLInputElement>('Draft').value).toBe('raw draft');
  fireEvent.keyDown(screen.getByLabelText('Draft'), { key: 'ArrowDown' });
  expect(onClose).not.toHaveBeenCalled();
  fireEvent.keyDown(screen.getByLabelText('Draft'), { key: 'Escape' });
  expect(onClose).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button', { name: 'Close event' }));
  expect(onClose).toHaveBeenCalledTimes(2);
});

it('D-141 AC824-09 respects a handled Escape and removes listeners when closed', () => {
  const onClose = vi.fn();
  const view = render(
    <Sheet open title="Event" closeLabel="Close event" width="wide" onClose={onClose}>
      <input aria-label="Draft" onKeyDown={(e) => e.preventDefault()} />
    </Sheet>,
  );
  fireEvent.keyDown(screen.getByLabelText('Draft'), { key: 'Escape' });
  expect(onClose).not.toHaveBeenCalled();
  view.rerender(
    <Sheet open={false} title="Event" closeLabel="Close event" width="wide" onClose={onClose}>
      draft
    </Sheet>,
  );
  fireEvent.keyDown(window, { key: 'Escape' });
  expect(onClose).not.toHaveBeenCalled();
  view.unmount();
  fireEvent.keyDown(window, { key: 'Escape' });
  expect(onClose).not.toHaveBeenCalled();
});
