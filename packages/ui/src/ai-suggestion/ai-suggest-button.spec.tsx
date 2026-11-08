import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterAll, beforeAll, afterEach, describe, expect, it, vi } from 'vitest';
import { AiSuggestButton } from './ai-suggest-button';

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
const labels = {
  suggest: 'Gợi ý bằng AI',
  use: 'Dùng gợi ý',
  dismiss: 'Bỏ qua',
  preview: 'Gợi ý nội dung',
};
describe('D-138 explicit AI suggestion acceptance', () => {
  it('never overwrites automatically; only use applies and dismiss discards', async () => {
    const apply = vi.fn(),
      request = vi.fn().mockResolvedValue('Nội dung gợi ý'),
      onError = vi.fn();
    render(<AiSuggestButton request={request} apply={apply} onError={onError} labels={labels} />);
    fireEvent.click(screen.getByRole('button', { name: labels.suggest }));
    await screen.findByText('Nội dung gợi ý');
    expect(apply).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: labels.dismiss }));
    expect(apply).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: labels.suggest }));
    await screen.findByRole('button', { name: labels.use });
    fireEvent.click(screen.getByRole('button', { name: labels.use }));
    expect(apply).toHaveBeenCalledExactlyOnceWith('Nội dung gợi ý');
    expect(onError).not.toHaveBeenCalled();
  });
  it('failure reports a safe message without applying any content', async () => {
    const apply = vi.fn(),
      onError = vi.fn();
    render(
      <AiSuggestButton
        request={() => Promise.reject(Error('private provider details'))}
        apply={apply}
        onError={onError}
        labels={labels}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: labels.suggest }));
    await vi.waitFor(() => expect(onError).toHaveBeenCalledOnce());
    expect(apply).not.toHaveBeenCalled();
    expect(screen.queryByText('private provider details')).toBeNull();
  });
});
