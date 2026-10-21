import { cleanup, fireEvent, render } from '@testing-library/react';
import { useLayoutEffect } from 'react';
import { Sheet } from './sheet';

afterEach(cleanup);

const labels = {
  title: 'Kịch bản hội thoại',
  closeLabel: 'Đóng',
  cancelLabel: 'Hủy',
  saveLabel: 'Lưu',
};

/** Dispatch in the first commit, before passive effects can install listeners. */
function ImmediateEscape() {
  useLayoutEffect(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
  }, []);
  return null;
}

it('D-40 Escape is ready in the first committed drawer frame', () => {
  const close = vi.fn();
  render(
    <>
      <Sheet {...labels} onClose={close} onSave={vi.fn()}>
        <input defaultValue="Chọn ngân hàng cho OPC" />
      </Sheet>
      <ImmediateEscape />
    </>,
  );
  expect(close).toHaveBeenCalledTimes(1);
});

it('D-40 Escape uses the current callback and is removed on unmount', () => {
  const first = vi.fn();
  const next = vi.fn();
  const view = render(
    <Sheet {...labels} onClose={first} onSave={vi.fn()}>
      Content
    </Sheet>,
  );
  fireEvent.keyDown(window, { key: 'Enter' });
  expect(first).not.toHaveBeenCalled();
  view.rerender(
    <Sheet {...labels} onClose={next} onSave={vi.fn()}>
      Content
    </Sheet>,
  );
  fireEvent.keyDown(window, { key: 'Escape' });
  expect(first).not.toHaveBeenCalled();
  expect(next).toHaveBeenCalledTimes(1);
  view.unmount();
  fireEvent.keyDown(window, { key: 'Escape' });
  expect(next).toHaveBeenCalledTimes(1);
});
