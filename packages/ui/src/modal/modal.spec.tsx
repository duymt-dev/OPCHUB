import { cleanup, render, screen } from '@testing-library/react';
import { Modal } from './modal';

afterEach(cleanup);
it('preserves default modal sizing and supports the wide workflow variant with scoped styles', () => {
  const { rerender } = render(
    <Modal open title="Workflow" onClose={() => undefined}>
      Body
    </Modal>,
  );
  expect(screen.getByRole('dialog').style.width).toBe('min(560px, 100% - 24px)');
  rerender(
    <Modal open size="wide" className="workflow-modal" title="Workflow" onClose={() => undefined}>
      Body
    </Modal>,
  );
  const dialog = screen.getByRole('dialog');
  expect(dialog.style.width).toBe('min(880px, 100% - 24px)');
  expect(dialog.classList.contains('workflow-modal')).toBe(true);
});
